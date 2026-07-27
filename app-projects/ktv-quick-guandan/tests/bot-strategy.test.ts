import assert from "node:assert/strict";
import test from "node:test";
import { chooseBotDecision } from "../shared/bot.ts";
import { evaluateCombo, legalCombos, rankLabel, type Card, type Suit } from "../shared/game.ts";

let id = 0;
const card = (rank: number, suit: Suit = "spades"): Card => ({ id: `bot-test-${id++}`, rank, suit, deck: 0 });

test("bot does not overtake a teammate who controls the trick", () => {
  const hand = [card(8), card(8, "clubs"), card(9)];
  const current = evaluateCombo([card(7), card(7, "clubs")], 2)!;
  const decision = chooseBotDecision({ hand, level: 2, currentCombo: current, options: legalCombos(hand, 2, current), teammateLeading: true, teammateHand: [card(12)], opponentCardCounts: [10, 12] });
  assert.deepEqual(decision, { action: "pass", reason: "yield-to-teammate" });
});

test("bot may overtake its teammate only to finish the whole hand", () => {
  const hand = [card(8), card(8, "clubs")];
  const current = evaluateCombo([card(7), card(7, "clubs")], 2)!;
  const decision = chooseBotDecision({ hand, level: 2, currentCombo: current, options: legalCombos(hand, 2, current), teammateLeading: true, teammateHand: [card(12)], opponentCardCounts: [10, 12] });
  assert.equal(decision.action, "play");
  if (decision.action === "play") assert.equal(decision.reason, "finish");
});

test("bot leads a feedable single when its teammate has one card", () => {
  const hand = [card(3), card(4), card(4, "clubs")];
  const decision = chooseBotDecision({ hand, level: 2, currentCombo: null, options: legalCombos(hand, 2, null), teammateLeading: false, teammateHand: [card(10)], opponentCardCounts: [8, 9] });
  assert.equal(decision.action, "play");
  if (decision.action === "play") {
    assert.equal(decision.reason, "feed-teammate");
    assert.equal(decision.combo.type, "single");
    assert.equal(decision.combo.cards[0].rank, 4);
  }
});

test("bot still leads its lowest single when the teammate cannot beat it", () => {
  const hand = [card(8), card(9), card(9, "clubs")];
  const decision = chooseBotDecision({ hand, level: 2, currentCombo: null, options: legalCombos(hand, 2, null), teammateLeading: false, teammateHand: [card(3)], opponentCardCounts: [8, 9] });
  assert.equal(decision.action, "play");
  if (decision.action === "play") {
    assert.equal(decision.reason, "feed-teammate");
    assert.equal(decision.combo.type, "single");
    assert.equal(decision.combo.cards[0].rank, 8);
  }
});

test("bot avoids leading a single when an opponent has one card", () => {
  const hand = [card(3), card(4), card(4, "clubs")];
  const decision = chooseBotDecision({ hand, level: 2, currentCombo: null, options: legalCombos(hand, 2, null), teammateLeading: false, teammateHand: [card(9), card(10)], opponentCardCounts: [1, 8] });
  assert.equal(decision.action, "play");
  if (decision.action === "play") {
    assert.equal(decision.reason, "block-opponent");
    assert.equal(decision.combo.type, "pair");
  }
});

test("bot keeps a four-card bomb intact when opening", () => {
  const hand = [card(3), card(3, "clubs"), card(3, "hearts"), card(3, "diamonds"), card(8), card(9)];
  const decision = chooseBotDecision({ hand, level: 2, currentCombo: null, options: legalCombos(hand, 2, null), teammateLeading: false, teammateHand: [card(12), card(13)], opponentCardCounts: [8, 9] });
  assert.equal(decision.action, "play");
  if (decision.action === "play") assert.equal(decision.combo.cards.some(candidate => candidate.rank === 3), false);
});

test("level labels use playing-card ranks above ten", () => {
  assert.deepEqual([10, 11, 12, 13, 14].map(rankLabel), ["10", "J", "Q", "K", "A"]);
});
