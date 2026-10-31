import { researchReports, researchLineage } from './research-reports.js';
import { renderResearchReport } from './research-renderer.js';

const baseline = [
  { id: 5016, btc: [18, 27.8, 0.07, 1.09], eth: [11, 36.4, 0.42, 1.66], rules: [60, 0.75, 50, 30, 100, 0.10, 3] },
  { id: 4970, btc: [33, 27.3, 0.06, 1.08], eth: [24, 37.5, 0.46, 1.73], rules: [60, 0.75, 30, 30, 0, 0.50, 3] },
  { id: 3350, btc: [23, 26.1, 0.02, 1.03], eth: [17, 41.2, 0.60, 2.02], rules: [40, 0.50, 30, 30, 0, 0.50, 3] },
];

const dailyWPattern = [{
  id: 1,
  assets: {
    BTCUSDT: [21, 47.61904761904761, 0.4638673906146409, 2.2366243428062362],
    ETHUSDT: [19, 47.368421052631575, 0.4617782234700181, 2.6512017652944007],
    SOLUSDT: [12, 25, 0.12386567447216211, 1.307159664306917],
    PEPEUSDT: [5, 40, 0.27117421303702194, 1.6324571191802077],
    DOGEUSDT: [13, 38.46153846153847, 0.4475659569224605, 2.347326343334808],
  },
  rules: [],
}];

const variants = [
  { id: 21, btc: [13, 38.5, 0.47, 1.76], eth: [14, 50.0, 0.96, 2.92], rules: [60, 0.75, 30, 30, 0, 0.50, 3] },
  { id: 20, btc: [13, 30.8, 0.15, 1.22], eth: [14, 50.0, 0.95, 2.91], rules: [60, 0.75, 30, 30, 0, 0.10, 3] },
  { id: 29, btc: [9, 33.3, 0.28, 1.42], eth: [13, 53.8, 1.11, 3.40], rules: [60, 0.75, 50, 30, 0, 0.50, 3] },
];

const pepe = [
  { id: 21, assets: { PEPEUSDT: [11, 9.1, -0.65, 0.29, -8.0], SOLUSDT: [19, 26.3, 0.03, 1.04, -7.0], XRPUSDT: [15, 13.3, -0.48, 0.44, -9.0], LINKUSDT: [13, 38.5, 0.50, 1.81, -4.08], ADAUSDT: [18, 33.3, 0.30, 1.44, -7.0], AVAXUSDT: [11, 27.3, 0.07, 1.10, -3.0] }, rules: [60, 0.75, 30, 30, 0, 0.50, 3] },
  { id: 20, assets: { PEPEUSDT: [11, 9.1, -0.65, 0.29, -8.0], SOLUSDT: [20, 25.0, -0.03, 0.97, -7.0], XRPUSDT: [15, 13.3, -0.48, 0.44, -9.0], LINKUSDT: [14, 42.9, 0.65, 2.13, -4.0], ADAUSDT: [18, 33.3, 0.29, 1.44, -7.0], AVAXUSDT: [11, 27.3, 0.07, 1.10, -3.0] }, rules: [60, 0.75, 30, 30, 0, 0.10, 3] },
  { id: 29, assets: { PEPEUSDT: [9, 11.1, -0.57, 0.36, -6.0], SOLUSDT: [17, 29.4, 0.15, 1.21, -6.0], XRPUSDT: [11, 18.2, -0.29, 0.64, -6.0], LINKUSDT: [10, 40.0, 0.56, 1.93, -3.08], ADAUSDT: [15, 26.7, 0.04, 1.05, -7.0], AVAXUSDT: [10, 30.0, 0.18, 1.26, -3.0] }, rules: [60, 0.75, 50, 30, 0, 0.50, 3] },
];

const fourHour = [
  { id: 21, assets: { BTCUSDT: [135, 29.6, 0.10, 1.14], ETHUSDT: [123, 24.4, -0.09, 0.89], PEPEUSDT: [79, 30.4, 0.17, 1.24], XRPUSDT: [126, 24.6, -0.08, 0.89], SOLUSDT: [124, 25.8, -0.02, 0.98], ADAUSDT: [129, 27.9, 0.06, 1.08], AVAXUSDT: [123, 23.6, -0.11, 0.86], LINKUSDT: [119, 28.6, 0.08, 1.12] }, rules: [60, 0.75, 30, 30, 0, 0.50, 3] },
  { id: 20, assets: { BTCUSDT: [162, 29.0, 0.06, 1.08], ETHUSDT: [129, 24.0, -0.12, 0.85], PEPEUSDT: [84, 27.4, 0.04, 1.06], XRPUSDT: [148, 24.3, -0.11, 0.85], SOLUSDT: [145, 25.5, -0.04, 0.95], ADAUSDT: [138, 26.8, -0.00, 1.00], AVAXUSDT: [143, 25.2, -0.06, 0.92], LINKUSDT: [132, 28.8, 0.08, 1.11] }, rules: [60, 0.75, 30, 30, 0, 0.10, 3] },
  { id: 29, assets: { BTCUSDT: [103, 30.1, 0.12, 1.17], ETHUSDT: [99, 25.3, -0.05, 0.93], PEPEUSDT: [55, 30.9, 0.19, 1.28], XRPUSDT: [97, 23.7, -0.12, 0.84], SOLUSDT: [101, 26.7, 0.02, 1.03], ADAUSDT: [99, 31.3, 0.18, 1.27], AVAXUSDT: [98, 24.5, -0.07, 0.91], LINKUSDT: [93, 32.3, 0.23, 1.33] }, rules: [60, 0.75, 50, 30, 0, 0.50, 3] },
];

const fourHour2r = [
  { id: 21, assets: { BTCUSDT: [155, 36.1, 0.01, 1.01], ETHUSDT: [131, 32.1, -0.10, 0.86], PEPEUSDT: [82, 37.8, 0.09, 1.15], XRPUSDT: [139, 31.7, -0.11, 0.83], SOLUSDT: [134, 33.6, -0.04, 0.94], ADAUSDT: [137, 37.2, 0.06, 1.09], AVAXUSDT: [136, 30.1, -0.15, 0.79], LINKUSDT: [131, 33.6, -0.04, 0.93] }, rules: [60, 0.75, 30, 30, 0, 0.50, 2] },
  { id: 20, assets: { BTCUSDT: [173, 35.8, -0.03, 0.96], ETHUSDT: [139, 30.2, -0.17, 0.76], PEPEUSDT: [85, 35.3, 0.01, 1.02], XRPUSDT: [156, 27.6, -0.24, 0.66], SOLUSDT: [153, 32.0, -0.09, 0.86], ADAUSDT: [145, 37.9, 0.06, 1.10], AVAXUSDT: [147, 29.9, -0.16, 0.77], LINKUSDT: [138, 34.1, -0.04, 0.94] }, rules: [60, 0.75, 30, 30, 0, 0.10, 2] },
  { id: 29, assets: { BTCUSDT: [116, 38.8, 0.09, 1.14], ETHUSDT: [101, 32.7, -0.08, 0.88], PEPEUSDT: [57, 40.4, 0.17, 1.28], XRPUSDT: [102, 29.4, -0.18, 0.75], SOLUSDT: [107, 35.5, 0.02, 1.03], ADAUSDT: [102, 40.2, 0.14, 1.23], AVAXUSDT: [108, 29.6, -0.15, 0.78], LINKUSDT: [102, 37.3, 0.06, 1.10] }, rules: [60, 0.75, 50, 30, 0, 0.50, 2] },
];

