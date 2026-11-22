import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const configSource=readFileSync('extension/web-providers.js','utf8'),adapterSource=readFileSync('extension/web-adapter.js','utf8');
for(const origin of ['https://gemini.google.com','https://claude.ai','https://grok.com','https://www.dola.com']){
 const configContext=vm.createContext({});vm.runInContext(configSource,configContext);const config=vm.runInContext(`PrismWebProviders[${JSON.stringify(origin)}]`,configContext);
 let now=10000,listener,timer,clicks=0,stopped=false,done=false,missingSend=false,knownSend=true,sendAria="Send message";const messages=[],nodes=[];let quotaNodes=[];
 class Textarea{constructor(){this.tagName='TEXTAREA';this._value='';}get value(){return this._value;}set value(v){this._value=v;}getClientRects(){return [1];}getAttribute(){return null;}closest(){return null;}contains(e){return this.child===e;}isConnected=true;matches(){return true;}focus(){}dispatchEvent(){}}
 const input=new Textarea();let editors=[input],fallback=[input],scoped=[];const events=new Map(),ui=[];
 const makeElement=()=>({style:{},setAttribute(){},getAttribute(){return '';},remove(){this.removed=true;},textContent:''});
 const button=(name)=>({disabled:false,closest:()=>null,getClientRects:()=>[1],getAttribute:k=>k==='aria-label'?name:null});
 const copy=button('Copy'),feedback=button('Good response'),stop=button('Stop response');
 const send={...button('Send message'),isConnected:true,matches:()=>true,getAttribute:k=>k==='aria-label'?sendAria:null,click(){clicks++;input.value='';}};
 function answer(id,text){return {id,innerText:text,parentElement:null,getClientRects:()=>[1],getAttribute:()=>null,closest:selector=>selector===config.turn?nodes.find(n=>n.id===id):null,querySelector:()=>null,querySelectorAll:selector=>selector===(config.actions||'button,[role="button"]')&&done?[copy,feedback]:[],contains:()=>false};}
 nodes.push(answer('old','Old conversation must not be returned'));
 const document={createElement:makeElement,documentElement:{append:e=>ui.push(e)},addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:(type)=>events.delete(type),querySelectorAll(selector){if(selector==='div,span,p,h1,h2,h3,[role="alert"]')return quotaNodes;if(selector===config.editors)return editors;if(config.composer&&selector===config.composer)return scoped;if(selector==='textarea,[contenteditable]:not([contenteditable="false"])')return fallback;if(selector===config.answers)return nodes;if(selector===config.send)return missingSend||!knownSend?[]:[send];if(selector===config.stop)return stopped?[stop]:[];if(selector==='button,[role="button"]')return stopped?[stop]:missingSend?[]:[send];return [];}};
 const context=vm.createContext({getComputedStyle:e=>({visibility:e.hiddenStyle?'hidden':'visible'}),clearTimeout(){},location:{origin},document,window:{addEventListener(){}},chrome:{runtime:{id:'test',onMessage:{addListener(fn){listener=fn;}},sendMessage:async m=>{messages.push(m);}}},HTMLTextAreaElement:Textarea,Event:class{},Date:{now:()=>now},setTimeout:(fn,ms)=>{if(ms===100)fn();return 1;},setInterval:fn=>{timer=fn;return 1;},clearInterval:()=>{timer=null;}});
 vm.runInContext(configSource+'\n'+adapterSource,context);
 const call=msg=>new Promise(resolve=>listener(msg,{id:'test'},resolve));
 assert.equal((await call({type:'inspect'})).ready,true);
 input.value='User draft';assert.equal((await call({type:'ask',id:'draft-test',question:'overwrite'})).ok,false);assert.equal(input.value,'User draft');assert.equal(clicks,0);input.value='';
 assert.equal((await call({type:'ask',id:'first-job',question:'hello'})).ok,true);assert.equal(clicks,1);
 assert.equal((await call({type:'ask',id:'second-job',question:'again'})).ok,false);assert.equal(clicks,1);
 timer();assert.equal(messages.length,0,'old answer must not be exported');
 nodes.push(answer('new','Current answer'));timer();assert.equal(messages.at(-1).type,'progress');
 now+=2500;timer();assert.equal(messages.some(m=>m.type==='result'),false,'stable text without completion actions is not done');
 done=true;stopped=true;timer();assert.equal(messages.some(m=>m.type==='result'),false,'stop control keeps task pending');
 stopped=false;timer();if(config.settleMs){now+=config.settleMs+1;timer();}assert.equal(messages.at(-1).type,'result');assert.equal(messages.at(-1).text,'Current answer');
 assert.equal((await call({type:'probe',id:'first-job'})).result.text,'Current answer');assert.equal((await call({type:'probe',id:'wrong-job'})).result,null);
 assert.equal((await call({type:'ask',id:'next-job',question:'next'})).ok,true);assert.equal(clicks,2);
 await call({type:'cancel',id:'wrong-job'});assert.equal((await call({type:'probe',id:'next-job'})).activeId,'next-job');
 await call({type:'cancel',id:'next-job'});assert.equal((await call({type:'probe',id:'next-job'})).activeId,null);
 missingSend=true;assert.equal((await call({type:'ask',id:'no-send',question:'left in input'})).ok,true,'preparing must acknowledge immediately');assert.equal(clicks,2);assert.equal(input.value,'left in input');now+=9000;timer();assert.match(messages.at(-1).error,/发送按钮/);assert.equal((await call({type:'probe',id:'no-send'})).activeId,null);input.value='';missingSend=false;
 await call({type:'ask',id:'timeout-job',question:'last'});now+=176000;timer();assert.match(messages.at(-1).error,/超时/);assert.equal((await call({type:'probe',id:'timeout-job'})).activeId,null);

 // Editor ambiguity is resolved structurally, never by picking the first.
 const extra=new Textarea();editors=[input,extra];fallback=editors;
 assert.equal((await call({type:'inspect'})).ready,false);
 extra.hiddenStyle=true;assert.equal((await call({type:'inspect'})).ready,true,'CSS-hidden editor must not cause ambiguity');extra.hiddenStyle=false;
 const wrapper=new Textarea();wrapper.child=input;editors=[wrapper,input];fallback=editors;
 assert.equal((await call({type:'inspect'})).ready,true,'nested editor wrapper must collapse to the leaf');
 editors=[input,extra];fallback=editors;
 if(config.composer){scoped=[input];assert.equal((await call({type:'inspect'})).ready,true,'Gemini composer scope wins over unrelated fields');}

 // French labels must submit once without relying on English site selectors.
 editors=[input];fallback=editors;scoped=[];knownSend=false;
 for(const name of ['Envoyer','Envoyer le message','Envoyer la requête','Envoyer le message (Entrée)']){
  sendAria=name;input.value='';const beforeClicks=clicks;
  assert.equal((await call({type:'ask',id:'french-'+beforeClicks,question:'bonjour'})).ok,true);assert.equal(clicks,beforeClicks+1,name);
  await call({type:'cancel',id:'french-'+beforeClicks});
 }
 // A slow/disabled-to-enabled UI never holds the initial acknowledgement open.
 missingSend=true;input.value='';const slowClicks=clicks;
 assert.equal((await call({type:'ask',id:'slow-ui',question:'ready later'})).ok,true);assert.equal(clicks,slowClicks);
 missingSend=false;now+=6000;await call({type:'probe',id:'slow-ui'});assert.equal(clicks,slowClicks+1);
 await call({type:'probe',id:'slow-ui'});assert.equal(clicks,slowClicks+1,'poll cannot resubmit');await call({type:'cancel',id:'slow-ui'});
 missingSend=true;input.value='';await call({type:'ask',id:'cancel-before-send',question:'cancel me'});await call({type:'cancel',id:'cancel-before-send'});missingSend=false;
 await call({type:'probe',id:'cancel-before-send'});assert.equal(clicks,slowClicks+1,'cancelled preparation cannot click later');input.value='';
 // French completion controls and unchanged text across DOM remounts must settle.
 copy.getAttribute=k=>k==='aria-label'?'Copier la réponse':null;
 for(const action of ['Partager et exporter','Réessayer','J’aime','Réponse utile']){
  feedback.getAttribute=k=>k==='aria-label'?action:null;done=false;input.value='';
  const request='fr-completion-'+clicks;await call({type:'ask',id:request,question:'french answer'});
  nodes.push(answer('', 'Bonjour réponse '+request));timer();const index=nodes.length-1;
  now+=1100;nodes[index]=answer('',nodes[index].innerText);timer();
  assert.equal((await call({type:'probe',id:request})).activeId,request,'text stability alone must not complete');
  now+=1100;nodes[index]=answer('',nodes[index].innerText);done=true;stopped=true;timer();
  assert.equal((await call({type:'probe',id:request})).activeId,request,'stop button overrides French completion controls');
  stopped=false;timer();if(config.settleMs){now+=config.settleMs+1;timer();}assert.equal((await call({type:'probe',id:request})).result?.text,nodes[index].innerText,action);
  const diagnostic=await call({type:'diagnose'});assert.match(diagnostic.message,/完成工具栏：true/);assert.equal(diagnostic.message.includes(nodes[index].innerText),false,'diagnostic excludes answer content');
 }
 if(config.name==='Grok'){
  input.value='';done=false;await call({type:'ask',id:'quota-during-job',question:'quota'});
  quotaNodes=[{innerText:'Free tier limit reached',getClientRects:()=>[1],closest:()=>null}];
  timer();assert.match((await call({type:'probe',id:'quota-during-job'})).result.error,/额度已用完/);
  const quotaClicks=clicks;assert.equal((await call({type:'ask',id:'quota-new-job',question:'do not send'})).ok,false);assert.equal(clicks,quotaClicks);
  quotaNodes[0].closest=selector=>selector===config.answers?{}:null;
  assert.equal((await call({type:'ask',id:'quoted-quota',question:'quoted text is not a banner'})).ok,true,'assistant quoting the banner must not trigger quota');await call({type:'cancel',id:'quoted-quota'});
  quotaNodes=[];
  input.value='';done=true;await call({type:'ask',id:'grok-paused',question:'long answer'});
  const current=answer('grok-long','First half');nodes.push(current);timer();
  now+=2200;timer();assert.equal((await call({type:'probe',id:'grok-paused'})).activeId,'grok-paused','early toolbar and pause must not end Grok');
  current.innerText='First half and the complete remainder.';timer();
  now+=2600;timer();assert.equal((await call({type:'probe',id:'grok-paused'})).activeId,'grok-paused');
  now+=4000;timer();assert.equal((await call({type:'probe',id:'grok-paused'})).result.text,current.innerText);
  input.value='';await call({type:'ask',id:'nested-body',question:'nested'});
  const root=answer('nested','Whole answer including tail');root.matches=selector=>selector===config.body;
  root.querySelectorAll=selector=>selector===config.body?[{innerText:'Only child',contains:()=>false}]:selector==='button,[role="button"]'?[copy,feedback]:[];
  nodes.push(root);timer();assert.equal(messages.at(-1).text,'Whole answer including tail');await call({type:'cancel',id:'nested-body'});
 }
 console.log('PASS '+config.name+': draft protection, single send, answer ownership, completion signals, recovery, cancel and timeout');
}
