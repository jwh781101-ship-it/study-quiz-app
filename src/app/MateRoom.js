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
  sky: 'linear-gradient(145deg,#dceeff,#a7d9f3)',
  mint: 'linear-gradient(145deg,#e0f8e9,#a4dfc6)',
  peach: 'linear-gradient(145deg,#fff0e8,#f7c4b3)',
  night: 'linear-gradient(145deg,#c5c8ec,#8e9ac9)',
};

function AccessoryPreview({ id }) {
  return <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" focusable="false">
    {id === 'none' && <><circle cx="24" cy="24" r="15" fill="#fff" stroke="#8aaba7" strokeWidth="2"/><path d="M18 24h12" stroke="#648580" strokeWidth="3" strokeLinecap="round"/></>}
    {id === 'cap' && <><path d="M9 27c1-11 6-17 15-17s14 6 15 17z" fill="#759bc9"/><path d="M8 28q16-5 32 0l3 4H9z" fill="#557dab"/><circle cx="24" cy="13" r="2" fill="#e5f2ff"/></>}
    {id === 'glasses' && <g fill="none" stroke="#405c74" strokeWidth="3" strokeLinecap="round"><circle cx="15" cy="24" r="9"/><circle cx="33" cy="24" r="9"/><path d="M24 23h0M6 22l-3-2m39 2l3-2"/></g>}
    {id === 'headphones' && <><path d="M9 27v-3C9 13 15 8 24 8s15 5 15 16v3" fill="none" stroke="#826eb8" strokeWidth="4" strokeLinecap="round"/><rect x="6" y="23" width="7" height="13" rx="3.5" fill="#826eb8"/><rect x="35" y="23" width="7" height="13" rx="3.5" fill="#826eb8"/></>}
    {id === 'star' && <path d="M24 5l5.5 11.5 12.5 1.8-9 8.7 2.1 12.4L24 33.5l-11.1 5.9L15 27l-9-8.7 12.5-1.8z" fill="#ffde77" stroke="#c29339" strokeWidth="2" strokeLinejoin="round"/>}
  </svg>;
}