const cat3Quality = [
  {
    id: 1,
    metrics: ['483', '+21.77%', '20.28%', '+0.48%', '1.26'],
    rules: [
      ['Signal universe', 'Cat3 fresh breakouts · 638 contracts'],
      ['Walk-forward split', '12M train · 6M validation · 3M outer test'],
      ['Portfolio', '10 positions · 10% current-equity notional · no leverage'],
      ['Entry', 'First executable hourly open after the completed trigger'],
      ['Exit', 'Validation-selected policy · 48h maximum hold'],
      ['Friction', '0.20% round-trip fee/slippage · funding excluded'],
      ['Selection gate', 'Positive validation return and mean trade; otherwise cash'],
    ],
  },
];

const cat3QualifiedFixed = [
  { id: 1, label: { ko: 'B · Hold 48h · Shortlist', en: 'B · Hold 48h · Shortlist' }, metrics: ['539', '+55.18%', '31.23%', '+0.96%', '49.17%', '1.37', '8.98%'], rules: [['필터 / Filter', 'B · 훈련 구간 BTC 상대 7일 로그수익 하위 20% / lowest training quintile'], ['청산 / Exit', '48시간 보유 후 시간 청산 / 48-hour time exit'], ['랭킹 / Ranking', 'shortlist 후 B 필터 적용 / rank shortlist, then apply B'], ['포트폴리오 / Portfolio', '최대 10개 · 진입당 자산 10% · 무레버리지'], ['비용 / Friction', '왕복 0.20% 수수료·슬리피지 · funding 제외'], ['상태 / Status', '전체 기간 사후 진단 통과 · 실전 승격 아님']] },
  { id: 2, label: { ko: 'B · Hold 48h · Filter-first', en: 'B · Hold 48h · Filter-first' }, metrics: ['631', '+67.27%', '37.28%', '+0.97%', '48.81%', '1.39', '10.49%'], rules: [['필터 / Filter', 'B · 훈련 구간 BTC 상대 7일 로그수익 하위 20% / lowest training quintile'], ['청산 / Exit', '48시간 보유 후 시간 청산 / 48-hour time exit'], ['랭킹 / Ranking', 'B 필터 후 shortlist 랭킹 / apply B, then rank shortlist'], ['포트폴리오 / Portfolio', '최대 10개 · 진입당 자산 10% · 무레버리지'], ['비용 / Friction', '왕복 0.20% 수수료·슬리피지 · funding 제외'], ['상태 / Status', '전체 기간 사후 진단 통과 · 실전 승격 아님']] },
  { id: 3, label: { ko: 'B · Fixed 5% · Shortlist', en: 'B · Fixed 5% · Shortlist' }, metrics: ['559', '+32.36%', '24.82%', '+0.62%', '42.93%', '1.25', '7.13%'], rules: [['필터 / Filter', 'B · 훈련 구간 BTC 상대 7일 로그수익 하위 20% / lowest training quintile'], ['청산 / Exit', '고정 -5% 손절 또는 48시간 시간 청산 / fixed -5% stop or 48-hour exit'], ['랭킹 / Ranking', 'shortlist 후 B 필터 적용 / rank shortlist, then apply B'], ['포트폴리오 / Portfolio', '최대 10개 · 진입당 자산 10% · 무레버리지'], ['비용 / Friction', '왕복 0.20% 수수료·슬리피지 · funding 제외'], ['상태 / Status', '전체 기간 사후 진단 통과 · 실전 승격 아님']] },
  { id: 4, label: { ko: 'B · Fixed 5% · Filter-first', en: 'B · Fixed 5% · Filter-first' }, metrics: ['651', '+42.60%', '27.15%', '+0.66%', '43.63%', '1.28', '8.49%'], rules: [['필터 / Filter', 'B · 훈련 구간 BTC 상대 7일 로그수익 하위 20% / lowest training quintile'], ['청산 / Exit', '고정 -5% 손절 또는 48시간 시간 청산 / fixed -5% stop or 48-hour exit'], ['랭킹 / Ranking', 'B 필터 후 shortlist 랭킹 / apply B, then rank shortlist'], ['포트폴리오 / Portfolio', '최대 10개 · 진입당 자산 10% · 무레버리지'], ['비용 / Friction', '왕복 0.20% 수수료·슬리피지 · funding 제외'], ['상태 / Status', '전체 기간 사후 진단 통과 · 실전 승격 아님']] },
  { id: 5, label: { ko: 'B · ATR 2x · Shortlist', en: 'B · ATR 2x · Shortlist' }, metrics: ['567', '+10.18%', '28.99%', '+0.29%', '38.45%', '1.11', '6.43%'], rules: [['필터 / Filter', 'B · 훈련 구간 BTC 상대 7일 로그수익 하위 20% / lowest training quintile'], ['청산 / Exit', '진입 시점 고정 4시간 ATR14의 2배 손절 또는 48시간 청산'], ['랭킹 / Ranking', 'shortlist 후 B 필터 적용 / rank shortlist, then apply B'], ['포트폴리오 / Portfolio', '최대 10개 · 진입당 자산 10% · 무레버리지'], ['비용 / Friction', '왕복 0.20% 수수료·슬리피지 · funding 제외'], ['상태 / Status', '전체 기간 사후 진단 통과 · 실전 승격 아님']] },
  { id: 6, label: { ko: 'B · ATR 2x · Filter-first', en: 'B · ATR 2x · Filter-first' }, metrics: ['661', '+18.09%', '30.54%', '+0.36%', '39.64%', '1.15', '7.63%'], rules: [['필터 / Filter', 'B · 훈련 구간 BTC 상대 7일 로그수익 하위 20% / lowest training quintile'], ['청산 / Exit', '진입 시점 고정 4시간 ATR14의 2배 손절 또는 48시간 청산'], ['랭킹 / Ranking', 'B 필터 후 shortlist 랭킹 / apply B, then rank shortlist'], ['포트폴리오 / Portfolio', '최대 10개 · 진입당 자산 10% · 무레버리지'], ['비용 / Friction', '왕복 0.20% 수수료·슬리피지 · funding 제외'], ['상태 / Status', '전체 기간 사후 진단 통과 · 실전 승격 아님']] },
  { id: 7, label: { ko: 'B · ATR 3x · Shortlist', en: 'B · ATR 3x · Shortlist' }, metrics: ['551', '+29.75%', '32.77%', '+0.62%', '44.65%', '1.22', '7.72%'], rules: [['필터 / Filter', 'B · 훈련 구간 BTC 상대 7일 로그수익 하위 20% / lowest training quintile'], ['청산 / Exit', '진입 시점 고정 4시간 ATR14의 3배 손절 또는 48시간 청산'], ['랭킹 / Ranking', 'shortlist 후 B 필터 적용 / rank shortlist, then apply B'], ['포트폴리오 / Portfolio', '최대 10개 · 진입당 자산 10% · 무레버리지'], ['비용 / Friction', '왕복 0.20% 수수료·슬리피지 · funding 제외'], ['상태 / Status', '전체 기간 사후 진단 통과 · 실전 승격 아님']] },
  { id: 8, label: { ko: 'B · ATR 3x · Filter-first', en: 'B · ATR 3x · Filter-first' }, metrics: ['650', '+35.12%', '34.80%', '+0.60%', '44.46%', '1.23', '9.09%'], rules: [['필터 / Filter', 'B · 훈련 구간 BTC 상대 7일 로그수익 하위 20% / lowest training quintile'], ['청산 / Exit', '진입 시점 고정 4시간 ATR14의 3배 손절 또는 48시간 청산'], ['랭킹 / Ranking', 'B 필터 후 shortlist 랭킹 / apply B, then rank shortlist'], ['포트폴리오 / Portfolio', '최대 10개 · 진입당 자산 10% · 무레버리지'], ['비용 / Friction', '왕복 0.20% 수수료·슬리피지 · funding 제외'], ['상태 / Status', '전체 기간 사후 진단 통과 · 실전 승격 아님']] },
  { id: 9, label: { ko: 'B · Structure · Shortlist', en: 'B · Structure · Shortlist' }, metrics: ['581', '+31.39%', '23.14%', '+0.58%', '35.97%', '1.26', '5.85%'], rules: [['필터 / Filter', 'B · 훈련 구간 BTC 상대 7일 로그수익 하위 20% / lowest training quintile'], ['청산 / Exit', 'boxHigh - 0.5 ATR 구조 이탈, 3 ATR 비상 손절, 최대 48시간'], ['랭킹 / Ranking', 'shortlist 후 B 필터 적용 / rank shortlist, then apply B'], ['포트폴리오 / Portfolio', '최대 10개 · 진입당 자산 10% · 무레버리지'], ['비용 / Friction', '왕복 0.20% 수수료·슬리피지 · funding 제외'], ['상태 / Status', '전체 기간 사후 진단 통과 · 실전 승격 아님']] },
  { id: 10, label: { ko: 'B · Structure · Filter-first', en: 'B · Structure · Filter-first' }, metrics: ['685', '+50.75%', '25.17%', '+0.70%', '37.37%', '1.34', '7.07%'], rules: [['필터 / Filter', 'B · 훈련 구간 BTC 상대 7일 로그수익 하위 20% / lowest training quintile'], ['청산 / Exit', 'boxHigh - 0.5 ATR 구조 이탈, 3 ATR 비상 손절, 최대 48시간'], ['랭킹 / Ranking', 'B 필터 후 shortlist 랭킹 / apply B, then rank shortlist'], ['포트폴리오 / Portfolio', '최대 10개 · 진입당 자산 10% · 무레버리지'], ['비용 / Friction', '왕복 0.20% 수수료·슬리피지 · funding 제외'], ['상태 / Status', '전체 기간 사후 진단 통과 · 실전 승격 아님']] },
  { id: 11, label: { ko: 'B · Stalled · Shortlist', en: 'B · Stalled · Shortlist' }, metrics: ['583', '+10.49%', '29.64%', '+0.27%', '36.54%', '1.11', '6.42%'], rules: [['필터 / Filter', 'B · 훈련 구간 BTC 상대 7일 로그수익 하위 20% / lowest training quintile'], ['청산 / Exit', '12시간 수익 비양수 및 저항선 아래 종가 시 청산, 3 ATR 손절, 최대 48시간'], ['랭킹 / Ranking', 'shortlist 후 B 필터 적용 / rank shortlist, then apply B'], ['포트폴리오 / Portfolio', '최대 10개 · 진입당 자산 10% · 무레버리지'], ['비용 / Friction', '왕복 0.20% 수수료·슬리피지 · funding 제외'], ['상태 / Status', '전체 기간 사후 진단 통과 · 실전 승격 아님']] },
  { id: 12, label: { ko: 'B · Stalled · Filter-first', en: 'B · Stalled · Filter-first' }, metrics: ['679', '+19.99%', '32.15%', '+0.37%', '37.85%', '1.16', '7.70%'], rules: [['필터 / Filter', 'B · 훈련 구간 BTC 상대 7일 로그수익 하위 20% / lowest training quintile'], ['청산 / Exit', '12시간 수익 비양수 및 저항선 아래 종가 시 청산, 3 ATR 손절, 최대 48시간'], ['랭킹 / Ranking', 'B 필터 후 shortlist 랭킹 / apply B, then rank shortlist'], ['포트폴리오 / Portfolio', '최대 10개 · 진입당 자산 10% · 무레버리지'], ['비용 / Friction', '왕복 0.20% 수수료·슬리피지 · funding 제외'], ['상태 / Status', '전체 기간 사후 진단 통과 · 실전 승격 아님']] },
];

