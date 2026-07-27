import assert from "node:assert/strict";
import test from "node:test";
import { beats, createDeck, dealHands, evaluateCombo, generateCombos, legalCombos, upgradeForOrder, type Card, type Suit } from "../shared/game.ts";

const card = (rank:number,suit:Suit="spades",deck:0|1=0):Card=>({id:`${deck}-${suit}-${rank}`,rank,suit,deck});

test("two decks contain 108 unique cards and deal 27 to four seats",()=>{
  const deck=createDeck(()=>0.42);assert.equal(deck.length,108);assert.equal(new Set(deck.map(c=>c.id)).size,108);
  const hands=dealHands(["a","b","c","d"],()=>0.42);assert.deepEqual([...hands.values()].map(h=>h.length),[27,27,27,27]);
  assert.equal(new Set([...hands.values()].flat().map(c=>c.id)).size,108);
});

test("recognizes core normal patterns",()=>{
  assert.equal(evaluateCombo([card(7),card(7,"clubs")],2)?.type,"pair");
  assert.equal(evaluateCombo([card(8),card(8,"clubs"),card(8,"diamonds"),card(5),card(5,"clubs")],2)?.type,"full-house");
  assert.equal(evaluateCombo([2,3,4,5,6].map((r,i)=>card(r,["spades","clubs","hearts","diamonds","spades"][i] as Suit)),7)?.type,"straight");
  assert.equal(evaluateCombo([3,3,4,4,5,5].map((r,i)=>card(r,i%2?"clubs":"spades",i%2 as 0|1)),2)?.type,"triple-pairs");
  assert.equal(evaluateCombo([6,6,6,7,7,7].map((r,i)=>card(r,i%2?"clubs":"spades",i%2 as 0|1)),2)?.type,"steel-plate");
});

test("heart level cards act as wild cards",()=>{
  const combo=evaluateCombo([card(9),card(9,"clubs"),card(2,"hearts"),card(6),card(6,"clubs")],2);
  assert.equal(combo?.type,"full-house");assert.equal(combo?.rank,9);
});

test("bomb hierarchy preserves straight flush and large bombs",()=>{
  const four=evaluateCombo([card(8),card(8,"clubs"),card(8,"hearts",1),card(8,"diamonds")],2)!;
  const flush=evaluateCombo([5,6,7,8,9].map((r,i)=>card(r,"spades",i%2 as 0|1)),2)!;
  const six=evaluateCombo([0,1,2,3,4,5].map((_,i)=>card(10,["spades","hearts","clubs","diamonds","spades","clubs"][i] as Suit,i>3?1:0)),2)!;
  assert.equal(flush.type,"straight-flush");assert.equal(beats(flush,four),true);assert.equal(beats(six,flush),true);
});

test("generator returns playable combinations from a full hand",()=>{
  const hand=[card(4),card(4,"clubs"),card(5),card(6),card(7),card(8),card(9),card(12)];
  const types=new Set(generateCombos(hand,2).map(c=>c.type));assert.ok(types.has("pair"));assert.ok(types.has("straight")||types.has("straight-flush"));
});

test("hints preserve natural bombs instead of peeling off low cards",()=>{
  const hand=[card(3),card(3,"clubs"),card(3,"hearts",1),card(3,"diamonds"),card(8)];
  const hint=legalCombos(hand,2,null)[0];
  assert.equal(hint.type,"single");
  assert.equal(hint.cards[0].rank,8);
});

test("hints prefer a natural full house over spending a wild card",()=>{
  const hand=[card(8),card(8,"clubs"),card(8,"diamonds"),card(6),card(6,"clubs"),card(9),card(2,"hearts")];
  const current=evaluateCombo([card(7),card(7,"clubs"),card(7,"diamonds"),card(5),card(5,"clubs")],2)!;
  const hint=legalCombos(hand,2,current)[0];
  assert.equal(hint.type,"full-house");
  assert.equal(hint.cards.some(candidate=>candidate.suit==="hearts"&&candidate.rank===2),false);
});

test("finish order upgrades winner by partner placement",()=>{
  const team=(id:string)=>(["a","c"].includes(id)?0:1) as 0|1;
  assert.deepEqual(upgradeForOrder(["a","c","b","d"],team),{winner:0,levels:3});
  assert.deepEqual(upgradeForOrder(["a","b","c","d"],team),{winner:0,levels:2});
  assert.deepEqual(upgradeForOrder(["a","b","d","c"],team),{winner:0,levels:1});
});
