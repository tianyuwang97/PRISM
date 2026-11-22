'use strict';
(() => {
  const config=PrismWebProviders[location.origin];
  if(!config)return;
  let active=null,completed=null;
  const visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).visibility!=='collapse'&&!e.closest('[hidden],[inert],[aria-hidden="true"]');
  const all=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const editSelector='textarea,[contenteditable]:not([contenteditable="false"])';
  const editable=e=>visible(e)&&!e.disabled&&!e.readOnly&&e.getAttribute('aria-readonly')!=='true'&&!e.closest('[role="search"],input[type="password"]');
  const automatic=e=>editable(e)&&!e.closest('[role="dialog"]');
  // A rich editor can expose both an editable wrapper and its child. Treat it as one editor.
  const leaves=nodes=>nodes.filter(parent=>!nodes.some(child=>child!==parent&&parent.contains(child)));
  function editor(){
    const known=leaves(all(config.editors).filter(automatic));
    if(known.length===1)return known[0];
    const scoped=config.composer?leaves(all(config.composer).filter(automatic)):[];
    if(scoped.length===1)return scoped[0];
    if(known.length>1)return null;
    const fallback=leaves(all(editSelector).filter(automatic));
    return fallback.length===1?fallback[0]:null;
  }
  const textOf=e=>e?.tagName==='TEXTAREA'?e.value:e?.innerText||'';
  const label=e=>[e.getAttribute('aria-label'),e.getAttribute('title'),e.getAttribute('data-testid')].filter(Boolean).join(' ');
  const stop=()=>all(config.stop).find(visible)||all('button,[role="button"]').find(e=>visible(e)&&/^(stop|stop response|stop generating|stop generation|停止|停止回答|停止生成|停止回复|arrêter)(\s|$)/i.test(label(e)));
  function sendButton(input){
    const known=all(config.send).filter(visible);if(known.length===1)return known[0];
    const sendLabel=/^(?:send(?: message| prompt)?|submit(?: prompt)?|发送(?:消息|提示)?|提交|envoyer(?: le message| un message| la requête| une requête| le prompt| la question)?)(?:\s*\([^)]*\))?$/i;
    const named=all('button,[role="button"]').filter(e=>visible(e)&&([e.getAttribute('aria-label'),e.getAttribute('title')].some(value=>sendLabel.test((value||'').trim()))||/^(send|submit)(-message)?-button$/i.test(e.getAttribute('data-testid')||'')));
    if(named.length===1)return named[0];
    const form=input.closest('form'),submit=form?all('button[type="submit"]',form).filter(visible):[];
    return submit.length===1?submit[0]:null;
  }
  const answers=()=>all(config.answers).filter(e=>visible(e)&&!e.closest('[data-message-author-role="user"],[data-role="user"],user-query')&&!e.parentElement?.closest(config.answers));
  const key=e=>(config.keySelector?e.querySelector(config.keySelector)?.getAttribute('data-message-id'):null)||e.getAttribute('data-message-id')||e.id||e.closest('[data-message-id]')?.getAttribute('data-message-id')||e;
  function answerText(node){
    if(node.matches?.(config.body))return node.innerText.trim();
    const parts=all(config.body,node).filter(e=>!all(config.body,node).some(parent=>parent!==e&&node.contains(parent)&&parent.contains(e)));
    return parts.length?parts.map(e=>e.innerText.trim()).filter(Boolean).join('\n\n'):node.innerText.trim();
  }
  function completionSignals(node){
    const result={stop:!!stop(),streaming:null,copy:false,feedback:false,labels:[]};
    if(!node)return result;
    const state=node.closest('[data-is-streaming],[data-streaming]');
    if(state){const value=state.getAttribute('data-is-streaming')??state.getAttribute('data-streaming');if(value==='true'||value==='false')result.streaming=value==='true';}
    // Require response actions belonging to this response, never merely a pause in text.
    for(let root=node.closest(config.turn)||node,depth=0;root&&depth<6;root=root.parentElement,depth++){
      if(root.querySelector('textarea,[contenteditable="true"]')||all(config.answers,root).filter(e=>!e.parentElement?.closest(config.answers)).length>1)break;
      const labels=all(config.actions||'button,[role="button"]',root).filter(visible).map(label);
      const copy=labels.some(s=>/copy|复制|copier/i.test(s));
      const feedback=labels.some(s=>/good response|bad response|like|dislike|thumb|retry|regenerate|share|反馈|喜欢|不喜欢|满意|不满意|重试|重新生成|分享|bonne réponse|mauvaise réponse|partager|réessayer|régénérer|j[’']aime|n[’']aime pas|utile|satisfaisant/i.test(s));
      if(labels.length)result.labels=[...new Set([...result.labels,...labels])].slice(0,20);
      result.copy ||= copy;result.feedback ||= feedback;
      if(copy&&feedback){result.copy=true;result.feedback=true;break;}
    }
    return result;
  }
  function finished(node){
    const s=completionSignals(node);
    return !s.stop&&s.streaming!==true&&(s.streaming===false||(s.copy&&s.feedback));
  }
  function diagnose(){
    const candidate=active?answers().filter(e=>!active.before.has(key(e))).at(-1):answers().at(-1);
    const s=completionSignals(candidate);
    return {ok:true,message:[config.name+' · 0.4.4 诊断','任务：'+(active?.phase||(completed?'已结束':'无进行中任务')),'回答元素：'+(candidate?'已找到':'未找到'),'已读取字数：'+(candidate?answerText(candidate).length:0),'页面回答候选数：'+answers().length,'发送前记录数：'+(active?.before.size??0),'停止按钮：'+s.stop,'网页生成标记：'+s.streaming,'完成工具栏：'+(s.copy&&s.feedback),'回答旁按钮：'+(s.labels.map(x=>x.slice(0,100)).join(' / ')||'未识别')].join('\n')};
  }
  function quotaError(){
    if(config.name!=='Grok')return null;
    const blocked=all('div,span,p,h1,h2,h3,[role="alert"]').some(node=>{
      if((node.textContent??node.innerText??'').trim().length>45)return false;
      if(!visible(node)||node.closest(config.answers)||node.closest('[data-message-author-role="user"],[data-role="user"],[contenteditable="true"]'))return false;
      return /^(free tier limit reached|usage limit reached|rate limit reached|免费额度已用完|已达到免费额度上限|已达到使用上限)[.!。！]?$/i.test(node.innerText?.trim()||'');
    });
    return blocked?'Grok 免费额度已用完，请等待官网额度恢复。其他平台可继续回答；你也可以在网页模式中取消勾选 Grok。':null;
  }
  function inspect(){
    if(editor())return {ready:true};
    return {ready:false,error:'已连接 '+config.name+'，但尚未定位到聊天输入框。请确认官网已加载并打开新聊天。若仍无法绑定，当前页面暂不支持自动连接，请查看诊断反馈。'};
  }
  function finish(result){if(!active)return;const id=active.id;clearInterval(active.timer);active=null;completed={id,...result};chrome.runtime.sendMessage({type:'result',id,...result}).catch(()=>{});}
  function tick(){
    if(!active)return;
    const quota=quotaError();if(quota){finish({error:quota});return;}
    if(Date.now()-active.started>175000){finish({error:config.name+' 网页等待超时。请检查官网是否已回答、出现验证或额度提示；不会自动重发问题。'});return;}
    if(active.phase==='preparing'){
      if(stop()||answers().some(e=>!active.before.has(key(e)))){active.phase='submitted';active.submittedAt=Date.now();return;}
      const input=active.input.isConnected?active.input:editor();
      if(!input||textOf(input).trim()!==active.question.trim()){finish({error:'官网输入内容已变化，自动发送已取消。请检查官网，避免重复发送或发送其他草稿。'});return;}
      active.input=input;
      const send=sendButton(active.input);
      if(send&&!send.disabled&&send.getAttribute('aria-disabled')!=='true'){
        active.phase='submitted';active.submittedAt=Date.now();
        try{send.click();}catch{finish({error:'发送点击未能确认。请到官网核对，避免重复发送。'});}return;
      }
      if(Date.now()-active.started>8000)finish({error:'问题已填入 '+config.name+'，但未找到可用发送按钮，没有自动重发。当前页面的自动发送尚未适配，请查看诊断反馈。请勿重复提问，先检查官网草稿。'});
      return;
    }
    const candidate=answers().filter(e=>!active.before.has(key(e))).at(-1);
    if(!candidate){
      if(Date.now()-active.submittedAt>10000&&active.input.isConnected&&textOf(active.input).trim()===active.question.trim()&&!stop())finish({error:'已尝试点击发送，但官网尚未确认发送。请核对官网的草稿和提示；扩展不会重复点击。'});
      return;
    }
    const text=answerText(candidate);if(!text)return;
    if(text!==active.text){active.completeSince=null;active.key=key(candidate);active.text=text;active.changed=Date.now();chrome.runtime.sendMessage({type:'progress',id:active.id,text:text.slice(0,100000)}).catch(()=>{});return;}
    if(!finished(candidate)){active.completeSince=null;return;}
    active.completeSince??=Date.now();
    if(Date.now()-active.changed>(config.settleMs||1800)&&Date.now()-active.completeSince>=(config.completionMs||0))finish({text:text.slice(0,100000)});
  }
  function start(msg){
    if(active)throw Error(config.name+' 正在处理上一条网页问题。');
    const quota=quotaError();if(quota)throw Error(quota);
    if(stop())throw Error(config.name+' 官网仍在生成，请先等待完成。');
    const input=editor();if(!input)throw Error(inspect().error);
    if(textOf(input).trim())throw Error(config.name+' 输入框有未发送草稿，请先处理，扩展不会覆盖。');
    active={id:msg.id,question:msg.question,before:new Set(answers().map(key)),started:Date.now(),changed:Date.now(),text:'',key:null,timer:null,input,phase:'preparing'};completed=null;
    input.focus();
    if(input.tagName==='TEXTAREA'){
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,msg.question);
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }else{
      const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(input);selection.removeAllRanges();selection.addRange(range);
      if(!document.execCommand('insertText',false,msg.question)){input.textContent=msg.question;input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:msg.question}));}
    }
    active.timer=setInterval(tick,500);tick();
  }
  chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
    if(sender.id!==chrome.runtime.id)return;
    if(msg.type==='inspect'){reply(inspect());return;}
    if(msg.type==='diagnose'){reply(diagnose());return;}
    if(msg.type==='probe'){tick();reply({ok:true,activeId:active?.id||null,generating:!!stop(),result:completed?.id===msg.id?completed:null});return;}
    if(msg.type==='cancel'){if(active&&(!msg.id||active.id===msg.id)){clearInterval(active.timer);active=null;}reply({ok:true});return;}
    if(msg.type==='ask'){try{start(msg);reply({ok:true});}catch(error){if(active?.id===msg.id){clearInterval(active.timer);active=null;}reply({ok:false,error:error.message});}return;}
  });
  window.addEventListener('pagehide',()=>{if(active)finish({error:config.name+' 页面已刷新或关闭，请重新提问。'});});
})();
