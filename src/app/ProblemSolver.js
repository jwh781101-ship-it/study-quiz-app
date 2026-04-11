'use client';
import { useState, useRef, useCallback } from 'react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; background: #f5f6fa; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation: fadeUp 0.35s ease both; }
  @keyframes dotBounce { 0%,80%,100%{transform:translateY(0);opacity:0.35} 40%{transform:translateY(-10px);opacity:1} }
`;

const BLOCKED_KEYWORDS = [
  '논술', '에세이', '작문', '글쓰기', '일기', '편지', '소설', '시를',
  '대신 써', '써줘', '작성해', '대필', '숙제 해줘', '숙제해줘',
  '번역해줘', '번역 해줘', '요약해줘', '요약 해줘',
];

function isBlockedRequest(text) {
  return BLOCKED_KEYWORDS.some(kw => text.includes(kw));
}

export default function ProblemSolver({ onBack }) {
  const [images, setImages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [step, setStep] = useState('upload');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [hintOnly, setHintOnly] = useState(false);
  const galleryRef = useRef();
  const cameraRef = useRef();

  const hasContent = images.length > 0 || textInput.trim().length > 0;

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
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve({ url, base64: canvas.toDataURL('image/jpeg', 0.7).split(',')[1], type: 'image/jpeg' });
    };
    img.src = url;
  });

  const processFiles = useCallback((files) => {
    Array.from(files).slice(0, 5).forEach(async file => {
      if (!file.type.startsWith('image/')) return;
      const compressed = await compressImage(file);
      setImages(prev => prev.length >= 5 ? prev : [...prev, compressed]);
    });
  }, []);

  const solve = async () => {
    if (!hasContent) { setError('문제 사진을 올리거나 텍스트를 입력해주세요!'); return; }

    if (textInput.trim() && isBlockedRequest(textInput)) {
      setError('⚠️ 이 기능은 문제 풀이 전용이에요. 논술 작성, 번역, 요약 등은 지원하지 않아요!');
      return;
    }

    setStep('loading'); setError(null);

    const textSection = textInput.trim() ? `\n\n[텍스트로 입력된 문제]\n${textInput}` : '';

    const prompt = hintOnly
      ? `당신은 학생의 학습을 돕는 선생님입니다.
아래 문제의 힌트만 알려주세요. 절대 정답을 직접 알려주지 마세요.
만약 문제 풀이와 관련없는 요청(논술 작성, 번역, 요약, 숙제 대필 등)이면 반드시 거절하세요.${textSection}

반드시 JSON으로만 응답:
{"is_valid":true또는false,"reject_reason":"거절 이유(is_valid가 false일때만)","problem":"문제 내용 요약","hint1":"첫번째 힌트","hint2":"두번째 힌트","hint3":"세번째 힌트","key_concept":"핵심 개념"}`
      : `당신은 학생의 학습을 돕는 선생님입니다.
아래 문제를 단계별로 풀어주세요.
만약 문제 풀이와 관련없는 요청(논술 작성, 번역, 요약, 숙제 대필 등)이면 반드시 거절하세요.
서술형 답안이라도 모범 답안 방향만 간략히 제시하고, 전체 글을 대신 써주지 마세요.${textSection}

