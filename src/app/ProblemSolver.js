'use client';
import { useState, useRef, useEffect } from 'react';
import { processImages, aiRequest } from './lib/client';
// 문자열만 React 텍스트로 렌더링한다. HTML, URL, 이미지 문법은 실행하지 않는다.
function inline(text) {
 return text;
}
// 해석이 모호한 표는 변환하지 않아 텍스트를 그대로 보여준다.
function tableCells(line) {
 if(!line.includes('|')||line.includes('\\|')||line.includes('`'))return null;
 let value=line.trim();
 if(value.startsWith('|'))value=value.slice(1);
 if(value.endsWith('|'))value=value.slice(0,-1);
 return value.split('|').map(cell=>cell.trim());
}
function NaturalResponse({text}) {
 const lines=text.split(/\r\n|\n|\r/),blocks=[];
 for(let i=0;i<lines.length;i++) {
  const header=tableCells(lines[i]),separator=i+1<lines.length?tableCells(lines[i+1]):null;
  if(header&&separator&&header.length===separator.length&&separator.every(cell=>/^:?-{3,}:?$/.test(cell))) {
   const rows=[];let j=i+2;
   while(j<lines.length){const row=tableCells(lines[j]);if(!row||row.length!==header.length)break;rows.push(row);j++}
   blocks.push(<div key={i} style={{maxWidth:'100%',overflowX:'auto',margin:'12px 0'}}><table style={{borderCollapse:'collapse',minWidth:'100%',width:'max-content',textAlign:'left'}}><thead><tr>{header.map((cell,n)=><th key={n} style={{border:'1px solid #cbd5e1',padding:'8px 10px',verticalAlign:'top'}}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row,n)=><tr key={n}>{row.map((cell,k)=><td key={k} style={{border:'1px solid #cbd5e1',padding:'8px 10px',verticalAlign:'top'}}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>);i=j-1;continue;
  }
  const heading=lines[i].match(/^ {0,3}(#{1,6})[ \t]+(.*)$/),item=lines[i].match(/^(\s*)([-+*]|\d+[.)])[ \t]+(.*)$/);
  if(heading)blocks.push(<div role="heading" aria-level={heading[1].length} key={i} style={{fontSize:heading[1].length<=2?'1.2em':'1.08em',fontWeight:700,margin:'12px 0 4px'}}>{inline(heading[2])}</div>);
  else if(item)blocks.push(<div key={i} style={{display:'flex',gap:8,paddingLeft:item[1].length?'1em':0}}><span>{/^\d/.test(item[2])?item[2]:'•'}</span><span>{inline(item[3])}</span></div>);
  else blocks.push(<div key={i} style={{minHeight:'1.75em'}}>{inline(lines[i])}</div>);
 }
 return <div aria-label="AI 답변" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',lineHeight:1.75}}>{blocks}</div>;
}
export function AttachedPhotos({images}) {
 return images.length>0&&<details className="card"><summary style={{cursor:'pointer',fontWeight:700}}>첨부한 사진 보기 ({images.length}장)</summary><div style={{display:'grid',gap:12,marginTop:12}}>{images.map((im,i)=><img key={i} src={im.preview} alt={'첨부한 사진 '+(i+1)} style={{display:'block',width:'100%',height:'auto'}}/>)}</div></details>;
}
export function PhotoResponse({result,images,streaming=false,incomplete=false}) {
 return <><AttachedPhotos images={images}/>{result.truncated&&<div className="error" role="alert">답변이 길어 일부가 잘렸을 수 있어요. 사진이나 요청을 나누어 다시 시도해 주세요.</div>}<section className="card" aria-busy={streaming}><h2>{incomplete?'중단된 미완성 답변':'클로드 답변 그대로'}</h2>{streaming||incomplete?<div aria-label="답변 내용" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',lineHeight:1.75}}>{result.response}</div>:<><NaturalResponse text={result.response}/><details style={{marginTop:16}}><summary style={{cursor:'pointer'}}>원문 보기</summary><div style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',marginTop:8}}>{result.response}</div></details></>}</section></>;
}

function Solution({ solution, hintOnly, numbered, index }) {
 const hints=solution.hints;
 const hintList=numbered&&Array.isArray(solution.steps)?solution.steps:Array.isArray(hints)?hints:typeof hints==='string'?[hints]:[solution.hint1,solution.hint2,solution.hint3].filter(Boolean);
 return <section aria-label={numbered?`${solution.number ?? index+1}번 문제 풀이`:'문제 풀이'}>
  <div className="card"><h2>{numbered?`${solution.number ?? index+1}번 문제`:'문제'}</h2><p className="question" style={{whiteSpace:'pre-wrap'}}>{solution.problem || '문제 내용을 확인하지 못했어요.'}</p></div>
  {solution.verification_warning&&<div className="notice" role="status" style={{whiteSpace:'pre-wrap'}}>{solution.verification_warning}</div>}
  {solution.is_valid===false?<div className="card"><h2>확인이 필요해요</h2><p className="sub" style={{whiteSpace:'pre-wrap'}}>{solution.reason || solution.reject_reason || '이 문제를 정확히 읽거나 풀이할 수 없어요. 사진을 확인하거나 문제를 직접 입력해 주세요.'}</p></div>:<>
   {hintOnly?<div className="card"><h2>생각을 돕는 힌트</h2>{hintList.length?hintList.map((h,i)=><p className="sub" style={{whiteSpace:'pre-wrap'}} key={i}>{typeof h==='object'?<>{h.title&&<b>{h.title}<br/></b>}{h.content||h.text||''}</>:h}</p>):<p className="sub">힌트를 확인하지 못했어요. 다시 요청해 주세요.</p>}</div>:<><div className="card"><h2>정답</h2><p className="question" style={{whiteSpace:'pre-wrap'}}>{solution.answer}</p></div><div className="card"><h2>풀이 과정</h2>{Array.isArray(solution.steps)&&solution.steps.map((s,i)=><div key={i}><b>{s.title||'단계 '+(i+1)}</b><p className="sub" style={{whiteSpace:'pre-wrap'}}>{s.content||s.explanation||String(s)}</p></div>)}</div></>}
   {!hintOnly&&solution.key_concept&&<div className="card"><h2>핵심 개념</h2><p className="sub" style={{whiteSpace:'pre-wrap'}}>{solution.key_concept}</p></div>}{!hintOnly&&solution.tip&&<div className="card"><h2>학습 팁</h2><p className="sub" style={{whiteSpace:'pre-wrap'}}>{solution.tip}</p></div>}
  </>}
 </section>
}

export default function ProblemSolver({onBack,draft,setDraft}) {
 const [images,setImages]=useState([]),[text,setText]=useState(''),[grade,setGrade]=useState('중2'),[hintOnly,setHintOnly]=useState(false),[step,setStep]=useState('input'),[result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[elapsed,setElapsed]=useState(0),[processing,setProcessing]=useState(false);
 const [resultHint,setResultHint]=useState(false);
 const camera=useRef(),gallery=useRef(),req=useRef(null),seq=useRef(0),lock=useRef(false),stream=useRef(null);
 function stopDraft(partial=''){const current=stream.current;if(!current)return;const text=typeof partial==='string'&&partial.startsWith(current.text)&&partial.length>current.text.length?partial:current.text;setDraft(prev=>prev?.id===current.id?(text?{...prev,text,status:'interrupted'}:null):prev);stream.current=null;}
 useEffect(()=>()=>{seq.current++;req.current?.abort();stopDraft()},[]);
 useEffect(()=>{if(!busy)return;const start=Date.now();setElapsed(0);const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(timer)},[busy]);
 const cancel=()=>{seq.current++;req.current?.abort();req.current=null;stopDraft();setBusy('')};
 const add=async files=>{if(lock.current)return;lock.current=true;setProcessing(true);setError('');try{const arr=await processImages(files,images.length);setImages(prev=>[...prev,...arr])}catch(e){setError(e.message)}finally{lock.current=false;setProcessing(false)}};
 const run=async(label,body,success)=>{if(req.current)return;const ctrl=new AbortController(),id=++seq.current,isStream=body.operation==='photo_chat_solve',token={};req.current=ctrl;setResult(null);setResultHint(body.hintOnly);setDraft(isStream?{id:token,text:'',status:'streaming'}:null);stream.current=isStream?{id:token,text:''}:null;setBusy(label);setError('');try{const onTextChunk=delta=>{if(id!==seq.current||ctrl.signal.aborted||!stream.current||stream.current.id!==token||typeof delta!=='string'||!delta)return;stream.current.text+=delta;setDraft(prev=>prev?.id===token?{...prev,text:prev.text+delta}:prev)};const data=await aiRequest(body,ctrl.signal,isStream?{onTextChunk}:undefined);if(id!==seq.current||ctrl.signal.aborted)return;if(isStream&&(typeof data.response!=='string'||!data.response.trim()))throw new Error('사진 답변을 확인하지 못했어요. 다시 시도해 주세요.');stream.current=null;setDraft(null);success(data)}catch(e){if(id===seq.current){stopDraft(e.partialResponse);if(e.name!=='AbortError')setError(e.message||'요청하지 못했어요. 다시 시도해 주세요.')}}finally{if(id===seq.current){req.current=null;setBusy('')}}};
 const start=()=>{if(processing)return;if(!images.length&&!text.trim()){setError('문제 사진을 선택하거나 텍스트를 입력해 주세요.');return}const photo=images.length>0;const body=photo?{operation:'photo_chat_solve',images:images.map(({base64,type})=>({base64,type})),supplement:text,grade,hintOnly}:{operation:'solve',sourceText:text.trim(),grade,hintOnly};run(hintOnly?'힌트를 준비하고 있어요':'풀이를 준비하고 있어요',body,data=>{if(photo){if(typeof data.response!=='string'||!data.response.trim()){setError('사진 답변을 확인하지 못했어요. 다시 시도해 주세요.');return}}else if(data.is_valid===false){setError(data.reject_reason||'이 문제는 처리할 수 없어요.');return}setResult(data);setStep('result')})};
 return <main className="shell content"><div className="screenhead"><button className="back" aria-label="이전으로" onClick={()=>{if(busy)cancel();if(step==='result')setStep('input');else onBack()}}>‹</button><h1>문제 풀이 도우미</h1></div>{busy&&(draft?.status==='streaming'&&draft.text?<><p className="muted"><span role="status">답변을 작성하고 있어요.</span> <span aria-hidden="true">경과 {elapsed}초</span></p><PhotoResponse result={{response:draft.text}} images={images} streaming/><button className="secondary full" onClick={cancel}>요청 취소</button></>:<div className="card loading" role="status"><div className="spinner"/><h2>{busy}</h2><p className="muted">경과 {elapsed}초</p><button className="secondary" onClick={cancel}>요청 취소</button></div>)}{error&&<div className="error" role="alert">{error}</div>}<>
 {step==='input'&&!busy&&<>{draft?.status==='interrupted'&&draft.text&&<PhotoResponse result={{response:draft.text}} images={[]} incomplete/>}<div className="card"><h2>풀어볼 문제를 알려주세요</h2><p className="muted">사진 최대 5장, 한 장당 20MB 이하. JPEG, PNG, WebP, GIF를 지원해요.</p><input ref={camera} type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" hidden onChange={e=>{add(e.target.files);e.target.value=''}}/><input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={e=>{add(e.target.files);e.target.value=''}}/><div className="row"><button className="secondary" disabled={processing} onClick={()=>camera.current?.click()}>사진 촬영</button><button className="secondary" disabled={processing} onClick={()=>gallery.current?.click()}>갤러리 선택</button></div>{processing&&<p className="muted" role="status">사진을 준비하고 있어요...</p>}<div className="images">{images.map((im,i)=><div className="thumb" key={i}><img src={im.preview} alt={'선택한 사진 '+(i+1)}/><button aria-label={'사진 '+(i+1)+' 삭제'} onClick={()=>setImages(prev=>prev.filter((_,n)=>n!==i))}>×</button></div>)}</div><label className="label" htmlFor="solver-text">문제 직접 입력 또는 사진에 내용 추가</label><textarea id="solver-text" value={text} onChange={e=>setText(e.target.value)} placeholder="풀이가 필요한 문제나 보충 설명을 입력하세요"/></div><div className="card"><h2>풀이 설정</h2><div className="field"><label htmlFor="solver-grade">학년</label><select id="solver-grade" value={grade} onChange={e=>setGrade(e.target.value)}>{['초4','초5','초6','중1','중2','중3','고1','고2','고3'].map(x=><option key={x}>{x}</option>)}</select></div><div className="field"><span className="label">도움 방식</span><div className="row"><button className={'choice '+(!hintOnly?'on':'')} aria-pressed={!hintOnly} onClick={()=>setHintOnly(false)}>단계별 풀이</button><button className={'choice '+(hintOnly?'on':'')} aria-pressed={hintOnly} onClick={()=>setHintOnly(true)}>힌트만 보기</button></div></div></div><button className="primary full" disabled={processing} onClick={start}>{images.length?'사진 속 문제 풀이 요청':'입력한 문제 풀이 요청'}</button></>}
 {step==='result'&&result&&<>{typeof result.response==='string'?<PhotoResponse result={result} images={images} hint={resultHint}/>:<Solution solution={result} hintOnly={resultHint}/>}<button className="secondary full" onClick={()=>{setStep('input');setResult(null)}}>문제 수정하기</button></>}
 </></main>
}



