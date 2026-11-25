import { supabase } from '../supabase';

export const MAX_IMAGES = 5;
const MAX_FILE = 20 * 1024 * 1024;
const MAX_OUTPUT = 560 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function processImages(files, existingCount = 0) {
  const list = Array.from(files || []);
  if (existingCount + list.length > MAX_IMAGES) throw new Error('사진은 최대 5장까지 선택할 수 있어요.');
  return Promise.all(list.map(processImage));
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
    img.onload = () => {
      try {
        if (img.naturalWidth < 100 || img.naturalHeight < 100) throw new Error('사진이 너무 작아요. 가로와 세로가 각각 100픽셀 이상인 사진을 선택해 주세요.');
        let scale = Math.min(1, 1568 / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas'); let data;
        for (let i = 0; i < 10; i++) {
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('사진을 처리할 수 없어요.');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          data = canvas.toDataURL('image/jpeg', 0.88);
          if ((data.length - data.indexOf(',') - 1) * 3 / 4 <= MAX_OUTPUT) break;
          scale *= 0.8;
        }
        if ((data.length - data.indexOf(',') - 1) * 3 / 4 > MAX_OUTPUT) throw new Error('사진 용량을 충분히 줄이지 못했어요. 다른 사진을 선택해 주세요.');
        finish(null, { preview: data, base64: data.split(',')[1], type: 'image/jpeg' });
      } catch (err) { finish(err); }
    };
    img.src = url;
  });
}
export async function aiRequest(body, signal) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 100000);
  const abort = () => controller.abort();
  if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const headers = { 'Content-Type': 'application/json' };
    if (data?.session?.access_token) headers.Authorization = 'Bearer ' + data.session.access_token;
    const payload = JSON.stringify(body);
    if (new TextEncoder().encode(payload).length > 3.9 * 1024 * 1024) throw new Error('전송할 자료가 너무 커요. 사진 수를 줄이거나 텍스트 범위를 줄여 주세요.');
    const response = await fetch('/api/generate', { method:'POST', headers, body:payload, signal:controller.signal });
    let result; try { result = await response.json(); } catch { throw new Error('서버 응답을 읽을 수 없어요. 다시 시도해 주세요.'); }
    if (!response.ok || result.error) throw new Error(result.error || '요청을 처리하지 못했어요. 다시 시도해 주세요.');
    return result;
  } catch (err) { if (timedOut) throw new Error('요청 시간이 초과됐어요. 입력은 유지되니 다시 시도해 주세요.'); throw err; }
  finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
export function readStored(key, fallback) { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } }
export function writeStored(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
export function safeTextRead(key, fallback = '') { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
export function safeTextWrite(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }
