'use client';
import { useState, useEffect } from 'react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
  * { box-sizing: border-box; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation: fadeUp 0.35s ease both; }
  @keyframes barGrow { from{width:0} to{width:var(--w)} }
`;

export default function StudyStats({ onBack }) {
  const [stats, setStats] = useState(null);
  const [wrongItems, setWrongItems] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('studyStats') || '{"totalQuiz":0,"totalCorrect":0,"totalQuestions":0,"subjectStats":{},"recentDates":[]}');
    const wrong = JSON.parse(localStorage.getItem('wrongNote') || '[]');
    setStats(saved);
    setWrongItems(wrong);
  }, []);

  if (!stats) return null;

  const accuracy = stats.totalQuestions > 0 ? Math.round(stats.totalCorrect / stats.totalQuestions * 100) : 0;
  const wrongBySubject = wrongItems.reduce((acc, item) => {
    acc[item.subject] = (acc[item.subject] || 0) + 1;
    return acc;
  }, {});

  const subjectEntries = Object.entries(stats.subjectStats || {}).sort((a, b) => b[1].total - a[1].total);
  const maxTotal = subjectEntries.length > 0 ? Math.max(...subjectEntries.map(([,v]) => v.total)) : 1;

  return (
    <div style={{ minHeight:'100vh', background:'#f5f6fa', fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", paddingBottom:40 }}>
      <style>{CSS}</style>

      {/* 헤더 */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f5', padding:'16px 20px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:640, margin:'0 auto', display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onBack} style={{ width:36, height:36, borderRadius:10, border:'1.5px solid #e8e9ef', background:'#fff', cursor:'pointer', fontSize:18, flexShrink:0 }}>←</button>
          <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📊</div>
          <div>
            <h1 style={{ margin:0, fontSize:17, fontWeight:800, color:'#1a1a2e' }}>학습 통계</h1>
            <p style={{ margin:0, fontSize:11, color:'#999' }}>나의 공부 현황</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:640, margin:'0 auto', padding:'16px' }}>

        {stats.totalQuiz === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 24px' }} className="fade-up">
            <div style={{ fontSize:52, marginBottom:16 }}>📊</div>
            <p style={{ fontSize:18, fontWeight:900, color:'#1a1a2e', margin:'0 0 8px' }}>아직 데이터가 없어요!</p>
            <p style={{ fontSize:13, color:'#999' }}>시험문제를 풀고 채점하면 통계가 쌓여요</p>
          </div>
        ) : (
          <div className="fade-up">

            {/* 핵심 지표 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
              {[
                { label:'총 시험 횟수', value:`${stats.totalQuiz}회`, emoji:'📝', color:'#6366f1', bg:'#eef2ff' },
                { label:'총 문제 수', value:`${stats.totalQuestions}문제`, emoji:'❓', color:'#3b82f6', bg:'#eff6ff' },
                { label:'전체 정답률', value:`${accuracy}%`, emoji:'🎯', color: accuracy >= 80?'#10b981':accuracy >= 60?'#f59e0b':'#ef4444', bg: accuracy >= 80?'#ecfdf5':accuracy >= 60?'#fffbeb':'#fef2f2' },
              ].map((item, i) => (
                <div key={i} style={{ background:'#fff', borderRadius:16, padding:'14px 10px', textAlign:'center', border:`1.5px solid ${item.bg}`, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize:24, marginBottom:6 }}>{item.emoji}</div>
                  <p style={{ margin:'0 0 4px', fontSize:18, fontWeight:900, color:item.color }}>{item.value}</p>
                  <p style={{ margin:0, fontSize:10, color:'#999', fontWeight:600 }}>{item.label}</p>
                </div>
              ))}
            </div>

            {/* 정답률 게이지 */}
            <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #e8e9ef', padding:20, marginBottom:14 }}>
              <p style={{ margin:'0 0 12px', fontSize:14, fontWeight:800, color:'#1a1a2e' }}>🎯 전체 정답률</p>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flex:1, height:14, background:'#f1f2f6', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${accuracy}%`, background: accuracy >= 80?'linear-gradient(135deg,#10b981,#059669)':accuracy >= 60?'linear-gradient(135deg,#f59e0b,#d97706)':'linear-gradient(135deg,#ef4444,#dc2626)', borderRadius:10, transition:'width 1s ease' }} />
                </div>
                <span style={{ fontSize:18, fontWeight:900, color:'#1a1a2e', minWidth:45 }}>{accuracy}%</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:11, color:'#bbb' }}>
                <span>맞은 문제: {stats.totalCorrect}개</span>
                <span>틀린 문제: {stats.totalQuestions - stats.totalCorrect}개</span>
              </div>
            </div>

            {/* 과목별 통계 */}
            {subjectEntries.length > 0 && (
              <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #e8e9ef', padding:20, marginBottom:14 }}>
                <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:800, color:'#1a1a2e' }}>📚 과목별 문제 수</p>
                {subjectEntries.map(([subject, data]) => {
                  const subjectAccuracy = data.total > 0 ? Math.round(data.correct / data.total * 100) : 0;
                  const barWidth = Math.round(data.total / maxTotal * 100);
                  return (
                    <div key={subject} style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>{subject}</span>
                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <span style={{ fontSize:12, color:'#999' }}>{data.total}문제</span>
                          <span style={{ fontSize:12, fontWeight:800, color: subjectAccuracy >= 80?'#10b981':subjectAccuracy >= 60?'#f59e0b':'#ef4444' }}>{subjectAccuracy}%</span>
                        </div>
                      </div>
                      <div style={{ height:10, background:'#f1f2f6', borderRadius:6, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${barWidth}%`, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:6, transition:'width 1s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 오답 많은 과목 */}
            {Object.keys(wrongBySubject).length > 0 && (
              <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #fde68a', padding:20, marginBottom:14 }}>
                <p style={{ margin:'0 0 4px', fontSize:14, fontWeight:800, color:'#1a1a2e' }}>⚠️ 오답 많은 과목</p>
                <p style={{ margin:'0 0 14px', fontSize:12, color:'#999' }}>집중적으로 복습해보세요!</p>
                {Object.entries(wrongBySubject).sort((a,b) => b[1]-a[1]).map(([subject, count]) => (
                  <div key={subject} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:12, background:'#fffbeb', marginBottom:8, border:'1px solid #fde68a' }}>
                    <span style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>{subject}</span>
                    <span style={{ fontSize:13, fontWeight:900, color:'#d97706' }}>오답 {count}개</span>
                  </div>
                ))}
              </div>
            )}

            {/* 초기화 */}
            <button onClick={()=>{
              if (confirm('학습 통계를 초기화할까요?')) {
                localStorage.removeItem('studyStats');
                setStats({ totalQuiz:0, totalCorrect:0, totalQuestions:0, subjectStats:{}, recentDates:[] });
              }
            }} style={{ width:'100%', padding:14, borderRadius:16, border:'1.5px solid #e8e9ef', background:'#fff', color:'#bbb', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              통계 초기화
            </button>

          </div>
        )}
      </div>
    </div>
  );
}
