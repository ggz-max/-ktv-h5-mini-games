const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "server", "data", "report-content.json");
const content = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];
const warnings = [];

const mojibake = /[\u9362\u5a23\u68e3\u95c7\u943a\u9359\u7ec9\u5a34\u20ac\ufffd]/;

const bannedInPlayfulCopy = [
  "诊断",
  "抑郁症",
  "焦虑症",
  "治愈",
  "疗愈",
  "报复",
  "去死",
  "废物",
  "活该"
];

const crisisRequired = ["危险", "可信的人", "紧急", "专业热线"];
const playfulMarkers = ["哈哈", "嘴硬", "发疯", "阴阳怪气", "截图保存", "调侃"];

function collectCopy() {
  const rows = [];
  Object.entries(content.scenes || {}).forEach(([sceneKey, scene]) => {
    (scene.titles || []).forEach((text, index) => rows.push({ path: `scenes.${sceneKey}.titles[${index}]`, text }));
    (scene.bullets || []).forEach((text, index) => rows.push({ path: `scenes.${sceneKey}.bullets[${index}]`, text }));
  });
  Object.entries(content.styles || {}).forEach(([styleKey, style]) => {
    (style.quotes || []).forEach((text, index) => rows.push({ path: `styles.${styleKey}.quotes[${index}]`, text }));
  });
  (content.advice || []).forEach((text, index) => rows.push({ path: `advice[${index}]`, text }));
  return rows;
}

const rows = collectCopy();
const seen = new Map();
rows.forEach((row) => {
  const text = String(row.text || "").trim();
  if (!text) {
    errors.push(`${row.path} is empty`);
    return;
  }
  if (mojibake.test(text)) {
    errors.push(`${row.path} contains mojibake text`);
  }
  if (seen.has(text)) {
    warnings.push(`Duplicate copy: ${row.path} duplicates ${seen.get(text)}`);
  } else {
    seen.set(text, row.path);
  }
  bannedInPlayfulCopy.forEach((word) => {
    if (text.includes(word)) {
      errors.push(`${row.path} contains banned expression: ${word}`);
    }
  });
});

const crisisText = [
  content.crisis?.title,
  content.crisis?.quote,
  ...(content.crisis?.bullets || []),
  content.crisis?.advice
].filter(Boolean).join("\n");

if (mojibake.test(crisisText)) {
  errors.push("crisis copy contains mojibake text");
}
crisisRequired.forEach((word) => {
  if (!crisisText.includes(word)) {
    errors.push(`crisis copy should include safety cue: ${word}`);
  }
});
playfulMarkers.forEach((word) => {
  if (crisisText.includes(word)) {
    errors.push(`crisis copy should not include playful marker: ${word}`);
  }
});

(content.riskWords || []).forEach((word) => {
  if (String(word).length < 2) {
    errors.push(`riskWords item too short: ${word}`);
  }
});

if (errors.length) {
  console.error("Copy safety validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  if (warnings.length) {
    console.error("Warnings:");
    warnings.forEach((warning) => console.error(`- ${warning}`));
  }
  process.exit(1);
}

console.log(`copy safety verify ok: ${rows.length} playful copy items, warnings=${warnings.length}`);
warnings.forEach((warning) => console.log(`warning: ${warning}`));
