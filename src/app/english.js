'use client';
import { useState, useEffect } from "react";

const LEVELS = [
  { id:"low", label:"하", emoji:"🌱", desc:"초급", color:"#10b981", bg:"#ecfdf5" },
  { id:"mid", label:"중", emoji:"📚", desc:"중급", color:"#6366f1", bg:"#eef2ff" },
  { id:"high", label:"상", emoji:"🔥", desc:"고급", color:"#ef4444", bg:"#fef2f2" },
  { id:"top", label:"최상", emoji:"⚡", desc:"최고급", color:"#7c3aed", bg:"#f5f3ff" },
];

const TABS = [
  { id:"words", label:"📖", name:"단어" },
  { id:"talk", label:"💬", name:"회화" },
  { id:"grammar", label:"✏️", name:"문법" },
  { id:"quiz", label:"🎯", name:"퀴즈" },
  { id:"story", label:"📰", name:"이야기" },
  { id:"bookmarks", label:"⭐", name:"단어장" },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
  * { box-sizing: border-box; }
  .card { background: #fff; border-radius: 20px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 12px; }
  .eng-btn { border: none; border-radius: 12px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
  .eng-btn:active { transform: scale(0.97); }
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pop { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
  @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes starFloat { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-50px) scale(1.8)} }
  @keyframes talkBubble { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
  .fade-up { animation: fadeUp 0.3s ease both; }
  .pop { animation: pop 0.4s ease both; }
  .talk-bubble { animation: talkBubble 0.3s ease both; }
`;

function LoadingSpinner({ color="#6366f1" }) {
  return <div style={{ width:28, height:28, border:`3px solid ${color}22`, borderTop:`3px solid ${color}`, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto" }} />;
}

function SpeakButton({ text }) {
  const [speaking, setSpeaking] = useState(false);
  const speak = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.85;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };
  return (
    <button onClick={speak} className="eng-btn" style={{ width:32, height:32, background: speaking?"#dbeafe":"#eff6ff", border:`1.5px solid ${speaking?"#3b82f6":"#bfdbfe"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>
      {speaking ? "🔊" : "🔈"}
    </button>
  );
}

export default function EnglishLearning({ onBack }) {
  const [level, setLevel] = useState("mid");
  const [activeTab, setActiveTab] = useState("words");
  // 단어
  const [words, setWords] = useState([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [expandedWord, setExpandedWord] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  // 회화
  const [talk, setTalk] = useState(null);
  const [loadingTalk, setLoadingTalk] = useState(false);
  const [shownLines, setShownLines] = useState(0);
  // 문법
  const [grammar, setGrammar] = useState(null);
  const [loadingGrammar, setLoadingGrammar] = useState(false);
  const [fillAnswers, setFillAnswers] = useState({});
  const [fillChecked, setFillChecked] = useState(false);
  const [grammarInput, setGrammarInput] = useState(""); // 사용자가 직접 입력한 문법 주제
  // 퀴즈
  const [quiz, setQuiz] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [showStar, setShowStar] = useState(false);
  // 이야기
  const [story, setStory] = useState(null);
  const [loadingStory, setLoadingStory] = useState(false);
  const [showTranslation, setShowTranslation] = useState({});
  const [today] = useState(new Date().toLocaleDateString('ko-KR', { month:'long', day:'numeric', weekday:'short' }));

  const callAI = async (prompt) => {
    const resp = await fetch("/api/english", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ prompt })
    });
    return resp.json();
  };

  const lv = LEVELS.find(l => l.id === level);

  // 매번 다른 결과를 위한 랜덤 컨텍스트
  const getRandCtx = () => {
    const topics = ["동물","음식","여행","스포츠","학교생활","날씨","쇼핑","음악","영화","자연","직업","가족","건강","기술","역사","문화","감정","색깔","숫자","시간"];
    const grammarTopics = ["be동사","일반동사","현재진행형","과거형","미래형","조동사(can/will/must)","비교급","최상급","수동태","현재완료","관계대명사","접속사","전치사","관사","명사복수형","형용사","부사","의문문","부정문","감탄문"];
    const t = topics[Math.floor(Math.random()*topics.length)];
    const g = grammarTopics[Math.floor(Math.random()*grammarTopics.length)];
    const seed = Math.floor(Math.random()*10000);
    // 날짜+시간 정보 (분 단위까지 - 같은 분 안에 눌러도 다른 seed로 구분)
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}시${now.getMinutes()}분`;
    const weekdays = ["일","월","화","수","목","금","토"];
    const weekday = weekdays[now.getDay()];
    return { topic: t, grammar: g, seed, dateStr, weekday };
  };

  const loadWords = async () => {
    setLoadingWords(true); setWords([]); setExpandedWord(null);
    try {
      const lvDesc = level==="low"?"초등학교 고학년~중학교 초급":level==="mid"?"중학교 중급":level==="high"?"중학교 고급~고등학교":"고등학교 심화~수능/토익 수준";
      const {topic, seed, dateStr, weekday} = getRandCtx();
      const data = await callAI(`[랜덤시드:${seed}][${dateStr}(${weekday}요일)] 오늘의 영어 단어 8개를 ${lvDesc} 수준으로 선정해주세요.
주제: "${topic}" 관련 단어를 중심으로 선정하되, 이 주제에만 국한되지 않고 다양하게 구성하세요.
이전에 자주 나오는 단어(apple, book, school, happy 등 기초 단어)는 피하고 새롭고 유용한 단어를 선택하세요.
반드시 JSON만 응답:
{"theme":"오늘주제(${topic} 관련)","words":[{"word":"단어","pronunciation":"한글발음","meaning":"뜻","example":"자연스러운예문","example_kr":"예문해석","tip":"재미있는암기팁"}]}`);
      if (data.words) setWords(data.words);
    } catch(e) {}
    setLoadingWords(false);
  };

  const loadTalk = async () => {
    setLoadingTalk(true); setTalk(null); setShownLines(0);
    try {
      const lvDesc = level==="low"?"아주 기초적인 (초등 수준, 쉬운 단어)":level==="mid"?"중급 (중학교 수준)":level==="high"?"심화 (고등학교 수준)":"최고급 (수능/토익/원어민 수준, 자연스러운 구어체와 관용표현 포함)";
      const situations = [
        "학교 교실에서","식당에서 주문할 때","친구 생일파티에서","도서관에서","쇼핑몰에서",
        "버스정류장에서","방과후 카페에서","병원 접수처에서","공항에서","영화관에서",
        "체육관에서","동물원에서","서점에서","편의점에서","학교 운동장에서",
        "친구 집에서","온라인 게임 중에","학교 급식실에서","은행에서","호텔에서"
      ];
      const {seed, dateStr, weekday} = getRandCtx();
      const sit = situations[seed % situations.length];
      const data = await callAI(`[랜덤시드:${seed}][${dateStr}(${weekday}요일)] ${lvDesc} 영어 회화를 만들어주세요.
상황: ${sit}. A와 B가 6~8줄 대화.
매번 다른 내용과 표현을 사용하고, 실생활에서 자주 쓰는 자연스러운 표현을 포함하세요.
반드시 JSON만 응답:
{"situation":"${sit}","situation_desc":"상황 한줄 설명","level_hint":"이 레벨 핵심 표현 포인트","lines":[{"speaker":"A","en":"영어대사","kr":"한국어해석","key":"핵심표현(있을때만)"}]}`);
      if (data.lines) { setTalk(data); setShownLines(1); }
    } catch(e) {}
    setLoadingTalk(false);
  };

  const loadGrammar = async (customTopic="") => {
    setLoadingGrammar(true); setGrammar(null); setFillAnswers({}); setFillChecked(false);
    try {
      const lvDesc = level==="low"?"초급 (명사 복수형, be동사, 기초 문장)":level==="mid"?"중급 (현재진행형, 과거형, 조동사)":level==="high"?"고급 (비교급최상급, 수동태, 관계대명사)":"최고급 (가정법, 도치, 분사구문, 수능/토익 고난도 문법)";
      const {grammar: gTopic, seed, dateStr, weekday} = getRandCtx();
      const topic = customTopic || gTopic;
      const topicNote = customTopic
        ? `사용자가 "${customTopic}"을 배우고 싶다고 요청했습니다. 이 문법을 중심으로 다양한 각도에서 설명해주세요.`
        : `이번엔 "${topic}" 관련 문법을 다뤄주세요.`;
      const data = await callAI(`[랜덤시드:${seed}][${dateStr}(${weekday}요일)] ${lvDesc} 영어 문법을 알려주세요.
${topicNote}
매번 다른 예문과 빈칸 문제를 사용하세요. 아이들이 자주 틀리는 실수를 중심으로 재미있게 설명하고, 빈칸 문제도 다양한 상황의 문장으로 만들어주세요.
반드시 JSON만 응답:
{"point":"문법포인트제목","description":"쉬운설명 1-2문장","wrong":"틀린예문","right":"맞는예문","wrong_reason":"왜틀렸는지","tip":"재미있는기억팁","exercises":[{"sentence":"____포함한자연스러운문장","answer":"정답단어","hint":"힌트"},{"sentence":"____포함한자연스러운문장","answer":"정답단어","hint":"힌트"},{"sentence":"____포함한자연스러운문장","answer":"정답단어","hint":"힌트"}]}`);
      if (data.point) setGrammar(data);
    } catch(e) {}
    setLoadingGrammar(false);
  };

  const loadQuiz = async () => {
    setLoadingQuiz(true); setQuiz(null); setQuizAnswer(null);
    try {
      const lvDesc = level==="low"?"초등학교 고학년~중학교 초급":level==="mid"?"중학교 중급":level==="high"?"중학교 고급~고등학교":"고등학교 심화~수능/토익 수준";
      const wordList = words.length>0 ? `오늘 배운 단어: ${words.slice(0,5).map(w=>w.word).join(', ')}` : "";
      const {topic, seed, dateStr, weekday} = getRandCtx();
      const quizTypes = ["단어 뜻 맞히기","빈칸 채우기","문법 오류 찾기","올바른 단어 선택","동의어 찾기","반의어 찾기","문장 완성하기","대화 완성하기"];
      const qType = quizTypes[seed % quizTypes.length];
      const data = await callAI(`[랜덤시드:${seed}][${dateStr}(${weekday}요일)] ${lvDesc} 수준 영어 퀴즈 1문제를 "${qType}" 유형으로 내주세요.
${wordList}
주제: ${topic}. 매번 새롭고 다양한 문제를 내주세요. 정답 위치도 ①②③④ 중 랜덤하게 배치하세요.
반드시 JSON만:
{"type":"${qType}","question":"문제","options":["①보기","②보기","③보기","④보기"],"answer":"②보기(정답위치랜덤)","explanation":"왜 정답인지 + 오답 이유"}`);
      if (data.question) setQuiz(data);
    } catch(e) {}
    setLoadingQuiz(false);
  };

  const loadStory = async () => {
    setLoadingStory(true); setStory(null); setShowTranslation({});
    try {
      const lvDesc = level==="low"?"아주 쉬운 (초등 수준, 짧은 문장 4개)":level==="mid"?"중간 (중학교 수준, 5문장)":level==="high"?"조금 어려운 (고등 초급, 5-6문장)":"어려운 (수능/토익 수준, 6-7문장, 다양한 문법 구조 포함)";
      const {topic, seed, dateStr, weekday} = getRandCtx();
      const genres = ["일상 에피소드","짧은 동화","유머러스한 이야기","모험 이야기","우정 이야기","가족 이야기","학교 생활","동물 이야기","여행 이야기","미래 이야기"];
      const genre = genres[seed % genres.length];
      const data = await callAI(`[랜덤시드:${seed}][${dateStr}(${weekday}요일)] ${lvDesc} 영어 짧은 이야기를 써주세요.
장르: "${genre}", 주제 키워드: "${topic}".
매번 완전히 다른 새로운 이야기를 만들고, 주인공 이름도 다양하게 바꿔주세요.
반드시 JSON만:
{"title":"이야기제목","title_kr":"한국어제목","sentences":[{"en":"영어문장","kr":"해석","key_word":"핵심단어","key_meaning":"뜻"}]}`);
      if (data.sentences) setStory(data);
    } catch(e) {}
    setLoadingStory(false);
  };

  useEffect(() => { loadWords(); }, [level]);
  useEffect(() => {
    if (activeTab==="talk" && !talk) loadTalk();
    if (activeTab==="grammar" && !grammar) loadGrammar();
    if (activeTab==="quiz" && !quiz) loadQuiz();
    if (activeTab==="story" && !story) loadStory();
  }, [activeTab]);

  const toggleBookmark = (word) => setBookmarks(prev => prev.find(w=>w.word===word.word) ? prev.filter(w=>w.word!==word.word) : [...prev, word]);
  const isBookmarked = (word) => bookmarks.some(w=>w.word===word.word);

  const handleQuizAnswer = (opt) => {
    if (quizAnswer) return;
    setQuizAnswer(opt); setQuizTotal(t=>t+1);
    if (opt===quiz.answer) { setQuizScore(s=>s+1); setShowStar(true); setTimeout(()=>setShowStar(false), 2000); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f5f6fa", fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", paddingBottom:40 }}>
      <style>{CSS}</style>

      {/* 헤더 */}
      <div style={{ background:"#fff", borderBottom:"1px solid #f0f0f5", padding:"16px 20px 14px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:640, margin:"0 auto", display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ width:36, height:36, borderRadius:10, border:"1.5px solid #e8e9ef", background:"#fff", cursor:"pointer", fontSize:18 }}>←</button>
          <div style={{ width:38, height:38, borderRadius:12, background:"linear-gradient(135deg,#3b82f6,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🇺🇸</div>
          <div>
            <h1 style={{ margin:0, fontSize:17, fontWeight:800, color:"#1a1a2e" }}>영어 학습</h1>
            <p style={{ margin:0, fontSize:11, color:"#999" }}>{today}</p>
          </div>
          {quizTotal>0 && (
            <div style={{ marginLeft:"auto", background:"#eef2ff", borderRadius:12, padding:"4px 12px", display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:14 }}>🏆</span>
              <span style={{ fontSize:13, fontWeight:800, color:"#6366f1" }}>{quizScore}/{quizTotal}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth:640, margin:"0 auto", padding:"16px 16px 0" }}>

        {/* 레벨 선택 */}
        <div className="card" style={{ padding:"14px 16px" }}>
          <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:800, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>레벨 선택</p>
          <div style={{ display:"flex", gap:8 }}>
            {LEVELS.map(l => (
              <button key={l.id} onClick={()=>{ setLevel(l.id); setQuiz(null); setStory(null); setTalk(null); setGrammar(null); }} className="eng-btn"
                style={{ flex:1, padding:"10px 8px", background:level===l.id?l.bg:"#f8f8fc", border:`2px solid ${level===l.id?l.color:"transparent"}`, color:level===l.id?l.color:"#888", textAlign:"center" }}>
                <div style={{ fontSize:20, marginBottom:2 }}>{l.emoji}</div>
                <div style={{ fontSize:13, fontWeight:800 }}>{l.label}</div>
                <div style={{ fontSize:10, opacity:0.7 }}>{l.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display:"flex", gap:4, background:"#fff", borderRadius:16, padding:5, marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.05)", overflowX:"auto" }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} className="eng-btn"
              style={{ flex:"0 0 auto", padding:"8px 10px", fontSize:11, fontWeight:activeTab===tab.id?800:500, background:activeTab===tab.id?"#6366f1":"transparent", color:activeTab===tab.id?"#fff":"#888", textAlign:"center", minWidth:52 }}>
              <div style={{ fontSize:16 }}>{tab.label}</div>
              <div>{tab.id==="bookmarks"&&bookmarks.length>0 ? `${tab.name}(${bookmarks.length})` : tab.name}</div>
            </button>
          ))}
        </div>

        {/* ── 오늘의 단어 ── */}
        {activeTab==="words" && (
          <div className="fade-up">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <p style={{ margin:0, fontSize:13, color:"#666" }}>{loadingWords?"불러오는 중...":words.length>0?`📌 주제: ${words[0]?.theme||""}`:""}</p>
              <button onClick={loadWords} className="eng-btn" style={{ padding:"6px 12px", background:"#eef2ff", color:"#6366f1", fontSize:12, fontWeight:700 }}>🔄 새 단어</button>
            </div>
            {loadingWords ? (
              <div className="card" style={{ padding:40 }}><LoadingSpinner /><p style={{ textAlign:"center", color:"#bbb", fontSize:13, margin:"12px 0 0" }}>단어 생성 중...</p></div>
            ) : words.map((w,i) => (
              <div key={i} className="card fade-up" style={{ cursor:"pointer", border:`1.5px solid ${expandedWord===i?lv.color:"#f0f0f5"}`, background:expandedWord===i?lv.bg:"#fff" }}
                onClick={()=>setExpandedWord(expandedWord===i?null:i)}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:lv.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:lv.color, flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:18, fontWeight:900, color:"#1a1a2e" }}>{w.word}</span>
                      <span style={{ fontSize:12, color:"#aaa" }}>{w.pronunciation}</span>
                      <SpeakButton text={w.word} />
                    </div>
                    <p style={{ margin:0, fontSize:13, color:"#555", fontWeight:600 }}>{w.meaning}</p>
                  </div>
                  <button onClick={e=>{e.stopPropagation();toggleBookmark(w);}} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", flexShrink:0 }}>
                    {isBookmarked(w)?"⭐":"☆"}
                  </button>
                </div>
                {expandedWord===i && (
                  <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${lv.color}33` }} className="fade-up">
                    <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:12, padding:"10px 14px", marginBottom:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <p style={{ margin:0, fontSize:13, color:"#555", fontStyle:"italic", flex:1 }}>{w.example}</p>
                        <SpeakButton text={w.example} />
                      </div>
                      <p style={{ margin:0, fontSize:12, color:"#888" }}>{w.example_kr}</p>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, background:"#fffbeb", borderRadius:10, padding:"8px 12px" }}>
                      <span style={{ fontSize:14 }}>💡</span>
                      <p style={{ margin:0, fontSize:12, color:"#92400e" }}>{w.tip}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── 오늘의 회화 ── */}
        {activeTab==="talk" && (
          <div className="fade-up">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <p style={{ margin:0, fontSize:13, color:"#666" }}>소리 내어 따라해보세요! 🎤</p>
              <button onClick={loadTalk} className="eng-btn" style={{ padding:"6px 12px", background:"#eef2ff", color:"#6366f1", fontSize:12, fontWeight:700 }}>🔄 새 대화</button>
            </div>
            {loadingTalk ? (
              <div className="card" style={{ padding:40 }}><LoadingSpinner /><p style={{ textAlign:"center", color:"#bbb", fontSize:13, margin:"12px 0 0" }}>회화 생성 중...</p></div>
            ) : talk ? (
              <div>
                {/* 상황 카드 */}
                <div className="card" style={{ background:`linear-gradient(135deg,${lv.bg},#fff)`, border:`1.5px solid ${lv.color}44`, padding:"14px 16px", marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:20 }}>🎬</span>
                    <span style={{ fontSize:14, fontWeight:800, color:lv.color }}>{talk.situation}</span>
                  </div>
                  <p style={{ margin:"0 0 6px", fontSize:13, color:"#555" }}>{talk.situation_desc}</p>
                  <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:10, padding:"6px 10px" }}>
                    <span style={{ fontSize:11, color:"#888" }}>💡 포인트: </span>
                    <span style={{ fontSize:11, color:lv.color, fontWeight:700 }}>{talk.level_hint}</span>
                  </div>
                </div>

                {/* 대화 */}
                <div className="card">
                  {talk.lines?.slice(0, shownLines).map((line, i) => {
                    const isA = line.speaker === "A";
                    return (
                      <div key={i} className="talk-bubble" style={{ marginBottom:16, display:"flex", flexDirection:"column", alignItems:isA?"flex-start":"flex-end", animationDelay:`${i*0.1}s` }}>
                        <div style={{ display:"flex", alignItems:"flex-end", gap:8, flexDirection:isA?"row":"row-reverse" }}>
                          <div style={{ width:32, height:32, borderRadius:"50%", background:isA?"#6366f1":"#10b981", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#fff", fontWeight:800, flexShrink:0 }}>{line.speaker}</div>
                          <div style={{ maxWidth:"78%" }}>
                            <div style={{ background:isA?"#eef2ff":"#ecfdf5", borderRadius:isA?"4px 16px 16px 16px":"16px 4px 16px 16px", padding:"10px 14px", marginBottom:4 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                                <p style={{ margin:0, fontSize:15, fontWeight:700, color:"#1a1a2e", flex:1 }}>{line.en}</p>
                                <SpeakButton text={line.en} />
                              </div>
                              <p style={{ margin:0, fontSize:12, color:"#777" }}>{line.kr}</p>
                            </div>
                            {line.key && <span style={{ fontSize:11, background:isA?"#c7d2fe":"#a7f3d0", color:isA?"#4338ca":"#065f46", padding:"2px 8px", borderRadius:20, fontWeight:700 }}>📌 {line.key}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {shownLines < (talk.lines?.length||0) && (
                    <button onClick={()=>setShownLines(s=>s+1)} className="eng-btn" style={{ width:"100%", padding:"12px", background:"#f8f8fc", color:"#6366f1", fontSize:14, fontWeight:700, marginTop:8 }}>
                      다음 대사 보기 ({shownLines}/{talk.lines?.length}) →
                    </button>
                  )}
                  {shownLines >= (talk.lines?.length||0) && talk.lines?.length > 0 && (
                    <div style={{ textAlign:"center", marginTop:12, padding:"12px", background:"#f0fdf4", borderRadius:12 }}>
                      <p style={{ margin:0, fontSize:13, color:"#059669", fontWeight:700 }}>🎉 대화 완료! 처음부터 소리 내어 읽어보세요!</p>
                      <button onClick={()=>setShownLines(1)} className="eng-btn" style={{ marginTop:8, padding:"8px 16px", background:"#10b981", color:"#fff", fontSize:13, fontWeight:700 }}>🔄 다시 보기</button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── 오늘의 문법 ── */}
        {activeTab==="grammar" && (
          <div className="fade-up">
            {/* 직접 입력 */}
            <div className="card" style={{ padding:"14px 16px", marginBottom:12 }}>
              <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:800, color:"#1a1a2e" }}>📝 배우고 싶은 문법을 직접 입력하세요</p>
              <div style={{ display:"flex", gap:8 }}>
                <input
                  value={grammarInput}
                  onChange={e=>setGrammarInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&grammarInput.trim()&&loadGrammar(grammarInput.trim())}
                  placeholder="예) 현재완료, 수동태, to부정사, 관계대명사..."
                  style={{ flex:1, padding:"10px 14px", borderRadius:12, border:"1.5px solid #c7d2fe", fontSize:14, fontFamily:"inherit", outline:"none", background:"#f8f8fc", color:"#1a1a2e" }}
                />
                <button
                  onClick={()=>grammarInput.trim() ? loadGrammar(grammarInput.trim()) : loadGrammar()}
                  className="eng-btn"
                  style={{ padding:"10px 16px", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:800, flexShrink:0 }}>
                  생성
                </button>
              </div>
              {grammarInput && (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                  <span style={{ fontSize:12, color:"#6366f1", fontWeight:700 }}>🎯 "{grammarInput}" 위주로 생성해요 · 🔄 누를 때마다 새로운 예문!</span>
                  <button onClick={()=>{setGrammarInput(""); setGrammar(null);}} style={{ background:"none", border:"none", color:"#bbb", fontSize:12, cursor:"pointer" }}>초기화</button>
                </div>
              )}
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <p style={{ margin:0, fontSize:13, color:"#666" }}>{grammarInput ? `"${grammarInput}" 문법 연습 중 🔍` : "규칙을 발견하는 재미! 🔍"}</p>
              <button onClick={()=>loadGrammar(grammarInput.trim())} className="eng-btn" style={{ padding:"6px 12px", background:"#eef2ff", color:"#6366f1", fontSize:12, fontWeight:700 }}>🔄 새 예문</button>
            </div>
            {loadingGrammar ? (
              <div className="card" style={{ padding:40 }}><LoadingSpinner /><p style={{ textAlign:"center", color:"#bbb", fontSize:13, margin:"12px 0 0" }}>문법 생성 중...</p></div>
            ) : grammar ? (
              <div>
                {/* 문법 포인트 */}
                <div className="card" style={{ background:`linear-gradient(135deg,${lv.bg},#fff)`, border:`1.5px solid ${lv.color}44` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <span style={{ fontSize:24 }}>✏️</span>
                    <h3 style={{ margin:0, fontSize:18, fontWeight:900, color:lv.color }}>{grammar.point}</h3>
                  </div>
                  <p style={{ margin:"0 0 14px", fontSize:14, color:"#555", lineHeight:1.6 }}>{grammar.description}</p>

                  {/* 틀린 vs 맞는 */}
                  <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                    <div style={{ flex:1, background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:14, padding:"12px 14px" }}>
                      <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:800, color:"#ef4444" }}>❌ 틀린 표현</p>
                      <p style={{ margin:0, fontSize:14, fontWeight:700, color:"#dc2626" }}>{grammar.wrong}</p>
                    </div>
                    <div style={{ flex:1, background:"#ecfdf5", border:"1.5px solid #6ee7b7", borderRadius:14, padding:"12px 14px" }}>
                      <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:800, color:"#10b981" }}>✅ 맞는 표현</p>
                      <p style={{ margin:0, fontSize:14, fontWeight:700, color:"#059669" }}>{grammar.right}</p>
                      <SpeakButton text={grammar.right} />
                    </div>
                  </div>
                  <div style={{ background:"#fffbeb", borderRadius:10, padding:"8px 12px", marginBottom:8 }}>
                    <p style={{ margin:0, fontSize:12, color:"#92400e" }}>🔑 {grammar.wrong_reason}</p>
                  </div>
                  <div style={{ background:"#f0fdf4", borderRadius:10, padding:"8px 12px" }}>
                    <p style={{ margin:0, fontSize:12, color:"#065f46" }}>💡 기억 팁: {grammar.tip}</p>
                  </div>
                </div>

                {/* 빈칸 채우기 */}
                <div className="card">
                  <p style={{ margin:"0 0 14px", fontSize:14, fontWeight:800, color:"#1a1a2e" }}>📝 직접 써보기!</p>
                  {grammar.exercises?.map((ex, i) => {
                    const parts = ex.sentence.split("____");
                    const userAns = fillAnswers[i]||"";
                    const isRight = fillChecked && userAns.trim().toLowerCase()===ex.answer.toLowerCase();
                    const isWrong = fillChecked && userAns.trim() && !isRight;
                    return (
                      <div key={i} style={{ marginBottom:14, padding:"12px 14px", borderRadius:14, background: fillChecked?(isRight?"#ecfdf5":isWrong?"#fef2f2":"#f8f8fc"):"#f8f8fc", border:`1.5px solid ${fillChecked?(isRight?"#10b981":isWrong?"#ef4444":"#e8e9ef"):"#e8e9ef"}` }}>
                        <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:4, marginBottom:8 }}>
                          <span style={{ fontSize:14, color:"#1a1a2e", fontWeight:600 }}>{parts[0]}</span>
                          <input value={userAns} onChange={e=>setFillAnswers(p=>({...p,[i]:e.target.value}))} disabled={fillChecked}
                            placeholder={ex.hint} style={{ width:100, padding:"4px 8px", border:`1.5px solid ${fillChecked?(isRight?"#10b981":isWrong?"#ef4444":"#e8e9ef"):"#c7d2fe"}`, borderRadius:8, fontSize:14, fontFamily:"inherit", background:fillChecked?(isRight?"#ecfdf5":isWrong?"#fef2f2":"#fff"):"#fff", color:isRight?"#059669":isWrong?"#ef4444":"#1a1a2e", outline:"none", fontWeight:fillChecked?700:400 }} />
                          {parts[1] && <span style={{ fontSize:14, color:"#1a1a2e", fontWeight:600 }}>{parts[1]}</span>}
                        </div>
                        {fillChecked && <p style={{ margin:0, fontSize:12, color:isRight?"#059669":"#ef4444", fontWeight:700 }}>{isRight?"✓ 정답!":"✗ 정답: "+ex.answer}</p>}
                      </div>
                    );
                  })}
                  {!fillChecked ? (
                    <button onClick={()=>setFillChecked(true)} className="eng-btn" style={{ width:"100%", padding:"13px", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:14, fontWeight:800 }}>채점하기 ✓</button>
                  ) : (
                    <button onClick={()=>{setFillAnswers({}); setFillChecked(false);}} className="eng-btn" style={{ width:"100%", padding:"13px", background:"#f1f2f6", color:"#666", fontSize:14, fontWeight:700 }}>🔄 다시 풀기</button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── 퀴즈 ── */}
        {activeTab==="quiz" && (
          <div className="fade-up">
            {quizTotal>0 && (
              <div className="card" style={{ background:"linear-gradient(135deg,#eef2ff,#e0e7ff)", border:"1.5px solid #c7d2fe", padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <p style={{ margin:0, fontSize:12, color:"#6366f1", fontWeight:700 }}>오늘의 퀴즈 점수</p>
                  <p style={{ margin:0, fontSize:24, fontWeight:900, color:"#4338ca" }}>{quizScore} / {quizTotal}</p>
                </div>
                <div style={{ fontSize:32 }}>{quizScore===quizTotal&&quizTotal>0?"🏆":quizScore>quizTotal/2?"😊":"💪"}</div>
              </div>
            )}
            {showStar && (
              <div style={{ textAlign:"center", marginBottom:-10 }}>
                <div style={{ fontSize:44, animation:"starFloat 1.8s ease-out forwards", display:"inline-block" }}>⭐</div>
                <p style={{ margin:"-10px 0 0", fontSize:16, fontWeight:900, color:"#f59e0b", animation:"starFloat 1.8s ease-out forwards" }}>참 잘했어요! 🎉</p>
              </div>
            )}
            {loadingQuiz ? (
              <div className="card" style={{ padding:40 }}><LoadingSpinner /><p style={{ textAlign:"center", color:"#bbb", fontSize:13, margin:"12px 0 0" }}>퀴즈 생성 중...</p></div>
            ) : quiz ? (
              <div className="card">
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <span style={{ background:"#eef2ff", color:"#6366f1", padding:"4px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>🎯 {quiz.type}</span>
                  {quizAnswer && <button onClick={()=>{setQuiz(null);setQuizAnswer(null);loadQuiz();}} className="eng-btn" style={{ padding:"6px 12px", background:"#6366f1", color:"#fff", fontSize:12, fontWeight:700 }}>다음 문제 →</button>}
                </div>
                <p style={{ margin:"0 0 16px", fontSize:16, fontWeight:800, color:"#1a1a2e", lineHeight:1.6 }}>{quiz.question}</p>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {quiz.options?.map((opt,i) => {
                    const isCorrect = opt===quiz.answer;
                    const isSelected = opt===quizAnswer;
                    const isWrong = isSelected&&!isCorrect;
                    return (
                      <button key={i} onClick={()=>handleQuizAnswer(opt)} className="eng-btn"
                        style={{ padding:"13px 16px", textAlign:"left", fontSize:14, fontWeight:isSelected||isCorrect&&quizAnswer?700:500,
                          background:!quizAnswer?"#f8f8fc":isCorrect?"#ecfdf5":isWrong?"#fef2f2":"#f8f8fc",
                          border:`2px solid ${!quizAnswer?"#e8e9ef":isCorrect?"#10b981":isWrong?"#ef4444":"#e8e9ef"}`,
                          color:!quizAnswer?"#333":isCorrect?"#059669":isWrong?"#ef4444":"#aaa",
                          cursor:quizAnswer?"default":"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        {opt}
                        {quizAnswer&&isCorrect&&<span>✓</span>}
                        {quizAnswer&&isWrong&&<span>✗</span>}
                      </button>
                    );
                  })}
                </div>
                {quizAnswer && (
                  <div style={{ marginTop:12, padding:"12px 14px", borderRadius:12, background:"#fffbeb", border:"1px solid #fde68a" }} className="fade-up">
                    <p style={{ margin:0, fontSize:13, color:"#92400e" }}>💡 {quiz.explanation}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ textAlign:"center", padding:40 }}>
                <p style={{ fontSize:40, margin:"0 0 12px" }}>🎯</p>
                <button onClick={loadQuiz} className="eng-btn" style={{ padding:"14px 24px", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:15, fontWeight:800 }}>퀴즈 시작!</button>
              </div>
            )}
          </div>
        )}

        {/* ── 이야기 ── */}
        {activeTab==="story" && (
          <div className="fade-up">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <p style={{ margin:0, fontSize:13, color:"#666" }}>소리 내어 읽어보세요! 🎤</p>
              <button onClick={loadStory} className="eng-btn" style={{ padding:"6px 12px", background:"#eef2ff", color:"#6366f1", fontSize:12, fontWeight:700 }}>🔄 새 이야기</button>
            </div>
            {loadingStory ? (
              <div className="card" style={{ padding:40 }}><LoadingSpinner /><p style={{ textAlign:"center", color:"#bbb", fontSize:13, margin:"12px 0 0" }}>이야기 생성 중...</p></div>
            ) : story ? (
              <div className="card">
                <div style={{ marginBottom:16 }}>
                  <h3 style={{ margin:"0 0 4px", fontSize:18, fontWeight:900, color:"#1a1a2e" }}>{story.title}</h3>
                  <p style={{ margin:0, fontSize:13, color:"#888" }}>{story.title_kr}</p>
                </div>
                {story.sentences?.map((s,i) => (
                  <div key={i} style={{ marginBottom:12, padding:"12px 14px", borderRadius:14, background:showTranslation[i]?"#f5f3ff":"#f8f8fc", border:`1.5px solid ${showTranslation[i]?"#c4b5fd":"#f0f0f5"}`, cursor:"pointer" }}
                    onClick={()=>setShowTranslation(p=>({...p,[i]:!p[i]}))}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:showTranslation[i]?6:0 }}>
                      <p style={{ margin:0, fontSize:15, fontWeight:700, color:"#1a1a2e", lineHeight:1.6, flex:1 }}>{s.en}</p>
                      <SpeakButton text={s.en} />
                    </div>
                    {showTranslation[i] && (
                      <div className="fade-up">
                        <p style={{ margin:"0 0 6px", fontSize:13, color:"#6366f1" }}>{s.kr}</p>
                        <span style={{ fontSize:11, background:"#ede9fe", color:"#7c3aed", padding:"2px 8px", borderRadius:8, fontWeight:700 }}>{s.key_word} = {s.key_meaning}</span>
                      </div>
                    )}
                    {!showTranslation[i] && <p style={{ margin:"4px 0 0", fontSize:11, color:"#bbb" }}>탭하면 해석 보기 👆</p>}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* ── 단어장 ── */}
        {activeTab==="bookmarks" && (
          <div className="fade-up">
            {bookmarks.length===0 ? (
              <div className="card" style={{ textAlign:"center", padding:"48px 24px" }}>
                <p style={{ fontSize:48, margin:"0 0 12px" }}>⭐</p>
                <h3 style={{ margin:"0 0 8px", fontSize:18, fontWeight:800, color:"#1a1a2e" }}>나만의 단어장</h3>
                <p style={{ margin:0, fontSize:13, color:"#bbb" }}>단어 옆 ☆을 눌러서 저장해보세요!</p>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <p style={{ margin:0, fontSize:13, color:"#666", fontWeight:700 }}>⭐ 저장된 단어 {bookmarks.length}개</p>
                  <button onClick={()=>setBookmarks([])} className="eng-btn" style={{ padding:"6px 12px", background:"#fef2f2", color:"#ef4444", fontSize:12, fontWeight:700 }}>전체 삭제</button>
                </div>
                {bookmarks.map((w,i) => (
                  <div key={i} className="card fade-up">
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:17, fontWeight:900, color:"#1a1a2e" }}>{w.word}</span>
                          <span style={{ fontSize:12, color:"#aaa" }}>{w.pronunciation}</span>
                          <SpeakButton text={w.word} />
                        </div>
                        <p style={{ margin:"3px 0 0", fontSize:13, color:"#555" }}>{w.meaning}</p>
                        <p style={{ margin:"4px 0 0", fontSize:12, color:"#888", fontStyle:"italic" }}>{w.example}</p>
                      </div>
                      <button onClick={()=>toggleBookmark(w)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }}>⭐</button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
