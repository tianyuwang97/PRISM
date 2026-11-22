const status=document.getElementById('status');
async function send(type){
 let timer;
 try{return await Promise.race([chrome.runtime.sendMessage({type}),new Promise(resolve=>{timer=setTimeout(()=>resolve({ok:false,error:'扩展响应超时。请在 edge://extensions 重新加载 PRISM，再刷新官网和 PRISM 页面。'}),type==='refreshBind'||type==='disconnect'?35000:12000);})]);}
 catch{return {ok:false,error:'扩展连接中断，请重新加载扩展，再刷新官网和 PRISM。'};}
 finally{clearTimeout(timer);}
}
async function refreshStates(){
 const r=await send('status'),list=document.getElementById('providers');list.replaceChildren();
 for(const p of r.providers||[]){const row=document.createElement('div');row.className='provider';const name=document.createElement('span'),state=document.createElement('span');name.textContent=p.provider;state.textContent=p.connected?'已绑定':p.error==='未绑定'?'未绑定':'需重新连接';state.className=p.connected?'connected':'muted';if(p.error)row.title=p.error;row.append(name,state);list.append(row);}
 return r;
}
let actionStarted=false;
const actions=['bind','refreshBind','disconnect','diagnose'];
for(const type of actions)document.getElementById(type).onclick=async()=>{
 actionStarted=true;
 const buttons=actions.map(id=>document.getElementById(id));buttons.forEach(b=>b.disabled=true);
 status.textContent=type==='refreshBind'?'正在刷新官网并等待连接…':'正在处理…';
 const result=await send(type);status.textContent=result.message||result.error||'操作未完成';
 if(type!=='diagnose')await refreshStates();buttons.forEach(b=>b.disabled=false);
};
refreshStates().then(r=>{if(actionStarted)return;status.textContent=r.connected?'已绑定的平台见下方。可继续绑定其他官网，或回 PRISM 提问。':r.error||'请在要连接的 AI 官网点击绑定。';});
