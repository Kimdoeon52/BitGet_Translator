# 용어 사전 해설 (ko.json)

`ko.json`은 주석을 달 수 없어서 근거와 문맥은 이 문서에 정리한다. 카테고리 순서는 `ko.json`과 같다.

- **병기 ●**: `critical` 섹션에 있는 키. 원문 병기가 켜져 있으면 `롱 진입 (Open Long)`처럼 표시된다.
- 병기가 없는 `terms` 항목도 마우스를 올리면 `title` 툴팁으로 원문을 볼 수 있다.
- 키는 대소문자를 구분하지 않고 매칭된다 (`Open long` = `Open Long`). 하이픈과 공백은 구분하므로 표기가 다른 변형은 키를 따로 넣는다.
- 접미사 규칙: `Positions (0)`, `Price (USDT)`처럼 괄호 안이 대문자 심볼, 숫자, 숫자h이면 괄호 앞부분만 사전에서 찾는다. 이런 변형은 키로 따로 넣지 않는다.
- 표의 원문 칸에서 ` / `는 "여러 키를 한 줄에 묶음"이라는 뜻이다. 키 자체에 ` / `나 괄호가 들어가면 `` `Maker / Taker` ``처럼 백틱으로 감싼다.
- "실수집 확인"은 라벨 수집 모드로 실제 Bitget 화면에서 확인된 라벨이라는 뜻이다 (2026-11-10 1차 수집).

## 번역 원칙

| 원칙 | 내용 |
|---|---|
| 국내 거래소 관례 | 롱/숏, 지정가/시장가, 교차/격리, 익절/손절 |
| **종료 ≠ 청산** | Close(포지션)는 **종료**, **청산**은 Liquidation 전용. "청산"이 보이면 언제나 강제 청산을 뜻한다 |
| 방향 + 동작 | `Open Long` → `롱 진입`, `Close Short` → `숏 종료` (방향 먼저) |
| 확신 없으면 제외 | 문맥에 따라 뜻이 갈리는 단어는 [UNSURE.md](UNSURE.md)로 보낸다 |

---

## 1. 주문 방향 / 진입·종료 (병기 ●)

잘못 누르면 바로 손실로 이어지는 버튼이라 전부 병기한다.

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| Buy/Long | 매수/롱 | ● | 선물 주문 버튼 |
| Sell/Short | 매도/숏 | ● | |
| Buy Long | 매수/롱 | ● | 슬래시 없는 표기 |
| Sell Short | 매도/숏 | ● | |
| Buy | 매수 | ● | 현물 버튼, 내역의 방향 값 |
| Sell | 매도 | ● | |
| Long | 롱 | ● | 포지션 방향 값 |
| Short | 숏 | ● | |
| Open | 진입 | ● | 주문 패널 Open 탭. 다른 문맥은 UNSURE 참고 |
| Close | 종료 | ● | 주문 패널 Close 탭, 포지션 종료 버튼. 모달 닫기 버튼에도 같이 적용됨 (UNSURE 참고) |
| Open Long | 롱 진입 | ● | |
| Open Short | 숏 진입 | ● | |
| Close Long | 롱 종료 | ● | |
| Close Short | 숏 종료 | ● | |
| Close Position | 포지션 종료 | ● | |
| Market Close | 시장가 종료 | ● | 포지션 행의 시장가 종료 |
| Limit Close | 지정가 종료 | ● | |
| Close All | 전체 종료 | ● | 모든 포지션 종료 |
| Cancel All | 전체 취소 | ● | 모든 미체결 주문 취소 |

