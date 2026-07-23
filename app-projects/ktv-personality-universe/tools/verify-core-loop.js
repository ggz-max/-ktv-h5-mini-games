const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const appDir = path.join(root, "www-room-lineup");
const appPort = 5318;
const debugPort = 9232;
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const userDataDir = path.join(process.env.TEMP || root, "ktv-personality-core-loop-profile");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", reject);
  });
}

function request(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      res.on("end", resolve);
    });
    req.on("error", reject);
  });
}

async function waitForHttp(url, timeout = 7000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      await request(url);
      return true;
    } catch {
      await sleep(160);
    }
  }
  return false;
}

function startStaticServer() {
  const source = `
    const http=require('http'),fs=require('fs'),path=require('path');
    const root=${JSON.stringify(appDir)};
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json; charset=utf-8'};
    http.createServer((req,res)=>{
      const url=new URL(req.url,'http://127.0.0.1');
      let file=path.join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if(!file.startsWith(root)){res.writeHead(403); res.end('forbidden'); return;}
      fs.readFile(file,(err,data)=>{
        if(err){res.writeHead(404); res.end('not found'); return;}
        res.writeHead(200, {'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
        res.end(data);
      });
    }).listen(${appPort}, '127.0.0.1');
  `;
  return spawn(process.execPath, ["-e", source], { stdio: "ignore", windowsHide: true });
}

