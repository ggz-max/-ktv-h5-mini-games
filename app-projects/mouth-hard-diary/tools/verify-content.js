const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "server", "data", "report-content.json");
const content = JSON.parse(fs.readFileSync(file, "utf8"));

const errors = [];

function checkArray(name, value, min = 1) {
  if (!Array.isArray(value) || value.length < min) {
    errors.push(`${name} must have at least ${min} item(s)`);
  }
}

function checkText(name, value, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${name} must be non-empty text`);
    return;
  }
  if (value.length > maxLength) {
    errors.push(`${name} is too long (${value.length}/${maxLength})`);
  }
}

if (!content.version) errors.push("version is required");

Object.entries(content.scenes || {}).forEach(([key, scene]) => {
  checkText(`scenes.${key}.label`, scene.label, 20);
  checkArray(`scenes.${key}.titles`, scene.titles, 3);
  checkArray(`scenes.${key}.bullets`, scene.bullets, 3);
  scene.titles.forEach((title, index) => checkText(`scenes.${key}.titles[${index}]`, title, 18));
  scene.bullets.forEach((bullet, index) => checkText(`scenes.${key}.bullets[${index}]`, bullet, 32));
});

Object.entries(content.styles || {}).forEach(([key, style]) => {
  checkText(`styles.${key}.label`, style.label, 20);
  checkArray(`styles.${key}.quotes`, style.quotes, 3);
  style.quotes.forEach((quote, index) => checkText(`styles.${key}.quotes[${index}]`, quote, 42));
});

checkArray("advice", content.advice, 5);
content.advice.forEach((item, index) => checkText(`advice[${index}]`, item, 32));

["title", "quote", "advice"].forEach((key) => checkText(`crisis.${key}`, content.crisis && content.crisis[key], 48));
checkArray("crisis.bullets", content.crisis && content.crisis.bullets, 3);
checkArray("riskWords", content.riskWords, 3);

if (errors.length) {
  console.error("Content validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`content verify ok: ${Object.keys(content.scenes).length} scenes, ${Object.keys(content.styles).length} styles`);
