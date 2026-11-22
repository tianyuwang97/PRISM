import {createServer} from 'node:http';
import {randomBytes,createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import worker from '../dist/server/index.js';
import {createDatabase,mockServices} from './local-db.mjs';

const fixtures=process.argv.includes('--fixtures');
const guestPreview=process.argv.includes('--guest-preview');
mkdirSync('.local',{recursive:true});
const DB=createDatabase(fixtures||guestPreview?':memory:':'.local/prism.sqlite');
if(!existsSync('.local/secret'))writeFileSync('.local/secret',randomBytes(32).toString('base64'));
const env={DB,PRISM_SECRET:process.env.PRISM_SECRET||readFileSync('.local/secret','utf8'),RESEND_API_KEY:process.env.RESEND_API_KEY,AUTH_FROM_EMAIL:process.env.AUTH_FROM_EMAIL};
env.ALLOW_GUEST_TEST=guestPreview?'true':process.env.ALLOW_GUEST_TEST;
if(guestPreview)mockServices();
const origin='http://127.0.0.1:4177';
let fixtureCookie='';
if(fixtures) {
  const mocks=mockServices();
  if(process.argv.includes('--fail-deepseek-once'))mocks.failures.set('api.deepseek.com',{status:429,once:true});
  const token=randomBytes(32).toString('base64url'),user='local-preview-user';
  DB.sqlite.prepare('INSERT INTO users(id,email,created_at) VALUES(?,?,?)').run(user,'preview@example.test',Date.now());
  DB.sqlite.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(createHash('sha256').update(token).digest('base64'),user,Date.now()+3600000);
  fixtureCookie='__Host-prism_session='+token;
  for(const provider of ['ChatGPT','Claude','Gemini','DeepSeek','Grok']) {
    await worker.fetch(new Request(origin+'/api/connections/'+provider,{method:'POST',headers:{Origin:origin,Cookie:fixtureCookie,'Content-Type':'application/json'},body:JSON.stringify({key:'local-test-key'})}),env,{});
  }
}
createServer(async(req,res)=>{
  try {
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const headers=new Headers(req.headers);
    if(fixtures&&headers.get('x-preview-anonymous')!=='true')headers.set('Cookie',fixtureCookie);
    const request=new Request(origin+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
    const response=await worker.fetch(request,env,{});
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {res.writeHead(500);res.end('Local preview error');}
}).listen(4177,'127.0.0.1',()=>console.log(origin+(fixtures?' — local model fixtures enabled':'')));
