const http = require("http");

const mojibake = /[\u9362\u5a23\u68e3\u95c7\u943a\u9359\u7ec9\u5a34\u20ac\ufffd]/;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: "127.0.0.1",
      port: Number(process.env.PORT || 4327),
      path,
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

function rejectMojibake(label, text) {
  if (mojibake.test(text)) {
    throw new Error(`${label} contains mojibake text`);
  }
}

(async () => {
  const health = await request("GET", "/health");
  if (health.status !== 200) throw new Error("health check failed");

  const page = await request("GET", "/");
  if (page.status !== 200 || !page.data.includes("嘴硬日记")) {
    throw new Error("index page failed");
  }
  rejectMojibake("index page", page.data);
  if (!page.data.includes("assets/visuals/pencil-export/hero-report-collage.png")) {
    throw new Error("pencil asset hook missing");
  }
  if (!page.data.includes("匿名点击、生成结果和反馈")) {
    throw new Error("home sampling privacy copy missing");
  }
  if (!page.data.includes("分享图默认不展示原始输入")) {
    throw new Error("input privacy copy missing");
  }
  if (!page.data.includes("不收真实手机号或微信")) {
    throw new Error("lead privacy copy missing");
  }

  const admin = await request("GET", "/admin.html");
  if (admin.status !== 200 || !admin.data.includes("嘴硬日记数据看板")) {
    throw new Error("admin page failed");
  }
  rejectMojibake("admin page", admin.data);

  const app = await request("GET", "/app.js");
  if (app.status !== 200 || !app.data.includes("downloadSharePoster")) {
    throw new Error("share poster generation missing");
  }
  rejectMojibake("app js", app.data);
  if (!app.data.includes("mh_lead_intent_click")) {
    throw new Error("lead intent tracking missing");
  }
  if (!app.data.includes("mh_regenerate_click")) {
    throw new Error("regenerate tracking missing");
  }
  if (page.data.includes('data-action="share"') || page.data.includes('data-action="feedback"') || page.data.includes("feedback-strip")) {
    throw new Error("removed share or feedback action is still visible");
  }
  if (!app.data.includes('source: "h5_mvp"') || !app.data.includes('channel: "direct"')) {
    throw new Error("default acquisition attribution missing");
  }

  const adminJs = await request("GET", "/admin.js");
  if (adminJs.status !== 200 || !adminJs.data.includes("runtime-summary")) {
    throw new Error("admin js failed");
  }
  rejectMojibake("admin js", adminJs.data);
  if (!adminJs.data.includes("launch-readiness")) {
    throw new Error("launch readiness admin hook missing");
  }

  const readiness = await request("GET", "/api/v1/admin/launch-readiness");
  const readinessJson = JSON.parse(readiness.data);
  if (readiness.status !== 200 || !readinessJson.mode || !Array.isArray(readinessJson.checks)) {
    throw new Error("launch readiness api failed");
  }

  const config = await request("GET", "/api/v1/mouth-hard/config");
  const configJson = JSON.parse(config.data);
  rejectMojibake("config api", config.data);
  if (config.status !== 200 || !configJson.version || configJson.scenes.length < 8 || configJson.styles.length < 7) {
    throw new Error("config api failed");
  }
  if (!configJson.entryVariant || !configJson.entryCopy || !configJson.experimentVersion) {
    throw new Error("entry experiment config failed");
  }
  if (!configJson.entryCopy.headline.includes("破事") ||
    !configJson.scenes.some((scene) => scene.label === "上班/上学受气") ||
    !configJson.styles.some((style) => style.label === "体面崩溃")) {
    throw new Error("config api returned unreadable copy");
  }

  const report = await request("POST", "/api/v1/mouth-hard/reports", {
    scene: "work_pressure",
    style: "decent_breakdown",
    text: "今天真的很累，但我不想承认。"
  });
  const json = JSON.parse(report.data);
  rejectMojibake("report api", report.data);
  if (report.status !== 200 || !json.title || !json.quote || !Array.isArray(json.bullets)) {
    throw new Error("report api failed");
  }
  if (!json.energy || typeof json.energy.mouthHard !== "number") {
    throw new Error("report energy failed");
  }
  if (!json.bullets.some((line) => line.includes("表面：")) || !json.advice.includes("。")) {
    throw new Error("report api returned unexpected copy");
  }

  console.log("verify ok", json.title);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
