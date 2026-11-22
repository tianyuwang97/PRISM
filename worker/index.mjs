/* ASSETS */
const encoder = new TextEncoder();
const COOKIE = '__Host-prism_session';
const providers = {
  '火山方舟': {origin:'https://ark.cn-beijing.volces.com/api/v3',models:'/models',kind:'chat',preferred:[],setup:'https://ark.volcengine.com/region:cn-beijing/apikey'},
  ChatGPT: {origin:'https://api.openai.com', models:'/v1/models', kind:'responses', preferred:['gpt-5-mini','gpt-4.1-mini'], setup:'https://platform.openai.com/api-keys'},
  Claude: {origin:'https://api.anthropic.com', models:'/v1/models', kind:'claude', preferred:['claude-sonnet-4-5','claude-sonnet-4-20250514'], setup:'https://platform.claude.com/settings/keys'},
  Gemini: {origin:'https://generativelanguage.googleapis.com', models:'/v1beta/models?pageSize=1000', kind:'gemini', preferred:['gemini-2.5-flash','gemini-2.0-flash'], setup:'https://aistudio.google.com/apikey'},
  DeepSeek: {origin:'https://api.deepseek.com', models:'/models', kind:'chat', preferred:['deepseek-flash','deepseek-chat'], setup:'https://platform.deepseek.com/api_keys'},
  Grok: {origin:'https://api.x.ai', models:'/v1/models', kind:'responses', preferred:['grok-4-fast-non-reasoning','grok-3-mini'], setup:'https://console.x.ai'}
};

