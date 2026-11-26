'use client';
import React from 'react';
import MateAvatar from './MateAvatar';
import { MATE_ITEMS, equipItem, getPraise, levelInfo, normalizeMate } from './lib/mate';

const CHARACTERS = [
  { id: 'dog', name: '비솜이', description: '다정한 강아지' },
  { id: 'cat', name: '냥이', description: '느긋한 고양이' },
  { id: 'bear', name: '곰이', description: '포근한 곰' },
  { id: 'penguin', name: '펭귄이', description: '씩씩한 펭귄' },
];
const SWATCHES = {
  sky: 'linear-gradient(145deg,#f3f5f9,#e5ebf5)',
  mint: 'linear-gradient(145deg,#f0f5f2,#e1ece5)',
  peach: 'linear-gradient(145deg,#f8f3ee,#f0e3d7)',
  night: 'linear-gradient(145deg,#212b40,#3b4a66)',
};

function AccessoryPreview({ id }) {
  return <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" focusable="false">
    {id === 'none' && <><circle cx="24" cy="24" r="15" fill="#fff" stroke="#8aaba7" strokeWidth="2"/><path d="M18 24h12" stroke="#648580" strokeWidth="3" strokeLinecap="round"/></>}
    {id === 'cap' && <><path d="M9 27c1-11 6-17 15-17s14 6 15 17z" fill="#405878"/><path d="M8 28q16-5 32 0l3 4H9z" fill="#243952"/><circle cx="24" cy="13" r="2" fill="#e5f2ff"/></>}
    {id === 'glasses' && <g fill="none" stroke="#405c74" strokeWidth="3" strokeLinecap="round"><circle cx="15" cy="24" r="9"/><circle cx="33" cy="24" r="9"/><path d="M24 23h0M6 22l-3-2m39 2l3-2"/></g>}
    {id === 'headphones' && <><path d="M9 27v-3C9 13 15 8 24 8s15 5 15 16v3" fill="none" stroke="#354358" strokeWidth="4" strokeLinecap="round"/><rect x="6" y="23" width="7" height="13" rx="3.5" fill="#354358"/><rect x="35" y="23" width="7" height="13" rx="3.5" fill="#354358"/></>}
    {id === 'star' && <path d="M24 5l5.5 11.5 12.5 1.8-9 8.7 2.1 12.4L24 33.5l-11.1 5.9L15 27l-9-8.7 12.5-1.8z" fill="#d8b970" stroke="#c29339" strokeWidth="2" strokeLinejoin="round"/>}
  </svg>;
}

