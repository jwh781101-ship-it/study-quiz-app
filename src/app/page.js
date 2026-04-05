'use client';
import { useState, useRef, useCallback } from "react";

const DIFFICULTY_CONFIG = {
  easy: { label:"쉬움", emoji:"🌱", desc:"기본 개념 확인", color:"#4ade80", prompt:"기초 개념을 확인하는 수준으로, 교과서 핵심 내용을 정확히 이해했는지 묻는 문제를 출제하세요." },
  medium: { label:"보통", emoji:"📚", desc:"개념 적용 및 이해", color:"#f59e0b", prompt:"개념을 실제 상황에 적용하고 추론하는 문제를 출제하세요." },
  hard: { label:"어려움", emoji:"🔥", desc:"심화 응용 및 서술", color:"#f43f5e", prompt:"깊은 이해와 비판적 사고가 필요한 최상위 난이도 문제를 출제하세요." }
};

const GRADES = [
  { label:"초4", full:"초등학교 4학년" },
  { label:"초5", full:"초등학교 5학년" },
  { label:"초6", full:"초등학교 6학년" },
  { label:"중1", full:"중학교 1학년" },
  { label:"중2", full:"중학교 2학년" },
  { label:"중3", full:"중학교 3학년" },
  { label:"고1", full:"고등학교 1학년" },
  { label:"고2", full:"고등학교 2학년" },
  { label:"고3", full:"고등학교 3학년" },
];

const SUBJECTS = ["국어","영어","수학","과학","사회","역사","기술·가정","도덕","기타"];
const MAX_IMAGES = 10;

const ENGLISH_TYPES = [
  { id:"mixed", label:"종합형", desc:"객관식+서술형 혼합" },
  { id:"multiple", label:"객관식만", desc:"5지선다 객관식" },
  { id:"essay", label:"서술형만", desc:"영작/단답형" },
];

const SCOPE_OPTIONS = [
  { id:"image_only", label:"📷 입력 내용만", desc:"올린 자료에서만 출제" },
  { id:"image_plus", label:"🌐 입력 + 관련 개념", desc:"자료 + 연계 개념 포함" },
];

