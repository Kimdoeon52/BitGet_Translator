// 사전 검증: node test/check-dict.js [수집JSON경로]
//  - ko.json 문법, 중복 키(JSON.parse가 조용히 덮어쓰는 것), 빈 값, 대소문자 충돌, 섹션 간 중복
//  - TERMS.md와 키/번역/병기 표시 일치
//  - (선택) 수집 JSON을 주면: 수집 필터 통과 개수, 그중 현재 사전으로 번역되는 라벨 목록
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
global.window = global;
require(path.join(ROOT, 'src/engine.js'));
const E = global.BgkoEngine;

const errors = [];
const raw = fs.readFileSync(path.join(ROOT, 'dictionary/ko.json'), 'utf8');
let j;
try { j = JSON.parse(raw); } catch (e) { console.error('ko.json 문법 오류:', e.message); process.exit(1); }

// 중복 키: 원문 텍스트에서 직접 셈
const rawKeys = [...raw.matchAll(/^\s*"([^"]+)":\s*"/gm)].map(m => m[1]);
rawKeys.filter((k, i) => rawKeys.indexOf(k) !== i).forEach(k => errors.push('중복 키: ' + k));

const all = {};
for (const [sec, crit] of [['critical', true], ['terms', false]]) {
  for (const [k, v] of Object.entries(j[sec] || {})) {
    if (typeof v !== 'string' || !v.trim()) errors.push('빈 번역: ' + k);
    if (all[k]) errors.push('critical/terms 양쪽에 있음: ' + k);
    all[k] = { ko: v, crit };
  }
}
const lower = {};
for (const k of Object.keys(all)) (lower[k.toLowerCase()] = lower[k.toLowerCase()] || []).push(k);
Object.values(lower).filter(a => a.length > 1).forEach(a => errors.push('대소문자만 다른 키: ' + a.join(', ')));

// TERMS.md 대조 (--- 아래 표만)
const md = fs.readFileSync(path.join(ROOT, 'dictionary/TERMS.md'), 'utf8');
const body = md.split('\n---\n').slice(1).join('\n');
const doc = {};
for (const line of body.split('\n')) {
  if (!/^\| /.test(line) || /^\| (원문|---)/.test(line)) continue;
  const c = line.split('|').map(s => s.trim());
  let ks, vs;
  if (/^`.*`$/.test(c[1])) { ks = [c[1].slice(1, -1)]; vs = [c[2]]; }
  else { ks = c[1].split(' / '); vs = c[2].split(' / '); }
  ks.forEach((k, i) => { doc[k] = { ko: vs[vs.length === ks.length ? i : 0], crit: c[3] === '●' }; });
}
for (const k of Object.keys(all)) {
  if (!doc[k]) { errors.push('TERMS.md 누락: ' + k); continue; }
  if (doc[k].ko !== all[k].ko) errors.push(`번역 불일치: ${k} | TERMS "${doc[k].ko}" vs json "${all[k].ko}"`);
  if (doc[k].crit !== all[k].crit) errors.push('병기 표시 불일치: ' + k);
}
for (const k of Object.keys(doc)) if (!all[k]) errors.push('TERMS.md에만 있음: ' + k);

const nCrit = Object.keys(j.critical || {}).length;
console.log(`사전: ${Object.keys(all).length}개 (병기 ${nCrit} / 일반 ${Object.keys(all).length - nCrit})`);
console.log(errors.length ? '오류 ' + errors.length + '건\n  ' + errors.join('\n  ') : '검증 OK');

// 수집 결과 분석
const collectedPath = process.argv[2];
if (collectedPath) {
  const d = E.buildDictionary(j);
  const labels = Object.keys(JSON.parse(fs.readFileSync(collectedPath, 'utf8')));
  const kept = labels.filter(E.isCollectable);
  const hits = kept.map(k => [k, E.match(d, E.normalize(k))]).filter(([, h]) => h);
  const viaSuffix = hits.filter(([, h]) => h.tail);
  console.log(`\n수집 파일: ${labels.length}개 → 현재 필터 통과 ${kept.length}개 → 그중 현재 사전으로 번역됨 ${hits.length}개 (접미사 규칙 ${viaSuffix.length}개)`);
  console.log('  ' + hits.map(([k]) => k).join(' | '));
}
process.exit(errors.length ? 1 : 0);
