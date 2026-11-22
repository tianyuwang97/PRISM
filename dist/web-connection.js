'use strict';
const webConnection=(()=>{
  let enabled=new URLSearchParams(location.search).get('mode')==='web'||sessionStorage.getItem('prism-web-mode')==='true',connected=false;
  const pending=new Map();
  let ready=[];
  let selected;try{selected=JSON.parse(sessionStorage.getItem('prism-web-providers')||'null');}catch{selected=null;}
  if(!Array.isArray(selected))selected=['DeepSeek','ChatGPT'];
  const labels=['ChatGPT','Claude','DeepSeek','Gemini','Grok'];
  selected=selected.filter(p=>labels.includes(p));
  const canAsk=provider=>ready.includes(provider)&&selected.includes(provider);
  const label=()=>{document.getElementById('webButton').textContent=enabled?'网页模式 · '+selected.length+' 家':'网页测试';};
  function renderProviders(){
    const list=document.getElementById('webProviders');list.replaceChildren();
    for(const provider of labels){const row=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span');input.type='checkbox';input.checked=selected.includes(provider);input.onchange=()=>{selected=input.checked?[...new Set([...selected,provider])]:selected.filter(p=>p!==provider);sessionStorage.setItem('prism-web-providers',JSON.stringify(selected));label();toggle.disabled=!ready.some(canAsk);};text.textContent=provider+(ready.includes(provider)?' · 已连接':' · 未连接');row.append(input,text);list.append(row);}
  }
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin||event.data?.channel!=='prism-web-response')return;
    const task=pending.get(event.data.rpc);if(!task)return;
    clearTimeout(task.timer);pending.delete(event.data.rpc);
    event.data.ok===false?task.reject(Error(event.data.error||'扩展连接失败')):task.resolve(event.data);
  });
  function rpc(type,data={},timeout=15000){return new Promise((resolve,reject)=>{
    const timeoutMessage=type==='ask'?'发送确认等待超时。问题可能已填写或发出，请先到官网核对，避免重复发送。':type==='poll'?'暂时未收到官网回答状态。请查看官网是否已回答；无需重新安装扩展。':'网页扩展暂未响应。若刚更新扩展，请刷新 PRISM 和对应官网，再检查连接。';
    const id=crypto.randomUUID();pending.set(id,{resolve,reject,timer:setTimeout(()=>{pending.delete(id);reject(Error(timeoutMessage));},timeout)});
    window.postMessage({channel:'prism-web-request',rpc:id,type,...data},location.origin);
  });}
  const dialog=document.getElementById('webDialog'),status=document.getElementById('webStatus'),toggle=document.getElementById('webEnable');
  async function prepare(){
    const result=await rpc('status');
    ready=result.providers?result.providers.filter(p=>p.connected).map(p=>p.provider):(result.connected?['DeepSeek']:[]);
    renderProviders();
    if(!ready.some(canAsk))throw Error('请先绑定并勾选至少一家 AI 官网。');
    return ready.filter(canAsk);
  }
  async function refresh(){
    status.textContent='正在检查已绑定的官网…';toggle.disabled=true;
    try{const names=await prepare();connected=true;status.textContent=names.join('、')+' 已就绪；只向勾选且已连接的官网发送问题。';toggle.disabled=false;}
    catch(error){connected=false;status.textContent=error.message;renderProviders();}
  }
  function open(){dialog.showModal();refresh();}
  document.getElementById('webButton').onclick=open;
  document.getElementById('webRefresh').onclick=refresh;
  document.getElementById('webReset').onclick=async()=>{try{for(const provider of selected)await rpc('reset',{provider});status.textContent='已重置连接任务。官网对话保留；如仍在生成，请先在官网停止，再返回提问。';}catch(error){status.textContent=error.message;}};
  label();renderProviders();
  toggle.onclick=()=>{enabled=true;sessionStorage.setItem('prism-web-mode','true');label();dialog.close();};
  document.getElementById('webDisable').onclick=()=>{enabled=false;sessionStorage.removeItem('prism-web-mode');const url=new URL(location.href);url.searchParams.delete('mode');history.replaceState(null,'',url);document.getElementById('webButton').textContent='网页测试';dialog.close();};
  async function ask(provider,question,signal,onProgress){
    let id=crypto.randomUUID();
    const abort=()=>{rpc('cancel',{id,provider}).catch(()=>{});};
    if(signal?.aborted)throw new DOMException('已取消','AbortError');
    signal?.addEventListener('abort',abort,{once:true});
    try{
      const accepted=await rpc('ask',{id,question,provider});
      if(accepted.id)id=accepted.id;
      const started=Date.now();
      while(Date.now()-started<185000){
        if(signal?.aborted)throw new DOMException('已取消','AbortError');
        const result=await rpc('poll',{id,provider});
        if(result.text)onProgress?.(result.text);
        if(result.state==='done')return result;
        if(result.state==='error')throw Error(result.error);
        await new Promise(resolve=>setTimeout(resolve,700));
      }
      throw Error('等待超时，请在对应官网检查回答状态。');
    }finally{signal?.removeEventListener('abort',abort);abort();}
  }
  return {get enabled(){return enabled;},ask,open,prepare,canAsk};
})();
