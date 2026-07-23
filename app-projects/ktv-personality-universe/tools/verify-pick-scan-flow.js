const http = require("http");

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

function send(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    send.id = (send.id || 0) + 1;
    const id = send.id;
    const onMessage = (event) => {
      const raw = typeof event === "string" ? event : event.data;
      const message = JSON.parse(raw);
      if (message.id !== id) return;
      ws.removeEventListener("message", onMessage);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const pages = await getJson("http://127.0.0.1:9227/json");
  const page = pages.find((item) => item.type === "page");
  if (!page) throw new Error("No debuggable Chrome page found on port 9227.");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  await send(ws, "Runtime.enable");
  const result = await send(ws, "Runtime.evaluate", {
    expression: `(
      async () => {
        localStorage.clear();
        localStorage.setItem("ktv-owned-codes", JSON.stringify(["SPARK"]));
        localStorage.setItem("ktv-scan-count", "1");
        localStorage.setItem("ktv-singing-profile", JSON.stringify({
          source: "verify-history",
          loveSongRatio: 0.94,
          fastSongRatio: 0.1,
          chorusRatio: 0.12,
          skipRatio: 0.08
        }));
        location.hash = "#entry";
        await new Promise((resolve) => setTimeout(resolve, 400));
        document.querySelector('[data-next="scan"]').click();
        await new Promise((resolve) => setTimeout(resolve, 3400));
        return {
          pickLabel: document.querySelector('[data-bind="pickLabel"]')?.textContent,
          resultCode: document.querySelector('[data-bind="code"]')?.textContent,
          finalCode: document.querySelector('[data-scan-code].is-final')?.dataset.scanCode,
          hash: location.hash
        };
      }
    )()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log(JSON.stringify(result.result.value, null, 2));
  await send(ws, "Browser.close").catch(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

