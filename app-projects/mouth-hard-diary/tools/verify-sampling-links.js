const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "experiments", "sampling-links.json");
const generatedJsonPath = path.join(root, "docs", "sampling-links.generated.json");
const generatedMdPath = path.join(root, "docs", "sampling-links.md");
const experimentsPath = path.join(root, "server", "data", "experiments.json");
const cardsIndexPath = path.join(root, "docs", "sampling-cards", "index.html");

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const generated = JSON.parse(fs.readFileSync(generatedJsonPath, "utf8"));
const experiments = JSON.parse(fs.readFileSync(experimentsPath, "utf8"));
const markdown = fs.readFileSync(generatedMdPath, "utf8");
const cardsIndex = fs.existsSync(cardsIndexPath) ? fs.readFileSync(cardsIndexPath, "utf8") : "";
const problems = [];

const experimentVariants = Object.keys(experiments.entryCopy?.variants || {});
const requiredVariants = config.requiredVariants || [];
const links = generated.links || [];

if (generated.version !== config.version) {
  problems.push(`Generated links are stale: ${generated.version} !== ${config.version}`);
}
if (!links.length) {
  problems.push("Generated links are empty");
}

requiredVariants.forEach((variant) => {
  if (!experimentVariants.includes(variant)) {
    problems.push(`Required variant missing from experiments: ${variant}`);
  }
  if (!links.some((link) => link.variant === variant)) {
    problems.push(`Required variant missing from generated links: ${variant}`);
  }
});

const seen = new Set();
links.forEach((link) => {
  const key = `${link.cohortId}:${link.variant}`;
  if (seen.has(key)) problems.push(`Duplicate cohort/variant link: ${key}`);
  seen.add(key);

  ["cohortId", "variant", "source", "campaign", "channel", "url"].forEach((field) => {
    if (!link[field]) problems.push(`Link missing ${field}: ${key}`);
  });

  let url;
  try {
    url = new URL(link.url);
  } catch (error) {
    problems.push(`Invalid URL for ${key}: ${link.url}`);
    return;
  }

  ["variant", "source", "campaign", "channel"].forEach((field) => {
    if (url.searchParams.get(field) !== String(link[field])) {
      problems.push(`URL param mismatch for ${key}: ${field}`);
    }
  });

  if (!markdown.includes(link.url)) {
    problems.push(`Markdown missing generated URL: ${link.url}`);
  }
});

(config.cohorts || []).forEach((cohort) => {
  if (!links.some((link) => link.cohortId === cohort.id)) {
    problems.push(`Cohort has no generated links: ${cohort.id}`);
  }
  if (!markdown.includes(cohort.label)) {
    problems.push(`Markdown missing cohort label: ${cohort.label}`);
  }
});

[
  "真实采样投放链接包",
  "现场投放卡片",
  "npm run sampling:prepare -- --yes",
  "npm run verify:launch",
  "Pencil `.pen`",
  "从 Pencil 导出"
].forEach((snippet) => {
  if (!markdown.includes(snippet)) {
    problems.push(`Markdown missing required snippet: ${snippet}`);
  }
});

if (!cardsIndex.includes("真实采样投放卡片")) {
  problems.push("Sampling cards index missing; run npm run sampling:links");
}

if (problems.length) {
  console.error("Sampling link problems:");
  problems.forEach((problem) => console.error(problem));
  process.exit(1);
}

console.log(`sampling links verify ok: ${links.length} links, ${requiredVariants.length} required variants`);
