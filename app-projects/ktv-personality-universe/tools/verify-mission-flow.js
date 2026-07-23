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
  if (!global.WebSocket) {
    throw new Error("This check requires Node.js with built-in WebSocket support.");
  }

  const pages = await getJson("http://127.0.0.1:9229/json");
  const page = pages.find((item) => item.type === "page");
  if (!page) throw new Error("No debuggable Chrome page found on port 9229.");

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
        localStorage.setItem("ktv-owned-codes", JSON.stringify(["SPARK", "ROMEO", "ECHO"]));
        localStorage.setItem("ktv-bonus-drops", "0");
        localStorage.setItem("ktv-scan-count", "2");
        localStorage.setItem("ktv-persona-index", "2");
        localStorage.setItem("ktv-preferred-code", "ROMEO");
        location.hash = "#library";
        await new Promise((resolve) => setTimeout(resolve, 600));

        const progress = document.querySelector('[data-bind="missionProgress"]')?.textContent;
        const target = document.querySelector('[data-bind="collectionTarget"]')?.textContent;
        const hint = document.querySelector('[data-bind="missionHint"]')?.textContent;
        const width = document.querySelector('[data-bind-style="missionProgress"]')?.style.width;
        const labels = [...document.querySelectorAll("[data-mission-action]")].map((node) => node.textContent.trim());

        document.querySelector('[data-mission-action="route"]').click();
        await new Promise((resolve) => setTimeout(resolve, 120));
        const toast = document.querySelector(".toast")?.textContent || "";
        const afterRouteHash = location.hash;

        history.replaceState(null, "", "#library");
        document.querySelector('[data-mission-action="share"]').click();
        await new Promise((resolve) => setTimeout(resolve, 120));
        const afterShareHash = location.hash;

        const events = JSON.parse(localStorage.getItem("ktv-events") || "[]");
        return {
          progress,
          target,
          hint,
          width,
          labels,
          toast,
          afterRouteHash,
          afterShareHash,
          missionEvents: events.filter((event) => event.name === "mission_action").map((event) => event.action)
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