const styles = `
.mate-room{box-sizing:border-box;max-width:1040px;margin:0 auto;padding:30px 24px 120px;color:#18202f;font-family:var(--body)}
.mate-room *{box-sizing:border-box}.mate-room button{font:inherit;cursor:pointer}.mate-room button:focus-visible{outline:3px solid #4c63df;outline-offset:3px}
.mate-top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:24px}.mate-top h1{font-family:var(--body)!important;font-size:clamp(24px,4vw,32px);font-weight:700;letter-spacing:-.04em;margin:5px 0}.mate-eyebrow{color:#4659bd;font-size:12px;font-weight:700;letter-spacing:.08em}.mate-back{min-height:44px;border:1px solid #d9deea;border-radius:14px;padding:10px 16px;background:#fff;color:#18202f;font-weight:700}
.mate-layout{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:20px;align-items:start}.mate-panel{background:#fff;border:1px solid #e2e6ee;border-radius:18px;padding:24px;box-shadow:0 8px 28px rgba(24,32,47,.04)}.mate-preview{background:#fff}.mate-art{display:flex;justify-content:center;overflow:hidden;border-radius:14px;background:#f6f7fa}.mate-art>*{max-width:100%;height:auto}.mate-level{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-top:16px;font-weight:700}.mate-level span{font-size:13px;color:#515d70}.mate-progress{height:7px;overflow:hidden;background:#e9ecf3;border-radius:20px;margin:10px 0}.mate-progress-fill{height:100%;background:#4c63df;border-radius:20px}.mate-praise{margin:18px 0 0;padding:14px 16px;background:#f6f7fa;border:1px solid #edf0f5;border-radius:14px;color:#465267;font-size:14px;line-height:1.6}.mate-section+.mate-section{border-top:1px solid #e8ebf1;margin-top:24px;padding-top:24px}.mate-section h2{font-family:var(--body)!important;font-weight:700;margin:0 0 6px;font-size:19px;letter-spacing:-.03em}.mate-section>p{margin:0 0 14px;color:#515d70;font-size:14px;line-height:1.5}.mate-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mate-choice{min-height:76px;padding:10px;text-align:left;border:1px solid #dfe4ec;border-radius:14px;background:#fff;color:#18202f;display:flex;align-items:center;gap:10px}.mate-choice strong{font-size:14px}.mate-choice small{font-size:12px;color:#515d70;line-height:1.4}.mate-choice[aria-pressed=true]{border-color:#4c63df;box-shadow:inset 0 0 0 1px #4c63df;background:#f4f6ff}.mate-choice:disabled{cursor:not-allowed;background:#f5f6f8;color:#596272;opacity:1}.mate-choice:disabled small{color:#596272}.mate-choice-copy{display:flex;flex-direction:column;gap:4px;min-width:0}.mate-choice-preview{flex:0 0 58px;width:58px;height:54px;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:10px;background:#f1f3f7;border:1px solid #e5e8ef}.mate-choice-preview>*{max-width:100%;height:auto}.mate-choice:disabled .mate-choice-preview{opacity:.8}.mate-notice{margin:18px 0 0;color:#515d70;font-size:13px;line-height:1.65}.mate-rules{margin:10px 0 0;padding-left:19px;color:#465267;font-size:13px;line-height:1.8}.mate-rules li{margin:0}
@media(max-width:700px){.mate-room{padding:20px 16px 110px}.mate-layout{grid-template-columns:1fr}.mate-panel{padding:18px}.mate-art>*{max-width:300px}}
@media(max-width:420px){.mate-choice{flex-direction:column;align-items:flex-start;gap:7px}.mate-choice-preview{flex-basis:54px}}
@media(prefers-reduced-motion:reduce){.mate-room *{animation:none!important;transition:none!important}}
`;
export default function MateRoom({ state, character = 'dog', onCharacterChange, onChange, onBack }) {
  const mate = normalizeMate(state);
  const level = levelInfo(mate);
  const activeCharacter = CHARACTERS.some(item => item.id === character) ? character : 'dog';
  const choose = id => { if (typeof onChange === 'function') onChange(equipItem(mate, id)); };
  const itemSection = (kind, title, description) => <section className="mate-section" aria-label={title}>
    <h2>{title}</h2><p>{description}</p><div className="mate-grid">
      {MATE_ITEMS.filter(item => item.kind === kind).map(item => {
        const locked = item.requiredXp > mate.xp;
        const selected = mate.equipped[kind] === item.id;
        return <button key={item.id} type="button" className="mate-choice" aria-pressed={selected} disabled={locked} onClick={() => choose(item.id)}>
          {kind === 'background' ? <span className="mate-choice-preview mate-swatch" aria-hidden="true" style={{background:SWATCHES[item.id]}} /> : <span className="mate-choice-preview" aria-hidden="true"><AccessoryPreview id={item.id}/></span>}
          <span className="mate-choice-copy"><strong>{item.name}{selected ? ' · 선택됨' : ''}</strong>
          <small>{locked ? `${item.requiredXp} XP 필요 · ${item.requiredXp - mate.xp} XP 남음` : item.description}</small></span>
        </button>;
      })}
    </div>
  </section>;
  return <main className="mate-room">
    <style>{styles}</style>
    <header className="mate-top"><div><div className="mate-eyebrow">MY STUDY MATE</div><h1>나의 학습 메이트</h1></div><button type="button" className="mate-back" onClick={onBack}>돌아가기</button></header>
    <div className="mate-layout">
      <section className="mate-panel mate-preview" aria-label="메이트 미리보기">
        <div className="mate-art"><MateAvatar character={activeCharacter} background={mate.equipped.background} accessory={mate.equipped.accessory} size={390}/></div>
        <div className="mate-level"><strong>레벨 {level.level}</strong><span>총 {mate.xp.toLocaleString('ko-KR')} XP</span></div>
        <div className="mate-progress" role="progressbar" aria-label="다음 레벨까지 경험치" aria-valuemin={0} aria-valuemax={level.next} aria-valuenow={level.current}><div className="mate-progress-fill" style={{width:`${level.current / level.next * 100}%`}} /></div>
        <div className="mate-level" style={{marginTop:0}}><span>{level.current} / {level.next} XP</span><span>공부 {mate.totalSessions.toLocaleString('ko-KR')}회</span></div>
        <p className="mate-praise">{getPraise(mate)}</p>
      </section>
      <div className="mate-panel">
        <section className="mate-section" aria-label="캐릭터 선택"><h2>캐릭터 선택</h2><p>언제든 캐릭터를 변경할 수 있습니다.</p><div className="mate-grid">
          {CHARACTERS.map(item => <button key={item.id} type="button" className="mate-choice" aria-pressed={activeCharacter === item.id} onClick={() => onCharacterChange?.(item.id)}><span className="mate-choice-preview" aria-hidden="true"><MateAvatar character={item.id} background="sky" accessory="none" size={52} decorative /></span><span className="mate-choice-copy"><strong>{item.name}{activeCharacter === item.id ? ' · 선택됨' : ''}</strong><small>{item.description}</small></span></button>)}
        </div></section>
        {itemSection('background', '배경 선택', '학습으로 모은 XP에 따라 배경이 열립니다.')}
        {itemSection('accessory', '소품 선택', '사용 가능한 소품은 언제든 변경할 수 있습니다.')}
        <section className="mate-section"><h2>XP 모으는 방법</h2><p>문제 세트의 채점까지 마치면 아래 XP를 받아요.</p><ul className="mate-rules"><li>문제 1개를 풀 때마다 10 XP</li><li>맞힌 문제 1개마다 추가 2 XP</li><li>그날 첫 학습을 마치면 추가 20 XP</li><li>틀린 문제도 푼 만큼 XP를 받아요.</li></ul><p className="mate-notice">메이트와 꾸미기 정보는 이 기기에 저장돼요. 응원 문구는 미리 준비된 문구이며 AI 사용이나 추가 비용이 없어요.</p></section>
      </div>
    </div>
  </main>;
}
