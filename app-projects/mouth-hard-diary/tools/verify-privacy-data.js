const fs = require("fs");
const path = require("path");
const http = require("http");

const root = path.resolve(__dirname, "..");
const reportsPath = path.join(root, "server", "data", "runtime", "reports.jsonl");

const privateInput = `隐私原文哨兵-${Date.now()}-不要落盘`;

function request(method, requestPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: "127.0.0.1",
      port: Number(process.env.PORT || 4327),
      path: requestPath,
      method,
      headers: payload ? {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      } : {}
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function readRuntimeReports() {
  if (!fs.existsSync(reportsPath)) return [];
  return fs.readFileSync(reportsPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

(async () => {
  const report = await request("POST", "/api/v1/mouth-hard/reports", {
    scene: "work_pressure",
    style: "decent_breakdown",
    text: privateInput,
    source: "verify_data",
    campaign: "privacy_probe",
    channel: "local_verify",
    entryVariant: "verify_variant",
    experimentVersion: "verify_experiment",
    configVersion: "verify_config"
  });
  const reportJson = JSON.parse(report.data);
  if (report.status !== 200 || !reportJson.reportId) {
    throw new Error(`privacy report generation failed: ${report.data}`);
  }

  const reports = readRuntimeReports();
  const stored = reports.find((item) => item.reportId === reportJson.reportId);
  if (!stored) {
    throw new Error("privacy report was not written to runtime reports");
  }
  if (JSON.stringify(stored).includes(privateInput)) {
    throw new Error("runtime report stored raw user input");
  }
  if (stored.text || stored.inputText || stored.input_text || stored.input_text_encrypted || stored.inputTextEncrypted) {
    throw new Error(`runtime report contains raw-input-like fields: ${JSON.stringify(stored)}`);
  }
  if (stored.hasText !== true || stored.inputLength !== privateInput.length) {
    throw new Error(`runtime report missing safe input metadata: ${JSON.stringify(stored)}`);
  }

  const exported = await request("GET", "/api/v1/admin/runtime-export?limit=5000");
  const exportJson = JSON.parse(exported.data);
  if (exported.status !== 200 || !exportJson.ok) {
    throw new Error(`runtime export failed: ${exported.data}`);
  }
  const exportText = JSON.stringify(exportJson);
  if (exportText.includes(privateInput)) {
    throw new Error("runtime export leaked raw user input");
  }
  const exportedReport = exportJson.reports.find((item) => item.reportId === reportJson.reportId);
  if (!exportedReport || exportedReport.hasText !== true || exportedReport.inputLength !== privateInput.length) {
    throw new Error("runtime export missing safe input metadata");
  }

  const docs = [
    fs.readFileSync(path.join(root, "h5", "index.html"), "utf8"),
    fs.readFileSync(path.join(root, "backend", "api-and-data-plan.md"), "utf8"),
    fs.readFileSync(path.join(root, "experiments", "field-sampling-playbook.md"), "utf8")
  ].join("\n");
  [
    "不收真实手机号",
    "不保存用户输入原文",
    "原始输入不要复制进复盘文档"
  ].forEach((snippet) => {
    if (!docs.includes(snippet)) {
      throw new Error(`privacy documentation missing: ${snippet}`);
    }
  });

  console.log("privacy data verify ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
