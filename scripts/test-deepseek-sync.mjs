import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
let listener,now=10000,timer,finished=true;const nodes=[],sent=[];
class Textarea{get value(){return this.v||'';}set value(v){this.v=v;}placeholder='Message DeepSeek';getAttribute(){return null;}getClientRects(){return [1];}focus(){}dispatchEvent(e){if(e.type==='keydown')this.value='';}}
const input=new Textarea(),old={innerText:'Old answer',getClientRects:()=>[1]};nodes.push(old);
const ctx=vm.createContext({document:{querySelectorAll:s=>s==='textarea'?[input]:s==='.ds-markdown'?nodes:[]},location:{pathname:'/a/chat'},PrismDeepSeekDOM:{finished:()=>finished},HTMLTextAreaElement:Textarea,Event:class{constructor(type){this.type=type;}},KeyboardEvent:class{constructor(type){this.type=type;}},Date:{now:()=>now},setInterval:fn=>{timer=fn;return 1;},clearInterval(){},window:{addEventListener(){}},chrome:{runtime:{id:'test',onMessage:{addListener:fn=>listener=fn},sendMessage:async m=>{sent.push(m);throw Error('Simulate dropped notification');}}}});
vm.runInContext(readFileSync('extension/deepseek.js','utf8'),ctx);
const call=msg=>{let result;listener(msg,{id:'test'},r=>result=r);return result;};
assert.equal(call({type:'ask',id:'deepseek-probe',question:'hello'}).ok,true);
finished=false;nodes.push({innerText:'Partial',getClientRects:()=>[1]});
// Never invoke the interval: PRISM polling alone must drive synchronization.
assert.equal(call({type:'probe',id:'deepseek-probe'}).activeId,'deepseek-probe');
assert.equal(sent.at(-1).text,'Partial');
now+=3000;assert.equal(call({type:'probe',id:'deepseek-probe'}).result,null,'pause without finished toolbar is not completion');
nodes[1]={innerText:'Complete answer with final paragraph',getClientRects:()=>[1]};finished=true;call({type:'probe',id:'deepseek-probe'});
now+=1000;nodes[1]={...nodes[1]};call({type:'probe',id:'deepseek-probe'});
now+=1000;nodes[1]={...nodes[1]};const done=call({type:'probe',id:'deepseek-probe'});
assert.equal(done.activeId,null);assert.equal(done.result.text,'Complete answer with final paragraph');
assert.equal(call({type:'probe',id:'another-request'}).result,null);
assert.equal(call({type:'probe',id:'deepseek-probe'}).result.text,done.result.text,'dropped result notification is recovered by polling');
assert.equal(call({type:'ask',id:'next-request',question:'next'}).ok,true);
assert.equal(call({type:'probe',id:'deepseek-probe'}).result,null,'new question clears previous cache');
call({type:'cancel',id:'next-request'});assert.equal(call({type:'probe',id:'next-request'}).activeId,null);
console.log('PASS DeepSeek: polling with suspended timer, streamed progress, stable text across remounts, lost-result recovery, request isolation and cancel.');
