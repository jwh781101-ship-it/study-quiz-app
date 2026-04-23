'use client';
import { useState, useRef, useCallback, useEffect } from "react";
import EnglishLearning from "./english";
import ProblemSolver from "./ProblemSolver";
import SoundPlayer from "./SoundPlayer";
import WrongNote from "./WrongNote";
import StudyStats from "./StudyStats";
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
const DIRECTION_TAGS = {
  "국어": ["주제 찾기","인물 분석","문단 요약","작가 의도","어휘 뜻","맞춤법"],
  "영어": ["영작하기","빈칸 채우기","문법 오류 찾기","해석하기","단어 뜻","동의어/반의어"],
  "수학": ["풀이과정 서술","공식 적용","계산문제","증명하기","그래프 해석","단위 변환"],
  "과학": ["특징/성질","비교하기","원소기호","계산문제","원인과결과","순서/단계"],
  "사회": ["연도/시대","원인과결과","비교하기","지도 해석","사건 순서","개념 정의"],
  "역사": ["연도/시대","인물 업적","원인과결과","사건 순서","비교하기","의의/영향"],
  "기술·가정": ["개념 정의","특징/성질","순서/단계","비교하기","원인과결과","계산문제"],
  "도덕": ["개념 정의","사례 찾기","비교하기","원인과결과","주제 찾기","인물 분석"],
  "기타": ["개념 정의","특징/성질","비교하기","원인과결과","순서/단계","계산문제"],
};

