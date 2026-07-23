const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "experiments", "sampling-links.json");
const experimentsPath = path.join(root, "server", "data", "experiments.json");
const outputMdPath = path.join(root, "docs", "sampling-links.md");
const outputJsonPath = path.join(root, "docs", "sampling-links.generated.json");

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const experiments = JSON.parse(fs.readFileSync(experimentsPath, "utf8"));
const variants = experiments.entryCopy?.variants || {};

function buildUrl(baseUrl, params) {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function linkRows() {
  return config.cohorts.flatMap((cohort) => {
    return cohort.variants.map((variant) => {
      const variantCopy = variants[variant] || {};
      return {
        cohortId: cohort.id,
        cohortLabel: cohort.label,
        variant,
        variantLabel: variantCopy.label || variant,
        headline: variantCopy.headline || "",
        source: cohort.source,
        campaign: cohort.campaign,
        channel: cohort.channel,
        storeId: cohort.storeId || "",
        roomId: cohort.roomId || "",
        dailyTarget: cohort.dailyTarget || 0,
        note: cohort.note || "",
        url: buildUrl(config.baseUrl, {
          variant,
          source: cohort.source,
          campaign: cohort.campaign,
          channel: cohort.channel,
          storeId: cohort.storeId,
          roomId: cohort.roomId
        })
      };
    });
  });
}

function table(rows) {
  const header = "| 场景 | variant | source | campaign | channel | 目标/天 | 链接 |\n|---|---|---|---|---|---:|---|";
  const body = rows.map((row) => {
    return `| ${row.cohortLabel} | ${row.variant} | ${row.source} | ${row.campaign} | ${row.channel} | ${row.dailyTarget} | ${row.url} |`;
  }).join("\n");
  return `${header}\n${body}`;
}

function groupedSections(rows) {
  return config.cohorts.map((cohort) => {
    const cohortRows = rows.filter((row) => row.cohortId === cohort.id);
    const links = cohortRows.map((row) => {
      return `- ${row.variant} / ${row.variantLabel}: ${row.url}`;
    }).join("\n");
    return `## ${cohort.label}

${cohort.note}

每日目标：${cohort.dailyTarget} 个有效打开。

${links}`;
  }).join("\n\n");
}

const rows = linkRows();
const payload = {
  version: config.version,
  generatedAt: new Date().toISOString(),
  baseUrl: config.baseUrl,
  requiredVariants: config.requiredVariants,
  links: rows
};

const markdown = `# 真实采样投放链接包

生成命令：

\`\`\`bash
npm run sampling:links
\`\`\`

现场投放卡片：

\`\`\`text
docs/sampling-cards/index.html
docs/sampling-cards/screenshots/
\`\`\`

正式采样前先运行：

\`\`\`bash
npm run sampling:prepare -- --yes
npm run verify:launch
\`\`\`

如果 \`verify:launch\` 未通过，只能用于内部链路演练，不能当作真实转化结论。

## 总览

版本：\`${config.version}\`

Base URL：\`${config.baseUrl}\`

${table(rows)}

## 分场景链接

${groupedSections(rows)}

## 使用规则

- 每个二维码、群发链接或投放卡片只使用本文档中的一个 URL，不要手改参数。
- 每天复盘时先看后台的“入口实验表现”和“来源表现”。
- KTV、社群、海报回流要分开判断，不要混在一个总转化率里。
- 如果需要更换门店、房间、渠道或每日目标，只改 \`experiments/sampling-links.json\` 后重新生成。
- 现场卡片是采样执行材料；最终二维码海报和视觉资产仍要进入 Pencil \`.pen\`，经确认后从 Pencil 导出。
`;

fs.writeFileSync(outputMdPath, markdown, "utf8");
fs.writeFileSync(outputJsonPath, JSON.stringify(payload, null, 2), "utf8");

console.log(`sampling links generated: ${rows.length} links`);
console.log(outputMdPath);
console.log(outputJsonPath);
