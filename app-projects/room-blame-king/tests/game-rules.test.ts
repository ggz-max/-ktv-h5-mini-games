import assert from "node:assert/strict";
import test from "node:test";
import { cardPotValue, dealGame, forecastCard, modeForPlayerCount, rankingFor, rematchThreshold, resolveRound, rowPotValue } from "../shared/game.ts";

test("dynamic player modes cover 1-8 players", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 8].map(count => modeForPlayerCount(count).rounds), [6, 6, 6, 6, 5, 5]);
  assert.deepEqual([1, 2, 3, 5].map(rematchThreshold), [1, 2, 3, 5]);
});

test("a normal card enters the closest lower tail", () => {
  const result = resolveRound([[10], [20, 24], [40], [80]], [{ playerId: "p1", playerName: "甲", card: 30 }]);
  assert.deepEqual(result.rows[1], [20, 24, 30]);
  assert.equal(result.penalties.length, 0);
});

test("the sixth card collects five cards and starts a new row", () => {
  const result = resolveRound([[10, 11, 12, 13, 14], [30], [50], [70]], [{ playerId: "p1", playerName: "甲", card: 15 }]);
  assert.deepEqual(result.rows[0], [15]);
  assert.equal(result.penalties[0].points, 10);
  assert.equal(result.penalties[0].reason, "sixth-card");
});

test("a card below all tails takes the shortest row then lowest tail", () => {
  const result = resolveRound([[20, 21], [30], [40], [50]], [{ playerId: "p1", playerName: "甲", card: 10 }]);
  assert.deepEqual(result.rows[1], [10]);
  assert.equal(result.penalties[0].points, 3);
  assert.equal(result.penalties[0].reason, "below-all-tails");
});

test("cards and rows expose visible risk values", () => {
  assert.deepEqual([14, 15, 20, 22].map(cardPotValue), [1, 2, 3, 4]);
  assert.equal(rowPotValue([14, 15, 20, 22]), 10);
  assert.deepEqual(forecastCard([[10], [20, 24], [40], [80]], 30), {
    rowIndex: 1,
    belowAllTails: false,
    willTakeRow: false,
    penaltyPoints: 0,
    currentRowPots: 4,
    currentRowLength: 2
  });
});

test("a delayed play resolves after every normal play", () => {
  const result = resolveRound(
    [[10], [30], [50], [70]],
    [
      { playerId: "p1", playerName: "甲", card: 12, delayed: true },
      { playerId: "p2", playerName: "乙", card: 60 }
    ]
  );
  assert.deepEqual(result.placements.map(item => item.play.playerId), ["p2", "p1"]);
});

test("a delayed play transfers its penalty to the previous player", () => {
  const result = resolveRound(
    [[10, 11, 12, 13, 14], [30], [50], [70]],
    [
      { playerId: "p1", playerName: "甲", card: 15, delayed: true },
      { playerId: "p2", playerName: "乙", card: 55 }
    ]
  );
  assert.equal(result.penalties[0].playerId, "p2");
  assert.equal(result.penalties[0].playerName, "乙");
  assert.equal(result.penalties[0].sourcePlayerId, "p1");
  assert.equal(result.penalties[0].sourcePlayerName, "甲");
  assert.equal(result.penalties[0].points, 10);
});

test("plays resolve in ascending order and may change later placement", () => {
  const result = resolveRound(
    [[10], [30], [50], [70]],
    [
      { playerId: "p2", playerName: "乙", card: 29 },
      { playerId: "p1", playerName: "甲", card: 28 }
    ]
  );
  assert.deepEqual(result.placements.map(item => item.play.card), [28, 29]);
  assert.deepEqual(result.rows[0], [10, 28, 29]);
});

test("dealing creates unique cards for every supported player count", () => {
  for (const count of [1, 2, 3, 4, 5, 8]) {
    const game = dealGame(Array.from({ length: count }, (_, index) => `p${index}`), () => 0.42);
    const cards = [...game.rows.flat(), ...[...game.hands.values()].flat(), ...game.systemHands.flat()];
    assert.equal(new Set(cards).size, cards.length);
    assert.equal(game.hands.get("p0")?.length, modeForPlayerCount(count).rounds);
  }
});

test("ranking allows tied winners and identifies highest score last", () => {
  const ranking = rankingFor([
    { id: "a", name: "甲", score: 5 },
    { id: "b", name: "乙", score: 0 },
    { id: "c", name: "丙", score: 0 }
  ]);
  assert.equal(ranking[0].score, 0);
  assert.equal(ranking[1].score, 0);
  assert.equal(ranking[2].id, "a");
});
