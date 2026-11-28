import { supabase } from '../supabase';

export const MAX_IMAGES = 5;
const MAX_FILE = 20 * 1024 * 1024;
// 장당 상한을 유지해 5장 base64 합계가 요청 제한 안에 들도록 한다.
const MAX_OUTPUT = 560 * 1024;
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
function processImage(file) {
  if (/\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)) return Promise.reject(new Error('HEIC 사진은 지원하지 않아요. JPEG 또는 PNG로 변환해 주세요.'));
  if (!TYPES.includes(file.type)) return Promise.reject(new Error('JPEG, PNG, WebP, GIF 이미지만 사용할 수 있어요.'));
  if (file.size > MAX_FILE) return Promise.reject(new Error('사진 한 장은 20MB 이하여야 해요.'));
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    let done = false;
    const finish = (err, value) => { if (done) return; done = true; clearTimeout(timer); img.onload = null; img.onerror = null; URL.revokeObjectURL(url); err ? reject(err) : resolve(value); };
    const timer = setTimeout(() => finish(new Error('사진을 불러오는 시간이 초과됐어요. 다른 사진을 선택해 주세요.')), 15000);
    img.onerror = () => finish(new Error('사진을 읽을 수 없어요. 파일을 확인해 주세요.'));
    img.onload = async () => {
      try {
        if (img.naturalWidth < 100 || img.naturalHeight < 100) throw new Error('사진이 너무 작아요. 가로와 세로가 각각 100픽셀 이상인 사진을 선택해 주세요.');
        const longest = Math.max(img.naturalWidth, img.naturalHeight);
        const initial = Math.min(1, MAX_EDGE / longest);
        const oldInitial = Math.min(1, 1568 / longest);
        // 기존 크기 후보도 보존해 같은 품질과 용량에서 해상도 회귀를 피한다.
        const scales = Array.from({ length: 10 }, (_, i) => oldInitial * 0.8 ** i)
          .concat(Array.from({ length: 12 }, (_, i) => initial * 0.9 ** i))
          .sort((a, b) => b - a);
        const canvas = document.createElement('canvas'); let data;
        for (const scale of scales) {
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('사진을 처리할 수 없어요.');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          data = await canvasJpeg(canvas, 0.88);
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
function loadDetailSource(file, signal) {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const url = URL.createObjectURL(file), img = new Image();
    let done = false;
    const finish = (error) => {
      if (done) return; done = true; clearTimeout(timer);
      signal?.removeEventListener('abort', abort); img.onload = null; img.onerror = null;
      URL.revokeObjectURL(url); error ? reject(error) : resolve(img);
    };
    const abort = () => finish(new DOMException('Aborted', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('사진을 읽지 못했어요.')), 15000);
    signal?.addEventListener('abort', abort, { once: true });
    img.onload = () => finish(); img.onerror = () => finish(new Error('사진을 읽지 못했어요.'));
    img.src = url;
  });
}
// 원본 요청을 보존하며 남은 UTF-8 JSON 예산을 모든 페이지의 겹치는 2열×3행 타일에 배분한다.
export async function addDetailImages(body, selectedImages, signal) {
  if (body.operation !== 'solve_photos' || !selectedImages.length) return body;
  const base = { ...body }; delete base.detailImages;
  const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;
  if (bytes(base) >= MAX_REQUEST) return base;
  const details = [];
  for (let i = 0; i < selectedImages.length; i++) {
    throwIfAborted(signal);
    let img;
    try { img = await loadDetailSource(selectedImages[i].source, signal); }
    catch (err) { if (err.name === 'AbortError') throw err; continue; }
    const parts = ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'];
    for (let tile = 0; tile < parts.length; tile++) {
      const part = parts[tile];
      throwIfAborted(signal);
      const remaining = (selectedImages.length - i - 1) * parts.length + parts.length - tile;
      const room = Math.floor((MAX_REQUEST - bytes({ ...base, detailImages: details })) / remaining) - 128;
      if (room < 2048) continue;
      const right = part.endsWith('right'), row = Math.floor(tile / 2);
      // 원본 기준 좌우 20%, 상하 25% 겹쳐 경계에 걸친 문항도 이어서 볼 수 있다.
      const sx = right ? Math.floor(img.naturalWidth * 0.4) : 0;
      const ex = right ? img.naturalWidth : Math.ceil(img.naturalWidth * 0.6);
      const sy = Math.floor(img.naturalHeight * [0, 0.25, 0.5][row]);
      const ey = Math.ceil(img.naturalHeight * [0.5, 0.75, 1][row]);
      const sw = ex - sx, sh = ey - sy;
      // 업스케일은 없는 디테일을 만들지 않는다. 다수 이미지 요청에도 2000px 이하.
      const initial = Math.min(1, 2000 / Math.max(sw, sh));
      const canvas = document.createElement('canvas');
      try {
        for (const factor of [1, 0.85, 0.7, 0.55, 0.4, 0.3, 0.2]) {
          throwIfAborted(signal);
          canvas.width = Math.max(1, Math.round(sw * initial * factor));
          canvas.height = Math.max(1, Math.round(sh * initial * factor));
          const ctx = canvas.getContext('2d'); if (!ctx) break;
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
          const data = await canvasJpeg(canvas, 0.82, signal);
          throwIfAborted(signal);
          const detail = { page: i + 1, part, base64: data.slice(data.indexOf(',') + 1), type: 'image/jpeg' };
          if (bytes(detail) <= room && bytes({ ...base, detailImages: [...details, detail] }) <= MAX_REQUEST) { details.push(detail); break; }
          await yieldToBrowser();
        }
      } catch (err) { if (err.name === 'AbortError') throw err; }
      finally { canvas.width = 1; canvas.height = 1; }
      await yieldToBrowser();
      throwIfAborted(signal);
    }
  }
  throwIfAborted(signal);
  return details.length ? { ...base, detailImages: details } : base;
}
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
export async function aiRequest(body, signal, options = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, ['solve_photos', 'quiz_photos'].includes(body.operation) ? 125000 : 100000);
  const abort = () => controller.abort();
  if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const headers = { 'Content-Type': 'application/json' };
    const photoStream = body.operation === 'solve_photos' && typeof options.onCandidate === 'function';
    if (photoStream) headers.Accept = 'application/x-ndjson';
    if (data?.session?.access_token) headers.Authorization = 'Bearer ' + data.session.access_token;
    const payload = JSON.stringify(body);
    if (new TextEncoder().encode(payload).length > MAX_REQUEST) throw new Error('전송할 자료가 너무 커요. 사진 수를 줄이거나 텍스트 범위를 줄여 주세요.');
    const response = await fetch('/api/generate', { method:'POST', headers, body:payload, signal:controller.signal });
    const contentType = (response.headers?.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (response.ok && photoStream && contentType === 'application/x-ndjson') return await readPhotoStream(response, options.onCandidate, controller.signal);
    let result; try { result = await response.json(); } catch { throw new Error('서버 응답을 읽을 수 없어요. 다시 시도해 주세요.'); }
    if (!response.ok || result?.error) throw new Error(typeof result?.error === 'string' ? result.error : '요청을 처리하지 못했어요. 다시 시도해 주세요.');
    return result;
  } catch (err) { if (timedOut) throw new Error('요청 시간이 초과됐어요. 입력은 유지되니 다시 시도해 주세요.'); throw err; }
  finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
export function readStored(key, fallback) { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } }
export function writeStored(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
export function safeTextRead(key, fallback = '') { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
export function safeTextWrite(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }

