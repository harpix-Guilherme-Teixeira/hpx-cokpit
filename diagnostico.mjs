// Diagnostico de credencial e escopo. NUNCA imprime o token.
import fs from "node:fs";

const env = {};
for (const linha of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = linha.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const bruto = env.JIRA_API_TOKEN ?? "";
const ehBearer = /^bearer\s+/i.test(bruto) || bruto.startsWith("eyJ");
const token = bruto.replace(/^bearer\s+/i, "");
const cloudId = env.JIRA_CLOUD_ID ?? "";
const site = (env.JIRA_BASE_URL ?? "").replace(/\/+$/, "");

const bases = ehBearer
  ? [
      ["api.atlassian.com + cloudId", `https://api.atlassian.com/ex/jira/${cloudId}`],
      ["dominio do site", site],
    ]
  : [["dominio do site", site]];

const auth = ehBearer
  ? `Bearer ${token}`
  : "Basic " + Buffer.from(`${env.JIRA_EMAIL}:${token}`).toString("base64");

console.log("modo de auth:", ehBearer ? "bearer" : "basic");
console.log("");

async function tenta(rotulo, base, caminho, corpo) {
  const url = `${base}${caminho}`;
  try {
    const res = await fetch(url, {
      method: corpo ? "POST" : "GET",
      headers: {
        Authorization: auth,
        Accept: "application/json",
        ...(corpo ? { "Content-Type": "application/json" } : {}),
      },
      ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    });
    const texto = await res.text();
    console.log(`[${rotulo}] ${caminho} -> ${res.status}`);
    console.log("   " + texto.slice(0, 300).replace(/\s+/g, " "));
  } catch (e) {
    console.log(`[${rotulo}] ${caminho} -> falhou: ${e.message}`);
  }
  console.log("");
}

for (const [rotulo, base] of bases) {
  if (!base) continue;
  console.log(`===== base: ${rotulo} =====`);
  await tenta(rotulo, base, "/rest/api/3/myself");
  await tenta(rotulo, base, "/rest/api/3/search/approximate-count", { jql: "project = PTF" });
  await tenta(rotulo, base, "/rest/api/3/search/jql", {
    jql: "project = PTF",
    maxResults: 2,
    fields: ["key"],
  });
}
