import { supabase } from '../supabase';

export const MAX_IMAGES = 5;
const MAX_FILE = 20 * 1024 * 1024;
// 장당 상한을 유지해 5장 base64 합계가 요청 제한 안에 들도록 한다.
const MAX_OUTPUT = 560 * 1024;
// 서버의 사진별 base64 2,800,000자 제한에 맞춘 원본 최대 크기.
const MAX_ORIGINAL = 2100000;
const MAX_EDGE = 1792;
const MAX_REQUEST = Math.floor(3.9 * 1024 * 1024);
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function processImages(files, existingCount = 0) {
  const list = Array.from(files || []);
  if (existingCount + list.length > MAX_IMAGES) throw new Error('사진은 최대 5장까지 선택할 수 있어요.');
  const result = [];
  for (const file of list) { result.push(await processImage(file)); await yieldToBrowser(); }
  return result;
}
function processImage(file, forceResize = false, signal) {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  if (/\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)) return Promise.reject(new Error('HEIC 사진은 지원하지 않아요. JPEG 또는 PNG로 변환해 주세요.'));
  if (!TYPES.includes(file.type)) return Promise.reject(new Error('JPEG, PNG, WebP, GIF 이미지만 사용할 수 있어요.'));
  if (file.size > MAX_FILE) return Promise.reject(new Error('사진 한 장은 20MB 이하여야 해요.'));
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    let done = false;
    const finish = (err, value) => { if (done) return; done = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); img.onload = null; img.onerror = null; URL.revokeObjectURL(url); err ? reject(err) : resolve(value); };
    const abort = () => finish(new DOMException('Aborted', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('사진을 불러오는 시간이 초과됐어요. 다른 사진을 선택해 주세요.')), 15000);
    signal?.addEventListener('abort', abort, { once: true });
    img.onerror = () => finish(new Error('사진을 읽을 수 없어요. 파일을 확인해 주세요.'));
    img.onload = async () => {
      try {
        if (img.naturalWidth < 100 || img.naturalHeight < 100) throw new Error('사진이 너무 작아요. 가로와 세로가 각각 100픽셀 이상인 사진을 선택해 주세요.');
        // EXIF 방향 등 원본 메타데이터와 포맷을 보존한다. 디코딩 검사는 위에서 수행한다.
        if (!forceResize && file.size <= MAX_ORIGINAL) {
          const data = await fileDataUrl(file);
          finish(null, { preview: data, base64: data.slice(data.indexOf(',') + 1), type: file.type, source: file });
          return;
        }
        const longest = Math.max(img.naturalWidth, img.naturalHeight);
        const initial = Math.min(1, MAX_EDGE / longest);
        const oldInitial = Math.min(1, 1568 / longest);
        // 기존 크기 후보도 보존해 같은 품질과 용량에서 해상도 회귀를 피한다.
        const scales = Array.from({ length: 10 }, (_, i) => oldInitial * 0.8 ** i)
          .concat(Array.from({ length: 12 }, (_, i) => initial * 0.9 ** i))
          .sort((a, b) => b - a);
        const canvas = document.createElement('canvas'); let data;
        for (const scale of scales) {
          throwIfAborted(signal);
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('사진을 처리할 수 없어요.');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          data = await canvasJpeg(canvas, 0.88, signal);
          await yieldToBrowser();
          if ((data.length - data.indexOf(',') - 1) * 3 / 4 <= MAX_OUTPUT) break;
        }
        if ((data.length - data.indexOf(',') - 1) * 3 / 4 > MAX_OUTPUT) throw new Error('사진 용량을 충분히 줄이지 못했어요. 다른 사진을 선택해 주세요.');
        finish(null, { preview: data, base64: data.split(',')[1], type: 'image/jpeg', source: file });
      } catch (err) { finish(err); }
    };
    img.src = url;
  });
}
function fileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('사진을 읽을 수 없어요. 파일을 확인해 주세요.'));
    reader.readAsDataURL(file);
  });
}
// toBlob와 작업 사이의 양보로 대형 사진 처리 중에도 화면이 갱신되도록 한다.
function yieldToBrowser() { return new Promise(resolve => setTimeout(resolve, 0)); }
function canvasJpeg(canvas, quality, signal) {
  return new Promise((resolve, reject) => {
    let done = false, reader;
    const finish = (err, value) => {
      if (done) return; done = true;
      signal?.removeEventListener('abort', abort);
      if (reader) { reader.onload = null; reader.onerror = null; }
      err ? reject(err) : resolve(value);
    };
    const abort = () => { if (reader?.readyState === 1) reader.abort(); finish(new DOMException('Aborted', 'AbortError')); };
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
    try { canvas.toBlob(blob => {
      if (done) return;
      if (!blob) { finish(new Error('사진을 처리할 수 없어요.')); return; }
      reader = new FileReader();
      reader.onload = () => finish(null, reader.result);
      reader.onerror = () => finish(new Error('사진을 처리할 수 없어요.'));
      reader.readAsDataURL(blob);
    }, 'image/jpeg', quality); } catch (err) { finish(err); }
  });
}
function throwIfAborted(signal) { if (signal?.aborted) throw new DOMException('Aborted', 'AbortError'); }
// 사진을 자동으로 잘라 추가 전송하지 않는다.
export async function addDetailImages(body) { return body; }
// 사진 풀이 전용 NDJSON. 종결 이벤트 후 추가 데이터와 잘못된 UTF-8은 거부한다.
async function readPhotoStream(response, onCandidate, signal) {
  if (!response.body?.getReader) throw new Error('스트리밍 응답을 읽을 수 없어요.');
  const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
  const maxTotal = 4 * 1024 * 1024, maxLine = 2 * 1024 * 1024;
  let buffer = '', total = 0, terminal = null, candidateSeen = false, ended = false;
  const fail = () => { throw new Error('사진 풀이 응답 형식이 올바르지 않아요.'); };
  const consume = line => {
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (!line || terminal || new TextEncoder().encode(line).length > maxLine) return fail();
    let event; try { event = JSON.parse(line); } catch { return fail(); }
    if (!event || typeof event !== 'object' || Array.isArray(event)) return fail();
    if (event.type === 'candidate') {
      if (candidateSeen || !event.data || !Array.isArray(event.data.solutions) || !event.data.solutions.length || event.data.solutions.some(x => !x || typeof x !== 'object' || Array.isArray(x))) return fail();
      candidateSeen = true; onCandidate?.(event.data);
    } else if (event.type === 'complete') {
      if (!event.data || !Array.isArray(event.data.solutions) || !event.data.solutions.length || event.data.solutions.some(x => !x || typeof x !== 'object' || Array.isArray(x)) || !event.data.verification || typeof event.data.verification !== 'object' || Array.isArray(event.data.verification)) return fail();
      terminal = event;
    } else if (event.type === 'error') {
      if (typeof event.message !== 'string' || !event.message.trim()) return fail();
      terminal = event;
    } else return fail();
  };
  try {
    while (true) {
      throwIfAborted(signal);
      const { value, done } = await reader.read();
      throwIfAborted(signal);
      if (done) { buffer += decoder.decode(); ended = true; break; }
      total += value.byteLength;
      if (total > maxTotal) throw new Error('사진 풀이 응답이 너무 커요.');
      buffer += decoder.decode(value, { stream: true });
      let pos;
      while ((pos = buffer.indexOf('\n')) !== -1) { consume(buffer.slice(0, pos)); buffer = buffer.slice(pos + 1); }
      if (new TextEncoder().encode(buffer).length > maxLine) throw new Error('사진 풀이 응답이 너무 커요.');
    }
    if (buffer) consume(buffer);
    if (!terminal) throw new Error('응답이 완료되기 전에 연결이 끊겼어요.');
    if (terminal.type === 'error') throw new Error(terminal.message);
    return terminal.data;
  } finally {
    if (!ended) { try { await reader.cancel(); } catch {} }
    reader.releaseLock();
  }
}
// Photo chat NDJSON contract: text_delta.delta is NEW text only (never cumulative),
// complete carries reviewed:false and truncated; error terminates the stream.
// aiRequest resolves {response,reviewed:false,truncated}. On failure error.partialResponse
// contains all text already delivered so the caller can preserve it.
async function readTextStream(response,onTextChunk,signal){
 if(!response.body?.getReader)throw new Error('스트리밍 응답을 읽을 수 없어요.');
 const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let buffer='',full='',terminal=null,total=0,ended=false;
 const invalid=()=>{throw new Error('사진 답변 스트림 형식이 올바르지 않아요.');};
 const consume=line=>{if(line.endsWith('\r'))line=line.slice(0,-1);if(!line||terminal)invalid();let e;try{e=JSON.parse(line);}catch{invalid();}if(!e||typeof e!=='object'||Array.isArray(e))invalid();
  if(e.type==='text_delta'){if(typeof e.delta!=='string'||!e.delta)invalid();full+=e.delta;onTextChunk(e.delta);}
  else if(e.type==='complete'){if(e.reviewed!==false||typeof e.truncated!=='boolean'||!full.trim())invalid();terminal=e;}
  else if(e.type==='error'){if(typeof e.message!=='string'||!e.message.trim())invalid();terminal=e;}
  else invalid();};
 try{while(true){throwIfAborted(signal);const part=await reader.read();throwIfAborted(signal);if(part.done){buffer+=decoder.decode();ended=true;break;}total+=part.value.byteLength;if(total>8*1024*1024)throw new Error('사진 답변이 너무 커요.');buffer+=decoder.decode(part.value,{stream:true});let n;while((n=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,n));buffer=buffer.slice(n+1);}if(buffer.length>1024*1024)invalid();}if(buffer)invalid();if(!terminal)throw new Error('응답이 완료되기 전에 연결이 끊겼어요.');if(terminal.type==='error')throw new Error(terminal.message);return {response:full,reviewed:false,truncated:terminal.truncated};}
 catch(e){if(e&&typeof e==='object')e.partialResponse=full;throw e;}
 finally{if(!ended)try{await reader.cancel();}catch{}reader.releaseLock();}
}
export async function aiRequest(body, signal, options = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, ['solve_photos', 'quiz_photos', 'photo_chat_solve', 'photo_chat_quiz'].includes(body.operation) ? 125000 : 100000);
  const abort = () => controller.abort();
  if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const headers = { 'Content-Type': 'application/json' };
    const photoStream = body.operation === 'solve_photos' && typeof options.onCandidate === 'function';
    const textStream = ['photo_chat_solve','photo_chat_quiz'].includes(body.operation) && typeof options.onTextChunk === 'function';
    if (photoStream || textStream) headers.Accept = 'application/x-ndjson';
    if (data?.session?.access_token) headers.Authorization = 'Bearer ' + data.session.access_token;
    let payload = JSON.stringify(body);
    // 여러 원본 사진의 합계가 요청 제한을 넘으면 그때만 기존 축소 방식으로 대체한다.
    if (new TextEncoder().encode(payload).length > MAX_REQUEST && ['solve_photos', 'quiz_photos', 'photo_chat_solve', 'photo_chat_quiz'].includes(body.operation) && Array.isArray(body.images)) {
      const images = body.images.slice();
      // 큰 사진부터 필요한 만큼만 축소하여 나머지 원본을 보존한다.
      const order = images.map((image, index) => ({ index, size: typeof image?.base64 === 'string' ? image.base64.length : 0 })).sort((a, b) => b.size - a.size);
      for (const { index, size } of order) {
        if (new TextEncoder().encode(payload).length <= MAX_REQUEST) break;
        throwIfAborted(controller.signal);
        const image = images[index];
        if (!TYPES.includes(image?.type) || size <= Math.floor(MAX_OUTPUT / 3) * 4) continue;
        const binary = atob(image.base64), bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const reduced = await processImage(new File([bytes], 'photo', { type: image.type }), true, controller.signal);
        images[index] = { base64: reduced.base64, type: reduced.type };
        payload = JSON.stringify({ ...body, images });
      }
      throwIfAborted(controller.signal);
    }
    if (new TextEncoder().encode(payload).length > MAX_REQUEST) throw new Error('전송할 자료가 너무 커요. 사진 수를 줄이거나 텍스트 범위를 줄여 주세요.');
    const response = await fetch('/api/generate', { method:'POST', headers, body:payload, signal:controller.signal });
    const contentType = (response.headers?.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (response.ok && textStream && contentType === 'application/x-ndjson') return await readTextStream(response, options.onTextChunk, controller.signal);
    if (response.ok && photoStream && contentType === 'application/x-ndjson') return await readPhotoStream(response, options.onCandidate, controller.signal);
    let result; try { result = await response.json(); } catch { throw new Error('서버 응답을 읽을 수 없어요. 다시 시도해 주세요.'); }
    if (!response.ok || result?.error) throw new Error(typeof result?.error === 'string' ? result.error : '요청을 처리하지 못했어요. 다시 시도해 주세요.');
    return result;
  } catch (err) { if (timedOut) { const timeoutError = new Error('요청 시간이 초과됐어요. 입력은 유지되니 다시 시도해 주세요.'); if (typeof err?.partialResponse === 'string') timeoutError.partialResponse = err.partialResponse; throw timeoutError; } throw err; }
  finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
export function readStored(key, fallback) { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } }
export function writeStored(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
export function safeTextRead(key, fallback = '') { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
export function safeTextWrite(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }

