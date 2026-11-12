/* 팝업: 설정 토글 + 수집 라벨 내보내기/초기화. 모든 상태는 chrome.storage.local. */
(function () {
  'use strict';

  var DEFAULTS = { enabled: true, bilingual: true, compact: true, collect: false };
  var DEPENDS_ON_ENABLED = ['row-bilingual', 'row-compact'];
  var $ = function (id) { return document.getElementById(id); };

  var dict = null;        // buildDictionary 결과 (내보낼 때 이미 사전에 있는 라벨 제외용)
  var collected = [];
  var clearArmTimer = 0;

  $('ver').textContent = 'v' + chrome.runtime.getManifest().version;

  // ---------- 토글 ----------
  function renderSettings(s) {
    Object.keys(DEFAULTS).forEach(function (k) { $(k).checked = !!s[k]; });
    setDependentRows(s.enabled);
  }

  function setDependentRows(enabled) {
    DEPENDS_ON_ENABLED.forEach(function (id) { $(id).classList.toggle('disabled', !enabled); });
  }

  Object.keys(DEFAULTS).forEach(function (k) {
    $(k).addEventListener('change', function () {
      var obj = {};
      obj[k] = $(k).checked;
      chrome.storage.local.set(obj);
      if (k === 'enabled') setDependentRows(obj[k]);
    });
  });

  // ---------- 수집 목록 ----------
  // 사전에 이미 있는 라벨(정확/대소문자 무시)은 제외하고 정렬
  function pendingLabels() {
    var list = collected.map(BgkoEngine.normalize).filter(Boolean);
    var uniq = Array.from(new Set(list));
    if (dict) {
      uniq = uniq.filter(function (t) { return !BgkoEngine.match(dict, t); });
    }
    return uniq.sort(function (a, b) { return a.localeCompare(b, 'en', { sensitivity: 'base' }); });
  }

  function renderCount() {
    var labels = pendingLabels();
    var known = Array.from(new Set(collected)).length - labels.length;
    $('count').textContent = labels.length;
    $('count-detail').textContent = known > 0 ? '(이미 사전에 있는 ' + known + '개 제외)' : '';
    $('export').disabled = labels.length === 0;
    $('clear').disabled = collected.length === 0;
  }

  // 내보내기 형식: { "원문": "" } → 번역을 채워 ko.json의 terms/critical에 붙여넣기
  function buildExport() {
    var out = {};
    pendingLabels().forEach(function (t) { out[t] = ''; });
    return JSON.stringify(out, null, 2) + '\n';
  }

  function stamp() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  $('export').addEventListener('click', function () {
    var blob = new Blob([buildExport()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'bitget-ko-labels-' + stamp() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  // 초기화는 두 번 눌러야 실행 (confirm 대화상자 대신)
  $('clear').addEventListener('click', function () {
    var btn = $('clear');
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed');
      btn.textContent = '한 번 더 누르면 삭제';
      clearArmTimer = setTimeout(disarm, 3000);
      return;
    }
    disarm();
    chrome.storage.local.set({ collected: [] });
  });

  function disarm() {
    clearTimeout(clearArmTimer);
    $('clear').classList.remove('armed');
    $('clear').textContent = '초기화';
  }

  // ---------- 동기화 ----------
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    if (changes.collected) {
      collected = changes.collected.newValue || [];
      renderCount();
    }
    var settingChanged = Object.keys(DEFAULTS).some(function (k) { return k in changes; });
    if (settingChanged) chrome.storage.local.get(DEFAULTS, renderSettings);
    if (changes.remoteDict || changes.remoteMeta) loadDictionary();
  });

  chrome.storage.local.get(Object.assign({ collected: [] }, DEFAULTS), function (s) {
    renderSettings(s);
    collected = s.collected || [];
    renderCount();
  });

  // ---------- 사전 (내장 + 원격) ----------
  var bundledJson = null;

  function fmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var p = function (n) { return String(n).padStart(2, '0'); };
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function loadDictionary() {
    if (!bundledJson) return;
    chrome.storage.local.get({ remoteDict: null, remoteMeta: null }, function (s) {
      var merged = BgkoEngine.mergeDictionary(bundledJson, s.remoteDict);
      dict = BgkoEngine.buildDictionary(merged.json);
      renderCount();

      var meta = s.remoteMeta || {};
      var src = merged.info.source === 'remote' ? '온라인' : '기본 내장';
      $('dict-status').textContent = '사전 v' + merged.json.version + ' (' + src + ', ' + dict.size + '개)';
      var detail = $('dict-detail');
      if (meta.ok === false && meta.error) {
        detail.textContent = '온라인 확인 실패: ' + meta.error;
        detail.className = 'err';
      } else {
        detail.textContent = meta.checkedAt ? '마지막 확인 ' + fmtTime(meta.checkedAt) : '';
        detail.className = '';
      }
    });
  }

  $('dict-refresh').addEventListener('click', function () {
    var btn = $('dict-refresh');
    btn.disabled = true;
    btn.textContent = '확인 중…';
    chrome.runtime.sendMessage({ type: 'bgko:refresh', force: true }).then(function () {
      btn.disabled = false;
      btn.textContent = '지금 확인';
      loadDictionary();
    }, function () {
      btn.disabled = false;
      btn.textContent = '지금 확인';
    });
  });

  fetch(chrome.runtime.getURL('dictionary/ko.json'))
    .then(function (r) { return r.json(); })
    .then(function (json) { bundledJson = json; loadDictionary(); })
    .catch(function () { /* 사전 없이도 내보내기는 동작 (필터만 생략) */ });

  // 테스트용 노출
  window.__popup = { buildExport: buildExport, pendingLabels: pendingLabels };
})();
