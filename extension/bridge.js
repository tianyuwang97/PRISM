'use strict';
const origin = 'https://prism-six-tiany-1120.xiaoboss.chatgpt.site';
window.addEventListener('message',async event=>{
  const m=event.data;
  if(event.source!==window||event.origin!==origin||m?.channel!=='prism-web-request'||typeof m.rpc!=='string'||m.rpc.length>80) return;
  if(!['status','ask','poll','cancel','reset'].includes(m.type))return;
  let result;
  try {result=await chrome.runtime.sendMessage({type:m.type,id:m.id,question:m.question,provider:m.provider});}
  catch {result={ok:false,error:'扩展连接已中断，请刷新 PRISM 和对应的 AI 官网。'};}
  window.postMessage({channel:'prism-web-response',rpc:m.rpc,...result},origin);
});
