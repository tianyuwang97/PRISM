'use strict';
// Only visible page DOM. No cookies, tokens, private APIs or previous conversation export.
let active=null,completed=null;
const visible=node=>!!node && node.getClientRects().length>0;
const editor=()=>Array.from(document.querySelectorAll('textarea')).find(e=>visible(e)&&/DeepSeek|发送消息|Message/i.test(e.placeholder||e.getAttribute('aria-label')||''));
const answers=()=>Array.from(document.querySelectorAll('.ds-markdown')).filter(visible);
function inspect(){
  if(/sign_in|login/.test(location.pathname)||!editor())return {ready:false,error:'请先在 DeepSeek 官网完成登录，并打开聊天页面。'};
  return {ready:true};
}
function report(result){
  if(!active)return;
  const id=active.id;clearInterval(active.timer);active=null;completed={id,...result};
  chrome.runtime.sendMessage({type:'result',id,...result}).catch(()=>{});
}
function start(msg){
  const check=inspect();if(!check.ready)throw Error(check.error);
  if(active)throw Error('DeepSeek 正在处理上一条问题。');
  const input=editor();
  if(input.value.trim())throw Error('DeepSeek 输入框里有未发送内容，请先处理或清空后重试。');
  const last=answers().at(-1);
  if(last&&!PrismDeepSeekDOM.finished(last))throw Error('DeepSeek 网页可能仍在生成，请先在官网完成或停止上一条回答。');
  const before=new Set(answers());
  completed=null;
  active={id:msg.id,question:msg.question,before,started:Date.now(),text:'',changed:Date.now(),candidate:null,timer:null};
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,msg.question);
  input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();
  // Keep the page's own send handler and session; never call an undocumented endpoint.
  input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true}));
  active.timer=setInterval(tick,500);
}
function tick(){
    if(!active)return;
    if(Date.now()-active.started>175000){report({error:'网页未在三分钟内完成。请到 DeepSeek 检查登录、验证或限流提示。'});return;}
    if(!inspect().ready){report({error:'DeepSeek 页面已离开聊天界面，请重新登录或绑定。'});return;}
    if(Date.now()-active.started>8000&&editor()?.value===active.question){report({error:'网页没有接受发送操作。请在 DeepSeek 检查输入框后重试。'});return;}
    const fresh=answers().filter(node=>!active.before.has(node));
    const candidate=fresh.at(-1), text=candidate?.innerText?.trim()||'';
    if(!text)return;
    if(text!==active.text){active.candidate=candidate;active.text=text;active.changed=Date.now();chrome.runtime.sendMessage({type:'progress',id:active.id,text:text.slice(0,100000)}).catch(()=>{});return;}
    const stop=Array.from(document.querySelectorAll('button,[role="button"]')).some(e=>visible(e)&&/停止生成|停止回答|Stop generating|Stop response/i.test((e.getAttribute('aria-label')||'')+' '+(e.title||'')+' '+e.innerText));
    // Require a finished response toolbar as well as stable text; a thinking pause is not completion.
    if(!stop&&PrismDeepSeekDOM.finished(candidate)&&Date.now()-active.changed>1800) report({text:text.slice(0,100000)});


}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(sender.id!==chrome.runtime.id)return;
  if(msg.type==='inspect'){reply(inspect());return;}
  if(msg.type==='probe'){tick();reply({ok:true,activeId:active?.id||null,generating:!!active,result:completed?.id===msg.id?completed:null});return;}
  if(msg.type==='cancel'){if(active&&(!msg.id||active.id===msg.id)){clearInterval(active.timer);active=null;}reply({ok:true});return;}
  if(msg.type==='ask'){try{start(msg);reply({ok:true});}catch(error){reply({ok:false,error:error.message});}return;}
});
window.addEventListener('pagehide',()=>{if(active)report({error:'DeepSeek 页面已刷新或关闭，请重新提问。'});});