## 2. 주문 유형

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| Limit | 지정가 | ● | |
| Market | 시장가 | ● | |
| Limit Order | 지정가 주문 | ● | |
| Market Order | 시장가 주문 | ● | |
| Trigger | 트리거 | | 조건부 주문 탭 |
| Trigger Order | 트리거 주문 | | |
| Trigger Price | 트리거 가격 | | |
| Stop-limit / Stop Limit | 스탑 지정가 | | 트리거 후 지정가 주문 |
| Trailing Stop | 트레일링 스탑 | | 국내에서도 음차로 씀 |
| Order Type | 주문 유형 | | 내역 테이블 헤더 |
| Time in Force | 주문 유효 조건 | | 주문 패널 옵션 (TIF) |
| GTC | 취소 전까지 유효(GTC) | | Good-Till-Cancelled. 실수집 확인 |
| IOC | 즉시 체결 후 잔량 취소(IOC) | | Immediate-Or-Cancel. GTC와 같은 드롭다운으로 추정 |
| FOK | 전량 즉시 체결 아니면 취소(FOK) | | Fill-Or-Kill |
| BBO | 최우선 호가(BBO) | | Best Bid/Offer 가격으로 주문. 실수집 확인 |
| Limit Order Price Limit | 지정가 주문 가격 제한 | | 선물 정보 페이지 |
| Order Quantity | 주문 수량 | | |
| Iceberg | 빙산 주문 | | 큰 주문을 작게 나눠 노출 |
| Scaled Order | 분할 주문 | | 가격 구간에 여러 지정가 주문 배치 |
| No. of Split Orders | 분할 주문 수 | | 분할 주문 설정 |
| Qty. per Order | 주문당 수량 | | |
| Per Order | 주문당 | | |
| Total Quantity | 총 수량 | | |
| Highest Price / Lowest Price | 최고가 / 최저가 | | 분할 주문 가격 구간 |

## 3. 주문 옵션 / 증거금 모드

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| Cross | 교차 | ● | 증거금 모드 |
| Isolated | 격리 | ● | |
| Cross Margin | 교차 증거금 | ● | |
| Isolated Margin | 격리 증거금 | ● | |
| Reduce-only / Reduce only | 포지션 감소 전용 | ● | 포지션을 늘리지 않는 주문 |
| Post-only / Post only | 메이커 전용 | ● | 테이커로 체결될 상황이면 취소됨 |
| Post-only Order | 메이커 전용 주문 | ● | 실수집 표기: `Post-only order` |
| Limit｜Market | 지정가｜시장가 | ● | 전각 세로선(｜)으로 붙은 한 노드. 익절/손절 실행 방식 선택으로 추정 |

## 4. 익절 / 손절

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| TP/SL | 익절/손절 | | |
| TP | 익절 | | 분리된 노드로 나올 때 |
| SL | 손절 | | |
| Take Profit | 익절 | | |
| Stop Loss | 손절 | | |
| Take Profit Price | 익절가 | | |
| Stop Loss Price | 손절가 | | |
| TP Trigger Price | 익절 트리거 가격 | | |
| SL Trigger Price | 손절 트리거 가격 | | |
| Position TP/SL | 포지션 익절/손절 | | 포지션 전체 기준 익절/손절 |
| Trailing TP/SL | 트레일링 익절/손절 | | |
| TP Price / SL Price | 익절가 / 손절가 | | |
| TP Limit | 익절 지정가 | | 익절 시 지정가로 실행 |
| Full TP/SL / Partial TP/SL | 전체 익절/손절 / 부분 익절/손절 | | 포지션 전량 / 일부 대상 |
| MMR-based Stop Loss | 유지 증거금률(MMR) 기준 손절 | | |

