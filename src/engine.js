/*
 * Bitget KO — 치환 엔진 (chrome API 의존 없음)
 *
 * 원칙
 *  - 텍스트 노드의 nodeValue만 변경한다. 요소 구조/이벤트/폼 값은 건드리지 않는다.
 *  - 정규화한 텍스트 전체가 사전 키와 일치할 때만 치환한다 (부분 치환 없음).
 *  - 입력/편집/스크립트 영역 내부는 절대 처리하지 않는다.
 *
 * 사용
 *  const engine = BgkoEngine.create({ dict: koJson, root: document.body });
 *  engine.configure({ translate: true, bilingual: true, collector: fn | null });
 *  engine.destroy();
 */
(function (global) {
  'use strict';

  var HAS_ALPHA = /[A-Za-z]/;
  var WS_RUN = /\s+/g; // JS의 \s는 NBSP( ) 포함
  var LEAD_WS = /^\s*/;
  var TRAIL_WS = /\s*$/;

  // 이 요소들의 내부 텍스트는 절대 건드리지 않는다.
  // select/option: value 속성이 없으면 텍스트가 곧 폼 값이 된다.
  // textarea: 자식 텍스트 노드가 defaultValue다.
  var EXCLUDE_SELECTOR = [
    'input', 'textarea', 'select', 'option', 'script', 'style', 'noscript',
    'template', '[contenteditable]:not([contenteditable="false"])',
    '[data-bgko-skip]'
  ].join(',');

  // 처리 대상 텍스트 최대 길이 (원본 기준, 공백 포함). 사전 키는 짧다.
  var MAX_RAW_LEN = 200;
  // 라벨 수집 최대 길이 (정규화 후)
  var MAX_COLLECT_LEN = 40;

  // 수집 제외: 거래쌍/심볼 (BTCUSDT, ETH/USDT, SOLUSDT PERP ...)
  var SYMBOL_RE = /^[A-Z0-9]{1,15}[\/\-_ ]?(USDT|USDC|USD|BTC|ETH|PERP)( ?(PERP|Perpetual))?$/;
  // 수집 제외: 숫자 + 토큰 하나 (20x, 24h, 100 USDT, 0.0001 rAAGIY, 1 BABYDOGE)
  var NUM_TOKEN_RE = /^[+\-−~≈<>$]?\s?[\d.,:\s]+\s?\S{0,20}$/;
  // 수집 제외: 값이 박힌 텍스트 (Limit: 1,000,000 USDT / 0.01% / 2026) — 정확 일치로는 번역 불가
  var BIG_NUMBER_RE = /\d{1,3}(,\d{3})+|\d+\.\d+|\d{4,}/;
  // 수집 제외: 괄호뿐인 텍스트 ((USDT), (UTC+8))
  var PAREN_ONLY_RE = /^\([^)]*\)$/;
  // 수집 제외: 이메일 (로그인 시 화면에 표시되는 본인 계정 → 내보내기 파일에 개인정보가 섞이지 않게)
  var EMAIL_RE = /[^\s@]+@[^\s@]+\.[A-Za-z]{2,}/;
  // 수집 제외: 한글/CJK가 섞인 텍스트 (영어 라벨만 수집)
  var NON_LATIN_RE = /[　-鿿가-힯豈-﫿]/;
  var UPPER_G = /[A-Z]/g;
  // 접미사 규칙: "본문 (대문자 심볼 | 숫자 | 숫자+h/m/d)" — 괄호 앞 본문이 사전 키와 정확히 일치할 때만 사용
  // 소문자 단어 괄호 "(closed)", 기호 "(UTC+8)"는 허용하지 않음
  var SUFFIX_RE = /^(.+?)(\s?)(\((?:[A-Z][A-Z0-9]{0,11}|\d{1,6}|\d{1,3}[hmd])\))$/;
  var LOWER_RUN = /[a-z]{4,}/;

  // 폭 없는 문자(ZWSP/ZWNJ/ZWJ/BOM): 화면에 안 보이지만 정확 일치를 깨뜨림
  var ZERO_WIDTH = /[​-‍﻿]/g;

  function normalize(s) {
    return s.replace(ZERO_WIDTH, '').replace(WS_RUN, ' ').trim();
  }

  // ---------- 축약 숫자 → 한국식 표기 ----------
  // 30K → 30,000 / 1.5M → 150만 / 1.41B → 14.1억 / 1.2T → 1.2조
  // 텍스트 전체가 "부호? $? 숫자 K|M|B|T 단위?" 일 때만. 같은 단위 안에서 표기만 바꾼다 (환율 없음).
  var COMPACT_RE = /^([+\-−]?)(\$?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?\s?([KkMBT])(\s?[A-Z]{2,6})?$/;
  var COMPACT_MULT = { K: 1e3, k: 1e3, M: 1e6, B: 1e9, T: 1e12 };
  var KO_UNITS = [[1e12, '조'], [1e8, '억'], [1e4, '만']];

  function groupInt(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // 소수 dec자리까지 반올림, 끝의 0 제거, 정수부 천 단위 쉼표
  function fmtNumber(v, dec) {
    var s = v.toFixed(Math.min(Math.max(dec, 0), 8));
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    var parts = s.split('.');
    return groupInt(parts[0]) + (parts[1] ? '.' + parts[1] : '');
  }

  function formatCompact(core) {
    var m = COMPACT_RE.exec(core);
    if (!m) return null;
    var intPart = m[3].replace(/,/g, '');
    var frac = m[4] || '';
    var suf = m[5];
    var unit = m[6] || '';
    // 차트 기간 버튼 1M/3M/6M(개월)과 겹침 → 한 자리 정수 + M + 단위 없음은 제외
    if (suf === 'M' && !frac && !unit && intPart.length === 1) return null;

    var mult = COMPACT_MULT[suf];
    var v = parseFloat(intPart + (frac ? '.' + frac : '')) * mult;
    var ko = null;
    if (mult > 1e3) {
      for (var i = 0; i < KO_UNITS.length; i++) {
        if (v >= KO_UNITS[i][0]) { ko = KO_UNITS[i]; break; }
      }
    }
    var body;
    if (ko) {
      // 원문 유효자릿수 유지: 1.41B(소수 2자리) → 14.1억(1자리), 150M → 1.5억
      var shift = Math.round(Math.log10(mult / ko[0]));
      body = fmtNumber(v / ko[0], frac.length - shift) + ko[1];
    } else {
      body = fmtNumber(v, frac.length - Math.round(Math.log10(mult)));
    }
    return m[1] + m[2] + body + unit;
  }

  // 공백 없는 대문자 위주 토큰: 티커/거래쌍/ID (BTC, AUD/CAD, rGOOGL, AAPLx, BGUSER-1RXY...)
  // 부작용: GTC, BBO 같은 UI 약어도 제외됨 → 약어는 사전에 직접 등록
  function isTickerLike(core) {
    if (core.indexOf(' ') >= 0) return false;
    var upper = core.match(UPPER_G);
    return !!upper && upper.length >= 2 && !LOWER_RUN.test(core);
  }

  function isCollectable(core) {
    return core.length >= 2 &&
      core.length <= MAX_COLLECT_LEN &&
      HAS_ALPHA.test(core) &&
      !SYMBOL_RE.test(core) &&
      !NUM_TOKEN_RE.test(core) &&
      !BIG_NUMBER_RE.test(core) &&
      !PAREN_ONLY_RE.test(core) &&
      !NON_LATIN_RE.test(core) &&
      !EMAIL_RE.test(core) &&
      !isTickerLike(core);
  }

  /**
   * ko.json → { exact: Map, lower: Map }
   * critical 섹션 항목은 원문 병기 대상.
   * lower: 대소문자 fallback. 소문자 충돌(번역이 다른 경우)은 fallback에서 제외.
   */
  function buildDictionary(json) {
    var exact = new Map();
    var lower = new Map();
    var conflicts = new Set();

    function add(section, critical) {
      if (!section) return;
      Object.keys(section).forEach(function (rawKey) {
        var ko = section[rawKey];
        if (typeof ko !== 'string' || !ko) return;
        var key = normalize(rawKey);
        if (!key) return;
        var entry = { ko: ko, critical: critical };
        // critical이 terms보다 우선 (같은 키가 양쪽에 있으면 병기 유지)
        if (!exact.has(key) || critical) exact.set(key, entry);

        var lk = key.toLowerCase();
        if (conflicts.has(lk)) return;
        var prev = lower.get(lk);
        if (prev && (prev.ko !== ko)) {
          lower.delete(lk);
          conflicts.add(lk);
        } else if (!prev || critical) {
          lower.set(lk, entry);
        }
      });
    }

    add(json && json.critical, true);
    add(json && json.terms, false);
    return { exact: exact, lower: lower, size: exact.size };
  }

  function lookupIn(dict, core) {
    return dict.exact.get(core) || dict.lower.get(core.toLowerCase()) || null;
  }

  /**
   * 1) 정확 일치
   * 2) 접미사 규칙: "사전키 (USDT|BTC|0|12|8h)" → 사전키만 번역, 괄호는 그대로
   *    예) "Positions (0)" → "포지션 (0)", "Price (USDT)" → "가격 (USDT)"
   * 반환: { entry, base, tail } | null
   */
  function matchIn(dict, core) {
    var entry = lookupIn(dict, core);
    if (entry) return { entry: entry, base: core, tail: '' };
    var m = SUFFIX_RE.exec(core);
    if (!m) return null;
    entry = lookupIn(dict, m[1]);
    return entry ? { entry: entry, base: m[1], tail: m[2] + m[3] } : null;
  }

  // ---------- 원격 사전 ----------
  var REMOTE_MAX_KEYS = 5000;

  /**
   * 원격 JSON 검증. terms만 받는다 (critical은 원격으로 바꿀 수 없음).
   * 실패하면 throw.
   */
  function sanitizeRemote(json) {
    if (!json || typeof json !== 'object') throw new Error('형식 오류');
    if (typeof json.version !== 'number' || !isFinite(json.version)) throw new Error('version 없음');
    var terms = json.terms;
    if (!terms || typeof terms !== 'object') throw new Error('terms 없음');
    var keys = Object.keys(terms);
    if (keys.length > REMOTE_MAX_KEYS) throw new Error('항목 과다');
    var out = {};
    keys.forEach(function (k) {
      var v = terms[k];
      if (typeof v !== 'string' || !v.trim() || v.length > 100) return;
      if (!k.trim() || k.length > MAX_RAW_LEN) return;
      out[k] = v;
    });
    return { version: json.version, terms: out };
  }

  /**
   * 내장 사전 + 원격 사전 병합.
   *  - 원격 version이 내장보다 낮으면 무시 (zip으로 받은 최신 내장 사전을 옛 원격이 덮지 않게)
   *  - critical(원문 병기 대상)은 내장만 사용. 원격 terms가 critical 키를 대소문자 변형이나
   *    접미사 형태("Open long", "Open Long (1)")로 가로채는 것도 차단
   */
  function mergeDictionary(bundled, remote) {
    var out = {
      version: bundled.version || 0,
      critical: Object.assign({}, bundled.critical || {}),
      terms: Object.assign({}, bundled.terms || {})
    };
    var info = { source: 'bundled', added: 0, changed: 0, blocked: [] };
    if (!remote || typeof remote.version !== 'number' || remote.version < out.version) {
      return { json: out, info: info };
    }
    var locked = new Set(Object.keys(out.critical).map(function (k) { return normalize(k).toLowerCase(); }));
    Object.keys(remote.terms || {}).forEach(function (k) {
      var n = normalize(k);
      var m = SUFFIX_RE.exec(n);
      if (locked.has(n.toLowerCase()) || (m && locked.has(m[1].toLowerCase()))) {
        info.blocked.push(k);
        return;
      }
      var v = remote.terms[k];
      if (out.terms[k] === undefined) info.added++;
      else if (out.terms[k] !== v) info.changed++;
      out.terms[k] = v;
    });
    out.version = remote.version;
    info.source = 'remote';
    return { json: out, info: info };
  }

  function now() {
    return (global.performance && performance.now) ? performance.now() : Date.now();
  }

  function create(opts) {
    opts = opts || {};
    var root = opts.root || global.document.body;
    var doc = root.ownerDocument || global.document;
    var dict = buildDictionary(opts.dict || {});

    var settings = { translate: false, bilingual: true, compact: false, collector: null };

    // Text 노드 → { orig, applied, core }
    var records = new WeakMap();
    // 부모 요소 → 제외 영역 여부 캐시
    var excludedCache = new WeakMap();
    // 우리가 title을 붙인 요소
    var titled = new WeakSet();

    var pending = new Set();
    var scheduled = false;
    var rafId = 0;
    var timerId = 0;
    var observer = null;

    var stats = { flushes: 0, nodes: 0, translated: 0, totalMs: 0, maxMs: 0, lastMs: 0 };

    function isExcluded(el) {
      if (!el || el.nodeType !== 1) return true;
      var cached = excludedCache.get(el);
      if (cached !== undefined) return cached;
      var res = el.closest(EXCLUDE_SELECTOR) !== null;
      excludedCache.set(el, res);
      return res;
    }

    function match(core) { return matchIn(dict, core); }

    function render(hit) {
      if (hit.compact) return hit.display;
      var main = (hit.entry.critical && settings.bilingual) ? hit.entry.ko + ' (' + hit.base + ')' : hit.entry.ko;
      return main + hit.tail;
    }

    function setTitle(el, core) {
      if (!el || el.hasAttribute('title')) return;
      el.setAttribute('title', core);
      titled.add(el);
    }

    function clearTitle(el, core) {
      if (el && titled.has(el) && el.getAttribute('title') === core) {
        el.removeAttribute('title');
        titled.delete(el);
      }
    }

    function processText(node) {
      var value = node.nodeValue;
      var rec = records.get(node);
      if (rec) {
        if (value === rec.applied) return; // 우리가 쓴 값 → 무시
        // 사이트가 텍스트를 바꿈 → 이전 기록 폐기 후 새 원문으로 재판정
        records.delete(node);
        clearTitle(node.parentNode, rec.core);
      }

      if (!value || value.length > MAX_RAW_LEN || !HAS_ALPHA.test(value)) return;
      if (isExcluded(node.parentNode)) return;

      var core = normalize(value);
      var hit = match(core);
      if (!hit && settings.translate && settings.compact) {
        var display = formatCompact(core);
        if (display) hit = { compact: true, display: display };
      }

      if (!hit) {
        if (settings.collector && isCollectable(core)) settings.collector(core);
        return;
      }
      if (!settings.translate) return;

      var lead = LEAD_WS.exec(value)[0];
      var trail = TRAIL_WS.exec(value)[0];
      var applied = lead + render(hit) + trail;

      records.set(node, { orig: value, applied: applied, core: core, hit: hit });
      node.nodeValue = applied;
      setTitle(node.parentNode, core);
      stats.translated++;
    }

    function forEachText(start, fn) {
      if (start.nodeType === 3) { fn(start); return; }
      if (start.nodeType !== 1 && start.nodeType !== 11) return;
      var walker = doc.createTreeWalker(start, 4 /* NodeFilter.SHOW_TEXT */, null);
      var n;
      while ((n = walker.nextNode())) fn(n);
    }

    // filter가 있으면 해당 기록만 원복 (예: 숫자 단위 토글 OFF → 축약 숫자만)
    function revertAll(filter) {
      forEachText(root, function (n) {
        var rec = records.get(n);
        if (!rec || (filter && !filter(rec))) return;
        if (n.nodeValue === rec.applied) n.nodeValue = rec.orig;
        records.delete(n);
        clearTitle(n.parentNode, rec.core);
      });
      discardOwnMutations();
    }

    function rerenderAll() {
      forEachText(root, function (n) {
        var rec = records.get(n);
        if (!rec || n.nodeValue !== rec.applied) return;
        var lead = LEAD_WS.exec(rec.orig)[0];
        var trail = TRAIL_WS.exec(rec.orig)[0];
        rec.applied = lead + render(rec.hit) + trail;
        n.nodeValue = rec.applied;
      });
      discardOwnMutations();
    }

    function scanAll() {
      var t0 = now();
      forEachText(root, processText);
      discardOwnMutations();
      record(now() - t0);
    }

    function record(ms) {
      stats.flushes++;
      stats.lastMs = ms;
      stats.totalMs += ms;
      if (ms > stats.maxMs) stats.maxMs = ms;
    }

    // 우리 변경으로 생긴 레코드는 버린다. flush/scan은 동기 실행이라
    // 그 사이에 사이트 변경이 끼어들 수 없으므로 안전하다.
    function discardOwnMutations() {
      if (observer) observer.takeRecords();
    }

    function enqueue(list) {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === 'characterData') {
          pending.add(m.target);
        } else {
          var added = m.addedNodes;
          for (var j = 0; j < added.length; j++) pending.add(added[j]);
        }
      }
    }

    function onMutations(list) {
      enqueue(list);
      schedule();
    }

    // rAF throttle (debounce 아님: 지속 갱신에도 굶지 않음).
    // 백그라운드 탭은 rAF가 멈추므로 setTimeout fallback.
    function schedule() {
      if (scheduled || pending.size === 0) return;
      scheduled = true;
      if (global.requestAnimationFrame) rafId = global.requestAnimationFrame(flush);
      timerId = global.setTimeout(flush, 250);
    }

    function flush() {
      if (!scheduled) return;
      scheduled = false;
      if (rafId && global.cancelAnimationFrame) global.cancelAnimationFrame(rafId);
      global.clearTimeout(timerId);
      rafId = 0; timerId = 0;

      if (observer) enqueue(observer.takeRecords());
      var batch = pending;
      pending = new Set();

      var t0 = now();
      batch.forEach(function (n) {
        if (!n.isConnected) return;
        stats.nodes++;
        forEachText(n, processText);
      });
      discardOwnMutations();
      record(now() - t0);
    }

    function needsObserver() {
      return settings.translate || !!settings.collector;
    }

    function connect() {
      if (observer) return;
      observer = new global.MutationObserver(onMutations);
      observer.observe(root, { childList: true, subtree: true, characterData: true });
    }

    function disconnect() {
      if (!observer) return;
      observer.disconnect();
      observer = null;
      pending.clear();
      scheduled = false;
      if (rafId && global.cancelAnimationFrame) global.cancelAnimationFrame(rafId);
      global.clearTimeout(timerId);
    }

    /**
     * 설정 변경. 바뀐 항목만 반영한다.
     *  translate: true→false 원복, false→true 전체 스캔
     *  bilingual: 이미 치환된 노드 다시 그리기
     *  compact: 축약 숫자 한국식 표기. OFF면 축약 숫자 기록만 원복, ON이면 전체 스캔
     *  collector: 새로 켜지면 전체 스캔으로 현재 화면 수집
     */
    function configure(next) {
      var prev = settings;
      settings = {
        translate: next.translate !== undefined ? !!next.translate : prev.translate,
        bilingual: next.bilingual !== undefined ? !!next.bilingual : prev.bilingual,
        compact: next.compact !== undefined ? !!next.compact : prev.compact,
        collector: next.collector !== undefined ? next.collector : prev.collector
      };

      if (needsObserver()) connect();

      if (prev.translate && !settings.translate) revertAll();
      else if (settings.translate) {
        if (prev.compact && !settings.compact) revertAll(function (rec) { return rec.hit.compact; });
        if (prev.bilingual !== settings.bilingual) rerenderAll();
      }

      var turnedOn = (!prev.translate && settings.translate) ||
        (settings.translate && settings.compact && !prev.compact) ||
        (!prev.collector && settings.collector);
      if (turnedOn) scanAll();

      if (!needsObserver()) disconnect();
    }

    // 사전 교체 (원격 사전 갱신 시). 현재 치환을 원복한 뒤 새 사전으로 다시 스캔
    function setDictionary(json) {
      if (settings.translate) revertAll();
      dict = buildDictionary(json || {});
      if (settings.translate || settings.collector) scanAll();
    }

    function destroy() {
      configure({ translate: false, collector: null });
      disconnect();
    }

    return {
      configure: configure,
      setDictionary: setDictionary,
      destroy: destroy,
      flushNow: function () { if (observer) enqueue(observer.takeRecords()); scheduled = true; flush(); },
      getStats: function () {
        return {
          flushes: stats.flushes, nodes: stats.nodes, translated: stats.translated,
          totalMs: stats.totalMs, maxMs: stats.maxMs, lastMs: stats.lastMs,
          avgMs: stats.flushes ? stats.totalMs / stats.flushes : 0,
          dictSize: dict.size
        };
      },
      resetStats: function () {
        stats = { flushes: 0, nodes: 0, translated: 0, totalMs: 0, maxMs: 0, lastMs: 0 };
      },
      getSettings: function () { return settings; },
      getDebug: function () {
        return { observing: !!observer, scheduled: scheduled, pending: pending.size, translate: settings.translate };
      }
    };
  }

  global.BgkoEngine = {
    create: create,
    normalize: normalize,
    isCollectable: isCollectable,
    buildDictionary: buildDictionary,
    match: matchIn,
    formatCompact: formatCompact,
    sanitizeRemote: sanitizeRemote,
    mergeDictionary: mergeDictionary
  };
})(typeof window !== 'undefined' ? window : this);