function shuffleOptions(question) {
  if (question.type !== "객관식" || !question.options) return question;
  const options = [...question.options];
  const answerText = question.answer;
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const nums = ["①","②","③","④","⑤"];
  let answerContent = answerText;
  for (const n of nums) {
    if (answerText.startsWith(n)) { answerContent = answerText.slice(n.length).trim(); break; }
  }
  const newOptions = options.map((opt, i) => {
    let content = opt;
    for (const n of nums) { if (opt.startsWith(n)) { content = opt.slice(n.length).trim(); break; } }
    return nums[i] + " " + content;
  });
  const newAnswer = newOptions.find(opt => {
    let content = opt;
    for (const n of nums) { if (opt.startsWith(n)) { content = opt.slice(n.length).trim(); break; } }
    return content === answerContent;
  }) || newOptions[0];
  return { ...question, options: newOptions, answer: newAnswer };
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
  const galleryInputRef = useRef();
  const cameraInputRef = useRef();

  const hasContent = uploadedImages.length > 0 || textInput.trim().length > 0;

  const processFiles = useCallback((files) => {
    const fileArr = Array.from(files).slice(0, MAX_IMAGES - uploadedImages.length);
    if (fileArr.length === 0) return;
    setError(null);
    fileArr.forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(",")[1];
        setUploadedImages(prev => {
          if (prev.length >= MAX_IMAGES) return prev;
          return [...prev, { url, base64, type: file.type }];
        });
      };
      reader.readAsDataURL(file);
    });
  }, [uploadedImages]);

  const handleGalleryChange = (e) => { processFiles(e.target.files); e.target.value = ""; };
  const handleCameraChange = (e) => { processFiles(e.target.files); e.target.value = ""; };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); };
  const removeImage = (idx) => setUploadedImages(prev => prev.filter((_, i) => i !== idx));

  const buildPrompt = () => {
    const diff = DIFFICULTY_CONFIG[difficulty];
    const gradeInfo = GRADES.find(g => g.label === grade);
    const hasImages = uploadedImages.length > 0;
    const hasText = textInput.trim().length > 0;

    let sourceDesc = "";
    if (hasImages && hasText) sourceDesc = `이미지 ${uploadedImages.length}장과 텍스트 내용`;
    else if (hasImages) sourceDesc = `이미지 ${uploadedImages.length}장`;
    else sourceDesc = "텍스트 내용";

    const scopeText = scope === "image_only"
      ? `반드시 제공된 ${sourceDesc}에서만 출제하세요. 제공된 자료에 없는 내용은 절대 출제하지 마세요.`
      : `제공된 ${sourceDesc}을 중심으로 출제하되, 관련 개념과 연계된 문제도 포함할 수 있습니다.`;

    let typeGuide = "";
    if (subject === "영어") {
      if (englishType === "multiple") typeGuide = "모든 문제를 객관식(5지선다)으로 출제하세요. 빈칸추론, 내용일치, 어법/어휘 유형을 포함하세요.";
      else if (englishType === "essay") typeGuide = `모든 문제를 서술형으로 출제하세요. 한글 문장을 보여주고 영어로 영작하는 문제를 위주로 출제하세요. 예시) question: "다음 한글을 영어로 쓰시오: '나는 매일 아침 학교에 걸어간다.'" type: "서술형" answer: "I walk to school every morning."`;
      else typeGuide = "객관식(빈칸/일치/어법)과 서술형(영작/단답)을 골고루 섞어서 출제하세요.";
    }

    const textSection = hasText ? `\n\n[텍스트 학습 내용]\n${textInput}` : "";

    return `당신은 대한민국 교육부 공식 출제위원이자 20년 경력의 ${subject} 전문 출제자입니다.

[출제 대상]
- 학년: ${gradeInfo.full}
- 과목: ${subject}
- 난이도: ${diff.label} (${diff.prompt})
- 문제 수: ${questionCount}개
- 참고 자료: ${sourceDesc}

[출제 범위]
${scopeText}${textSection}

[출제 원칙 - 반드시 준수]
1. 정답은 반드시 1개만 존재해야 합니다. 나머지 선지는 명백히 틀린 내용이어야 합니다.
2. 객관식 정답의 위치를 ①②③④⑤ 중 랜덤하게 배치하세요. 절대 특정 번호에만 정답을 넣지 마세요.
3. 매력적인 오답(함정 선지)을 포함하되, 정답과 혼동되어서는 안 됩니다.
4. ${gradeInfo.full} 교육과정에 맞는 어휘와 개념을 사용하세요.
5. 해설에는 정답인 이유 + 각 오답이 틀린 명확한 이유를 설명하세요.
6. 문제 난이도를 쉬운 것부터 어려운 순서로 배분하세요.
${subject === "영어" ? `\n[영어 문제 유형]\n${typeGuide}` : ""}

반드시 JSON 형식으로만 응답하세요:
{
  "topic": "학습 주제",
  "questions": [
    {
      "id": 1,
      "type": "객관식",
      "question": "문제 내용",
      "options": ["① 내용", "② 내용", "③ 내용", "④ 내용", "⑤ 내용"],
      "answer": "③ 내용",
      "explanation": "③이 정답인 이유. ①은 ~때문에 틀림."
    }
  ]
}`;
  };

  const generateQuiz = async () => {
    if (!hasContent) { setError("이미지를 올리거나 텍스트를 입력해주세요."); return; }
    setStep("loading"); setError(null); setSelectedAnswers({}); setShowAnswers(false); setScore(null); setEssayScores({});
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: uploadedImages.map(img => ({ base64: img.base64, type: img.type })),
          subject, difficulty, questionCount,
          prompt: buildPrompt()
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const shuffled = { ...data, questions: data.questions.map(shuffleOptions) };
      setQuizData(shuffled); setStep("result");
    } catch (err) { setError("문제 생성 중 오류가 발생했습니다: " + err.message); setStep("config"); }
  };

  const handleSelectAnswer = (qid, answer) => {
    if (!showAnswers) setSelectedAnswers(prev => ({ ...prev, [qid]: answer }));
  };

  const gradeEssay = async (question, myAnswer) => {
    try {
      const prompt = `다음 문제에 대한 학생의 답안을 채점해주세요.\n\n문제: ${question.question}\n모범 답안: ${question.answer}\n학생 답안: ${myAnswer}\n\n채점 결과를 JSON으로만 응답하세요:\n{\n  "result": "정답" 또는 "부분정답" 또는 "오답",\n  "score": 0~100 사이 점수,\n  "feedback": "간단한 피드백 (1-2문장)"\n}`;
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [], prompt, isGrading: true })
      });
      const data = await response.json();
      if (data.result) setEssayScores(prev => ({ ...prev, [question.id]: data }));
    } catch (err) { console.error("채점 오류:", err); }
  };

  const handleSubmit = async () => {
    if (!quizData) return;
    let correct = 0;
    const total = quizData.questions.filter(q => q.type === "객관식").length;
    quizData.questions.forEach(q => {
      if (q.type === "객관식" && selectedAnswers[q.id] === q.answer) correct++;
    });
    setScore({ correct, total });
    setShowAnswers(true);
    setGradingEssay(true);
    const essayQs = quizData.questions.filter(q => q.type === "서술형" || q.type === "단답형");
    for (const q of essayQs) {
      if (selectedAnswers[q.id] && selectedAnswers[q.id].trim() !== "") {
        await gradeEssay(q, selectedAnswers[q.id]);
      } else {
        setEssayScores(prev => ({ ...prev, [q.id]: { result: "오답", score: 0, feedback: "답안을 작성하지 않았습니다." } }));
      }
    }
    setGradingEssay(false);
  };

  const reset = () => {
    setStep("upload"); setUploadedImages([]); setTextInput(""); setShowTextInput(false);
    setQuizData(null); setSelectedAnswers({}); setShowAnswers(false);
    setScore(null); setError(null); setEssayScores({});
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const diff = DIFFICULTY_CONFIG[difficulty];
  const hasImages = uploadedImages.length > 0;
  const hasText = textInput.trim().length > 0;

  const getSourceLabel = () => {
    if (hasImages && hasText) return `이미지 ${uploadedImages.length}장 + 텍스트`;
    if (hasImages) return `이미지 ${uploadedImages.length}장`;
    if (hasText) return "텍스트 입력";
    return "";
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)", fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", padding:"20px", display:"flex", flexDirection:"column", alignItems:"center" }}>
      <input ref={galleryInputRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleGalleryChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={handleCameraChange} />

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

        {/* ── STEP 1: UPLOAD ── */}
        {step==="upload" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>

            {/* 📷 카메라 */}
            <button onClick={() => cameraInputRef.current&&cameraInputRef.current.click()} style={{ display:"flex", alignItems:"center", gap:"18px", width:"100%", padding:"20px 24px", borderRadius:"20px", border:"none", cursor:"pointer", textAlign:"left", background:"linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow:"0 8px 28px rgba(124,58,237,0.35)", color:"#fff" }}>
              <span style={{ fontSize:"34px" }}>📷</span>
              <div style={{ flex:1 }}><p style={{ margin:0, fontSize:"16px", fontWeight:"800" }}>카메라로 찍기</p><p style={{ margin:"3px 0 0", fontSize:"12px", opacity:0.8 }}>교재를 한 장씩 촬영</p></div>
              <span style={{ fontSize:"20px", opacity:0.6 }}>›</span>
            </button>

            {/* 🖼 갤러리 */}
            <button onClick={() => galleryInputRef.current&&galleryInputRef.current.click()} style={{ display:"flex", alignItems:"center", gap:"18px", width:"100%", padding:"20px 24px", borderRadius:"20px", border:"1px solid rgba(167,139,250,0.35)", cursor:"pointer", textAlign:"left", background:"rgba(255,255,255,0.07)", color:"#e2e8f0" }}>
              <span style={{ fontSize:"34px" }}>🖼️</span>
              <div style={{ flex:1 }}><p style={{ margin:0, fontSize:"16px", fontWeight:"800" }}>갤러리에서 선택</p><p style={{ margin:"3px 0 0", fontSize:"12px", color:"#94a3b8" }}>여러 장 동시 선택 (최대 {MAX_IMAGES}장)</p></div>
              <span style={{ fontSize:"20px", color:"#64748b" }}>›</span>
            </button>

            {/* ✏️ 텍스트 입력 */}
            <button onClick={() => setShowTextInput(v=>!v)} style={{ display:"flex", alignItems:"center", gap:"18px", width:"100%", padding:"20px 24px", borderRadius:"20px", border:`1px solid ${showTextInput?"rgba(167,139,250,0.5)":"rgba(167,139,250,0.2)"}`, cursor:"pointer", textAlign:"left", background:showTextInput?"rgba(167,139,250,0.1)":"rgba(255,255,255,0.04)", color:"#e2e8f0" }}>
              <span style={{ fontSize:"34px" }}>✏️</span>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:"16px", fontWeight:"800" }}>텍스트 붙여넣기</p>
                <p style={{ margin:"3px 0 0", fontSize:"12px", color:"#94a3b8" }}>노트 내용 복사해서 붙여넣기</p>
              </div>
              <span style={{ fontSize:"18px", color:"#a78bfa", transition:"transform 0.2s", transform:showTextInput?"rotate(90deg)":"rotate(0deg)" }}>›</span>
            </button>

            {/* 텍스트 입력창 */}
            {showTextInput && (
              <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"16px", padding:"16px", border:"1px solid rgba(167,139,250,0.25)" }}>
                <textarea
                  value={textInput}
                  onChange={e=>setTextInput(e.target.value)}
                  placeholder={"아이패드 노트 내용을 복사해서 붙여넣거나 직접 입력하세요\n\n예시)\n수소\n- 가장 가볍다\n- 가연성(폭발)\n- 1족인데 금속이 아님\n\n헬륨\n- 두번째로 가볍다\n- 음성변조에 사용..."}
                  style={{ width:"100%", minHeight:"160px", background:"rgba(255,255,255,0.05)", borderRadius:"10px", border:"1px solid rgba(167,139,250,0.2)", padding:"12px", color:"#e2e8f0", fontSize:"14px", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", lineHeight:"1.6" }}
                />
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:"8px", alignItems:"center" }}>
                  <span style={{ color:"#64748b", fontSize:"12px" }}>{textInput.length}자</span>
                  {textInput.length > 0 && <button onClick={()=>setTextInput("")} style={{ background:"none", border:"none", color:"#f43f5e", fontSize:"12px", cursor:"pointer" }}>전체 지우기</button>}
                </div>
              </div>
            )}

            {/* PC 드래그 앤 드롭 */}
            <div onDragOver={(e)=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} style={{ padding:"16px", borderRadius:"14px", textAlign:"center", border:`2px dashed ${dragOver?"#a78bfa":"rgba(167,139,250,0.15)"}`, background:dragOver?"rgba(167,139,250,0.08)":"transparent", color:dragOver?"#a78bfa":"#4b5563", fontSize:"12px", transition:"all 0.2s" }}>
              🖥️ PC에서는 이미지를 여기에 끌어다 놓으세요
            </div>

            {/* 업로드된 이미지 미리보기 */}
            {uploadedImages.length > 0 && (
              <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"16px", padding:"14px", border:"1px solid rgba(167,139,250,0.2)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                  <p style={{ color:"#a78bfa", fontSize:"13px", fontWeight:"700", margin:0 }}>📷 이미지 {uploadedImages.length}/{MAX_IMAGES}장</p>
                  {uploadedImages.length < MAX_IMAGES && (
                    <button onClick={() => galleryInputRef.current&&galleryInputRef.current.click()} style={{ background:"rgba(124,58,237,0.3)", border:"1px solid rgba(167,139,250,0.3)", color:"#a78bfa", borderRadius:"8px", padding:"4px 10px", fontSize:"11px", cursor:"pointer" }}>+ 추가</button>
                  )}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} style={{ position:"relative" }}>
                      <img src={img.url} alt={`이미지${idx+1}`} style={{ width:"64px", height:"64px", objectFit:"cover", borderRadius:"10px", border:"2px solid rgba(167,139,250,0.3)" }} />
                      <button onClick={() => removeImage(idx)} style={{ position:"absolute", top:"-6px", right:"-6px", width:"20px", height:"20px", borderRadius:"50%", background:"#f43f5e", border:"none", color:"#fff", fontSize:"11px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"800" }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 현재 입력 요약 + 다음 버튼 */}
            {hasContent && (
              <div style={{ background:"rgba(124,58,237,0.15)", borderRadius:"16px", padding:"14px 16px", border:"1px solid rgba(167,139,250,0.3)" }}>
                <p style={{ color:"#a78bfa", fontSize:"12px", margin:"0 0 4px", fontWeight:"700" }}>출제 범위</p>
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"12px" }}>
                  {hasImages && <span style={{ background:"rgba(124,58,237,0.3)", color:"#c4b5fd", padding:"4px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:"700" }}>📷 이미지 {uploadedImages.length}장</span>}
                  {hasText && <span style={{ background:"rgba(124,58,237,0.3)", color:"#c4b5fd", padding:"4px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:"700" }}>✏️ 텍스트 {textInput.length}자</span>}
                  {hasImages && hasText && <span style={{ color:"#a78bfa", fontSize:"11px", padding:"4px 0" }}>← 두 가지 모두 범위로 출제돼요!</span>}
                </div>
                <button onClick={() => setStep("config")} style={{ width:"100%", padding:"14px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#7c3aed,#a855f7)", color:"#fff", fontSize:"15px", fontWeight:"800", cursor:"pointer" }}>
                  다음 단계 →
                </button>
              </div>
            )}

            {error && <div style={{ background:"rgba(244,63,94,0.1)", border:"1px solid rgba(244,63,94,0.3)", borderRadius:"12px", padding:"12px 16px", color:"#f43f5e", fontSize:"14px" }}>⚠️ {error}</div>}
          </div>
        )}

        {/* ── STEP 2: CONFIG ── */}
        {step==="config" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"16px", padding:"16px", border:"1px solid rgba(167,139,250,0.2)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                <p style={{ color:"#a78bfa", fontSize:"12px", margin:0, fontWeight:"700" }}>출제 범위: {getSourceLabel()}</p>
                <button onClick={() => setStep("upload")} style={{ background:"rgba(255,255,255,0.1)", border:"none", color:"#94a3b8", borderRadius:"8px", padding:"4px 10px", fontSize:"11px", cursor:"pointer" }}>변경</button>
              </div>
              {hasImages && (
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom: hasText ? "8px" : 0 }}>
                  {uploadedImages.map((img, idx) => (
                    <img key={idx} src={img.url} alt={`이미지${idx+1}`} style={{ width:"50px", height:"50px", objectFit:"cover", borderRadius:"8px", border:"1px solid rgba(167,139,250,0.3)" }} />
                  ))}
                </div>
              )}
              {hasText && (
                <p style={{ color:"#94a3b8", fontSize:"12px", margin:0, lineHeight:"1.5", background:"rgba(255,255,255,0.04)", padding:"8px 10px", borderRadius:"8px" }}>
                  ✏️ {textInput.slice(0,80)}{textInput.length>80?"...":""}
                </p>
              )}
            </div>

            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"16px", padding:"20px", border:"1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ color:"#a78bfa", fontSize:"13px", fontWeight:"700", margin:"0 0 12px", textTransform:"uppercase", letterSpacing:"1px" }}>출제 범위 설정</p>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {SCOPE_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={()=>setScope(opt.id)} style={{ padding:"12px 16px", borderRadius:"12px", border:`2px solid ${scope===opt.id?"#a78bfa":"transparent"}`, background:scope===opt.id?"rgba(167,139,250,0.15)":"rgba(255,255,255,0.05)", color:scope===opt.id?"#e2e8f0":"#94a3b8", textAlign:"left", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div><p style={{ margin:0, fontSize:"14px", fontWeight:scope===opt.id?"700":"400" }}>{opt.label}</p><p style={{ margin:"2px 0 0", fontSize:"11px", opacity:0.7 }}>{opt.desc}</p></div>
                    {scope===opt.id && <span style={{ color:"#a78bfa" }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"16px", padding:"20px", border:"1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ color:"#a78bfa", fontSize:"13px", fontWeight:"700", margin:"0 0 12px", textTransform:"uppercase", letterSpacing:"1px" }}>학년 선택</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                {GRADES.map(g => (
                  <button key={g.label} onClick={()=>setGrade(g.label)} style={{ padding:"8px 14px", borderRadius:"20px", border:"none", cursor:"pointer", background:grade===g.label?"#7c3aed":"rgba(255,255,255,0.1)", color:grade===g.label?"#fff":"#94a3b8", fontSize:"13px", fontWeight:grade===g.label?"700":"400" }}>{g.label}</button>
                ))}
              </div>
            </div>

            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"16px", padding:"20px", border:"1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ color:"#a78bfa", fontSize:"13px", fontWeight:"700", margin:"0 0 12px", textTransform:"uppercase", letterSpacing:"1px" }}>과목 선택</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                {SUBJECTS.map(s => <button key={s} onClick={()=>setSubject(s)} style={{ padding:"8px 14px", borderRadius:"20px", border:"none", cursor:"pointer", background:subject===s?"#7c3aed":"rgba(255,255,255,0.1)", color:subject===s?"#fff":"#94a3b8", fontSize:"13px", fontWeight:subject===s?"700":"400" }}>{s}</button>)}
              </div>
            </div>

            {subject==="영어" && (
              <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"16px", padding:"20px", border:"1px solid rgba(96,165,250,0.3)" }}>
                <p style={{ color:"#60a5fa", fontSize:"13px", fontWeight:"700", margin:"0 0 12px", textTransform:"uppercase", letterSpacing:"1px" }}>영어 문제 형식</p>
                <div style={{ display:"flex", gap:"8px" }}>
                  {ENGLISH_TYPES.map(t => (
                    <button key={t.id} onClick={()=>setEnglishType(t.id)} style={{ flex:1, padding:"12px 8px", borderRadius:"12px", border:`2px solid ${englishType===t.id?"#60a5fa":"transparent"}`, background:englishType===t.id?"rgba(96,165,250,0.15)":"rgba(255,255,255,0.07)", color:englishType===t.id?"#60a5fa":"#94a3b8", cursor:"pointer", textAlign:"center" }}>
                      <div style={{ fontSize:"13px", fontWeight:englishType===t.id?"700":"400" }}>{t.label}</div>
                      <div style={{ fontSize:"10px", marginTop:"3px", opacity:0.7 }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
            <button onClick={generateQuiz} style={{ width:"100%", padding:"18px", borderRadius:"16px", border:"none", background:"linear-gradient(135deg,#7c3aed,#a855f7)", color:"#fff", fontSize:"17px", fontWeight:"800", cursor:"pointer", boxShadow:"0 8px 32px rgba(124,58,237,0.4)" }}>✨ AI 문제 생성하기 ({getSourceLabel()})</button>
          </div>
        )}

        {/* ── LOADING ── */}
        {step==="loading" && (
          <div style={{ textAlign:"center", padding:"80px 24px" }}>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            <div style={{ fontSize:"56px", marginBottom:"24px", animation:"spin 2s linear infinite", display:"inline-block" }}>🔮</div>
            <p style={{ color:"#e2e8f0", fontSize:"20px", fontWeight:"700", margin:"0 0 8px" }}>AI가 문제를 만들고 있어요</p>
            <p style={{ color:"#94a3b8", fontSize:"14px" }}>{getSourceLabel()} 분석 중... 잠깐만요!</p>
          </div>
        )}

        {/* ── STEP 3: RESULT ── */}
        {step==="result" && quizData && (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div style={{ background:"rgba(124,58,237,0.2)", borderRadius:"14px", padding:"16px 20px", border:"1px solid rgba(167,139,250,0.3)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"8px" }}>
              <div><p style={{ color:"#a78bfa", fontSize:"12px", margin:"0 0 2px" }}>출제 범위: {getSourceLabel()}</p><p style={{ color:"#e2e8f0", fontSize:"16px", fontWeight:"700", margin:0 }}>{quizData.topic}</p></div>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                <span style={{ background:"#6d28d9", color:"#fff", padding:"4px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:"700" }}>{grade}</span>
                <span style={{ background:"#7c3aed", color:"#fff", padding:"4px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:"700" }}>{subject}</span>
                <span style={{ background:diff.color+"33", color:diff.color, padding:"4px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:"700", border:`1px solid ${diff.color}44` }}>{diff.emoji} {diff.label}</span>
              </div>
            </div>

            {showAnswers && score && (
              <div style={{ background:"linear-gradient(135deg,rgba(74,222,128,0.15),rgba(34,197,94,0.1))", border:"1px solid rgba(74,222,128,0.3)", borderRadius:"14px", padding:"20px" }}>
                {score.total > 0 && (
                  <div style={{ textAlign:"center", marginBottom: quizData.questions.filter(q=>q.type==="서술형"||q.type==="단답형").length > 0 ? "14px" : 0, paddingBottom: quizData.questions.filter(q=>q.type==="서술형"||q.type==="단답형").length > 0 ? "14px" : 0, borderBottom: quizData.questions.filter(q=>q.type==="서술형"||q.type==="단답형").length > 0 ? "1px solid rgba(74,222,128,0.2)" : "none" }}>
                    <p style={{ color:"#94a3b8", fontSize:"12px", margin:"0 0 4px", fontWeight:"700" }}>객관식</p>
                    <p style={{ color:"#4ade80", fontSize:"28px", fontWeight:"900", margin:"0 0 2px" }}>{score.correct} / {score.total}</p>
                    <p style={{ color:"#86efac", fontSize:"13px", margin:0 }}>{Math.round(score.correct/score.total*100)}%</p>
                  </div>
                )}
                {quizData.questions.filter(q=>q.type==="서술형"||q.type==="단답형").length > 0 && (
                  <div>
                    <p style={{ color:"#94a3b8", fontSize:"12px", margin:"0 0 10px", fontWeight:"700", textAlign:"center" }}>서술형</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                      {quizData.questions.filter(q=>q.type==="서술형"||q.type==="단답형").map((q,i) => {
                        const er = essayScores[q.id];
                        return (
                          <div key={q.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", borderRadius:"10px", background:"rgba(255,255,255,0.05)" }}>
                            <span style={{ color:"#cbd5e1", fontSize:"13px" }}>서술형 {i+1}번</span>
                            {gradingEssay && !er ? <span style={{ color:"#fbbf24", fontSize:"12px" }}>채점 중...</span>
                              : er ? <span style={{ color:er.result==="정답"?"#4ade80":er.result==="부분정답"?"#fbbf24":"#f43f5e", fontSize:"13px", fontWeight:"700" }}>{er.result} ({er.score}점)</span>
                              : <span style={{ color:"#64748b", fontSize:"12px" }}>미채점</span>}
                          </div>
                        );
                      })}
                    </div>
                    {!gradingEssay && Object.keys(essayScores).length > 0 && (
                      <div style={{ marginTop:"10px", textAlign:"center" }}>
                        <p style={{ color:"#fbbf24", fontSize:"20px", fontWeight:"900", margin:"0 0 2px" }}>{Math.round(Object.values(essayScores).reduce((s,r)=>s+r.score,0)/Object.values(essayScores).length)}점</p>
                        <p style={{ color:"#fde68a", fontSize:"12px", margin:0 }}>서술형 평균</p>
                      </div>
                    )}
                  </div>
                )}
                {gradingEssay && <p style={{ color:"#fbbf24", fontSize:"13px", margin:"10px 0 0", textAlign:"center" }}>✨ 서술형 AI 채점 중...</p>}
              </div>
            )}

            {quizData.questions.map((q,idx) => {
              const myAnswer = selectedAnswers[q.id];
              const isCorrect = showAnswers && q.type==="객관식" && myAnswer === q.answer;
              const isWrong = showAnswers && q.type==="객관식" && myAnswer && myAnswer !== q.answer;
              const essayResult = essayScores[q.id];
              return (
                <div key={q.id} style={{ background:isCorrect?"rgba(74,222,128,0.08)":isWrong?"rgba(244,63,94,0.08)":"rgba(255,255,255,0.05)", border:`1px solid ${isCorrect?"rgba(74,222,128,0.3)":isWrong?"rgba(244,63,94,0.3)":"rgba(255,255,255,0.08)"}`, borderRadius:"16px", padding:"20px" }}>
                  <div style={{ display:"flex", gap:"8px", marginBottom:"12px", flexWrap:"wrap" }}>
                    <span style={{ background:"#7c3aed", color:"#fff", borderRadius:"8px", padding:"2px 8px", fontSize:"12px", fontWeight:"800" }}>Q{idx+1}</span>
                    <span style={{ background:"rgba(255,255,255,0.1)", color:"#94a3b8", borderRadius:"6px", padding:"2px 8px", fontSize:"11px" }}>{q.type}</span>
                    {showAnswers && q.type==="객관식" && (
                      <span style={{ background:isCorrect?"rgba(74,222,128,0.2)":"rgba(244,63,94,0.2)", color:isCorrect?"#4ade80":"#f43f5e", borderRadius:"6px", padding:"2px 8px", fontSize:"11px", fontWeight:"700" }}>{isCorrect?"✓ 정답":"✗ 오답"}</span>
                    )}
                    {showAnswers && essayResult && (
                      <span style={{ background:essayResult.result==="정답"?"rgba(74,222,128,0.2)":essayResult.result==="부분정답"?"rgba(251,191,36,0.2)":"rgba(244,63,94,0.2)", color:essayResult.result==="정답"?"#4ade80":essayResult.result==="부분정답"?"#fbbf24":"#f43f5e", borderRadius:"6px", padding:"2px 8px", fontSize:"11px", fontWeight:"700" }}>
                        {essayResult.result} ({essayResult.score}점)
                      </span>
                    )}
                  </div>
                  <p style={{ color:"#e2e8f0", fontSize:"15px", fontWeight:"600", margin:"0 0 14px", lineHeight:"1.6" }}>{q.question}</p>

                  {q.type==="객관식" && q.options && (
                    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                      {q.options.map((opt,oi) => {
                        const isSelected = myAnswer === opt;
                        const isAnswer = showAnswers && opt === q.answer;
                        const isMyWrong = showAnswers && isSelected && !isAnswer;
                        return (
                          <button key={oi} onClick={()=>handleSelectAnswer(q.id,opt)} style={{ padding:"12px 16px", borderRadius:"10px", border:`2px solid ${isAnswer?"#4ade80":isMyWrong?"#f43f5e":isSelected?"#a78bfa":"rgba(255,255,255,0.1)"}`, background:isAnswer?"rgba(74,222,128,0.12)":isMyWrong?"rgba(244,63,94,0.1)":isSelected?"rgba(167,139,250,0.15)":"rgba(255,255,255,0.03)", color:isAnswer?"#4ade80":isMyWrong?"#f43f5e":isSelected?"#a78bfa":"#cbd5e1", textAlign:"left", cursor:showAnswers?"default":"pointer", fontSize:"14px", fontWeight:isSelected||isAnswer?"700":"400", display:"flex", alignItems:"center", gap:"8px" }}>
                            <span style={{ flex:1 }}>{opt}</span>
                            {isAnswer && showAnswers && <span style={{ fontSize:"11px", flexShrink:0 }}>✓ 정답</span>}
                            {isMyWrong && <span style={{ fontSize:"11px", flexShrink:0 }}>← 내 선택</span>}
                          </button>
                        );
                      })}
                      {showAnswers && myAnswer && myAnswer !== q.answer && (
                        <div style={{ padding:"10px 14px", borderRadius:"10px", background:"rgba(244,63,94,0.08)", border:"1px solid rgba(244,63,94,0.2)", fontSize:"13px" }}>
                          <span style={{ color:"#f43f5e" }}>내가 선택: </span><span style={{ color:"#fca5a5" }}>{myAnswer}</span>
                          <span style={{ color:"#64748b", margin:"0 8px" }}>→</span>
                          <span style={{ color:"#4ade80" }}>정답: </span><span style={{ color:"#86efac" }}>{q.answer}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {(q.type==="단답형"||q.type==="서술형") && (
                    <div>
                      <textarea disabled={showAnswers} value={myAnswer||""} onChange={e=>handleSelectAnswer(q.id,e.target.value)} placeholder="여기에 답을 써보세요 ✏️" style={{ width:"100%", minHeight:"80px", background:"rgba(255,255,255,0.05)", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.15)", padding:"12px", color:"#e2e8f0", fontSize:"14px", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit" }} />
                      {showAnswers && (
                        <div style={{ marginTop:"10px", padding:"12px", borderRadius:"10px", background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.2)" }}>
                          <p style={{ color:"#4ade80", fontSize:"11px", margin:"0 0 6px", fontWeight:"700" }}>✅ 모범 답안</p>
                          <p style={{ color:"#e2e8f0", margin:0, fontSize:"14px" }}>{q.answer}</p>
                        </div>
                      )}
                      {showAnswers && essayResult && (
                        <div style={{ marginTop:"8px", padding:"12px", borderRadius:"10px", background:essayResult.result==="정답"?"rgba(74,222,128,0.08)":essayResult.result==="부분정답"?"rgba(251,191,36,0.08)":"rgba(244,63,94,0.08)", border:`1px solid ${essayResult.result==="정답"?"rgba(74,222,128,0.2)":essayResult.result==="부분정답"?"rgba(251,191,36,0.2)":"rgba(244,63,94,0.2)"}` }}>
                          <p style={{ color:essayResult.result==="정답"?"#4ade80":essayResult.result==="부분정답"?"#fbbf24":"#f43f5e", fontSize:"12px", margin:"0 0 4px", fontWeight:"700" }}>AI 채점: {essayResult.result} ({essayResult.score}점)</p>
                          <p style={{ color:"#cbd5e1", fontSize:"13px", margin:0 }}>{essayResult.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {showAnswers && (
                    <div style={{ marginTop:"12px", padding:"12px", borderRadius:"10px", background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)" }}>
                      <p style={{ color:"#a78bfa", fontSize:"11px", margin:"0 0 4px", fontWeight:"700" }}>💡 해설</p>
                      <p style={{ color:"#cbd5e1", fontSize:"13px", margin:0, lineHeight:"1.5" }}>{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ display:"flex", gap:"10px", paddingBottom:"24px" }}>
              {!showAnswers && <button onClick={handleSubmit} style={{ flex:1, padding:"16px", borderRadius:"14px", border:"none", background:"linear-gradient(135deg,#059669,#10b981)", color:"#fff", fontSize:"15px", fontWeight:"800", cursor:"pointer" }}>📝 채점하기</button>}
              <button onClick={()=>{setStep("config");setSelectedAnswers({});setShowAnswers(false);setScore(null);setEssayScores({});}} style={{ flex:1, padding:"16px", borderRadius:"14px", background:"rgba(124,58,237,0.3)", border:"1px solid rgba(167,139,250,0.3)", color:"#a78bfa", fontSize:"15px", fontWeight:"700", cursor:"pointer" }}>🔄 다시 생성</button>
              <button onClick={reset} style={{ padding:"16px 20px", borderRadius:"14px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)", color:"#64748b", fontSize:"15px", cursor:"pointer" }}>🏠</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