## 5. 레버리지 / 증거금 / 포지션 모드

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| Leverage | 레버리지 | | |
| Adjust Leverage | 레버리지 조정 | | |
| Margin | 증거금 | | 상단 메뉴의 "마진 거래" 상품명도 증거금으로 표시됨 (UNSURE 참고) |
| Margin Mode | 증거금 모드 | | |
| Margin Ratio | 증거금 비율 | | 높을수록 청산 위험 |
| Margin Balance | 증거금 잔고 | | |
| Initial Margin | 개시 증거금 | | 국내 선물 용어 |
| Maintenance Margin | 유지 증거금 | | |
| `Maintenance Margin (MM)` | 유지 증거금(MM) | | 약어 포함 표기 |
| Maintenance Margin Rate | 유지 증거금률 | | |
| `Maintenance Margin Rate (MMR)` | 유지 증거금률(MMR) | | |
| Position Margin | 포지션 증거금 | | |
| Tiered Margin | 단계별 증거금 | | 포지션 규모 구간별 증거금률 |
| Tiered Maintenance Margin Rate | 단계별 유지 증거금률 | | |
| Multi-assets | 멀티 자산 | | 증거금 자산 모드. `Multi-asset mode for USDT-M Futures` 수집으로 확인 |
| Multi-asset Margin | 멀티 자산 증거금 | | |
| Multi-asset Mode | 멀티 자산 모드 | | |
| Borrow | 차입 | | 마진 거래 |
| Maximum Leverage | 최대 레버리지 | | |
| Add Margin | 증거금 추가 | | 격리 포지션 |
| Adjust Margin | 증거금 조정 | | |
| Position Mode | 포지션 모드 | | |
| One-way Mode | 단방향 모드 | | |
| Hedge Mode | 헤지 모드(양방향) | | 롱·숏 동시 보유 |

## 6. 가격

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| Price | 가격 | | |
| Order Price | 주문 가격 | | |
| Last Price | 최종 체결가 | | |
| Last | 최종 체결가 | | 마켓 목록 열 이름 |
| Mark Price | 시장 평균가(마크 가격) | | 강제 청산 판정 기준 가격. 표현은 요구사항대로 (UNSURE 참고) |
| Index Price | 인덱스 가격 | | 여러 현물 거래소 가격 지수 |
| Entry Price | 진입가 | | |
| Open Price | 진입가 | | |
| Average Open Price / Avg. Open Price | 평균 진입가 | | |
| Close Price | 종료가 | | "청산가"와 혼동 방지 |
| Average Close Price / Avg. Close Price | 평균 종료가 | | |
| Average Price / Avg. Price / Avg Price | 평균가 | | |
| Avg. Fill Price | 평균 체결가 | | |
| Liquidation | 강제 청산 | | 내역의 주문 유형 값으로도 나옴 |
| Liquidation Price | 강제 청산가 | | |
| Liq. Price | 강제 청산가 | | |
| Est. Liq. Price | 예상 강제 청산가 | | 주문 전 예상치 |
| Partial Liquidation | 부분 강제 청산 | | |
| Funding Rate | 펀딩비 | | 요율 |
| Funding Fee | 펀딩 수수료 | | 실제로 오간 금액. 요율과 구분 |
| `Funding Rate/Countdown` | 펀딩비/남은 시간 | | 실화면 `Funding rate/Countdown (8h)`는 접미사 규칙으로 처리 |
| Countdown: | 남은 시간: | | 콜론 포함 표기 |
| Funding Fee Interval | 펀딩비 정산 주기 | | |
| Funding Rate History | 펀딩비 내역 | | |
| Real-time Funding Rate | 실시간 펀딩비 | | |
| Next Funding Timestamp | 다음 펀딩 시각 | | |
| `Max/Min Funding Rate` | 최대/최소 펀딩비 | | |
| ADL | 자동 디레버리징(ADL) | | Auto-Deleveraging |
| Premium Index | 프리미엄 지수 | | 펀딩비 산정 요소 |
| Settlement Time | 정산 시간 | | |

