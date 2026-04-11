'use client';
import { useRef, useState } from 'react';

const SOUNDS = [
  { id:'rain', emoji:'🌧️', label:'빗소리' },
  { id:'cafe', emoji:'☕', label:'카페소음' },
  { id:'wave', emoji:'🌊', label:'파도소리' },
  { id:'white', emoji:'📻', label:'화이트노이즈' },
  { id:'fire', emoji:'🔥', label:'장작소리' },
];

export default function SoundPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState('rain');
  const [volume, setVolume] = useState(50);
  const ctxRef = useRef(null);
  const gainRef = useRef(null);
  const nodesRef = useRef([]);

  const getCtx = async () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.gain.value = volume / 100;
      gainRef.current.connect(ctxRef.current.destination);
    }
    // iOS Safari: suspended 상태면 resume
    if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume();
    }
    return ctxRef.current;
  };

  const stopAll = () => {
    nodesRef.current.forEach(n => { try { n.stop(); } catch(e){} });
    nodesRef.current = [];
  };

  const playRain = (c, gain) => {
    const bufferSize = c.sampleRate * 3;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    const src = c.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1200; f1.Q.value = 0.5;
    const f2 = c.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 400;
    src.connect(f1); f1.connect(f2); f2.connect(gain); src.start();
    nodesRef.current.push(src);
  };

  const playCafe = (c, gain) => {
    for (let i = 0; i < 6; i++) {
      const osc = c.createOscillator(); const g = c.createGain();
      osc.type = 'sine'; osc.frequency.value = 80 + Math.random() * 120;
      g.gain.value = 0.03 + Math.random() * 0.02;
      osc.connect(g); g.connect(gain); osc.start();
      nodesRef.current.push(osc);
    }
    const bufferSize = c.sampleRate * 2;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
    const src = c.createBufferSource(); src.buffer = buffer; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
    src.connect(f); f.connect(gain); src.start();
    nodesRef.current.push(src);
  };

  const playWave = (c, gain) => {
    const bufferSize = c.sampleRate * 4;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const src = c.createBufferSource(); src.buffer = buffer; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
    const lfo = c.createOscillator(); const lfoGain = c.createGain();
    lfo.frequency.value = 0.15; lfoGain.gain.value = 300;
    lfo.connect(lfoGain); lfoGain.connect(f.frequency); lfo.start();
    src.connect(f); f.connect(gain); src.start();
    nodesRef.current.push(src); nodesRef.current.push(lfo);
  };

  const playWhite = (c, gain) => {
    const bufferSize = c.sampleRate * 2;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buffer; src.loop = true;
    src.connect(gain); src.start();
    nodesRef.current.push(src);
  };

  const playFire = (c, gain) => {
    // 베이스 노이즈 (장작 타는 소리)
    const bufferSize = c.sampleRate * 3;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const src = c.createBufferSource(); src.buffer = buffer; src.loop = true;

    // 불꽃 느낌 필터
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 800; f1.Q.value = 0.3;
    const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 2000;

    // 불꽃 흔들림 LFO
    const lfo = c.createOscillator(); const lfoGain = c.createGain();
    lfo.frequency.value = 3; lfoGain.gain.value = 200;
    lfo.connect(lfoGain); lfoGain.connect(f1.frequency); lfo.start();

    src.connect(f1); f1.connect(f2); f2.connect(gain); src.start();
    nodesRef.current.push(src); nodesRef.current.push(lfo);

    // 탁탁 튀는 소리 (랜덤 크래클)
    const crackle = () => {
      if (nodesRef.current.length === 0) return;
      const crackBuf = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate);
      const crackData = crackBuf.getChannelData(0);
      for (let i = 0; i < crackData.length; i++) {
        crackData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.01));
      }
      const crackSrc = c.createBufferSource();
      crackSrc.buffer = crackBuf;
      const crackGain = c.createGain();
      crackGain.gain.value = 0.3 + Math.random() * 0.4;
      crackSrc.connect(crackGain); crackGain.connect(gain);
      crackSrc.start();

      // 다음 크래클 랜덤 스케줄
      const next = 300 + Math.random() * 1200;
      const timer = setTimeout(crackle, next);
      nodesRef.current.push({ stop: () => clearTimeout(timer) });
    };
    crackle();
  };

  const startSound = async (type) => {
    const c = await getCtx();
    const gain = gainRef.current;
    if (type === 'rain') playRain(c, gain);
    else if (type === 'cafe') playCafe(c, gain);
    else if (type === 'wave') playWave(c, gain);
    else if (type === 'white') playWhite(c, gain);
    else if (type === 'fire') playFire(c, gain);
  };

  const togglePlay = async () => {
    if (!isPlaying) {
      await startSound(current);
      setIsPlaying(true);
    } else {
      stopAll();
      setIsPlaying(false);
    }
  };

  const selectSound = async (id) => {
    setCurrent(id);
    if (isPlaying) {
      stopAll();
      await startSound(id);
    }
  };

  const handleVolume = (val) => {
    setVolume(val);
    if (gainRef.current) gainRef.current.gain.value = val / 100;
  };

  return (
    <div style={{ background:"#fff", borderRadius:20, border:"1.5px solid #e0e7ff", boxShadow:"0 4px 20px rgba(99,102,241,0.08)", padding:"16px", marginTop:14 }}>
      <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#6366f1" }}>🎧 집중 사운드</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginBottom:14 }}>
        {SOUNDS.map(s => (
          <button key={s.id} onClick={()=>selectSound(s.id)}
            style={{ border:`1.5px solid ${current===s.id?"#6366f1":"#e8e9ef"}`, borderRadius:14, background: current===s.id?"#eef2ff":"#fff", padding:"10px 4px", cursor:"pointer", textAlign:"center", fontFamily:"inherit", transition:"all 0.15s" }}>
            <span style={{ fontSize:20, display:"block", marginBottom:4 }}>{s.emoji}</span>
            <span style={{ fontSize:10, color: current===s.id?"#6366f1":"#555", fontWeight:700 }}>{s.label}</span>
          </button>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={togglePlay} style={{ width:40, height:40, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 12px rgba(99,102,241,0.3)" }}>
          {isPlaying
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>}
        </button>
        <span style={{ fontSize:12, color:"#999" }}>🔈</span>
        <input type="range" min={0} max={100} value={volume} onChange={e=>handleVolume(Number(e.target.value))} style={{ flex:1, accentColor:"#6366f1" }} />
        <span style={{ fontSize:12, color:"#999" }}>🔊</span>
        <span style={{ fontSize:12, fontWeight:700, color: isPlaying?"#6366f1":"#bbb", minWidth:40 }}>{isPlaying?"재생중":"정지"}</span>
      </div>
    </div>
  );
}
