'use client';
import { useState, useRef, useCallback } from "react";

const DIFFICULTY_CONFIG = {
  easy: { label:"쉬움", emoji:"🌱", desc:"기본 개념 확인", color:"#4ade80", prompt:"매우 기본적이고 쉬운 수준으로, 핵심 용어와 기본 개념을 확인하는 문제를 출제해주세요. 객관식 위주로 명확한 답이 있는 문제로 구성해주세요." },
  medium: { label:"보통", emoji:"📚", desc:"개념 적용 및 이해", color:"#f59e0b", prompt:"중간 수준으로, 개념을 이해하고 적용하는 문제를 출제해주세요. 객관식과 단답형을 섞어서 구성해주세요." },
  hard: { label:"어려움", emoji:"🔥", desc:"심화 응용 및 서술", color:"#f43f5e", prompt:"어려운 수준으로, 깊은 이해와 응용, 추론이 필요한 문제를 출제해주세요. 단답형과 서술형 문제를 포함해주세요." }
};
const SUBJECTS = ["국어","영어","수학","과학","사회","역사","기술·가정","도덕","기타"];

export default function StudyQuizApp() {
  const [step, setStep] = useState("upload");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [subject, setSubject] = useState("국어");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [quizData, setQuizData] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [score, setScore] = useState(null);
  const galleryInputRef = useRef();
  const cameraInputRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("이미지 파일만 업로드 가능합니다."); return; }
    setError(null);
    setUploadedImage(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (e) => { setImageBase64(e.target.result.split(",")[1]); setStep("config"); };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };

  const generateQuiz = async () => {
    setStep("loading"); setError(null); setSelectedAnswers({}); setShowAnswers(false); setScore(null);
    const diff = DIFFICULTY_CONFIG[difficulty];
    const prompt = `당신은 중학교 ${subject} 과목 전문 교사입니다. 아래 교재/문제집 이미지를 분석하여 예상 시험 문제를 만들어주세요.\n\n조건:\n- 과목: ${subject} (중학교 수준)\n- 문제 수: ${questionCount}개\n- 난이도: ${diff.label} - ${diff.prompt}\n- 반드시 JSON 형식으로만 응답해주세요\n\nJSON 형식:\n{\n  "topic": "학습 주제",\n  "questions": [\n    {\n      "id": 1,\n      "type": "객관식",\n      "question": "문제",\n      "options": ["①","②","③","④"],\n      "answer": "정답",\n      "explanation": "해설"\n    }\n  ]\n}`;
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, subject, difficulty, questionCount, prompt })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setQuizData(data); setStep("result");
    } catch (err) { setError("문제 생성 중 오류가 발생했습니다: " + err.message); setStep("config"); }
  };

  const handleSelectAnswer = (qid, answer) => { if (!showAnswers) setSelectedAnswers(prev => ({ ...prev, [qid]: answer })); };
  const handleSubmit = () => {
    if (!quizData) return;
    let correct = 0;
    quizData.questions.forEach(q => { if (q.type === "객관식" && selectedAnswers[q.id] === q.answer) correct++; });
    const total = quizData.questions.filter(q => q.type === "객관식").length;
    setScore({ correct, total }); setShowAnswers(true);
  };
  const reset = () => {
    setStep("upload"); setUploadedImage(null); setImageBase64(null); setQuizData(null);
    setSelectedAnswers({}); setShowAnswers(false); setScore(null); setError(null);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };
  const diff = DIFFICULTY_CONFIG[difficulty];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)", fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", padding:"20px", display:"flex", flexDirection:"column", alignItems:"center" }}>
      <input ref={galleryInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={(e) => { handleFile(e.target.files[0]); e.target.value=""; }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={(e) => { handleFile(e.target.files[0]); e.target.value=""; }} />

      <div style={{ textAlign:"center", marginBottom:"28px", paddingTop:"16px" }}>
        <div style={{ fontSize:"40px", marginBottom:"6px" }}>📖</div>
        <h1 style={{ color:"#fff", fontSize:"clamp(20px,4vw,30px)", fontWeight:"800", margin:0 }}>시험 문제 생성기</h1>
        <p style={{ color:"#a78bfa", marginTop:"6px", fontSize:"13px" }}>교재를 찍어 올리면 AI가 예상 문제를 만들어드려요</p>
        <div style={{ display:"flex", gap:"8px", justifyContent:"center", marginTop:"14px" }}>
          {["upload","config","result"].map((s,i) => (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:"26px", height:"26px", borderRadius:"50%", background: step===s?"#a78bfa":(["upload","config","result"].indexOf(step)>i?"#6d28d9":"rgba(255,255,255,0.15)"), color:"#fff", fontSize:"11px", fontWeight:"700", display:"flex", alignItems:"center", justifyContent:"center" }}>{i+1}</div>
              {i<2 && <div style={{ width:"20px", height:"2px", background:"rgba(255,255,255,0.2)" }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ width:"100%", maxWidth:"640px" }}>
        {step==="upload" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            <button onClick={() => cameraInputRef.current&&cameraInputRef.current.click()} style={{ display:"flex", alignItems:"center", gap:"18px", width:"100%", padding:"22px 24px", borderRadius:"20px", border:"none", cursor:"pointer", textAlign:"left", background:"linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow:"0 8px 28px rgba(124,58,237,0.45)", color:"#fff" }}>
              <span style={{ fontSize:"38px" }}>📷</span>
              <div style={{ flex:1 }}><p style={{ margin:0, fontSize:"17px", fontWeight:"800" }}>카메라로 직접 찍기</p><p style={{ margin:"4px 0 0", fontSize:"12px", opacity:0.8 }}>지금 교재·문제집을 촬영해서 바로 분석</p></div>
              <span style={{ fontSize:"22px", opacity:0.6 }}>›</span>
            </button>
            <button onClick={() => galleryInputRef.current&&galleryInputRef.current.click()} style={{ display:"flex", alignItems:"center", gap:"18px", width​​​​​​​​​​​​​​​​