## 7. 시세

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| 24h Change | 24시간 변동률 | | |
| 24h High | 24시간 최고가 | | |
| 24h Low | 24시간 최저가 | | |
| 24h Volume | 24시간 거래량 | | 코인 수량 기준 |
| 24h Turnover | 24시간 거래대금 | | 금액 기준 |
| Volume | 거래량 | | |
| Open Interest | 미결제약정 | | 파생 용어 |
| Order Book | 호가창 | | |
| Recent Trades / Market Trades | 최근 체결 | | |
| Today's High | 금일 최고가 | | |
| Today's Low | 금일 최저가 | | |
| Long/Short Ratio | 롱/숏 비율 | | |
| OI Limit | 미결제약정 한도 | | |
| Pair / Trading Pair | 거래쌍 | | |
| Chart | 차트 | | |
| Info | 정보 | | |
| Trading Data | 거래 데이터 | | |
| Trading Info | 거래 정보 | | |
| Trading Parameters | 거래 파라미터 | | |
| Market Data | 시장 데이터 | | |
| Market Cap | 시가총액 | | |
| Trading Volume | 거래량 | | |
| `Taker Buy/Sell Volume` | 테이커 매수/매도 거래량 | | |
| Circulating Supply | 유통 공급량 | | |
| Total Supply | 총 공급량 | | |
| Maximum Supply | 최대 공급량 | | |
| `All-time High (ATH)` | 역대 최고가(ATH) | | |
| `All-time Low (ATL)` | 역대 최저가(ATL) | | |
| Price History | 가격 기록 | | |
| Listing Date | 상장일 | | |
| Pre-market | 프리마켓(상장 전 거래) | | |
| Favorites | 즐겨찾기 | | |
| `Open Interest (OI) Limit` | 미결제약정(OI) 한도 | | |
| Price Range | 가격 범위 | | |
| Last 24h | 최근 24시간 | | |
| Symbol Information | 심볼 정보 | | |
| Futures Information | 선물 정보 | | |
| Futures Trading Pairs | 선물 거래쌍 | | |
| Hot | 인기 | | 마켓 목록 탭 |
| Gainers | 상승 종목 | | 마켓 목록 탭 |

## 8. 수량 / 잔고

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| Quantity / Qty | 수량 | | |
| Available / Avbl | 사용 가능 | | Avbl은 Bitget 약어 |
| Max / Max. | 최대 | | |
| Min. | 최소 | | |
| Max Single Order Quantity | 1회 최대 주문 수량 | | |
| Min. Single Order Quantity | 1회 최소 주문 수량 | | |
| Max. Number of Orders | 최대 주문 개수 | | |
| Min. Order Size | 최소 주문 수량 | | 선물 정보 페이지. 코인 단위 |
| Min. Order Value | 최소 주문 금액 | | |
| `Max. Order Size (Limit)` | 최대 주문 수량(지정가) | | |
| `Max. Order Size (Market)` | 최대 주문 수량(시장가) | | |
| Tick Size | 호가 단위 | | 가격 최소 변동폭 |
| Step Size | 수량 단위 | | 수량 최소 변동폭 |

## 9. 포지션 / 손익

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| Position / Positions | 포지션 | | 탭, 헤더 |
| Unrealized PnL | 미실현 손익 | | |
| Realized PnL | 실현 손익 | | |
| PnL | 손익 | | |
| ROE | 수익률(ROE) | | 증거금 대비 수익률 |
| Unrealized PnL (ROE) | 미실현 손익(수익률) | | 합쳐진 헤더 |
| ROI | 수익률(ROI) | | |
| Profits | 수익 | | |
| Total Profit | 총 수익 | | |
| Win Rate | 승률 | | 카피 트레이딩 통계 |
| Maximum Drawdown | 최대 낙폭(MDD) | | |

## 10. 주문 / 내역 탭 / 테이블 헤더

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| Order / Orders | 주문 | | |
| Open Orders | 미체결 주문 | | 여기서 Open은 진입이 아니라 "미체결" |
| Order History | 주문 내역 | | |
| Trade History | 체결 내역 | | |
| Position History | 포지션 내역 | | |
| Side / Direction | 방향 | | |
| Type | 유형 | | |
| Status | 상태 | | |
| Symbol | 심볼 | | |
| Time | 시간 | | |
| Order Time | 주문 시간 | | |
| Order Details | 주문 상세 | | |
| Transaction History | 거래 기록 | | 입출금·이체 등 자산 변동 기록 |
| Date | 날짜 | | |
| Action | 작업 | | 버튼이 들어가는 열 |

