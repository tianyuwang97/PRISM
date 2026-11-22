'use strict';
(() => {
  let active=null,completed=null;
  const visible=e=>!!e&&e.getClientRects().length>0;
  const editor=()=>{
    const known=Array.from(document.querySelectorAll('#prompt-textarea[contenteditable="true"],#mobile-composer-prompt,textarea[placeholder*="ChatGPT"],textarea[data-id="root"],#prompt-textarea,[contenteditable="true"][aria-label*="ChatGPT"],[contenteditable="true"][data-lexical-editor="true"]')).find(visible);
    if(known)return known;
    // New ChatGPT layouts change the composer's id. Use only a unique visible
    // multiline editor; never fall back to generic inputs such as search/password.
    const candidates=Array.from(document.querySelectorAll('textarea,[contenteditable="true"]')).filter(e=>visible(e)&&!e.disabled&&e.getAttribute('aria-readonly')!=='true'&&!e.closest('[role="dialog"],[role="search"],[data-message-author-role]')&&e.getAttribute('role')!=='searchbox');
    return candidates.length===1?candidates[0]:null;
  };
  const textOf=e=>e?.tagName==='TEXTAREA'?e.value:e?.innerText||'';
  const assistants=()=>Array.from(document.querySelectorAll('[data-message-author-role="assistant"],[data-chatgpt-search-unit-key$=":assistant"]')).filter(e=>visible(e)&&!e.parentElement?.closest('[data-message-author-role="assistant"],[data-chatgpt-search-unit-key$=":assistant"]'));
  const answerKey=e=>e.getAttribute('data-chatgpt-search-unit-key')||e.getAttribute('data-message-id')||e;
  const button=(kind)=>Array.from(document.querySelectorAll('button')).find(e=>visible(e)&&(kind==='send'?(e.dataset.testid==='send-button'||/^(发送|发送消息|发送提示|Send|Send message|Send prompt)$/i.test(e.getAttribute('aria-label')||'')):(e.dataset.testid==='stop-button'||/停止(生成|流式传输|回答)|Stop (generating|streaming|response)/i.test(e.getAttribute('aria-label')||''))));
  function inspect(){return editor()?{ready:true}:{ready:false,error:'扩展已连接 ChatGPT，但未识别到可用输入框。请关闭搜索或弹窗并打开新聊天；如果已能手动提问，则是当前页面版本尚未适配，无需重复登录。'};}
  function finish(result){if(!active)return;const id=active.id;clearInterval(active.timer);active=null;completed={id,...result};chrome.runtime.sendMessage({type:'result',id,...result}).catch(()=>{});}
  function answerText(node){const bodies=Array.from(node.querySelectorAll('[data-markdown-text-style="assistant-message"],.markdown'));return bodies.length?bodies.map(e=>e.innerText.trim()).filter(Boolean).join('\n\n'):node.innerText.trim();}
  function finished(node){
    if(button('stop'))return false;
    const modernTurn=node.closest('[data-talvt-turn-state]');
    if(modernTurn)return modernTurn.getAttribute('data-talvt-turn-state')==='complete';
    const turn=node.closest('article,[data-testid^="conversation-turn-"]')||node.parentElement?.parentElement;
    if(!turn)return false;
    return Array.from(turn.querySelectorAll('button')).some(e=>visible(e)&&(e.dataset.testid==='copy-turn-action-button'||/复制|Copy|Good response|Bad response|回答不错|回答不好/i.test(e.getAttribute('aria-label')||'')));
  }
  async function start(msg){
    if(active)throw Error('ChatGPT 正在处理上一条网页问题。');
    if(!inspect().ready)throw Error(inspect().error);
    if(button('stop'))throw Error('ChatGPT 官网仍在生成，请先等待完成或停止回答。');
    const input=editor();if(textOf(input).trim())throw Error('ChatGPT 输入框里有未发送内容，请先处理或清空后重试。');
    const before=new Set(assistants().map(answerKey));completed=null;
    active={id:msg.id,before,text:'',changed:Date.now(),started:Date.now(),candidate:null,timer:null};
    input.focus();
    if(input.tagName==='TEXTAREA'){
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,msg.question);
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }else{
      const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(input);selection.removeAllRanges();selection.addRange(range);
      if(!document.execCommand('insertText',false,msg.question)){
        input.textContent=msg.question;input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:msg.question}));
      }
    }
    let send;
    for(let i=0;i<20;i++){send=button('send');if(send&&!send.disabled)break;await new Promise(resolve=>setTimeout(resolve,100));}
    if(!active||active.id!==msg.id)throw Error('任务已取消');
    if(!send||send.disabled)throw Error('ChatGPT 发送按钮不可用，请在官网检查验证或额度提示。');
    send.click(); // one submission only, through the visible page button
    active.timer=setInterval(tick,500);
  }
  function tick(){
      if(!active)return;
      if(Date.now()-active.started>175000){finish({error:'ChatGPT 网页等待超时，请检查官网验证或额度提示。'});return;}
      const candidate=assistants().filter(e=>!active.before.has(answerKey(e))).at(-1);
      if(!candidate)return;
      const text=answerText(candidate);if(!text)return;
      if(candidate!==active.candidate||text!==active.text){active.candidate=candidate;active.text=text;active.changed=Date.now();chrome.runtime.sendMessage({type:'progress',id:active.id,text:text.slice(0,100000)}).catch(()=>{});return;}
      if(finished(candidate)&&Date.now()-active.changed>1500)finish({text:text.slice(0,100000)});
  }
  chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
    if(sender.id!==chrome.runtime.id)return;
    if(msg.type==='inspect'){reply(inspect());return;}
    if(msg.type==='probe'){tick();reply({ok:true,activeId:active?.id||null,generating:!!button('stop'),result:completed?.id===msg.id?completed:null});return;}
    if(msg.type==='cancel'){if(active&&(!msg.id||active.id===msg.id)){clearInterval(active.timer);active=null;}reply({ok:true});return;}
    if(msg.type==='ask'){start(msg).then(()=>reply({ok:true}),error=>{if(active?.id===msg.id){clearInterval(active.timer);active=null;}reply({ok:false,error:error.message});});return true;}
  });
  window.addEventListener('pagehide',()=>{if(active)finish({error:'ChatGPT 页面已刷新或关闭，请重新提问。'});});
})();
