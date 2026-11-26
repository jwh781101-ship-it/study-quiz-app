import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/app/lib/mate.js', import.meta.url), 'utf8');
const { STORAGE_KEY, MATE_ITEMS, createMate, normalizeMate, levelInfo, applyStudyReward, equipItem, getPraise } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const event = (id, questionCount = 5, correctCount = 3, date = '2026-11-26') => ({ id, questionCount, correctCount, date });

test('초기 상태와 레벨', () => {
  assert.equal(STORAGE_KEY, 'studyMate.v1');
  assert.deepEqual(createMate(), { version:1, xp:0, totalSessions:0, totalQuestions:0, lastStudyDate:null, studyDays:[], rewardedSessions:[], equipped:{background:'sky',accessory:'none'} });
  assert.deepEqual(levelInfo({xp:245}), {level:3,current:45,next:100});
  assert.ok(getPraise(createMate()));
});
test('중복 세션은 경험치와 통계를 추가하지 않는다', () => {
  const first = applyStudyReward(createMate(), event('same'));
  const again = applyStudyReward(first.state, event('same'));
  assert.equal(first.earned, 76); assert.equal(again.earned, 0);
  assert.deepEqual(again.state, first.state); assert.deepEqual(again.unlocked, []);
});
test('잘못된 문제 수, 정답 수, 날짜, 아이디는 보상하지 않는다', () => {
  const invalid = [event('a',0,0), event('a',11,1), event('a',1,-1), event('a',1,2), event('a',1,0.5), event('a',1,0,'2026-02-29'), event('a',1,0,'2026-13-01'), event('',1,0), event('x'.repeat(101),1,0), event('x\ny',1,0), event('a',1,0,'2026-1-01')];
  for (const entry of invalid) { const result = applyStudyReward(createMate(), entry); assert.equal(result.earned, 0); assert.deepEqual(result.state, createMate()); }
});
test('첫 학습 보너스는 날짜별 한 번만 적용된다', () => {
  const a = applyStudyReward(createMate(), event('a',1,1));
  const b = applyStudyReward(a.state, event('b',1,1));
  const c = applyStudyReward(b.state, event('c',1,1,'2026-11-27'));
  assert.equal(a.earned,32); assert.equal(b.earned,12); assert.equal(c.earned,32);
  assert.deepEqual(c.state.studyDays,['2026-11-26','2026-11-27']);
});
test('모두 틀려도 푼 노력만큼 XP를 받는다', () => {
  const result = applyStudyReward(createMate(), event('effort',4,0));
  assert.equal(result.earned,60); assert.equal(result.state.totalQuestions,4); assert.match(result.praise,/노력/);
});
test('해금 경계와 장착 유지는 XP에 의해 결정된다', () => {
  let state = createMate();
  assert.equal(equipItem(state,'cap').equipped.accessory,'none');
  const reward = applyStudyReward(state,event('unlock',4,0));
  assert.ok(reward.unlocked.some(item => item.id === 'cap'));
  assert.ok(!reward.unlocked.some(item => item.id === 'peach'));
  state = equipItem(reward.state,'cap'); state = equipItem(state,'mint');
  assert.deepEqual(normalizeMate(JSON.parse(JSON.stringify(state))).equipped,{background:'mint',accessory:'cap'});
  assert.equal(equipItem(state,'night').equipped.background,'mint');
  assert.equal(equipItem(state,'bogus').equipped.accessory,'cap');
  assert.ok(MATE_ITEMS.every(item => ['background','accessory'].includes(item.kind)));
});
test('과거 및 손상된 상태는 안전하게 정규화된다', () => {
  const state = normalizeMate({xp:120.9,totalSessions:-8,totalQuestions:Infinity,lastStudyDate:'2026-02-29',studyDays:['2026-11-26','bad','2026-11-26'],rewardedSessions:['ok','',5,'ok'],equipped:{background:'night',accessory:'glasses'}});
  assert.equal(state.version,1); assert.equal(state.xp,120); assert.equal(state.totalSessions,0); assert.equal(state.totalQuestions,0); assert.equal(state.lastStudyDate,null);
  assert.deepEqual(state.studyDays,['2026-11-26']); assert.deepEqual(state.rewardedSessions,['ok']); assert.deepEqual(state.equipped,{background:'sky',accessory:'glasses'});
  assert.deepEqual(normalizeMate(null),createMate());
  assert.ok(Number.isSafeInteger(normalizeMate({xp:1e100}).xp));
});
test('기록은 최근 세션 200개와 학습일 60개를 유지한다', () => {
  const ids = Array.from({length:220},(_,i)=>`id-${i}`);
  const days = Array.from({length:70},(_,i)=>new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10));
  const state = normalizeMate({rewardedSessions:ids,studyDays:days});
  assert.equal(state.rewardedSessions.length,200); assert.equal(state.rewardedSessions[0],'id-20');
  assert.equal(state.studyDays.length,60); assert.equal(state.studyDays[0],days[10]);
});
