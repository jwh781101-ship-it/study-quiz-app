export const maxDuration = 60;
export const runtime = 'nodejs';

const MAX_REQUEST_BYTES = 16 * 1024 * 1024;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGES = 10;
const MAX_PROMPT_BYTES = 100 * 1024;
const MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const errorResponse = (message, status) => Response.json({ error: message }, { status });
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

// Read incrementally so the limit applies even when Content-Length is absent or incorrect.
async function readBody(request) {
  const declared = request.headers.get('content-length');
  if (declared && Number(declared) > MAX_REQUEST_BYTES) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8');
}

function validQuiz(data, expectedCount) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !nonempty(data.topic) ||
      !Array.isArray(data.questions) || data.questions.length === 0 ||
      (expectedCount !== undefined && data.questions.length !== expectedCount)) return false;
  const ids = new Set();
  for (const q of data.questions) {
    if (!q || typeof q !== 'object' || Array.isArray(q) ||
        !(Number.isSafeInteger(q.id) || nonempty(q.id)) ||
        !nonempty(q.question) || !nonempty(q.answer) || !nonempty(q.explanation) ||
        !['객관식', '서술형', '단답형'].includes(q.type)) return false;
    // React object keys treat a numeric id and the equivalent string as the same key.
    const id = String(q.id);
    if (ids.has(id)) return false;
    ids.add(id);
    if (q.type === '객관식') {
      if (!Array.isArray(q.options) || q.options.length !== 5 || !q.options.every(nonempty)) return false;
      const strip = s => s.replace(/^[①②③④⑤]\s*/, '').replace(/^[0-9]+[.)]\s*/, '').trim();
      const options = q.options.map(strip);
      if (options.some(s => !s) || new Set(options).size !== 5 ||
          options.filter(option => option === strip(q.answer)).length !== 1) return false;
    } else if (q.options !== null && q.options !== undefined) {
      return false;
    }
  }
  return true;
}

// AI text is untrusted. Forward only short, plain guidance; suppress likely secrets,
// URLs, markup and technical payloads rather than reflecting them to the client.
function safeModelError(value) {
  const fallback = '학습 자료를 확인할 수 없습니다. 자료를 더 선명하고 구체적으로 제공해주세요.';
  if (!nonempty(value)) return fallback;
  const message = value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!message || /https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|<[^>]*>|```|(?:api[_ -]?key|secret|password|authorization|bearer|token|비밀번호|인증키|비밀키)|[a-z0-9_\-]{24,}/i.test(message)) return fallback;
  return Array.from(message).slice(0, 300).join('');
}

function parseCompleteJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  // A complete JSON object is accepted as-is or inside a complete code fence.
  // Do not repair truncated JSON or return a partial set of questions.
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

export async function POST(request) {
  try {
    const raw = await readBody(request);
    if (raw === null) return errorResponse('요청 크기가 너무 큽니다.', 413);
    let body;
    try { body = JSON.parse(raw); } catch { return errorResponse('올바른 JSON 요청이 아닙니다.', 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return errorResponse('요청 형식이 올바르지 않습니다.', 400);
    const { images = [], prompt, isGrading, isSolving, expectedCount } = body;
    if (!nonempty(prompt) || Buffer.byteLength(prompt, 'utf8') > MAX_PROMPT_BYTES) return errorResponse('프롬프트가 비어 있거나 너무 깁니다.', 400);
    if (!Array.isArray(images) || images.length > MAX_IMAGES) return errorResponse('이미지는 최대 10장까지 가능합니다.', 400);
    if (expectedCount !== undefined && (!Number.isSafeInteger(expectedCount) || expectedCount < 1 || expectedCount > 100)) return errorResponse('문제 수가 올바르지 않습니다.', 400);

    const content = [];
    for (const img of images) {
      if (!img || typeof img !== 'object' || typeof img.base64 !== 'string' || typeof img.type !== 'string') return errorResponse('이미지 형식이 올바르지 않습니다.', 400);
      const type = img.type.toLowerCase();
      if (!MEDIA_TYPES.has(type) || !img.base64 || img.base64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 ||
          !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(img.base64)) return errorResponse('이미지 형식 또는 크기가 올바르지 않습니다.', 400);
      const bytes = Buffer.from(img.base64, 'base64');
      if (bytes.length > MAX_IMAGE_BYTES) return errorResponse('이미지 크기가 너무 큽니다.', 413);
      if (!isGrading) content.push({ type: 'image', source: { type: 'base64', media_type: type, data: img.base64 } });
    }
    content.push({ type: 'text', text: prompt });

    // Existing image diagnosis has no operation flag; recognize its exact prompt prefix.
    const isDiagnosis = prompt.startsWith('아래 이미지들 중 학습 자료로 인식할 수 없는 이미지 번호를 찾아주세요.');
    const isQuiz = !isGrading && !isSolving && !isDiagnosis;
    const model = (isSolving || isGrading) ? 'claude-haiku-4-5' : 'claude-sonnet-4-5';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 16000, messages: [{ role: 'user', content }] })
    });
    if (!response.ok) return errorResponse('AI 서비스 요청에 실패했습니다. 잠시 후 다시 시도해주세요.', 502);
    const data = await response.json();
    if (data.error || data.stop_reason === 'max_tokens' || data.stop_reason === 'refusal' || !Array.isArray(data.content)) return errorResponse('AI 응답이 불완전하거나 처리할 수 없습니다. 다시 시도해주세요.', 502);
    const text = data.content.filter(item => item && item.type === 'text' && typeof item.text === 'string').map(item => item.text).join('');
    let parsed;
    try { parsed = parseCompleteJson(text); } catch { return errorResponse('AI가 완전한 JSON 응답을 반환하지 않았습니다. 다시 시도해주세요.', 502); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return errorResponse('AI 응답 형식이 올바르지 않습니다.', 502);
    if (isQuiz && Object.prototype.hasOwnProperty.call(parsed, 'error')) return errorResponse(safeModelError(parsed.error), 422);
    if (isQuiz && !validQuiz(parsed, expectedCount)) return errorResponse('생성된 문제의 형식 또는 개수가 올바르지 않습니다. 다시 시도해주세요.', 502);
    return Response.json(parsed);
  } catch {
    return errorResponse('요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.', 500);
  }
}
