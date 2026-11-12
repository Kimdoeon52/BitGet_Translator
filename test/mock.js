/* Mock 거래 화면 동작: 사이트(React)처럼 DOM을 계속 갱신한다. 엔진과 무관. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n, d) {
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  };

  var state = { price: 65000, ticks: 0, historyId: 0, status: 'Filled' };
  var mock = window.__mock = { lastPriceText: '', ticks: 0, rerenders: 0, historyRows: 0 };

  // 200ms: 가격 갱신. 두 경로 모두 사용
  //  - nodeValue 직접 변경 (characterData 변이)
  //  - textContent 교체 (childList 변이)
  function tick() {
    state.price += (Math.random() - 0.5) * 20;
    var last = fmt(state.price, 1);
    var lastEl = $('last-price');
    lastEl.firstChild.nodeValue = last;
    lastEl.className = Math.random() > 0.5 ? 'up' : 'down';
    mock.lastPriceText = last;

    $('mark-price').textContent = fmt(state.price + 1.2, 1);
    $('index-price').firstChild.nodeValue = fmt(state.price - 1.3, 1);
    $('funding').textContent = (0.01 + Math.random() * 0.002).toFixed(4) + '%';
    var ch = (Math.random() * 4 - 2);
    $('change').textContent = (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%';
    // 축약 숫자 갱신 (React가 같은 노드 값을 바꾸는 경우)
    mock.turnoverText = (1.41 + Math.random() * 0.05).toFixed(2) + 'B';
    $('turnover').firstChild.nodeValue = mock.turnoverText;
    mock.ticks = ++state.ticks;
  }

  // 1000ms: 포지션 테이블 통째로 재렌더 (새 영어 노드 생성)
  function renderPositions() {
    var rows = [
      { sym: 'BTCUSDT', side: 'Long', size: '0.500 BTC', entry: 64200.5 },
      { sym: 'ETHUSDT', side: 'Short', size: '3.20 ETH', entry: 3420.1 }
    ];
    var html = rows.map(function (r) {
      var mark = r.sym === 'BTCUSDT' ? state.price : 3400 + Math.random() * 10;
      var pnl = (r.side === 'Long' ? 1 : -1) * (mark - r.entry) * (r.sym === 'BTCUSDT' ? 0.5 : 3.2);
      var cls = pnl >= 0 ? 'up' : 'down';
      return '<tr>' +
        '<td>' + r.sym + ' <span class="' + (r.side === 'Long' ? 'up' : 'down') + '">' + r.side + '</span> <span class="mut">Cross</span> 20x</td>' +
        '<td>' + r.size + '</td>' +
        '<td>' + fmt(r.entry, 1) + '</td>' +
        '<td>' + fmt(mark, 1) + '</td>' +
        '<td>' + fmt(r.entry * (r.side === 'Long' ? 0.95 : 1.05), 1) + '</td>' +
        '<td>' + fmt(1600, 2) + ' USDT</td>' +
        '<td class="' + cls + '">' + (pnl >= 0 ? '+' : '') + fmt(pnl, 2) + ' USDT</td>' +
        '<td class="' + cls + '">' + (pnl / 16).toFixed(2) + '%</td>' +
        '<td><button class="chip pos-close">Close</button> <button class="chip">TP/SL</button></td>' +
        '</tr>';
    }).join('');
    $('positions').innerHTML = html;
    mock.rerenders++;
  }

  // 1500ms: 주문 내역 행 추가 (최대 10행)
  function addHistory() {
    var tr = document.createElement('tr');
    var side = Math.random() > 0.5 ? 'Buy' : 'Sell';
    var status = Math.random() > 0.3 ? 'Filled' : 'Cancelled';
    tr.innerHTML = '<td>BTCUSDT</td><td class="' + (side === 'Buy' ? 'up' : 'down') + '">' + side +
      '</td><td>' + fmt(state.price, 1) + '</td><td class="hist-status">' + status + '</td>';
    tr.dataset.status = status;
    var tbody = $('history');
    tbody.insertBefore(tr, tbody.firstChild);
    while (tbody.children.length > 10) tbody.removeChild(tbody.lastChild);
    mock.historyRows = ++state.historyId;
    // 탭 개수 갱신: 같은 텍스트 노드의 값만 바뀜 (React가 "Open orders ({n})"를 다시 쓰는 경우)
    mock.openOrders = state.historyId % 4;
    $('tab-orders').firstChild.nodeValue = 'Open orders (' + mock.openOrders + ')';
  }

  // 700ms: 기존 텍스트 노드 값만 교체 (React가 텍스트를 갱신하는 경우)
  function toggleStatus() {
    state.status = state.status === 'Filled' ? 'Cancelled' : 'Filled';
    $('toggle-status').firstChild.nodeValue = state.status;
    mock.status = state.status;
  }

  // 주문 버튼 클릭 카운터: 번역 후에도 핸들러가 그대로 동작해야 함
  ['btn-open-long', 'btn-open-short', 'btn-buy-long', 'btn-sell-short'].forEach(function (id) {
    $(id).addEventListener('click', function () {
      var c = $('click-count');
      c.textContent = String(Number(c.textContent) + 1);
    });
  });

  tick();
  renderPositions();
  addHistory();
  mock.status = state.status;
  setInterval(tick, 200);
  setInterval(renderPositions, 1000);
  setInterval(addHistory, 1500);
  setInterval(toggleStatus, 700);
})();
