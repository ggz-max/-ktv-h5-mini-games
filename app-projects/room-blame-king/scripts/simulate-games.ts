import fs from "node:fs";
import path from "node:path";
import { dealGame, resolveRound, type CardPlay } from "../shared/game.ts";

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
}

const games = 10_000;
const byPlayerCount: Record<number, { games: number; playersPenalized: number; maxScore: number }> = {};
let totalRounds = 0;
let totalPenalties = 0;

for (let gameIndex = 0; gameIndex < games; gameIndex += 1) {
  const playerCount = (gameIndex % 8) + 1;
  const effectivePlayerCount = playerCount <= 2 ? 4 : playerCount;
  const random = seededRandom(0xabc000 + gameIndex);
  const playerIds = Array.from({ length: effectivePlayerCount }, (_, index) => index < playerCount ? `p${index}` : `bot${index - playerCount}`);
  const dealt = dealGame(playerIds, random);
  let rows = dealt.rows;
  const scores = new Map(playerIds.map(id => [id, 0]));
  const allDealtCards = [...rows.flat(), ...[...dealt.hands.values()].flat(), ...dealt.systemHands.flat()];
  if (new Set(allDealtCards).size !== allDealtCards.length) throw new Error(`duplicate card in game ${gameIndex}`);

  for (let round = 0; round < dealt.config.rounds; round += 1) {
    const plays: CardPlay[] = [];
    for (const playerId of playerIds) {
      const hand = dealt.hands.get(playerId)!;
      if (!hand.length) throw new Error(`empty hand before game end: ${gameIndex}/${round}`);
      const selected = hand[Math.floor(random() * hand.length)];
      plays.push({ playerId, playerName: playerId, card: selected });
      dealt.hands.set(playerId, hand.filter(card => card !== selected));
    }
    dealt.systemHands.forEach((hand, index) => {
      plays.push({ playerId: `system-${index}`, playerName: "system", card: hand[round], isSystem: true });
    });
    const resolution = resolveRound(rows, plays);
    rows = resolution.rows;
    if (rows.length !== 4 || rows.some(row => row.length < 1 || row.length > 5)) throw new Error(`invalid rows in game ${gameIndex}`);
    for (const penalty of resolution.penalties) {
      if (!penalty.playerId.startsWith("system-")) scores.set(penalty.playerId, scores.get(penalty.playerId)! + penalty.points);
    }
    totalPenalties += resolution.penalties.length;
    totalRounds += 1;
  }

  if ([...dealt.hands.values()].some(hand => hand.length !== 0)) throw new Error(`cards remained after game ${gameIndex}`);
  const stats = byPlayerCount[playerCount] ||= { games: 0, playersPenalized: 0, maxScore: 0 };
  stats.games += 1;
  stats.playersPenalized += [...scores.values()].filter(score => score > 0).length;
  stats.maxScore = Math.max(stats.maxScore, ...scores.values());
}

const report = {
  generatedAt: new Date().toISOString(),
  games,
  totalRounds,
  totalPenalties,
  averagePenaltiesPerGame: Number((totalPenalties / games).toFixed(3)),
  byPlayerCount
};
const outputDir = path.resolve("output", "verification");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "simulation-report.json"), JSON.stringify(report, null, 2));
console.log(`simulated ${games} games / ${totalRounds} rounds / ${totalPenalties} penalties`);
