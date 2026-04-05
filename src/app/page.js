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
            <button onClick={() => galleryInputRef.current&&galleryInputRef.current.click()} style={{ display:"flex", alignItems:"center", gap:"18px", width:"100%", padding:"22px 24px", borderRadius:"20px", border:"1px solid rgba(167,139,250,0.35)", cursor:"pointer", textAlign:"left", background:"rgba(255,255,255,0.07)", color:"#e2e8f0" }}>
              <span style={{ fontSize:"38px" }}>🖼️</span>
              <div style={{ flex:1 }}><p style={{ margin:0, fontSize:"17px", fontWeight:"800" }}>갤러리에서 선택</p><p style={{ margin:"4px 0 0", fontSize:"12px", color:"#94a3b8" }}>저장된 사진 / 스크린샷 불러오기</p></div>
              <span style={{ fontSize:"22px", color:"#64748b" }}>›</span>
            </button>
            <div onDragOver={(e)=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} style={{ padding:"22px", borderRadius:"16px", textAlign:"center", border:`2px dashed ${dragOver?"#a78bfa":"rgba(167,139,250,0.22)"}`, background:dragOver?"rgba(167,139,250,0.1)":"transparent", color:dragOver?"#a78bfa":"#64748b", fontSize:"13px" }}>
              🖥️ PC에서는 이미지를 여기에 끌어다 놓으세요
            </div>
            {error && <div style={{ background:"rgba(244,63,94,0.1)", border:"1px solid rgba(244,63,94,0.3)", borderRadius:"12px", padding:"12px 16px", color:"#f43f5e", fontSize:"14px" }}>⚠️ {error}</div>}
          </div>
        )}

        {step==="config" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"16px", padding:"16px", display:"flex", gap:"16px", alignItems:"center", border:"1px solid rgba(167,139,250,0.2)" }}>
              <img src={uploadedImage} alt="업로드" style={{ width:"80px", height:"80px", objectFit:"cover", borderRadius:"10px" }} />
              <div style={{ flex:1 }}><p style={{ color:"#a78bfa", fontSize:"12px", margin:"0 0 4px" }}>업로드 완료 ✓</p><p style={{ color:"#e2e8f0", fontSize:"14px", margin:0 }}>AI가 분석할 준비가 됐어요</p></div>
              <button onClick={reset} style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:"22px" }}>×</button>
            </div>
            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"16px", padding:"20px", border:"1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ color:"#a78bfa", fontSize:"13px", fontWeight:"700", margin:"0 0 12px", textTransform:"uppercase", letterSpacing:"1px" }}>과목 선택</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                {SUBJECTS.map(s => <button key={s} onClick={()=>setSubject(s)} style={{ padding:"8px 14px", borderRadius:"20px", border:"none", cursor:"pointer", background:subject===s?"#7c3aed":"rgba(255,255,255,0.1)", color:subject===s?"#fff":"#94a3b8", fontSize:"13px", fontWeight:subject===s?"700":"400" }}>{s}</button>)}
              </div>
            </div>
            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"16px", padding:"20px", border:"1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ color:"#a78bfa", fontSize:"13px", fontWeight:"700", margin:"0 0 12px", textTransform:"uppercase", letterSpacing:"1px" }}>난이도</p>
              <div style={{ display:"flex", gap:"10px" }}>
                {Object.entries(DIFFICULTY_CONFIG).map(([key,val]) => (
                  <button key={key} onClick={()=>setDifficulty(key)} style={{ flex:1, padding:"14px 8px", borderRadius:"14px", cursor:"pointer", border:difficulty===key?`2px solid ${val.color}`:"2px solid transparent", background:difficulty===key?`${val.color}22`:"rgba(255,255,255,0.07)", color:difficulty===key?val.color:"#94a3b8", textAlign:"center" }}>
                    <div style={{ fontSize:"24px", marginBottom:"4px" }}>{val.emoji}</div>
                    <div style={{ fontSize:"13px", fontWeight:"700" }}>{val.label}</div>
                    <div style={{ fontSize:"11px", marginTop:"2px", opacity:0.7 }}>{val.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"16px", padding:"20px", border:"1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ color:"#a78bfa", fontSize:"13px", fontWeight:"700", margin:"0 0 12px", textTransform:"uppercase", letterSpacing:"1px" }}>문제 수: <span style={{ color:"#e2e8f0" }}>{questionCount}개</span></p>
              <input type="range" min={3} max={10} value={questionCount} onChange={e=>setQuestionCount(Number(e.target.value))} style={{ width:"100%", accentColor:"#7c3aed" }} />
              <div style={{ display:"flex", justifyContent:"space-between", color:"#64748b", fontSize:"12px", marginTop:"4px" }}><span>3개</span><span>10개</span></div>
            </div>
            {error && <div style={{ background:"rgba(244,63,94,0.1)", border:"1px solid rgba(244,63,94,0.3)", borderRadius:"12px", padding:"12px 16px", color:"#f43f5e", fontSize:"14px" }}>⚠️ {error}</div>}
            <button onClick={generateQuiz} style={{ width:"100%", padding:"18px", borderRadius:"16px", border:"none", background:"linear-gradient(135deg,#7c3aed,#a855f7)", color:"#fff", fontSize:"17px", fontWeight:"800", cursor:"pointer", boxShadow:"0 8px 32px rgba(124,58,237,0.4)" }}>✨ AI 문제 생성하기</button>
          </div>
        )}

        {step==="loading" && (
          <div style={{ textAlign:"center", padding:"80px 24px" }}>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            <div style={{ fontSize:"56px", marginBottom:"24px", animation:"spin 2s linear infinite", display:"inline-block" }}>🔮</div>
            <p style={{ color:"#e2e8f0", fontSize:"20px", fontWeight:"700", margin:"0 0 8px" }}>AI가 문제를 만들고 있어요</p>
            <p style={{ color:"#94a3b8", fontSize:"14px" }}>잠깐만요!</p>
          </div>
        )}

        {step==="result" && quizData && (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div style={{ background:"rgba(124,58,237,0.2)", borderRadius:"14px", padding:"16px 20px", border:"1px solid rgba(167,139,250,0.3)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"8px" }}>
              <div><p style={{ color:"#a78bfa", fontSize:"12px", margin:"0 0 2px" }}>분석 결과</p><p style={{ color:"#e2e8f0", fontSize:"16px", fontWeight:"700", margin:0 }}>{quizData.topic}</p></div>
              <div style={{ display:"flex", gap:"8px" }}>
                <span style={{ background:"#7c3aed", color:"#fff", padding:"4px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:"700" }}>{subject}</span>
                <span style={{ background:diff.color+"33", color:diff.color, padding:"4px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:"700", border:`1px solid ${diff.color}44` }}>{diff.emoji} {diff.label}</span>
              </div>
            </div>
            {showAnswers && score && (
              <div style={{ background:"linear-gradient(135deg,rgba(74,222,128,0.15),rgba(34,197,94,0.1))", border:"1px solid rgba(74,222,128,0.3)", borderRadius:"14px", padding:"20px", textAlign:"center" }}>
                <p style={{ color:"#4ade80", fontSize:"32px", fontWeight:"900", margin:"0 0 4px" }}>{score.correct} / {score.total}</p>
                <p style={{ color:"#86efac", fontSize:"14px", margin:0 }}>객관식 정답 ({score.total>0?Math.round(score.correct/score.total*100):0}%)</p>
              </div>
            )}
            {quizData.questions.map((q,idx) => {
              const isCorrect = showAnswers&&q.type==="객관식"&&selectedAnswers[q.id]===q.answer;
              const isWrong = showAnswers&&q.type==="객관식"&&selectedAnswers[q.id]&&selectedAnswers[q.id]!==q.answer;
              return (
                <div key={q.id} style={{ background:isCorrect?"rgba(74,222,128,0.08)":isWrong?"rgba(244,63,94,0.08)":"rgba(255,255,255,0.05)", border:`1px solid ${isCorrect?"rgba(74,222,128,0.3)":isWrong?"rgba(244,63,94,0.3)":"rgba(255,255,255,0.08)"}`, borderRadius:"16px", padding:"20px" }}>
                  <div style={{ display:"flex", gap:"8px", marginBottom:"12px" }}>
                    <span style={{ background:"#7c3aed", color:"#fff", borderRadius:"8px", padding:"2px 8px", fontSize:"12px", fontWeight:"800" }}>Q{idx+1}</span>
                    <span style={{ background:"rgba(255,255,255,0.1)", color:"#94a3b8", borderRadius:"6px", padding:"2px 8px", fontSize:"11px" }}>{q.type}</span>
                  </div>
                  <p style={{ color:"#e2e8f0", fontSize:"15px", fontWeight:"600", margin:"0 0 14px", lineHeight:"1.6" }}>{q.question}</p>
                  {q.type==="객관식"&&q.options&&(
                    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                      {q.options.map((opt,oi) => {
                        const isSelected=selectedAnswers[q.id]===opt;
                        const isAnswer=showAnswers&&opt===q.answer;
                        return <button key={oi} onClick={()=>handleSelectAnswer(q.id,opt)} style={{ padding:"12px 16px", borderRadius:"10px", border:`1px solid ${isAnswer?"#4ade80":isSelected&&!showAnswers?"#a78bfa":isSelected?"#f43f5e":"rgba(255,255,255,0.1)"}`, background:isAnswer?"rgba(74,222,128,0.1)":isSelected&&!showAnswers?"rgba(167,139,250,0.15)":isSelected?"rgba(244,63,94,0.1)":"rgba(255,255,255,0.03)", color:isAnswer?"#4ade80":isSelected?(showAnswers?"#f43f5e":"#a78bfa"):"#cbd5e1", textAlign:"left", cursor:showAnswers?"default":"pointer", fontSize:"14px", fontWeight:isSelected||isAnswer?"700":"400" }}>{isAnswer&&showAnswers?"✓ ":isSelected&&showAnswers?"✗ ":""}{opt}</button>;
                      })}
                    </div>
                  )}
                  {(q.type==="단답형"||q.type==="서술형")&&(
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.1)", padding:"12px", color:"#94a3b8", fontSize:"13px", minHeight:"60px" }}>
                      {showAnswers?<div><p style={{ color:"#a78bfa", fontSize:"11px", margin:"0 0 6px", fontWeight:"700" }}>모범 답안</p><p style={{ color:"#e2e8f0", margin:0 }}>{q.answer}</p></div>:<span>여기에 답을 써보세요 ✏️</span>}
                    </div>
                  )}
                  {showAnswers&&<div style={{ marginTop:"12px", padding:"12px", borderRadius:"10px", background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)" }}><p style={{ color:"#a78bfa", fontSize:"11px", margin:"0 0 4px", fontWeight:"700" }}>💡 해설</p><p style={{ color:"#cbd5e1", fontSize:"13px", margin:0, lineHeight:"1.5" }}>{q.explanation}</p></div>}
                </div>
              );
            })}
            <div style={{ display:"flex", gap:"10px", paddingBottom:"24px" }}>
              {!showAnswers&&<button onClick={handleSubmit} style={{ flex:1, padding:"16px", borderRadius:"14px", border:"none", background:"linear-gradient(135deg,#059669,#10b981)", color:"#fff", fontSize:"15px", fontWeight:"800", cursor:"pointer" }}>📝 채점하기</button>}
              <button onClick={()=>{setStep("config");setSelectedAnswers({});setShowAnswers(false);setScore(null);}} style={{ flex:1, padding:"16px", borderRadius:"14px", background:"rgba(124,58,237,0.3)", border:"1px solid rgba(167,139,250,0.3)", color:"#a78bfa", fontSize:"15px", fontWeight:"700", cursor:"pointer" }}>🔄 다시 생성</button>
              <button onClick={reset} style={{ padding:"16px 20px", borderRadius:"14px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)", color:"#64748b", fontSize:"15px", cursor:"pointer" }}>🏠</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
