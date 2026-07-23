const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const port = 5322;
const dataDir = path.join(os.tmpdir(), `ktv-personality-quota-${Date.now()}`);
const baseUrl = `http://127.0.0.1:${port}`;

const fallbackProfile = {
  fastSongRatio: 0.58,
  loveSongRatio: 0.42,
  pureLoveRatio: 0.3,
  hurtLoveRatio: 0.18,
  popSongRatio: 0.5,
  chorusRatio: 0.36,
  skipRatio: 0.22,
  repeatRatio: 0.28,
  highNoteRatio: 0.18,
  controlRatio: 0.16,
  duetRatio: 0.12,
  dramaRatio: 0.15
};

const profileModels = {
  SPARK: { fastSongRatio: .92, popSongRatio: .72, chorusRatio: .52 },
  SKIP: { skipRatio: .9, controlRatio: .5, fastSongRatio: .36 },
  ROMEO: { pureLoveRatio: .92, loveSongRatio: .82, repeatRatio: .38 },
  ECHO: { chorusRatio: .9, duetRatio: .36, popSongRatio: .42 },
  DROP: { chorusRatio: .64, highNoteRatio: .82, fastSongRatio: .42 },
  MUTE: { controlRatio: .68, fastSongRatio: .62, skipRatio: .42 },
  LOOP: { repeatRatio: .9, loveSongRatio: .55, popSongRatio: .38 },
  BOSS: { controlRatio: .92, skipRatio: .55, chorusRatio: .32 },
  HYPE: { popSongRatio: .92, fastSongRatio: .72, chorusRatio: .48 },
  RISK: { highNoteRatio: .92, dramaRatio: .82, fastSongRatio: .38 },
  DUO: { duetRatio: .92, chorusRatio: .58, loveSongRatio: .46 },
  DRAMA: { hurtLoveRatio: .92, dramaRatio: .78, loveSongRatio: .58 }
};

