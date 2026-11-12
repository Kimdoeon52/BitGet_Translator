/*
 * chrome 연결부
 *  - 사전 로드 → 엔진 생성
 *  - chrome.storage.local 설정(enabled/bilingual/collect) → 엔진 즉시 반영
 *  - 라벨 수집: 메모리 Set → 2초 debounce로 storage 'collected'에 병합 저장
 */
(function () {
  'use strict';

  var DEFAULTS = { enabled: true, bilingual: true, compact: true, collect: false };
  var SETTING_KEYS = Object.keys(DEFAULTS);
  var COLLECTED_KEY = 'collected';
  var MAX_COLLECTED = 5000;
  var SAVE_DELAY = 2000;

  var engine = null;
  var seen = new Set();   // storage에 이미 있거나 이번에 수집한 라벨
  var fresh = [];         // 아직 저장 안 한 새 라벨
  var saveTimer = 0;
  var orphaned = false;   // 확장이 새로고침/업데이트되어 이 스크립트가 확장과 끊긴 상태
  var bundledDict = null; // 확장에 들어 있는 ko.json (원격 사전과 병합할 기준)

  // ---------- 확장 연결 상태 ----------
  // 확장을 새로고침하면 이미 열린 탭의 이 스크립트는 남아 있지만 chrome.* 호출이
  // "Extension context invalidated"로 실패한다. 이때는 수집/저장만 멈추고
  // 이미 적용된 번역은 그대로 둔다 (탭을 새로고침하면 새 버전이 들어온다).
  function alive() {
    try { return !!(chrome.runtime && chrome.runtime.id); } catch (e) { return false; }
  }

  function orphan() {
    if (orphaned) return;
    orphaned = true;
    clearTimeout(saveTimer);
    saveTimer = 0;
    fresh = [];
    if (engine) engine.configure({ collector: null });
    console.info('[Bitget KO] 확장이 새로고침되었습니다. 이 탭을 새로고침하면 새 버전이 적용됩니다.');
  }

  // ---------- 라벨 수집 ----------
  function collector(text) {
    if (orphaned || seen.has(text) || seen.size >= MAX_COLLECTED) return;
    seen.add(text);
    fresh.push(text);
    if (!saveTimer) saveTimer = setTimeout(save, SAVE_DELAY);
  }

  function save() {
    saveTimer = 0;
    if (!fresh.length) return;
    if (!alive()) { orphan(); return; }
    var batch = fresh;
    fresh = [];
    // 다른 탭도 쓸 수 있으므로 읽고 병합해서 쓴다
    try {
      chrome.storage.local.get({ collected: [] }, function (r) {
        if (!alive()) { orphan(); return; }
        var merged = new Set(r.collected);
        batch.forEach(function (t) { if (merged.size < MAX_COLLECTED) merged.add(t); });
        var obj = {};
        obj[COLLECTED_KEY] = Array.from(merged);
        chrome.storage.local.set(obj);
      });
    } catch (e) {
      orphan();
    }
  }

  // ---------- 설정 반영 ----------
  function toEngineSettings(s) {
    return {
      translate: !!s.enabled,
      bilingual: !!s.bilingual,
      compact: !!s.compact,
      collector: s.collect ? collector : null
    };
  }

  function onStorageChanged(changes, area) {
    if (area !== 'local' || !engine) return;

    if (changes[COLLECTED_KEY]) {
      // 팝업에서 초기화했거나 다른 탭이 저장함 → seen 동기화 (아직 저장 안 한 것은 유지)
      seen = new Set(changes[COLLECTED_KEY].newValue || []);
      fresh.forEach(function (t) { seen.add(t); });
    }

    if (changes.remoteDict) {
      // 원격 사전이 갱신됨 → 내장 사전과 다시 병합해서 즉시 다시 그림
      engine.setDictionary(BgkoEngine.mergeDictionary(bundledDict, changes.remoteDict.newValue).json);
    }

    var settingChanged = SETTING_KEYS.some(function (k) { return k in changes; });
    if (settingChanged) {
      if (!alive()) { orphan(); return; }
      try {
        chrome.storage.local.get(DEFAULTS, function (s) { engine.configure(toEngineSettings(s)); });
      } catch (e) {
        orphan();
      }
    }
  }

  function start(bundled, stored) {
    bundledDict = bundled;
    seen = new Set(stored.collected || []);
    var dict = BgkoEngine.mergeDictionary(bundled, stored.remoteDict).json;
    engine = BgkoEngine.create({ dict: dict, root: document.body });
    // 디버그용: content script의 격리된 world에만 보임 (페이지 스크립트는 접근 불가)
    window.__bgkoEngine = engine;
    engine.configure(toEngineSettings(stored));
    chrome.storage.onChanged.addListener(onStorageChanged);
    // 탭을 닫거나 이동할 때 남은 수집분 저장 시도
    window.addEventListener('pagehide', function () { if (fresh.length) save(); });
    // 원격 사전 확인 요청 (1시간 이내에 확인했으면 백그라운드가 건너뜀)
    try {
      chrome.runtime.sendMessage({ type: 'bgko:refresh' }).catch(function () {});
    } catch (e) { /* 확장 재로드 중 */ }
  }

  var initial = Object.assign({ collected: [], remoteDict: null }, DEFAULTS);
  Promise.all([
    fetch(chrome.runtime.getURL('dictionary/ko.json')).then(function (r) { return r.json(); }),
    new Promise(function (resolve) { chrome.storage.local.get(initial, resolve); })
  ]).then(function (res) {
    start(res[0], res[1]);
  }).catch(function (e) {
    console.warn('[Bitget KO] 초기화 실패:', e);
  });
})();