## 11. 주문 상태

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| Filled | 체결 | | |
| Partially Filled | 부분 체결 | | |
| Unfilled | 미체결 | | |
| Cancelled / Canceled | 취소됨 | | 영/미 철자 둘 다 |
| Expired | 만료됨 | | |
| Triggered | 트리거됨 | | |
| Pending | 대기 중 | | |

## 12. 수수료

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| Fee / Fees | 수수료 | | |
| Trading Fee | 거래 수수료 | | |
| Maker / Taker | 메이커 / 테이커 | | |
| Maker Fee / Taker Fee | 메이커 수수료 / 테이커 수수료 | | |
| `Maker / Taker` | 메이커 / 테이커 | | 한 노드로 붙어 나오는 표기 |
| Transaction Fee / Transaction Fees | 거래 수수료 | | |

## 13. 자산 / 계정

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| Assets | 자산 | | |
| Total Assets | 총 자산 | | |
| Deposit | 입금 | | |
| Withdraw | 출금 | | |
| Transfer | 이체 | | 계정 간 이동 |
| Balance | 잔고 | | |
| Available Balance | 사용 가능 잔고 | | |
| Wallet Balance | 지갑 잔고 | | |
| Frozen | 동결 | | 주문 등에 묶인 금액 |
| In Order | 주문 중 | | |
| Spot Account | 현물 계정 | | |
| Futures Account | 선물 계정 | | |
| Deposit/Withdraw | 입금/출금 | | |
| Account | 계정 | | |
| Coin | 코인 | | |
| Network | 네트워크 | | 출금 체인 선택 |
| Wallet | 지갑 | | |
| Sub-account | 하위 계정 | | |
| Email | 이메일 | | |
| Email/Mobile | 이메일/휴대폰 | | 로그인 입력란 라벨 |

## 14. 상품 / 메뉴

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| Spot | 현물 | | |
| Futures | 선물 | | |
| USDT-M Futures | USDT-M 선물 | | |
| USDC-M Futures | USDC-M 선물 | | |
| Coin-M Futures | 코인-M 선물 | | |
| Perpetual | 무기한 | | 무기한 계약 |
| Markets | 마켓 | | |
| Spot Trading | 현물 거래 | | |
| Copy Trading | 카피 트레이딩 | | |
| Trading Bots | 트레이딩 봇 | | |
| Bots | 봇 | | |
| Contract Type | 계약 유형 | | |
| Futures Type | 선물 유형 | | |
| Insurance Fund | 보험 기금 | | 강제 청산 손실 보전 기금 |

## 15. 공통 버튼

| 원문 | 번역 | 병기 | 메모 |
|---|---|---|---|
| Confirm | 확인 | | |
| Cancel | 취소 | | 주문 취소, 대화상자 취소 모두 "취소"라 의미 충돌 없음 |
| Edit | 수정 | | |
| Details | 상세 | | |
| All | 전체 | | 필터 |
| Settings | 설정 | | |
| Save | 저장 | | |
| View All | 전체 보기 | | |
| More | 더보기 | | |
| No data found. | 데이터 없음 | | |
| Previous Page / Next Page | 이전 페이지 / 다음 페이지 | | |
| Notifications | 알림 | | |
| Log in | 로그인 | | |
| Sign up | 회원가입 | | |
| Overview | 개요 | | |
| Ascending / Descending | 오름차순 / 내림차순 | | 정렬 |
| Preview | 미리보기 | | |
| Expand | 펼치기 | | |
| Time Period | 기간 | | |
| Advanced Settings | 고급 설정 | | |
| Trading | 거래 | | |
| Next / Back | 다음 / 뒤로 | | |
| Refresh | 새로고침 | | |
| Select | 선택 | | |
| Show More / View More | 더 보기 | | |
| Loading | 로딩 중 | | |
| Verifying | 확인 중 | | |