function clampRatio(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function normalizeProfile(profile) {
  return Object.fromEntries(Object.keys(fallbackProfile).map((field) => [
    field,
    clampRatio(profile[field], fallbackProfile[field])
  ]));
}

function candidatePoolFor(profile) {
  const normalized = normalizeProfile(profile);
  return Object.entries(profileModels)
    .map(([code, model]) => {
      const entries = Object.entries(model);
      const distance = entries.reduce((sum, [field, target]) => {
        const delta = normalized[field] - target;
        return sum + (delta * delta);
      }, 0) / entries.length;
      const fit = 1 - Math.sqrt(distance);
      const intensity = entries.reduce((sum, [field]) => sum + normalized[field], 0) / entries.length;
      return [code, Math.max(0, fit) + intensity * .08];
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([code]) => code);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(method, pathname, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : "";
    const req = http.request(`${baseUrl}${pathname}`, {
      method,
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(data),
        "user-agent": "quota-verify",
        ...extraHeaders
      }
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => {
        raw += chunk;
      });
      res.on("end", () => {
        let payload = {};
        try {
          payload = raw ? JSON.parse(raw) : {};
        } catch {
          payload = { raw };
        }
        resolve({ status: res.statusCode, payload });
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function waitForServer() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const result = await request("GET", "/api/health");
      if (result.status === 200) return;
    } catch {
      await sleep(150);
    }
  }
  throw new Error("Server did not become ready.");
}

async function main() {
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      KTV_DATA_DIR: dataDir,
      KTV_DAILY_FREE_ROLLS: "3",
      KTV_DAILY_SHARE_REWARDS: "1"
    },
    stdio: "ignore",
    windowsHide: true
  });

  try {
    await waitForServer();
    const member = `quota-${Date.now()}`;
    const pathWithMember = (pathname) => `${pathname}?member=${member}`;
    const profile = {
      loveSongRatio: 0.95,
      pureLoveRatio: 0.92,
      hurtLoveRatio: 0.08,
      popSongRatio: 0.2,
      fastSongRatio: 0.08,
      chorusRatio: 0.16,
      skipRatio: 0.05
    };
    const skipProfile = {
      source: "verify-server-profile",
      loveSongRatio: 0.02,
      pureLoveRatio: 0.01,
      hurtLoveRatio: 0.02,
      popSongRatio: 0.12,
      fastSongRatio: 0.05,
      chorusRatio: 0.08,
      skipRatio: 0.96,
      controlRatio: 0.82
    };

    const firstQuota = await request("GET", pathWithMember("/api/profile/quota"));
    if (firstQuota.status !== 200 || firstQuota.payload.quota.remaining !== 3) {
      throw new Error(`Unexpected initial quota: ${JSON.stringify(firstQuota)}`);
    }

    const profileWrite = await request("POST", pathWithMember("/api/singing-profile"), { profile: skipProfile });
    if (profileWrite.status !== 200 || profileWrite.payload.profile.source !== "verify-server-profile") {
      throw new Error(`Expected profile write: ${JSON.stringify(profileWrite)}`);
    }

    const profileRead = await request("GET", pathWithMember("/api/singing-profile"));
    if (profileRead.status !== 200 || profileRead.payload.profile.skipRatio !== 0.96) {
      throw new Error(`Expected profile read: ${JSON.stringify(profileRead)}`);
    }

    const songMember = `songs-${Date.now()}`;
    const songEventWrite = await request("POST", `/api/song-events?member=${songMember}`, {
      source: "verify-song-events",
      events: [
        { title: "告白气球", tags: ["纯爱", "情歌", "流行"], bpm: 96, repeatCount: 1 },
        { title: "小幸运", tags: ["初恋", "纯爱", "情歌"], bpm: 90, repeatCount: 1 },
        { title: "爱你", tags: ["告白", "甜", "流行"], bpm: 105 },
        { title: "今天你要嫁给我", tags: ["对唱", "情歌"], chorusCount: 2, duet: true },
        { title: "简单爱", tags: ["纯爱", "喜欢", "情歌"], bpm: 92 }
      ]
    });
    if (songEventWrite.status !== 200 || songEventWrite.payload.accepted !== 5) {
      throw new Error(`Expected song events profile write: ${JSON.stringify(songEventWrite)}`);
    }
    if (songEventWrite.payload.profile.source !== "verify-song-events" || songEventWrite.payload.profile.pureLoveRatio < 0.6) {
      throw new Error(`Expected pure-love song event profile: ${JSON.stringify(songEventWrite)}`);
    }
    if (songEventWrite.payload.topCandidates?.[0]?.code !== "ROMEO") {
      throw new Error(`Expected song event candidates to lead to LOVER/ROMEO: ${JSON.stringify(songEventWrite)}`);
    }
    const songProfileRoll = await request("POST", `/api/persona/roll?member=${songMember}`, {});
    if (songProfileRoll.status !== 200 || songProfileRoll.payload.code !== "ROMEO") {
      throw new Error(`Expected stored song-event profile roll to hit LOVER/ROMEO: ${JSON.stringify(songProfileRoll)}`);
    }

    const headerMember = `header-${Date.now()}`;
    const headerProfileWrite = await request("POST", "/api/singing-profile", {
      profile: {
        source: "header-member-profile",
        loveSongRatio: 0.91,
        pureLoveRatio: 0.89,
        fastSongRatio: 0.07
      }
    }, { "x-member-id": headerMember });
    if (headerProfileWrite.status !== 200 || headerProfileWrite.payload.member !== headerMember) {
      throw new Error(`Expected x-member-id profile write: ${JSON.stringify(headerProfileWrite)}`);
    }
    const headerProfileRead = await request("GET", "/api/singing-profile", null, { "x-member-id": headerMember });
    if (headerProfileRead.status !== 200 || headerProfileRead.payload.profile?.source !== "header-member-profile") {
      throw new Error(`Expected x-member-id profile read: ${JSON.stringify(headerProfileRead)}`);
    }
    const isolatedProfileRead = await request("GET", "/api/singing-profile", null, { "x-member-id": `${headerMember}-other` });
    if (isolatedProfileRead.status !== 200 || isolatedProfileRead.payload.profile) {
      throw new Error(`Expected header member archive isolation: ${JSON.stringify(isolatedProfileRead)}`);
    }

    const storedProfileRoll = await request("POST", pathWithMember("/api/persona/roll"), {});
    if (storedProfileRoll.status !== 200 || storedProfileRoll.payload.code !== "SKIP") {
      throw new Error(`Expected stored profile roll to hit SKIP: ${JSON.stringify(storedProfileRoll)}`);
    }
    if (storedProfileRoll.payload.archive.primaryPersonaCode !== "SKIP") {
      throw new Error(`Expected first roll to set primary persona: ${JSON.stringify(storedProfileRoll)}`);
    }
    if (storedProfileRoll.payload.match?.reason !== "PRIMARY_FROM_PROFILE" || storedProfileRoll.payload.match?.topCandidates?.[0]?.code !== "SKIP") {
      throw new Error(`Expected first roll match metadata: ${JSON.stringify(storedProfileRoll)}`);
    }
    if (storedProfileRoll.payload.match?.topCandidates?.[0]?.displayCode !== "SKIPPER") {
      throw new Error(`Expected display code in match metadata: ${JSON.stringify(storedProfileRoll)}`);
    }
    if (storedProfileRoll.payload.archive.streakDays !== 1 || !storedProfileRoll.payload.archive.lastRollDate) {
      throw new Error(`Expected first roll streak: ${JSON.stringify(storedProfileRoll)}`);
    }
    const firstStreakReward = storedProfileRoll.payload.archive.streakReward;
    if (firstStreakReward.status !== "archive_building" || firstStreakReward.milestone !== 3) {
      throw new Error(`Expected archive-building streak state: ${JSON.stringify(storedProfileRoll)}`);
    }
    if (!/人格|档案/.test(`${firstStreakReward.title}${firstStreakReward.text}`)) {
      throw new Error(`Expected streak copy to reinforce persona archive: ${JSON.stringify(storedProfileRoll)}`);
    }
    if (/高级池|会员权益|限定皮肤|稀有皮肤曝光|澶|妗|鐨|鍗|闇|鍐/.test(`${firstStreakReward.title}${firstStreakReward.text}`)) {
      throw new Error(`Streak copy should be readable and non-commercial: ${JSON.stringify(storedProfileRoll)}`);
    }
    if (!storedProfileRoll.payload.skinDrop?.name || storedProfileRoll.payload.archive.ownedSkins.SKIP?.length < 1) {
      throw new Error(`Expected skin drop archive: ${JSON.stringify(storedProfileRoll)}`);
    }
    if (storedProfileRoll.payload.skinDrop.name !== "冷脸控台") {
      throw new Error(`Expected readable default SKIP skin: ${JSON.stringify(storedProfileRoll)}`);
    }
    if (/澶|妗|鐨|鍗|闇|鍐/.test(JSON.stringify(storedProfileRoll.payload.archive.ownedSkins))) {
      throw new Error(`Expected readable server skin archive: ${JSON.stringify(storedProfileRoll)}`);
    }
    if (storedProfileRoll.payload.archive.equippedSkins.SKIP !== storedProfileRoll.payload.skinDrop.name) {
      throw new Error(`Expected dropped skin to auto-equip: ${JSON.stringify(storedProfileRoll)}`);
    }

    const equipWrite = await request("POST", pathWithMember("/api/skins/equip"), {
      code: "SKIP",
      skinName: storedProfileRoll.payload.skinDrop.name
    });
    if (equipWrite.status !== 200 || equipWrite.payload.archive.equippedSkins.SKIP !== storedProfileRoll.payload.skinDrop.name) {
      throw new Error(`Expected skin equip archive write: ${JSON.stringify(equipWrite)}`);
    }

    const relationWrite = await request("POST", pathWithMember("/api/relations"), {
      relation: {
        friendCode: "ROMEO",
        friendTitle: "情歌脑",
        myCode: "SKIP",
        myTitle: "切换脑",
        name: "情绪急刹车",
        title: "一个把灯调暗，一个把歌切快",
        text: "ROMEO 负责把空气唱黏，SKIP 负责在副歌前突然换挡。",
        createdAt: new Date().toISOString()
      }
    });
    if (relationWrite.status !== 200 || relationWrite.payload.archive.ownedRelations?.[0]?.friendCode !== "ROMEO") {
      throw new Error(`Expected relation archive write: ${JSON.stringify(relationWrite)}`);
    }

    const archiveRead = await request("GET", pathWithMember("/api/archive"));
    if (archiveRead.status !== 200 || archiveRead.payload.ownedRelations?.[0]?.myCode !== "SKIP") {
      throw new Error(`Expected relation archive read: ${JSON.stringify(archiveRead)}`);
    }

    const rolls = [];
    const loveCandidatePool = candidatePoolFor(profile);
    for (let i = 0; i < 2; i += 1) {
      const result = await request("POST", pathWithMember("/api/persona/roll"), { profile });
      rolls.push(result.payload.code);
      if (result.status !== 200) throw new Error(`Roll ${i + 1} failed: ${JSON.stringify(result)}`);
      if (!loveCandidatePool.includes(result.payload.code)) {
        throw new Error(`Roll should stay inside profile candidate pool: ${JSON.stringify(result)}`);
      }
      if (result.payload.match?.reason !== "PROFILE_CANDIDATE_COLLECTION") {
        throw new Error(`Roll should include candidate match metadata: ${JSON.stringify(result)}`);
      }
      const returnedPool = result.payload.match?.topCandidates?.map((item) => item.code) || [];
      if (!returnedPool.includes(result.payload.code)) {
        throw new Error(`Roll match metadata should explain returned code: ${JSON.stringify(result)}`);
      }
      if (!result.payload.skinDrop?.name || !result.payload.archive.ownedSkins[result.payload.code]?.includes(result.payload.skinDrop.name)) {
        throw new Error(`Roll skin drop should be archived: ${JSON.stringify(result)}`);
      }
      if (result.payload.archive.streakDays !== 1) {
        throw new Error(`Same-day streak should not increment: ${JSON.stringify(result)}`);
      }
      if (result.payload.archive.streakReward.remainingDays !== 2) {
        throw new Error(`Same-day streak reward should stay stable: ${JSON.stringify(result)}`);
      }
    }

    const blocked = await request("POST", pathWithMember("/api/persona/roll"), { profile });
    if (blocked.status !== 429 || blocked.payload.error !== "ROLL_QUOTA_EXHAUSTED") {
      throw new Error(`Expected exhausted quota: ${JSON.stringify(blocked)}`);
    }

    const reward = await request("POST", pathWithMember("/api/share/reward"));
    if (reward.status !== 200 || !reward.payload.granted || reward.payload.quota.remaining !== 1) {
      throw new Error(`Expected share reward: ${JSON.stringify(reward)}`);
    }

    const bonusRoll = await request("POST", pathWithMember("/api/persona/roll"), { profile });
    if (bonusRoll.status !== 200 || bonusRoll.payload.quota.remaining !== 0) {
      throw new Error(`Expected bonus roll success: ${JSON.stringify(bonusRoll)}`);
    }
    if (!loveCandidatePool.includes(bonusRoll.payload.code)) {
      throw new Error(`Bonus roll should stay inside profile candidate pool: ${JSON.stringify(bonusRoll)}`);
    }
    if (!bonusRoll.payload.match?.topCandidates?.map((item) => item.code).includes(bonusRoll.payload.code)) {
      throw new Error(`Bonus roll match metadata should explain returned code: ${JSON.stringify(bonusRoll)}`);
    }

    const duplicateReward = await request("POST", pathWithMember("/api/share/reward"));
    if (duplicateReward.status !== 200 || duplicateReward.payload.granted) {
      throw new Error(`Expected duplicate reward denial: ${JSON.stringify(duplicateReward)}`);
    }

    console.log(JSON.stringify({
      initialRemaining: firstQuota.payload.quota.remaining,
      storedProfileCode: storedProfileRoll.payload.code,
      storedProfileSkin: storedProfileRoll.payload.skinDrop.name,
      storedProfileSkinCount: storedProfileRoll.payload.archive.ownedSkins.SKIP.length,
      equippedSkin: equipWrite.payload.archive.equippedSkins.SKIP,
      relationCount: archiveRead.payload.ownedRelations.length,
      streakDays: storedProfileRoll.payload.archive.streakDays,
      streakReward: storedProfileRoll.payload.archive.streakReward.status,
      rolls,
      blocked: blocked.payload.error,
      rewardGranted: reward.payload.granted,
      bonusCode: bonusRoll.payload.code
    }, null, 2));
  } finally {
    if (!server.killed) server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
