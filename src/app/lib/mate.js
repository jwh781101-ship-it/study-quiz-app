export const STORAGE_KEY = 'studyMate.v1';

export const MATE_ITEMS = Object.freeze([
  { id: 'sky', kind: 'background', name: '맑은 하늘', requiredXp: 0, description: '포근한 하늘빛 방' },
  { id: 'mint', kind: 'background', name: '싱그러운 민트', requiredXp: 0, description: '기분 좋은 민트빛 방' },
  { id: 'peach', kind: 'background', name: '복숭아 노을', requiredXp: 80, description: '따뜻한 복숭아빛 방' },
  { id: 'night', kind: 'background', name: '별이 빛나는 밤', requiredXp: 180, description: '차분한 밤하늘 방' },
  { id: 'none', kind: 'accessory', name: '그대로', requiredXp: 0, description: '있는 그대로의 메이트' },
  { id: 'cap', kind: 'accessory', name: '말랑 모자', requiredXp: 60, description: '산뜻한 모자' },
  { id: 'glasses', kind: 'accessory', name: '동글 안경', requiredXp: 120, description: '공부할 때 함께 쓰는 안경' },
  { id: 'headphones', kind: 'accessory', name: '집중 헤드폰', requiredXp: 240, description: '집중을 돕는 멋진 헤드폰' },
  { id: 'star', kind: 'accessory', name: '반짝 별핀', requiredXp: 400, description: '노력을 기념하는 별핀' },
]);

const MAX = Number.MAX_SAFE_INTEGER - 1000;
const count = value => typeof value === 'number' && Number.isFinite(value) ? Math.min(MAX, Math.max(0, Math.floor(value))) : 0;
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 100 && value.trim().length > 0 && !/[\u0000-\u001f\u007f]/.test(value);
const validDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const uniqueRecent = (value, valid, limit) => {
  if (!Array.isArray(value)) return [];
  const result = []; const seen = new Set();
  for (let i = value.length - 1; i >= 0 && result.length < limit; i--) {
    const entry = value[i];
    if (valid(entry) && !seen.has(entry)) { seen.add(entry); result.push(entry); }
  }
  return result.reverse();
};
export function createMate() {
  return { version: 1, xp: 0, totalSessions: 0, totalQuestions: 0, lastStudyDate: null, studyDays: [], rewardedSessions: [], equipped: { background: 'sky', accessory: 'none' } };
}
export function normalizeMate(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const xp = count(source.xp);
  const equipped = source.equipped && typeof source.equipped === 'object' && !Array.isArray(source.equipped) ? source.equipped : {};
  const validEquipped = (id, kind, fallback) => MATE_ITEMS.some(item => item.id === id && item.kind === kind && item.requiredXp <= xp) ? id : fallback;
  return { version: 1, xp, totalSessions: count(source.totalSessions), totalQuestions: count(source.totalQuestions), lastStudyDate: validDate(source.lastStudyDate) ? source.lastStudyDate : null, studyDays: uniqueRecent(source.studyDays, validDate, 60), rewardedSessions: uniqueRecent(source.rewardedSessions, validId, 200), equipped: { background: validEquipped(equipped.background, 'background', 'sky'), accessory: validEquipped(equipped.accessory, 'accessory', 'none') } };
}
export function levelInfo(state) {
  const xp = normalizeMate(state).xp;
  return { level: 1 + Math.floor(xp / 100), current: xp % 100, next: 100 };
}
export function getPraise(state) {
  const mate = normalizeMate(state);
  if (!mate.totalSessions) return '준비됐어! 오늘도 너의 속도로 함께 시작해 보자.';
  if (mate.totalSessions === 1) return '첫 공부를 마쳤어. 시작한 너의 노력이 멋져!';
  return '한 문제씩 쌓아 온 너의 노력이 멋져. 함께해서 든든해!';
}
export function equipItem(state, id) {
  const mate = normalizeMate(state);
  const item = MATE_ITEMS.find(entry => entry.id === id && entry.requiredXp <= mate.xp);
  if (!item) return mate;
  return { ...mate, equipped: { ...mate.equipped, [item.kind]: item.id } };
}
export function applyStudyReward(state, event) {
  const mate = normalizeMate(state);
  const unchanged = () => ({ state: mate, earned: 0, praise: getPraise(mate), unlocked: [] });
  if (!event || typeof event !== 'object' || !validId(event.id) || !validDate(event.date) || !Number.isInteger(event.questionCount) || event.questionCount < 1 || event.questionCount > 10 || !Number.isInteger(event.correctCount) || event.correctCount < 0 || event.correctCount > event.questionCount || mate.rewardedSessions.includes(event.id)) return unchanged();
  const earned = 10 * event.questionCount + 2 * event.correctCount + (mate.studyDays.includes(event.date) ? 0 : 20);
  const xp = Math.min(MAX, mate.xp + earned);
  const next = { ...mate, xp, totalSessions: Math.min(MAX, mate.totalSessions + 1), totalQuestions: Math.min(MAX, mate.totalQuestions + event.questionCount), lastStudyDate: event.date, studyDays: [...mate.studyDays.filter(day => day !== event.date), event.date].slice(-60), rewardedSessions: [...mate.rewardedSessions, event.id].slice(-200) };
  const unlocked = MATE_ITEMS.filter(item => item.requiredXp > mate.xp && item.requiredXp <= xp);
  const praise = event.correctCount === 0 ? '끝까지 풀어 본 노력이 멋져! 틀린 문제도 배움의 발판이야.' : event.correctCount === event.questionCount ? '끝까지 집중했구나! 모든 문제를 맞혔어.' : '한 문제씩 도전한 네 노력이 멋져! 함께 차근차근 가자.';
  return { state: next, earned, praise, unlocked };
}
