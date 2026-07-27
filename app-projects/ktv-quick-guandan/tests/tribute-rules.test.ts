import assert from "node:assert/strict";
import test from "node:test";
import { buildTributePlan, chooseBotReturnCard, legalReturnCards, type TributePlayer } from "../shared/tribute.ts";
import type { Card, Suit } from "../shared/game.ts";

let id = 0;
const card = (rank: number, suit: Suit = "spades", deck: 0 | 1 = 0): Card => ({ id: `tribute-${id++}`, rank, suit, deck });
const players: TributePlayer[] = [0, 1, 2, 3].map(seat => ({ id: `p${seat}`, seat, team: seat % 2 as 0 | 1 }));
const hands = (...values: Card[][]) => new Map(values.map((hand, seat) => [`p${seat}`, hand]));

test("single tribute sends the last player's highest eligible card to the head winner", () => {
  const plan = buildTributePlan(players, hands([card(3)], [card(4)], [card(5)], [card(14), card(2, "hearts")]), 2, ["p0", "p1", "p2", "p3"]);
  assert.equal(plan.kind, "single");
  assert.equal(plan.anti, false);
  assert.equal(plan.pairs[0].payerId, "p3");
  assert.equal(plan.pairs[0].receiverId, "p0");
  assert.equal(plan.pairs[0].tributeCard.rank, 14);
  assert.equal(plan.leaderId, "p3");
});

test("double tribute gives the larger offering to the head winner", () => {
  const plan = buildTributePlan(players, hands([card(3)], [card(17, "joker")], [card(5)], [card(14)]), 2, ["p0", "p2", "p1", "p3"]);
  assert.equal(plan.kind, "double");
  assert.equal(plan.pairs[0].payerId, "p1");
  assert.equal(plan.pairs[0].receiverId, "p0");
  assert.equal(plan.pairs[1].payerId, "p3");
  assert.equal(plan.pairs[1].receiverId, "p2");
  assert.equal(plan.leaderId, "p1");
});

test("two big jokers held by the tribute side trigger anti-tribute and head winner leads", () => {
  const single = buildTributePlan(players, hands([card(3)], [card(4)], [card(5)], [card(17, "joker", 0), card(17, "joker", 1)]), 2, ["p0", "p1", "p2", "p3"]);
  assert.equal(single.anti, true);
  assert.equal(single.leaderId, "p0");

  const double = buildTributePlan(players, hands([card(3)], [card(17, "joker", 0)], [card(5)], [card(17, "joker", 1)]), 2, ["p0", "p2", "p1", "p3"]);
  assert.equal(double.anti, true);
  assert.equal(double.leaderId, "p0");
});

test("return cards are at most ten and bots preserve pairs and wild cards", () => {
  const hand = [card(3), card(4), card(4, "clubs"), card(2, "hearts"), card(11)];
  assert.deepEqual(legalReturnCards(hand, 2).map(item => item.rank), [3, 4, 4, 2]);
  assert.equal(chooseBotReturnCard(hand, 2).rank, 3);
});
