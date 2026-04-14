'use client';
import { useState, useEffect } from 'react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
  * { box-sizing: border-box; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation: fadeUp 0.35s ease both; }
`;

export default function WrongNote({ onBack }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filterSubject, setFilterSubject] = useState('전체');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('wrongNote') || '[]');
    setItems(saved);
  }, []);

  const subjects = ['전체', ...new Set(items.map(i => i.subject))];

  const filtered = filterSubject === '전체' ? items : items.filter(i => i.subject === filterSubject);

  const deleteItem = (id) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    localStorage.setItem('wrongNote', JSON.stringify(updated));
    setSelected(null);
  };

  const clearAll = () => {
    if (confirm('오답보관함을 전체 삭제할까요?')) {
      setItems([]);
      localStorage.removeItem('wrongNote');
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#f5f6fa', fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", paddingBottom:40 }}>
      <style>{CSS}</style>

      {/* 헤더 */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f5', padding:'16px 20px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:640, margin:'0 auto', display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onBack} style={{ width:36, height:36, borderRadius:10, border:'1.5px solid #e8e9ef', background:'#fff', cursor:'pointer', fontSize:18, flexShrink:0 }}>←</button>
          <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,#f59e0b,#ef4444)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📝</div>
          <div style={{ flex:1 }}>
            <h1 style={{ margin:0, fontSize:17, fontWeight:800, color:'#1a1a2e' }}>오답보관함</h1>
            <p style={{ margin:0, fontSize:11, color:'#999' }}>틀린 문제 {items.length}개 저장됨</p>
          </div>
          {items.length > 0 && (
            <button onClick={clearAll} style={{ background:'none', border:'none', color:'#ef4444', fontSize:12, cursor:'pointer', fontWeight:700 }}>전체삭제</button>
          )}
        </div>
      </div>

      <div style={{ maxWidth:640, margin:'0 auto', padding:'16px' }}>

        {items.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 24px' }} className="fade-up">
            <div style={{ fontSize:52, marginBottom:16 }}>📭</div>
            <p style={{ fontSize:18, fontWeight:900, color:'#1a1a2e', margin:'0 0 8px' }}>오답이 없어요!</p>
            <p style={{ fontSize:13, color:'#999' }}>시험문제를 풀고 채점하면 틀린 문제가 여기에 저장돼요</p>
          </div>
        ) : (
          <>
            {/* 과목 필터 */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
              {subjects.map(s => (
                <button key={s} onClick={()=>setFilterSubject(s)}
                  style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${filterSubject===s?'#f59e0b':'#e8e9ef'}`, background: filterSubject===s?'#fffbeb':'#fff', color: filterSubject===s?'#d97706':'#555', fontSize:13, fontWeight: filterSubject===s?700:500, cursor:'pointer', fontFamily:'inherit' }}>
                  {s}
                </button>
              ))}
            </div>

            {/* 오답 목록 */}
            {filtered.map((item, idx) => (
              <div key={item.id} className="fade-up" style={{ background:'#fff', borderRadius:20, border:'1.5px solid #fde68a', padding:16, marginBottom:10, cursor:'pointer' }}
                onClick={()=>setSelected(selected?.id === item.id ? null : item)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <span style={{ background:'#fef3c7', color:'#d97706', borderRadius:8, padding:'3px 10px', fontSize:11, fontWeight:800 }}>{item.subject}</span>
                    <span style={{ background:'#f1f2f6', color:'#666', borderRadius:8, padding:'3px 10px', fontSize:11 }}>{item.grade}</span>
                    <span style={{ background:'#f1f2f6', color:'#666', borderRadius:8, padding:'3px 10px', fontSize:11 }}>{item.date}</span>
                  </div>
                  <button onClick={e=>{ e.stopPropagation(); deleteItem(item.id); }}
                    style={{ background:'none', border:'none', color:'#bbb', fontSize:16, cursor:'pointer', padding:'0 4px' }}>×</button>
                </div>
                <p style={{ margin:'0 0 8px', fontSize:14, fontWeight:700, color:'#1a1a2e', lineHeight:1.6 }}>{item.question}</p>

                {selected?.id === item.id && (
                  <div style={{ marginTop:12 }}>
                    {/* 선택지 */}
                    {item.options && (
                      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                        {item.options.map((opt, oi) => {
                          const isAnswer = opt === item.answer;
                          const isMyWrong = opt === item.myAnswer && !isAnswer;
                          return (
                            <div key={oi} style={{ padding:'10px 14px', borderRadius:12, border:`1.5px solid ${isAnswer?'#10b981':isMyWrong?'#ef4444':'#e8e9ef'}`, background: isAnswer?'#ecfdf5':isMyWrong?'#fef2f2':'#f8f8fc', fontSize:13, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <span style={{ color: isAnswer?'#059669':isMyWrong?'#ef4444':'#555' }}>{opt}</span>
                              {isAnswer && <span style={{ fontSize:11, color:'#059669', fontWeight:800 }}>✓ 정답</span>}
                              {isMyWrong && <span style={{ fontSize:11, color:'#ef4444', fontWeight:800 }}>← 내 답</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* 해설 */}
                    <div style={{ background:'#f5f3ff', borderRadius:14, padding:'12px 14px', border:'1px solid #ddd6fe' }}>
                      <p style={{ margin:'0 0 4px', fontSize:11, fontWeight:700, color:'#6366f1' }}>💡 해설</p>
                      <p style={{ margin:0, fontSize:13, color:'#374151', lineHeight:1.6 }}>{item.explanation}</p>
                    </div>
                  </div>
                )}

                <div style={{ marginTop:8, fontSize:12, color:'#bbb', textAlign:'right' }}>
                  {selected?.id === item.id ? '▲ 접기' : '▼ 해설 보기'}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
