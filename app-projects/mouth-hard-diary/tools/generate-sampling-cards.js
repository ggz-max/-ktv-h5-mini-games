const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const generatedJsonPath = path.join(root, "docs", "sampling-links.generated.json");
const outputDir = path.join(root, "docs", "sampling-cards");
const indexPath = path.join(outputDir, "index.html");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fileSafe(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

function tag(text) {
  return `<span class="tag">${escapeHtml(text)}</span>`;
}

function cardHtml(link) {
  const params = [
    ["source", link.source],
    ["campaign", link.campaign],
    ["channel", link.channel],
    ["storeId", link.storeId],
    ["roomId", link.roomId]
  ].filter(([, value]) => value);

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(link.cohortLabel)} - ${escapeHtml(link.variantLabel)}</title>
    <style>
      :root {
        color-scheme: dark;
        --paper: #141119;
        --ink: #f8f4e8;
        --muted: rgba(248, 244, 232, 0.72);
        --line: rgba(248, 244, 232, 0.18);
        --acid: #b7ff5a;
        --pink: #ff5ea8;
        --blue: #63d8ff;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #0f0d13;
        color: var(--ink);
        font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
      }
      .card {
        width: min(390px, calc(100vw - 28px));
        min-height: 640px;
        padding: 24px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background:
          linear-gradient(145deg, rgba(183, 255, 90, 0.12), transparent 28%),
          linear-gradient(315deg, rgba(255, 94, 168, 0.16), transparent 34%),
          var(--paper);
        box-shadow: 0 22px 80px rgba(0, 0, 0, 0.42);
      }
      .eyebrow {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        color: var(--acid);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      h1 {
        margin: 28px 0 10px;
        font-size: 36px;
        line-height: 1.08;
        letter-spacing: 0;
      }
      .headline {
        margin: 0 0 22px;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.65;
      }
      .url-box {
        margin: 24px 0;
        padding: 16px;
        border: 1px solid rgba(99, 216, 255, 0.36);
        border-radius: 8px;
        background: rgba(99, 216, 255, 0.08);
        overflow-wrap: anywhere;
      }
      .url-box strong {
        display: block;
        margin-bottom: 8px;
        color: var(--blue);
        font-size: 13px;
      }
      .url-box code {
        font-size: 12px;
        line-height: 1.55;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 18px 0 22px;
      }
      .tag {
        padding: 7px 9px;
        border: 1px solid var(--line);
        border-radius: 999px;
        color: var(--ink);
        background: rgba(255, 255, 255, 0.06);
        font-size: 12px;
        font-weight: 800;
      }
      .prompt {
        margin: 28px 0 0;
        padding: 16px;
        border-left: 3px solid var(--pink);
        background: rgba(255, 94, 168, 0.08);
        color: var(--ink);
        font-size: 15px;
        font-weight: 850;
        line-height: 1.5;
      }
      .privacy {
        margin: 18px 0 0;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.55;
      }
      .foot {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 12px;
        line-height: 1.55;
      }
      @media print {
        body { background: white; }
        .card { box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="eyebrow">
        <span>MOUTH HARD DIARY</span>
        <span>${escapeHtml(link.variant)}</span>
      </div>
      <h1>${escapeHtml(link.variantLabel)}</h1>
      <p class="headline">${escapeHtml(link.headline || "把今天的破事翻译成一张能保存、能发出去的精神状态报告。")}</p>
      <div class="meta">
        ${tag(link.cohortLabel)}
        ${params.map(([key, value]) => tag(`${key}: ${value}`)).join("\n        ")}
      </div>
      <div class="url-box">
        <strong>投放 URL</strong>
        <code>${escapeHtml(link.url)}</code>
      </div>
      <p class="prompt">现场口径：试一下，把今天的烦事生成一张“精神状态报告”，大约 30 秒。</p>
      <p class="privacy">匿名采样：记录点击、生成结果和反馈，用来改产品；不收真实手机号、微信或身份信息。</p>
      <p class="foot">每日目标：${escapeHtml(link.dailyTarget || 0)} 个有效打开。复盘时按 source / campaign / channel 分开看，不要混成一个总转化率。</p>
    </main>
  </body>
</html>`;
}

function indexHtml(payload, files) {
  const rows = files.map(({ link, fileName }) => {
    return `<tr>
      <td>${escapeHtml(link.cohortLabel)}</td>
      <td>${escapeHtml(link.variantLabel)}</td>
      <td>${escapeHtml(link.source)}</td>
      <td><a href="./${escapeHtml(fileName)}">${escapeHtml(fileName)}</a></td>
      <td><code>${escapeHtml(link.url)}</code></td>
    </tr>`;
  }).join("\n");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>真实采样投放卡片</title>
    <style>
      body { margin: 24px; color: #1e1a22; font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      p { color: #5d5663; line-height: 1.6; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
      th, td { padding: 10px; border-bottom: 1px solid #e4dfe8; text-align: left; vertical-align: top; }
      code { overflow-wrap: anywhere; }
    </style>
  </head>
  <body>
    <h1>真实采样投放卡片</h1>
    <p>版本：${escapeHtml(payload.version)}。这些卡片来自 <code>docs/sampling-links.generated.json</code>，用于现场截图、打印，或交给 Pencil 继续做二维码版视觉资产。</p>
    <table>
      <thead>
        <tr><th>场景</th><th>入口</th><th>source</th><th>卡片</th><th>URL</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </body>
</html>`;
}

const payload = JSON.parse(fs.readFileSync(generatedJsonPath, "utf8"));
fs.mkdirSync(outputDir, { recursive: true });

const files = payload.links.map((link, index) => {
  const fileName = `${String(index + 1).padStart(2, "0")}-${fileSafe(link.cohortId)}-${fileSafe(link.variant)}.html`;
  fs.writeFileSync(path.join(outputDir, fileName), cardHtml(link), "utf8");
  return { link, fileName };
});

fs.writeFileSync(indexPath, indexHtml(payload, files), "utf8");

console.log(`sampling cards generated: ${files.length} cards`);
console.log(indexPath);