const reports = [
{"id":"cat3-tag-performance","date":"2026-09-01","customPerformance":true,"timeframe":"6h / 48h","marketLabel":"Cat3 fixed tags","name":{"ko":"Catching Cat 3 · 6h/48h 태그 성능","en":"Catching Cat 3 · 6h/48h Tag Performance"},"desc":{"ko":"BC·S 등 승인한 7개 태그의 양수 평균 순수익 결과. 재사용된 과거 이력의 신호 통계이며 포트폴리오 성과나 독립 OOS 검증이 아닙니다.","en":"Positive mean net returns for seven approved tags, including BC and S. Reused-history signal statistics, not portfolio performance or independent OOS validation."},"status":{"ko":"S는 selected와 다른 고정 태그입니다. CVD 정책의 검증된 개선은 입증되지 않았습니다. 수치는 원본 보고서의 반올림 값입니다.","en":"S is a separate fixed tag, not selected. Validated CVD improvement was not established. Values are rounded as in the source report."},"configs":[{"id":1,"label":{"ko":"A · 6h","en":"A · 6h"},"metrics":["1660","+0.02%","44.10%","55.90%"],"rules":[["태그 / Tag","6H 로그수익 하위 20% / lowest discovery quintile of 6H log return"],["청산 / Exit","6h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]},{"id":2,"label":{"ko":"B · 6h","en":"B · 6h"},"metrics":["1317","+0.18%","49.28%","50.72%"],"rules":[["태그 / Tag","7D BTC 상대 로그수익 하위 20% / lowest discovery quintile of BTC-relative return"],["청산 / Exit","6h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]},{"id":3,"label":{"ko":"AB · 6h","en":"AB · 6h"},"metrics":["502","+0.08%","47.61%","52.39%"],"rules":[["태그 / Tag","6H 로그수익 하위 20% / lowest discovery quintile of 6H log return AND 7D BTC 상대 로그수익 하위 20% / lowest discovery quintile of BTC-relative return"],["청산 / Exit","6h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]},{"id":4,"label":{"ko":"AC · 6h","en":"AC · 6h"},"metrics":["897","+0.09%","44.59%","55.41%"],"rules":[["태그 / Tag","6H 로그수익 하위 20% / lowest discovery quintile of 6H log return AND 베이스 폭 하위 20% / lowest discovery quintile of base width"],["청산 / Exit","6h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]},{"id":5,"label":{"ko":"BC · 6h","en":"BC · 6h"},"metrics":["666","+0.26%","50.30%","49.70%"],"rules":[["태그 / Tag","7D BTC 상대 로그수익 하위 20% / lowest discovery quintile of BTC-relative return AND 베이스 폭 하위 20% / lowest discovery quintile of base width"],["청산 / Exit","6h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]},{"id":6,"label":{"ko":"ABC · 6h","en":"ABC · 6h"},"metrics":["339","+0.12%","48.97%","51.03%"],"rules":[["태그 / Tag","6H 로그수익 하위 20% / lowest discovery quintile of 6H log return AND 7D BTC 상대 로그수익 하위 20% / lowest discovery quintile of BTC-relative return AND 베이스 폭 하위 20% / lowest discovery quintile of base width"],["청산 / Exit","6h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]},{"id":7,"label":{"ko":"S · 6h","en":"S · 6h"},"metrics":["278","+0.70%","59.71%","40.29%"],"rules":[["태그 / Tag","0.055992955528061696 < logReturn14D ≤ 0.11464563343350571 AND logReturn6H ≤ 0.027699706688823548"],["청산 / Exit","6h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]},{"id":8,"label":{"ko":"A · 48h","en":"A · 48h"},"metrics":["1630","+0.74%","51.72%","48.28%"],"rules":[["태그 / Tag","6H 로그수익 하위 20% / lowest discovery quintile of 6H log return"],["청산 / Exit","48h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]},{"id":9,"label":{"ko":"B · 48h","en":"B · 48h"},"metrics":["1297","+1.66%","51.43%","48.57%"],"rules":[["태그 / Tag","7D BTC 상대 로그수익 하위 20% / lowest discovery quintile of BTC-relative return"],["청산 / Exit","48h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]},{"id":10,"label":{"ko":"AB · 48h","en":"AB · 48h"},"metrics":["491","+1.12%","52.95%","47.05%"],"rules":[["태그 / Tag","6H 로그수익 하위 20% / lowest discovery quintile of 6H log return AND 7D BTC 상대 로그수익 하위 20% / lowest discovery quintile of BTC-relative return"],["청산 / Exit","48h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]},{"id":11,"label":{"ko":"AC · 48h","en":"AC · 48h"},"metrics":["873","+0.96%","54.41%","45.59%"],"rules":[["태그 / Tag","6H 로그수익 하위 20% / lowest discovery quintile of 6H log return AND 베이스 폭 하위 20% / lowest discovery quintile of base width"],["청산 / Exit","48h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]},{"id":12,"label":{"ko":"BC · 48h","en":"BC · 48h"},"metrics":["656","+2.34%","54.57%","45.43%"],"rules":[["태그 / Tag","7D BTC 상대 로그수익 하위 20% / lowest discovery quintile of BTC-relative return AND 베이스 폭 하위 20% / lowest discovery quintile of base width"],["청산 / Exit","48h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]},{"id":13,"label":{"ko":"ABC · 48h","en":"ABC · 48h"},"metrics":["329","+1.46%","54.71%","45.29%"],"rules":[["태그 / Tag","6H 로그수익 하위 20% / lowest discovery quintile of 6H log return AND 7D BTC 상대 로그수익 하위 20% / lowest discovery quintile of BTC-relative return AND 베이스 폭 하위 20% / lowest discovery quintile of base width"],["청산 / Exit","48h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]},{"id":14,"label":{"ko":"S · 48h","en":"S · 48h"},"metrics":["274","+2.52%","62.04%","37.96%"],"rules":[["태그 / Tag","0.055992955528061696 < logReturn14D ≤ 0.11464563343350571 AND logReturn6H ≤ 0.027699706688823548"],["청산 / Exit","48h fixed holding; no stop or take-profit"],["비용 / Costs","0.20% round trip; funding excluded"],["해석 / Interpretation","사후 신호 통계 / Retrospective signal statistics, not portfolio returns"]]}],"performance":{"headers":{"ko":["신호 수","평균 순수익","승률","종료 손실률"],"en":["Signals","Mean net","Win rate","Terminal loss"]}},"charts":[],"captions":[],"files":[["태그 보고서","Tag report","/assets/cat3-tags/README.md"],["태그 성능 CSV","Tag metrics CSV","/assets/cat3-tags/summary.csv"]]},
  {
    id: 'cat3-qualified-fixed-policies',
    date: '2026-09-01',
    customPerformance: true,
    timeframe: '1h / 48h maximum',
    marketLabel: 'Binance USD-M futures · Cat3 B-filter',
    name: { ko: 'Catching Cat 3 · 통과한 고정 정책', en: 'Catching Cat 3 · Qualified Fixed Policies' },
    desc: { ko: '고정된 전체 기간 진단 기준을 통과한 B 필터 정책 12개입니다. 사후 관찰 결과이며, 워크포워드로 사전 선택된 실전 후보가 아닙니다.', en: 'Twelve B-filter policies that passed the frozen full-period diagnostic gate. These are post-hoc observations, not walk-forward-selected deployable candidates.' },
    status: { ko: '양수·최소 거래·실패율·정체 손실 기준을 모두 통과한 12개만 포함 · 왕복 0.20% 비용 반영 · funding 및 실제 체결 충격 제외', en: 'Only 12 policies passing return, trade-count, failure-rate, and stagnant-loss gates · 0.20% modeled round-trip friction · funding and live impact excluded' },
    configs: cat3QualifiedFixed,
    performance: { headers: { ko: ['거래', '순수익', '최대 낙폭', '평균 거래', '승률', 'PF', '노출'], en: ['Trades', 'Net return', 'Max DD', 'Mean trade', 'Win rate', 'PF', 'Exposure'] } },
    charts: [],
    captions: [],
    files: [
      ['통과 정책 요약', 'Qualified-policy summary', '/assets/catching-cat3-qualified-fixed-2026-10-31/SUMMARY.md'],
      ['B Hold48 Shortlist 거래', 'B Hold48 Shortlist trades', '/assets/catching-cat3-qualified-fixed-2026-10-31/trades-B-hold48-shortlist.csv'],
      ['B Hold48 Filter-first 거래', 'B Hold48 Filter-first trades', '/assets/catching-cat3-qualified-fixed-2026-10-31/trades-B-hold48-filterfirst.csv'],
      ['B Fixed5 Shortlist 거래', 'B Fixed5 Shortlist trades', '/assets/catching-cat3-qualified-fixed-2026-10-31/trades-B-fixed5-shortlist.csv'],
      ['B Fixed5 Filter-first 거래', 'B Fixed5 Filter-first trades', '/assets/catching-cat3-qualified-fixed-2026-10-31/trades-B-fixed5-filterfirst.csv'],
      ['B ATR2 Shortlist 거래', 'B ATR2 Shortlist trades', '/assets/catching-cat3-qualified-fixed-2026-10-31/trades-B-atr2-shortlist.csv'],
      ['B ATR2 Filter-first 거래', 'B ATR2 Filter-first trades', '/assets/catching-cat3-qualified-fixed-2026-10-31/trades-B-atr2-filterfirst.csv'],
      ['B ATR3 Shortlist 거래', 'B ATR3 Shortlist trades', '/assets/catching-cat3-qualified-fixed-2026-10-31/trades-B-atr3-shortlist.csv'],
      ['B ATR3 Filter-first 거래', 'B ATR3 Filter-first trades', '/assets/catching-cat3-qualified-fixed-2026-10-31/trades-B-atr3-filterfirst.csv'],
      ['B Structure Shortlist 거래', 'B Structure Shortlist trades', '/assets/catching-cat3-qualified-fixed-2026-10-31/trades-B-structure-shortlist.csv'],
      ['B Structure Filter-first 거래', 'B Structure Filter-first trades', '/assets/catching-cat3-qualified-fixed-2026-10-31/trades-B-structure-filterfirst.csv'],
      ['B Stalled Shortlist 거래', 'B Stalled Shortlist trades', '/assets/catching-cat3-qualified-fixed-2026-10-31/trades-B-stalled-shortlist.csv'],
      ['B Stalled Filter-first 거래', 'B Stalled Filter-first trades', '/assets/catching-cat3-qualified-fixed-2026-10-31/trades-B-stalled-filterfirst.csv'],
    ],
  },
  {
    id: 'cat3-walk-forward-quality',
    date: '2026-09-01',
    customPerformance: true,
    timeframe: '1h / 48h',
    marketLabel: '638 Binance USD-M futures contracts',
    name: { ko: 'Catching Cat 3 · 저실패율 워크포워드', en: 'Catching Cat 3 · Low-Failure Walk-Forward' },
    desc: {
      ko: '시간순 외부 검증 구간에서 선택된 양의 수익 포트폴리오입니다. 실패한 후보와 음수 결과는 이 리포트에 포함하지 않았습니다.',
      en: 'A positive-return portfolio selected on chronological outer-test segments. Failed candidates and negative results are intentionally excluded from this report.',
    },
    status: {
      ko: '483건 · 수수료·슬리피지 0.20% 반영 후 +21.77% · PF 1.26 · 자금조달비와 실제 체결 충격은 미반영',
      en: '483 trades · +21.77% after 0.20% modeled friction · PF 1.26 · funding and live market impact excluded',
    },
    configs: cat3Quality,
    performance: { headers: ['Trades', 'Net return', 'Max DD', 'Mean trade', 'PF'] },
    charts: [],
    captions: [],
    files: [
      ['양의 결과 요약', 'Positive-result summary', '/assets/catching-cat3-quality-2026-10-31/SUMMARY.md'],
      ['전략 및 실행 가정', 'Strategy and execution assumptions', '/assets/catching-cat3-quality-2026-10-31/EXECUTION.md'],
      ['선택된 거래 원장', 'Selected trade ledger', '/assets/catching-cat3-quality-2026-10-31/trades-selected.csv'],
      ['워크포워드 러너', 'Walk-forward runner', '/assets/catching-cat3-quality-2026-10-31/cat3-quality-run.cjs'],
      ['검증 테스트', 'Validation tests', '/assets/catching-cat3-quality-2026-10-31/cat3-quality.test.cjs'],
    ],
  },
  {
    id: 'daily-w-pattern-neckline-retest-2026-08-16', date: '2026-08-16', multiAsset: true, timeframe: 'Daily',
    marketLabel: 'BTCUSDT / ETHUSDT / SOLUSDT / PEPEUSDT / DOGEUSDT',
    name: { ko: '일봉 W 패턴 넥라인 리테스트', en: 'Daily W-Pattern Neckline Retest' },
    desc: {
      ko: '일봉 지지구간에서 형성된 W 패턴이 넥라인을 돌파한 뒤, 리테스트를 확인하고 다음 일봉 시가에 진입하는 전략의 과거 인샘플 기계적 백테스트입니다. 투자 자문이 아닙니다.',
      en: 'Historical in-sample mechanical backtest of entering at the next daily open after a support-qualified W breaks out and retests its neckline. This is not financial advice.',
    },
    status: {
      ko: '70건 거래 · +27.18 순 R · +29.53% · PF 2.01 · 최대 종가 자산 낙폭 7.18%. 과거 인샘플 기계적 연구 결과로, 투자 자문이 아닙니다.',
      en: '70 trades · +27.18 net R · +29.53% · PF 2.01 · max drawdown 7.18%. Historical in-sample mechanical research; not financial advice.',
    },
    configs: dailyWPattern,
    customRules: [
      { label: { ko: '일봉 피봇', en: 'Daily pivots' }, value: { ko: '좌우 각 3개 캔들, 세 번째 우측 캔들 후 확정', en: 'Three candles left and right; confirmed after the third right candle' } },
      { label: { ko: '선행 지지선', en: 'Pre-existing support' }, value: { ko: '2% 이내의 이전 확정 피봇 저점 최소 2개', en: 'At least two earlier confirmed pivot lows within 2%' } },
      { label: { ko: 'W 저점', en: 'W troughs' }, value: { ko: '5–60봉 간격, 서로 3% 이내', en: '5–60 bars apart and within 3% of each other' } },
      { label: { ko: '돌파', en: 'Breakout' }, value: { ko: '60봉 이내 중간 고점 넥라인 상향 첫 종가', en: 'First close above the intervening-high neckline within 60 bars' } },
      { label: { ko: '리테스트', en: 'Retest' }, value: { ko: '30봉 이내 ±1% 넥라인 구간을 터치하고 넥라인 이상에서 종가한 첫 캔들', en: 'First later candle intersecting the ±1% neckline band and closing at or above it, within 30 bars' } },
      { label: { ko: '진입', en: 'Entry' }, value: { ko: '다음 일봉 시가', en: 'Next daily open' } },
      { label: { ko: '리스크 관리', en: 'Risk management' }, value: { ko: '더 낮은 저점 1% 아래 손절, 1R 도달 다음 캔들부터 본전, 2R 목표, 60봉 시간 청산', en: 'Stop 1% below the lower trough, breakeven after 1R starting next candle, 2R target, 60-bar time exit' } },
      { label: { ko: '비용 및 사이징', en: 'Costs and sizing' }, value: { ko: '진입·청산 각 10bp, 진입당 포트폴리오 리스크 1%', en: '10 bps each side and 1% portfolio risk per entry' } },
    ],
    charts: ['/charts/daily-w-pattern-equity-2026-08-16.png', '/charts/daily-w-pattern-drawdown-2026-08-16.png', '/charts/daily-w-pattern-assets-2026-08-16.png', '/charts/daily-w-pattern-sensitivity-2026-08-16.png'],
    captions: ['Combined closed-equity curve', 'Combined closed-equity drawdown', 'Independent per-asset net R', 'Sensitivity robustness across 27 variants'],
    files: [
      ['연구 요약', 'Research summary', '/assets/daily-w-pattern-neckline-retest-2026-08-16/SUMMARY.md'],
      ['기준 결과', 'Baseline summary', '/assets/daily-w-pattern-neckline-retest-2026-08-16/baseline_summary.csv'],
      ['민감도 결과', 'Sensitivity summary', '/assets/daily-w-pattern-neckline-retest-2026-08-16/sensitivity_summary.csv'],
      ['거래 원장', 'Trade ledger', '/assets/daily-w-pattern-neckline-retest-2026-08-16/trades.csv'],
      ['고정 설정', 'Frozen configuration', '/assets/daily-w-pattern-neckline-retest-2026-08-16/config.json'],
      ['패키지 실행기', 'Packaged runner', '/assets/daily-w-pattern-neckline-retest-2026-08-16/backtest/run_backtest.py'],
    ],
  },
  {
    id: 'daily-support-bounce', date: '2026-08-03',
    name: { ko: '일봉 지지선 강세 캔들', en: 'Daily Support Bullish Candle' },
    desc: { ko: '기본 BTC/ETH 일봉 지지선 반등 연구입니다.', en: 'Original BTC/ETH daily support-bounce study.' },
    status: { ko: '공통 60% 승률 조건을 만족하는 조합은 찾지 못했습니다.', en: 'No common configuration met the 60% win-rate condition.' },
    configs: baseline,
    charts: ['/charts/config-5016-btc-equity.png', '/charts/config-5016-eth-equity.png'],
    captions: ['BTCUSDT · 18 trades · +0.07R · PF 1.09', 'ETHUSDT · 11 trades · +0.42R · PF 1.66'],
    files: [['전략 README', 'Strategy README', '/assets/daily-support-bounce/README.md'], ['백테스트 엔진', 'Backtest engine', '/assets/daily-support-bounce/btc_support_backtest.py'], ['결과 요약', 'Result summary', '/assets/daily-support-bounce/SUMMARY.md']],
  },
  {
    id: 'daily-support-variants', date: '2026-08-03',
    name: { ko: '지지선 강세 캔들 · 변형 연구', en: 'Support Bullish Candle · Sweep-Reclaim Study' },
    desc: { ko: '강한 종가, 불리시 엔골핑, 지지선 하향 스윕 후 회복 변형을 2024년 이후 보류 구간에서 비교했습니다.', en: 'Compared strong-close, bullish-engulfing, and sweep-reclaim variants on the 2024+ holdout.' },
    status: { ko: '최선의 균형 후보는 #21입니다. BTC 38.5%, ETH 50.0% 승률로 60% 목표에는 미달합니다.', en: 'Best balanced candidate: #21. BTC 38.5% and ETH 50.0% win rates do not meet the 60% target.' },
    configs: variants,
    charts: ['/charts/support-variants-sweep-21-btc.png', '/charts/support-variants-sweep-21-eth.png'],
    captions: ['BTCUSDT · 13 trades · +0.47R · PF 1.76', 'ETHUSDT · 14 trades · +0.96R · PF 2.92'],
    files: [['연구 요약', 'Research summary', '/assets/daily-support-variants-2026-08-03/SUMMARY.md'], ['변형 백테스트 코드', 'Variant backtest code', '/assets/daily-support-variants-2026-08-03/research_support_variants.py'], ['백테스트 엔진', 'Backtest engine', '/assets/daily-support-variants-2026-08-03/btc_support_backtest.py'], ['설정 그리드', 'Configuration grid', '/assets/daily-support-variants-2026-08-03/config_grid.csv'], ['개발 구간 성과', 'Development metrics', '/assets/daily-support-variants-2026-08-03/development_metrics.csv'], ['보류 구간 성과', 'Holdout metrics', '/assets/daily-support-variants-2026-08-03/holdout_metrics.csv'], ['#21 BTC 거래', '#21 BTC trades', '/assets/daily-support-variants-2026-08-03/sweep_reclaim_21_btc_trades.csv'], ['#21 ETH 거래', '#21 ETH trades', '/assets/daily-support-variants-2026-08-03/sweep_reclaim_21_eth_trades.csv']],
  },
  {
    id: 'pepe-fixed-sweep-reclaim', date: '2026-08-04', multiAsset: true,
    name: { ko: 'PEPE · Sweep-Reclaim 고정 조합', en: 'PEPE · Fixed Sweep-Reclaim Configurations' },
    desc: { ko: 'BTC·ETH에서 정한 #21, #20, #29를 재최적화 없이 PEPE·SOL·XRP·LINK·ADA·AVAX에 그대로 적용한 보류구간 검증입니다.', en: 'Applied BTC/ETH-selected #21, #20, and #29 to PEPE, SOL, XRP, LINK, ADA, and AVAX without asset-specific re-optimization.' },
    status: { ko: '자산별 편차가 큽니다. LINK는 양의 기대값이지만 XRP는 모든 조합에서 음수이며, PEPE도 채택 근거가 없습니다.', en: 'Results vary materially by asset. LINK is positive, while XRP is negative in every configuration and PEPE does not support adoption.' },
    configs: pepe,
    charts: ['/charts/link-sweep-21-equity.png', '/charts/link-sweep-21-r-distribution.png'],
    captions: ['LINKUSDT · #21 equity curve · 2024+ holdout', 'LINKUSDT · #21 net R distribution'],
    files: [['PEPE 결과 요약', 'PEPE result summary', '/assets/pepe-sweep-reclaim-2026-08-04/SUMMARY.md'], ['PEPE 백테스트 코드', 'PEPE backtest code', '/assets/pepe-sweep-reclaim-2026-08-04/backtest_pepe_sweep_configs.py'], ['알트코인 결과 요약', 'Altcoin result summary', '/assets/pepe-sweep-reclaim-2026-08-04/altcoins/SUMMARY.md'], ['알트코인 백테스트 코드', 'Altcoin backtest code', '/assets/pepe-sweep-reclaim-2026-08-04/altcoins/backtest_alt_sweep_configs.py'], ['알트코인 보류 구간 성과', 'Altcoin holdout metrics', '/assets/pepe-sweep-reclaim-2026-08-04/altcoins/holdout_metrics.csv'], ['#21 PEPE 거래', '#21 PEPE trades', '/assets/pepe-sweep-reclaim-2026-08-04/sweep_reclaim_21_pepe_trades.csv'], ['#21 LINK 거래', '#21 LINK trades', '/assets/pepe-sweep-reclaim-2026-08-04/altcoins/sweep_reclaim_21_linkusdt_trades.csv'], ['#20 LINK 거래', '#20 LINK trades', '/assets/pepe-sweep-reclaim-2026-08-04/altcoins/sweep_reclaim_20_linkusdt_trades.csv'], ['#29 LINK 거래', '#29 LINK trades', '/assets/pepe-sweep-reclaim-2026-08-04/altcoins/sweep_reclaim_29_linkusdt_trades.csv']],
  },
  {
    id: 'four-hour-fixed-sweep-reclaim', date: '2026-08-04', multiAsset: true, timeframe: '4h',
    name: { ko: '4시간 · Sweep-Reclaim 고정 조합', en: '4-Hour · Fixed Sweep-Reclaim Configurations' },
    desc: { ko: '일봉 연구에서 고른 #21·#20·#29를 재최적화 없이 4시간봉 BTC·ETH·PEPE·XRP·SOL·ADA·AVAX·LINK에 적용했습니다.', en: 'Applied daily-study #21, #20, and #29 to 4-hour BTC, ETH, PEPE, XRP, SOL, ADA, AVAX, and LINK without re-optimization.' },
    status: { ko: '#29가 가장 강했지만 ETH·AVAX·XRP는 음수입니다. 공통 자산 엣지로 채택하기에는 자산별 편차가 큽니다.', en: '#29 is strongest, but ETH, AVAX, and XRP remain negative. Cross-asset dispersion is too large for a universal edge claim.' },
    configs: fourHour,
    charts: ['/charts/four-hour-link-29-equity.png', '/charts/four-hour-link-29-r-distribution.png'],
    captions: ['LINKUSDT · 4h #29 equity curve · 2024+ holdout', 'LINKUSDT · 4h #29 net R distribution'],
    files: [['결과 요약', 'Result summary', '/assets/four-hour-sweep-reclaim-2026-08-04/SUMMARY.md'], ['4시간 백테스트 코드', '4-hour backtest code', '/assets/four-hour-sweep-reclaim-2026-08-04/backtest_4h_fixed_sweep.py'], ['설정 그리드', 'Configuration grid', '/assets/four-hour-sweep-reclaim-2026-08-04/config_grid.csv'], ['보류 구간 성과', 'Holdout metrics', '/assets/four-hour-sweep-reclaim-2026-08-04/holdout_metrics.csv'], ['#29 BTC 거래', '#29 BTC trades', '/assets/four-hour-sweep-reclaim-2026-08-04/sweep_reclaim_29_btcusdt_trades.csv'], ['#29 LINK 거래', '#29 LINK trades', '/assets/four-hour-sweep-reclaim-2026-08-04/sweep_reclaim_29_linkusdt_trades.csv'], ['#29 ADA 거래', '#29 ADA trades', '/assets/four-hour-sweep-reclaim-2026-08-04/sweep_reclaim_29_adausdt_trades.csv'], ['#29 PEPE 거래', '#29 PEPE trades', '/assets/four-hour-sweep-reclaim-2026-08-04/sweep_reclaim_29_pepeusdt_trades.csv']],
  },
  {
    id: 'four-hour-fixed-sweep-reclaim-2r', date: '2026-08-04', multiAsset: true, timeframe: '4h',
    name: { ko: '4시간 · Sweep-Reclaim 고정 조합 · 2R', en: '4-Hour · Fixed Sweep-Reclaim Configurations · 2R' },
    desc: { ko: '#20·#21·#29의 나머지 규칙은 유지하고 목표 익절만 3R에서 2R로 낮춘 재검증입니다.', en: 'Re-tested #20, #21, and #29 with every rule unchanged except the profit target, reduced from 3R to 2R.' },
    status: { ko: 'PEPE #29가 +0.17R로 가장 높고 ADA #29가 뒤를 잇습니다. ETH·AVAX·XRP는 모든 조합에서 음수입니다.', en: 'PEPE #29 is highest at +0.17R, followed by ADA #29. ETH, AVAX, and XRP are negative in every configuration.' },
    configs: fourHour2r,
    charts: ['/charts/four-hour-2r-pepe-29-equity.png', '/charts/four-hour-2r-pepe-29-r-distribution.png'],
    captions: ['PEPEUSDT · 4h #29 · 2R equity curve · 2024+ holdout', 'PEPEUSDT · 4h #29 · 2R net R distribution'],
    files: [['결과 요약', 'Result summary', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/SUMMARY.md'], ['4시간 2R 백테스트 코드', '4-hour 2R backtest code', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/backtest_4h_fixed_sweep_2r.py'], ['설정 그리드', 'Configuration grid', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/config_grid.csv'], ['보류 구간 성과', 'Holdout metrics', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/holdout_metrics.csv'], ['#29 PEPE 거래', '#29 PEPE trades', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/sweep_reclaim_29_pepeusdt_trades.csv'], ['#29 ADA 거래', '#29 ADA trades', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/sweep_reclaim_29_adausdt_trades.csv'], ['#29 BTC 거래', '#29 BTC trades', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/sweep_reclaim_29_btcusdt_trades.csv'], ['#29 LINK 거래', '#29 LINK trades', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/sweep_reclaim_29_linkusdt_trades.csv']],
  },
];

const copy = {
  ko: { reports: '리포트 선택', rules: '선택한 조합 규칙', perf: '후보 조합 성과', files: '전략 파일', copied: '복사됨', loading: '파일을 불러오는 중…', failed: '복사하지 못했습니다', support: '지지선', touch: '터치 범위', body: '몸통 비율', close: '종가 위치', trend: '추세 필터', stop: '손절 버퍼', target: '익절 목표', none: '없음', result: '검증 결과', equity: '자산 곡선' },
  en: { reports: 'Select report', rules: 'Selected configuration rules', perf: 'Candidate performance', files: 'Strategy files', copied: 'Copied', loading: 'Loading file…', failed: 'Could not copy', support: 'Support age', touch: 'Touch band', body: 'Body ratio', close: 'Close location', trend: 'Trend filter', stop: 'Stop buffer', target: 'Profit target', none: 'None', result: 'Validation result', equity: 'Equity curves' },
};

let lang = 'ko';
let selectedReport = 'cat3-tag-performance';
let selectedId = 1;

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function ruleCards(ruleSet, t) {
  if (Array.isArray(ruleSet?.[0])) {
    return ruleSet.map(([label, value]) => '<div><span>' + label + '</span><b>' + value + '</b></div>').join('');
  }
  return [[t.support, `${ruleSet[0]} bars (3-left / 3-right swing low)`], [t.touch, `±${ruleSet[1].toFixed(2)}%`], [t.body, `≥ ${ruleSet[2]}% of range`], [t.close, `Top ${ruleSet[3]}%`], [t.trend, ruleSet[4] ? `Close > SMA ${ruleSet[4]}` : t.none], [t.stop, `${ruleSet[5].toFixed(2)}% below signal low`], [t.target, `${ruleSet[6].toFixed(1)}R`]]
    .map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('');
}

export function reportRuleCards(report, activeConfig, lang, t) {
  if (!report.customRules) return ruleCards(activeConfig.rules, t);
  return report.customRules
    .map((rule) => `<div><span>${escapeHtml(rule.label[lang])}</span><b>${escapeHtml(rule.value[lang])}</b></div>`)
    .join('');
}

export function resolveMarketLabel(report, isMultiAsset) {
  return report.marketLabel || (isMultiAsset
    ? 'PEPEUSDT / SOLUSDT / XRPUSDT / LINKUSDT / ADAUSDT / AVAXUSDT'
    : report.symbol || 'BTCUSDT / ETHUSDT');
}

function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  return copied ? Promise.resolve() : Promise.reject(new Error('Copy unavailable'));
}

const sortedReports = [...reports, ...researchReports].sort((a, b) => b.date.localeCompare(a.date));

function reportOptions() {
  return sortedReports.map((item) => `<option value="${item.id}" ${item.id === selectedReport ? 'selected' : ''}>${escapeHtml((item.name || item.title)[lang])} · ${item.date}</option>`).join('');
}

function selectReport(id, focus = true) {
  selectedReport = id;
  const legacy = reports.find((item) => item.id === id);
  if (legacy) selectedId = legacy.configs[0].id;
  render();
  if (focus) {
    const heading = document.querySelector('#report-title, h1');
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function bindResearchFileViewer() {
  const buttons = document.querySelectorAll('.file-select');
  const load = async (button) => {
    document.querySelector('#file-name').textContent = button.textContent;
    const output = document.querySelector('#file-content');
    output.textContent = copy[lang].loading;
    try { const response = await fetch(`/assets/catching-cat-research/${button.dataset.evidencePath}`); output.textContent = response.ok ? await response.text() : 'Could not load file.'; }
    catch { output.textContent = 'Could not load file.'; }
  };
  buttons.forEach((button) => { button.onclick = () => load(button); });
  document.querySelector('#copy-file').onclick = async () => { const status = document.querySelector('#copy-status'); try { await copyText(document.querySelector('#file-content').textContent); status.textContent = copy[lang].copied; } catch { status.textContent = copy[lang].failed; } };
  if (buttons[0]) load(buttons[0]);
}

function renderResearchPage(report) {
  const t = copy[lang];
  document.querySelector('#app').innerHTML = `<div class="wrap"><nav><span class="brand"><img src="/assets/brand/bt-logo.png" alt="BT Lab logo"><span class="brand-copy">BT LAB<small>BACKTEST RESEARCH</small></span></span><div class="nav-controls"><label class="report-control">${t.reports}<select id="report">${reportOptions()}</select></label><div id="language-toggle" role="group" aria-label="Language"><button type="button" data-lang="ko" class="${lang === 'ko' ? 'active' : ''}" aria-pressed="${lang === 'ko'}">KR</button><button type="button" data-lang="en" class="${lang === 'en' ? 'active' : ''}" aria-pressed="${lang === 'en'}">EN</button></div></div></nav>${renderResearchReport(report, { lang, lineage: researchLineage, reports: researchReports })}</div>`;
  document.querySelector('#report').onchange = (event) => selectReport(event.target.value);
  document.querySelectorAll('[data-lang]').forEach((button) => { button.onclick = () => { lang = button.dataset.lang; render(); }; });
  document.querySelectorAll('[data-report-id]:not([disabled])').forEach((button) => { button.onclick = () => selectReport(button.dataset.reportId); });
  bindResearchFileViewer();
}

function render() {
  const t = copy[lang];
  const researchReport = researchReports.find((item) => item.id === selectedReport);
  if (researchReport) { renderResearchPage(researchReport); return; }
  const report = reports.find((item) => item.id === selectedReport);
  const activeConfig = report.configs.find((item) => item.id === selectedId);
  const isSingleAsset = Boolean(report.symbol);
  const isMultiAsset = Boolean(report.multiAsset);
  const isCustom = Boolean(report.customPerformance);
  const customRows = isCustom ? [...report.configs].sort((a, b) => parseFloat(b.metrics[1]) - parseFloat(a.metrics[1])).map((config) => {
    const cells = config.metrics.map((value) => '<td>' + value + '</td>').join('');
    const detail = selectedId === config.id ? '<tr class="config-detail-row"><td colspan="' + (config.metrics.length + 1) + '"><div class="config-grid">' + reportRuleCards(report, config, lang, t) + '</div></td></tr>' : '';
    const label = config.label?.[lang] || 'Walk-forward';
    return '<tr class="' + (selectedId === config.id ? 'selected' : '') + '"><td><button class="config-select" data-id="' + config.id + '">' + escapeHtml(label) + '</button></td>' + cells + '</tr>' + detail;
  }).join('') : '';
  const rows = isCustom ? customRows : report.configs.map((config) => {
    if (isMultiAsset) {
      const assetRows = Object.entries(config.assets).map(([symbol, values]) => `<tr class="${selectedId === config.id ? 'selected' : ''}"><td><button class="config-select" data-id="${config.id}">#${config.id}</button></td><td>${symbol}</td><td>${values[0]}</td><td>${values[1].toFixed(1)}%</td><td>${values[2] >= 0 ? '+' : ''}${values[2].toFixed(2)}R</td><td>${values[3].toFixed(2)}</td></tr>`).join('');
      const detail = selectedId === config.id ? `<tr class="config-detail-row"><td colspan="6"><div class="config-grid">${reportRuleCards(report, config, lang, t)}</div></td></tr>` : '';
      return assetRows + detail;
    }
    const cells = isSingleAsset
      ? `<td>${config.pepe[0]}</td><td>${config.pepe[1].toFixed(1)}%</td><td>${config.pepe[2] >= 0 ? '+' : ''}${config.pepe[2].toFixed(2)}R</td><td>${config.pepe[3].toFixed(2)}</td>`
      : `<td>${config.btc[0]} / ${config.eth[0]}</td><td>${config.btc[1]}% / ${config.eth[1]}%</td><td>+${config.btc[2].toFixed(2)}R / +${config.eth[2].toFixed(2)}R</td><td>${config.btc[3].toFixed(2)} / ${config.eth[3].toFixed(2)}</td>`;
    return `<tr class="${selectedId === config.id ? 'selected' : ''}"><td><button class="config-select" data-id="${config.id}">#${config.id}</button></td>${cells}</tr>${selectedId === config.id ? `<tr class="config-detail-row"><td colspan="5"><div class="config-grid">${reportRuleCards(report, config, lang, t)}</div></td></tr>` : ''}`;
  }).join('');

  const marketLabel = resolveMarketLabel(report, isMultiAsset);
  const tableLabels = isCustom ? '<th>Strategy</th>' + (report.performance.headers[lang] || report.performance.headers).map((header) => '<th>' + header + '</th>').join('') : isMultiAsset ? '<th>Config</th><th>Asset</th><th>Trades</th><th>Win rate</th><th>Expectancy R</th><th>PF</th>' : isSingleAsset ? '<th>Config</th><th>Trades</th><th>Win rate</th><th>Expectancy R</th><th>PF</th>' : '<th>Config</th><th>Trades<br>BTC / ETH</th><th>Win rate<br>BTC / ETH</th><th>Expectancy R<br>BTC / ETH</th><th>PF<br>BTC / ETH</th>';
  document.querySelector('#app').innerHTML = `<div class="wrap"><nav><span class="brand">BT LAB<span>BACKTEST RESEARCH</span></span><div class="nav-controls"><label class="report-control">${t.reports}<select id="report">${reportOptions()}</select></label><div id="language-toggle" role="group" aria-label="Language"><button type="button" data-lang="ko" class="${lang === 'ko' ? 'active' : ''}" aria-pressed="${lang === 'ko'}">KR</button><button type="button" data-lang="en" class="${lang === 'en' ? 'active' : ''}" aria-pressed="${lang === 'en'}">EN</button></div></div></nav><p class="eyebrow">${marketLabel} · ${report.timeframe || 'Daily'} <span class="date-chip">${report.date}</span></p><h1>${report.name[lang]}</h1><p class="sub">${report.desc[lang]}</p><div class="banner"><b>${t.result}</b> ${report.status[lang]}</div><section><h2>${t.rules}: #${selectedId}</h2><div class="rules">${reportRuleCards(report, activeConfig, lang, t)}</div></section><section><h2>${t.equity}</h2><div class="charts">${report.charts.map((path, index) => `<figure><img src="${path}" alt="${t.equity}"/><figcaption>${report.captions[index]}</figcaption></figure>`).join('')}</div></section><section><h2>${t.perf}</h2><div class="table-wrap"><table><thead><tr>${tableLabels}</tr></thead><tbody>${rows}</tbody></table></div></section><section><h2>${t.files}</h2><div class="file-layout"><div class="file-list">${report.files.map(([ko, en, path]) => `<button type="button" class="file-select" data-path="${path}">${lang === 'ko' ? ko : en}</button>`).join('')}</div><div class="file-viewer"><div class="file-toolbar"><b id="file-name"></b><button type="button" id="copy-file" class="icon-button" aria-label="${t.copied}" title="${t.copied}"><span aria-hidden="true">⧉</span></button></div><pre id="file-content">${t.loading}</pre><p id="copy-status" class="sr-only" aria-live="polite"></p></div></div></section></div>`;

  document.querySelector('.brand').innerHTML = '<img src="/assets/brand/bt-logo.png" alt="BT Lab logo"/><span class="brand-copy">BT LAB<small>BACKTEST RESEARCH</small></span>';
  document.querySelector('#report').onchange = (event) => selectReport(event.target.value);
  document.querySelectorAll('[data-lang]').forEach((button) => { button.onclick = () => { lang = button.dataset.lang; render(); }; });
  document.querySelectorAll('.config-select').forEach((button) => { button.onclick = () => { selectedId = Number(button.dataset.id); render(); }; });
  const load = async (button) => { document.querySelector('#file-name').textContent = button.textContent; const output = document.querySelector('#file-content'); output.textContent = t.loading; try { const response = await fetch(button.dataset.path); output.textContent = response.ok ? await response.text() : 'Could not load file.'; } catch { output.textContent = 'Could not load file.'; } };
  document.querySelectorAll('.file-select').forEach((button) => { button.onclick = () => load(button); });
  document.querySelector('#copy-file').onclick = async () => { const button = document.querySelector('#copy-file'); const status = document.querySelector('#copy-status'); try { await copyText(document.querySelector('#file-content').textContent); button.innerHTML = '<span aria-hidden="true">✓</span>'; status.textContent = t.copied; setTimeout(() => { if (document.querySelector('#copy-file') === button) button.innerHTML = '<span aria-hidden="true">⧉</span>'; }, 1400); } catch { status.textContent = t.failed; } };
  load(document.querySelector('.file-select'));
}

if (typeof document !== 'undefined') render();
