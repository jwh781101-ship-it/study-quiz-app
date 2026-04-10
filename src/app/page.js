'use client';
import { useState, useRef, useCallback, useEffect } from "react";
import EnglishLearning from "./english";
import { supabase } from "./supabase";

const DIFFICULTY_CONFIG = {
  easy: { label:"쉬움", emoji:"🌱", desc:"기본 개념 확인", color:"#10b981", bg:"#ecfdf5", prompt:"기초 개념을 확인하는 수준으로, 교과서 핵심 내용을 정확히 이해했는지 묻는 문제를 출제하세요." },
  medium: { label:"보통", emoji:"📚", desc:"개념 적용 및 이해", color:"#6366f1", bg:"#eef2ff", prompt:"개념을 실제 상황에 적용하고 추론하는 문제를 출제하세요." },
  hard: { label:"어려움", emoji:"🔥", desc:"심화 응용 및 서술", color:"#ef4444", bg:"#fef2f2", prompt:"깊은 이해와 비판적 사고가 필요한 최상위 난이도 문제를 출제하세요." }
};

const GRADES = [
  { label:"초4", full:"초등학교 4학년" }, { label:"초5", full:"초등학교 5학년" }, { label:"초6", full:"초등학교 6학년" },
  { label:"중1", full:"중학교 1학년" }, { label:"중2", full:"중학교 2학년" }, { label:"중3", full:"중학교 3학년" },
  { label:"고1", full:"고등학교 1학년" }, { label:"고2", full:"고등학교 2학년" }, { label:"고3", full:"고등학교 3학년" },
];
const SUBJECTS = ["국어","영어","수학","과학","사회","역사","기술·가정","도덕","기타"];
const MAX_IMAGES = 10;
const ENGLISH_TYPES = [
  { id:"mixed", label:"종합형", desc:"객관식+서술형" },
  { id:"multiple", label:"객관식만", desc:"5지선다" },
  { id:"essay", label:"서술형만", desc:"영작/단답" },
];
const SCOPE_OPTIONS = [
  { id:"image_only", label:"입력 내용만", desc:"올린 자료에서만 출제", emoji:"📎" },
  { id:"image_plus", label:"입력 + 관련 개념", desc:"자료 + 연계 개념 포함", emoji:"🌐" },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; background: #f5f6fa; }
  .card { background: #fff; border-radius: 20px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 12px; }
  .chip { display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .btn-primary { width: 100%; padding: 18px; border-radius: 16px; border: none; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 17px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px rgba(99,102,241,0.35); font-family: inherit; transition: transform 0.1s, box-shadow 0.1s; }
  .btn-primary:active { transform: scale(0.98); box-shadow: 0 2px 10px rgba(99,102,241,0.25); }
  .tag-btn { padding: 8px 14px; border-radius: 20px; border: 2px solid transparent; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; font-family: inherit; }
  .tag-btn.active { background: #6366f1; color: #fff; border-color: #6366f1; font-weight: 700; }
  .tag-btn:not(.active) { background: #f1f2f6; color: #555; }
  .option-btn { width: 100%; padding: 14px 16px; border-radius: 14px; border: 2px solid #e8e9ef; background: #fff; text-align: left; cursor: pointer; font-size: 14px; font-family: inherit; transition: all 0.15s; display: flex; align-items: center; gap: 10px; color: #333; }
  .option-btn:hover { border-color: #6366f1; background: #f5f3ff; }
  .option-btn.selected { border-color: #6366f1; background: #f5f3ff; color: #6366f1; font-weight: 700; }
  .option-btn.correct { border-color: #10b981; background: #ecfdf5; color: #10b981; font-weight: 700; }
  .option-btn.wrong { border-color: #ef4444; background: #fef2f2; color: #ef4444; font-weight: 700; }
  @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation: fadeUp 0.35s ease both; }
`;

function shuffleOptions(question) {
  try {
    if (question.type !== "객관식" || !question.options || question.options.length === 0) return question;
    const nums = ["①","②","③","④","⑤"];
    const stripNum = (str) => {
      if (!str) return str;
      for (const n of nums) { if (str.startsWith(n)) return str.slice(n.length).trim(); }
      return str.replace(/^[①②③④⑤0-9]+[.)]\s*/, "").trim();
    };
    const answerContent = stripNum(question.answer);
    const options = [...question.options];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    const newOptions = options.map((opt, i) => { const c = stripNum(opt); return (nums[i] || "") + " " + c; });
    const newAnswer = newOptions.find(opt => stripNum(opt) === answerContent) || question.answer;
    return { ...question, options: newOptions, answer: newAnswer };
  } catch(e) { return question; }
}

export default function StudyQuizApp() {
  const [step, setStep] = useState("upload");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [grade, setGrade] = useState("중2");
  const [subject, setSubject] = useState("국어");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [scope, setScope] = useState("image_only");
  const [englishType, setEnglishType] = useState("mixed");
  const [quizData, setQuizData] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [score, setScore] = useState(null);
  const [essayScores, setEssayScores] = useState({});
  const [gradingEssay, setGradingEssay] = useState(false);
  const [badImages, setBadImages] = useState([]);
  const [showEnglish, setShowEnglish] = useState(false);
  const [showHome, setShowHome] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [usage, setUsage] = useState({ plan:'guest', used:0, limit:3, canUse:true }); // 홈 화면 (앱 선택)
  const galleryInputRef = useRef();
  const cameraInputRef = useRef();

  useEffect(() => {
    // 현재 로그인 상태 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      checkUsage(session?.user ?? null);
    });
    // 로그인/로그아웃 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      checkUsage(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkUsage = async (currentUser) => {
    try {
      const headers = {};
      if (currentUser) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const resp = await fetch('/api/usage', { headers });
      const data = await resp.json();
      setUsage(data);
    } catch(e) {}
  };

  const incrementUsage = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      const { data: { session } } = await supabase.auth.getSession();
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
      await fetch('/api/usage', { method: 'POST', headers });
      await checkUsage(user);
    } catch(e) {}
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const hasContent = uploadedImages.length > 0 || textInput.trim().length > 0;
  const hasImages = uploadedImages.length > 0;
  const hasText = textInput.trim().length > 0;

  const compressImage = (file) => new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const MAX_SIZE = 1024;
      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) { height = Math.round(height * MAX_SIZE / width); width = MAX_SIZE; }
        else { width = Math.round(width * MAX_SIZE / height); height = MAX_SIZE; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", 0.7);
      resolve({ url, base64: compressed.split(",")[1], type: "image/jpeg" });
    };
    img.src = url;
  });

  const processFiles = useCallback((files) => {
    const fileArr = Array.from(files).slice(0, MAX_IMAGES - uploadedImages.length);
    if (!fileArr.length) return;
    setError(null);
    fileArr.forEach(async file => {
      if (!file.type.startsWith("image/")) return;
      const compressed = await compressImage(file);
      setUploadedImages(prev => prev.length >= MAX_IMAGES ? prev : [...prev, compressed]);
    });
  }, [uploadedImages]);

  const handleGalleryChange = (e) => { processFiles(e.target.files); e.target.value = ""; };
  const handleCameraChange = (e) => { processFiles(e.target.files); e.target.value = ""; };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); };
  const removeImage = (idx) => setUploadedImages(prev => prev.filter((_, i) => i !== idx));

  const getSourceLabel = () => {
    if (hasImages && hasText) return `이미지 ${uploadedImages.length}장 + 텍스트`;
    if (hasImages) return `이미지 ${uploadedImages.length}장`;
    if (hasText) return "텍스트 입력";
    return "";
  };

  const buildPrompt = () => {
    const diff = DIFFICULTY_CONFIG[difficulty];
    const gradeInfo = GRADES.find(g => g.label === grade);
    const sourceDesc = getSourceLabel();
    const scopeText = scope === "image_only"
      ? `반드시 제공된 ${sourceDesc}에서만 출제하세요. 제공된 자료에 없는 내용은 절대 출제하지 마세요.`
      : `제공된 ${sourceDesc}을 중심으로 출제하되, 관련 개념과 연계된 문제도 포함할 수 있습니다.`;
    let typeGuide = "";
    if (subject === "영어") {
      if (englishType === "multiple") typeGuide = "모든 문제를 객관식(5지선다)으로 출제하세요.";
      else if (englishType === "essay") typeGuide = `모든 문제를 서술형으로 출제하세요. 한글 문장을 보여주고 영어로 영작하는 문제를 위주로 출제하세요.`;
      else typeGuide = "객관식과 서술형(영작/단답)을 골고루 섞어서 출제하세요.";
    }
    const textSection = hasText ? `\n\n[텍스트 학습 내용]\n${textInput}` : "";
    return `당신은 대한민국 교육부 공식 출제위원이자 20년 경력의 ${subject} 전문 출제자입니다.\n\n[중요] 이미지가 다소 흐리거나 기울어져 있어도 절대 포기하지 말고 최대한 내용을 파악해서 문제를 출제하세요. 이미지에서 읽을 수 있는 모든 텍스트를 활용하세요.\n\n[출제 대상]\n- 학년: ${gradeInfo.full}\n- 과목: ${subject}\n- 난이도: ${diff.label} (${diff.prompt})\n- 문제 수: ${questionCount}개\n\n[출제 범위]\n${scopeText}${textSection}\n\n[출제 원칙]\n1. 정답은 반드시 1개만 존재해야 합니다.\n2. 객관식 정답 위치를 ①②③④⑤ 중 랜덤하게 배치하세요.\n3. 문제 순서를 전체 범위에서 골고루 랜덤하게 배치하세요.\n4. 해설에는 정답 이유 + 오답 이유를 명확히 설명하세요.\n${subject === "영어" ? `\n[영어 유형]\n${typeGuide}` : ""}\n\n반드시 JSON 형식으로만 응답:\n{"topic":"학습주제","questions":[{"id":1,"type":"객관식","question":"문제","options":["① 내용","② 내용","③ 내용","④ 내용","⑤ 내용"],"answer":"③ 내용","explanation":"해설"},{"id":2,"type":"서술형","question":"문제","options":null,"answer":"답","explanation":"해설"}]}`;
  };

  const callAPI = async (images, prompt) => {
    const resp = await fetch("/api/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: images.map(img => ({ base64: img.base64, type: img.type })), prompt })
    });
    return resp.json();
  };

  const generateQuiz = async () => {
    if (!hasContent) { setError("이미지를 올리거나 텍스트를 입력해주세요."); return; }
    // 사용량 체크
    await checkUsage(user);
    if (!usage.canUse) {
      const msg = user
        ? `오늘 사용 한도(${usage.limit}회)를 초과했어요. 내일 다시 시도하거나 프리미엄으로 업그레이드하세요! 🌟`
        : `비회원은 하루 ${usage.limit}회까지 사용 가능해요. 구글 로그인하면 더 많이 사용할 수 있어요!`;
      setError(msg);
      return;
    }
    setStep("loading"); setError(null); setSelectedAnswers({}); setShowAnswers(false); setScore(null); setEssayScores({}); setBadImages([]);
    try {
      const prompt = buildPrompt();

      // 한 번만 시도
      const data = await callAPI(uploadedImages, prompt);

      // 성공
      if (!data.error && data.questions?.length > 0) {
        let qs = data.questions.map(q => { try { return shuffleOptions(q); } catch(e) { return q; } });
        for (let i = qs.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [qs[i],qs[j]]=[qs[j],qs[i]]; }
        setQuizData({ ...data, questions: qs }); setStep("result"); incrementUsage(); return;
      }

      // 실패 시 - 이미지가 여러 장이면 어떤 이미지가 문제인지 AI 진단
      if (uploadedImages.length > 1) {
        const diagPrompt = `아래 이미지들 중 학습 자료로 인식할 수 없는 이미지 번호를 찾아주세요. (1번부터 시작)
흐리거나, 학습 내용이 아니거나, 텍스트를 읽을 수 없으면 문제 있는 이미지입니다.
반드시 JSON만 응답: {"bad_indices":[문제번호들],"reason":"이유"}`;
        try {
          const diagData = await callAPI(uploadedImages, diagPrompt);
          if (diagData.bad_indices?.length > 0) {
            const badIdxs = diagData.bad_indices.map(n => n - 1);
            setBadImages(badIdxs);
            const badNames = badIdxs.map(i => `${i+1}번 이미지`).join(', ');
            throw new Error(`${badNames}를 인식할 수 없어요. 해당 사진을 제거하거나 더 선명하게 다시 찍어주세요.`);
          }
        } catch(diagErr) {
          if (diagErr.message.includes("번 이미지")) throw diagErr;
        }
      }

      throw new Error(data.error || "문제를 생성할 수 없어요. 교재 사진을 더 밝고 선명하게 다시 찍어주세요.");
    } catch(err) { setError(err.message); setStep("config"); }
  };

  const handleSelectAnswer = (qid, answer) => { if (!showAnswers) setSelectedAnswers(prev => ({ ...prev, [qid]: answer })); };

  const gradeEssay = async (question, myAnswer) => {
    try {
      const prompt = `문제: ${question.question}\n모범 답안: ${question.answer}\n학생 답안: ${myAnswer}\n\n채점 결과를 JSON으로만:\n{"result":"정답" 또는 "부분정답" 또는 "오답","score":0~100,"feedback":"피드백 1-2문장"}`;
      const resp = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ images:[], prompt, isGrading:true }) });
      const data = await resp.json();
      if (data.result) setEssayScores(prev => ({ ...prev, [question.id]: data }));
    } catch(e) {}
  };

  const handleSubmit = async () => {
    if (!quizData) return;
    let correct = 0;
    const total = quizData.questions.filter(q => q.type === "객관식").length;
    quizData.questions.forEach(q => { if (q.type === "객관식" && selectedAnswers[q.id] === q.answer) correct++; });
    setScore({ correct, total }); setShowAnswers(true); setGradingEssay(true);
    for (const q of quizData.questions.filter(q => q.type === "서술형" || q.type === "단답형")) {
      if (selectedAnswers[q.id]?.trim()) await gradeEssay(q, selectedAnswers[q.id]);
      else setEssayScores(prev => ({ ...prev, [q.id]: { result:"오답", score:0, feedback:"답안을 작성하지 않았습니다." } }));
    }
    setGradingEssay(false);
  };

  const reset = () => {
    setStep("upload"); setUploadedImages([]); setTextInput(""); setShowTextInput(false);
    setQuizData(null); setSelectedAnswers({}); setShowAnswers(false);
    setScore(null); setError(null); setEssayScores({}); setBadImages([]); setShowHome(true);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const diff = DIFFICULTY_CONFIG[difficulty];

  if (showEnglish) return <EnglishLearning onBack={()=>{ setShowEnglish(false); setShowHome(true); }} />;

  if (showHome) return (
  <div style={{ minHeight:"100vh", background:"#f5f6fa", fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", display:"flex", flexDirection:"column" }}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
      @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      .fade-up { animation: fadeUp 0.4s ease both; }
    `}</style>

    {/* 헤더 */}
    <div style={{ background:"#fff", borderBottom:"1px solid #f0f0f5", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div>
        <h1 style={{ margin:0, fontSize:18, fontWeight:900, color:"#1a1a2e" }}>✨ AI 학습 도우미</h1>
        <p style={{ margin:"2px 0 0", fontSize:11, color:"#aaa" }}>무엇을 공부할까요?</p>
      </div>
      {authLoading ? (
        <div style={{ width:32, height:32, borderRadius:"50%", background:"#f0f0f8" }} />
      ) : user ? (
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <img src={user.user_metadata?.avatar_url} alt="프로필" style={{ width:32, height:32, borderRadius:"50%", border:"2px solid #e8e9ef" }} onError={e=>e.target.style.display='none'} />
          <button onClick={signOut} style={{ background:"#f1f2f6", border:"none", borderRadius:10, padding:"6px 12px", fontSize:12, color:"#666", cursor:"pointer", fontWeight:600, fontFamily:"inherit" }}>로그아웃</button>
        </div>
      ) : (
        <button onClick={signInWithGoogle} style={{ display:"flex", alignItems:"center", gap:6, background:"#fff", border:"1.5px solid #e8e9ef", borderRadius:12, padding:"8px 14px", fontSize:13, color:"#333", cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>
          <svg width="15" height="15" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          구글로 로그인
        </button>
      )}
    </div>

    {/* 메인 */}
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 20px" }}>
      <div style={{ width:"100%", maxWidth:500 }}>

        {/* 비솜이 + 말풍선 */}
<div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8, paddingLeft:20 }} className="fade-up">
  <img src="/dog.jpg" alt="비솜" style={{ width:88, height:88, borderRadius:"50%", objectFit:"cover", border:"4px solid #fff", boxShadow:"0 8px 24px rgba(0,0,0,0.12)", animation:"float 3s ease-in-out infinite", flexShrink:0 }} />
  
  {/* 말풍선 */}
  <div style={{ background:"#fff", border:"2px solid #6366f1", borderRadius:"16px 16px 16px 4px", padding:"10px 14px", boxShadow:"0 4px 16px rgba(99,102,241,0.15)", position:"relative", maxWidth:"calc(100% - 140px)" }}>
    <div style={{ position:"absolute", left:-8, top:16, width:0, height:0, borderTop:"6px solid transparent", borderBottom:"6px solid transparent", borderRight:"8px solid #6366f1" }} />
    <div style={{ position:"absolute", left:-5, top:18, width:0, height:0, borderTop:"4px solid transparent", borderBottom:"4px solid transparent", borderRight:"6px solid #fff" }} />
    <p style={{ margin:"0 0 3px", fontSize:13, fontWeight:900, color:"#6366f1", lineHeight:1.4 }}>가장 Hot한 Claude가<br/>공부를 도와줄게! 🔥</p>
    <p style={{ margin:0, fontSize:12, color:"#888", lineHeight:1.4 }}>AI 구독 필요 No No! 🙅</p>
  </div>
</div>

        <p style={{ textAlign:"center", fontSize:13, color:"#888", fontWeight:600, margin:"12px 0 24px" }}>오늘도 열심히 공부해보자! 💪</p>

        {/* 카드 목록 */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }} className="fade-up">

          {/* 시험문제 생성기 */}
<button onClick={()=>setShowHome(false)} style={{ background:"#fff", borderRadius:22, border:"2.5px solid #6366f1", boxShadow:"0 4px 20px rgba(99,102,241,0.15)", cursor:"pointer", padding:"22px 20px", display:"flex", alignItems:"center", gap:18, transition:"transform 0.15s", fontFamily:"inherit", width:"100%" }}
  onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e=>e.currentTarget.style.transform="translateY(0)"}>
  <svg width="68" height="68" viewBox="0 0 72 72" fill="none" style={{ flexShrink:0 }}>
    <rect x="14" y="8" width="44" height="56" rx="6" fill="#c7d2fe" opacity="0.5"/>
    <rect x="14" y="8" width="21" height="56" rx="6" fill="#818cf8"/>
    <rect x="35" y="8" width="23" height="56" rx="6" fill="#6366f1"/>
    <rect x="34" y="8" width="3" height="56" fill="#4338ca"/>
    <line x1="20" y1="22" x2="32" y2="22" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="20" y1="30" x2="32" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="20" y1="38" x2="32" y2="38" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="20" y1="46" x2="28" y2="46" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
    <line x1="39" y1="22" x2="52" y2="22" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="39" y1="30" x2="52" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="39" y1="38" x2="52" y2="38" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="39" y1="46" x2="48" y2="46" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
    <path d="M14 60 Q35 54 35 54 Q35 54 58 60" stroke="#4338ca" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  </svg>
  <div style={{ flex:1, textAlign:"left" }}>
    <span style={{ display:"inline-block", background:"#ff4757", color:"#fff", fontSize:10, fontWeight:900, padding:"3px 9px", borderRadius:20, marginBottom:6 }}>🔥 HOT</span>
    <p style={{ margin:"0 0 4px", fontSize:20, fontWeight:900, color:"#1a1a2e" }}>시험문제 생성기</p>
    <p style={{ margin:0, fontSize:13, color:"#444", fontWeight:700 }}>교재 사진 찍으면 AI가 문제 출제</p>
  </div>
  <div style={{ width:34, height:34, borderRadius:"50%", background:"#eef2ff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
  </div>
</button>

{/* 영어 학습 */}
<button onClick={()=>setShowEnglish(true)} style={{ background:"#fff", borderRadius:22, border:"2.5px solid #3b82f6", boxShadow:"0 4px 20px rgba(59,130,246,0.13)", cursor:"pointer", padding:"22px 20px", display:"flex", alignItems:"center", gap:18, transition:"transform 0.15s", fontFamily:"inherit", width:"100%" }}
  onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e=>e.currentTarget.style.transform="translateY(0)"}>
  <svg width="68" height="68" viewBox="0 0 72 72" fill="none" style={{ flexShrink:0 }}>
    <circle cx="36" cy="36" r="28" fill="#bfdbfe" opacity="0.5"/>
    <circle cx="36" cy="36" r="28" stroke="#3b82f6" strokeWidth="2.5" fill="none"/>
    <ellipse cx="36" cy="36" rx="12" ry="28" stroke="#3b82f6" strokeWidth="2.5" fill="none"/>
    <line x1="8" y1="36" x2="64" y2="36" stroke="#3b82f6" strokeWidth="2" opacity="0.5"/>
    <line x1="11" y1="24" x2="61" y2="24" stroke="#3b82f6" strokeWidth="1.5" opacity="0.4"/>
    <line x1="11" y1="48" x2="61" y2="48" stroke="#3b82f6" strokeWidth="1.5" opacity="0.4"/>
    <text x="36" y="43" fontFamily="Georgia, serif" fontSize="22" fontWeight="900" fill="#1d4ed8" textAnchor="middle">A</text>
  </svg>
  <div style={{ flex:1, textAlign:"left" }}>
    <p style={{ margin:"0 0 4px", fontSize:20, fontWeight:900, color:"#1a1a2e" }}>영어 학습</p>
    <p style={{ margin:0, fontSize:13, color:"#444", fontWeight:700 }}>단어·문법·회화 AI 맞춤 학습</p>
  </div>
  <div style={{ width:34, height:34, borderRadius:"50%", background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
  </div>
</button>
        </div>

        {/* 하단 태그 */}
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:22, flexWrap:"wrap" }} className="fade-up">
          {["📷 교재 사진 분석","🤖 AI 문제 출제","🇺🇸 영어 회화·문법","⭐ 나만의 단어장"].map(tag => (
            <span key={tag} style={{ background:"#fff", border:"1px solid #e8e9ef", borderRadius:20, padding:"7px 14px", fontSize:12, color:"#555", fontWeight:600 }}>{tag}</span>
          ))}
        </div>

      </div>
    </div>
  </div>
);

  return (
    <div style={{ minHeight:"100vh", background:"#f5f6fa", fontFamily:"'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif", paddingBottom: 40 }}>
      <style>{CSS}</style>
      <input ref={galleryInputRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleGalleryChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={handleCameraChange} />

      {/* 헤더 */}
      <div style={{ background:"#fff", borderBottom:"1px solid #f0f0f5", padding:"16px 20px 14px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:640, margin:"0 auto", display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>{ setShowHome(true); setStep("upload"); setUploadedImages([]); setTextInput(""); setQuizData(null); setError(null); }} style={{ width:36, height:36, borderRadius:10, border:"1.5px solid #e8e9ef", background:"#fff", cursor:"pointer", fontSize:18, flexShrink:0 }}>←</button>
          <div style={{ width:38, height:38, borderRadius:12, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📖</div>
          <div>
            <h1 style={{ margin:0, fontSize:17, fontWeight:800, color:"#1a1a2e" }}>시험 문제 생성기</h1>
            <p style={{ margin:0, fontSize:11, color:"#999" }}>AI가 맞춤 문제를 만들어드려요</p>
          </div>
          {/* 스텝 인디케이터 */}
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
            {["upload","config","result"].map((s,i) => (
              <div key={s} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", background: step===s?"#6366f1":(["upload","config","result"].indexOf(step)>i?"#c7d2fe":"#e8e9ef"), color: step===s?"#fff":(["upload","config","result"].indexOf(step)>i?"#6366f1":"#bbb"), fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s" }}>{i+1}</div>
                {i<2 && <div style={{ width:16, height:2, background:["upload","config","result"].indexOf(step)>i?"#c7d2fe":"#e8e9ef", borderRadius:2 }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:640, margin:"0 auto", padding:"16px 16px 0" }}>

        {/* ── STEP 1: UPLOAD ── */}
        {step==="upload" && (
          <div className="fade-up">
            <div style={{ textAlign:"center", padding:"24px 0 20px", position:"relative" }}>
              <div style={{ fontSize:52, marginBottom:8 }}>📚</div>
              <h2 style={{ margin:"0 0 6px", fontSize:22, fontWeight:900, color:"#1a1a2e" }}>학습 자료를 올려주세요</h2>
              <p style={{ margin:0, fontSize:13, color:"#999" }}>사진, 갤러리, 텍스트 중 하나 또는 여러 개를 선택하세요</p>
            </div>

            {/* 카메라 */}
            <button onClick={() => cameraInputRef.current?.click()} style={{ width:"100%", padding:"18px 20px", borderRadius:20, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", display:"flex", alignItems:"center", gap:16, cursor:"pointer", marginBottom:10, boxShadow:"0 4px 20px rgba(99,102,241,0.3)", textAlign:"left" }}>
              <div style={{ width:48, height:48, borderRadius:14, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>📷</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:16, fontWeight:800 }}>카메라로 직접 찍기</p>
                <p style={{ margin:"3px 0 0", fontSize:12, opacity:0.8 }}>교재·문제집을 바로 촬영</p>
              </div>
              <span style={{ fontSize:20, opacity:0.6 }}>›</span>
            </button>

            {/* 갤러리 */}
            <button onClick={() => galleryInputRef.current?.click()} style={{ width:"100%", padding:"18px 20px", borderRadius:20, border:"2px solid #e8e9ef", background:"#fff", color:"#333", display:"flex", alignItems:"center", gap:16, cursor:"pointer", marginBottom:10, textAlign:"left" }}>
              <div style={{ width:48, height:48, borderRadius:14, background:"#f0f0f8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>🖼️</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:16, fontWeight:800, color:"#1a1a2e" }}>갤러리에서 선택</p>
                <p style={{ margin:"3px 0 0", fontSize:12, color:"#999" }}>여러 장 동시 선택 (최대 {MAX_IMAGES}장)</p>
              </div>
              <span style={{ fontSize:20, color:"#ccc" }}>›</span>
            </button>

            {/* 텍스트 입력 토글 */}
            <button onClick={() => setShowTextInput(v=>!v)} style={{ width:"100%", padding:"18px 20px", borderRadius:20, border:`2px solid ${showTextInput?"#6366f1":"#e8e9ef"}`, background: showTextInput?"#f5f3ff":"#fff", color:"#333", display:"flex", alignItems:"center", gap:16, cursor:"pointer", marginBottom:10, textAlign:"left" }}>
              <div style={{ width:48, height:48, borderRadius:14, background: showTextInput?"#e0e7ff":"#f0f0f8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>✏️</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:16, fontWeight:800, color:"#1a1a2e" }}>텍스트 붙여넣기</p>
                <p style={{ margin:"3px 0 0", fontSize:12, color:"#999" }}>노트 내용 복사해서 붙여넣기</p>
              </div>
              <span style={{ fontSize:18, color: showTextInput?"#6366f1":"#ccc", transition:"transform 0.2s", display:"inline-block", transform: showTextInput?"rotate(90deg)":"none" }}>›</span>
            </button>

            {showTextInput && (
              <div className="card" style={{ marginBottom:10 }}>
                <textarea value={textInput} onChange={e=>setTextInput(e.target.value)}
                  placeholder={"아이패드 노트 내용을 복사해서 붙여넣거나 직접 입력하세요\n\n예시)\n수소 - 가장 가볍다, 가연성\n헬륨 - 두번째로 가볍다, 음성변조"}
                  style={{ width:"100%", minHeight:140, background:"#f8f8fc", borderRadius:12, border:"1.5px solid #e8e9ef", padding:"12px 14px", color:"#333", fontSize:14, resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", lineHeight:1.6, outline:"none" }} />
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
                  <span style={{ color:"#bbb", fontSize:12 }}>{textInput.length}자</span>
                  {textInput && <button onClick={()=>setTextInput("")} style={{ background:"none", border:"none", color:"#ef4444", fontSize:12, cursor:"pointer" }}>전체 지우기</button>}
                </div>
              </div>
            )}

            {/* PC 드롭존 */}
            <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
              style={{ padding:16, borderRadius:16, textAlign:"center", border:`2px dashed ${dragOver?"#6366f1":"#dde"}`, background: dragOver?"#f5f3ff":"transparent", color: dragOver?"#6366f1":"#bbb", fontSize:12, transition:"all 0.2s", marginBottom:10 }}>
              🖥️ PC에서는 이미지를 여기에 끌어다 놓으세요
            </div>

            {/* 업로드된 이미지 */}
            {uploadedImages.length > 0 && (
              <div className="card">
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"#6366f1" }}>📷 {uploadedImages.length}/{MAX_IMAGES}장 선택됨</span>
                  {uploadedImages.length < MAX_IMAGES && <button onClick={()=>galleryInputRef.current?.click()} style={{ background:"#f0f0f8", border:"none", color:"#6366f1", borderRadius:8, padding:"4px 10px", fontSize:12, cursor:"pointer", fontWeight:700 }}>+ 추가</button>}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {uploadedImages.map((img,idx) => (
                    <div key={idx} style={{ position:"relative" }}>
                      <img src={img.url} alt="" style={{ width:64, height:64, objectFit:"cover", borderRadius:12, border:"2px solid #e8e9ef" }} />
                      <button onClick={()=>removeImage(idx)} style={{ position:"absolute", top:-6, right:-6, width:20, height:20, borderRadius:"50%", background:"#ef4444", border:"2px solid #fff", color:"#fff", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 입력 요약 + 다음 버튼 */}
            {hasContent && (
              <div className="card" style={{ background:"linear-gradient(135deg,#f5f3ff,#ede9fe)", border:"1.5px solid #c7d2fe" }}>
                <p style={{ margin:"0 0 8px", fontSize:12, color:"#6366f1", fontWeight:700 }}>✅ 출제 범위</p>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
                  {hasImages && <span className="chip" style={{ background:"#e0e7ff", color:"#6366f1" }}>📷 이미지 {uploadedImages.length}장</span>}
                  {hasText && <span className="chip" style={{ background:"#e0e7ff", color:"#6366f1" }}>✏️ 텍스트 {textInput.length}자</span>}
                  {hasImages && hasText && <span style={{ color:"#8b5cf6", fontSize:11, alignSelf:"center" }}>← 모두 범위로 출제!</span>}
                </div>
                <button className="btn-primary" onClick={()=>setStep("config")}>다음 단계 →</button>
              </div>
            )}

            {error && <div style={{ background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:14, padding:"12px 16px", color:"#ef4444", fontSize:13, marginTop:8 }}>⚠️ {error}</div>}
          </div>
        )}

        {/* ── STEP 2: CONFIG ── */}
        {step==="config" && (
          <div className="fade-up">
            {/* 범위 미리보기 */}
            <div className="card" style={{ background:"linear-gradient(135deg,#f5f3ff,#ede9fe)", border:"1.5px solid #c7d2fe", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 6px", fontSize:12, color:"#6366f1", fontWeight:700 }}>출제 범위: {getSourceLabel()}</p>
                {hasImages && <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {uploadedImages.map((img,idx) => <img key={idx} src={img.url} alt="" style={{ width:44, height:44, objectFit:"cover", borderRadius:8, border:"1.5px solid #c7d2fe" }} />)}
                </div>}
                {hasText && <p style={{ margin:"4px 0 0", fontSize:12, color:"#7c3aed", background:"rgba(255,255,255,0.6)", padding:"6px 8px", borderRadius:8 }}>{textInput.slice(0,60)}{textInput.length>60?"...":""}</p>}
              </div>
              <button onClick={()=>setStep("upload")} style={{ background:"rgba(255,255,255,0.7)", border:"none", color:"#6366f1", borderRadius:10, padding:"6px 12px", fontSize:12, cursor:"pointer", fontWeight:700 }}>변경</button>
            </div>

            {/* 출제 범위 설정 */}
            <div className="card">
              <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1a1a2e" }}>📎 출제 범위 설정</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {SCOPE_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={()=>setScope(opt.id)} className={`option-btn${scope===opt.id?" selected":""}`}>
                    <span style={{ fontSize:20 }}>{opt.emoji}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontSize:14, fontWeight:scope===opt.id?700:500 }}>{opt.label}</p>
                      <p style={{ margin:"2px 0 0", fontSize:11, color:"#999" }}>{opt.desc}</p>
                    </div>
                    {scope===opt.id && <span style={{ color:"#6366f1", fontSize:16 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* 학년 */}
            <div className="card">
              <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1a1a2e" }}>🎓 학년 선택</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {GRADES.map(g => <button key={g.label} onClick={()=>setGrade(g.label)} className={`tag-btn${grade===g.label?" active":""}`}>{g.label}</button>)}
              </div>
            </div>

            {/* 과목 */}
            <div className="card">
              <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1a1a2e" }}>📝 과목 선택</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {SUBJECTS.map(s => <button key={s} onClick={()=>setSubject(s)} className={`tag-btn${subject===s?" active":""}`}>{s}</button>)}
              </div>
            </div>

            {/* 영어 형식 */}
            {subject==="영어" && (
              <div className="card" style={{ border:"1.5px solid #bfdbfe" }}>
                <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1a1a2e" }}>🇺🇸 영어 문제 형식</p>
                <div style={{ display:"flex", gap:8 }}>
                  {ENGLISH_TYPES.map(t => (
                    <button key={t.id} onClick={()=>setEnglishType(t.id)} style={{ flex:1, padding:"12px 8px", borderRadius:14, border:`2px solid ${englishType===t.id?"#3b82f6":"#e8e9ef"}`, background: englishType===t.id?"#eff6ff":"#fff", color: englishType===t.id?"#3b82f6":"#666", cursor:"pointer", textAlign:"center", transition:"all 0.15s", fontFamily:"inherit" }}>
                      <div style={{ fontSize:13, fontWeight: englishType===t.id?800:500 }}>{t.label}</div>
                      <div style={{ fontSize:11, marginTop:3, color:"#999" }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 난이도 */}
            <div className="card">
              <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1a1a2e" }}>⚡ 난이도</p>
              <div style={{ display:"flex", gap:8 }}>
                {Object.entries(DIFFICULTY_CONFIG).map(([key,val]) => (
                  <button key={key} onClick={()=>setDifficulty(key)} style={{ flex:1, padding:"14px 8px", borderRadius:16, border:`2px solid ${difficulty===key?val.color:"#e8e9ef"}`, background: difficulty===key?val.bg:"#fff", color: difficulty===key?val.color:"#888", cursor:"pointer", textAlign:"center", transition:"all 0.15s", fontFamily:"inherit" }}>
                    <div style={{ fontSize:26, marginBottom:4 }}>{val.emoji}</div>
                    <div style={{ fontSize:13, fontWeight:800 }}>{val.label}</div>
                    <div style={{ fontSize:10, marginTop:2, opacity:0.7 }}>{val.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 문제 수 */}
            <div className="card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1a1a2e" }}>📋 문제 수</p>
                <span style={{ fontSize:20, fontWeight:900, color:"#6366f1" }}>{questionCount}개</span>
              </div>
              <input type="range" min={3} max={30} value={questionCount} onChange={e=>setQuestionCount(Number(e.target.value))} style={{ width:"100%", accentColor:"#6366f1" }} />
              <div style={{ display:"flex", justifyContent:"space-between", color:"#bbb", fontSize:11, marginTop:4 }}><span>3개</span><span>30개</span></div>
              {questionCount >= 20 && <p style={{ margin:"8px 0 0", fontSize:11, color:"#f59e0b", background:"#fffbeb", padding:"6px 10px", borderRadius:8 }}>⏱ 20개 이상은 생성에 30~60초 소요될 수 있어요</p>}
            </div>

            {error && <div style={{ background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:14, padding:"12px 16px", color:"#ef4444", fontSize:13, marginBottom:12 }}>⚠️ {error}</div>}
            <button className="btn-primary" onClick={generateQuiz} style={{ marginBottom:8 }}>✨ AI 문제 생성하기 ({getSourceLabel()})</button>
          </div>
        )}

        {/* ── LOADING ── */}
        {step==="loading" && (
          <div style={{ textAlign:"center", padding:"60px 24px" }} className="fade-up">
            <style>{`
              @keyframes dogBounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-18px)} }
              @keyframes dogShake { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
              @keyframes pencilMove { 0%,100%{transform:translateX(0) rotate(-25deg)} 50%{transform:translateX(16px) rotate(-25deg)} }
              @keyframes paperFloat { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-8px) rotate(2deg)} }
              @keyframes bubble { 0%,100%{opacity:0;transform:scale(0.85) translateY(5px)} 15%,80%{opacity:1;transform:scale(1) translateY(0)} }
              @keyframes dotBounce { 0%,80%,100%{transform:translateY(0);opacity:0.35} 40%{transform:translateY(-10px);opacity:1} }
              @keyframes shadowAnim { 0%,100%{transform:scaleX(1);opacity:0.12} 50%{transform:scaleX(0.65);opacity:0.06} }
            `}</style>

            {/* 말풍선 */}
            <div style={{ display:"inline-block", position:"relative", marginBottom:16, animation:"bubble 3s ease-in-out infinite" }}>
              <div style={{ background:"#fff", border:"2.5px solid #fde68a", borderRadius:20, padding:"12px 22px", boxShadow:"0 6px 20px rgba(251,191,36,0.2)" }}>
                <p style={{ margin:0, fontSize:15, fontWeight:900, color:"#d97706" }}>문제 열심히 만드는 중! ✍️</p>
                <p style={{ margin:"3px 0 0", fontSize:12, color:"#aaa" }}>잠깐만 기다려줘 멍멍 🐾</p>
              </div>
              <div style={{ position:"absolute", bottom:-13, left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"11px solid transparent", borderRight:"11px solid transparent", borderTop:"14px solid #fde68a" }} />
              <div style={{ position:"absolute", bottom:-10, left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"9px solid transparent", borderRight:"9px solid transparent", borderTop:"11px solid #fff" }} />
            </div>

            {/* 강아지 이미지 + 소품 */}
            <div style={{ position:"relative", width:220, height:220, margin:"0 auto 16px" }}>

              {/* 종이 */}
              <div style={{ position:"absolute", bottom:8, left:0, width:52, height:62, background:"#fff", borderRadius:10, border:"2px solid #fde68a", animation:"paperFloat 2s ease-in-out infinite", boxShadow:"0 4px 14px rgba(251,191,36,0.15)", zIndex:1 }}>
                {[0,1,2,3].map(i => <div key={i} style={{ height:2.5, background:"#fde68a", margin:"10px 7px 0", borderRadius:3 }} />)}
              </div>

              {/* 연필 */}
              <div style={{ position:"absolute", bottom:40, right:0, animation:"pencilMove 1.1s ease-in-out infinite", transformOrigin:"bottom center", zIndex:1 }}>
                <div style={{ width:9, height:8, background:"#fda4af", borderRadius:"3px 3px 0 0", margin:"0 auto" }} />
                <div style={{ width:9, height:46, background:"linear-gradient(180deg,#fbbf24,#f59e0b)", position:"relative" }}>
                  <div style={{ position:"absolute", top:0, left:0, width:"100%", height:8, background:"rgba(180,180,180,0.5)" }} />
                  <div style={{ position:"absolute", bottom:-10, left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"4.5px solid transparent", borderRight:"4.5px solid transparent", borderTop:"11px solid #92400e" }} />
                </div>
              </div>

              {/* 강아지 실제 사진 */}
              <div style={{ position:"absolute", bottom:0, left:"50%", animation:"dogBounce 1.3s ease-in-out infinite", zIndex:2 }}>
                <img
                  src="/dog.jpg"
                  alt="비솜"
                  style={{ width:150, height:150, objectFit:"cover", borderRadius:"50%", border:"5px solid #fff", boxShadow:"0 10px 30px rgba(0,0,0,0.15)", display:"block", animation:"dogShake 2.6s ease-in-out infinite" }}
                />
                {/* 그림자 */}
                <div style={{ width:120, height:12, background:"rgba(0,0,0,0.08)", borderRadius:"50%", margin:"4px auto 0", animation:"shadowAnim 1.3s ease-in-out infinite", filter:"blur(3px)" }} />
              </div>
            </div>

            {/* 이름 태그 */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#fff", border:"2px solid #fde68a", borderRadius:20, padding:"6px 16px", marginBottom:12, boxShadow:"0 2px 8px rgba(251,191,36,0.2)" }}>
              <span style={{ fontSize:14 }}>🐾</span>
              <span style={{ fontSize:13, fontWeight:800, color:"#d97706" }}>비솜이가 문제 출제 중</span>
              <span style={{ fontSize:14 }}>🐾</span>
            </div>

            <p style={{ margin:"0 0 20px", fontSize:13, color:"#bbb" }}>{getSourceLabel()} 열심히 분석하고 있어요~</p>

            {/* 로딩 도트 */}
            <div style={{ display:"flex", justifyContent:"center", gap:7 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:11, height:11, borderRadius:"50%", background:"#fbbf24", animation:"dotBounce 1.2s ease-in-out infinite", animationDelay:`${i*0.18}s` }} />
              ))}
            </div>
            {questionCount >= 20 && <p style={{ margin:"16px 0 0", fontSize:12, color:"#f59e0b", background:"#fffbeb", padding:"8px 14px", borderRadius:10, display:"inline-block" }}>☕ 문제가 많아서 조금 더 걸릴 수 있어요!</p>}
          </div>
        )}

        {/* ── STEP 3: RESULT ── */}
        {step==="result" && quizData && (
          <div className="fade-up">
            {/* 주제 카드 */}
            <div className="card" style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", marginBottom:12 }}>
              <p style={{ margin:"0 0 4px", fontSize:12, opacity:0.8 }}>출제 범위: {getSourceLabel()}</p>
              <p style={{ margin:"0 0 12px", fontSize:18, fontWeight:900 }}>{quizData.topic}</p>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <span className="chip" style={{ background:"rgba(255,255,255,0.2)", color:"#fff" }}>{grade}</span>
                <span className="chip" style={{ background:"rgba(255,255,255,0.2)", color:"#fff" }}>{subject}</span>
                <span className="chip" style={{ background:"rgba(255,255,255,0.2)", color:"#fff" }}>{diff.emoji} {diff.label}</span>
              </div>
            </div>

            {/* 인식 불가 이미지 경고 */}
            {badImages.length > 0 && (
              <div style={{ background:"#fffbeb", border:"1.5px solid #fde68a", borderRadius:16, padding:"14px 16px", marginBottom:12 }}>
                <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:700, color:"#d97706" }}>⚠️ {badImages.length}번 이미지를 인식하지 못해 제외했어요</p>
                <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                  {badImages.map(i => (
                    <div key={i} style={{ position:"relative" }}>
                      <img src={uploadedImages[i]?.url} alt="" style={{ width:48, height:48, objectFit:"cover", borderRadius:10, opacity:0.5, border:"2px solid #fbbf24" }} />
                      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.3)", borderRadius:10, color:"#fff", fontSize:18 }}>✕</div>
                    </div>
                  ))}
                </div>
                <p style={{ margin:0, fontSize:12, color:"#92400e" }}>더 밝고 선명하게 다시 찍어주세요</p>
              </div>
            )}

            {/* 점수 카드 */}
            {showAnswers && score && (
              <div className="card" style={{ background:"linear-gradient(135deg,#ecfdf5,#d1fae5)", border:"1.5px solid #6ee7b7", marginBottom:12 }}>
                {score.total > 0 && (
                  <div style={{ textAlign:"center", marginBottom: quizData.questions.filter(q=>q.type==="서술형"||q.type==="단답형").length > 0 ? 14 : 0, paddingBottom: quizData.questions.filter(q=>q.type==="서술형"||q.type==="단답형").length > 0 ? 14 : 0, borderBottom: quizData.questions.filter(q=>q.type==="서술형"||q.type==="단답형").length > 0 ? "1px solid #a7f3d0" : "none" }}>
                    <p style={{ margin:"0 0 2px", fontSize:12, color:"#059669", fontWeight:700 }}>객관식</p>
                    <p style={{ margin:"0 0 2px", fontSize:36, fontWeight:900, color:"#059669" }}>{score.correct} / {score.total}</p>
                    <p style={{ margin:0, fontSize:13, color:"#34d399" }}>{Math.round(score.correct/score.total*100)}%</p>
                  </div>
                )}
                {quizData.questions.filter(q=>q.type==="서술형"||q.type==="단답형").length > 0 && (
                  <div>
                    <p style={{ margin:"0 0 10px", fontSize:12, color:"#059669", fontWeight:700, textAlign:"center" }}>서술형</p>
                    {quizData.questions.filter(q=>q.type==="서술형"||q.type==="단답형").map((q,i) => {
                      const er = essayScores[q.id];
                      return (
                        <div key={q.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", borderRadius:10, background:"rgba(255,255,255,0.6)", marginBottom:6 }}>
                          <span style={{ fontSize:13, color:"#374151" }}>서술형 {i+1}번</span>
                          {gradingEssay && !er ? <span style={{ fontSize:12, color:"#f59e0b" }}>채점 중...</span>
                            : er ? <span style={{ fontSize:13, fontWeight:700, color: er.result==="정답"?"#059669":er.result==="부분정답"?"#d97706":"#ef4444" }}>{er.result} ({er.score}점)</span>
                            : <span style={{ fontSize:12, color:"#bbb" }}>미채점</span>}
                        </div>
                      );
                    })}
                    {!gradingEssay && Object.keys(essayScores).length > 0 && (
                      <div style={{ textAlign:"center", marginTop:10 }}>
                        <p style={{ margin:"0 0 2px", fontSize:22, fontWeight:900, color:"#d97706" }}>{Math.round(Object.values(essayScores).reduce((s,r)=>s+r.score,0)/Object.values(essayScores).length)}점</p>
                        <p style={{ margin:0, fontSize:12, color:"#92400e" }}>서술형 평균</p>
                      </div>
                    )}
                  </div>
                )}
                {gradingEssay && <p style={{ margin:"10px 0 0", fontSize:13, color:"#059669", textAlign:"center" }}>✨ 서술형 AI 채점 중...</p>}
              </div>
            )}

            {/* 문제 목록 */}
            {quizData.questions.map((q,idx) => {
              const myAnswer = selectedAnswers[q.id];
              const isCorrect = showAnswers && q.type==="객관식" && myAnswer === q.answer;
              const isWrong = showAnswers && q.type==="객관식" && myAnswer && myAnswer !== q.answer;
              const er = essayScores[q.id];
              return (
                <div key={q.id} className="card" style={{ border:`1.5px solid ${isCorrect?"#6ee7b7":isWrong?"#fca5a5":"#f0f0f5"}`, background: isCorrect?"#f0fdf4":isWrong?"#fff5f5":"#fff" }}>
                  <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
                    <span style={{ background:"#6366f1", color:"#fff", borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:800 }}>Q{idx+1}</span>
                    <span style={{ background:"#f1f2f6", color:"#666", borderRadius:6, padding:"3px 8px", fontSize:11 }}>{q.type}</span>
                    {showAnswers && q.type==="객관식" && <span style={{ background: isCorrect?"#d1fae5":"#fee2e2", color: isCorrect?"#059669":"#ef4444", borderRadius:6, padding:"3px 8px", fontSize:11, fontWeight:700 }}>{isCorrect?"✓ 정답":"✗ 오답"}</span>}
                    {showAnswers && er && <span style={{ background: er.result==="정답"?"#d1fae5":er.result==="부분정답"?"#fef3c7":"#fee2e2", color: er.result==="정답"?"#059669":er.result==="부분정답"?"#d97706":"#ef4444", borderRadius:6, padding:"3px 8px", fontSize:11, fontWeight:700 }}>{er.result} ({er.score}점)</span>}
                  </div>
                  <p style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:"#1a1a2e", lineHeight:1.6 }}>{q.question}</p>

                  {q.type==="객관식" && q.options && (
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {q.options.map((opt,oi) => {
                        const isSelected = myAnswer===opt;
                        const isAnswer = showAnswers && opt===q.answer;
                        const isMyWrong = showAnswers && isSelected && !isAnswer;
                        return (
                          <button key={oi} className={`option-btn${isAnswer?" correct":isMyWrong?" wrong":isSelected?" selected":""}`} onClick={()=>handleSelectAnswer(q.id,opt)} style={{ cursor: showAnswers?"default":"pointer" }}>
                            <span style={{ flex:1 }}>{opt}</span>
                            {isAnswer && showAnswers && <span style={{ fontSize:11, color:"#059669", fontWeight:800 }}>✓ 정답</span>}
                            {isMyWrong && <span style={{ fontSize:11, color:"#ef4444", fontWeight:800 }}>← 내 선택</span>}
                          </button>
                        );
                      })}
                      {showAnswers && myAnswer && myAnswer!==q.answer && (
                        <div style={{ padding:"10px 14px", borderRadius:12, background:"#fff5f5", border:"1px solid #fecaca", fontSize:13 }}>
                          <span style={{ color:"#ef4444" }}>내가 선택: </span><span style={{ color:"#dc2626", fontWeight:700 }}>{myAnswer}</span>
                          <span style={{ color:"#bbb", margin:"0 8px" }}>→</span>
                          <span style={{ color:"#059669" }}>정답: </span><span style={{ color:"#059669", fontWeight:700 }}>{q.answer}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {(q.type==="단답형"||q.type==="서술형") && (
                    <div>
                      <textarea disabled={showAnswers} value={myAnswer||""} onChange={e=>handleSelectAnswer(q.id,e.target.value)} placeholder="여기에 답을 써보세요 ✏️"
                        style={{ width:"100%", minHeight:80, background: showAnswers?"#f8f8fc":"#fff", borderRadius:12, border:"1.5px solid #e8e9ef", padding:"12px 14px", color:"#333", fontSize:14, resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", outline:"none" }} />
                      {showAnswers && <div style={{ marginTop:10, padding:"12px 14px", borderRadius:12, background:"#ecfdf5", border:"1px solid #6ee7b7" }}>
                        <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:"#059669" }}>✅ 모범 답안</p>
                        <p style={{ margin:0, fontSize:14, color:"#065f46" }}>{q.answer}</p>
                      </div>}
                      {showAnswers && er && <div style={{ marginTop:8, padding:"12px 14px", borderRadius:12, background: er.result==="정답"?"#ecfdf5":er.result==="부분정답"?"#fffbeb":"#fef2f2", border:`1px solid ${er.result==="정답"?"#6ee7b7":er.result==="부분정답"?"#fde68a":"#fecaca"}` }}>
                        <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color: er.result==="정답"?"#059669":er.result==="부분정답"?"#d97706":"#ef4444" }}>AI 채점: {er.result} ({er.score}점)</p>
                        <p style={{ margin:0, fontSize:13, color:"#374151" }}>{er.feedback}</p>
                      </div>}
                    </div>
                  )}

                  {showAnswers && <div style={{ marginTop:12, padding:"12px 14px", borderRadius:12, background:"#f5f3ff", border:"1px solid #ddd6fe" }}>
                    <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:"#6366f1" }}>💡 해설</p>
                    <p style={{ margin:0, fontSize:13, color:"#374151", lineHeight:1.6 }}>{q.explanation}</p>
                  </div>}
                </div>
              );
            })}

            {/* 액션 버튼 */}
            <div style={{ display:"flex", gap:8, paddingBottom:24 }}>
              {!showAnswers && <button onClick={handleSubmit} style={{ flex:1, padding:16, borderRadius:16, border:"none", background:"linear-gradient(135deg,#059669,#10b981)", color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 16px rgba(16,185,129,0.3)", fontFamily:"inherit" }}>📝 채점하기</button>}
              <button onClick={()=>{setStep("config");setSelectedAnswers({});setShowAnswers(false);setScore(null);setEssayScores({});}} style={{ flex:1, padding:16, borderRadius:16, border:"1.5px solid #c7d2fe", background:"#fff", color:"#6366f1", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🔄 다시 생성</button>
              <button onClick={reset} style={{ padding:"16px 20px", borderRadius:16, border:"1.5px solid #e8e9ef", background:"#fff", color:"#999", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>🏠</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
