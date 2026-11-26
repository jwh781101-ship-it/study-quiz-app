import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const serverCode=fs.readFileSync(new URL('src/app/lib/ai-server.js',root),'utf8').replace(/^import[^\n]+\n/,'const createClient=(...a)=>globalThis.__client(...a);\n');
const serverURL='data:text/javascript;base64,'+Buffer.from(serverCode).toString('base64');
const routeCode=fs.readFileSync(new URL('src/app/api/english/route.js',root),'utf8').replace("'../../lib/ai-server'",JSON.stringify(serverURL));
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(routeCode).toString('base64'));
let queue,calls;
beforeEach(()=>{
 process.env.ANTHROPIC_API_KEY='test-only';process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';queue=[];calls=[];
 globalThis.__client=()=>({from:()=>({
  select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{daily_count:0,last_used_date:'2026-01-01'}}),
  update(){return {eq(){return this;},is(){return this;},select:async()=>({data:[{ip:'test'}]})};}
 })});
 globalThis.fetch=async(u,o)=>{calls.push(JSON.parse(o.body));return Response.json(queue.shift()||{});};
});
const model=v=>({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(v)}]});
const words=()=>({theme:'학습',words:Array.from({length:8},(_,i)=>({word:'word'+i,pronunciation:'발음',meaning:'뜻',example:'Example sentence.',example_kr:'예문',tip:'예문을 복습하세요.'}))});
const req=prompt=>new Request('https://app.test/api/english',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt})});
test('English allows guest and verifies word list',async()=>{queue.push(model(words()),model({ok:true}));const r=await POST(req('영어 단어 JSON "words"'));assert.equal(r.status,200);assert.equal(calls.length,2);assert.equal(calls[0].model,'claude-sonnet-5-5');});
test('English one repair recovers failed review',async()=>{queue.push(model(words()),model({ok:false}),model(words()),model({ok:true}));assert.equal((await POST(req('영어 "words"'))).status,200);assert.equal(calls.length,4);});
test('English stops after failed second review',async()=>{queue.push(model(words()),model({ok:false}),model(words()),model({ok:false}));assert.equal((await POST(req('영어 "words"'))).status,422);assert.equal(calls.length,4);});
test('English quiz answer must match an option',async()=>{queue.push(model({type:'단어',question:'뜻은?',options:['a','b','c','d'],answer:'e',explanation:'x'}));assert.equal((await POST(req('영어 "options"'))).status,422);assert.equal(calls.length,1);});
