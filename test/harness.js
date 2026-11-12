/* 테스트 하네스: 팝업 대신 토글 + 체크리스트 자동 실행. 엔진은 실제 src/engine.js 사용. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var panel = $('harness');

  // ?noharness: 실제 확장(content script)으로 검증할 때 하네스 엔진이 겹치지 않게 끔
  if (/[?&]noharness\b/.test(location.search)) { panel.remove(); return; }

  panel.innerHTML =
    '<style>' +
    '#harness{background:#14171d;border-left:1px solid #2a2f3a;padding:12px;font:12px/1.5 system-ui,sans-serif;color:#e6e8ec;overflow:auto;max-height:100vh;position:sticky;top:0}' +
    '#harness h3{margin:4px 0 8px;font-size:14px}#harness h5{margin:12px 0 4px;color:#8a909c;font-weight:500}' +
    '#harness label{display:block;margin:2px 0}#harness ol{padding-left:18px;margin:4px 0}' +
    '#harness li{margin:3px 0}#harness .pass{color:#2ebd85}#harness .fail{color:#f6465d}#harness .det{color:#8a909c;font-size:11px;word-break:break-all}' +
    '#harness button{background:#222733;color:#e6e8ec;border:1px solid #2a2f3a;border-radius:4px;padding:4px 10px;cursor:pointer}' +
    '#harness pre{white-space:pre-wrap;background:#0f1115;padding:6px;border-radius:4px;max-height:160px;overflow:auto;margin:4px 0}' +
    '#summary{font-weight:700;font-size:14px}' +
    '</style>' +
    '<h3>테스트 하네스</h3>' +
    '<label><input type="checkbox" id="h-translate" checked> 번역</label>' +
    '<label><input type="checkbox" id="h-bilingual" checked> 원문 병기</label>' +
    '<label><input type="checkbox" id="h-compact" checked> 숫자 단위 한국식</label>' +
    '<label><input type="checkbox" id="h-collect"> 라벨 수집</label>' +
    '<h5>성능</h5><pre id="h-stats">-</pre>' +
    '<h5>체크리스트 <button id="h-run">다시 실행</button></h5>' +
    '<div id="summary">실행 중…</div><ol id="h-checks"></ol>' +
    '<h5>수집된 라벨 (<span id="h-collected-count">0</span>)</h5><pre id="h-collected">-</pre>';

  var engine = null;
  var dictJson = null;
  var collected = new Set();
  var snapshot = null;
  var running = false;

  function collector(text) { collected.add(text); }

  function uiSettings() {
    return {
      translate: $('h-translate').checked,
      bilingual: $('h-bilingual').checked,
      compact: $('h-compact').checked,
      collector: $('h-collect').checked ? collector : null
    };
  }

  ['h-translate', 'h-bilingual', 'h-compact', 'h-collect'].forEach(function (id) {
    $(id).addEventListener('change', function () { if (engine && !running) engine.configure(uiSettings()); });
  });
  $('h-run').addEventListener('click', function () { if (!running) runChecks(); });

  setInterval(function () {
    if (!engine) return;
    var s = engine.getStats();
    $('h-stats').textContent =
      '사전 항목: ' + s.dictSize + '\n' +
      'flush 횟수: ' + s.flushes + '\n' +
      '처리 노드: ' + s.nodes + ' / 치환: ' + s.translated + '\n' +
      'flush 평균: ' + s.avgMs.toFixed(3) + 'ms / 최대: ' + s.maxMs.toFixed(3) + 'ms';
    var arr = Array.from(collected).sort();
    $('h-collected-count').textContent = arr.length;
    $('h-collected').textContent = arr.length ? JSON.stringify(arr, null, 1) : '-';
  }, 500);

  // ---------- 유틸 ----------
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function frames(n) {
    return new Promise(function (r) {
      (function step(k) { if (k <= 0) return r(); requestAnimationFrame(function () { step(k - 1); }); })(n || 2);
    });
  }
  // flush는 rAF 또는 250ms timeout 중 먼저 오는 쪽 → 300ms 대기면 확정
  function settle() { return Promise.all([frames(2), wait(300)]); }
  function waitFor(fn, timeout) {
    var t0 = Date.now();
    return new Promise(function (resolve, reject) {
      (function poll() {
        if (fn()) return resolve();
        if (Date.now() - t0 > (timeout || 5000)) return reject(new Error('timeout'));
        setTimeout(poll, 20);
      })();
    });
  }
  function txt(el) { return el ? el.textContent : '(없음)'; }
  function normStatic(html) { return html.replace(/(id="click-count">)\d+</, '$1#<'); }

  function expectEq(fails, label, actual, expected) {
    if (actual !== expected) fails.push(label + ': "' + actual + '" ≠ "' + expected + '"');
  }

  // ---------- 체크리스트 ----------
  var TR = { Filled: '체결', Cancelled: '취소됨' };

  var checks = [
    ['사전 로드', async function (f) {
      var s = engine.getStats();
      if (!(s.dictSize > 0)) f.push('dictSize=' + s.dictSize);
    }],

    ['핵심 버튼 원문 병기', async function (f) {
      expectEq(f, 'Open Long', txt($('btn-open-long')), '롱 진입 (Open Long)');
      expectEq(f, 'Open Short', txt($('btn-open-short')), '숏 진입 (Open Short)');
      expectEq(f, 'Buy/Long', txt($('btn-buy-long')), '매수/롱 (Buy/Long)');
      expectEq(f, 'Sell/Short', txt($('btn-sell-short')), '매도/숏 (Sell/Short)');
      expectEq(f, 'Limit 탭', txt($('tab-limit')), '지정가 (Limit)');
      expectEq(f, 'Market 탭', txt($('tab-market')), '시장가 (Market)');
      expectEq(f, 'Isolated', txt($('mm-isolated')), '격리 (Isolated)');
      expectEq(f, 'Reduce-only', txt($('lbl-reduce')), '포지션 감소 전용 (Reduce-only)');
    }],

    ['일반 용어 번역 (병기 없음)', async function (f) {
      expectEq(f, 'Price 라벨', txt(document.querySelector('label[for=in-price]')), '가격');
      expectEq(f, 'TP/SL', txt($('lbl-tpsl')), '익절/손절');
      var markLabel = $('mark-price').previousElementSibling;
      expectEq(f, 'Mark Price 라벨', txt(markLabel), '시장 평균가(마크 가격)');
    }],

    ['title 원문 툴팁', async function (f) {
      expectEq(f, 'Open Long title', $('btn-open-long').getAttribute('title'), 'Open Long');
      expectEq(f, 'Price 라벨 title', document.querySelector('label[for=in-price]').getAttribute('title'), 'Price');
    }],

    ['숫자/가격/심볼 미변경', async function (f) {
      expectEq(f, '최종 체결가', txt($('last-price')), window.__mock.lastPriceText);
      if (!/^[\d,]+\.\d$/.test(txt($('mark-price')))) f.push('마크 가격 형식: ' + txt($('mark-price')));
      if (!/^\d\.\d{4}%$/.test(txt($('funding')))) f.push('펀딩비 형식: ' + txt($('funding')));
      expectEq(f, '레버리지', txt($('leverage')), '20x');
      expectEq(f, '사용 가능 금액', txt($('available')), '1,234.56 USDT');
      expectEq(f, '심볼', txt(document.querySelector('.pair')), 'BTCUSDT');
    }],

    ['입력창/편집 영역 미변경', async function (f) {
      expectEq(f, 'input value', $('in-price').value, '65000.5');
      expectEq(f, 'input placeholder', $('in-qty').placeholder, 'Quantity');
      expectEq(f, 'input "Market"', $('in-market').value, 'Market');
      expectEq(f, 'textarea value', $('ta').value, 'Long Short Limit');
      expectEq(f, 'textarea text', $('ta').textContent, 'Long Short Limit');
      expectEq(f, 'contenteditable', $('ce').textContent, 'Margin');
      expectEq(f, 'select value', $('sel').value, 'Limit');
      expectEq(f, 'option text', $('sel').options[1].text, 'Market');
    }],

    ['부분 문자열 미치환 / 쪼개진 노드는 조각 단위', async function (f) {
      expectEq(f, '문장 (부분 일치 금지)', txt($('sentence')), 'Long position will be closed at Market price');
      // "Buy " + <span>"Long"</span>: 각 텍스트 노드가 개별로 사전 키와 정확히 일치
      expectEq(f, '쪼개진 버튼', txt($('split-btn')), '매수 (Buy) 롱 (Long)');
    }],

    ['접미사 규칙 (단위/개수)', async function (f) {
      expectEq(f, 'Price (USDT)', txt($('sfx-price')), '가격 (USDT)');
      expectEq(f, 'Quantity(BTC) 공백 없음', txt($('sfx-qty')), '수량(BTC)');
      expectEq(f, '펀딩비 (8h)', txt($('sfx-funding')), '펀딩비/남은 시간 (8h)');
      expectEq(f, 'Positions (2)', txt($('tab-positions')), '포지션 (2)');
      expectEq(f, 'title', $('sfx-price').getAttribute('title'), 'Price (USDT)');
      // 본문이 사전에 없거나(UNSURE) 허용되지 않은 괄호 → 그대로
      expectEq(f, 'Total (USDT) 미등록', txt($('sfx-total')), 'Total (USDT)');
      expectEq(f, '소문자 괄호', txt($('sfx-neg1')), 'Price (usdt)');
      expectEq(f, '문장 + 괄호', txt($('sfx-neg2')), 'Long position (closed)');
      expectEq(f, '기호 괄호', txt($('sfx-neg3')), 'Limit (UTC+8)');
      // 개수가 바뀌면 다시 치환
      var n = window.__mock.historyRows;
      await waitFor(function () { return window.__mock.historyRows > n; }, 3000);
      await settle();
      expectEq(f, '개수 변경 후', txt($('tab-orders')), '미체결 주문 (' + window.__mock.openOrders + ')');
    }],

    ['숫자 단위 한국식 (축약 숫자)', async function (f) {
      expectEq(f, '1.41B', txt($('cp-b')), '14.1억');
      expectEq(f, '30K', txt($('cp-k')), '30,000');
      expectEq(f, '1.5M USDT', txt($('cp-mu')), '150만 USDT');
      expectEq(f, '$2.35B', txt($('cp-usd')), '$23.5억');
      expectEq(f, '-12.3K', txt($('cp-neg')), '-12,300');
      expectEq(f, 'title 원래 값', $('cp-b').getAttribute('title'), '1.41B');
      // 바뀌면 안 되는 것
      expectEq(f, '차트 기간 1M', txt($('cp-1m')), '1M');
      expectEq(f, '차트 기간 15m', txt($('cp-15m')), '15m');
      expectEq(f, '입력칸', $('in-compact').value, '1.5K');
      // 200ms마다 바뀌는 값
      await wait(450);
      await settle();
      expectEq(f, '실시간 갱신', txt($('turnover')), BgkoEngine.formatCompact(window.__mock.turnoverText));
      // 토글 OFF → 숫자만 원래대로, 번역은 유지
      engine.configure({ compact: false });
      expectEq(f, 'OFF: 1.41B', txt($('cp-b')), '1.41B');
      expectEq(f, 'OFF: title 제거', $('cp-b').getAttribute('title'), null);
      expectEq(f, 'OFF: 번역 유지', txt($('btn-open-long')), '롱 진입 (Open Long)');
      await wait(450);
      await settle();
      expectEq(f, 'OFF 중 실시간 값은 원문', txt($('turnover')), window.__mock.turnoverText);
      engine.configure({ compact: true });
      expectEq(f, 'ON 복귀', txt($('cp-b')), '14.1억');
    }],

    ['동적 노드 치환 (테이블 재렌더)', async function (f) {
      var n = window.__mock.rerenders;
      await waitFor(function () { return window.__mock.rerenders > n; }, 3000);
      await settle();
      var btn = document.querySelector('.pos-close');
      expectEq(f, '포지션 Close 버튼', txt(btn), '종료 (Close)');
      var side = document.querySelector('#positions td span');
      expectEq(f, '포지션 방향', txt(side), '롱 (Long)');
      var ths = Array.from(document.querySelectorAll('#dynamic thead th')).map(txt);
      if (ths.indexOf('미실현 손익') < 0) f.push('헤더에 미실현 손익 없음: ' + ths.join('|'));
    }],

    ['동적 행 추가', async function (f) {
      var n = window.__mock.historyRows;
      await waitFor(function () { return window.__mock.historyRows > n; }, 3000);
      await settle();
      var tr = $('history').firstElementChild;
      expectEq(f, '최신 행 상태', txt(tr.querySelector('.hist-status')), TR[tr.dataset.status]);
    }],

    ['기존 노드 값 변경 시 재치환', async function (f) {
      var s = window.__mock.status;
      await waitFor(function () { return window.__mock.status !== s; }, 3000);
      await settle();
      expectEq(f, '상태 토글', txt($('toggle-status')), TR[window.__mock.status]);
    }],

    ['클릭 핸들러 유지', async function (f) {
      var before = Number(txt($('click-count')));
      $('btn-open-long').click();
      $('btn-sell-short').click();
      expectEq(f, '클릭 카운트', Number(txt($('click-count'))), before + 2);
    }],

    ['원문 병기 OFF/ON 즉시 반영', async function (f) {
      engine.configure({ bilingual: false });
      expectEq(f, 'OFF: Open Long', txt($('btn-open-long')), '롱 진입');
      expectEq(f, 'OFF: Limit', txt($('tab-limit')), '지정가');
      expectEq(f, 'OFF: 일반 용어 유지', txt($('lbl-tpsl')), '익절/손절');
      engine.configure({ bilingual: true });
      expectEq(f, 'ON: Open Long', txt($('btn-open-long')), '롱 진입 (Open Long)');
    }],

    ['번역 OFF → 완전 원복, ON → 재적용', async function (f) {
      engine.configure({ translate: false });
      if (normStatic($('static').innerHTML) !== normStatic(snapshot)) f.push('정적 영역 innerHTML이 원본과 다름');
      expectEq(f, 'OFF: 포지션 Close', txt(document.querySelector('.pos-close')), 'Close');
      expectEq(f, 'OFF: Mark Price 라벨', txt($('mark-price').previousElementSibling), 'Mark Price');
      var titles = document.querySelectorAll('#static [title], #ticker [title], #dynamic [title]').length;
      if (titles) f.push('남은 title 속성 ' + titles + '개');
      // OFF 상태에서 새로 생긴 노드도 영어 그대로여야 함
      await wait(1100);
      await settle();
      expectEq(f, 'OFF 중 재렌더', txt(document.querySelector('.pos-close')), 'Close');
      engine.configure({ translate: true });
      expectEq(f, 'ON: Open Long', txt($('btn-open-long')), '롱 진입 (Open Long)');
      expectEq(f, 'ON: 포지션 Close', txt(document.querySelector('.pos-close')), '종료 (Close)');
    }],

    ['라벨 수집 (심볼/숫자 제외)', async function (f) {
      collected.clear();
      engine.configure({ collector: collector });
      await settle();
      ['Size', 'Clicks:', 'Status toggle:'].forEach(function (k) { if (!collected.has(k)) f.push('수집 누락: ' + k); });
      ['BTCUSDT', '20x', '0.500 BTC', '1,234.56 USDT', 'Open Long', 'Margin', 'Side', '24h Change',
        '0.0001 rAAGIY', 'Limit: 1,000,000 USDT', 'BGUSER-1RXYTG9P', 'AUD/CAD', 'AAPLx', '(UTC+8)', '1 BABYDOGE', 'A', 'someone@example.com'].forEach(function (k) {
        if (collected.has(k)) f.push('수집되면 안 됨: ' + k);
      });
      Array.from(collected).forEach(function (k) {
        if (k.length > 40) f.push('40자 초과 수집: ' + k);
        if (/[가-힣]/.test(k)) f.push('번역문 수집됨: ' + k);
      });
    }],

    ['성능: 3초간 flush 최대 16ms 미만', async function (f, info) {
      engine.resetStats();
      await wait(3000);
      var s = engine.getStats();
      info.push('flush ' + s.flushes + '회, 평균 ' + s.avgMs.toFixed(3) + 'ms, 최대 ' + s.maxMs.toFixed(3) + 'ms');
      if (s.flushes < 5) f.push('flush가 너무 적음 (' + s.flushes + ')');
      if (!(s.maxMs < 16)) f.push('최대 ' + s.maxMs.toFixed(2) + 'ms');
    }]
  ];

  async function runChecks() {
    running = true;
    var ol = $('h-checks');
    ol.innerHTML = '';
    $('summary').textContent = '실행 중…';
    engine.configure({ translate: true, bilingual: true, compact: true, collector: null });
    await settle();

    var pass = 0;
    for (var i = 0; i < checks.length; i++) {
      var name = checks[i][0], fails = [], info = [];
      try { await checks[i][1](fails, info); } catch (e) { fails.push('예외: ' + e.message); }
      var li = document.createElement('li');
      var ok = fails.length === 0;
      if (ok) pass++;
      li.innerHTML = '<span class="' + (ok ? 'pass' : 'fail') + '">' + (ok ? 'PASS' : 'FAIL') + '</span> ' + name +
        (fails.concat(info).length ? '<div class="det">' + fails.concat(info).map(escapeHtml).join('<br>') + '</div>' : '');
      ol.appendChild(li);
    }
    var summary = pass + '/' + checks.length + ' PASS';
    $('summary').textContent = summary;
    $('summary').className = pass === checks.length ? 'pass' : 'fail';
    document.body.setAttribute('data-result', summary);
    engine.configure(uiSettings());
    running = false;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  // ---------- 시작 ----------
  fetch('../dictionary/ko.json')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (json) {
      dictJson = json;
      snapshot = $('static').innerHTML; // 엔진 시작 전 원본
      engine = window.__engine = BgkoEngine.create({ dict: dictJson, root: document.body });
      engine.configure(uiSettings());
      setTimeout(runChecks, 800);
    })
    .catch(function (e) {
      $('summary').textContent = '사전 로드 실패: ' + e.message + ' — 프로젝트 루트에서 "node test/serve.js" 실행 후 http://localhost:8123/test/mock.html 로 여세요.';
      $('summary').className = 'fail';
      document.body.setAttribute('data-result', 'LOAD FAIL');
    });
})();
