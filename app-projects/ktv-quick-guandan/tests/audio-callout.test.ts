import assert from "node:assert/strict";
import test from "node:test";
import { calloutKey, voiceBankForAvatar } from "../frontend/audio.ts";
import { evaluateCombo, type Card, type Suit } from "../shared/game.ts";

let id = 0;
const card = (rank: number, suit: Suit = "spades"): Card => ({ id: `audio-${id++}`, rank, suit, deck: 0 });

test("single cards call their exact rank", () => {
  assert.equal(calloutKey(evaluateCombo([card(7)], 2)!), "rank-7");
  assert.equal(calloutKey(evaluateCombo([card(14)], 2)!), "rank-14");
  assert.equal(calloutKey(evaluateCombo([card(16, "joker")], 2)!), "rank-16");
  assert.equal(calloutKey(evaluateCombo([card(17, "joker")], 2)!), "rank-17");
});

test("multi-card plays retain their combination callout", () => {
  assert.equal(calloutKey(evaluateCombo([card(7), card(7, "clubs")], 2)!), "pair");
  assert.equal(calloutKey(evaluateCombo([card(9), card(9, "clubs"), card(9, "hearts"), card(9, "diamonds")], 2)!), "bomb-4");
});

test("avatar atlas alternates male and female voice banks", () => {
  assert.equal(voiceBankForAvatar(0), "male");
  assert.equal(voiceBankForAvatar(1), "female");
  assert.equal(voiceBankForAvatar(6), "male");
  assert.equal(voiceBankForAvatar(7), "female");
});