반드시 JSON으로만 응답:
{"is_valid":true또는false,"reject_reason":"거절 이유(is_valid가 false일때만)","problem":"문제 내용 요약","subject":"과목","answer":"최종 답 또는 핵심 키워드","steps":[{"step":1,"title":"단계 제목","content":"상세 풀이"},{"step":2,"title":"단계 제목","content":"상세 풀이"}],"key_concept":"핵심 개념 설명","tip":"시험 팁 (있으면)"}`;

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map(img => ({ base64: img.base64, type: img.type })),
          prompt,
          isSolving: true
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      if (data.is_valid === false) {
        setError(`⚠️ ${data.reject_reason || '문제 풀이와 관련없는 요청은 처리할 수 없어요!'}`);
        setStep('upload');
        return;
      }

      setResult(data);
      setStep('result');
    } catch(e) {
      setError(e.message || '풀이에 실패했어요. 다시 시도해주세요.');
      setStep('upload');
    }
  };

  const reset = () => {
    setImages([]); setTextInput(''); setShowTextInput(false);
    setResult(null); setError(null); setStep('upload');
  };

  return (
    <div style={{ minHeight:'100vh', background:'#f5f6fa', fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", paddingBottom:40 }}>
      <style>{CSS}</style>
      <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e=>{ processFiles(e.target.files); e.target.value=''; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e=>{ processFiles(e.target.files); e.target.value=''; }} />

      {/* 헤더 */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f5', padding:'16px 20px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:640, margin:'0 auto', display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onBack} style={{ width:36, height:36, borderRadius:10, border:'1.5px solid #e8e9ef', background:'#fff', cursor:'pointer', fontSize:18, flexShrink:0 }}>←</button>
          <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,#10b981,#059669)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📝</div>
          <div>
            <h1 style={{ margin:0, fontSize:17, fontWeight:800, color:'#1a1a2e' }}>문제 풀이 도우미</h1>
            <p style={{ margin:0, fontSize:11, color:'#999' }}>AI가 단계별로 풀어드려요</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:640, margin:'0 auto', padding:'16px' }}>

        {step === 'upload' && (
          <div className="fade-up">
            <div style={{ textAlign:'center', padding:'24px 0 20px' }}>
              <div style={{ fontSize:52, marginBottom:8 }}>📝</div>
              <h2 style={{ margin:'0 0 6px', fontSize:22, fontWeight:900, color:'#1a1a2e' }}>문제를 올려주세요</h2>
              <p style={{ margin:0, fontSize:13, color:'#999' }}>사진, 갤러리, 텍스트 중 선택하세요</p>
            </div>

            {/* 안내 배너 */}
            <div style={{ background:'#fffbeb', border:'1.5px solid #fde68a', borderRadius:14, padding:'10px 14px', marginBottom:12, fontSize:12, color:'#92400e', lineHeight:1.6 }}>
              ⚠️ <b>문제 풀이 전용</b>이에요. 논술 작성·번역·요약·숙제 대필은 지원하지 않아요.
            </div>

            {/* 카메라 */}
            <button onClick={()=>cameraRef.current?.click()} style={{ width:'100%', padding:'18px 20px', borderRadius:20, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', display:'flex', alignItems:'center', gap:16, cursor:'pointer', marginBottom:10, boxShadow:'0 4px 20px rgba(16,185,129,0.3)', textAlign:'left' }}>
              <div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>📷</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:16, fontWeight:800 }}>카메라로 찍기</p>
                <p style={{ margin:'3px 0 0', fontSize:12, opacity:0.8 }}>문제를 바로 촬영</p>
              </div>
              <span style={{ fontSize:20, opacity:0.6 }}>›</span>
            </button>

            {/* 갤러리 */}
            <button onClick={()=>galleryRef.current?.click()} style={{ width:'100%', padding:'18px 20px', borderRadius:20, border:'2px solid #e8e9ef', background:'#fff', color:'#333', display:'flex', alignItems:'center', gap:16, cursor:'pointer', marginBottom:10, textAlign:'left' }}>
              <div style={{ width:48, height:48, borderRadius:14, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>🖼️</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:16, fontWeight:800, color:'#1a1a2e' }}>갤러리에서 선택</p>
                <p style={{ margin:'3px 0 0', fontSize:12, color:'#999' }}>최대 5장</p>
              </div>
              <span style={{ fontSize:20, color:'#ccc' }}>›</span>
            </button>

            {/* 텍스트 입력 */}
            <button onClick={()=>setShowTextInput(v=>!v)} style={{ width:'100%', padding:'18px 20px', borderRadius:20, border:`2px solid ${showTextInput?'#10b981':'#e8e9ef'}`, background: showTextInput?'#f0fdf4':'#fff', color:'#333', display:'flex', alignItems:'center', gap:16, cursor:'pointer', marginBottom:10, textAlign:'left' }}>
              <div style={{ width:48, height:48, borderRadius:14, background: showTextInput?'#d1fae5':'#f0f0f8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>✏️</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:16, fontWeight:800, color:'#1a1a2e' }}>텍스트 붙여넣기</p>
                <p style={{ margin:'3px 0 0', fontSize:12, color:'#999' }}>문제를 직접 입력 또는 복사</p>
              </div>
              <span style={{ fontSize:18, color: showTextInput?'#10b981':'#ccc', transition:'transform 0.2s', display:'inline-block', transform: showTextInput?'rotate(90deg)':'none' }}>›</span>
            </button>

            {showTextInput && (
              <div style={{ background:'#fff', borderRadius:20, padding:16, marginBottom:10, border:'1.5px solid #e8e9ef' }}>
                <textarea
                  value={textInput}
                  onChange={e=>setTextInput(e.target.value)}
                  placeholder={'문제를 붙여넣거나 직접 입력하세요\n\n예시)\n다음 방정식을 풀어라: 2x + 5 = 13\n\n※ 논술 작성·번역·요약은 지원하지 않아요'}
                  style={{ width:'100%', minHeight:140, background:'#f8f8fc', borderRadius:12, border:'1.5px solid #e8e9ef', padding:'12px 14px', color:'#333', fontSize:14, resize:'vertical', boxSizing:'border-box', fontFamily:'inherit', lineHeight:1.6, outline:'none' }}
                />
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
                  <span style={{ color:'#bbb', fontSize:12 }}>{textInput.length}자</span>
                  {textInput && <button onClick={()=>setTextInput('')} style={{ background:'none', border:'none', color:'#ef4444', fontSize:12, cursor:'pointer' }}>전체 지우기</button>}
                </div>
              </div>
            )}

            {/* 업로드된 이미지 */}
            {images.length > 0 && (
              <div style={{ background:'#fff', borderRadius:20, padding:16, marginBottom:12, border:'1.5px solid #e8e9ef' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'#10b981' }}>📷 {images.length}장 선택됨</span>
                  {images.length < 5 && <button onClick={()=>galleryRef.current?.click()} style={{ background:'#f0fdf4', border:'none', color:'#10b981', borderRadius:8, padding:'4px 10px', fontSize:12, cursor:'pointer', fontWeight:700 }}>+ 추가</button>}
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {images.map((img, idx) => (
                    <div key={idx} style={{ position:'relative' }}>
                      <img src={img.url} alt="" style={{ width:64, height:64, objectFit:'cover', borderRadius:12, border:'2px solid #e8e9ef' }} />
                      <button onClick={()=>setImages(prev=>prev.filter((_,i)=>i!==idx))} style={{ position:'absolute', top:-6, right:-6, width:20, height:20, borderRadius:'50%', background:'#ef4444', border:'2px solid #fff', color:'#fff', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 버튼 */}
            {hasContent && (
              <div style={{ background:'#fff', borderRadius:20, padding:16, marginBottom:12, border:'1.5px solid #d1fae5' }}>
                <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                  <button onClick={()=>setHintOnly(false)} style={{ flex:1, padding:'12px 8px', borderRadius:14, border:`2px solid ${!hintOnly?'#10b981':'#e8e9ef'}`, background:!hintOnly?'#f0fdf4':'#fff', color:!hintOnly?'#10b981':'#888', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:13 }}>
                    📖 단계별 풀이
                  </button>
                  <button onClick={()=>setHintOnly(true)} style={{ flex:1, padding:'12px 8px', borderRadius:14, border:`2px solid ${hintOnly?'#10b981':'#e8e9ef'}`, background:hintOnly?'#f0fdf4':'#fff', color:hintOnly?'#10b981':'#888', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:13 }}>
                    💡 힌트만 보기
                  </button>
                </div>
                <button onClick={solve} style={{ width:'100%', padding:18, borderRadius:16, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:17, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 20px rgba(16,185,129,0.35)' }}>
                  ✨ AI가 풀어줘!
                </button>
              </div>
            )}

            {error && (
              <div style={{ background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:14, padding:'12px 16px', color:'#ef4444', fontSize:13, lineHeight:1.6 }}>
                {error}
              </div>
            )}
          </div>
        )}

        {step === 'loading' && (
          <div style={{ textAlign:'center', padding:'80px 24px' }} className="fade-up">
            <div style={{ fontSize:52, marginBottom:16 }}>🤔</div>
            <p style={{ fontSize:18, fontWeight:900, color:'#1a1a2e', margin:'0 0 8px' }}>AI가 문제를 풀고 있어요</p>
            <p style={{ fontSize:13, color:'#999', margin:'0 0 24px' }}>잠깐만 기다려주세요~</p>
            <div style={{ display:'flex', justifyContent:'center', gap:7 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:11, height:11, borderRadius:'50%', background:'#10b981', animation:'dotBounce 1.2s ease-in-out infinite', animationDelay:`${i*0.18}s` }} />
              ))}
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="fade-up">
            <div style={{ background:'linear-gradient(135deg,#10b981,#059669)', borderRadius:20, padding:20, marginBottom:12, color:'#fff' }}>
              <p style={{ margin:'0 0 4px', fontSize:12, opacity:0.8 }}>인식된 문제</p>
              <p style={{ margin:'0 0 8px', fontSize:16, fontWeight:800, lineHeight:1.5 }}>{result.problem}</p>
              {result.subject && <span style={{ background:'rgba(255,255,255,0.2)', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>{result.subject}</span>}
            </div>

            {hintOnly && (
              <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #e8e9ef', padding:20, marginBottom:12 }}>
                <p style={{ margin:'0 0 16px', fontSize:15, fontWeight:900, color:'#1a1a2e' }}>💡 힌트</p>
                {[result.hint1, result.hint2, result.hint3].filter(Boolean).map((hint, i) => (
                  <div key={i} style={{ display:'flex', gap:12, marginBottom:12, padding:'12px 14px', background:'#f0fdf4', borderRadius:14, border:'1px solid #a7f3d0' }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:'#10b981', color:'#fff', fontSize:12, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                    <p style={{ margin:0, fontSize:14, color:'#065f46', lineHeight:1.6 }}>{hint}</p>
                  </div>
                ))}
                {result.key_concept && (
                  <div style={{ marginTop:12, padding:'12px 14px', background:'#fffbeb', borderRadius:14, border:'1px solid #fde68a' }}>
                    <p style={{ margin:'0 0 4px', fontSize:11, fontWeight:700, color:'#d97706' }}>📌 핵심 개념</p>
                    <p style={{ margin:0, fontSize:13, color:'#92400e', lineHeight:1.6 }}>{result.key_concept}</p>
                  </div>
                )}
              </div>
            )}

            {!hintOnly && (
              <>
                <div style={{ background:'#fff', borderRadius:20, border:'2px solid #10b981', padding:20, marginBottom:12 }}>
                  <p style={{ margin:'0 0 8px', fontSize:13, fontWeight:700, color:'#10b981' }}>✅ 정답 / 핵심</p>
                  <p style={{ margin:0, fontSize:20, fontWeight:900, color:'#065f46', lineHeight:1.5 }}>{result.answer}</p>
                </div>

                <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #e8e9ef', padding:20, marginBottom:12 }}>
                  <p style={{ margin:'0 0 16px', fontSize:15, fontWeight:900, color:'#1a1a2e' }}>📖 단계별 풀이</p>
                  {result.steps?.map((s, i) => (
                    <div key={i} style={{ display:'flex', gap:12, marginBottom:14 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:13, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{s.step}</div>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:'0 0 4px', fontSize:14, fontWeight:800, color:'#1a1a2e' }}>{s.title}</p>
                        <p style={{ margin:0, fontSize:13, color:'#555', lineHeight:1.7 }}>{s.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {result.key_concept && (
                  <div style={{ background:'#f5f3ff', borderRadius:16, border:'1px solid #ddd6fe', padding:'14px 16px', marginBottom:12 }}>
                    <p style={{ margin:'0 0 4px', fontSize:11, fontWeight:700, color:'#6366f1' }}>💡 핵심 개념</p>
                    <p style={{ margin:0, fontSize:13, color:'#374151', lineHeight:1.6 }}>{result.key_concept}</p>
                  </div>
                )}

                {result.tip && (
                  <div style={{ background:'#fffbeb', borderRadius:16, border:'1px solid #fde68a', padding:'14px 16px', marginBottom:12 }}>
                    <p style={{ margin:'0 0 4px', fontSize:11, fontWeight:700, color:'#d97706' }}>⭐ 시험 팁</p>
                    <p style={{ margin:0, fontSize:13, color:'#92400e', lineHeight:1.6 }}>{result.tip}</p>
                  </div>
                )}

                <div style={{ background:'#f0fdf4', borderRadius:16, border:'1px solid #a7f3d0', padding:'12px 16px', marginBottom:12, textAlign:'center' }}>
                  <p style={{ margin:0, fontSize:13, color:'#059669', fontWeight:700 }}>
                    📚 풀이를 참고해서 스스로 다시 풀어보세요! 그래야 실력이 늘어요 😊
                  </p>
                </div>
              </>
            )}

            <div style={{ display:'flex', gap:8, paddingBottom:24 }}>
              <button onClick={reset} style={{ flex:1, padding:16, borderRadius:16, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>🔄 다른 문제 풀기</button>
              <button onClick={onBack} style={{ padding:'16px 20px', borderRadius:16, border:'1.5px solid #e8e9ef', background:'#fff', color:'#999', fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>🏠</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