const styles = `
.mate-room{box-sizing:border-box;max-width:1040px;margin:0 auto;padding:24px 20px 48px;color:#24364d;font-family:inherit}
.mate-room *{box-sizing:border-box}.mate-room button{font:inherit;cursor:pointer}.mate-room button:focus-visible{outline:3px solid #315d97;outline-offset:3px}
.mate-top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:20px}.mate-top h1{font-size:clamp(24px,4vw,34px);letter-spacing:-.04em;margin:4px 0}.mate-eyebrow{color:#426772;font-size:13px;font-weight:800;letter-spacing:.06em}.mate-back{min-height:44px;border:1px solid #b9cdd2;border-radius:14px;padding:10px 16px;background:#fff;color:#263e54;font-weight:700}
.mate-layout{display:grid;grid-template-columns:minmax(0, .9fr) minmax(0, 1.1fr);gap:20px;align-items:start}.mate-panel{background:#fff;border:1px solid #dce8e7;border-radius:24px;padding:22px;box-shadow:0 10px 30px #3d6d6a12}.mate-preview{background:linear-gradient(150deg,#e9f8f1,#f1edff 65%,#fff0e8)}.mate-art{display:flex;justify-content:center}.mate-level{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-top:16px;font-weight:800}.mate-level span{font-size:14px;color:#425a68}.mate-progress{height:11px;overflow:hidden;background:#d9e9e5;border-radius:20px;margin:9px 0}.mate-progress-fill{height:100%;background:#367f70;border-radius:20px}.mate-praise{margin:16px 0 0;padding:15px 17px;background:#fff;border:1px solid #d8e9e2;border-radius:17px;color:#304c50;font-weight:700;line-height:1.6}.mate-section+.mate-section{border-top:1px solid #e5eeeb;margin-top:22px;padding-top:20px}.mate-section h2{margin:0 0 6px;font-size:19px;letter-spacing:-.03em}.mate-section>p{margin:0 0 13px;color:#526676;font-size:14px;line-height:1.5}.mate-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.mate-choice{min-height:66px;padding:10px 12px;text-align:left;border:1px solid #cddbdc;border-radius:14px;background:#fff;color:#263d50;display:flex;flex-direction:column;justify-content:center;gap:3px}.mate-choice strong{font-size:14px}.mate-choice small{font-size:12px;color:#526777;line-height:1.35}.mate-choice[aria-pressed=true]{border:2px solid #317c70;background:#e9f8f1;padding:9px 11px}.mate-choice:disabled{cursor:not-allowed;background:#f2f4f5;color:#536470;opacity:1}.mate-choice:disabled small{color:#536470}.mate-notice{margin:18px 0 0;color:#526676;font-size:13px;line-height:1.65}.mate-rules{margin:10px 0 0;padding-left:19px;color:#425a68;font-size:13px;line-height:1.8}.mate-rules li{margin:0}
.mate-top h1,.mate-section h2{font-family:var(--round,'Pretendard');font-weight:400}.mate-choice{min-height:76px;flex-direction:row;justify-content:flex-start;align-items:center;gap:10px}.mate-choice-copy{display:flex;flex-direction:column;gap:3px;min-width:0}.mate-choice-preview{flex:0 0 58px;width:58px;height:54px;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:12px;background:#edf5f3;border:1px solid #d6e8e2}.mate-choice-preview svg{flex-shrink:0}.mate-choice-preview.mate-swatch{box-shadow:inset 0 0 0 3px #ffffffaa}.mate-choice:disabled .mate-choice-preview{opacity:.8}
@media(max-width:700px){.mate-room{padding:16px 14px 36px}.mate-layout{grid-template-columns:1fr}.mate-panel{padding:18px}.mate-preview{display:grid;grid-template-columns:minmax(0,1fr);}.mate-art svg{max-width:300px}}
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
    <header className="mate-top"><div><div className="mate-eyebrow">공부할수록 자라는 내 친구</div><h1>나의 공부 메이트</h1></div><button type="button" className="mate-back" onClick={onBack}>돌아가기</button></header>
    <div className="mate-layout">
      <section className="mate-panel mate-preview" aria-label="메이트 미리보기">
        <div className="mate-art"><MateAvatar character={activeCharacter} background={mate.equipped.background} accessory={mate.equipped.accessory} size={390}/></div>
        <div className="mate-level"><strong>레벨 {level.level}</strong><span>총 {mate.xp.toLocaleString('ko-KR')} XP</span></div>
        <div className="mate-progress" role="progressbar" aria-label="다음 레벨까지 경험치" aria-valuemin={0} aria-valuemax={level.next} aria-valuenow={level.current}><div className="mate-progress-fill" style={{width:`${level.current / level.next * 100}%`}} /></div>
        <div className="mate-level" style={{marginTop:0}}><span>{level.current} / {level.next} XP</span><span>공부 {mate.totalSessions.toLocaleString('ko-KR')}회</span></div>
        <p className="mate-praise">{getPraise(mate)}</p>
      </section>
      <div className="mate-panel">
        <section className="mate-section" aria-label="캐릭터 선택"><h2>함께할 친구</h2><p>언제든 다른 친구로 바꿀 수 있어요.</p><div className="mate-grid">
          {CHARACTERS.map(item => <button key={item.id} type="button" className="mate-choice" aria-pressed={activeCharacter === item.id} onClick={() => onCharacterChange?.(item.id)}><span className="mate-choice-preview" aria-hidden="true"><MateAvatar character={item.id} background="sky" accessory="none" size={58} decorative /></span><span className="mate-choice-copy"><strong>{item.name}{activeCharacter === item.id ? ' · 선택됨' : ''}</strong><small>{item.description}</small></span></button>)}
        </div></section>
        {itemSection('background', '방 꾸미기', '공부로 모은 XP에 따라 새 배경이 열려요.')}
        {itemSection('accessory', '소품 고르기', '열린 소품은 무료로 언제든 착용할 수 있어요.')}
        <section className="mate-section"><h2>XP 모으는 방법</h2><p>문제 세트의 채점까지 마치면 아래 XP를 받아요.</p><ul className="mate-rules"><li>문제 1개를 풀 때마다 10 XP</li><li>맞힌 문제 1개마다 추가 2 XP</li><li>그날 첫 학습을 마치면 추가 20 XP</li><li>틀린 문제도 푼 만큼 XP를 받아요.</li></ul><p className="mate-notice">메이트와 꾸미기 정보는 이 기기에 저장돼요. 응원 문구는 미리 준비된 문구이며 AI 사용이나 추가 비용이 없어요.</p></section>
      </div>
    </div>
  </main>;
}
