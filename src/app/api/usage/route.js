import { usage, errorResponse, AppError } from '../../lib/ai-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){try{return Response.json(await usage(request),{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(){return errorResponse(new AppError('사용량은 AI 요청 시 서버에서 기록합니다.',405));}
