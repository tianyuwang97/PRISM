import assert from 'node:assert/strict';
import {test} from 'node:test';
import worker from '../dist/server/index.js';
import {createDatabase} from './local-db.mjs';
test('Ark validates model access, encrypts keys, updates endpoint IDs and generates isolated answers',async()=>{
 const DB=createDatabase(), original=globalThis.fetch, calls=[];
 const env={DB,PRISM_SECRET:'test-ark-only',ALLOW_GUEST_TEST:'true'},origin='https://prism.test';
 globalThis.fetch=async(url,options)=>{
   assert.equal(url,'https://ark.cn-beijing.volces.com/api/v3/chat/completions');
   const payload=JSON.parse(options.body);calls.push(payload);
   assert.equal(options.headers.Authorization,'Bearer ark-local-test');
   if(payload.model==='denied')return Response.json({error:'denied'},{status:403});
   return Response.json({choices:[{message:{content:'方舟测试回答'}}]});
 };
 async function request(path,data,method='POST',cookie=''){
   const r=await worker.fetch(new Request(origin+'/api'+path,{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:method==='GET'?undefined:JSON.stringify(data)}),env,{});
   return {status:r.status,headers:r.headers,data:await r.json()};
 }
 try {
   const guest=await request('/auth/guest',{}),cookie=guest.headers.get('set-cookie').split(';')[0];
   const path='/connections/'+encodeURIComponent('火山方舟');
   assert.equal((await request(path,{key:'ark-local-test'},'POST',cookie)).status,400);assert.equal(calls.length,0);
   assert.equal((await request(path,{key:'ark-local-test',model:'denied'},'POST',cookie)).status,400);
   assert.equal((await request(path,{key:'ark-local-test',model:'ep-test-123'},'POST',cookie)).status,200);
   assert(!DB.sqlite.prepare('SELECT encrypted_key FROM connections').get().encrypted_key.includes('ark-local-test'));
   assert.equal((await request(path,{model:'doubao-text-test'},'POST',cookie)).status,200);
   const result=await request('/ask',{provider:'火山方舟',question:'你好',requestId:crypto.randomUUID()},'POST',cookie);
   assert.equal(result.status,200);assert.equal(result.data.text,'方舟测试回答');
   assert.equal(calls.at(-1).model,'doubao-text-test');assert.equal(calls.at(-1).messages[0].content,'你好');
   const other=await request('/auth/guest',{}),otherCookie=other.headers.get('set-cookie').split(';')[0];
   assert.equal((await request('/connections',null,'GET',otherCookie)).data.connections.length,0);
 } finally {globalThis.fetch=original;DB.sqlite.close();}
});
