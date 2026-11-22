import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';

export function createDatabase(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA foreign_keys=ON');
  if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='users'").get()) {
    sqlite.exec(readFileSync('drizzle/0000_prism_accounts.sql','utf8'));
  }
  if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='conversations'").get()) {
    sqlite.exec(readFileSync('drizzle/0001_question_history.sql','utf8'));
  }
  if(!sqlite.prepare('PRAGMA table_info(users)').all().some(column=>column.name==='guest_expires_at'))sqlite.exec(readFileSync('drizzle/0002_guest_testing.sql','utf8'));
  return {
    sqlite,
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}
      catch(error){sqlite.exec('ROLLBACK');throw error;}
    },
    prepare(sql) {
      const statement=sqlite.prepare(sql);
      let values=[];
      return {
        bind(...args){values=args;return this;},
        async first(){return statement.get(...values)||null;},
        async all(){return {results:statement.all(...values)};},
        async run(){const result=statement.run(...values);return {meta:{changes:Number(result.changes)}};}
      };
    }
  };
}

export function mockServices() {
  const deliveries=[]; const calls=[]; const failures=new Map();
  const nativeFetch=globalThis.fetch;
  const modelNames={
    'api.openai.com':'gpt-5-mini','api.anthropic.com':'claude-sonnet-4-5',
    'generativelanguage.googleapis.com':'gemini-2.5-flash','api.deepseek.com':'deepseek-flash','api.x.ai':'grok-3-mini'
  };
  globalThis.fetch=async(input,options={})=>{
    const url=new URL(input);
    if(url.host==='api.resend.com') {deliveries.push(JSON.parse(options.body));return Response.json({id:'mock-email'});}
    const model=modelNames[url.host];
    if(!model) throw new Error('Unexpected external request in local test');
    const header=JSON.stringify(options.headers);
    if(header.includes('invalid-test-key'))return Response.json({error:'invalid key'},{status:401});
    if(url.pathname.endsWith('/models')) {
      if(url.host==='generativelanguage.googleapis.com') return Response.json({models:[{name:'models/'+model,supportedGenerationMethods:['generateContent']}]});
      return Response.json({data:[{id:model}]});
    }
    calls.push({host:url.host,body:JSON.parse(options.body)});
    if(failures.has(url.host)) {
      const failure=failures.get(url.host);
      if(typeof failure==='object'&&failure.once)failures.delete(url.host);
      return Response.json({error:'simulated provider failure'},{status:typeof failure==='object'?failure.status:failure});
    }
    const text='本地接口测试回答。用于验证真实问答接口的数据流、动画时序和文字显示，正式使用时将展示所选模型返回的内容。';
    if(url.pathname.endsWith('/responses'))return Response.json({output:[{content:[{type:'output_text',text}]}]});
    if(url.host==='api.anthropic.com')return Response.json({content:[{type:'text',text}]});
    if(url.host==='generativelanguage.googleapis.com')return Response.json({candidates:[{content:{parts:[{text}]}}]});
    return Response.json({choices:[{message:{content:text}}]});
  };
  return {deliveries,calls,failures,restore(){globalThis.fetch=nativeFetch;}};
}
