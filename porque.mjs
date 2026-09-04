import fs from "node:fs";
const env={}; for(const l of fs.readFileSync(".env.local","utf8").split(/\r?\n/)){const m=l.match(/^([A-Z_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim();}
const auth="Basic "+Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64");
const BASE=env.JIRA_BASE_URL.replace(/\/+$/,"");
async function pag(jql,fields){let t,o=[];do{const r=await fetch(`${BASE}/rest/api/3/search/jql`,{method:"POST",headers:{Authorization:auth,Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({jql,maxResults:100,fields,nextPageToken:t})});const j=await r.json();o.push(...(j.issues??[]));t=j.nextPageToken;}while(t);return o;}
const ESC='parent IN portfolioChildIssuesOf("HPX-31")';

const subs = await pag(`project = PTF AND issuetype = "Sub-tarefa" AND ${ESC} AND statusCategory != Done`,
  ["timeoriginalestimate","summary","created","creator","status","parent","assignee"]);
const sem = subs.filter(s => (s.fields.timeoriginalestimate??0) === 0);
const com = subs.filter(s => (s.fields.timeoriginalestimate??0) > 0);
console.log("ABERTAS: %d | com estimativa %d | SEM %d", subs.length, com.length, sem.length);
console.log("");

const conta = (arr, f) => { const m={}; for(const x of arr){const k=f(x)??"(vazio)"; m[k]=(m[k]??0)+1;} return Object.entries(m).sort((a,b)=>b[1]-a[1]); };

console.log("SEM ESTIMATIVA, por criador:");
for (const [k,n] of conta(sem, s=>s.fields.creator?.displayName).slice(0,6)) console.log(`  ${String(n).padStart(4)}  ${k}`);
console.log("");
console.log("COM estimativa, por criador (para comparar):");
for (const [k,n] of conta(com, s=>s.fields.creator?.displayName).slice(0,6)) console.log(`  ${String(n).padStart(4)}  ${k}`);
console.log("");
console.log("SEM ESTIMATIVA, por status:");
for (const [k,n] of conta(sem, s=>s.fields.status?.name)) console.log(`  ${String(n).padStart(4)}  ${k}`);
console.log("");
console.log("SEM ESTIMATIVA, por resumo (prefixo antes do primeiro ' - '):");
for (const [k,n] of conta(sem, s=>(s.fields.summary||"").split(" - ")[0].slice(0,42)).slice(0,10)) console.log(`  ${String(n).padStart(4)}  ${k}`);
console.log("");
const d = arr => { const v=arr.map(s=>new Date(s.fields.created)).sort((a,b)=>a-b); return v.length? `${v[0].toISOString().slice(0,10)} a ${v[v.length-1].toISOString().slice(0,10)}` : "-"; };
console.log("criadas SEM estimativa:", d(sem));
console.log("criadas COM estimativa:", d(com));

console.log("");
console.log("=== CRUZAMENTO criador x tem estimativa ===");
const todos = [...com.map(s=>({s,tem:true})), ...sem.map(s=>({s,tem:false}))];
const porCriador = {};
for (const {s,tem} of todos) {
  const k = s.fields.creator?.displayName ?? "?";
  porCriador[k] ??= {com:0,sem:0};
  porCriador[k][tem?"com":"sem"]++;
}
console.log("criador".padEnd(30), "com".padStart(5), "sem".padStart(5), "  % estimado");
for (const [k,v] of Object.entries(porCriador).sort((a,b)=>(b[1].com+b[1].sem)-(a[1].com+a[1].sem))) {
  const t=v.com+v.sem;
  console.log(k.padEnd(30), String(v.com).padStart(5), String(v.sem).padStart(5), ("  "+Math.round(100*v.com/t)+"%").padStart(12));
}
console.log("");
console.log("=== sub-tarefas que comecam com 'Back' ===");
const back = todos.filter(({s})=>(s.fields.summary||"").startsWith("Back"));
console.log("total 'Back' abertas: %d | com estimativa: %d | sem: %d",
  back.length, back.filter(x=>x.tem).length, back.filter(x=>!x.tem).length);
const naoBack = todos.filter(({s})=>!(s.fields.summary||"").startsWith("Back"));
console.log("as demais:            %d | com estimativa: %d | sem: %d",
  naoBack.length, naoBack.filter(x=>x.tem).length, naoBack.filter(x=>!x.tem).length);