const CHARACTERS = [
  { id:"dog", src:"/dog.jpg", name:"비솜이", desc:"강아지 🐶" },
  { id:"cat", src:"/cat.png", name:"냥이", desc:"고양이 🐱" },
  { id:"bear", src:"/bear.png", name:"곰이", desc:"곰 🐻" },
  { id:"penguin", src:"/penguin.png", name:"펭귄이", desc:"펭귄 🐧" },
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
  .dir-tag { padding: 6px 12px; border-radius: 20px; border: 1.5px solid #e8e9ef; background: #f8f8fc; font-size: 12px; color: #555; cursor: pointer; font-family: inherit; font-weight: 600; transition: all 0.15s; }
  .dir-tag:hover { border-color: #6366f1; color: #6366f1; background: #eef2ff; }
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

// ========== 하단 탭바 컴포넌트 ==========
function BottomTabBar({ activeTab, onTabChange }) {
  const tabs = [
    { id: "home", label: "홈", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6366f1":"#9ca3af"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 2l9 7.5V20a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V9.5z"/>
      </svg>
    )},
    { id: "stats", label: "통계", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6366f1":"#9ca3af"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="4" height="9"/>
        <rect x="10" y="6" width="4" height="15"/>
        <rect x="17" y="9" width="4" height="12"/>
      </svg>
    )},
    { id: "wrong", label: "오답보관함", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6366f1":"#9ca3af"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="13" y2="17"/>
      </svg>
    )},
    { id: "quiz", label: "문제뽑기", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6366f1":"#9ca3af"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    )},
    { id: "settings", label: "설정", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6366f1":"#9ca3af"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    )},
  ];

  return (
    <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:520, background:"#fff", borderTop:"1px solid #eef0f5", padding:"8px 0 calc(8px + env(safe-area-inset-bottom))", display:"flex", justifyContent:"space-around", zIndex:50, boxShadow:"0 -2px 12px rgba(0,0,0,0.04)" }}>
      {tabs.map(tab => {
        const active = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={()=>onTabChange(tab.id)}
            style={{ flex:1, background:"none", border:"none", padding:"6px 0", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, fontFamily:"inherit" }}>
            {tab.icon(active)}
            <span style={{ fontSize:10.5, fontWeight: active?800:600, color: active?"#6366f1":"#9ca3af" }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
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
  const [direction, setDirection] = useState("");
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
  const [showSolver, setShowSolver] = useState(false);
  const [showWrongNote, setShowWrongNote] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [dday, setDday] = useState(null);
  const [ddayLabel, setDdayLabel] = useState('');
  const [showDdayPicker, setShowDdayPicker] = useState(false);
  const [showHome, setShowHome] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [usage, setUsage] = useState({ plan:'guest', used:0, limit:999, canUse:true });
  const [character, setCharacter] = useState("dog");
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const galleryInputRef = useRef();
  const cameraInputRef = useRef();

  useEffect(() => {
    // localStorage에서 캐릭터 불러오기
    const timer = setTimeout(() => setShowSplash(false), 3500);
    const saved = localStorage.getItem('character');
    if (saved) setCharacter(saved);
    const savedDday = localStorage.getItem('dday');
    const savedDdayLabel = localStorage.getItem('ddayLabel');
    if (savedDday) setDday(savedDday);
    if (savedDdayLabel) setDdayLabel(savedDdayLabel);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      checkUsage(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      checkUsage(session?.user ?? null);
    });
    return () => { subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  const selectCharacter = (id) => {
    setCharacter(id);
    localStorage.setItem('character', id);
    setShowCharacterPicker(false);
  };

  const currentChar = CHARACTERS.find(c => c.id === character) || CHARACTERS[0];

const getDdayCount = () => {
  if (!dday) return null;
  const today = new Date();
  today.setHours(0,0,0,0);
  const target = new Date(dday);
  target.setHours(0,0,0,0);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  return diff;
};

const saveDday = (date, label) => {
  setDday(date);
  setDdayLabel(label);
  localStorage.setItem('dday', date);
  localStorage.setItem('ddayLabel', label);
  setShowDdayPicker(false);
};

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

  const addDirectionTag = (tag) => {
    const text = `${tag} 위주로 출제해줘`;
    setDirection(prev => prev ? `${prev}, ${text}` : text);
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
    const directionSection = direction.trim() ? `\n\n[출제 방향 - 최우선 적용]\n${direction.trim()}\n반드시 위 방향에 맞게 문제를 출제하세요.` : "";
    return `당신은 대한민국 교육부 공식 출제위원이자 20년 경력의 ${subject} 전문 출제자입니다.\n\n[중요] 이미지가 다소 흐리거나 기울어져 있어도 절대 포기하지 말고 최대한 내용을 파악해서 문제를 출제하세요.\n\n[출제 대상]\n- 학년: ${gradeInfo.full}\n- 과목: ${subject}\n- 난이도: ${diff.label} (${diff.prompt})\n- 문제 수: ${questionCount}개\n\n[출제 범위]\n${scopeText}${textSection}${directionSection}\n\n[출제 원칙]\n1. 정답은 반드시 1개만 존재해야 합니다.\n2. 객관식 정답 위치를 ①②③④⑤ 중 랜덤하게 배치하세요.\n3. 문제 순서를 전체 범위에서 골고루 랜덤하게 배치하세요.\n4. 해설에는 정답 이유 + 오답 이유를 명확히 설명하세요.\n${subject === "영어" ? `\n[영어 유형]\n${typeGuide}` : ""}\n\n반드시 JSON 형식으로만 응답:\n{"topic":"학습주제","questions":[{"id":1,"type":"객관식","question":"문제","options":["① 내용","② 내용","③ 내용","④ 내용","⑤ 내용"],"answer":"③ 내용","explanation":"해설"},{"id":2,"type":"서술형","question":"문제","options":null,"answer":"답","explanation":"해설"}]}`;
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
    await checkUsage(user);
    if (!usage.canUse) {
      const msg = user
        ? `오늘 사용 한도(${usage.limit}회)를 초과했어요.`
        : `비회원은 하루 ${usage.limit}회까지 사용 가능해요.`;
      setError(msg);
      return;
    }
    setStep("loading"); setError(null); setSelectedAnswers({}); setShowAnswers(false); setScore(null); setEssayScores({}); setBadImages([]);
    try {
      const prompt = buildPrompt();
      const data = await callAPI(uploadedImages, prompt);
      if (!data.error && data.questions?.length > 0) {
        let qs = data.questions.map(q => { try { return shuffleOptions(q); } catch(e) { return q; } });
        for (let i = qs.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [qs[i],qs[j]]=[qs[j],qs[i]]; }
        setQuizData({ ...data, questions: qs }); setStep("result"); incrementUsage(); return;
      }
      if (uploadedImages.length > 1) {
        const diagPrompt = `아래 이미지들 중 학습 자료로 인식할 수 없는 이미지 번호를 찾아주세요.\n반드시 JSON만 응답: {"bad_indices":[문제번호들],"reason":"이유"}`;
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

// 오답 자동 저장
const wrongQuestions = quizData.questions.filter(q =>
  q.type === "객관식" && selectedAnswers[q.id] !== q.answer
);
if (wrongQuestions.length > 0) {
  const saved = JSON.parse(localStorage.getItem('wrongNote') || '[]');
  const newItems = wrongQuestions.map(q => ({
    id: Date.now() + Math.random(),
    date: new Date().toLocaleDateString('ko-KR'),
    subject,
    grade,
    question: q.question,
    options: q.options,
    answer: q.answer,
    myAnswer: selectedAnswers[q.id],
    explanation: q.explanation,
  }));
  localStorage.setItem('wrongNote', JSON.stringify([...newItems, ...saved].slice(0, 100)));

// 학습 통계 저장
const prevStats = JSON.parse(localStorage.getItem('studyStats') || '{"totalQuiz":0,"totalCorrect":0,"totalQuestions":0,"subjectStats":{},"recentDates":[]}');
const newStats = {
  ...prevStats,
  totalQuiz: prevStats.totalQuiz + 1,
  totalCorrect: prevStats.totalCorrect + correct,
  totalQuestions: prevStats.totalQuestions + total,
  subjectStats: {
    ...prevStats.subjectStats,
    [subject]: {
      total: (prevStats.subjectStats[subject]?.total || 0) + total,
      correct: (prevStats.subjectStats[subject]?.correct || 0) + correct,
    }
  }
};
localStorage.setItem('studyStats', JSON.stringify(newStats));
}
    for (const q of quizData.questions.filter(q => q.type === "서술형" || q.type === "단답형")) {
      if (selectedAnswers[q.id]?.trim()) await gradeEssay(q, selectedAnswers[q.id]);
      else setEssayScores(prev => ({ ...prev, [q.id]: { result:"오답", score:0, feedback:"답안을 작성하지 않았습니다." } }));
    }
    setGradingEssay(false);
  };

  const reset = () => {
    setStep("upload"); setUploadedImages([]); setTextInput(""); setShowTextInput(false);
    setQuizData(null); setSelectedAnswers({}); setShowAnswers(false); setDirection("");
    setScore(null); setError(null); setEssayScores({}); setBadImages([]); setShowHome(true);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const diff = DIFFICULTY_CONFIG[difficulty];

  // 하단 탭바 현재 활성 탭 계산
  const getActiveTab = () => {
    if (showWrongNote) return "wrong";
    if (showStats) return "stats";
    if (!showHome) return "quiz"; // 문제뽑기 플로우
    return "home";
  };

  // 하단 탭바 클릭 핸들러
  const handleTabChange = (tabId) => {
    // 모든 서브 화면 닫기
    setShowEnglish(false);
    setShowSolver(false);
    setShowWrongNote(false);
    setShowStats(false);

    if (tabId === "home") {
      setShowHome(true);
    } else if (tabId === "stats") {
      setShowStats(true);
      setShowHome(false);
    } else if (tabId === "wrong") {
      setShowWrongNote(true);
      setShowHome(false);
    } else if (tabId === "quiz") {
      setShowHome(false);
      setStep("upload");
    } else if (tabId === "settings") {
      // 설정 탭: 아직 미구현 - 캐릭터 선택 팝업으로 대체 가능
      alert("설정 기능은 준비 중이에요! 🛠️");
    }
  };

  if (showSplash) return (
    <div style={{ position:"fixed", inset:0, background:"#ffffff", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:999 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@900&display=swap');
        @keyframes slideRight { 0%{opacity:0;transform:translateX(-40px)} 100%{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp { 0%{opacity:0;transform:translateY(16px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes lineGrow { 0%{width:0;opacity:0} 100%{width:80px;opacity:1} }
        .sp-w1 { animation: slideRight 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both; }
        .sp-w2 { animation: slideRight 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.45s both; }
        .sp-w3 { animation: slideRight 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.7s both; }
        .sp-sub { animation: fadeUp 0.5s ease 1.1s both; opacity:0; }
        .sp-line { animation: lineGrow 0.6s ease 1s both; }
      `}</style>
      <div style={{ position:"absolute", width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,#eef2ff 0%,transparent 70%)", top:"50%", left:"50%", transform:"translate(-50%,-60%)" }} />
      <div className="sp-w1" style={{ fontSize:64, fontWeight:900, color:"#6366f1", letterSpacing:2, fontFamily:"'Noto Sans KR',sans-serif", lineHeight:1.1 }}>AI</div>
      <div className="sp-w2" style={{ fontSize:48, fontWeight:900, color:"#1a1a2e", letterSpacing:8, fontFamily:"'Noto Sans KR',sans-serif", lineHeight:1.1 }}>TEST</div>
      <div className="sp-w3" style={{ fontSize:64, fontWeight:900, color:"#f59e0b", letterSpacing:2, fontFamily:"'Noto Sans KR',sans-serif", lineHeight:1.1 }}>YOU</div>
      <div className="sp-line" style={{ height:3, borderRadius:2, background:"linear-gradient(90deg,#6366f1,#f59e0b)", margin:"14px auto 0" }} />
      <div className="sp-sub" style={{ fontSize:13, color:"#9ca3af", fontWeight:600, marginTop:12, fontFamily:"'Noto Sans KR',sans-serif" }}>사진 한 장으로 시험 준비 끝</div>
    </div>
  );

  // 서브 화면들 - PC에서도 중앙 정렬 + 하단 탭바 표시
  const SubScreenWrapper = ({ children }) => (
    <div style={{ minHeight:"100vh", background:"#e8eaf0" }}>
      <div style={{ maxWidth:520, margin:"0 auto", background:"#f5f6fa", minHeight:"100vh", boxShadow:"0 0 40px rgba(0,0,0,0.08)", position:"relative" }}>
        {children}
        <div style={{ height:64 }} />
      </div>
      <BottomTabBar activeTab={getActiveTab()} onTabChange={handleTabChange} />
    </div>
  );

  if (showEnglish) return (
    <SubScreenWrapper>
      <EnglishLearning onBack={()=>{ setShowEnglish(false); setShowHome(true); }} />
    </SubScreenWrapper>
  );
  if (showSolver) return (
    <SubScreenWrapper>
      <ProblemSolver onBack={()=>{ setShowSolver(false); setShowHome(true); }} />
    </SubScreenWrapper>
  );
  if (showWrongNote) return (
    <SubScreenWrapper>
      <WrongNote onBack={()=>{ setShowWrongNote(false); setShowHome(true); }} />
    </SubScreenWrapper>
  );
  if (showStats) return (
    <SubScreenWrapper>
      <StudyStats onBack={()=>{ setShowStats(false); setShowHome(true); }} />
    </SubScreenWrapper>
  );

  // ========================================
  // 🏠 홈 화면 (새 디자인)
  // ========================================
  if (showHome) return (
    <div style={{ minHeight:"100vh", background:"#e8eaf0", fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif" }}>
      {/* PC에서는 좌우 회색 배경 + 중앙 앱 컨테이너 (모바일 느낌 유지) */}
      <div style={{ maxWidth:520, margin:"0 auto", background:"#f5f6fa", minHeight:"100vh", paddingBottom:80, boxShadow:"0 0 40px rgba(0,0,0,0.08)", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes twinkle { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes slideIn { from{transform:translateX(-20px);opacity:0} to{transform:translateX(0);opacity:1} }
        .fade-up { animation: fadeUp 0.4s ease both; }
      `}</style>

      {/* 캐릭터 선택 팝업 (기능 유지, 트리거만 숨김) */}
      {showCharacterPicker && (
        <div onClick={()=>setShowCharacterPicker(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center", animation:"fadeIn 0.2s ease" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:"24px 24px 0 0", padding:"24px 20px 40px", width:"100%", maxWidth:500 }}>
            <div style={{ width:40, height:4, background:"#e8e9ef", borderRadius:2, margin:"0 auto 20px" }} />
            <p style={{ margin:"0 0 6px", fontSize:17, fontWeight:900, color:"#1a1a2e", textAlign:"center" }}>나만의 캐릭터 선택</p>
            <p style={{ margin:"0 0 20px", fontSize:12, color:"#999", textAlign:"center" }}>클릭하면 바로 바뀌어요!</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              {CHARACTERS.map(c => (
                <button key={c.id} onClick={()=>selectCharacter(c.id)}
                  style={{ border:`2.5px solid ${character===c.id?"#6366f1":"#e8e9ef"}`, borderRadius:20, background: character===c.id?"#eef2ff":"#fff", padding:"12px 8px", cursor:"pointer", textAlign:"center", fontFamily:"inherit", transition:"all 0.15s" }}>
                  <img src={c.src} alt={c.name} style={{ width:60, height:60, borderRadius:"50%", objectFit:"cover", border:`3px solid ${character===c.id?"#6366f1":"#f0f0f5"}`, marginBottom:8, display:"block", margin:"0 auto 8px" }} />
                  <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:800, color: character===c.id?"#6366f1":"#1a1a2e" }}>{c.name}</p>
                  <p style={{ margin:0, fontSize:10, color:"#999" }}>{c.desc}</p>
                  {character===c.id && <div style={{ marginTop:6, fontSize:10, color:"#6366f1", fontWeight:700 }}>✓ 선택됨</div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* D-day 설정 팝업 */}
      {showDdayPicker && (
        <div onClick={()=>setShowDdayPicker(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:"24px 24px 0 0", padding:"24px 20px 40px", width:"100%", maxWidth:500 }}>
            <div style={{ width:40, height:4, background:"#e8e9ef", borderRadius:2, margin:"0 auto 20px" }} />
            <p style={{ margin:"0 0 20px", fontSize:17, fontWeight:900, color:"#1a1a2e", textAlign:"center" }}>🎯 D-Day 설정</p>
            <div style={{ marginBottom:16 }}>
              <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:700, color:"#555" }}>목표 이름</p>
              <input id="ddayLabelInput" defaultValue={ddayLabel} placeholder="예: 기말고사, 수능, 모의고사"
                style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:"1.5px solid #e8e9ef", fontSize:15, fontFamily:"inherit", boxSizing:"border-box", outline:"none" }} />
            </div>
            <div style={{ marginBottom:24 }}>
              <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:700, color:"#555" }}>목표 날짜</p>
              <input id="ddayDateInput" type="date" defaultValue={dday || ''}
                style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:"1.5px solid #e8e9ef", fontSize:15, fontFamily:"inherit", boxSizing:"border-box", outline:"none" }} />
            </div>
            <button onClick={()=>{
              const label = document.getElementById('ddayLabelInput').value || '목표';
              const date = document.getElementById('ddayDateInput').value;
              if (date) saveDday(date, label);
            }} style={{ width:"100%", padding:16, borderRadius:16, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"inherit", marginBottom:10 }}>
              저장하기
            </button>
            {dday && (
              <button onClick={()=>{ setDday(null); setDdayLabel(''); localStorage.removeItem('dday'); localStorage.removeItem('ddayLabel'); setShowDdayPicker(false); }}
                style={{ width:"100%", padding:12, borderRadius:16, border:"1.5px solid #e8e9ef", background:"#fff", color:"#999", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
                D-Day 초기화
              </button>
            )}
          </div>
        </div>
      )}

      {/* ====== 1. 히어로 섹션 (원본 이미지 그대로 사용) ====== */}
      <div style={{ position:"relative", width:"100%", lineHeight:0 }}>
        <img src="/hero.jpg" alt="AI 학습관리 앱 - AI가 다 해주는 시험 준비 끝!"
          style={{ width:"100%", height:"auto", display:"block" }} />
        {/* 구글 로그인 버튼 - 숨김 (나중에 display:"flex"로 바꾸면 복구) */}
        {!authLoading && !user && (
          <div style={{ display:"none" }}>
            <button onClick={signInWithGoogle}>구글로 로그인</button>
          </div>
        )}
        {!authLoading && user && (
          <div style={{ display:"none" }}>
            <img src={user.user_metadata?.avatar_url} alt="프로필" />
            <button onClick={signOut}>로그아웃</button>
          </div>
        )}
      </div>

      {/* ====== 2. D-Day 카드 (이미지 매칭) ====== */}
      <div style={{ padding:"16px 16px 0", position:"relative", zIndex:10 }}>
        {(() => {
          const count = getDdayCount();
          const hasGoal = count !== null;
          const progress = hasGoal && ddayLabel ? (() => {
            if (count <= 0) return 100;
            if (count >= 30) return 20;
            return Math.round(((30-count)/30) * 100);
          })() : 0;

          return (
            <div style={{ background:"#fff", borderRadius:18, padding:"14px 16px", boxShadow:"0 4px 16px rgba(0,0,0,0.08)", display:"flex", alignItems:"center", gap:12 }} className="fade-up">
              {/* 좌측 D-DAY 박스 (보라색) */}
              <button onClick={()=>setShowDdayPicker(true)}
                style={{ background:"#eef2ff", borderRadius:14, padding:"10px 14px", textAlign:"center", minWidth:76, flexShrink:0, border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                <p style={{ margin:0, fontSize:10, fontWeight:800, color:"#6366f1", letterSpacing:0.8, fontFamily:"Arial, sans-serif" }}>D-DAY</p>
                <p style={{ margin:"3px 0 0", fontSize:26, fontWeight:900, color:"#6366f1", lineHeight:1, fontFamily:"Arial, sans-serif" }}>
                  {hasGoal ? (count === 0 ? "D" : count < 0 ? `D+${Math.abs(count)}` : `D-${count}`) : "설정"}
                </p>
              </button>

              {/* 가운데 정보 */}
              <button onClick={()=>setShowDdayPicker(true)}
                style={{ flex:1, minWidth:0, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", textAlign:"left", padding:0 }}>
                <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:900, color:"#1a1a2e", display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:13 }}>🎯</span>
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{hasGoal ? ddayLabel : "목표 설정"}</span>
                  <span style={{ fontSize:11 }}>✏️</span>
                </p>
                <p style={{ margin:"0 0 7px", fontSize:11, color:"#999", fontWeight:500 }}>
                  {hasGoal ? new Date(dday).toLocaleDateString('ko-KR', {year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).replace(/\s/g,'').replace(/\./g,'. ').replace('. (','(') : "클릭해서 D-Day 설정"}
                </p>
                {hasGoal && (
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ flex:1, height:7, background:"#f0f0f5", borderRadius:4, overflow:"hidden" }}>
                      <div style={{ width:`${progress}%`, height:"100%", background:"linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius:4, transition:"width 0.4s" }}/>
                    </div>
                    <span style={{ fontSize:11, fontWeight:800, color:"#6366f1", minWidth:30 }}>{progress}%</span>
                  </div>
                )}
              </button>

              {/* 우측 응원 문구 */}
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <p style={{ margin:0, fontSize:10.5, color:"#999", fontWeight:500 }}>오늘도 한 걸음 더</p>
                <p style={{ margin:"3px 0 0", fontSize:12, fontWeight:900, color:"#1a1a2e" }}>목표까지 화이팅 💪</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ====== 3. 메인 기능 카드 3개 (AI 문제 뽑기 / AI 영어선생님 / 모르면 찍어봐) ====== */}
      <div style={{ padding:"14px 16px 0", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }} className="fade-up">
        {/* AI 문제 뽑기 */}
        <button onClick={()=>setShowHome(false)}
          style={{ background:"#fff", border:"none", borderRadius:16, padding:"18px 10px 16px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", cursor:"pointer", fontFamily:"inherit", textAlign:"center", position:"relative" }}>
          {/* HOT 뱃지 */}
          <div style={{ position:"absolute", top:10, right:10, background:"#ef4444", color:"#fff", fontSize:8, fontWeight:900, padding:"2px 6px", borderRadius:8, letterSpacing:0.5 }}>HOT</div>
          {/* 우상단 화살표 */}
          <div style={{ position:"absolute", top:10, right:40, color:"#cbd5e1", fontSize:12 }}>›</div>
          {/* 아이콘 */}
          <svg width="52" height="52" viewBox="0 0 60 60" fill="none" style={{ margin:"0 auto 10px", display:"block" }}>
            <rect x="8" y="6" width="44" height="48" rx="5" fill="#e0e7ff"/>
            <rect x="8" y="6" width="22" height="48" rx="5" fill="#a5b4fc"/>
            <rect x="30" y="6" width="22" height="48" rx="5" fill="#818cf8"/>
            <line x1="29" y1="6" x2="29" y2="54" stroke="#6366f1" strokeWidth="1.5"/>
            <line x1="13" y1="16" x2="25" y2="16" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="13" y1="22" x2="25" y2="22" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="13" y1="28" x2="25" y2="28" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="13" y1="34" x2="22" y2="34" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
            <line x1="34" y1="16" x2="47" y2="16" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="34" y1="22" x2="47" y2="22" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="34" y1="28" x2="47" y2="28" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="34" y1="34" x2="44" y2="34" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
          </svg>
          <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:900, color:"#1a1a2e" }}>AI 문제 뽑기</p>
          <p style={{ margin:0, fontSize:10, color:"#999", lineHeight:1.4 }}>교재 사진만 찍으면<br/>AI가 문제로 출제</p>
        </button>

        {/* AI 영어선생님 */}
        <button onClick={()=>setShowEnglish(true)}
          style={{ background:"#fff", border:"none", borderRadius:16, padding:"18px 10px 16px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", cursor:"pointer", fontFamily:"inherit", textAlign:"center", position:"relative" }}>
          <div style={{ position:"absolute", top:10, right:10, color:"#cbd5e1", fontSize:12 }}>›</div>
          <svg width="52" height="52" viewBox="0 0 60 60" fill="none" style={{ margin:"0 auto 10px", display:"block" }}>
            <circle cx="30" cy="30" r="22" fill="#dbeafe"/>
            <circle cx="30" cy="30" r="22" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
            <ellipse cx="30" cy="30" rx="10" ry="22" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
            <line x1="8" y1="30" x2="52" y2="30" stroke="#3b82f6" strokeWidth="1.3" opacity="0.6"/>
            <line x1="11" y1="20" x2="49" y2="20" stroke="#3b82f6" strokeWidth="1" opacity="0.4"/>
            <line x1="11" y1="40" x2="49" y2="40" stroke="#3b82f6" strokeWidth="1" opacity="0.4"/>
            <text x="30" y="36" fontFamily="Georgia, serif" fontSize="19" fontWeight="900" fill="#1d4ed8" textAnchor="middle">A</text>
          </svg>
          <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:900, color:"#1a1a2e" }}>AI 영어선생님</p>
          <p style={{ margin:0, fontSize:10, color:"#999", lineHeight:1.4 }}>단어·문법·회화<br/>AI 맞춤 학습</p>
        </button>

        {/* 모르면 찍어봐 */}
        <button onClick={()=>{ setShowSolver(true); setShowHome(false); }}
          style={{ background:"#fff", border:"none", borderRadius:16, padding:"18px 10px 16px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", cursor:"pointer", fontFamily:"inherit", textAlign:"center", position:"relative" }}>
          <div style={{ position:"absolute", top:10, right:10, color:"#cbd5e1", fontSize:12 }}>›</div>
          <svg width="52" height="52" viewBox="0 0 60 60" fill="none" style={{ margin:"0 auto 10px", display:"block" }}>
            <rect x="10" y="8" width="38" height="44" rx="4" fill="#d1fae5"/>
            <rect x="10" y="8" width="38" height="44" rx="4" stroke="#10b981" strokeWidth="1.5" fill="none"/>
            <line x1="17" y1="18" x2="41" y2="18" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="17" y1="25" x2="41" y2="25" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="17" y1="32" x2="32" y2="32" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
            {/* 연필 */}
            <g transform="translate(35,30) rotate(35)">
              <rect x="0" y="0" width="4" height="16" fill="#fbbf24"/>
              <rect x="0" y="0" width="4" height="3" fill="#ef4444"/>
              <polygon points="0,16 2,20 4,16" fill="#1a1a2e"/>
            </g>
          </svg>
          <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:900, color:"#1a1a2e" }}>모르면 찍어봐</p>
          <p style={{ margin:0, fontSize:10, color:"#999", lineHeight:1.4 }}>모르는 문제 찍어주면<br/>AI가 해결</p>
        </button>
      </div>

      {/* ====== 4. 서브 카드 2개 (오답보관함 / 학습 통계) ====== */}
      <div style={{ padding:"10px 16px 0", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }} className="fade-up">
        {/* 오답보관함 */}
        <button onClick={()=>{ setShowWrongNote(true); setShowHome(false); }}
          style={{ background:"#fff", border:"none", borderRadius:16, padding:"16px 14px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", cursor:"pointer", fontFamily:"inherit", textAlign:"left", display:"flex", alignItems:"center", gap:12, position:"relative" }}>
          <div style={{ position:"absolute", top:10, right:10, color:"#cbd5e1", fontSize:12 }}>›</div>
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none" style={{ flexShrink:0 }}>
            <rect x="8" y="6" width="28" height="36" rx="3" fill="#fef3c7"/>
            <rect x="8" y="6" width="28" height="36" rx="3" stroke="#f59e0b" strokeWidth="1.5" fill="none"/>
            <line x1="13" y1="15" x2="31" y2="15" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="13" y1="22" x2="31" y2="22" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="13" y1="29" x2="25" y2="29" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round"/>
            <g transform="translate(26,20) rotate(40)">
              <rect x="0" y="0" width="3" height="14" fill="#6366f1"/>
              <rect x="0" y="0" width="3" height="2.5" fill="#ef4444"/>
              <polygon points="0,14 1.5,17 3,14" fill="#1a1a2e"/>
            </g>
          </svg>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:"0 0 3px", fontSize:13, fontWeight:900, color:"#1a1a2e" }}>오답보관함</p>
            <p style={{ margin:0, fontSize:10.5, color:"#888", lineHeight:1.4 }}>틀린 문제 자동 저장<br/>복습까지 한 번에</p>
          </div>
        </button>

        {/* 학습 통계 */}
        <button onClick={()=>{ setShowStats(true); setShowHome(false); }}
          style={{ background:"#fff", border:"none", borderRadius:16, padding:"16px 14px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", cursor:"pointer", fontFamily:"inherit", textAlign:"left", display:"flex", alignItems:"center", gap:12, position:"relative" }}>
          <div style={{ position:"absolute", top:10, right:10, color:"#cbd5e1", fontSize:12 }}>›</div>
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none" style={{ flexShrink:0 }}>
            <rect x="6" y="6" width="36" height="36" rx="3" fill="#eef2ff"/>
            <rect x="6" y="6" width="36" height="36" rx="3" stroke="#6366f1" strokeWidth="1.3" fill="none"/>
            <rect x="12" y="26" width="5" height="12" fill="#10b981"/>
            <rect x="20" y="18" width="5" height="20" fill="#ef4444"/>
            <rect x="28" y="22" width="5" height="16" fill="#6366f1"/>
            <line x1="10" y1="38" x2="38" y2="38" stroke="#6366f1" strokeWidth="1.3"/>
          </svg>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:"0 0 3px", fontSize:13, fontWeight:900, color:"#1a1a2e" }}>학습 통계</p>
            <p style={{ margin:0, fontSize:10.5, color:"#888", lineHeight:1.4 }}>나의 공부 현황<br/>한눈에 분석</p>
          </div>
        </button>
      </div>

      {/* ====== 5. "시험 준비, 이제 더 똑똑하게!" 섹션 ====== */}
      <div style={{ padding:"14px 16px 0" }} className="fade-up">
        <div style={{ background:"#fff", borderRadius:16, padding:"16px 16px 14px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <p style={{ margin:"0 0 12px", fontSize:14, fontWeight:900, color:"#1a1a2e" }}>시험 준비, 이제 더 똑똑하게!</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
            {[
              { icon:"🕐", title:"시간 절약", desc:"반복 학습\n자동화" },
              { icon:"📈", title:"성적 향상", desc:"맞춤 분석으로\n약점 보완" },
              { icon:"🤖", title:"AI 맞춤 학습", desc:"나만의 학습\n플랜 제공" },
              { icon:"📚", title:"모든 과목 지원", desc:"국영수과사·\n전과목" },
            ].map((item,i) => (
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ fontSize:22, marginBottom:6 }}>{item.icon}</div>
                <p style={{ margin:"0 0 3px", fontSize:11, fontWeight:800, color:"#1a1a2e" }}>{item.title}</p>
                <p style={{ margin:0, fontSize:9.5, color:"#888", lineHeight:1.4, whiteSpace:"pre-line" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ====== 6. 메인 CTA 버튼 ====== */}
      <div style={{ padding:"14px 16px 0" }} className="fade-up">
        <button onClick={()=>setShowHome(false)}
          style={{ width:"100%", padding:"18px 20px", borderRadius:18, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:16, fontWeight:900, cursor:"pointer", boxShadow:"0 6px 20px rgba(99,102,241,0.35)", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>📷</span>
          <span>교재 찍고 AI 문제 풀어보기!</span>
          <span style={{ marginLeft:"auto", fontSize:18 }}>›</span>
        </button>
      </div>

      {/* ====== 7. 하단 안전성 뱃지 ====== */}
      <div style={{ padding:"14px 16px 10px", display:"flex", justifyContent:"space-around", gap:6, flexWrap:"nowrap", overflowX:"auto" }}>
        {[
          { icon:"🛡️", text:"안전한 데이터 관리" },
          { icon:"🚫", text:"광고 없는 쾌적한 환경" },
          { icon:"☁️", text:"언제 어디서나 동기화" },
          { icon:"⭐", text:"10만+ 학생의 선택" },
        ].map((b,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:3, fontSize:9.5, color:"#888", fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
            <span style={{ fontSize:11 }}>{b.icon}</span>
            <span>{b.text}</span>
          </div>
        ))}
      </div>

      {/* SoundPlayer (폭포 BGM) - 유지 */}
      <SoundPlayer />

      </div>{/* 내부 모바일 컨테이너 끝 */}

      {/* 하단 탭바 (PC에서도 중앙 정렬) */}
      <BottomTabBar activeTab={getActiveTab()} onTabChange={handleTabChange} />
    </div>
  );

  // ========================================
  // 📝 문제 생성/풀이 플로우 (기존 그대로)
  // ========================================
  return (
    <div style={{ minHeight:"100vh", background:"#e8eaf0", fontFamily:"'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ maxWidth:520, margin:"0 auto", background:"#f5f6fa", minHeight:"100vh", paddingBottom:100, boxShadow:"0 0 40px rgba(0,0,0,0.08)", position:"relative" }}>
      <style>{CSS}</style>
      <input ref={galleryInputRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleGalleryChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={handleCameraChange} />

      <div style={{ background:"#fff", borderBottom:"1px solid #f0f0f5", padding:"16px 20px 14px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:640, margin:"0 auto", display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>{ setShowHome(true); setStep("upload"); setUploadedImages([]); setTextInput(""); setQuizData(null); setError(null); setDirection(""); }} style={{ width:36, height:36, borderRadius:10, border:"1.5px solid #e8e9ef", background:"#fff", cursor:"pointer", fontSize:18, flexShrink:0 }}>←</button>
          <div style={{ width:38, height:38, borderRadius:12, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📖</div>
          <div>
            <h1 style={{ margin:0, fontSize:17, fontWeight:800, color:"#1a1a2e" }}>시험 문제 생성기</h1>
            <p style={{ margin:0, fontSize:11, color:"#999" }}>AI가 맞춤 문제를 만들어드려요</p>
          </div>
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

        {step==="upload" && (
          <div className="fade-up">
            <div style={{ textAlign:"center", padding:"24px 0 20px" }}>
              <div style={{ fontSize:52, marginBottom:8 }}>📚</div>
              <h2 style={{ margin:"0 0 6px", fontSize:22, fontWeight:900, color:"#1a1a2e" }}>학습 자료를 올려주세요</h2>
              <p style={{ margin:0, fontSize:13, color:"#999" }}>사진, 갤러리, 텍스트 중 하나 또는 여러 개를 선택하세요</p>
              <div style={{ margin:"12px 0 0", background:"#fffbeb", border:"1.5px solid #fde68a", borderRadius:14, padding:"12px 16px", textAlign:"left" }}>
               <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#d97706" }}>📢 이용 전 꼭 확인하세요!</p>
               <p style={{ margin:"0 0 4px", fontSize:12, color:"#92400e", lineHeight:1.6 }}>• 손글씨나 필기 자료는 인식률이 떨어질 수 있어요</p>
               <p style={{ margin:0, fontSize:12, color:"#92400e", lineHeight:1.6 }}>• 문제 수가 많을수록 생성 시간이 길어지고 에러가 발생할 수 있어요</p>
</div>
            </div>

            <button onClick={() => cameraInputRef.current?.click()} style={{ width:"100%", padding:"18px 20px", borderRadius:20, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", display:"flex", alignItems:"center", gap:16, cursor:"pointer", marginBottom:10, boxShadow:"0 4px 20px rgba(99,102,241,0.3)", textAlign:"left" }}>
              <div style={{ width:48, height:48, borderRadius:14, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>📷</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:16, fontWeight:800 }}>카메라로 직접 찍기</p>
                <p style={{ margin:"3px 0 0", fontSize:12, opacity:0.8 }}>교재·문제집을 바로 촬영</p>
              </div>
              <span style={{ fontSize:20, opacity:0.6 }}>›</span>
            </button>

            <button onClick={() => galleryInputRef.current?.click()} style={{ width:"100%", padding:"18px 20px", borderRadius:20, border:"2px solid #e8e9ef", background:"#fff", color:"#333", display:"flex", alignItems:"center", gap:16, cursor:"pointer", marginBottom:10, textAlign:"left" }}>
              <div style={{ width:48, height:48, borderRadius:14, background:"#f0f0f8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>🖼️</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:16, fontWeight:800, color:"#1a1a2e" }}>갤러리에서 선택</p>
                <p style={{ margin:"3px 0 0", fontSize:12, color:"#999" }}>여러 장 동시 선택 (최대 {MAX_IMAGES}장)</p>
              </div>
              <span style={{ fontSize:20, color:"#ccc" }}>›</span>
            </button>

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

            <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
              style={{ padding:16, borderRadius:16, textAlign:"center", border:`2px dashed ${dragOver?"#6366f1":"#dde"}`, background: dragOver?"#f5f3ff":"transparent", color: dragOver?"#6366f1":"#bbb", fontSize:12, transition:"all 0.2s", marginBottom:10 }}>
              🖥️ PC에서는 이미지를 여기에 끌어다 놓으세요
            </div>

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

        {step==="config" && (
          <div className="fade-up">
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

            <div className="card">
              <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1a1a2e" }}>🎓 학년 선택</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {GRADES.map(g => <button key={g.label} onClick={()=>setGrade(g.label)} className={`tag-btn${grade===g.label?" active":""}`}>{g.label}</button>)}
              </div>
            </div>

            <div className="card">
              <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1a1a2e" }}>📝 과목 선택</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {SUBJECTS.map(s => <button key={s} onClick={()=>{ setSubject(s); setDirection(""); }} className={`tag-btn${subject===s?" active":""}`}>{s}</button>)}
              </div>
            </div>

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

            <div className="card">
              <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:800, color:"#1a1a2e" }}>🎯 출제 방향 <span style={{ fontSize:11, color:"#bbb", fontWeight:500 }}>(선택사항)</span></p>
              <p style={{ margin:"0 0 12px", fontSize:11, color:"#999" }}>태그를 누르면 자동 입력돼요. 직접 수정도 가능해요.</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                {(DIRECTION_TAGS[subject] || DIRECTION_TAGS["기타"]).map(tag => (
                  <button key={tag} onClick={()=>addDirectionTag(tag)} className="dir-tag">{tag}</button>
                ))}
              </div>
              <textarea value={direction} onChange={e=>setDirection(e.target.value)}
                placeholder={"예: 분자 이름을 주고 특징을 묻는 문제로 출제해줘\n예: 각 항목을 서로 비교하는 문제 위주로 내줘"}
                style={{ width:"100%", minHeight:72, background:"#f8f8fc", borderRadius:12, border:"1.5px solid #e8e9ef", padding:"12px 14px", color:"#333", fontSize:13, resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", lineHeight:1.6, outline:"none" }} />
              {direction && <button onClick={()=>setDirection('')} style={{ background:"none", border:"none", color:"#ef4444", fontSize:12, cursor:"pointer", marginTop:6 }}>초기화</button>}
            </div>

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
            <div style={{ display:"inline-block", position:"relative", marginBottom:16, animation:"bubble 3s ease-in-out infinite" }}>
              <div style={{ background:"#fff", border:"2.5px solid #fde68a", borderRadius:20, padding:"12px 22px", boxShadow:"0 6px 20px rgba(251,191,36,0.2)" }}>
                <p style={{ margin:0, fontSize:15, fontWeight:900, color:"#d97706" }}>문제 열심히 만드는 중! ✍️</p>
                <p style={{ margin:"3px 0 0", fontSize:12, color:"#aaa" }}>잠깐만 기다려줘~ 🐾</p>
              </div>
              <div style={{ position:"absolute", bottom:-13, left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"11px solid transparent", borderRight:"11px solid transparent", borderTop:"14px solid #fde68a" }} />
              <div style={{ position:"absolute", bottom:-10, left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"9px solid transparent", borderRight:"9px solid transparent", borderTop:"11px solid #fff" }} />
            </div>
            <div style={{ position:"relative", width:220, height:220, margin:"0 auto 16px" }}>
              <div style={{ position:"absolute", bottom:8, left:0, width:52, height:62, background:"#fff", borderRadius:10, border:"2px solid #fde68a", animation:"paperFloat 2s ease-in-out infinite", boxShadow:"0 4px 14px rgba(251,191,36,0.15)", zIndex:1 }}>
                {[0,1,2,3].map(i => <div key={i} style={{ height:2.5, background:"#fde68a", margin:"10px 7px 0", borderRadius:3 }} />)}
              </div>
              <div style={{ position:"absolute", bottom:40, right:0, animation:"pencilMove 1.1s ease-in-out infinite", transformOrigin:"bottom center", zIndex:1 }}>
                <div style={{ width:9, height:8, background:"#fda4af", borderRadius:"3px 3px 0 0", margin:"0 auto" }} />
                <div style={{ width:9, height:46, background:"linear-gradient(180deg,#fbbf24,#f59e0b)", position:"relative" }}>
                  <div style={{ position:"absolute", top:0, left:0, width:"100%", height:8, background:"rgba(180,180,180,0.5)" }} />
                  <div style={{ position:"absolute", bottom:-10, left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"4.5px solid transparent", borderRight:"4.5px solid transparent", borderTop:"11px solid #92400e" }} />
                </div>
              </div>
              {/* 선택된 캐릭터 표시 */}
              <div style={{ position:"absolute", bottom:0, left:"50%", animation:"dogBounce 1.3s ease-in-out infinite", zIndex:2 }}>
                <img src={currentChar.src} alt={currentChar.name}
                  style={{ width:150, height:150, objectFit:"cover", borderRadius:"50%", border:"5px solid #fff", boxShadow:"0 10px 30px rgba(0,0,0,0.15)", display:"block", animation:"dogShake 2.6s ease-in-out infinite" }} />
                <div style={{ width:120, height:12, background:"rgba(0,0,0,0.08)", borderRadius:"50%", margin:"4px auto 0", animation:"shadowAnim 1.3s ease-in-out infinite", filter:"blur(3px)" }} />
              </div>
            </div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#fff", border:"2px solid #fde68a", borderRadius:20, padding:"6px 16px", marginBottom:12, boxShadow:"0 2px 8px rgba(251,191,36,0.2)" }}>
              <span style={{ fontSize:14 }}>🐾</span>
              <span style={{ fontSize:13, fontWeight:800, color:"#d97706" }}>{currentChar.name}가 문제 출제 중</span>
              <span style={{ fontSize:14 }}>🐾</span>
            </div>
            <p style={{ margin:"0 0 12px", fontSize:13, color:"#bbb" }}>{getSourceLabel()} 열심히 분석하고 있어요~</p>
            <div style={{ background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:12, padding:"10px 16px", marginBottom:20, display:"inline-block" }}>
            <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#ef4444" }}>⚠️ 이 화면을 벗어나면 처음부터 다시 시작해야 해요!</p>
</div>
            <div style={{ display:"flex", justifyContent:"center", gap:7 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:11, height:11, borderRadius:"50%", background:"#fbbf24", animation:"dotBounce 1.2s ease-in-out infinite", animationDelay:`${i*0.18}s` }} />
              ))}
            </div>
            {questionCount >= 20 && <p style={{ margin:"16px 0 0", fontSize:12, color:"#f59e0b", background:"#fffbeb", padding:"8px 14px", borderRadius:10, display:"inline-block" }}>☕ 문제가 많아서 조금 더 걸릴 수 있어요!</p>}
          </div>
        )}

        {step==="result" && quizData && (
          <div className="fade-up">
            <div className="card" style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", marginBottom:12 }}>
              <p style={{ margin:"0 0 4px", fontSize:12, opacity:0.8 }}>출제 범위: {getSourceLabel()}</p>
              <p style={{ margin:"0 0 12px", fontSize:18, fontWeight:900 }}>{quizData.topic}</p>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <span className="chip" style={{ background:"rgba(255,255,255,0.2)", color:"#fff" }}>{grade}</span>
                <span className="chip" style={{ background:"rgba(255,255,255,0.2)", color:"#fff" }}>{subject}</span>
                <span className="chip" style={{ background:"rgba(255,255,255,0.2)", color:"#fff" }}>{diff.emoji} {diff.label}</span>
                {direction && <span className="chip" style={{ background:"rgba(255,255,255,0.2)", color:"#fff" }}>🎯 방향 설정됨</span>}
              </div>
            </div>

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

            <div style={{ display:"flex", gap:8, paddingBottom:24 }}>
              {!showAnswers && <button onClick={handleSubmit} style={{ flex:1, padding:16, borderRadius:16, border:"none", background:"linear-gradient(135deg,#059669,#10b981)", color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 16px rgba(16,185,129,0.3)", fontFamily:"inherit" }}>📝 채점하기</button>}
              <button onClick={()=>{setStep("config");setSelectedAnswers({});setShowAnswers(false);setScore(null);setEssayScores({});}} style={{ flex:1, padding:16, borderRadius:16, border:"1.5px solid #c7d2fe", background:"#fff", color:"#6366f1", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🔄 다시 생성</button>
              <button onClick={reset} style={{ padding:"16px 20px", borderRadius:16, border:"1.5px solid #e8e9ef", background:"#fff", color:"#999", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>🏠</button>
            </div>
          </div>
        )}
      </div>

      </div>{/* 내부 모바일 컨테이너 끝 */}

      {/* 하단 탭바 */}
      <BottomTabBar activeTab={getActiveTab()} onTabChange={handleTabChange} />
    </div>
  );
}
