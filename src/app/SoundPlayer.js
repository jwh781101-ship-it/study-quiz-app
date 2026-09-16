'use client';
import { useRef, useState } from 'react';

const SOUNDS = [
  { id:'rain', emoji:'🌧️', label:'빗소리', src:'/sounds/rain.mp3' },
  { id:'cafe', emoji:'☕', label:'카페소음', src:'/sounds/cafe.mp3' },
  { id:'wave', emoji:'🌊', label:'파도소리', src:'/sounds/wave.mp3' },
  { id:'waterfall', emoji:'💧', label:'폭포소리', src:'/sounds/waterfall.mp3' },
  { id:'fire', emoji:'🔥', label:'장작소리', src:'/sounds/fire.mp3' },
];

export default function SoundPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState('rain');
  const [volume, setVolume] = useState(50);
  const audioRef = useRef(null);

  const playSound = async (src, vol) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    const audio = new Audio(src);
    audio.loop = true; audio.volume = vol / 100; audioRef.current = audio;
    try { await audio.play(); } catch(e) { console.log('audio play error:', e); }
  };

  const togglePlay = async () => {
    if (!isPlaying) {
      const sound = SOUNDS.find(s => s.id === current);
      await playSound(sound.src, volume); setIsPlaying(true);
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null; }
      setIsPlaying(false);
    }
  };

  const selectSound = async (id) => {
    setCurrent(id);
    if (isPlaying) { const sound = SOUNDS.find(s => s.id === id); await playSound(sound.src, volume); }
  };

  const handleVolume = (val) => {
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val / 100;
  };

  return (
    <div style={{ width:"100%", boxSizing:"border-box" }}>
      <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:"#6366f1" }}>🎧 집중 사운드</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:4, marginBottom:12 }}>
        {SOUNDS.map(s => (
          <button key={s.id} onClick={()=>selectSound(s.id)}
            style={{ border:`1.5px solid ${current===s.id?"#6366f1":"#e8e9ef"}`, borderRadius:10, background: current===s.id?"#eef2ff":"#fff", padding:"7px 2px", cursor:"pointer", textAlign:"center", fontFamily:"inherit", transition:"all 0.15s", minWidth:0, boxSizing:"border-box" }}>
            <span style={{ fontSize:16, display:"block", marginBottom:3 }}>{s.emoji}</span>
            <span style={{ fontSize:9, color: current===s.id?"#6366f1":"#555", fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"block", width:"100%" }}>{s.label}</span>
          </button>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6, width:"100%", boxSizing:"border-box", overflow:"hidden" }}>
        <button onClick={togglePlay} style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 12px rgba(99,102,241,0.3)" }}>
          {isPlaying
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>}
        </button>
        <span style={{ fontSize:10, color:"#bbb", flexShrink:0 }}>🔈</span>
        <input type="range" min={0} max={100} value={volume} onChange={e=>handleVolume(Number(e.target.value))} style={{ flex:1, accentColor:"#6366f1", minWidth:0 }} />
        <span style={{ fontSize:10, color:"#bbb", flexShrink:0 }}>🔊</span>
        <span style={{ fontSize:10, fontWeight:700, color: isPlaying?"#6366f1":"#bbb", flexShrink:0, whiteSpace:"nowrap" }}>{isPlaying?"재생중":"정지"}</span>
      </div>
    </div>
  );
}
