/*
 * 원격 사전 갱신 (서비스 워커)
 *  - REMOTE_URL의 ko.json을 받아 검증 후 chrome.storage.local.remoteDict에 저장
 *  - 1시간에 한 번만 실제로 받음 (Bitget 페이지가 열릴 때 content script가 요청)
 *  - 실패하면 마지막으로 받은 사전 유지, 그것도 없으면 내장 사전만 사용
 *  - critical(원문 병기 대상)은 원격으로 바꿀 수 없음 (engine.mergeDictionary에서 차단)
 */
importScripts('engine.js');

// 사전을 올려두는 GitHub 저장소의 raw 주소
var REMOTE_URL = 'https://raw.githubusercontent.com/Kimdoeon52/BitGet_Translator/main/dictionary/ko.json';
var STALE_MS = 60 * 60 * 1000;
var MAX_BYTES = 512 * 1024;

var inflight = null;

function refresh(force) {
  if (inflight) return inflight;
  inflight = doRefresh(force).finally(function () { inflight = null; });
  return inflight;
}

async function doRefresh(force) {
  var stored = await chrome.storage.local.get(['remoteMeta', 'remoteDict']);
  var prev = stored.remoteMeta || {};
  if (!force && prev.checkedAt && Date.now() - prev.checkedAt < STALE_MS) return prev;

  var meta = { checkedAt: Date.now(), ok: false, version: prev.version, updatedAt: prev.updatedAt };
  try {
    var res = await fetch(REMOTE_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var text = await res.text();
    if (text.length > MAX_BYTES) throw new Error('파일이 너무 큼');
    var remote = BgkoEngine.sanitizeRemote(JSON.parse(text));
    meta.ok = true;
    meta.version = remote.version;
    // 내용이 바뀐 경우에만 저장 → 열린 탭들이 새 사전으로 다시 그림
    if (JSON.stringify(remote) !== JSON.stringify(stored.remoteDict || null)) {
      meta.updatedAt = Date.now();
      await chrome.storage.local.set({ remoteDict: remote, remoteMeta: meta });
    } else {
      await chrome.storage.local.set({ remoteMeta: meta });
    }
  } catch (e) {
    meta.error = String((e && e.message) || e);
    await chrome.storage.local.set({ remoteMeta: meta });
  }
  return meta;
}

chrome.runtime.onInstalled.addListener(function () { refresh(true); });
chrome.runtime.onStartup.addListener(function () { refresh(false); });

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg && msg.type === 'bgko:refresh') {
    refresh(!!msg.force).then(sendResponse, function (e) { sendResponse({ ok: false, error: String(e) }); });
    return true; // 비동기 응답
  }
});
