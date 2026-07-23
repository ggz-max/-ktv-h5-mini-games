import fs from "node:fs";
import path from "node:path";

const apiKey = process.env.MIMO_API_KEY;
if (!apiKey) throw new Error("MIMO_API_KEY is not configured");
if (apiKey.startsWith("tp-")) throw new Error("Token Plan keys cannot be used for automated game-asset generation. Configure a pay-as-you-go sk- key instead.");
const baseUrl = (process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1").replace(/\/$/, "");

const phrases = {
  pass: "不要", single: "单张", pair: "对子", triple: "三张", "full-house": "三带二",
  straight: "顺子", "triple-pairs": "三连对", "steel-plate": "钢板",
  "bomb-4": "四炸", "bomb-5": "五炸", "bomb-6": "六炸", "bomb-7": "七炸", "bomb-8": "八炸",
  "straight-flush": "同花顺", "joker-bomb": "四王炸",
  "rank-2": "二", "rank-3": "三", "rank-4": "四", "rank-5": "五", "rank-6": "六", "rank-7": "七",
  "rank-8": "八", "rank-9": "九", "rank-10": "十", "rank-11": "J", "rank-12": "Q", "rank-13": "K",
  "rank-14": "A", "rank-16": "小王", "rank-17": "大王"
};
const voices = { male: "苏打", female: "冰糖" };
const args = new Map(process.argv.slice(2).map((value, index, all) => value.startsWith("--") ? [value.slice(2), all[index + 1]?.startsWith("--") ? true : all[index + 1]] : ["", ""]));
const selectedKey = args.get("only");
const selectedVoice = args.get("voice");
const force = args.has("force");

function direction(key) {
  if (key === "pass") return "你正在和朋友打牌。带一点轻松和随性的笑意，像真人自然脱口而出，短促地说出台词。不要播音腔，不要拖尾，不要添加任何字。";
  if (key.startsWith("bomb-") || key === "straight-flush" || key === "joker-bomb") return "你在热闹牌局里甩出一手大牌。兴奋、有爆发力、带一点得意，像真人忍不住喊出来；声音短促有力，不要播音腔，不要添加任何字。";
  return "你正在和朋友打牌。用年轻、自然、有活力和一点笑意的语气，干脆利落地喊出牌面，语速偏快，像真人脱口而出。不要播音腔，不要拖尾，不要添加任何字。";
}

async function generate(bank, key, attempt = 1) {
  const output = path.resolve(`public/assets/audio/mimo-${bank}/${key}.wav`);
  if (!force && fs.existsSync(output) && fs.statSync(output).size > 1000) return { bank, key, skipped: true };
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      model: "mimo-v2.5-tts",
      messages: [{ role: "user", content: direction(key) }, { role: "assistant", content: phrases[key] }],
      audio: { format: "wav", voice: voices[bank] }
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    if (attempt < 4 && (response.status === 429 || response.status >= 500)) {
      await new Promise(resolve => setTimeout(resolve, attempt * 1500));
      return generate(bank, key, attempt + 1);
    }
    throw new Error(`${bank}/${key}: ${response.status} ${detail.slice(0, 300)}`);
  }
  const body = await response.json();
  const data = body.choices?.[0]?.message?.audio?.data;
  if (!data) throw new Error(`${bank}/${key}: response did not contain audio data`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, Buffer.from(data, "base64"));
  return { bank, key, bytes: fs.statSync(output).size };
}

const jobs = [];
for (const bank of Object.keys(voices)) {
  if (selectedVoice && selectedVoice !== bank) continue;
  for (const key of Object.keys(phrases)) {
    if (selectedKey && selectedKey !== key) continue;
    jobs.push([bank, key]);
  }
}

const concurrency = 3;
let cursor = 0;
const results = [];
await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
  while (cursor < jobs.length) {
    const [bank, key] = jobs[cursor++];
    const result = await generate(bank, key);
    results.push(result);
    console.log(JSON.stringify(result));
  }
}));
console.log(JSON.stringify({ generated: results.filter(item => !item.skipped).length, skipped: results.filter(item => item.skipped).length }));
