export const STORAGE_KEY = 'studyMate.v1';

export const MATE_ITEMS = Object.freeze([
  { id: 'sky', kind: 'background', name: '라이트 스튜디오', requiredXp: 0, description: '밝고 차분한 기본 배경' },
  { id: 'mint', kind: 'background', name: '세이지 스튜디오', requiredXp: 0, description: '그레이와 세이지를 섞은 배경' },
  { id: 'peach', kind: 'background', name: '웜 스튜디오', requiredXp: 80, description: '따뜻한 뉴트럴 톤의 배경' },
  { id: 'night', kind: 'background', name: '미드나잇', requiredXp: 180, description: '차분한 딥 네이비 배경' },
  { id: 'none', kind: 'accessory', name: '기본 스타일', requiredXp: 0, description: '액세서리 없이 기본 모습으로' },
  { id: 'cap', kind: 'accessory', name: '네이비 캡', requiredXp: 60, description: '차분한 네이비 톤의 캡' },
  { id: 'glasses', kind: 'accessory', name: '라운드 프레임', requiredXp: 120, description: '슬림한 라운드 안경' },
  { id: 'headphones', kind: 'accessory', name: '오버이어 헤드폰', requiredXp: 240, description: '메탈과 차콜 톤의 헤드폰' },
  { id: 'star', kind: 'accessory', name: '스타 브로치', requiredXp: 400, description: '쌓아 온 학습을 기념하는 브로치' },
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
  if (!mate.totalSessions) return '오늘도 내 속도로. 한 세트부터 시작해요.';
  if (mate.totalSessions === 1) return '첫 학습 완료. 좋은 시작이에요.';
  return '꾸준히 쌓은 노력이 실력이 됩니다. 오늘도 함께해요.';
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
  const praise = event.correctCount === 0 ? '끝까지 풀어본 노력만큼 경험치가 쌓였어요. 오답에서 다음 힌트를 찾아봐요.' : event.correctCount === event.questionCount ? '모든 문제 정답. 집중한 만큼 좋은 결과를 얻었어요.' : '한 세트를 완료했어요. 쌓인 노력만큼 다음 학습도 이어가요.';
  return { state: next, earned, praise, unlocked };
}
