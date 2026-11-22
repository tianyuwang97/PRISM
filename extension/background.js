'use strict';
const PRISM = 'https://prism-six-tiany-1120.xiaoboss.chatgpt.site';
const HOSTS={DeepSeek:'https://chat.deepseek.com',ChatGPT:'https://chatgpt.com',Gemini:'https://gemini.google.com',Claude:'https://claude.ai',Grok:'https://grok.com',Dola:'https://www.dola.com'};
const providers=Object.keys(HOSTS);
const providerFor=url=>providers.find(p=>HOSTS[p]===origin(url));
const origin = value => { try { return new URL(value).origin; } catch { return ''; } };
const popup = sender => sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL('popup.html');
const page = (sender, host) => sender.id === chrome.runtime.id && sender.frameId === 0 && Number.isInteger(sender.tab?.id) && origin(sender.url) === host;
const validId = id => typeof id === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(id);
let gate = Promise.resolve();
function locked(fn) { const next = gate.then(fn, fn); gate = next.catch(()=>{}); return next; }
function tabMessage(tabId,message,ms=4000){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{const error=Error(message.type==='ask'?'发送确认超时，问题可能已发出。请先核对官网；不会自动重发。':'官网暂未响应，请刷新该官网后重新绑定。');error.code='TAB_TIMEOUT';reject(error);},ms);
    Promise.resolve().then(()=>chrome.tabs.sendMessage(tabId,message)).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  });
}
const missingReceiver=error=>/Receiving end does not exist|Could not establish connection|message port closed/i.test(error?.message||'');
const connectionError=provider=>provider+' 页面尚未加载连接脚本。请先保存输入框草稿，再点击“刷新官网并重新绑定”。若仍失败，请在 Edge 的扩展网站访问权限中允许此官网，然后重试。';
async function inspectTab(tabId,provider){
  try{return await tabMessage(tabId,{type:'inspect'});}
  catch(error){if(missingReceiver(error))throw Error(connectionError(provider));throw error;}
}
async function state(provider='DeepSeek'){
  const data=await chrome.storage.session.get(['binding:'+provider,'job:'+provider,'binding','job']);
  return {binding:data['binding:'+provider]||(provider==='DeepSeek'?data.binding:null),job:data['job:'+provider]||(provider==='DeepSeek'?data.job:null)};
}
async function setJob(provider,job){await chrome.storage.session.set({['job:'+provider]:job});if(provider==='DeepSeek')await chrome.storage.session.remove('job');}
async function clearJob(provider){await chrome.storage.session.remove('job:'+provider);if(provider==='DeepSeek')await chrome.storage.session.remove('job');}
async function reconcile(provider,binding,job){
  if(!binding||job?.state!=='pending')return job;
  if(job.expires<Date.now()){
    await tabMessage(binding.tabId,{type:'cancel',id:job.id}).catch(()=>{});
    const ended={...job,state:'error',error:'上一条网页任务已超时，可以重新提问。'};await setJob(provider,ended);return ended;
  }
  try{
    const tab=await chrome.tabs.get(binding.tabId);
    if(origin(tab.url)!==HOSTS[provider])return job;
    const probe=await tabMessage(binding.tabId,{type:'probe',id:job.id});
    if(!probe?.ok||typeof probe.generating!=='boolean'||!Object.hasOwn(probe,'activeId'))return job;
    let update;
    if(probe.result?.id===job.id){
      const result=probe.result;
      if(typeof result.text==='string'&&result.text.trim()&&result.text.length<=100000)update={...job,state:'done',text:result.text,model:provider+' · 网页回答'};
      else if(typeof result.error==='string')update={...job,state:'error',error:result.error.slice(0,500)};
    }else if(probe.activeId===null&&!probe.generating){
      update={...job,state:'error',error:'官网页面已刷新或原任务已结束，连接已恢复，请重新提问。'};
    }
    if(update){await setJob(provider,update);return update;}
  }catch{/* Unsupported older adapters remain guarded until timeout. */}
  return job;
}
async function handle(msg, sender) {
  if (!msg || typeof msg !== 'object') throw Error('无效消息');
  if (popup(sender)) {
    if(msg.type==='diagnose'){
      const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
      const provider=providerFor(tab?.url);
      if(!['Gemini','Claude','Grok','Dola'].includes(provider))throw Error('诊断适用于 Gemini、Claude、Grok 和 Dola，请先切换到对应官网。');
      try{const result=await tabMessage(tab.id,{type:msg.type});if(!result?.ok)throw Error(result?.error||'请刷新官网后再诊断。');return result;}
      catch(error){if(missingReceiver(error))throw Error(connectionError(provider));throw error;}
    }
    if (msg.type === 'bind' || msg.type === 'refreshBind') {
      const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
      const provider=providerFor(tab?.url);
      if(!provider)throw Error('请切换到 ChatGPT、DeepSeek、Gemini、Claude、Grok 或 Dola 官网的聊天标签页，再绑定。');
      const {binding,job:storedJob} = await state(provider);
      const job=await reconcile(provider,binding,storedJob);
      if (job?.state === 'pending' && job.expires > Date.now()) throw Error('请等当前回答结束后再绑定。');
      let check;
      if(msg.type==='refreshBind'){
        await chrome.tabs.reload(tab.id);
        for(let i=0;i<30;i++){
          await new Promise(resolve=>setTimeout(resolve,400));
          const current=await chrome.tabs.get(tab.id);
          if(origin(current.url)!==HOSTS[provider])throw Error('页面离开了对应官网，请完成登录后重新绑定。');
          try{check=await inspectTab(tab.id,provider);if(check?.ready)break;}catch(error){if(error.code==='TAB_TIMEOUT'||i===29)throw error;}
        }
      }else check=await inspectTab(tab.id,provider);
      if (!check?.ready) throw Error(check?.error || '请等待官网加载完毕并完成登录，再点击绑定。');
      await chrome.storage.session.set({['binding:'+provider]:{tabId:tab.id}});await clearJob(provider);if(provider==='DeepSeek')await chrome.storage.session.remove('binding');
      return {ok:true,message:'已绑定 '+provider+' 标签页，回到 PRISM 检查连接即可。'};
    }
    if (msg.type === 'disconnect') {
      for(const provider of providers){const {binding}=await state(provider);if(binding)await tabMessage(binding.tabId,{type:'cancel'}).catch(()=>{});}
      await chrome.storage.session.clear(); return {ok:true,message:'已断开网页连接'};
    }
    if (msg.type === 'status') return status();
    throw Error('不支持的操作');
  }
  const sourceProvider=providerFor(sender.url);
  if (sourceProvider&&page(sender,HOSTS[sourceProvider])&&['result','progress'].includes(msg.type)) {
    const provider=sourceProvider;
    const {binding,job} = await state(provider);
    if (!job || job.state !== 'pending' || binding?.tabId !== sender.tab.id || job.id !== msg.id || job.expires < Date.now()) return {ok:false};
    if(msg.type==='progress'){
      if(typeof msg.text==='string'&&msg.text.length<=100000)await setJob(provider,{...job,text:msg.text});
      return {ok:true};
    }
    if (typeof msg.text === 'string' && msg.text.trim() && msg.text.length <= 100000) {
      await setJob(provider,{...job,state:'done',text:msg.text,model:provider+' · 网页回答'});
    } else {
      await setJob(provider,{...job,state:'error',error:typeof msg.error==='string'?msg.error.slice(0,500):'未读取到回答'});
    }
    return {ok:true};
  }
  if (!page(sender,PRISM)) throw Error('不允许的页面');
  if (msg.type === 'status') return status();
  const provider=msg.provider||'DeepSeek';
  if(!providers.includes(provider))throw Error('此网页平台尚未接入');
  if (msg.type === 'ask') {
    if (!validId(msg.id) || typeof msg.question !== 'string' || !msg.question.trim() || msg.question.length > 800) throw Error('问题格式不正确');
    const {binding,job:storedJob} = await state(provider);
    if (!binding) throw Error('请先在扩展里绑定 '+provider+' 标签页。');
    const job=await reconcile(provider,binding,storedJob);
    if (job?.id === msg.id) return {ok:true};
    if(job?.state==='pending'&&job.owner===sender.tab.id&&job.question===msg.question)return {ok:true,id:job.id};
    if (job?.state === 'pending' && job.expires > Date.now()) throw Error(provider+' 上一条网页任务仍在进行，请在网页测试面板重置后重试。');
    const tab = await chrome.tabs.get(binding.tabId);
    if (origin(tab.url) !== HOSTS[provider]) throw Error('已绑定的标签页离开了对应官网，请重新绑定。');
    const next = {id:msg.id,owner:sender.tab.id,question:msg.question,state:'pending',expires:Date.now()+180000};
    await setJob(provider,next);
    try {
      const accepted = await tabMessage(binding.tabId,{type:'ask',id:msg.id,question:msg.question});
      if (!accepted?.ok) throw Error(accepted?.error || '网页未就绪');
    } catch(error) {
      if(error.code==='TAB_TIMEOUT')throw error; // Keep ownership pending: a late send must not be duplicated.
      if(missingReceiver(error))error=Error(connectionError(provider));
      await setJob(provider,{...next,state:'error',error:error.message});
      throw error;
    }
    return {ok:true};
  }
  if(msg.type==='reset'){
    const {job,binding}=await state(provider);
    if(job&&job.owner!==sender.tab.id)throw Error('另一张 PRISM 标签页正在使用连接，请在原标签页结束任务。');
    if(binding)await tabMessage(binding.tabId,{type:'cancel'}).catch(()=>{});
    await clearJob(provider);return {ok:true};
  }
  if (msg.type === 'poll' || msg.type === 'cancel') {
    const {job:storedJob,binding} = await state(provider);
    let job=storedJob;
    if (!validId(msg.id) || !job || job.id !== msg.id || job.owner !== sender.tab.id) throw Error('本次连接已结束，请重新提问。');
    if (msg.type === 'cancel') {
      if(binding) await tabMessage(binding.tabId,{type:'cancel',id:msg.id}).catch(()=>{});
      await clearJob(provider); return {ok:true};
    }
    if (job.expires < Date.now()) {
      if(binding)await tabMessage(binding.tabId,{type:'cancel',id:job.id}).catch(()=>{});
      await clearJob(provider);
      throw Error('网页等待超过三分钟，请到对应官网检查是否需要验证，或稍后重试。');
    }
    job=await reconcile(provider,binding,job);
    return {ok:true,state:job.state,text:job.text,model:job.model,error:job.error};
  }
  throw Error('不支持的操作');
}
async function status(){
  const results=await Promise.all(providers.map(async provider=>{
    const {binding}=await state(provider);
    if(!binding)return {provider,connected:false,error:'未绑定'};
    try{
      const tab=await chrome.tabs.get(binding.tabId);
      if(origin(tab.url)!==HOSTS[provider])return {provider,connected:false,error:'标签页已离开官网'};
      const result=await tabMessage(binding.tabId,{type:'inspect'});
      return {provider,connected:!!result?.ready,error:result?.error};
    }catch(error){return {provider,connected:false,error:error.message||'请刷新官网页面后重新绑定'};}
  }));
  return {ok:true,version:'0.4.4',connected:results.some(r=>r.connected),providers:results};
}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  const readOnlyStatus=msg?.type==='status'&&(popup(sender)||page(sender,PRISM));
  (readOnlyStatus?handle(msg,sender):locked(()=>handle(msg,sender))).then(reply,error=>reply({ok:false,error:error.message}));
  return true;
});
chrome.tabs.onRemoved.addListener(tabId=>{locked(async()=>{
  for(const provider of providers){
    const {binding,job}=await state(provider);
    if(binding?.tabId===tabId){await chrome.storage.session.remove('binding:'+provider);if(provider==='DeepSeek')await chrome.storage.session.remove('binding');}
    if(job?.owner===tabId||binding?.tabId===tabId)await clearJob(provider);
  }
});});
