const http = require("http");
const { spawn } = require("child_process");

const port = 4327;
const origin = `http://127.0.0.1:${port}`;
const paths = [
  "/docs/preflight-report.md",
  "/docs/h5-asset-usage.md",
  "/docs/delivery-audit.md",
  "/docs/pencil-readiness.md",
  "/docs/launch-handoff.md",
  "/docs/sampling-links.md",
  "/docs/sampling-cards/index.html",
  "/experiments/field-sampling-playbook.md",
  "/experiments/sampling-safety-sop.md",
  "/designs/imagegen-review.html",
  "/designs/style-approval.json",
  "/designs/style-approval-draft.json",
  "/designs/style-approval-apply-guide.md",
  "/designs/asset-index.md",
  "/designs/pencil-import-checklist.csv",
  "/designs/pencil-import-checklist.json",
  "/designs/operator-pack.md",
  "/designs/finalization-checklist.md",
  "/designs/handoff-packet.md"
];

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${origin}${pathname}`, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({
        path: pathname,
        status: res.statusCode,
        contentType: res.headers["content-type"] || "",
        body
      }));
    });
    req.on("error", reject);
    req.setTimeout(4000, () => {
      req.destroy(new Error(`request timeout: ${pathname}`));
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const result = await request("/health");
      if (result.status === 200) return;
    } catch (error) {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("server did not become ready on port 4327");
}

(async () => {
  let child = null;
  try {
    try {
      await request("/health");
    } catch (error) {
      child = spawn(process.execPath, ["server/index.js"], {
        cwd: process.cwd(),
        stdio: "ignore",
        windowsHide: true
      });
      await waitForServer();
    }

    const results = await Promise.all(paths.map((pathname) => request(pathname)));
    const problems = [];
    results.forEach((result) => {
      if (result.status !== 200) {
        problems.push(`${result.path} returned ${result.status}`);
      }
      if (!result.body.trim()) {
        problems.push(`${result.path} returned an empty body`);
      }
      if (/\.md$/.test(result.path) && !result.contentType.includes("text/markdown")) {
        problems.push(`${result.path} content-type is ${result.contentType}`);
      }
      if (/\.html$/.test(result.path) && !result.contentType.includes("text/html")) {
        problems.push(`${result.path} content-type is ${result.contentType}`);
      }
    });

    if (problems.length) {
      console.error("Document link problems:");
      problems.forEach((problem) => console.error(problem));
      process.exit(1);
    }

    console.log("document links verify ok");
  } finally {
    if (child) {
      child.kill();
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