function send(ws, method, params = {}, timeout = 12000) {
  return new Promise((resolve, reject) => {
    send.id = (send.id || 0) + 1;
    const id = send.id;
    const timer = setTimeout(() => {
      ws.removeEventListener("message", onMessage);
      reject(new Error(`CDP timeout: ${method}`));
    }, timeout);
    const onMessage = (event) => {
      const raw = typeof event === "string" ? event : event.data;
      const message = JSON.parse(raw);
      if (message.id !== id) return;
      clearTimeout(timer);
      ws.removeEventListener("message", onMessage);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(ws, expression, timeout) {
  const result = await send(ws, "Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  }, timeout);
  if (result.exceptionDetails) {
    const text = result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Runtime evaluation failed";
    throw new Error(text);
  }
  return result.result.value;
}

async function waitForPage() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const pages = await getJson(`http://127.0.0.1:${debugPort}/json`);
      const page = pages.find((item) => item.type === "page" && item.url.includes("index.html"))
        || pages.find((item) => item.type === "page");
      if (page) return page;
    } catch {
      await sleep(180);
    }
  }
  throw new Error("Timed out waiting for debuggable Edge page.");
}

async function main() {
  if (!global.WebSocket) {
    throw new Error("This check requires Node.js with built-in WebSocket support.");
  }
  if (!fs.existsSync(edgePath)) {
    throw new Error(`Microsoft Edge not found at ${edgePath}`);
  }
  fs.rmSync(userDataDir, { recursive: true, force: true });

  const server = startStaticServer();
  const serverReady = await waitForHttp(`http://127.0.0.1:${appPort}/index.html`);
  if (!serverReady) throw new Error("Local static server did not start.");

  const targetUrl = `http://127.0.0.1:${appPort}/?reset=1&t=${Date.now()}#entry`;
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--hide-scrollbars",
    "--disable-gpu",
    "--window-size=430,932",
    targetUrl
  ], { stdio: "ignore", windowsHide: true });

  try {
    const debugReady = await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`, 8000);
    if (!debugReady) throw new Error("Debug Edge did not start.");
    const page = await waitForPage();
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });

    await send(ws, "Page.enable");
    await send(ws, "Runtime.enable");
    await send(ws, "Network.enable");
    await send(ws, "Network.setCacheDisabled", { cacheDisabled: true });
    await send(ws, "Storage.clearDataForOrigin", {
      origin: `http://127.0.0.1:${appPort}`,
      storageTypes: "all"
    }).catch(() => {});
    await send(ws, "Emulation.setDeviceMetricsOverride", {
      width: 430,
      height: 932,
      deviceScaleFactor: 2,
      mobile: true
    });
    await send(ws, "Page.navigate", { url: targetUrl });
    await evaluate(ws, "document.fonts ? document.fonts.ready : Promise.resolve()", 8000);
    await sleep(700);
    const entryCopyResult = await evaluate(ws, `(
      () => ({
        titleTop: document.querySelector('[data-bind="entryTitleTop"]')?.textContent || "",
        titleHot: document.querySelector('[data-bind="entryTitleHot"]')?.textContent || "",
        subtitle: document.querySelector('[data-bind="entrySubtitle"]')?.textContent || "",
        question: document.querySelector('[data-bind="entryQuestion"]')?.textContent || "",
        cta: document.querySelector('[data-bind="entryCta"]')?.textContent || "",
        profileSummary: document.querySelector('[data-bind="entryProfileSummary"]')?.textContent || "",
        profileMetrics: [
          document.querySelector('[data-bind="entryMetricTempo"]')?.textContent || "",
          document.querySelector('[data-bind="entryMetricMood"]')?.textContent || "",
          document.querySelector('[data-bind="entryMetricChorus"]')?.textContent || ""
        ],
        normalShareOnlyVisible: [...document.querySelectorAll("[data-share-only]")]
          .some((node) => getComputedStyle(node).display !== "none"),
        normalShareReadyNodes: [...document.querySelectorAll("[data-share-only]")]
          .filter((node) => node.dataset.shareReady === "true")
          .map((node) => node.className || node.tagName),
        shareInviteVisible: document.querySelector(".friend-invite")
          ? getComputedStyle(document.querySelector(".friend-invite")).display !== "none"
          : false,
        shareEntryDuelVisible: document.querySelector(".share-entry-duel")
          ? getComputedStyle(document.querySelector(".share-entry-duel")).display !== "none"
          : false,
        shareEntryRelayVisible: document.querySelector(".share-entry-relay")
          ? getComputedStyle(document.querySelector(".share-entry-relay")).display !== "none"
          : false,
        sharePromiseVisible: document.querySelector(".share-entry-promise")
          ? getComputedStyle(document.querySelector(".share-entry-promise")).display !== "none"
          : false,
        safeNote: document.querySelector(".safe-note")?.textContent || "",
        phoneClass: document.querySelector(".phone")?.className || "",
        href: window.location.href
      })
    )()`);

    const shareEntryUrl = `http://127.0.0.1:${appPort}/?source=share&from=LOVER&t=${Date.now()}#entry`;
    await send(ws, "Page.navigate", { url: shareEntryUrl });
    await evaluate(ws, "document.fonts ? document.fonts.ready : Promise.resolve()", 8000);
    await sleep(700);
    const sharedEntryResult = await evaluate(ws, `(
      () => ({
        view: document.querySelector(".view.is-active")?.dataset.view || "",
        ownedCodes: JSON.parse(localStorage.getItem("ktv-owned-codes") || "[]"),
        events: JSON.parse(localStorage.getItem("ktv-events") || "[]"),
        previewCode: document.querySelector('[data-bind="entryPreviewCode"]')?.textContent || "",
        subtitle: document.querySelector('[data-bind="entrySubtitle"]')?.textContent || "",
        question: document.querySelector('[data-bind="entryQuestion"]')?.textContent || "",
        cta: document.querySelector('[data-bind="entryCta"]')?.textContent || "",
        profileSummary: document.querySelector('[data-bind="entryProfileSummary"]')?.textContent || "",
        friendCode: document.querySelector('[data-bind="friendCode"]')?.textContent || "",
        friendTitle: document.querySelector('[data-bind="friendTitle"]')?.textContent || "",
        shareInviteVisible: document.querySelector(".friend-invite")
          ? getComputedStyle(document.querySelector(".friend-invite")).display !== "none"
          : false,
        shareEntryDuelText: document.querySelector(".share-entry-duel")?.textContent || "",
        shareEntryDuelVisible: document.querySelector(".share-entry-duel")
          ? getComputedStyle(document.querySelector(".share-entry-duel")).display !== "none"
          : false,
        shareEntryRelayText: document.querySelector(".share-entry-relay")?.textContent || "",
        shareEntryRelayVisible: document.querySelector(".share-entry-relay")
          ? getComputedStyle(document.querySelector(".share-entry-relay")).display !== "none"
          : false,
        sharePromiseText: document.querySelector(".share-entry-promise")?.textContent || "",
        sharePromiseVisible: document.querySelector(".share-entry-promise")
          ? getComputedStyle(document.querySelector(".share-entry-promise")).display !== "none"
          : false,
        href: window.location.href
      })
    )()`);

    const sharedRelationResult = await evaluate(ws, `(
      async () => {
        const click = (selector) => {
          const node = document.querySelector(selector);
          if (!node) throw new Error("Missing selector: " + selector);
          node.click();
        };
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        click('[data-next="scan"]');
        await wait(2300);
        const compare = document.querySelector("[data-friend-compare]");
        const resultView = document.querySelector(".view.is-active")?.dataset.view || "";
        const shareText = window.shareMessage ? window.shareMessage() : "";
        const relationMatrix = window.__ktvDemo?.personas?.flatMap((friend) =>
          window.__ktvDemo.personas.map((mine) => {
            const relation = window.__ktvDemo.relationshipFor(friend, mine);
            return {
              pair: friend.code + "+" + mine.code,
              name: relation.name,
              title: relation.title,
              text: relation.text,
              isGeneric:
                relation.name === "包厢互补局" ||
                relation.title === "你们一个负责偏航，一个负责把歌唱完" ||
                relation.title === "你们站在同一条音轨上"
            };
          })
        ) || [];
        const relationMissingPairText = relationMatrix
          .filter((item) => !item.name || !item.title || !item.text)
          .map((item) => item.pair);
        const ownedRelations = JSON.parse(localStorage.getItem("ktv-owned-relations") || "[]");
        click('.result-actions .mega-cta');
        await wait(900);
        const relationPoster = document.querySelector(".share-poster-preview");
        const shareView = document.querySelector(".view.is-active")?.dataset.view || "";
        const shareTitle = document.querySelector('[data-bind="shareTitle"]')?.textContent || "";
        const sharePosterKicker = document.querySelector('[data-bind="sharePosterKicker"]')?.textContent || "";
        const shareCardFaceText = document.querySelector(".share-card-face")?.textContent || "";
        const shareRouteNoteText = document.querySelector(".share-route-note")?.textContent || "";
        const relayTicketText = document.querySelector(".share-relay-ticket")?.textContent || "";
        const shareLoopText = document.querySelector(".share-loop")?.textContent || "";
        const shareProofKicker = document.querySelector('[data-bind="shareProofKicker"]')?.textContent || "";
        const shareChallengeText = document.querySelector(".share-challenge")?.textContent || "";
        const shareChallengeOtherCode = document.querySelector('[data-bind="shareChallengeOtherCode"]')?.textContent || "";
        const sharePosterGenerated = relationPoster?.dataset.generated || "";
        const sharePosterMode = relationPoster?.dataset.mode || "";
        const sharePosterLength = relationPoster?.src.length || 0;
        window.__ktvDemo.showView("library");
        await wait(300);
        const relationVaultView = document.querySelector(".view.is-active")?.dataset.view || "";
        const relationVaultCount = document.querySelector('[data-bind="relationVaultCount"]')?.textContent || "";
        const relationVaultText = document.querySelector('[data-bind="relationVaultText"]')?.textContent || "";
        const relationVaultCardText = document.querySelector("[data-relation-vault]")?.textContent || "";
        const relationCard = document.querySelector("[data-relation-key]");
        relationCard?.click();
        await wait(240);
        const relationModalOpen = document.querySelector(".modal")?.classList.contains("is-open") || false;
        const relationModalTitle = document.querySelector("[data-modal-title]")?.textContent || "";
        const relationModalHighlightText = document.querySelector(".modal-highlights")?.textContent || "";
        const relationModalListText = document.querySelector("[data-modal-list]")?.textContent || "";
        const relationModalAction = document.querySelector("[data-modal-action]")?.textContent || "";
        document.querySelector("[data-modal-action]")?.click();
        await wait(900);
        const relationArchiveShareView = document.querySelector(".view.is-active")?.dataset.view || "";
        const relationArchivePosterMode = document.querySelector(".share-poster-preview")?.dataset.mode || "";
        const relationArchiveShareTitle = document.querySelector('[data-bind="shareTitle"]')?.textContent || "";
        return {
          view: resultView,
          resultCode: document.querySelector('[data-bind="code"]')?.textContent || "",
          relationVisible: compare ? !compare.hidden && getComputedStyle(compare).display !== "none" : false,
          relationName: document.querySelector('[data-bind="relationName"]')?.textContent || "",
          relationTitle: document.querySelector('[data-bind="relationTitle"]')?.textContent || "",
          relationText: document.querySelector('[data-bind="relationText"]')?.textContent || "",
          relationRevealText: document.querySelector(".relation-reveal-stack")?.textContent || "",
          friendCompareCode: document.querySelector('[data-bind="friendCompareCode"]')?.textContent || "",
          myCompareCode: document.querySelector('[data-bind="myCompareCode"]')?.textContent || "",
          relationMatrixCount: relationMatrix.length,
          genericRelationCount: relationMatrix.filter((item) => item.isGeneric).length,
          relationMissingPairText,
          shareView,
          shareTitle,
          sharePosterKicker,
          shareCardFaceText,
          shareRouteNoteText,
          relayTicketText,
          shareLoopText,
          shareProofKicker,
          shareChallengeText,
          shareChallengeOtherCode,
          sharePosterGenerated,
          sharePosterMode,
          sharePosterLength,
          ownedRelations,
          relationVaultView,
          relationVaultCount,
          relationVaultText,
          relationVaultCardText,
          relationModalOpen,
          relationModalTitle,
          relationModalHighlightText,
          relationModalListText,
          relationModalAction,
          relationArchiveShareView,
          relationArchivePosterMode,
          relationArchiveShareTitle,
          shareText
        };
      }
    )()`, 9000);

    await send(ws, "Page.navigate", { url: targetUrl });
    await evaluate(ws, "document.fonts ? document.fonts.ready : Promise.resolve()", 8000);
    await sleep(700);

    const result = await evaluate(ws, `(
      async () => {
        const click = (selector) => {
          const node = document.querySelector(selector);
          if (!node) throw new Error("Missing selector: " + selector);
          node.click();
        };
        const activeView = () => document.querySelector(".view.is-active")?.dataset.view;
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const profileCases = {
          SPARK: { fastSongRatio: 0.92, popSongRatio: 0.72, chorusRatio: 0.52 },
          SKIP: { skipRatio: 0.9, controlRatio: 0.5, fastSongRatio: 0.36 },
          ROMEO: { pureLoveRatio: 0.92, loveSongRatio: 0.82, repeatRatio: 0.38 },
          ECHO: { chorusRatio: 0.9, duetRatio: 0.36, popSongRatio: 0.42 },
          DROP: { chorusRatio: 0.64, highNoteRatio: 0.82, fastSongRatio: 0.42 },
          MUTE: { controlRatio: 0.68, fastSongRatio: 0.62, skipRatio: 0.42 },
          LOOP: { repeatRatio: 0.9, loveSongRatio: 0.55, popSongRatio: 0.38 },
          BOSS: { controlRatio: 0.92, skipRatio: 0.55, chorusRatio: 0.32 },
          HYPE: { popSongRatio: 0.92, fastSongRatio: 0.72, chorusRatio: 0.48 },
          RISK: { highNoteRatio: 0.92, dramaRatio: 0.82, fastSongRatio: 0.38 },
          DUO: { duetRatio: 0.92, chorusRatio: 0.58, loveSongRatio: 0.46 },
          DRAMA: { hurtLoveRatio: 0.92, dramaRatio: 0.78, loveSongRatio: 0.58 }
        };
        const displayCodes = {
          SPARK: "STAR",
          SKIP: "SKIPPER",
          ROMEO: "LOVER",
          ECHO: "ECHO",
          DROP: "GHOST",
          MUTE: "FIXER",
          LOOP: "REPEATER",
          BOSS: "BOSS",
          HYPE: "HOPER",
          RISK: "CHALLENGER",
          DUO: "PARTNER",
          DRAMA: "JOKER"
        };
        const scoreProfile = (profile, model) => {
          const entries = Object.entries(model);
          const distance = entries.reduce((sum, [field, target]) => {
            const value = Math.max(0, Math.min(1, Number(profile[field]) || 0));
            const delta = value - target;
            return sum + (delta * delta);
          }, 0) / entries.length;
          const fit = 1 - Math.sqrt(distance);
          const intensity = entries.reduce((sum, [field]) => sum + Math.max(0, Math.min(1, Number(profile[field]) || 0)), 0) / entries.length;
          return Math.max(0, fit) + intensity * .08;
        };
        const loveProfile = {
          fastSongRatio: 0.12,
          loveSongRatio: 0.92,
          pureLoveRatio: 0.92,
          hurtLoveRatio: 0.08,
          popSongRatio: 0.2,
          chorusRatio: 0.18,
          skipRatio: 0.08,
          repeatRatio: 0.33,
          highNoteRatio: 0.18,
          controlRatio: 0.16,
          duetRatio: 0.12,
          dramaRatio: 0.15
        };
        const profileCoverage = Object.fromEntries(Object.entries(profileCases).map(([code, profile]) => [
          code,
          window.__ktvDemo.resolvePersonaFromSingingProfile({ source: "coverage", ...profile })
        ]));
        const loveCandidatePool = Object.entries(profileCases)
          .map(([code, model]) => [displayCodes[code], scoreProfile(loveProfile, model)])
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([code]) => code);

        localStorage.setItem("ktv-singing-profile", JSON.stringify({
          source: "verify-history",
          ...loveProfile
        }));
        await wait(120);
        const entryPreviewCode = document.querySelector('[data-bind="entryPreviewCode"]')?.textContent || "";
        const entryPreviewTitle = document.querySelector('[data-bind="entryPreviewTitle"]')?.textContent || "";
        const entryQuotaRemaining = document.querySelector('[data-bind="entryQuotaRemaining"]')?.textContent || "";
        const entryQuotaShare = document.querySelector('[data-bind="entryQuotaShare"]')?.textContent || "";
        const entryQuotaReset = document.querySelector('[data-bind="entryQuotaReset"]')?.textContent || "";
        click('[data-next="scan"]');
        await wait(420);
        const scanMetricTexts = [...document.querySelectorAll("[data-scan-code]")].map((node) => node.textContent || "");
        await wait(2300);
        const afterScan = activeView();
        const resultCode = document.querySelector('[data-bind="code"]')?.textContent || "";
        const verdict = document.querySelector('[data-bind="verdict"]')?.textContent || "";
        const weakness = document.querySelector('[data-bind="weakness"]')?.textContent || "";
        const identityClaim = document.querySelector('[data-bind="identityClaim"]')?.textContent || "";
        const shareHook = document.querySelector('[data-bind="shareHook"]')?.textContent || "";
        const friendRoast = document.querySelector('[data-bind="friendRoast"]')?.textContent || "";
        const friendCue = document.querySelector('[data-bind="friendCue"]')?.textContent || "";
        const ahaLineA = document.querySelector('[data-bind="ahaLineA"]')?.textContent || "";
        const ahaLineB = document.querySelector('[data-bind="ahaLineB"]')?.textContent || "";
        const ahaLineC = document.querySelector('[data-bind="ahaLineC"]')?.textContent || "";
        const readCause = document.querySelector('[data-bind="readCause"]')?.textContent || "";
        const readContrast = document.querySelector('[data-bind="readContrast"]')?.textContent || "";
        const readTarget = document.querySelector('[data-bind="readTarget"]')?.textContent || "";
        const dropState = document.querySelector('[data-bind="dropState"]')?.textContent || "";
        const dropHeadline = document.querySelector('[data-bind="dropHeadline"]')?.textContent || "";
        const dropDetail = document.querySelector('[data-bind="dropDetail"]')?.textContent || "";
        const resultRoleLabel = document.querySelector('[data-bind="resultRoleLabel"]')?.textContent || "";
        const resultRoleNote = document.querySelector('[data-bind="resultRoleNote"]')?.textContent || "";
        const evidenceText = document.querySelector('[data-bind="evidenceText"]')?.textContent || "";
        const evidenceLabels = ["A", "B", "C"].map((key) => document.querySelector('[data-bind="evidenceLabel' + key + '"]')?.textContent || "");
        const evidenceValues = ["A", "B", "C"].map((key) => document.querySelector('[data-bind="evidenceValue' + key + '"]')?.textContent || "");
        const proofPathTitle = document.querySelector('[data-bind="proofPathTitle"]')?.textContent || "";
        const proofPathText = document.querySelector('[data-bind="proofPathText"]')?.textContent || "";
        const proofRankText = document.querySelector('[data-bind="proofRankText"]')?.textContent || "";
        const runnerUpTitle = document.querySelector('[data-bind="runnerUpTitle"]')?.textContent || "";
        const runnerUpText = document.querySelector('[data-bind="runnerUpText"]')?.textContent || "";
        const rollReasonText = document.querySelector('[data-bind="rollReasonText"]')?.textContent || "";
        const proofBars = [...document.querySelectorAll(".proof-bar")].map((node) => node.textContent || "");
        const resultProofSnapText = document.querySelector(".result-proof-snap")?.textContent || "";
        const resultProofSnapChips = [...document.querySelectorAll(".result-proof-snap li")].map((node) => node.textContent || "");
        const ownedAfterResult = JSON.parse(localStorage.getItem("ktv-owned-codes") || "[]");
        const ownedSkinsAfterResult = JSON.parse(localStorage.getItem("ktv-owned-skins") || "{}");
        const primaryPersonaAfterResult = localStorage.getItem("ktv-primary-persona") || "";
        const autoArchiveText = document.querySelector(".auto-archive-pill")?.textContent || "";
        const resultPrimaryAction = document.querySelector(".result-actions .mega-cta")?.textContent.trim() || "";
        const resultSecondaryAction = document.querySelector(".result-actions .ghost-cta")?.textContent.trim() || "";
        const resultCardDropExists = Boolean(document.querySelector("[data-result-skin-preview]"));
        click("[data-result-skin-preview]");
        await wait(180);
        const resultSkinModalOpen = document.querySelector(".modal")?.classList.contains("is-open") || false;
        const resultSkinModalTitle = document.querySelector("[data-modal-title]")?.textContent || "";
        click("[data-close-modal]");
        await wait(120);

        click(".result-actions .mega-cta");
        await wait(900);
        const resultPrimaryShareView = activeView();
        const resultPrimaryPosterGenerated = document.querySelector(".share-poster-preview")?.dataset.generated || "";
        click('[data-next="library"]');
        await wait(260);
        const libraryView = activeView();
        window.__ktvDemo.applyArchiveState({
          ownedCodes: ["SPARK", "ROMEO"],
          ownedSkins: {
            SPARK: ["开场火花"],
            ROMEO: ["纯爱告白", "失恋电台"]
          },
          equippedSkins: { SPARK: "开场火花", ROMEO: "纯爱告白" },
          currentCode: "ROMEO"
        });
        await wait(160);
        const libraryKicker = document.querySelector(".library-head p")?.textContent || "";
        const libraryTitle = document.querySelector(".library-head h2")?.textContent || "";
        const librarySummary = document.querySelector('[data-bind="librarySummary"]')?.textContent || "";
        const libraryIdentityLine = document.querySelector('[data-bind="libraryIdentityLine"]')?.textContent || "";
        const archiveOverview = {
          primaryCode: document.querySelector('[data-bind="archivePrimaryCode"]')?.textContent || "",
          primaryTitle: document.querySelector('[data-bind="archivePrimaryTitle"]')?.textContent || "",
          ownedCount: document.querySelector('[data-bind="archiveOwnedCount"]')?.textContent || "",
          ownedText: document.querySelector('[data-bind="archiveOwnedText"]')?.textContent || "",
          nextCode: document.querySelector('[data-bind="archiveNextCode"]')?.textContent || "",
          nextTitle: document.querySelector('[data-bind="archiveNextTitle"]')?.textContent || "",
          skinName: document.querySelector('[data-bind="archiveSkinName"]')?.textContent || "",
          skinCount: document.querySelector('[data-bind="archiveSkinCount"]')?.textContent || ""
        };
        const libraryQuickActions = [...document.querySelectorAll(".library-quick-actions [data-mission-action]")]
          .map((node) => ({
            label: node.textContent.trim(),
            action: node.dataset.missionAction,
            next: node.dataset.next
          }));
        const libraryRemovedModules = {
          jumpNav: Boolean(document.querySelector(".library-jump-nav")),
          stats: Boolean(document.querySelector(".library-stats")),
          collectionRoute: Boolean(document.querySelector(".collection-route")),
          seriesMap: Boolean(document.querySelector(".series-map")),
          dailyQuest: Boolean(document.querySelector(".daily-quest")),
          streakReward: Boolean(document.querySelector(".streak-reward")),
          replayMission: Boolean(document.querySelector(".replay-mission"))
        };
        const relationEmptyCardText = document.querySelector("[data-relation-vault]")?.textContent || "";
        const relationEmptyButtonLabel = document.querySelector("[data-relation-empty-share]")?.textContent?.trim() || "";
        document.querySelector("[data-relation-empty-share]")?.click();
        await wait(900);
        const relationEmptyShareView = activeView();
        const relationEmptyPosterGenerated = document.querySelector(".share-poster-preview")?.dataset.generated || "";
        const relationEmptyShareChallenge = document.querySelector(".share-challenge")?.textContent || "";
        window.__ktvDemo.showView("library");
        await wait(240);
        const ownedShowcaseTitle = document.querySelector('[data-bind="ownedShowcaseTitle"]')?.textContent || "";
        const ownedShowcaseHint = document.querySelector('[data-bind="ownedShowcaseHint"]')?.textContent || "";
        const ownedShowcaseCards = [...document.querySelectorAll("[data-owned-showcase] [data-collection-code]")]
          .map((node) => ({
            code: node.dataset.collectionCode,
            text: node.textContent.replace(/\\s+/g, " ").trim(),
            current: node.classList.contains("is-current")
          }));
        const skinShelfCount = document.querySelector('[data-bind="skinShelfCount"]')?.textContent || "";
        const shelfCards = document.querySelectorAll(".skin-shelf-grid article").length;
        const equippedShelfCards = document.querySelectorAll(".skin-shelf-grid article.is-equipped").length;
        const equippedShelfLabel = document.querySelector(".skin-shelf-grid article.is-equipped")?.textContent || "";
        const skinChaseName = document.querySelector('[data-bind="skinChaseName"]')?.textContent || "";
        const skinChaseText = document.querySelector('[data-bind="skinChaseText"]')?.textContent || "";
        const skinChaseIndex = document.querySelector("[data-skin-chase]")?.dataset.skinIndex || "";
        const primaryCollectionCardText = document.querySelector("[data-collection-grid] [data-collection-code].is-primary-persona")?.textContent || "";
        const collectionWallCount = document.querySelector('[data-bind="collectionWallCount"]')?.textContent || "";
        const collectionWallText = document.querySelector('[data-bind="collectionWallText"]')?.textContent || "";
        const collectionWallKicker = document.querySelector(".collection-wall-head span")?.textContent || "";
        const collectionSystemNote = document.querySelector(".collection-system-note")?.textContent || "";
        const collectionCardCount = document.querySelectorAll("[data-collection-grid] [data-collection-code]").length;
        const collectionGridText = document.querySelector("[data-collection-grid]")?.textContent || "";
        const missionLabels = [...document.querySelectorAll("[data-mission-action]")].map((node) => node.textContent.trim());
        const vaultStageExists = Boolean(document.querySelector(".vault-stage"));
        document.querySelector("[data-skin-chase]")?.click();
        await wait(180);
        const skinChaseModalTitle = document.querySelector("[data-modal-title]")?.textContent || "";
        click("[data-close-modal]");
        await wait(120);

        document.querySelectorAll(".skin-shelf-grid article")[1]?.click();
        await wait(180);
        const skinModalOpen = document.querySelector(".modal")?.classList.contains("is-open") || false;
        const skinModalTitle = document.querySelector("[data-modal-title]")?.textContent || "";
        const skinModalInsight = document.querySelector(".modal-insight strong")?.textContent || "";
        const skinModalProofCount = document.querySelectorAll(".modal-proof div").length;
        const skinModalListText = document.querySelector("[data-modal-list]")?.textContent || "";
        const skinModalAction = document.querySelector("[data-modal-action]")?.textContent || "";
        document.querySelector("[data-modal-action]")?.click();
        await wait(240);
        const equippedSkinsAfterAction = JSON.parse(localStorage.getItem("ktv-equipped-skins") || "{}");
        const equippedSkinName = document.querySelector('[data-bind="skinName"]')?.textContent || "";
        const equippedSkinArt = document.querySelector('img[data-bind="skinArt"]')?.getAttribute("src") || "";
        const equippedModalClosed = !(document.querySelector(".modal")?.classList.contains("is-open") || false);
        const equippedShelfCardsAfterAction = document.querySelectorAll(".skin-shelf-grid article.is-equipped").length;
        const equippedShelfLabelAfterAction = document.querySelector(".skin-shelf-grid article.is-equipped")?.textContent || "";
        await wait(120);

        click('.library-quick-actions [data-next="share"]');
        await wait(900);
        const shareView = activeView();
        const posterAfterDirectShare = document.querySelector(".share-poster-preview")?.dataset.generated || "";
        const posterModeAfterDirectShare = document.querySelector(".share-poster-preview")?.dataset.mode || "";
        const shareTitle = document.querySelector('[data-bind="shareTitle"]')?.textContent || "";
        const shareChallengeText = document.querySelector(".share-challenge")?.textContent || "";
        const shareSocialProofText = document.querySelector(".share-social-proof")?.textContent || "";
        const shareCardFaceText = document.querySelector(".share-card-face")?.textContent || "";
        const shareRouteNoteText = document.querySelector(".share-route-note")?.textContent || "";
        const shareReadinessTextBeforeCopy = document.querySelector(".share-readiness")?.textContent || "";
        const relayTicketText = document.querySelector(".share-relay-ticket")?.textContent || "";
        const shareLoopText = document.querySelector(".share-loop")?.textContent || "";
        const shareQuickActionLabels = [...document.querySelectorAll(".share-quick-actions button")].map((node) => node.textContent.trim());
        const shareQuickHintText = document.querySelector(".share-quick-actions span")?.textContent || "";
        const shareActionLabels = [...document.querySelectorAll(".share-actions button")].map((node) => node.textContent.trim());
        const shareNextActionLabels = [...document.querySelectorAll(".share-next-actions button")].map((node) => ({
          label: node.textContent.trim(),
          next: node.dataset.next,
          copy: node.hasAttribute("data-copy-text")
        }));

        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: async (text) => { window.__copiedShareText = text; } }
        });
        document.querySelector(".share-quick-actions [data-copy-text]").click();
        await wait(500);
        const copyShareEvents = JSON.parse(localStorage.getItem("ktv-events") || "[]");
        const copyShareTextEvent = copyShareEvents.find((event) => event.name === "copy_share_text");
        const copiedShareText = window.__copiedShareText || "";
        const shareReadyStatusAfterCopy = document.querySelector('[data-bind="shareReadyStatus"]')?.textContent || "";

        document.querySelector("[data-save-poster]").click();
        await wait(1600);
        const poster = document.querySelector(".share-poster-preview");
        const shareText = window.shareMessage ? window.shareMessage() : "";
        click('.share-next-actions .mega-cta');
        await wait(220);
        const backToLibraryView = activeView();
        click('[data-next="entry"]');
        await wait(180);
        const beforeRetryCode = localStorage.getItem("ktv-persona-index") || "";
        click('[data-next="scan"]');
        await wait(2300);
        const retryCode = document.querySelector('[data-bind="code"]')?.textContent || "";
        const afterRetryView = activeView();
        const events = JSON.parse(localStorage.getItem("ktv-events") || "[]");
        return {
          afterScan,
          profileCoverage,
          loveCandidatePool,
          entryPreviewCode,
          entryPreviewTitle,
          entryQuotaRemaining,
          entryQuotaShare,
          entryQuotaReset,
          scanMetricTexts,
          resultCode,
          verdict,
          weakness,
          identityClaim,
          shareHook,
          friendRoast,
          friendCue,
          ahaLineA,
          ahaLineB,
          ahaLineC,
          readCause,
          readContrast,
          readTarget,
          dropState,
          dropHeadline,
          dropDetail,
          resultRoleLabel,
          resultRoleNote,
          evidenceText,
          evidenceLabels,
          evidenceValues,
          proofPathTitle,
          proofPathText,
          proofRankText,
          runnerUpTitle,
          runnerUpText,
          rollReasonText,
          proofBars,
          resultProofSnapText,
          resultProofSnapChips,
          ownedAfterResult,
          ownedSkinsAfterResult,
          primaryPersonaAfterResult,
          autoArchiveText,
          resultPrimaryAction,
          resultSecondaryAction,
          resultPrimaryShareView,
          resultPrimaryPosterGenerated,
          resultCardDropExists,
          resultSkinModalOpen,
          resultSkinModalTitle,
          libraryView,
          libraryKicker,
          libraryTitle,
          librarySummary,
          libraryIdentityLine,
          archiveOverview,
          libraryQuickActions,
          libraryRemovedModules,
          relationEmptyCardText,
          relationEmptyButtonLabel,
          relationEmptyShareView,
          relationEmptyPosterGenerated,
          relationEmptyShareChallenge,
          ownedShowcaseTitle,
          ownedShowcaseHint,
          ownedShowcaseCards,
          vaultStageExists,
          skinShelfCount,
          shelfCards,
          equippedShelfCards,
          equippedShelfLabel,
          skinChaseName,
          skinChaseText,
          skinChaseIndex,
          primaryCollectionCardText,
          collectionWallCount,
          collectionWallText,
          collectionWallKicker,
          collectionSystemNote,
          collectionCardCount,
          collectionGridText,
          skinChaseModalTitle,
          skinModalOpen,
          skinModalTitle,
          skinModalInsight,
          skinModalProofCount,
          skinModalListText,
          skinModalAction,
          equippedSkinsAfterAction,
          equippedSkinName,
          equippedSkinArt,
          equippedModalClosed,
          equippedShelfCardsAfterAction,
          equippedShelfLabelAfterAction,
          shareView,
          posterAfterDirectShare,
          posterModeAfterDirectShare,
          shareTitle,
          shareChallengeText,
          shareSocialProofText,
          shareCardFaceText,
          shareRouteNoteText,
          shareReadinessTextBeforeCopy,
          relayTicketText,
          shareLoopText,
          shareQuickActionLabels,
          shareQuickHintText,
          shareActionLabels,
          shareNextActionLabels,
          copyShareTextEvent: Boolean(copyShareTextEvent),
          copiedShareText,
          shareReadyStatusAfterCopy,
          backToLibraryView,
          beforeRetryCode,
          retryCode,
          afterRetryView,
          missionLabels,
          posterPrefix: poster?.src.slice(0, 22) || "",
          posterLength: poster?.src.length || 0,
          shareText,
          toast: document.querySelector(".toast")?.textContent || "",
          eventNames: events.map((event) => event.name)
        };
      }
    )()`, 18000);

    const failures = [];
    if (entryCopyResult.titleTop !== "测出你的") failures.push(`entryTitleTop=${entryCopyResult.titleTop}`);
    if (!entryCopyResult.titleHot.includes("人格卡")) failures.push(`entryTitleHot=${entryCopyResult.titleHot}`);
    if (!entryCopyResult.subtitle.includes("唱歌偏好")) failures.push(`entrySubtitle=${entryCopyResult.subtitle}`);
    if (!entryCopyResult.subtitle.includes("可分享人格卡")) failures.push(`entrySubtitle=${entryCopyResult.subtitle}`);
    if (!entryCopyResult.question.includes("还没揭晓")) failures.push(`entryQuestion=${entryCopyResult.question}`);
    if (entryCopyResult.cta !== "用点唱画像生成卡") failures.push(`entryCta=${entryCopyResult.cta}`);
    if (!entryCopyResult.profileSummary.includes("不是随机抽卡")) failures.push(`entryProfileSummary=${entryCopyResult.profileSummary}`);
    if (!entryCopyResult.profileSummary.includes("决定人格卡")) failures.push(`entryProfileSummary=${entryCopyResult.profileSummary}`);
    if (!entryCopyResult.profileMetrics.every((item) => /^\d+%$/.test(item))) failures.push(`entryProfileMetrics=${entryCopyResult.profileMetrics.join(",")}`);
    if (entryCopyResult.normalShareOnlyVisible) failures.push("share-only blocks should stay hidden on normal entry");
    if (entryCopyResult.normalShareReadyNodes.length) failures.push(`normalShareReadyNodes=${entryCopyResult.normalShareReadyNodes.join(",")}`);
    if (entryCopyResult.shareInviteVisible) failures.push("share invite should stay hidden on normal entry");
    if (entryCopyResult.shareEntryDuelVisible) failures.push("share entry duel should stay hidden on normal entry");
    if (entryCopyResult.shareEntryRelayVisible) failures.push("share entry relay should stay hidden on normal entry");
    if (entryCopyResult.sharePromiseVisible) failures.push("share promise should stay hidden on normal entry");
    if (entryCopyResult.phoneClass.includes("is-share-entry")) failures.push(`normal entry leaked share class=${entryCopyResult.phoneClass}`);
    if (!entryCopyResult.safeNote.includes("分享算关系")) failures.push(`safeNote=${entryCopyResult.safeNote}`);
    if (sharedEntryResult.view !== "entry") failures.push(`sharedEntryView=${sharedEntryResult.view}`);
    if (!sharedEntryResult.href.includes("from=LOVER")) failures.push(`sharedEntryHref=${sharedEntryResult.href}`);
    if (sharedEntryResult.href.includes("from=ROMEO")) failures.push(`sharedEntryHref leaked internal code=${sharedEntryResult.href}`);
    if (sharedEntryResult.previewCode !== "???") failures.push(`sharedEntryPreviewCode=${sharedEntryResult.previewCode}`);
    if (sharedEntryResult.friendCode !== "LOVER") failures.push(`sharedEntryFriendCode=${sharedEntryResult.friendCode}`);
    if (!sharedEntryResult.friendTitle) failures.push("missing sharedEntryFriendTitle");
    if (!sharedEntryResult.subtitle.includes("你和 LOVER 的关系卡")) failures.push(`sharedEntrySubtitle=${sharedEntryResult.subtitle}`);
    if (!sharedEntryResult.question.includes("LOVER 已在场")) failures.push(`sharedEntryQuestion=${sharedEntryResult.question}`);
    if (sharedEntryResult.cta !== "用点唱画像生成卡") failures.push(`sharedEntryCta=${sharedEntryResult.cta}`);
    if (!sharedEntryResult.profileSummary.includes("不是复制朋友结果")) failures.push(`sharedEntryProfileSummary=${sharedEntryResult.profileSummary}`);
    if (!sharedEntryResult.profileSummary.includes("你和 LOVER 的关系")) failures.push(`sharedEntryProfileSummary=${sharedEntryResult.profileSummary}`);
    if (!sharedEntryResult.shareInviteVisible) failures.push("share invite not visible");
    if (sharedEntryResult.shareEntryDuelVisible) failures.push("share entry duel should stay hidden on first viewport");
    if (!sharedEntryResult.shareEntryDuelText.includes("测完算关系")) failures.push(`shareEntryDuelText=${sharedEntryResult.shareEntryDuelText}`);
    if (sharedEntryResult.shareEntryRelayVisible) failures.push("share entry relay should stay hidden in compact share entry");
    if (!sharedEntryResult.shareEntryRelayText.includes("FRIEND RELAY")) failures.push(`shareEntryRelayText=${sharedEntryResult.shareEntryRelayText}`);
    if (!sharedEntryResult.shareEntryRelayText.includes("LOVER 已带入")) failures.push(`shareEntryRelayText=${sharedEntryResult.shareEntryRelayText}`);
    if (!sharedEntryResult.shareEntryRelayText.includes("关系卡自动入库")) failures.push(`shareEntryRelayText=${sharedEntryResult.shareEntryRelayText}`);
    if (sharedEntryResult.sharePromiseVisible) failures.push("share entry promise should stay hidden in compact share entry");
    if (!sharedEntryResult.sharePromiseText.includes("LOVER 已带入")) failures.push(`sharePromiseText=${sharedEntryResult.sharePromiseText}`);
    if (!sharedEntryResult.sharePromiseText.includes("生成你的卡")) failures.push(`sharePromiseText=${sharedEntryResult.sharePromiseText}`);
    if (!sharedEntryResult.sharePromiseText.includes("算你和 LOVER")) failures.push(`sharePromiseText=${sharedEntryResult.sharePromiseText}`);
    const shareEntryEvent = sharedEntryResult.events.find((event) => event.name === "share_entry_open");
    if (!shareEntryEvent) failures.push("missing share_entry_open event");
    if (shareEntryEvent?.context?.fromPersona !== "LOVER") failures.push(`shareEntryContext=${JSON.stringify(shareEntryEvent?.context)}`);
    if (shareEntryEvent?.detail?.fromCode !== "ROMEO") failures.push(`shareEntryDetail=${JSON.stringify(shareEntryEvent?.detail)}`);
    if (sharedEntryResult.ownedCodes.length !== 1 || sharedEntryResult.ownedCodes[0] !== "SPARK") {
      failures.push(`sharedEntryOwnedCodes=${sharedEntryResult.ownedCodes.join(",")}`);
    }
    if (sharedRelationResult.view !== "result") failures.push(`sharedRelationView=${sharedRelationResult.view}`);
    if (!sharedRelationResult.relationVisible) failures.push("shared relation not visible");
    if (sharedRelationResult.friendCompareCode !== "LOVER") failures.push(`friendCompareCode=${sharedRelationResult.friendCompareCode}`);
    if (!sharedRelationResult.myCompareCode) failures.push("missing myCompareCode");
    if (!sharedRelationResult.relationName) failures.push("missing relationName");
    if (!sharedRelationResult.relationTitle) failures.push("missing relationTitle");
    if (!sharedRelationResult.relationText.includes("LOVER")) failures.push(`relationText=${sharedRelationResult.relationText}`);
    if (!sharedRelationResult.relationRevealText.includes("关系卡已入库")) failures.push(`relationRevealText=${sharedRelationResult.relationRevealText}`);
    if (!sharedRelationResult.relationRevealText.includes("LOVER")) failures.push(`relationRevealText=${sharedRelationResult.relationRevealText}`);
    if (!sharedRelationResult.relationRevealText.includes("接力")) failures.push(`relationRevealText=${sharedRelationResult.relationRevealText}`);
    if (sharedRelationResult.relationMatrixCount !== 144) failures.push(`relationMatrixCount=${sharedRelationResult.relationMatrixCount}`);
    if (sharedRelationResult.genericRelationCount !== 0) failures.push(`genericRelationCount=${sharedRelationResult.genericRelationCount}`);
    if (sharedRelationResult.relationMissingPairText.length) failures.push(`relationMissingPairText=${sharedRelationResult.relationMissingPairText.join(",")}`);
    if (!sharedRelationResult.shareText.includes(sharedRelationResult.relationName)) failures.push(`shared shareText=${sharedRelationResult.shareText}`);
    if (sharedRelationResult.shareView !== "share") failures.push(`sharedRelationShareView=${sharedRelationResult.shareView}`);
    if (!sharedRelationResult.shareTitle.includes("关系卡")) failures.push(`sharedRelationShareTitle=${sharedRelationResult.shareTitle}`);
    if (!sharedRelationResult.sharePosterKicker.includes("关系")) failures.push(`sharedRelationPosterKicker=${sharedRelationResult.sharePosterKicker}`);
    if (!sharedRelationResult.shareCardFaceText.includes("当前分享关系图")) failures.push(`sharedRelationCardFace=${sharedRelationResult.shareCardFaceText}`);
    if (!sharedRelationResult.shareCardFaceText.includes("LOVER") || !sharedRelationResult.shareCardFaceText.includes("STAR")) failures.push(`sharedRelationCardFace=${sharedRelationResult.shareCardFaceText}`);
    if (!sharedRelationResult.shareRouteNoteText.includes("接力入口")) failures.push(`sharedRelationRouteNote=${sharedRelationResult.shareRouteNoteText}`);
    if (!sharedRelationResult.relayTicketText.includes("关系接力凭证")) failures.push(`sharedRelationRelayTicket=${sharedRelationResult.relayTicketText}`);
    if (!sharedRelationResult.relayTicketText.includes("新关系继续接力")) failures.push(`sharedRelationRelayTicket=${sharedRelationResult.relayTicketText}`);
    if (!sharedRelationResult.shareLoopText.includes("RELATION LOOP")) failures.push(`sharedRelationLoop=${sharedRelationResult.shareLoopText}`);
    if (!sharedRelationResult.shareLoopText.includes("下一位朋友")) failures.push(`sharedRelationLoop=${sharedRelationResult.shareLoopText}`);
    if (!sharedRelationResult.shareLoopText.includes("新关系继续接力")) failures.push(`sharedRelationLoop=${sharedRelationResult.shareLoopText}`);
    if (!sharedRelationResult.shareProofKicker.includes("RELATION")) failures.push(`sharedRelationProofKicker=${sharedRelationResult.shareProofKicker}`);
    if (!sharedRelationResult.shareChallengeText.includes("下一位朋友")) failures.push(`sharedRelationChallenge=${sharedRelationResult.shareChallengeText}`);
    if (sharedRelationResult.shareChallengeOtherCode !== "LOVER") failures.push(`sharedRelationOtherCode=${sharedRelationResult.shareChallengeOtherCode}`);
    if (sharedRelationResult.sharePosterGenerated !== "true") failures.push(`sharedRelationPosterGenerated=${sharedRelationResult.sharePosterGenerated}`);
    if (sharedRelationResult.sharePosterMode !== "relation") failures.push(`sharedRelationPosterMode=${sharedRelationResult.sharePosterMode}`);
    if (sharedRelationResult.sharePosterLength < 10000) failures.push(`sharedRelationPosterLength=${sharedRelationResult.sharePosterLength}`);
    if (!sharedRelationResult.ownedRelations.length) failures.push("missing ownedRelations archive");
    if (sharedRelationResult.ownedRelations[0]?.friendCode !== "ROMEO") failures.push(`ownedRelationFriend=${JSON.stringify(sharedRelationResult.ownedRelations[0])}`);
    if (!sharedRelationResult.ownedRelations[0]?.myCode) failures.push(`ownedRelationMine=${JSON.stringify(sharedRelationResult.ownedRelations[0])}`);
    if (!sharedRelationResult.ownedRelations[0]?.name) failures.push(`ownedRelationName=${JSON.stringify(sharedRelationResult.ownedRelations[0])}`);
    if (sharedRelationResult.relationVaultView !== "library") failures.push(`relationVaultView=${sharedRelationResult.relationVaultView}`);
    if (!sharedRelationResult.relationVaultCount.includes("1")) failures.push(`relationVaultCount=${sharedRelationResult.relationVaultCount}`);
    if (!sharedRelationResult.relationVaultText.includes("关系卡")) failures.push(`relationVaultText=${sharedRelationResult.relationVaultText}`);
    if (!sharedRelationResult.relationVaultCardText.includes("LOVER")) failures.push(`relationVaultCardText=${sharedRelationResult.relationVaultCardText}`);
    if (!sharedRelationResult.relationVaultCardText.includes("STAR")) failures.push(`relationVaultCardText=${sharedRelationResult.relationVaultCardText}`);
    if (!sharedRelationResult.relationVaultCardText.includes("×")) failures.push(`relationVaultCardText=${sharedRelationResult.relationVaultCardText}`);
    if (!sharedRelationResult.relationModalOpen) failures.push("relation archive modal did not open");
    if (!sharedRelationResult.relationModalTitle.includes(sharedRelationResult.relationName)) failures.push(`relationModalTitle=${sharedRelationResult.relationModalTitle}`);
    if (!sharedRelationResult.relationModalTitle.includes("LOVER") || !sharedRelationResult.relationModalTitle.includes("STAR")) failures.push(`relationModalTitle=${sharedRelationResult.relationModalTitle}`);
    if (!sharedRelationResult.relationModalHighlightText.includes("开局")) failures.push(`relationModalHighlightText=${sharedRelationResult.relationModalHighlightText}`);
    if (!sharedRelationResult.relationModalHighlightText.includes("补位")) failures.push(`relationModalHighlightText=${sharedRelationResult.relationModalHighlightText}`);
    if (!sharedRelationResult.relationModalHighlightText.includes("接力")) failures.push(`relationModalHighlightText=${sharedRelationResult.relationModalHighlightText}`);
    if (!sharedRelationResult.relationModalHighlightText.includes("LOVER") || !sharedRelationResult.relationModalHighlightText.includes("STAR")) failures.push(`relationModalHighlightText=${sharedRelationResult.relationModalHighlightText}`);
    if (!sharedRelationResult.relationModalListText.includes("组合钩子")) failures.push(`relationModalListText=${sharedRelationResult.relationModalListText}`);
    if (!sharedRelationResult.relationModalListText.includes("LOVER") || !sharedRelationResult.relationModalListText.includes("STAR")) failures.push(`relationModalListText=${sharedRelationResult.relationModalListText}`);
    ["ROMEO", "MUTE", "LOOP", "RISK"].forEach((label) => {
      if (sharedRelationResult.relationVaultCardText.includes(label)) failures.push(`relationVaultLeakedInternal=${label}`);
      if (sharedRelationResult.relationModalTitle.includes(label)) failures.push(`relationModalTitleLeakedInternal=${label}`);
      if (sharedRelationResult.relationModalHighlightText.includes(label)) failures.push(`relationModalHighlightLeakedInternal=${label}`);
      if (sharedRelationResult.relationModalListText.includes(label)) failures.push(`relationModalListLeakedInternal=${label}`);
    });
    if (!sharedRelationResult.relationModalAction.includes("关系图")) failures.push(`relationModalAction=${sharedRelationResult.relationModalAction}`);
    if (sharedRelationResult.relationArchiveShareView !== "share") failures.push(`relationArchiveShareView=${sharedRelationResult.relationArchiveShareView}`);
    if (sharedRelationResult.relationArchivePosterMode !== "relation") failures.push(`relationArchivePosterMode=${sharedRelationResult.relationArchivePosterMode}`);
    if (!sharedRelationResult.relationArchiveShareTitle.includes("关系卡")) failures.push(`relationArchiveShareTitle=${sharedRelationResult.relationArchiveShareTitle}`);
    Object.entries(result.profileCoverage || {}).forEach(([expected, actual]) => {
      if (actual !== expected) failures.push(`profileCoverage ${expected}->${actual}`);
    });
    if (result.entryPreviewCode !== "???") failures.push(`entryPreviewCode=${result.entryPreviewCode}`);
    if (!result.entryPreviewTitle) failures.push("missing entryPreviewTitle");
    if (result.entryQuotaRemaining !== "3") failures.push(`entryQuotaRemaining=${result.entryQuotaRemaining}`);
    if (result.entryQuotaShare !== "1") failures.push(`entryQuotaShare=${result.entryQuotaShare}`);
    if (!result.entryQuotaReset.includes("23:59")) failures.push(`entryQuotaReset=${result.entryQuotaReset}`);
    if (result.afterScan !== "result") failures.push(`afterScan=${result.afterScan}`);
    if (result.resultCode !== "LOVER") failures.push(`resultCode=${result.resultCode}`);
    if (!result.verdict.includes("聊天记录")) failures.push(`verdict=${result.verdict}`);
    if (!result.weakness.includes("灯一暗")) failures.push(`weakness=${result.weakness}`);
    if (!result.identityClaim.includes("LOVER") || !result.identityClaim.includes("纯爱者")) failures.push(`identityClaim=${result.identityClaim}`);
    if (!result.shareHook.includes("LOVER")) failures.push(`shareHook=${result.shareHook}`);
    if (!result.friendRoast.includes("聊天框")) failures.push(`friendRoast=${result.friendRoast}`);
    if (!result.friendCue.includes("回忆模式")) failures.push(`friendCue=${result.friendCue}`);
    if (!result.ahaLineA.includes("LOVER")) failures.push(`ahaLineA=${result.ahaLineA}`);
    if (!result.ahaLineB.includes("聊天框")) failures.push(`ahaLineB=${result.ahaLineB}`);
    if (!result.ahaLineC.includes("纯爱 92%")) failures.push(`ahaLineC=${result.ahaLineC}`);
    if (!result.readCause.includes("情歌") || !result.readCause.includes("入戏")) failures.push(`readCause=${result.readCause}`);
    if (!result.readContrast.includes("没说完的话")) failures.push(`readContrast=${result.readContrast}`);
    if (!result.readTarget.includes("你是不是又想谁了")) failures.push(`readTarget=${result.readTarget}`);
    if (result.dropState !== "NEW CARD") failures.push(`dropState=${result.dropState}`);
    if (!result.dropHeadline.includes("LOVER")) failures.push(`dropHeadline=${result.dropHeadline}`);
    if (!result.dropDetail.includes("当前皮肤 1/3")) failures.push(`dropDetail=${result.dropDetail}`);
    if (result.resultRoleLabel !== "你的主类型") failures.push(`resultRoleLabel=${result.resultRoleLabel}`);
    if (!result.resultRoleNote.includes("首次命中")) failures.push(`resultRoleNote=${result.resultRoleNote}`);
    if (!result.resultRoleNote.includes("扩展人格宇宙")) failures.push(`resultRoleNote=${result.resultRoleNote}`);
    if (!result.evidenceText.includes("历史点唱画像")) failures.push(`evidenceText=${result.evidenceText}`);
    if (!result.scanMetricTexts.some((item) => item.includes("情歌 92%"))) failures.push(`scanMetricTexts=${result.scanMetricTexts.join(",")}`);
    if (!result.evidenceText.includes("LOVER")) failures.push(`evidenceText=${result.evidenceText}`);
    if (!result.evidenceText.includes("综合匹配")) failures.push(`evidenceText=${result.evidenceText}`);
    if (!result.evidenceText.includes("维命中")) failures.push(`evidenceText=${result.evidenceText}`);
    if (!result.evidenceLabels.includes("情歌占比")) failures.push(`evidenceLabels=${result.evidenceLabels.join(",")}`);
    if (!result.evidenceLabels.includes("重复点唱")) failures.push(`evidenceLabels=${result.evidenceLabels.join(",")}`);
    if (!result.evidenceValues.every((value) => /^\d+%$/.test(value))) failures.push(`evidenceValues=${result.evidenceValues.join(",")}`);
    if (!result.proofPathTitle.includes("匹配")) failures.push(`proofPathTitle=${result.proofPathTitle}`);
    if (!result.proofPathTitle.includes("纯爱 92%")) failures.push(`proofPathTitle=${result.proofPathTitle}`);
    if (!result.proofPathTitle.includes("LOVER")) failures.push(`proofPathTitle=${result.proofPathTitle}`);
    if (!result.proofPathText.includes("历史点唱画像")) failures.push(`proofPathText=${result.proofPathText}`);
    if (!result.proofPathText.includes("情歌占比")) failures.push(`proofPathText=${result.proofPathText}`);
    if (!result.proofRankText.includes("画像候选 TOP")) failures.push(`proofRankText=${result.proofRankText}`);
    if (!result.proofRankText.includes("维命中")) failures.push(`proofRankText=${result.proofRankText}`);
    if (!result.proofRankText.includes("LOVER")) failures.push(`proofRankText=${result.proofRankText}`);
    if (!result.runnerUpTitle.includes("差点")) failures.push(`runnerUpTitle=${result.runnerUpTitle}`);
    if (!result.runnerUpTitle.includes("REPEATER") && !result.runnerUpTitle.includes("ECHO")) failures.push(`runnerUpTitle=${result.runnerUpTitle}`);
    if (!result.runnerUpText.includes("LOVER")) failures.push(`runnerUpText=${result.runnerUpText}`);
    if (!result.runnerUpText.includes("主画像")) failures.push(`runnerUpText=${result.runnerUpText}`);
    if (!result.rollReasonText.includes("历史点唱画像")) failures.push(`rollReasonText=${result.rollReasonText}`);
    if (!result.rollReasonText.includes("综合匹配")) failures.push(`rollReasonText=${result.rollReasonText}`);
    if (!result.rollReasonText.includes("LOVER")) failures.push(`rollReasonText=${result.rollReasonText}`);
    if (result.proofBars.length !== 3) failures.push(`proofBars=${result.proofBars.join("|")}`);
    if (!result.resultProofSnapText.includes("LOVER")) failures.push(`resultProofSnapText=${result.resultProofSnapText}`);
    if (!result.resultProofSnapText.includes("92%")) failures.push(`resultProofSnapText=${result.resultProofSnapText}`);
    if (result.resultProofSnapChips.length !== 3) failures.push(`resultProofSnapChips=${result.resultProofSnapChips.join("|")}`);
    if (!result.resultProofSnapChips.some((item) => item.includes("92%"))) failures.push(`resultProofSnapChips=${result.resultProofSnapChips.join("|")}`);
    if (!result.proofBars.some((item) => item.includes("纯爱") && item.includes("命中") && item.includes("92%"))) failures.push(`proofBars=${result.proofBars.join("|")}`);
    if (!result.ownedAfterResult.includes("ROMEO")) failures.push(`ownedAfterResult=${result.ownedAfterResult.join(",")}`);
    if ((result.ownedSkinsAfterResult.ROMEO || []).length !== 1) failures.push(`ownedSkinsAfterResult=${JSON.stringify(result.ownedSkinsAfterResult)}`);
    if (result.primaryPersonaAfterResult !== "ROMEO") failures.push(`primaryPersonaAfterResult=${result.primaryPersonaAfterResult}`);
    if (!result.autoArchiveText.includes("已自动入库")) failures.push(`autoArchiveText=${result.autoArchiveText}`);
    if (!result.resultPrimaryAction.includes("生成分享图")) failures.push(`resultPrimaryAction=${result.resultPrimaryAction}`);
    if (!result.resultSecondaryAction.includes("查看档案库")) failures.push(`resultSecondaryAction=${result.resultSecondaryAction}`);
    if (result.resultPrimaryShareView !== "share") failures.push(`resultPrimaryShareView=${result.resultPrimaryShareView}`);
    if (result.resultPrimaryPosterGenerated !== "true") failures.push(`resultPrimaryPosterGenerated=${result.resultPrimaryPosterGenerated}`);
    if (!result.resultCardDropExists) failures.push("missing result card drop preview");
    if (!result.resultSkinModalOpen) failures.push("result card skin preview modal did not open");
    if (!result.resultSkinModalTitle.includes("LOVER")) failures.push(`resultSkinModalTitle=${result.resultSkinModalTitle}`);
    if (result.libraryView !== "library") failures.push(`libraryView=${result.libraryView}`);
    if (!result.libraryKicker.includes("MY KTV UNIVERSE")) failures.push(`libraryKicker=${result.libraryKicker}`);
    if (!result.libraryTitle.includes("我的 KTV") || !result.libraryTitle.includes("人格宇宙")) failures.push(`libraryTitle=${result.libraryTitle}`);
    if (!result.librarySummary.includes("我的人格卡 2/12") || !result.librarySummary.includes("LOVER（纯爱者）")) failures.push(`librarySummary=${result.librarySummary}`);
    if (!result.libraryIdentityLine.includes("主类型 LOVER") || !result.libraryIdentityLine.includes("装备「纯爱告白」") || !result.libraryIdentityLine.includes("下张 JOKER")) failures.push(`libraryIdentityLine=${result.libraryIdentityLine}`);
    if (result.archiveOverview.primaryCode !== "LOVER") failures.push(`archiveOverview=${JSON.stringify(result.archiveOverview)}`);
    if (!result.archiveOverview.primaryTitle.includes("纯爱者")) failures.push(`archiveOverview=${JSON.stringify(result.archiveOverview)}`);
    if (result.archiveOverview.ownedCount !== "2/12") failures.push(`archiveOverview=${JSON.stringify(result.archiveOverview)}`);
    if (!result.archiveOverview.ownedText.includes("已收集 2 张")) failures.push(`archiveOverview=${JSON.stringify(result.archiveOverview)}`);
    if (result.archiveOverview.nextCode !== "JOKER") failures.push(`archiveOverview=${JSON.stringify(result.archiveOverview)}`);
    if (!result.archiveOverview.nextTitle.includes("小丑")) failures.push(`archiveOverview=${JSON.stringify(result.archiveOverview)}`);
    if (!result.archiveOverview.skinName.includes("纯爱告白")) failures.push(`archiveOverview=${JSON.stringify(result.archiveOverview)}`);
    if (result.archiveOverview.skinCount !== "2/3") failures.push(`archiveOverview=${JSON.stringify(result.archiveOverview)}`);
    if (!result.libraryQuickActions.some((item) => item.label === "生成分享图" && item.action === "profile-share" && item.next === "share")) failures.push(`libraryQuickActions=${JSON.stringify(result.libraryQuickActions)}`);
    if (!result.libraryQuickActions.some((item) => item.label === "继续测人格" && item.action === "skin-roll" && item.next === "entry")) failures.push(`libraryQuickActions=${JSON.stringify(result.libraryQuickActions)}`);
    if (result.libraryQuickActions.length !== 2) failures.push(`libraryQuickActions=${JSON.stringify(result.libraryQuickActions)}`);
    Object.entries(result.libraryRemovedModules).forEach(([name, exists]) => {
      if (exists) failures.push(`library module should be removed: ${name}`);
    });
    if (!result.relationEmptyCardText.includes("LOVER")) failures.push(`relationEmptyCardText=${result.relationEmptyCardText}`);
    if (!result.relationEmptyCardText.includes("???")) failures.push(`relationEmptyCardText=${result.relationEmptyCardText}`);
    if (!result.relationEmptyCardText.includes("待生成关系卡")) failures.push(`relationEmptyCardText=${result.relationEmptyCardText}`);
    if (result.relationEmptyButtonLabel !== "生成朋友入口") failures.push(`relationEmptyButtonLabel=${result.relationEmptyButtonLabel}`);
    if (result.relationEmptyShareView !== "share") failures.push(`relationEmptyShareView=${result.relationEmptyShareView}`);
    if (result.relationEmptyPosterGenerated !== "true") failures.push(`relationEmptyPosterGenerated=${result.relationEmptyPosterGenerated}`);
    if (!result.relationEmptyShareChallenge.includes("FRIEND CHALLENGE")) failures.push(`relationEmptyShareChallenge=${result.relationEmptyShareChallenge}`);
    if (!result.ownedShowcaseTitle.includes("当前 LOVER") || !result.ownedShowcaseTitle.includes("已收集 2 张")) failures.push(`ownedShowcaseTitle=${result.ownedShowcaseTitle}`);
    if (!result.ownedShowcaseHint.includes("你现在拥有") || !result.ownedShowcaseHint.includes("LOVER") || !result.ownedShowcaseHint.includes("STAR")) failures.push(`ownedShowcaseHint=${result.ownedShowcaseHint}`);
    if (result.ownedShowcaseCards.length !== 2) failures.push(`ownedShowcaseCards=${JSON.stringify(result.ownedShowcaseCards)}`);
    if (!result.ownedShowcaseCards.some((item) => item.code === "ROMEO" && item.text.includes("LOVER") && item.current)) failures.push(`ownedShowcaseCards=${JSON.stringify(result.ownedShowcaseCards)}`);
    if (!result.ownedShowcaseCards.some((item) => item.code === "SPARK" && item.text.includes("STAR"))) failures.push(`ownedShowcaseCards=${JSON.stringify(result.ownedShowcaseCards)}`);
    if (result.vaultStageExists) failures.push("vault-stage should be removed from lean library");
    if (result.skinShelfCount !== "2/3") failures.push(`skinShelfCount=${result.skinShelfCount}`);
    if (result.shelfCards !== 3) failures.push(`shelfCards=${result.shelfCards}`);
    if (result.equippedShelfCards !== 1) failures.push(`equippedShelfCards=${result.equippedShelfCards}`);
    if (!result.equippedShelfLabel.includes("纯爱告白") || !result.equippedShelfLabel.includes("已装备")) failures.push(`equippedShelfLabel=${result.equippedShelfLabel}`);
    if (!result.skinChaseName.includes("复合幻想")) failures.push(`skinChaseName=${result.skinChaseName}`);
    if (!result.skinChaseText.includes("朋友圈") && !result.skinChaseText.includes("人格卡")) failures.push(`skinChaseText=${result.skinChaseText}`);
    if (result.skinChaseIndex !== "2") failures.push(`skinChaseIndex=${result.skinChaseIndex}`);
    if (result.primaryCollectionCardText && (!result.primaryCollectionCardText.includes("主类型") || !result.primaryCollectionCardText.includes("LOVER"))) failures.push(`primaryCollectionCardText=${result.primaryCollectionCardText}`);
    if (result.collectionWallCount !== "2/12") failures.push(`collectionWallCount=${result.collectionWallCount}`);
    if (result.collectionWallKicker !== "全部人格") failures.push(`collectionWallKicker=${result.collectionWallKicker}`);
    if (!result.collectionWallText.includes("全套 12 张人格卡") || !result.collectionWallText.includes("亮起的是已收集") || !result.collectionWallText.includes("当前 LOVER") || !result.collectionWallText.includes("剩余 10 张")) failures.push(`collectionWallText=${result.collectionWallText}`);
    if (!result.collectionSystemNote.includes("12 张人格卡") || !result.collectionSystemNote.includes("亮起的是已收集") || !result.collectionSystemNote.includes("灰色的是待解锁")) failures.push(`collectionSystemNote=${result.collectionSystemNote}`);
    if (result.collectionCardCount !== 12) failures.push(`collectionCardCount=${result.collectionCardCount}`);
    ["LOVER", "JOKER", "FIXER", "REPEATER", "CHALLENGER"].forEach((label) => {
      if (!result.collectionGridText.includes(label)) failures.push(`collectionGridMissing=${label}`);
    });
    ["MUTE", "LOOP", "RISK"].forEach((label) => {
      if (result.collectionGridText.includes(label)) failures.push(`collectionGridLeakedInternal=${label}`);
    });
    if (!result.skinChaseModalTitle.includes("复合幻想")) failures.push(`skinChaseModalTitle=${result.skinChaseModalTitle}`);
    if (!result.skinModalOpen) failures.push("skin shelf preview modal did not open");
    if (!result.skinModalTitle) failures.push("missing skin preview title");
    if (!result.skinModalInsight) failures.push("missing skin modal insight");
    if (result.skinModalProofCount !== 3) failures.push(`skinModalProofCount=${result.skinModalProofCount}`);
    if (!result.skinModalListText.includes("人格分支")) failures.push(`skinModalListText=${result.skinModalListText}`);
    if (!result.skinModalListText.includes("出现时刻")) failures.push(`skinModalListText=${result.skinModalListText}`);
    if (!result.skinModalListText.includes("收藏理由")) failures.push(`skinModalListText=${result.skinModalListText}`);
    if (!result.skinModalAction.includes("装备")) failures.push(`skinModalAction=${result.skinModalAction}`);
    if (result.equippedSkinsAfterAction.ROMEO !== "失恋电台") failures.push(`equippedSkinsAfterAction=${JSON.stringify(result.equippedSkinsAfterAction)}`);
    if (result.equippedSkinName !== "失恋电台") failures.push(`equippedSkinName=${result.equippedSkinName}`);
    if (!result.equippedSkinArt.includes("lover-broken-radio.png")) failures.push(`equippedSkinArt=${result.equippedSkinArt}`);
    if (!result.equippedModalClosed) failures.push("equipped modal should close after action");
    if (result.equippedShelfCardsAfterAction !== 1) failures.push(`equippedShelfCardsAfterAction=${result.equippedShelfCardsAfterAction}`);
    if (!result.equippedShelfLabelAfterAction.includes("失恋电台") || !result.equippedShelfLabelAfterAction.includes("已装备")) failures.push(`equippedShelfLabelAfterAction=${result.equippedShelfLabelAfterAction}`);
    if (result.shareView !== "share") failures.push(`shareView=${result.shareView}`);
    if (result.posterAfterDirectShare !== "true") failures.push(`posterAfterDirectShare=${result.posterAfterDirectShare}`);
    if (result.posterModeAfterDirectShare !== "persona") failures.push(`posterModeAfterDirectShare=${result.posterModeAfterDirectShare}`);
    if (!result.shareTitle.includes("入口")) failures.push(`shareTitle=${result.shareTitle}`);
    if (!result.shareChallengeText.includes("FRIEND CHALLENGE")) failures.push(`shareChallengeText=${result.shareChallengeText}`);
    if (!result.shareChallengeText.includes("KTV 关系")) failures.push(`shareChallengeText=${result.shareChallengeText}`);
    if (!result.shareSocialProofText.includes("聊天框")) failures.push(`shareSocialProofText=${result.shareSocialProofText}`);
    if (!result.shareSocialProofText.includes("差点命中") || !result.shareSocialProofText.includes("REPEATER")) failures.push(`shareSocialProofText missing runner-up hook=${result.shareSocialProofText}`);
    if (!result.shareCardFaceText.includes("当前分享卡面")) failures.push(`shareCardFaceText=${result.shareCardFaceText}`);
    if (!result.shareCardFaceText.includes("失恋电台") || !result.shareCardFaceText.includes("2/3")) failures.push(`shareCardFaceText=${result.shareCardFaceText}`);
    if (!result.shareCardFaceText.includes("差点") || !result.shareCardFaceText.includes("REPEATER")) failures.push(`shareCardFaceText missing runner-up hook=${result.shareCardFaceText}`);
    if (!result.shareRouteNoteText.includes("朋友入口")) failures.push(`shareRouteNoteText=${result.shareRouteNoteText}`);
    if (!result.shareRouteNoteText.includes("不是看结果")) failures.push(`shareRouteNoteText=${result.shareRouteNoteText}`);
    if (!result.shareRouteNoteText.includes("自动配对")) failures.push(`shareRouteNoteText=${result.shareRouteNoteText}`);
    if (!result.shareReadinessTextBeforeCopy.includes("LOVER 已带入")) failures.push(`shareReadiness=${result.shareReadinessTextBeforeCopy}`);
    if (!result.shareReadinessTextBeforeCopy.includes("朋友测自己的卡")) failures.push(`shareReadiness=${result.shareReadinessTextBeforeCopy}`);
    if (!result.shareReadinessTextBeforeCopy.includes("关系卡入库")) failures.push(`shareReadiness=${result.shareReadinessTextBeforeCopy}`);
    if (!result.relayTicketText.includes("朋友入口凭证")) failures.push(`relayTicketText=${result.relayTicketText}`);
    if (!result.relayTicketText.includes("LOVER 已带入")) failures.push(`relayTicketText=${result.relayTicketText}`);
    if (!result.relayTicketText.includes("关系卡自动入库")) failures.push(`relayTicketText=${result.relayTicketText}`);
    if (!result.shareLoopText.includes("SHARE LOOP")) failures.push(`shareLoopText=${result.shareLoopText}`);
    if (!result.shareLoopText.includes("朋友点开测自己")) failures.push(`shareLoopText=${result.shareLoopText}`);
    if (!result.shareLoopText.includes("你的卡自动带入")) failures.push(`shareLoopText=${result.shareLoopText}`);
    if (!result.shareLoopText.includes("生成你俩关系卡")) failures.push(`shareLoopText=${result.shareLoopText}`);
    if (!result.shareQuickActionLabels.some((label) => label.includes("测自己"))) failures.push(`shareQuickActionLabels=${result.shareQuickActionLabels.join(",")}`);
    ["保存图+复制入口", "系统分享", "复制入口"].forEach((label) => {
      if (!result.shareActionLabels.includes(label)) failures.push(`shareActionLabels=${result.shareActionLabels.join(",")}`);
    });
    if (!result.shareNextActionLabels.some((item) => item.label === "返回档案库" && item.next === "library")) failures.push(`shareNextActionLabels=${JSON.stringify(result.shareNextActionLabels)}`);
    if (!result.shareNextActionLabels.some((item) => item.label === "再测一次" && item.next === "entry")) failures.push(`shareNextActionLabels=${JSON.stringify(result.shareNextActionLabels)}`);
    if (!result.shareNextActionLabels.some((item) => item.label === "复制给朋友测" && item.copy === true && !item.next)) failures.push(`shareNextActionLabels=${JSON.stringify(result.shareNextActionLabels)}`);
    if (!result.copyShareTextEvent) failures.push("copy share text event missing");
    if (!result.copiedShareText.includes("source=share")) failures.push(`copiedShareText=${result.copiedShareText}`);
    if (!result.shareReadyStatusAfterCopy.includes("朋友入口已复制")) failures.push(`shareReadyStatusAfterCopy=${result.shareReadyStatusAfterCopy}`);
    if (result.backToLibraryView !== "library") failures.push(`backToLibraryView=${result.backToLibraryView}`);
    if (result.afterRetryView !== "result") failures.push(`afterRetryView=${result.afterRetryView}`);
    if (result.retryCode === result.resultCode) failures.push(`retryCode fixed after retry: ${result.retryCode}`);
    if (!result.loveCandidatePool.includes(result.retryCode)) failures.push(`retry outside love candidate pool=${result.retryCode}`);
    if (result.missionLabels.filter((label) => label === "生成分享图").length !== 1) failures.push(`missionLabels=${result.missionLabels.join(",")}`);
    if (result.missionLabels.filter((label) => label === "继续测人格").length !== 1) failures.push(`missionLabels=${result.missionLabels.join(",")}`);
    if (result.posterPrefix !== "data:image/png;base64,") failures.push("poster did not become a PNG data URL");
    if (result.posterLength < 10000) failures.push(`posterLength=${result.posterLength}`);
    if (!result.shareText.includes("source=share")) failures.push(`shareText=${result.shareText}`);
    if (!result.shareText.includes("from=LOVER")) failures.push(`shareText=${result.shareText}`);
    if (result.shareText.includes("from=ROMEO")) failures.push(`shareText leaked internal code=${result.shareText}`);
    if (!result.shareText.includes("LOVER") || !result.shareText.includes("纯爱者")) failures.push(`shareText=${result.shareText}`);
    if (!result.shareText.includes("聊天框")) failures.push(`shareText=${result.shareText}`);
    if (!result.shareText.includes("差点变成") || !result.shareText.includes("REPEATER")) failures.push(`shareText missing runner-up hook=${result.shareText}`);
    if (!result.shareText.includes("不是复制我的结果")) failures.push(`shareText=${result.shareText}`);
    if (!result.shareText.includes("自动配对我俩的 KTV 关系卡")) failures.push(`shareText=${result.shareText}`);
    if (!result.shareText.includes("#entry")) failures.push(`shareText=${result.shareText}`);
    if (!result.shareRouteNoteText.includes("不是看结果") || !result.shareRouteNoteText.includes("自动配对")) failures.push(`shareRouteNote=${result.shareRouteNoteText}`);
    if (!result.shareLoopText.includes("你的卡自动带入") || !result.shareLoopText.includes("生成你俩关系卡")) failures.push(`shareLoop=${result.shareLoopText}`);
    if (!result.shareChallengeText.includes("不是复制") || !result.shareChallengeText.includes("配成关系")) failures.push(`shareChallenge=${result.shareChallengeText}`);
    if (!result.toast.includes("分享图已生成")) failures.push(`toast=${result.toast}`);
    if (!result.toast.includes("朋友入口")) failures.push(`toast=${result.toast}`);
    ["scan_start", "skin_collect", "library_open", "mission_action", "share_create", "poster_save"].forEach((eventName) => {
      if (!result.eventNames.includes(eventName)) failures.push(`missing event ${eventName}`);
    });

    if (failures.length) {
      console.error(JSON.stringify({ sharedEntryResult, result }, null, 2));
      throw new Error(failures.join("; "));
    }

    console.log(JSON.stringify(result, null, 2));
    await send(ws, "Browser.close").catch(() => {});
  } finally {
    if (!browser.killed) browser.kill();
    if (!server.killed) server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
