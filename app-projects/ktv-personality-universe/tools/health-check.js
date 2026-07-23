const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const checks = [];

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function ok(name, detail = "") {
  checks.push({ ok: true, name, detail });
}

function fail(name, detail = "") {
  checks.push({ ok: false, name, detail });
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function checkNodeSyntax(file) {
  try {
    new vm.Script(read(file), { filename: file });
    ok(`JS syntax: ${file}`);
  } catch (error) {
    fail(`JS syntax: ${file}`, error.message);
  }
}

function checkLocalAssetRefs() {
  const files = [
    "www-room-lineup/index.html",
    "www-room-lineup/mobile.html",
    "www-room-lineup/demo-launcher.html",
    "www-room-lineup/app.js",
    "www-room-lineup/sw.js"
  ];
  const refs = new Set();

  files.forEach((file) => {
    const content = read(file);
    const dir = path.dirname(path.join(root, file));
    const matches = content.matchAll(/["'`](\.\/assets\/visuals\/[^"'`?#]+)["'`]/g);
    for (const match of matches) {
      refs.add(path.resolve(dir, match[1]));
    }
  });

  const missing = [...refs].filter((file) => !fs.existsSync(file));
  if (missing.length === 0) {
    ok("Visual assets", `${refs.size} referenced assets found`);
  } else {
    fail("Visual assets", missing.map(rel).join(", "));
  }
}

function checkDomMarkers() {
  const html = read("www-room-lineup/index.html");
  const launcher = read("www-room-lineup/demo-launcher.html");
  const app = read("www-room-lineup/app.js");
  const server = read("server/index.js");
  const sw = read("www-room-lineup/sw.js");
  const required = [
    "data-view=\"entry\"",
    "data-view=\"scan\"",
    "data-view=\"result\"",
    "data-view=\"reward\"",
    "data-view=\"library\"",
    "data-view=\"share\"",
    "data-bind=\"pickLabel\"",
    "data-bind=\"entryTitleTop\"",
    "data-bind=\"entryTitleHot\"",
    "data-bind=\"entrySubtitle\"",
    "entry-profile-strip",
    "data-bind=\"entryProfileSummary\"",
    "历史点唱画像 · KTV 人格卡",
    "不是随机抽卡",
    "share-entry-promise",
    "data-bind=\"sharePromiseFriend\"",
    "data-bind=\"sharePromiseRelation\"",
    "data-bind=\"entryMetricTempo\"",
    "data-bind=\"entryMetricMood\"",
    "data-bind=\"entryMetricChorus\"",
    "entry-quota-card",
    "data-bind=\"entryQuotaRemaining\"",
    "data-bind=\"entryQuotaShare\"",
    "data-bind=\"entryQuotaReset\"",
    "KTV人格卡",
    "用你的唱歌偏好生成",
    "用点唱画像生成卡",
    "data-bind=\"entryCta\"",
    "data-bind=\"friendCode\"",
    "data-bind=\"friendTitle\"",
    "data-bind=\"friendAvatar\"",
    "朋友丢来一张人格卡",
    "share-entry-duel",
    "测完算关系",
    "你的卡还没揭晓",
    "基于历史点唱偏好",
    "data-scan-code=\"tempo\"",
    "data-scan-code=\"mood\"",
    "data-scan-code=\"chorus\"",
    "data-scan-code=\"control\"",
    "data-bind=\"typeCount\"",
    "data-save-poster",
    "data-system-share",
    "data-copy-text",
    "share-route-note",
    "share-quick-actions",
    "share-relay-ticket",
    "data-bind=\"relayTicketTitle\"",
    "styles.css?v=20260629-modal-scroll",
    "app.js?v=20260629-quota-library",
    "朋友入口已带上你的卡",
    "保存图+复制入口",
    "复制入口，让朋友测自己",
    "data-reset-demo",
    "data-export-events",
    "data-result-skin-preview",
    "data-mission-action",
    "library-overview",
    "data-bind=\"archivePrimaryCode\"",
    "data-bind=\"archivePrimaryTitle\"",
    "data-bind=\"archiveOwnedCount\"",
    "data-bind=\"archiveNextCode\"",
    "data-bind=\"archiveSkinName\"",
    "data-bind=\"ownedShowcaseTitle\"",
    "data-owned-showcase",
    "data-library-section=\"cards\"",
    "data-library-section=\"skins\"",
    "data-library-section=\"relations\"",
    "data-mission-action=\"profile-share\"",
    "data-mission-action=\"skin-roll\"",
    "全部人格",
    "当前皮肤",
    "关系卡",
    "data-modal-title",
    "data-modal-action",
    "data-lineup-grid",
    "data-bind=\"evidenceValueA\"",
    "data-bind=\"evidenceLabelA\"",
    "data-bind=\"verdict\"",
    "data-bind=\"weakness\"",
    "data-bind=\"readCause\"",
    "data-bind=\"readContrast\"",
    "data-bind=\"readTarget\"",
    "data-bind=\"shareHook\"",
    "data-bind=\"sharePosterKicker\"",
    "data-bind=\"shareTitle\"",
    "data-bind=\"shareRouteLabel\"",
    "data-bind=\"shareRouteText\"",
    "data-bind=\"shareProofKicker\"",
    "data-bind=\"shareChallengeKicker\"",
    "data-bind=\"shareChallengeTitle\"",
    "data-bind=\"shareChallengeText\"",
    "data-bind=\"shareChallengeOtherCode\"",
    "data-bind=\"friendRoast\"",
    "data-skin-chase",
    "data-bind=\"skinChaseName\"",
    "data-bind=\"skinChaseText\"",
    "data-bind=\"friendCue\"",
    "朋友看了会说",
    "auto-archive-pill",
    "已自动入库",
    "data-friend-compare",
    "data-bind=\"relationName\"",
    "data-bind=\"relationTitle\"",
    "data-bind=\"relationText\"",
    "data-relation-vault",
    "data-bind=\"relationVaultCount\"",
    "用点唱画像生成卡",
    "查看档案库",
    "生成分享图",
    "复制给朋友测",
    "FRIEND CHALLENGE",
    "SHARE HOOK",
    "share-social-proof",
    "share-readiness",
    "data-bind=\"shareReadyRoute\"",
    "data-bind=\"shareReadyFriend\"",
    "data-bind=\"shareReadyReward\"",
    "data-bind=\"shareReadyStatus\"",
    "自动算出你们俩的 KTV 关系",
    "data-proof-bars",
    "data-bind=\"ahaLineA\"",
    "data-bind=\"ahaLineB\"",
    "data-bind=\"ahaLineC\"",
    "data-bind=\"dropState\"",
    "data-bind=\"dropHeadline\"",
    "data-bind=\"dropDetail\"",
    "data-bind=\"resultRoleLabel\"",
    "data-bind=\"resultRoleNote\"",
    "data-bind=\"relationRevealStatus\"",
    "data-bind=\"relationBeatA\"",
    "data-bind=\"relationBeatB\"",
    "data-bind=\"relationBeatC\"",
    "share-loop",
    "share-entry-relay",
    "data-bind=\"shareLoopA\"",
    "data-bind=\"shareLoopB\"",
    "data-bind=\"shareLoopC\""
  ];

  const appMarkers = [
    "function resetDemoState",
    "params.has(\"reset\")",
    "params.has(\"persona\")",
    "params.has(\"owned\")",
    "params.has(\"bonus\")",
    "params.has(\"variant\")",
    "params.has(\"detail\")",
    "params.get(\"shareBase\")",
    "params.get(\"source\")",
    "params.get(\"member\")",
    "params.get(\"from\")",
    "const context",
    "entryVariants",
    "personaHotTakes",
    "function hotTakeFor",
    "personaProfileModels",
    "function scoreProfileByPersona",
    "evidenceMetricMap",
    "function evidenceFromProfile",
    "relationshipCombos",
    "function relationshipFor",
    "function relationPlaybookFor",
    "function renderRelationship",
    "function rememberRelation",
    "function renderRelationVault",
    "function openRelationDetail",
    "relation_share_create",
    "data-relation-key",
    "personaSocialProofs",
    "personaDeepReads",
    "function deepReadFor",
    "function socialProofFor",
    "function openCardDetail",
    "function downloadTextFile",
    "navigator.share",
    "function sharePlayUrl",
    "function shareMessage",
    "function apiJson",
    "const localPreviewMode",
    "const remoteApiRequired",
    "if (!remoteApiRequired)",
    "服务端开卡暂时不可用，请稍后再试",
    "function compactResultText",
    "function dropSummaryFor",
    "function rollPersonaFromServer",
    "function grantShareReward",
    "function renderDailyQuest",
    "function renderStreakReward",
    "function nextCollectionTarget",
    "生成我的卡并算关系",
    "不是复制朋友结果",
    "modal-insight",
    "modal-highlights",
    "function detailHighlights",
    "为什么是你",
    "别人没看懂的你",
    "最容易被戳中的人",
    "modal-proof",
    "data-modal-skin-index",
    "function openPersonaSkinPreview",
    "const seriesMap",
    "data-series-code",
    "function formatResetTime",
    "function streakRewardFor",
    "streakReward",
    "streakDays",
    "lastRollDate",
    "ownedSkins",
    "equippedSkins",
    "ownedRelations",
    "primaryPersonaCode",
    "ktv-primary-persona",
    "is-primary-persona",
    "function skinCatalogWithOwnership",
    "function equipSkin",
    "function equippedSkinFor",
    "function unlockLocalSkin",
    "singingProfile",
    "url.searchParams.set(\"source\", \"share\")",
    "url.searchParams.set(\"member\", \"friend\")",
    "url.searchParams.set(\"from\", personaDisplayCode(persona))",
    "url.searchParams.set(\"member\", context.member)",
    "\"x-ktv-member\"",
    "req.headers[\"x-member-id\"]",
    "invitedPersona",
    "share_entry_open",
    "fromPersona",
    "function personaLabel",
    "function proofPathFor",
    "function refreshSharePreview",
    "sharePosterPreview.dataset.mode",
    "我俩的 KTV 关系",
    "SHARE LOOP",
    "朋友点开测自己",
    "自动算你俩关系",
    "关系卡回到档案库",
    "/api/persona/roll",
    "/api/skins/equip",
    "/api/relations",
    "/api/profile/quota",
    "/api/singing-profile",
    "/api/share/reward",
    "mission_action"
  ];

  const pwaMarkers = [
    "rel=\"manifest\"",
    "getRegistrations",
    "CACHE_NAME",
    "clearRuntimeCaches",
    "ktv-personality-universe-disabled-v29"
  ];

  const launcherMarkers = [
    "DEMO LAUNCHER",
    "variant=test",
    "detail=SKIP",
    "owned=SPARK,ECHO",
    "?ops=1"
  ];

  const missing = [
    ...required.filter((marker) => !html.includes(marker)),
    ...appMarkers.filter((marker) => !(app.includes(marker) || server.includes(marker))),
    ...pwaMarkers.filter((marker) => !(html.includes(marker) || sw.includes(marker))),
    ...launcherMarkers.filter((marker) => !launcher.includes(marker))
  ];
  if (missing.length === 0) {
    ok(
      "DOM/app/PWA/launcher markers",
      `${required.length + appMarkers.length + pwaMarkers.length + launcherMarkers.length} required markers found`
    );
  } else {
    fail("DOM/app/PWA/launcher markers", missing.join(", "));
  }

  const cacheVersion = sw.match(/ktv-personality-universe-disabled-v(\d+)/)?.[1];
  if (!cacheVersion || Number(cacheVersion) < 27) {
    fail("Service worker cache version", `expected disabled v27+, got ${cacheVersion || "missing"}`);
  } else {
    ok("Service worker cache version", `disabled v${cacheVersion}`);
  }
}

function checkScreenshots() {
  const screenshots = [
    "www-room-lineup/screenshots/h5-entry.png",
    "www-room-lineup/screenshots/h5-demo-launcher.png",
    "www-room-lineup/screenshots/h5-entry-pwa.png",
    "www-room-lineup/screenshots/h5-entry-variant-test.png",
    "www-room-lineup/screenshots/h5-entry-context.png",
    "www-room-lineup/screenshots/h5-scan-enhanced.png",
    "www-room-lineup/screenshots/h5-result.png",
    "www-room-lineup/screenshots/h5-reward.png",
    "www-room-lineup/screenshots/h5-library.png",
    "www-room-lineup/screenshots/h5-library-mission.png",
    "www-room-lineup/screenshots/h5-library-param-demo.png",
    "www-room-lineup/screenshots/h5-card-detail-locked.png",
    "www-room-lineup/screenshots/h5-share-download.png",
    "www-room-lineup/screenshots/h5-share-backurl.png",
    "www-room-lineup/screenshots/h5-share-system-share.png",
    "www-room-lineup/screenshots/h5-ops-updated.png",
    "www-room-lineup/screenshots/h5-ops-export.png",
    "www-room-lineup/screenshots/demo-flow/01-entry.png",
    "www-room-lineup/screenshots/demo-flow/02-result.png",
    "www-room-lineup/screenshots/demo-flow/03-share.png",
    "www-room-lineup/screenshots/demo-flow/04-library.png"
  ];
  const missing = screenshots.filter((file) => !exists(file));
  if (missing.length === 0) {
    ok("Screenshots", `${screenshots.length} screenshots found`);
  } else {
    fail("Screenshots", missing.join(", "));
  }
}

function checkManifest() {
  try {
    const manifest = JSON.parse(read("www-room-lineup/manifest.webmanifest"));
    const required = ["name", "short_name", "start_url", "display", "icons"];
    const missing = required.filter((key) => !manifest[key]);
    const iconSrc = manifest.icons?.[0]?.src;
    if (missing.length > 0) {
      fail("Manifest", `missing ${missing.join(", ")}`);
      return;
    }
    if (!iconSrc || !exists(path.join("www-room-lineup", iconSrc))) {
      fail("Manifest", `missing icon ${iconSrc || ""}`.trim());
      return;
    }
    ok("Manifest", `${manifest.short_name} / ${manifest.display}`);
  } catch (error) {
    fail("Manifest", error.message);
  }
}

function checkForbiddenProductTerms() {
  const files = [
    "README.md",
    "product/mvp-prd-room-lineup.md",
    "product/experience-design-v1.md",
    "product/personality-system-v1.md",
    "research/sbti-logic.md",
    "designs/ui-design-room-lineup.md",
    "www-room-lineup/index.html",
    "www-room-lineup/app.js"
  ];
  const forbiddenTerms = ["寄生", "麦克风人格", "切歌恐怖分子", "气氛非法点火源", "认领罪名", "声带风险投资人"];
  const hits = [];
  files.forEach((file) => {
    const content = read(file);
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      forbiddenTerms.forEach((term) => {
        if (line.includes(term)) {
          hits.push(`${file}:${index + 1}:${term}`);
        }
      });
    });
  });

  if (hits.length === 0) {
    ok("Product wording", "no legacy risky public-facing terms");
  } else {
    fail("Product wording", hits.join(", "));
  }
}
function checkMissionCardSemantics() {
  const html = read("www-room-lineup/index.html");
  const app = read("www-room-lineup/app.js");
  const combined = `${html}\n${app}`;
  const required = [
    'data-next="share" data-mission-action="profile-share"',
    'data-next="entry" data-mission-action="skin-roll"',
    "生成分享图",
    "继续测人格",
    "mission_action"
  ];
  const forbidden = [
    'data-mission-action="retry"',
    'data-mission-action="route"',
    'data-mission-action="share"',
    'data-mission-action="daily-roll"',
    'data-mission-action="daily-share"',
    "replay-mission",
    "daily-quest",
    "streak-reward",
    "换一首歌",
    "再唱一局",
    "下一局",
    "唱完歌",
    "下次再唱"
  ];
  const missing = required.filter((marker) => !combined.includes(marker));
  const hits = forbidden.filter((marker) => combined.includes(marker));

  if (missing.length === 0 && hits.length === 0) {
    ok("Mission card semantics", "lean archive actions match app boundaries");
  } else {
    fail("Mission card semantics", [
      missing.length ? `missing: ${missing.join(", ")}` : "",
      hits.length ? `forbidden: ${hits.join(", ")}` : ""
    ].filter(Boolean).join("; "));
  }
}

function checkCoreScope() {
  const html = read("www-room-lineup/index.html");
  const launcher = read("www-room-lineup/demo-launcher.html");
  const app = read("www-room-lineup/app.js");
  const server = read("server/index.js");
  const docFiles = [
    "README.md",
    "product/demo-ops-playbook.md",
    "product/experience-design-v1.md",
    "product/mvp-prd-room-lineup.md",
    "designs/ui-design-room-lineup.md",
    "designs/ktv-personality-assets.pen",
    "www-room-lineup/manifest.webmanifest"
  ];
  const docs = docFiles.map(read).join("\n");
  const publicText = `${html}\n${launcher}\n${app}\n${server}`;
  const required = ["测", "档案", "分享"];
  const forbiddenPublic = [
    "高级皮肤包",
    "高级包",
    "premium=1",
    "data-open-premium",
    "今晚限定",
    "限定皮肤预告",
    "高级池",
    "会员权益",
    "稀有皮肤曝光",
    "领取人格卡皮肤",
    "人格卡皮肤",
    "1 / 48",
    "1/48",
    "人格卡 1/48",
    "卡片 1/48",
    " 路 冷脸控场",
    " 路 午夜电台",
    " 路 霓虹爆场",
    " 路 控台老板",
    "连续唱",
    "唱完歌",
    "下次再唱"
  ];
  const forbiddenDocs = [
    "App MVP",
    "App 首页",
    "包厢阵容页",
    "包厢阵容生成率",
    "打开 App 保存本局",
    "下载 App",
    "付费点草案"
  ];
  const forbiddenApp = [
    "openPremiumModal",
    "premium_open",
    "premium_unlock",
    "data-open-premium",
    "data-close-premium",
    "data-demo-unlock",
    "actionMode: \"unlock\""
  ];
  const mojibakePattern = /[闇鍛姝浠鍖鍐鍗鑻浜绗灞]|�/;
  const missing = required.filter((marker) => !(html.includes(marker) || launcher.includes(marker) || app.includes(marker)));
  const hits = forbiddenPublic.filter((marker) => publicText.includes(marker));
  const docHits = forbiddenDocs.filter((marker) => docs.includes(marker));
  const appHits = forbiddenApp.filter((marker) => app.includes(marker));
  const mojibakeSources = [
    ["www-room-lineup/index.html", html],
    ["www-room-lineup/demo-launcher.html", launcher],
    ["www-room-lineup/app.js", app],
    ...docFiles.map((file) => [file, read(file)])
  ];
  const mojibakeHits = mojibakeSources.flatMap(([file, content]) => (
    content.split(/\r?\n/).map((line, index) => [file, index + 1, line])
  )).filter(([, , line]) => mojibakePattern.test(line));

  if (missing.length === 0 && hits.length === 0 && docHits.length === 0 && appHits.length === 0 && mojibakeHits.length === 0) {
    ok("Core scope", "public flow focuses on test, collect, share");
  } else {
    fail("Core scope", [
      missing.length ? `missing: ${missing.join(", ")}` : "",
      hits.length ? `forbidden public marker: ${hits.join(", ")}` : "",
      docHits.length ? `forbidden doc marker: ${docHits.join(", ")}` : "",
      appHits.length ? `forbidden app marker: ${appHits.join(", ")}` : "",
      mojibakeHits.length ? `mojibake: ${mojibakeHits.slice(0, 8).map(([file, line]) => `${file}:${line}`).join(", ")}` : ""
    ].filter(Boolean).join("; "));
  }
}

function checkNoPersonaPreselection() {
  const files = [
    "README.md",
    "product/mvp-prd-room-lineup.md",
    "product/singing-data-integration.md",
    "www-room-lineup/index.html",
    "www-room-lineup/app.js"
  ];
  const forbiddenPatterns = [
    /首屏选择一个状态/,
    /状态选择会影响/,
    /用户自己选状态/,
    /先选一个今晚的状态/,
    /让用户预选人格/,
    /用户预选人格/,
    /预选.*场景/
  ];
  const requiredMarkers = [
    "历史点唱画像",
    "不是随机抽卡",
    "不提前剧透",
    "读取点唱画像",
    "不让用户提前选择人格或状态"
  ];
  const hits = [];
  files.forEach((file) => {
    const content = read(file);
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/不让用户预选|不再让用户预选|不要.*预选/.test(line)) return;
      forbiddenPatterns.forEach((pattern) => {
        if (pattern.test(line)) hits.push(`${file}:${index + 1}:${pattern}`);
      });
    });
  });
  const combined = files.map(read).join("\n");
  const missing = requiredMarkers.filter((marker) => !combined.includes(marker));

  if (hits.length === 0 && missing.length === 0) {
    ok("No persona preselection", "entry flow uses singing profile, not upfront status/persona choice");
  } else {
    fail("No persona preselection", [
      hits.length ? `forbidden: ${hits.join(", ")}` : "",
      missing.length ? `missing: ${missing.join(", ")}` : ""
    ].filter(Boolean).join("; "));
  }
}

function checkPersonalityDepth() {
  const app = read("www-room-lineup/app.js");
  const server = read("server/index.js");
  const docs = read("product/personality-system-v1.md");
  const html = read("www-room-lineup/index.html");
  const requiredCodes = ["SPARK", "SKIP", "ROMEO", "ECHO", "DROP", "MUTE", "LOOP", "BOSS", "HYPE", "RISK", "DUO", "DRAMA"];
  const requiredSkinArtFiles = [
    "star-opening-spark.png", "star-crown-singer.png", "star-stage-overload.png",
    "skipper-cold-console.png", "skipper-next-song-prophet.png", "skipper-rescue-remote.png",
    "lover-confession.png", "lover-broken-radio.png", "lover-reunion-fantasy.png",
    "echo-chorus-catch.png", "echo-vocal-loop.png", "echo-harmony-halo.png",
    "ghost-corner-mic.png", "ghost-chorus-reveal.png", "ghost-transparent-lead.png",
    "fixer-silence-breaker.png", "fixer-cold-rescue.png", "fixer-mood-mender.png",
    "repeater-single-loop.png", "repeater-repeat-fever.png", "repeater-anthem-record.png",
    "boss-room-console.png", "boss-queue-director.png", "boss-original-judge.png",
    "hoper-hot-song-believer.png", "hoper-tomorrow-opening.png", "hoper-energy-chorus.png",
    "challenger-high-note-box.png", "challenger-crack-hero.png", "challenger-god-note.png",
    "partner-copilot-vocal.png", "partner-perfect-sync.png", "partner-dual-mic-pact.png",
    "joker-bitter-smile.png", "joker-stubborn-return.png", "joker-final-curtain.png"
  ];
  const requiredAvatarFiles = [
    "avatar-spark-pencil.png",
    "avatar-skip-pencil.png",
    "avatar-romeo-pencil.png",
    "avatar-echo-pencil.png",
    "avatar-drop-pencil.png",
    "avatar-mute-pencil.png",
    "avatar-loop-pencil.png",
    "avatar-boss-pencil.png",
    "avatar-hype-pencil.png",
    "avatar-risk-pencil.png",
    "avatar-duo-pencil.png",
    "avatar-drama-pencil.png"
  ];
  const requiredFields = ["series:", "hook:", "unlockHint:"];
  const requiredDisplayCodes = ["STAR", "SKIPPER", "LOVER", "ECHO", "GHOST", "FIXER", "REPEATER", "BOSS", "HOPER", "CHALLENGER", "PARTNER", "JOKER"];
  const forbiddenDisplayCodes = ["ECHOER", "DROPPER", "BOSSER", "BELTER"];
  const requiredHotTakes = ["identityClaim:", "verdict:", "weakness:", "shareHook:"];
  const dynamicProof = [
    "evidenceStats:",
    "function renderLineup",
    "function lineupCardsFor",
    "data-lineup-grid",
    "function skinsForPersona",
    "skinDepthProfiles",
    "function skinDepthFor",
    "function nextChaseSkinIndex",
    "skin-vault",
    "personaProductProfiles",
    "function productProfileFor",
    "personaRelationshipProfiles",
    "function dynamicRelationshipFor",
    "data-bind=\"identityClaim\""
  ];
  const missingSkinCatalogs = requiredCodes.filter((code) => !app.includes(`  ${code}: [`));
  const missingProductProfiles = requiredCodes.filter((code) => !app.includes(`  ${code}: {\n    position:`));
  const missingProductProfileDepth = requiredCodes.filter((code) => {
    const marker = `  ${code}: {\n    position:`;
    const start = app.indexOf(marker);
    const end = start >= 0 ? app.indexOf("\n  },", start) : -1;
    const block = start >= 0 && end > start ? app.slice(start, end) : "";
    return !block.includes("nameLogic:") || !block.includes("songSignals:") || !block.includes("visualDirection:");
  });
  const missingRelationshipProfiles = requiredCodes.filter((code) => !app.includes(`  ${code}: { role:`));
  const missingIdentityClaims = requiredCodes.filter((code) => {
    const marker = `${code}: {`;
    const start = app.indexOf(marker, app.indexOf("const personaHotTakes"));
    const end = start >= 0 ? app.indexOf("\n  },", start) : -1;
    return start < 0 || end < 0 || !app.slice(start, end).includes("identityClaim:");
  });
  const missingCodes = requiredCodes.filter((code) => !app.includes(`code: "${code}"`) || !docs.includes(code));
  const missingSkinArtFiles = requiredSkinArtFiles.filter((file) => !app.includes(`persona-skins-v3/${file}`) || !exists(`www-room-lineup/assets/visuals/persona-skins-v3/${file}`));
  const missingAvatarFiles = requiredAvatarFiles.filter((file) => !app.includes(file) || !exists(`www-room-lineup/assets/visuals/pencil-export/avatars/${file}`));
  const missingFields = requiredFields.filter((field) => !app.includes(field));
  const personasBlock = app.slice(app.indexOf("const personas = ["), app.indexOf("const personaHotTakes"));
  const missingDisplayCodes = requiredDisplayCodes.filter((code) => !personasBlock.includes(`displayCode: "${code}"`));
  const forbiddenDisplayCodeHits = forbiddenDisplayCodes.filter((code) => personasBlock.includes(`displayCode: "${code}"`) || app.includes(`${code} 的核心卡`) || app.includes(`我是 ${code}`));
  const staleHtmlDefaults = [
    /data-bind="code">SPARK</,
    /data-bind="friendCode">ROMEO</,
    /data-bind="targetCode">SKIP</,
    /data-bind="collectionTarget">SKIP（/,
    /点燃者/,
    /情歌脑/,
    /avatar-boom\.png/,
    /avatar-sadfm\.png/,
    /avatar-cutx\.png/,
    /skin-card-boom-neon-burst\.png/,
    /skin-card-cutx-switch\.png/,
    /skin-card-sadfm-radio\.png/
  ].filter((pattern) => pattern.test(html)).map(String);
  const missingHtmlDisplayDefaults = ["STAR", "SKIPPER", "LOVER", "主场星", "纯爱者", "pencil-export/avatars/avatar-spark-pencil.png"].filter((marker) => !html.includes(marker));
  const requiredImageBriefMarkers = [
    "gpt-image-2 / Pencil 出图 brief",
    "用户可见英文词 + 中文人格",
    "STAR 主场星",
    "SKIPPER 切歌师",
    "LOVER 纯爱者",
    "ECHO 回声者",
    "GHOST 隐身者",
    "FIXER 救场者",
    "REPEATER 复读者",
    "BOSS 控场者",
    "HOPER 希望派",
    "CHALLENGER 挑战者",
    "PARTNER 搭子",
    "JOKER 小丑",
    "不同人格必须有不同轮廓"
  ];
  const forbiddenImageBriefMarkers = [
    "逐张主题：",
    "DROP：副歌空投",
    "MUTE：冷场破冰",
    "HYPE：气氛托",
    "RISK：挑战者",
    "DRAMA：戏剧尾音"
  ];
  const missingImageBriefMarkers = requiredImageBriefMarkers.filter((marker) => !docs.includes(marker));
  const staleImageBriefMarkers = forbiddenImageBriefMarkers.filter((marker) => docs.includes(marker));
  const missingHotTakes = requiredHotTakes.filter((field) => !app.includes(field));
  const missingDynamicProof = dynamicProof.filter((marker) => !(app.includes(marker) || read("www-room-lineup/index.html").includes(marker)));
  const gridDynamic = read("www-room-lineup/index.html").includes("data-collection-grid") && app.includes("collectionGrid.innerHTML");
  const legacyAvatarReuse = ["avatar-boom.png", "avatar-cutx.png", "avatar-sadfm.png", "avatar-echo.png"].filter((file) => app.includes(`avatar: "./assets/visuals/${file}"`));
  const legacyPersonaSkins = personasBlock.includes("skins:");
  const skinCatalogStart = app.indexOf("const skinCatalog = {");
  const skinCatalogEnd = app.indexOf("const personaProductProfiles", skinCatalogStart);
  const skinCatalogBlock = skinCatalogStart >= 0 && skinCatalogEnd > skinCatalogStart ? app.slice(skinCatalogStart, skinCatalogEnd) : "";
  const serverPoolsMatch = server.match(/const skinPools = \{([\s\S]*?)\n\};/);
  const serverSkinPoolBlock = serverPoolsMatch ? serverPoolsMatch[1] : "";
  const serverSkinPools = Object.fromEntries(requiredCodes.map((code) => {
    const match = serverSkinPoolBlock.match(new RegExp(`\\n\\s*${code}: \\[([^\\]]+)\\]`));
    const names = match ? [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]) : [];
    return [code, names];
  }));
  const incompleteSkinCatalogs = requiredCodes.filter((code) => {
    const match = skinCatalogBlock.match(new RegExp(`\\n  ${code}: \\[([\\s\\S]*?)\\n  \\]`));
    if (!match) return true;
    const skinCount = (match[1].match(/\{ name:/g) || []).length;
    return skinCount !== 3;
  });
  const incompleteServerSkinPools = requiredCodes.filter((code) => {
    return serverSkinPools[code].length !== 3;
  });
  const mismatchedDefaultSkins = requiredCodes.filter((code) => {
    const catalogMatch = skinCatalogBlock.match(new RegExp(`\\n  ${code}: \\[\\n    \\{ name: "([^"]+)"`));
    const defaultName = serverSkinPools[code][0];
    return !catalogMatch || !defaultName || catalogMatch[1] !== defaultName;
  });
  const skinDepthStart = app.indexOf("const skinDepthProfiles = {");
  const skinDepthEnd = app.indexOf("const personaProductProfiles", skinDepthStart);
  const skinDepthBlock = skinDepthStart >= 0 && skinDepthEnd > skinDepthStart ? app.slice(skinDepthStart, skinDepthEnd) : "";
  const missingSkinDepth = requiredCodes.filter((code) => {
    const catalogMatch = skinCatalogBlock.match(new RegExp(`\\n  ${code}: \\[([\\s\\S]*?)\\n  \\]`));
    const depthStart = skinDepthBlock.indexOf(`  ${code}: {`);
    const nextCodeStart = requiredCodes
      .map((nextCode) => skinDepthBlock.indexOf(`  ${nextCode}: {`, depthStart + 1))
      .filter((index) => index > depthStart)
      .sort((a, b) => a - b)[0];
    const depthBlock = depthStart >= 0
      ? skinDepthBlock.slice(depthStart, nextCodeStart > depthStart ? nextCodeStart : skinDepthBlock.length)
      : "";
    if (!catalogMatch || !depthBlock) return true;
    const skinNames = [...catalogMatch[1].matchAll(/name: "([^"]+)"/g)].map((match) => match[1]);
    return skinNames.some((name) => {
      const marker = `"${name}": {`;
      const start = depthBlock.indexOf(marker);
      const end = start >= 0 ? depthBlock.indexOf("\n    }", start) : -1;
      const block = start >= 0 && end > start ? depthBlock.slice(start, end) : "";
      return !block.includes("branch:") || !block.includes("scene:") || !block.includes("collect:") || !block.includes("unlock:");
    });
  });

  if (missingCodes.length === 0 && missingSkinCatalogs.length === 0 && incompleteSkinCatalogs.length === 0 && incompleteServerSkinPools.length === 0 && mismatchedDefaultSkins.length === 0 && !legacyPersonaSkins && missingProductProfiles.length === 0 && missingProductProfileDepth.length === 0 && missingRelationshipProfiles.length === 0 && missingIdentityClaims.length === 0 && missingSkinArtFiles.length === 0 && missingAvatarFiles.length === 0 && legacyAvatarReuse.length === 0 && missingFields.length === 0 && missingDisplayCodes.length === 0 && forbiddenDisplayCodeHits.length === 0 && staleHtmlDefaults.length === 0 && missingHtmlDisplayDefaults.length === 0 && missingImageBriefMarkers.length === 0 && staleImageBriefMarkers.length === 0 && missingHotTakes.length === 0 && missingDynamicProof.length === 0 && gridDynamic) {
    ok("Personality card depth", `${requiredCodes.length} cards with distinct avatars, plain-word display codes, fresh HTML defaults, identity claims, naming logic, product profiles, relationship profiles, 3-skin depth profiles, skin catalogs, and card art`);
  } else {
    fail("Personality card depth", [
      missingCodes.length ? `missing codes: ${missingCodes.join(", ")}` : "",
      missingSkinCatalogs.length ? `missing skin catalogs: ${missingSkinCatalogs.join(", ")}` : "",
      incompleteSkinCatalogs.length ? `incomplete skin catalogs: ${incompleteSkinCatalogs.join(", ")}` : "",
      incompleteServerSkinPools.length ? `incomplete server skin pools: ${incompleteServerSkinPools.join(", ")}` : "",
      mismatchedDefaultSkins.length ? `mismatched default skins: ${mismatchedDefaultSkins.join(", ")}` : "",
      legacyPersonaSkins ? "legacy skins field remains in personas" : "",
      missingProductProfiles.length ? `missing product profiles: ${missingProductProfiles.join(", ")}` : "",
      missingProductProfileDepth.length ? `missing product profile depth: ${missingProductProfileDepth.join(", ")}` : "",
      missingRelationshipProfiles.length ? `missing relationship profiles: ${missingRelationshipProfiles.join(", ")}` : "",
      missingIdentityClaims.length ? `missing identity claims: ${missingIdentityClaims.join(", ")}` : "",
      missingSkinArtFiles.length ? `missing skin art: ${missingSkinArtFiles.join(", ")}` : "",
      missingAvatarFiles.length ? `missing avatars: ${missingAvatarFiles.join(", ")}` : "",
      legacyAvatarReuse.length ? `legacy avatar reuse: ${legacyAvatarReuse.join(", ")}` : "",
      missingFields.length ? `missing fields: ${missingFields.join(", ")}` : "",
      missingDisplayCodes.length ? `missing display codes: ${missingDisplayCodes.join(", ")}` : "",
      forbiddenDisplayCodeHits.length ? `forbidden display codes: ${forbiddenDisplayCodeHits.join(", ")}` : "",
      staleHtmlDefaults.length ? `stale HTML defaults: ${staleHtmlDefaults.join(", ")}` : "",
      missingHtmlDisplayDefaults.length ? `missing HTML display defaults: ${missingHtmlDisplayDefaults.join(", ")}` : "",
      missingImageBriefMarkers.length ? `missing image brief markers: ${missingImageBriefMarkers.join(", ")}` : "",
      staleImageBriefMarkers.length ? `stale image brief markers: ${staleImageBriefMarkers.join(", ")}` : "",
      missingHotTakes.length ? `missing hot takes: ${missingHotTakes.join(", ")}` : "",
      missingDynamicProof.length ? `missing dynamic proof: ${missingDynamicProof.join(", ")}` : "",
      !gridDynamic ? "collection grid is not dynamic" : ""
    ].filter(Boolean).join("; "));
  }
}

function checkToolingAssets() {
  const required = ["tools/generate-card-variants.py"];
  const missing = required.filter((file) => !exists(file));
  if (missing.length === 0) {
    ok("Asset tooling", required.join(", "));
  } else {
    fail("Asset tooling", missing.join(", "));
  }
}

function checkSingingDataContract() {
  const docs = read("product/singing-data-integration.md");
  const required = [
    "推荐聚合口径",
    "会员标识和写入时机",
    "POST /api/singing-profile",
    "POST /api/song-events",
    "POST /api/persona/roll",
    "match.topCandidates",
    "topCandidates",
    "from=LOVER",
    "node tools/verify-server-quota.js",
    "npm run verify:demo"
  ];
  const missing = required.filter((marker) => !docs.includes(marker));
  if (missing.length === 0) {
    ok("Singing data contract", `${required.length} integration markers found`);
  } else {
    fail("Singing data contract", missing.join(", "));
  }
}

checkNodeSyntax("www-room-lineup/app.js");
checkNodeSyntax("www-room-lineup/sw.js");
checkNodeSyntax("tools/verify-share-poster.js");
checkNodeSyntax("tools/verify-collection-flow.js");
checkNodeSyntax("tools/verify-pick-scan-flow.js");
checkNodeSyntax("tools/verify-mission-flow.js");
checkNodeSyntax("tools/verify-core-loop.js");
checkNodeSyntax("tools/verify-server-quota.js");
checkNodeSyntax("tools/verify-server-archive-hydration.js");
checkNodeSyntax("tools/capture-demo-flow.js");
checkLocalAssetRefs();
checkDomMarkers();
checkScreenshots();
checkManifest();
checkForbiddenProductTerms();
checkMissionCardSemantics();
checkCoreScope();
checkNoPersonaPreselection();
checkPersonalityDepth();
checkToolingAssets();
checkSingingDataContract();

const failed = checks.filter((item) => !item.ok);
checks.forEach((item) => {
  const icon = item.ok ? "OK" : "FAIL";
  const suffix = item.detail ? ` - ${item.detail}` : "";
  console.log(`[${icon}] ${item.name}${suffix}`);
});

if (failed.length > 0) {
  console.error(`\n${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} checks passed.`);

