const account = (() => {
  let user = null, connections = [], config = [], intent = 'login', challenge = null;
  let onChange = () => {}, drawBrand, modelDefinitions;
  let selectedProvider='DeepSeek', resendAt=0, guestAllowed=false;
  const guides={
    '火山方舟':{site:'火山方舟控制台',url:'https://ark.volcengine.com/region:cn-beijing/apikey',docs:'https://docs.volcengine.com/docs/ark/quick-start?lang=zh',step:'登录火山方舟控制台创建 API Key，开通文本模型，并复制 Model ID 或推理接入点 ID。'},
    DeepSeek:{site:'DeepSeek 开放平台',url:'https://platform.deepseek.com/api_keys',docs:'https://api-docs.deepseek.com/',step:'登录 DeepSeek 开放平台，在 API keys 页面创建密钥。'},
    ChatGPT:{site:'OpenAI 开发者平台',url:'https://platform.openai.com/api-keys',docs:'https://developers.openai.com/api/docs/quickstart',step:'登录 OpenAI 开发者平台，选择项目并创建 API Key。'},
    Claude:{site:'Claude 开发者平台',url:'https://platform.claude.com/settings/keys',docs:'https://platform.claude.com/docs/en/api/overview',step:'登录 Claude 开发者平台，在 API Keys 页面创建密钥。'},
    Gemini:{site:'Google AI Studio',url:'https://aistudio.google.com/apikey',docs:'https://ai.google.dev/gemini-api/docs/api-key',step:'登录 Google AI Studio，创建或选择项目，然后创建 Gemini API Key。'},
    Grok:{site:'xAI Console',url:'https://console.x.ai',docs:'https://docs.x.ai/developers/quickstart',step:'登录 xAI Console，在 API Keys 中创建可访问文本模型的密钥。'}
  };
  const applicationGuides={
    '火山方舟':{create:'在控制台的 API Key 管理中创建密钥；在模型调用示例中复制 model 字段（Model ID 或 ep- 开头的推理接入点 ID）。回到 PRISM 同时填写这两项。',quota:'在火山方舟控制台查看模型开通状态、可用额度和费用。这里接入普通模型 API，不使用 Coding Plan 专用密钥。连接验证会发起一次小额文本调用。',pricing:'https://docs.volcengine.com/docs/ark/quick-start?lang=zh'},
    DeepSeek:{create:'打开 API keys 页面，选择创建密钥，为它命名（例如 PRISM），然后复制完整密钥。',quota:'到开放平台查看余额与用量。API 按使用量计费；如有赠金，以账号显示为准，余额不足时再按需充值。',pricing:'https://api-docs.deepseek.com/quick_start/pricing/'},
    ChatGPT:{create:'进入 OpenAI 开发者平台的 API keys，选择自己的项目并创建密钥。复制新生成的完整密钥。',quota:'在 API 平台的 Billing 中检查余额。符合条件的订阅赠金需先领取并关联组织；ChatGPT 网页可聊天不代表 API 已有额度。',pricing:'https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform'},
    Claude:{create:'在 Claude Console 中打开 API Keys，选择创建密钥，选好工作区并命名，然后复制完整密钥。',quota:'在 Console 的 Billing 中查看试用或订阅赠送额度。可用金额、到期时间与是否需要充值，以账号页面为准。',pricing:'https://platform.claude.com/docs/en/about-claude/pricing'},
    Gemini:{create:'用 Google 账号打开 AI Studio 的 API keys 页面，使用已有密钥，或点击 Create API key 并创建或选择项目。',quota:'可以先使用支持免费层的模型。到 AI Studio 查看项目的额度和速率限制；升级付费前先确认计费设置。',pricing:'https://ai.google.dev/gemini-api/docs/billing'},
    Grok:{create:'登录 xAI Console，按提示创建或选择团队。在 API Keys 页面创建密钥，确保允许访问要用的文本模型，并复制密钥。',quota:'到 Console 的 Billing 查看 API 余额和消费上限。网页或 Playground 能免费使用，并不代表当前 API Key 有免费调用额度。',pricing:'https://docs.x.ai/console/billing'}
  };
  let tutorialProvider='DeepSeek';
  const $ = id => document.getElementById(id);
  async function api(path, options = {}) {
    const response = await fetch('/api' + path, {
      credentials:'same-origin', ...options,
      headers:{'Content-Type':'application/json', ...options.headers}
    });
    const data = await response.json();
    if(!response.ok) {
      const error = new Error(data.error || '服务暂时不可用，请稍后再试。');
      error.code = data.code; error.status = response.status; throw error;
    }
    return data;
  }
  function updateStatus() {
    $('accountButton').textContent = user?.isGuest ? '测试会话' : user ? '我的账号' : '登录';
    $('connectionsButton').textContent = user ? `连接 AI · ${connections.length}/${modelDefinitions.length}` : '连接 AI';
    $('accountEmail').textContent = user?.isGuest ? '免登录测试 · 当前浏览器有效至 '+new Date(user.expiresAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) : user?.email || '免登录测试已开放';
    $('accountEmail').hidden=!user&&!guestAllowed;
    $('logoutButton').hidden = !user;
    $('logoutButton').textContent=user?.isGuest?'结束测试并清除记录与密钥':'退出登录';
    document.querySelectorAll('.ai-logos button').forEach(button=>{
      button.classList.toggle('is-connected',connections.some(c=>c.provider===button.title));
    });
    onChange();
  }
  async function refresh() {
    const session = await api('/session');
    user = session.user; config = session.providers; guestAllowed=session.guestAllowed===true;
    $('mailSetupNotice').hidden = session.mailReady;
    connections = user ? (await api('/connections')).connections : [];
    updateStatus();
  }
  function setIntent(value) {
    intent=value; challenge=null;
    $('authTitle').textContent = value==='register' ? '创建你的 PRISM 账号' : '登录 PRISM';
    $('authSubmit').textContent = '发送验证码';
    $('authSwitch').textContent = value==='register' ? '已有账号，去登录' : '没有账号，去注册';
    $('codeField').hidden=true; $('authCode').value=''; $('authCode').required=false;
    $('authError').textContent=''; $('authMessage').textContent='';
  }
  function openAuth() {
    setIntent('login');
    $('authDialog').showModal(); $('authEmail').focus();
  }
  function openConnections(name) {
    if(guides[name])selectedProvider=name;
    renderConnections(); if(!$('connectionsDialog').open)$('connectionsDialog').showModal();
  }
  function openTutorial() {
    renderTutorial();
    if(!$('apiTutorialDialog').open)$('apiTutorialDialog').showModal();
    $('apiTutorialDialog').scrollTop=0;
  }
  function renderTutorial() {
    const tabs=$('tutorialProviders');tabs.replaceChildren();
    for(const model of modelDefinitions) {
      const button=document.createElement('button');button.type='button';button.innerHTML=drawBrand(model);
      button.setAttribute('aria-label',model.name+' 申请教程');button.setAttribute('aria-pressed',String(model.name===tutorialProvider));
      button.onclick=()=>{tutorialProvider=model.name;renderTutorial();};tabs.append(button);
    }
    const guide=guides[tutorialProvider],detail=applicationGuides[tutorialProvider];
    const content=$('tutorialContent');content.replaceChildren();
    const title=document.createElement('h3');title.textContent=tutorialProvider+' · 四步完成接入';content.append(title);
    const steps=document.createElement('ol');steps.className='connection-steps tutorial-steps';
    for(const [heading,description,linkLabel,url] of [
      ['登录官方开发者平台','打开 '+guide.site+'，用自己的账号登录；还没有账号时，按官方页面提示注册和验证。','打开 '+guide.site,guide.url],
      ['创建并复制 API Key',detail.create,'查看官方申请说明',guide.docs],
      ['确认可用额度',detail.quota,'查看官方额度与计费说明',detail.pricing],
      ['回到 PRISM，连接并提问','点击下方按钮，在对应平台的输入框粘贴密钥，再点击「连接并测试」或「验证并连接」。成功后选择模型，回到提问框发送第一个问题。']
    ]) {
      const li=document.createElement('li'),strong=document.createElement('strong'),p=document.createElement('p');
      strong.textContent=heading;p.textContent=description;li.append(strong,p);
      if(url){const a=document.createElement('a');a.textContent=linkLabel;a.href=url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);}
      steps.append(li);
    }
    content.append(steps);
    $('tutorialConnect').textContent='我已拿到密钥，连接 '+tutorialProvider;
  }
  function renderConnections() {
    $('connectionNotice').textContent=user?.isGuest?`已连接 ${connections.length}/${modelDefinitions.length} 家。刷新后可从「历史记录」继续查看；测试会话有效期 6 小时，结束测试会清除密钥和记录。`:user?`已连接 ${connections.length}/${modelDefinitions.length} 家。连接一家就能开始，其他平台可以稍后添加。`:guestAllowed?'无需登录，直接粘贴 API Key 即可测试。密钥加密保存，记录仅在当前浏览器的测试会话中可查看。':'选择平台，三步完成接入。登录后即可验证并保存密钥。';
    $('connectionStart').textContent=user||guestAllowed?'开始提问':'登录 PRISM 后连接';
    $('connectionStart').disabled=Boolean((user||guestAllowed)&&!connections.length);
    const tabs=$('providerTabs'); tabs.replaceChildren();
    for(const model of modelDefinitions) {
      const button=document.createElement('button'); button.type='button'; button.innerHTML=drawBrand(model);
      button.setAttribute('aria-pressed',String(selectedProvider===model.name));
      button.setAttribute('aria-label',model.name+(connections.some(c=>c.provider===model.name)?'，已连接':'，接入指南'));
      button.onclick=()=>{selectedProvider=model.name;renderConnections();}; tabs.append(button);
    }
    const container=$('connectionList'); container.replaceChildren();
    for(const model of modelDefinitions.filter(item=>item.name===selectedProvider)) {
      const guide=guides[model.name];
      const connection=connections.find(c=>c.provider===model.name);
      const section=document.createElement('section'); section.className='connection-item';
      const heading=document.createElement('div'); heading.className='connection-heading';
      heading.innerHTML=drawBrand(model);
      const status=document.createElement('span'); status.className=connection?'connection-state connected':'connection-state';
      status.textContent=connection?'已连接':'尚未连接'; heading.append(status);
      const steps=document.createElement('ol');steps.className='connection-steps';
      for(const [title,description] of [['准备平台账号',guide.step],['确认 API 可用额度','查看所选平台的额度和计费设置。是否需要付费，以官方账号页面为准。'],['回到 PRISM 连接','在下方填入密钥，验证成功后选择可用模型。问题只发送给已连接的平台。']]) {
        const li=document.createElement('li'),strong=document.createElement('strong'),p=document.createElement('p');
        strong.textContent=title;p.textContent=description;li.append(strong,p);steps.append(li);
      }
      const links=document.createElement('div');links.className='guide-links';
      for(const [text,url] of [['打开 '+guide.site,guide.url],['官方使用指南',guide.docs]]) {
        const link=document.createElement('a');link.href=url;link.textContent=text;link.target='_blank';link.rel='noopener noreferrer';links.append(link);
      }
      const form=document.createElement('form'); form.className='connection-form';
      const label=document.createElement('label'); label.textContent=connection?'更换 API Key':'API Key';
      const input=document.createElement('input'); input.type='password'; input.autocomplete='off'; input.spellcheck=false;
      input.placeholder=connection?'留空可保留当前连接':'粘贴该平台的 API Key'; input.maxLength=4096; input.required=!connection;
      input.disabled=!user&&!guestAllowed; input.setAttribute('aria-label',model.name+' API Key');
      label.append(input); form.append(label);
      let select;
      if(model.apiOnly) {
        const modelLabel=document.createElement('label');modelLabel.textContent='Model ID / 推理接入点 ID';
        select=document.createElement('input');select.type='text';select.required=true;select.maxLength=160;
        select.autocomplete='off';select.spellcheck=false;select.value=connection?.model||'';
        select.placeholder='粘贴控制台调用示例中的 model 值';modelLabel.append(select);form.append(modelLabel);
        const hint=document.createElement('p');hint.className='form-message';hint.textContent='使用北京地域普通模型 API。验证会进行一次简短调用，使用平台额度。';form.append(hint);
      } else if(connection) {
        const modelLabel=document.createElement('label'); modelLabel.textContent='使用的模型';
        select=document.createElement('select');
        for(const name of connection.models) { const option=document.createElement('option'); option.value=name; option.textContent=name; select.append(option); }
        select.value=connection.model; modelLabel.append(select); form.append(modelLabel);
      }
      const actions=document.createElement('div'); actions.className='connection-actions';
      const save=document.createElement('button'); save.type='submit'; save.className='outline'; save.textContent=connection?'保存设置':!user&&guestAllowed?'连接并测试':'验证并连接'; save.disabled=!user&&!guestAllowed; actions.append(save);
      if(connection) {
        const disconnect=document.createElement('button'); disconnect.type='button'; disconnect.className='quiet'; disconnect.textContent='断开连接';
        disconnect.onclick=async()=>{
          disconnect.disabled=true;
          try { await api('/connections/'+encodeURIComponent(model.name),{method:'DELETE'}); await refresh(); renderConnections(); }
          catch(error) { message.textContent=error.message; disconnect.disabled=false; }
        };
        actions.append(disconnect);
      }
      const message=document.createElement('p'); message.className='form-message'; message.setAttribute('role','status');
      form.append(actions,message); section.append(heading,steps,links,form); container.append(section);
      form.onsubmit=async event=>{
        event.preventDefault(); save.disabled=true; save.textContent='正在验证…'; message.textContent='';
        const value={}; if(input.value.trim()) value.key=input.value.trim(); if(select) value.model=select.value.trim();
        try {
          if(!user&&guestAllowed) {
            const session=await api('/auth/guest',{method:'POST'});
            user=session.user; updateStatus();
          }
          const result=await api('/connections/'+encodeURIComponent(model.name),{method:'POST',body:JSON.stringify(value)});
          input.value=''; connections=result.connections; updateStatus(); renderConnections();
          $('connectionNotice').textContent=model.name+' 已连接，可以开始提问。';
        } catch(error) { message.textContent=error.message; save.disabled=false; save.textContent=connection?'保存设置':'验证并连接'; }
      };
    }
  }
  async function init(models, brand, changed) {
    modelDefinitions=models.filter(model=>!model.webOnly); drawBrand=brand; onChange=changed;
    $('accountButton').onclick=()=>user?openConnections():openAuth();
    $('connectionsButton').onclick=()=>openConnections();
    $('apiTutorialButton').onclick=openTutorial;
    $('tutorialConnect').onclick=()=>{$('apiTutorialDialog').close();openConnections(tutorialProvider);};
    $('connectionStart').onclick=()=>{if(!user){openAuth();return;}$('connectionsDialog').close();$('question').focus();};
    document.querySelectorAll('.ai-logos button').forEach(button=>button.onclick=()=>openConnections(button.title));
    $('authSwitch').onclick=()=>setIntent(intent==='login'?'register':'login');
    $('authEmail').oninput=()=>{if(challenge)setIntent(intent);};
    $('authForm').onsubmit=async event=>{
      event.preventDefault(); const submit=$('authSubmit'); submit.disabled=true; $('authError').textContent='';
      try {
        if(!challenge) {
          const data=await api('/auth/request',{method:'POST',body:JSON.stringify({email:$('authEmail').value,intent})});
          challenge=data.challengeId; $('codeField').hidden=false; $('authCode').required=true; $('authCode').focus();
          resendAt=Date.now()+60000; updateResend();
          $('authMessage').textContent='验证码已发送，10 分钟内有效。'; submit.textContent=intent==='register'?'验证并注册':'验证并登录';
        } else {
          await api('/auth/verify',{method:'POST',body:JSON.stringify({challengeId:challenge,code:$('authCode').value.trim()})});
          $('authCode').value=''; await refresh(); $('authDialog').close(); openConnections();
        }
      } catch(error) {
        if(error.code==='NOT_REGISTERED') { setIntent('register'); $('authError').textContent=error.message; }
        else if(error.code==='ALREADY_REGISTERED') { setIntent('login'); $('authError').textContent=error.message; }
        else $('authError').textContent=error.message;
      } finally { submit.disabled=false; }
    };
    function updateResend() {
      const seconds=Math.max(0,Math.ceil((resendAt-Date.now())/1000));
      $('resendCode').disabled=seconds>0; $('resendCode').textContent=seconds?`${seconds} 秒后重新获取`:'重新获取验证码';
    }
    setInterval(updateResend,1000);
    $('resendCode').onclick=()=>{if(Date.now()<resendAt)return;setIntent(intent);$('authForm').requestSubmit();};
    $('logoutButton').onclick=async()=>{
      try { await api('/auth/logout',{method:'POST'}); user=null; connections=[]; $('connectionsDialog').close(); updateStatus(); }
      catch(error) { $('connectionNotice').textContent=error.message; }
    };
    $('connectionsDialog').addEventListener('close',()=>{
      $('connectionList').querySelectorAll('input').forEach(input=>input.value='');
    });
    try { await refresh(); }
    catch(error) { $('authError').textContent=error.message; }
  }
  return {init,api,openAuth,openConnections,openTutorial,get guestAllowed(){return guestAllowed;},get user(){return user;},get connections(){return connections;}};
})();
