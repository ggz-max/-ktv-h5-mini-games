const http = require("http");

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(JSON.parse(data));
      });
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
      if (message.error) {
        reject(new Error(JSON.stringify(message.error)));
      } else {
        resolve(message.result);
      }
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  if (!global.WebSocket) {
    throw new Error("This check requires Node.js with built-in WebSocket support.");
  }

  const pages = await getJson("http://127.0.0.1:9223/json");
  const page = pages.find((item) => item.type === "page");
  if (!page) throw new Error("No debuggable Chrome page found on port 9223.");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  await send(ws, "Runtime.enable");
  await send(ws, "Page.enable");
  await send(ws, "Runtime.evaluate", {
    expression: "new Promise((resolve) => setTimeout(resolve, 600))",
    awaitPromise: true
  });

  const result = await send(ws, "Runtime.evaluate", {
    expression: `(
      async () => {
        const button = document.querySelector("[data-save-poster]");
        button.click();
        await new Promise((resolve) => setTimeout(resolve, 1300));
        const image = document.querySelector(".share-poster-preview");
        return {
          label: button.textContent.trim(),
          srcPrefix: image.src.slice(0, 22),
          srcLength: image.src.length,
          toast: document.querySelector(".toast")?.textContent || "",
          disabled: button.disabled
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