class HttpError extends Error {
  constructor(status, message, code = '') { super(message); this.status = status; this.code = code; }
}
function json(data, status = 200, headers = {}) {
  return Response.json(data, {status, headers:{'Cache-Control':'no-store', ...headers}});
}
const bytesToBase64 = bytes => btoa(String.fromCharCode(...bytes));
const base64ToBytes = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
const randomToken = () => bytesToBase64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
async function digest(text) { return bytesToBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text)))); }
async function secretKey(env, purpose, algorithm, usages) {
  if (!env.PRISM_SECRET) throw new HttpError(503, '账号服务正在配置，请稍后再试。');
  const raw = await crypto.subtle.digest('SHA-256', encoder.encode(purpose + env.PRISM_SECRET));
  return crypto.subtle.importKey('raw', raw, algorithm, false, usages);
}
async function otpHash(env, id, code) {
  const key = await secretKey(env, 'otp:', {name:'HMAC',hash:'SHA-256'}, ['sign']);
  return bytesToBase64(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(id + ':' + code))));
}
async function encrypt(env, text, owner) {
  const key = await secretKey(env, 'keys:', 'AES-GCM', ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(owner)}, key, encoder.encode(text));
  return bytesToBase64(iv) + '.' + bytesToBase64(new Uint8Array(ciphertext));
}
async function decrypt(env, text, owner) {
  const [iv, ciphertext] = text.split('.');
  const key = await secretKey(env, 'keys:', 'AES-GCM', ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({name:'AES-GCM',iv:base64ToBytes(iv),additionalData:encoder.encode(owner)}, key, base64ToBytes(ciphertext));
  return new TextDecoder().decode(plaintext);
}
async function body(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, '请填写完整信息。');
  const chunks = []; let size = 0;
  while (true) {
    const {done,value} = await reader.read(); if(done) break;
    size += value.length;
    if(size > 16384) { await reader.cancel(); throw new HttpError(413, '提交内容过长。'); }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size); let offset = 0;
  for(const chunk of chunks) { buffer.set(chunk,offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(buffer)); }
  catch { throw new HttpError(400, '提交内容格式不正确。'); }
}
function emailAddress(value) {
  const email = String(value || '').trim().toLowerCase();
  if(email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, '请输入有效的邮箱地址。');
  return email;
}
async function rateLimit(env, key, limit, seconds) {
  const now = Date.now();
  const row = await env.DB.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count').bind(key,now+seconds*1000,now,now).first();
  if(row.count > limit) throw new HttpError(429, '操作较频繁，请稍后再试。');
}
async function currentUser(request, env) {
  const token = request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!token || token.length > 100) return null;
  const user=await env.DB.prepare('SELECT users.id,users.email,users.guest_expires_at FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?').bind(await digest(token),Date.now()).first();
  if(!user)return null;
  if(user.guest_expires_at&&(env.ALLOW_GUEST_TEST!=='true'||user.guest_expires_at<=Date.now()))return null;
  return {id:user.id,email:user.guest_expires_at?null:user.email,isGuest:Boolean(user.guest_expires_at),expiresAt:user.guest_expires_at};
}
async function clearGuests(env,id=null) {
  const condition=id?'id=? AND guest_expires_at IS NOT NULL':'guest_expires_at IS NOT NULL AND guest_expires_at<=?';
  const value=id||Date.now();
  await env.DB.batch([
    ...['requests','conversations','connections','sessions'].map(table=>env.DB.prepare(`DELETE FROM ${table} WHERE user_id IN (SELECT id FROM users WHERE ${condition})`).bind(value)),
    env.DB.prepare(`DELETE FROM users WHERE ${condition}`).bind(value)
  ]);
}
async function guestSession(request,env) {
  if(env.ALLOW_GUEST_TEST!=='true')throw new HttpError(403,'免登录测试暂未开放。');
  const current=await currentUser(request,env);
  if(current)return json({user:current});
  await rateLimit(env,'guest:'+await digest(request.headers.get('CF-Connecting-IP')||request.headers.get('oai-authenticated-user-id')||'unknown'),20,3600);
  await clearGuests(env);
  const id=crypto.randomUUID(),token=randomToken(),expiresAt=Date.now()+21600000;
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users(id,email,created_at,guest_expires_at) VALUES(?,?,?,?)').bind(id,id+'@guest.prism.invalid',Date.now(),expiresAt),
    env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await digest(token),id,expiresAt)
  ]);
  return json({user:{id,email:null,isGuest:true,expiresAt}},200,{'Set-Cookie':sessionCookie(token,21600)});
}
async function requireUser(request, env) {
  const user = await currentUser(request,env);
  if(!user) throw new HttpError(401, '请先登录 PRISM。', 'LOGIN_REQUIRED');
  return user;
}
function sessionCookie(token, maxAge = 2592000) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
async function requestCode(request, env, data) {
  const email = emailAddress(data.email);
  const purpose = data.intent;
  if(!['login','register'].includes(purpose)) throw new HttpError(400, '请选择登录或注册。');
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('oai-authenticated-user-id') || 'unknown';
  await rateLimit(env, 'auth-ip:'+await digest(ip), 20, 3600);
  const user = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
  if(purpose==='login'&&!user) throw new HttpError(404, '这个邮箱尚未注册 PRISM，可以先创建账号。', 'NOT_REGISTERED');
  if(purpose==='register'&&user) throw new HttpError(409, '这个邮箱已注册 PRISM，请直接登录。', 'ALREADY_REGISTERED');
  if(!env.RESEND_API_KEY || !env.AUTH_FROM_EMAIL) throw new HttpError(503, '邮箱验证码服务尚未开通，请等待管理员完成发信配置。', 'MAIL_NOT_CONFIGURED');
  await rateLimit(env, 'auth-email:'+await digest(email), 1, 60);
  const id = crypto.randomUUID();
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6,'0');
  await env.DB.prepare('INSERT INTO challenges(id,email,purpose,code_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(id,email,purpose,await otpHash(env,id,code),Date.now()+600000,Date.now()).run();
  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method:'POST', headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':id},
      body:JSON.stringify({from:env.AUTH_FROM_EMAIL,to:[email],subject:'PRISM 验证码 '+code,text:`你的 PRISM ${purpose==='register'?'注册':'登录'}验证码是 ${code}。10 分钟内有效。请在 PRISM 中输入此验证码。`}),
      signal:AbortSignal.timeout(20000)
    });
  } catch { throw new HttpError(502, '邮件发送未完成，请稍后重新获取验证码。'); }
  if(!response.ok) throw new HttpError(502, '邮件服务暂时无法发送，请稍后再试或联系管理员。');
  await env.DB.prepare('UPDATE challenges SET sent=1 WHERE id=?').bind(id).run();
  return json({challengeId:id,email,expiresIn:600});
}
async function verifyCode(env, data) {
  if(typeof data.challengeId!=='string'||!/^\d{6}$/.test(String(data.code))) throw new HttpError(400,'请输入六位验证码。');
  const row = await env.DB.prepare('UPDATE challenges SET attempts=attempts+1 WHERE id=? AND sent=1 AND consumed=0 AND expires_at>? AND attempts<5 RETURNING *').bind(data.challengeId,Date.now()).first();
  if(!row || row.code_hash!==await otpHash(env,row.id,String(data.code))) throw new HttpError(400, '验证码错误、已过期或尝试次数已用完，请重新获取。');
  const consumed = await env.DB.prepare('UPDATE challenges SET consumed=1 WHERE id=? AND consumed=0 RETURNING id').bind(row.id).first();
  if(!consumed) throw new HttpError(400,'验证码已使用，请重新获取。');
  if(row.purpose==='register') await env.DB.prepare('INSERT INTO users(id,email,created_at) VALUES(?,?,?) ON CONFLICT(email) DO NOTHING').bind(crypto.randomUUID(),row.email,Date.now()).run();
  const user = await env.DB.prepare('SELECT id,email FROM users WHERE email=?').bind(row.email).first();
  if(!user) throw new HttpError(404,'账号不存在，请先注册。');
  const token = randomToken();
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await digest(token),user.id,Date.now()+2592000000).run();
  return json({user},200,{'Set-Cookie':sessionCookie(token)});
}
function providerHeaders(provider, key) {
  if(provider.kind==='gemini') return {'x-goog-api-key':key,'Content-Type':'application/json'};
  if(provider.kind==='claude') return {'x-api-key':key,'anthropic-version':'2023-06-01','Content-Type':'application/json'};
  return {Authorization:'Bearer '+key,'Content-Type':'application/json'};
}
function providerFailure(status) {
  if(status===401||status===403) return '授权无效或模型无访问权限，请检查 API Key。';
  if(status===402) return '该平台的 API 余额不足，请到平台充值后重试。';
  if(status===429) return '该平台额度或请求频率受限，请检查用量后稍后再试。';
  if(status===404||status===400) return '模型或请求不受支持，请在连接设置中重新选择模型。';
  return '该平台暂时无法回答，请稍后重试。';
}
async function modelList(provider, key) {
  let response;
  try { response = await fetch(provider.origin+provider.models,{headers:providerHeaders(provider,key),signal:AbortSignal.timeout(20000)}); }
  catch { throw new HttpError(502,'无法连接该平台，请稍后重试。'); }
  if(!response.ok) throw new HttpError(400,providerFailure(response.status));
  const payload = await response.json();
  let models = (payload.data || payload.models || []).filter(m=>provider.kind!=='gemini'||m.supportedGenerationMethods?.includes('generateContent')).map(m=>(m.id||m.name||'').replace(/^models\//,''));
  if(provider===providers.ChatGPT) models=models.filter(m=>/^(gpt-|o[1-9])/.test(m)&&!/(audio|realtime|image|transcribe|tts)/.test(m));
  if(provider===providers.Grok) models=models.filter(m=>/^grok/.test(m)&&!/(image|video|vision)/.test(m));
  models=[...new Set(models)].filter(m=>/^[a-zA-Z0-9._:-]+$/.test(m)).slice(0,150);
  if(!models.length) throw new HttpError(400,'该密钥没有可用的文本模型。');
  return models;
}
async function connectionList(env, user) {
  const rows = await env.DB.prepare('SELECT provider,model,models_json,updated_at FROM connections WHERE user_id=?').bind(user.id).all();
  return rows.results.map(row=>({provider:row.provider,model:row.model,models:JSON.parse(row.models_json),updatedAt:row.updated_at}));
}
async function validateArkModel(key,model) {
  if(typeof model!=='string'||!model||model.length>160||!/^[a-zA-Z0-9._:-]+$/.test(model))
    throw new HttpError(400,'请填写控制台调用示例中的 Model ID 或推理接入点 ID。');
  const provider=providers['火山方舟'];
  let response;
  try { response=await fetch(provider.origin+'/chat/completions',{method:'POST',headers:providerHeaders(provider,key),
    body:JSON.stringify({model,messages:[{role:'user',content:'Hi'}],max_tokens:16,stream:false}),signal:AbortSignal.timeout(30000)}); }
  catch { throw new HttpError(502,'无法连接火山方舟，请稍后重试。'); }
  if(!response.ok)throw new HttpError(400,providerFailure(response.status));
  const payload=await response.json();
  if(!Array.isArray(payload.choices)||!payload.choices.length)throw new HttpError(400,'请选择支持文本对话的模型。');
  return [model];
}
async function connect(env,user,name,data) {
  const provider=providers[name];
  if(!provider) throw new HttpError(404,'未知平台。');
  await rateLimit(env,'connect:'+user.id,30,3600);
  const existing=await env.DB.prepare('SELECT * FROM connections WHERE user_id=? AND provider=?').bind(user.id,name).first();
  let models, encryptedKey;
  if(typeof data.key==='string' && data.key.trim()) {
    const key=data.key.trim();
    if(key.length>4096 || /\s/.test(key)) throw new HttpError(400,'API Key 格式不正确。');
    models=name==='火山方舟'?await validateArkModel(key,data.model):await modelList(provider,key);
    encryptedKey=await encrypt(env,key,user.id+':'+name);
  } else {
    if(!existing) throw new HttpError(400,'请先填写 API Key。');
    models=JSON.parse(existing.models_json); encryptedKey=existing.encrypted_key;
    if(name==='火山方舟'&&data.model&&data.model!==existing.model)
      models=await validateArkModel(await decrypt(env,encryptedKey,user.id+':'+name),data.model);
  }
  const model=data.model || provider.preferred.find(m=>models.includes(m)) || models[0];
  if(!models.includes(model)) throw new HttpError(400,'请选择该账号可用的模型。');
  await env.DB.prepare('INSERT INTO connections(user_id,provider,encrypted_key,model,models_json,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,provider) DO UPDATE SET encrypted_key=excluded.encrypted_key,model=excluded.model,models_json=excluded.models_json,updated_at=excluded.updated_at').bind(user.id,name,encryptedKey,model,JSON.stringify(models),Date.now()).run();
  return json({connections:await connectionList(env,user)});
}
async function generate(env,user,name,question) {
  const provider=providers[name];
  if(!provider) throw new HttpError(400,'请选择有效的平台。');
  const connection=await env.DB.prepare('SELECT encrypted_key,model FROM connections WHERE user_id=? AND provider=?').bind(user.id,name).first();
  if(!connection) throw new HttpError(409,'请先连接 '+name+'。','NOT_CONNECTED');
  const key=await decrypt(env,connection.encrypted_key,user.id+':'+name);
  let path, payload;
  if(provider.kind==='responses') {
    path='/v1/responses'; payload={model:connection.model,input:question,max_output_tokens:2000,store:false};
  } else if(provider.kind==='claude') {
    path='/v1/messages'; payload={model:connection.model,max_tokens:2000,messages:[{role:'user',content:question}]};
  } else if(provider.kind==='gemini') {
    path='/v1beta/models/'+encodeURIComponent(connection.model)+':generateContent';
    payload={contents:[{role:'user',parts:[{text:question}]}],generationConfig:{maxOutputTokens:2000}};
  } else {
    path='/chat/completions'; payload={model:connection.model,max_tokens:2000,messages:[{role:'user',content:question}],stream:false};
  }
  let response;
  try { response=await fetch(provider.origin+path,{method:'POST',headers:providerHeaders(provider,key),body:JSON.stringify(payload),signal:AbortSignal.timeout(90000)}); }
  catch { throw new HttpError(504,'该平台响应超时，请稍后重试。'); }
  if(!response.ok) throw new HttpError(502,providerFailure(response.status));
  const data=await response.json();
  let text;
  if(provider.kind==='responses') text=(data.output||[]).flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text).join('\n');
  else if(provider.kind==='claude') text=(data.content||[]).filter(item=>item.type==='text').map(item=>item.text).join('\n');
  else if(provider.kind==='gemini') text=(data.candidates?.[0]?.content?.parts||[]).filter(item=>!item.thought).map(item=>item.text||'').join('\n');
  else text=data.choices?.[0]?.message?.content;
  if(!text?.trim()) throw new HttpError(502,'该平台没有返回可显示的文字，可能触发了内容限制或输出上限。');
  return {provider:name,model:connection.model,text:text.trim().slice(0,40000)};
}
async function ask(env,user,data) {
  const question=String(data.question||'').trim(), name=data.provider;
  const conversationId=data.conversationId||data.requestId;
  if(!question||question.length>800||!providers[name]||!/^[a-zA-Z0-9-]{16,64}$/.test(data.requestId||'')||!/^[a-zA-Z0-9-]{16,64}$/.test(conversationId||'')) throw new HttpError(400,'问题或请求参数不正确。');
  const previous=await env.DB.prepare('SELECT status,result,conversation_id FROM requests WHERE user_id=? AND id=? AND provider=?').bind(user.id,data.requestId,name).first();
  if(previous) {
    const original=await env.DB.prepare('SELECT question FROM conversations WHERE user_id=? AND id=?').bind(user.id,previous.conversation_id).first();
    if(previous.conversation_id!==conversationId||original?.question!==question)throw new HttpError(409,'请求编号与原问题不匹配，请重新提问。');
  }
  if(previous?.status==='done') return json(JSON.parse(previous.result));
  if(previous) throw new HttpError(409,'这个请求正在处理或已结束，请重新提问。');
  if(!await env.DB.prepare('SELECT provider FROM connections WHERE user_id=? AND provider=?').bind(user.id,name).first()) throw new HttpError(409,'请先连接 '+name+'。','NOT_CONNECTED');
  const now=Date.now();
  await env.DB.prepare('INSERT INTO conversations(user_id,id,question,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING').bind(user.id,conversationId,question,now,now).run();
  const conversation=await env.DB.prepare('SELECT question FROM conversations WHERE user_id=? AND id=?').bind(user.id,conversationId).first();
  if(conversation.question!==question)throw new HttpError(409,'历史问题不可更改，请作为新问题发送。');
  await env.DB.prepare("UPDATE requests SET status='failed',error=? WHERE user_id=? AND conversation_id=? AND provider=? AND status='pending' AND created_at<?").bind('上次请求未完成，可以重试。',user.id,conversationId,name,now-120000).run();
  const latest=await env.DB.prepare('SELECT status FROM requests WHERE user_id=? AND conversation_id=? AND provider=? ORDER BY created_at DESC,rowid DESC LIMIT 1').bind(user.id,conversationId,name).first();
  if(latest?.status==='done')throw new HttpError(409,'该平台已回答。如需新回答，请重新提问。');
  await rateLimit(env,'ask:'+user.id,100,3600);
  const inserted=await env.DB.prepare("INSERT INTO requests(user_id,id,provider,status,created_at,conversation_id) VALUES(?,?,?,'pending',?,?) ON CONFLICT DO NOTHING RETURNING id").bind(user.id,data.requestId,name,now,conversationId).first();
  if(!inserted) throw new HttpError(409,'这个请求已在处理。');
  try {
    const result=await generate(env,user,name,question);
    await env.DB.prepare("UPDATE requests SET status='done',result=? WHERE user_id=? AND id=? AND provider=?").bind(JSON.stringify(result),user.id,data.requestId,name).run();
    await env.DB.prepare('UPDATE conversations SET updated_at=? WHERE user_id=? AND id=?').bind(Date.now(),user.id,conversationId).run();
    return json(result);
  } catch(error) {
    await env.DB.prepare("UPDATE requests SET status='failed',error=? WHERE user_id=? AND id=? AND provider=?").bind(error instanceof HttpError?error.message:'该平台暂时无法回答，请稍后重试。',user.id,data.requestId,name).run();
    throw error;
  }
}
async function historyList(env,user) {
  const rows=await env.DB.prepare("SELECT c.id,c.question,c.created_at,c.updated_at,(SELECT COUNT(DISTINCT r.provider) FROM requests r WHERE r.user_id=c.user_id AND r.conversation_id=c.id AND r.status='done') AS answer_count FROM conversations c WHERE c.user_id=? ORDER BY c.updated_at DESC,c.id DESC LIMIT 50").bind(user.id).all();
  return json({conversations:rows.results});
}
async function historyDetail(env,user,id) {
  const conversation=await env.DB.prepare('SELECT id,question,created_at,updated_at FROM conversations WHERE user_id=? AND id=?').bind(user.id,id).first();
  if(!conversation)throw new HttpError(404,'找不到这条提问记录。');
  const rows=await env.DB.prepare('SELECT provider,status,result,error,created_at FROM requests WHERE user_id=? AND conversation_id=? ORDER BY created_at DESC,rowid DESC').bind(user.id,id).all();
  const latest=new Map();
  for(const row of rows.results) {
    if(latest.has(row.provider))continue;
    const pending=row.status==='pending'&&row.created_at>Date.now()-120000;
    latest.set(row.provider,row.status==='done'?{...JSON.parse(row.result),state:'done'}:{provider:row.provider,state:pending?'pending':'error',title:pending?'仍在生成回答':'上次回答未完成',error:row.error||'上次请求未完成，可以重试。'});
  }
  return json({...conversation,answers:[...latest.values()]});
}
export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);
    try {
      if(!url.pathname.startsWith('/api/')) {
        const asset=assets[url.pathname==='/'?'/index.html':url.pathname];
        if(!asset) return new Response('Not found',{status:404});
        if(!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405});
        return new Response(request.method==='HEAD'?null:base64ToBytes(asset.data),{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
      }
      if(!env.DB) throw new HttpError(503,'账号数据库正在初始化，请稍后再试。');
      if(request.method!=='GET' && request.headers.get('Origin')!==url.origin) throw new HttpError(403,'请从 PRISM 页面提交请求。');
      if(url.pathname==='/api/session'&&request.method==='GET') {
        await clearGuests(env);
        return json({user:await currentUser(request,env),guestAllowed:env.ALLOW_GUEST_TEST==='true',mailReady:Boolean(env.RESEND_API_KEY&&env.AUTH_FROM_EMAIL),providers:Object.entries(providers).map(([name,p])=>({name,setup:p.setup}))});
      }
      if(url.pathname==='/api/auth/guest'&&request.method==='POST')return await guestSession(request,env);
      if(url.pathname==='/api/auth/request'&&request.method==='POST') return await requestCode(request,env,await body(request));
      if(url.pathname==='/api/auth/verify'&&request.method==='POST') return await verifyCode(env,await body(request));
      if(url.pathname==='/api/auth/logout'&&request.method==='POST') {
        const current=await currentUser(request,env);
        if(current?.isGuest)await clearGuests(env,current.id);
        const token=request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
        if(token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();
        return json({ok:true},200,{'Set-Cookie':sessionCookie('',0)});
      }
      const user=await requireUser(request,env);
      if(url.pathname==='/api/history'&&request.method==='GET')return await historyList(env,user);
      if(url.pathname.startsWith('/api/history/')&&request.method==='GET')return await historyDetail(env,user,decodeURIComponent(url.pathname.slice('/api/history/'.length)));
      if(url.pathname==='/api/connections'&&request.method==='GET') return json({connections:await connectionList(env,user)});
      const match=url.pathname.match(/^\/api\/connections\/([^/]+)$/);
      if(match) {
        const name=decodeURIComponent(match[1]);
        if(request.method==='POST') return await connect(env,user,name,await body(request));
        if(request.method==='DELETE') { await env.DB.prepare('DELETE FROM connections WHERE user_id=? AND provider=?').bind(user.id,name).run(); return json({ok:true}); }
      }
      if(url.pathname==='/api/ask'&&request.method==='POST') return await ask(env,user,await body(request));
      throw new HttpError(404,'找不到这个接口。');
    } catch(error) {
      return json({error:error instanceof HttpError?error.message:'服务暂时不可用，请稍后重试。',code:error.code||''},error instanceof HttpError?error.status:500);
    }
  }
};
