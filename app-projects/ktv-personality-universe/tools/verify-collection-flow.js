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
  const pages = await getJson("http://127.0.0.1:9224/json");
  const page = pages.find((item) => item.type === "page");
  if (!page) throw new Error("No debuggable Chrome page found on port 9224.");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  await send(ws, "Runtime.enable");
  await send(ws, "Runtime.evaluate", {
    expression: `(
      async () => {
        localStorage.clear();
        localStorage.setItem("ktv-owned-codes", JSON.stringify(["SPARK"]));
        localStorage.setItem("ktv-scan-count", "1");
        localStorage.setItem("ktv-persona-index", "0");
        localStorage.setItem("ktv-preferred-code", "SPARK");
        localStorage.setItem("ktv-singing-profile", JSON.stringify({
          source: "verify-history",
          loveSongRatio: 0.94,
          fastSongRatio: 0.1,
          chorusRatio: 0.12,
          skipRatio: 0.08
        }));
        location.hash = "#entry";
        await new Promise((resolve) => setTimeout(resolve, 500));
        document.querySelector('[data-next="scan"]').click();
        await new Promise((resolve) => setTimeout(resolve, 3300));
        document.querySelector('[data-next="reward"]').click();
        await new Promise((resolve) => setTimeout(resolve, 200));
        const rewardStatuses = [...document.querySelectorAll(".reward-status span")].map((node) => node.textContent.trim());
        document.querySelector('[data-next="library"]').click();
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          ownedCodes: JSON.parse(localStorage.getItem("ktv-owned-codes") || "[]"),
          rewardStatuses,
          ownedTotal: document.querySelector('[data-bind="ownedTotal"]')?.textContent,
          lockedTotal: document.querySelector('[data-bind="lockedTotal"]')?.textContent,
          target: document.querySelector('[data-bind="collectionTarget"]')?.textContent,
          ownedCells: [...document.querySelectorAll("[data-collection-code].is-owned")].map((node) => node.dataset.collectionCode)
        };
      }
    )()`,
    awaitPromise: true,
    returnByValue: true
  }).then((result) => {
    console.log(JSON.stringify(result.result.value, null, 2));
  });

  await send(ws, "Browser.close").catch(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

