export type Suit = "spades" | "hearts" | "clubs" | "diamonds" | "joker";
export type ComboType = "single" | "pair" | "triple" | "full-house" | "straight" | "triple-pairs" | "steel-plate" | "bomb" | "straight-flush" | "joker-bomb";

export interface Card { id: string; suit: Suit; rank: number; deck: 0 | 1 }
export interface Combo { type: ComboType; cards: Card[]; rank: number; size: number; bombTier: number }

const suits: Suit[] = ["spades", "hearts", "clubs", "diamonds"];
const sequenceRanks = Array.from({ length: 13 }, (_, index) => index + 2);

export function createDeck(random: () => number = Math.random): Card[] {
  const cards: Card[] = [];
  for (const deck of [0, 1] as const) {
    for (const suit of suits) for (const rank of sequenceRanks) cards.push({ id: `${deck}-${suit}-${rank}`, suit, rank, deck });
    cards.push({ id: `${deck}-joker-16`, suit: "joker", rank: 16, deck });
    cards.push({ id: `${deck}-joker-17`, suit: "joker", rank: 17, deck });
  }
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
  return cards;
}

export function dealHands(playerIds: string[], random: () => number = Math.random) {
  if (playerIds.length !== 4) throw new Error("guandan requires four seats");
  const deck = createDeck(random);
  const hands = new Map<string, Card[]>();
  playerIds.forEach((id, seat) => hands.set(id, sortHand(deck.filter((_, index) => index % 4 === seat), 2)));
  return hands;
}

export function cardLabel(card: Card) {
  if (card.rank === 16) return "小王";
  if (card.rank === 17) return "大王";
  return rankLabel(card.rank);
}

export function rankLabel(rank: number) {
  return ({ 11: "J", 12: "Q", 13: "K", 14: "A" } as Record<number, string>)[rank] || String(rank);
}

export function rankPower(rank: number, level: number) {
  if (rank >= 16) return rank + 20;
  if (rank === level) return 30;
  return rank;
}

export function sortHand(cards: Card[], level: number) {
  const suitOrder: Record<Suit, number> = { diamonds: 0, clubs: 1, hearts: 2, spades: 3, joker: 4 };
  return [...cards].sort((a, b) => rankPower(a.rank, level) - rankPower(b.rank, level) || suitOrder[a.suit] - suitOrder[b.suit] || a.deck - b.deck);
}

export function isWild(card: Card, level: number) { return card.suit === "hearts" && card.rank === level; }

function counts(cards: Card[], level: number) {
  const map = new Map<number, Card[]>();
  for (const card of cards.filter(card => !isWild(card, level))) map.set(card.rank, [...(map.get(card.rank) || []), card]);
  return map;
}

function canGroups(cards: Card[], groupSize: number, groups: number, consecutive: boolean, level: number) {
  const wilds = cards.filter(card => isWild(card, level)).length;
  const map = counts(cards, level);
  const starts = consecutive ? Array.from({ length: 13 - groups + 1 }, (_, i) => i + 2) : [...map.keys(), ...sequenceRanks];
  for (const start of starts) {
    const ranks = Array.from({ length: groups }, (_, i) => consecutive ? start + i : start);
    if (ranks.some(rank => rank >= 15 || rank === level)) continue;
    const needed = ranks.reduce((sum, rank) => sum + Math.max(0, groupSize - (map.get(rank)?.length || 0)), 0);
    const extras = [...map.entries()].reduce((sum, [rank, group]) => sum + (ranks.includes(rank) ? Math.max(0, group.length - groupSize) : group.length), 0);
    if (needed === wilds && extras === 0) return { rank: ranks[ranks.length - 1] };
  }
  return null;
}

function straightRank(cards: Card[], level: number, sameSuit = false) {
  const wilds = cards.filter(card => isWild(card, level));
  const naturals = cards.filter(card => !isWild(card, level));
  if (sameSuit && naturals.some(card => card.suit === "joker") || sameSuit && new Set(naturals.map(card => card.suit)).size > 1) return null;
  if (naturals.some(card => card.rank >= 15 || card.rank === level)) return null;
  for (let start = 2; start <= 10; start += 1) {
    const ranks = Array.from({ length: 5 }, (_, i) => start + i);
    const naturalRanks = naturals.map(card => card.rank);
    if (new Set(naturalRanks).size !== naturalRanks.length) continue;
    if (naturalRanks.every(rank => ranks.includes(rank)) && ranks.filter(rank => !naturalRanks.includes(rank)).length === wilds.length) return ranks[4];
  }
  return null;
}

export function evaluateCombo(cards: Card[], level: number): Combo | null {
  if (!cards.length) return null;
  const ordered = sortHand(cards, level);
  const wildCount = cards.filter(card => isWild(card, level)).length;
  const map = counts(cards, level);
  const ranks = [...map.keys()];
  const make = (type: ComboType, rank: number, bombTier = 0): Combo => ({ type, cards: ordered, rank, size: cards.length, bombTier });

  if (cards.length === 4 && cards.every(card => card.suit === "joker")) return make("joker-bomb", 17, 100);
  if (cards.length >= 4 && ranks.length <= 1 && (ranks[0] ?? level) < 16) return make("bomb", rankPower(ranks[0] ?? level, level), cards.length >= 6 ? 30 + cards.length : cards.length === 5 ? 20 : 10);
  if (cards.length === 5) {
    const flush = straightRank(cards, level, true);
    if (flush) return make("straight-flush", flush, 25);
  }
  if (cards.length === 1) return make("single", rankPower(cards[0].rank, level));
  if (cards.length === 2 && ranks.length <= 1 && wildCount <= 1) return make("pair", rankPower(ranks[0] ?? level, level));
  if (cards.length === 3 && ranks.length <= 1) return make("triple", rankPower(ranks[0] ?? level, level));
  if (cards.length === 5) {
    const straight = straightRank(cards, level);
    if (straight) return make("straight", straight);
    for (const tripleRank of [...sequenceRanks].reverse()) {
      if (tripleRank === level) continue;
      const tripleNatural = map.get(tripleRank)?.length || 0;
      const needTriple = Math.max(0, 3 - tripleNatural);
      const remainingWild = wildCount - needTriple;
      const others = cards.filter(card => !isWild(card, level) && card.rank !== tripleRank);
      if (needTriple <= wildCount && others.length + remainingWild === 2 && (others.length === 0 || new Set(others.map(card => card.rank)).size === 1)) return make("full-house", rankPower(tripleRank, level));
    }
  }
  if (cards.length === 6) {
    const pairs = canGroups(cards, 2, 3, true, level);
    if (pairs) return make("triple-pairs", pairs.rank);
    const plate = canGroups(cards, 3, 2, true, level);
    if (plate) return make("steel-plate", plate.rank);
  }
  return null;
}

export function isBomb(combo: Combo) { return combo.bombTier > 0; }

export function beats(next: Combo, current: Combo | null) {
  if (!current) return true;
  if (isBomb(next) || isBomb(current)) {
    if (!isBomb(next)) return false;
    if (!isBomb(current)) return true;
    return next.bombTier > current.bombTier || next.bombTier === current.bombTier && (next.size > current.size || next.size === current.size && next.rank > current.rank);
  }
  return next.type === current.type && next.size === current.size && next.rank > current.rank;
}

function chooseCards(group: Card[], count: number) { return group.slice(0, count); }
function key(cards: Card[]) { return [...cards].map(card => card.id).sort().join("|"); }

export function generateCombos(hand: Card[], level: number): Combo[] {
  const results = new Map<string, Combo>();
  const add = (cards: Card[]) => { const combo = evaluateCombo(cards, level); if (combo) results.set(key(cards), combo); };
  const wilds = hand.filter(card => isWild(card, level));
  const map = counts(hand, level);
  hand.forEach(card => add([card]));
  for (const group of map.values()) {
    for (const size of [2, 3, 4, 5, 6, 7, 8]) if (group.length + wilds.length >= size) add([...chooseCards(group, Math.min(group.length, size)), ...chooseCards(wilds, Math.max(0, size - group.length))]);
  }
  for (const [tripleRank, tripleGroup] of map) for (const [pairRank, pairGroup] of map) if (tripleRank !== pairRank) {
    const needTriple = Math.max(0, 3 - tripleGroup.length); const remaining = wilds.slice(needTriple); const needPair = Math.max(0, 2 - pairGroup.length);
    if (needTriple + needPair <= wilds.length) add([...chooseCards(tripleGroup, 3), ...chooseCards(wilds, needTriple), ...chooseCards(pairGroup, 2), ...chooseCards(remaining, needPair)]);
  }
  for (let start = 2; start <= 10; start += 1) {
    const ranks = Array.from({ length: 5 }, (_, i) => start + i);
    const natural = ranks.flatMap(rank => chooseCards(map.get(rank) || [], 1));
    if (natural.length + wilds.length >= 5) add([...natural, ...chooseCards(wilds, 5 - natural.length)]);
    for (const suit of suits) {
      const suited = ranks.flatMap(rank => chooseCards(hand.filter(card => card.suit === suit && card.rank === rank && !isWild(card, level)), 1));
      if (suited.length + wilds.length >= 5) add([...suited, ...chooseCards(wilds, 5 - suited.length)]);
    }
  }
  for (let start = 2; start <= 12; start += 1) for (const groupSize of [2, 3]) {
    const groupCount = groupSize === 2 ? 3 : 2;
    const ranks = Array.from({ length: groupCount }, (_, i) => start + i);
    const natural = ranks.flatMap(rank => chooseCards(map.get(rank) || [], groupSize));
    const total = groupSize * groupCount;
    if (natural.length + wilds.length >= total) add([...natural, ...chooseCards(wilds, total - natural.length)]);
  }
  const jokers = hand.filter(card => card.suit === "joker"); if (jokers.length === 4) add(jokers);
  return [...results.values()];
}

export function comboPreservationCost(combo: Combo, hand: Card[], level: number) {
  if (combo.bombTier > 0) return 0;
  const naturalCounts = counts(hand, level);
  const hasJokerBomb = hand.filter(card => card.suit === "joker").length === 4;
  return combo.cards.reduce((cost, card) => {
    if (isWild(card, level)) return cost + 25;
    if (card.suit === "joker" && hasJokerBomb) return cost + 180;
    const rankCount = naturalCounts.get(card.rank)?.length || 0;
    if (rankCount >= 4) return cost + 120 + rankCount * 10;
    if (combo.type === "single" && rankCount >= 2) return cost + (rankCount - 1) * 4;
    if (combo.type === "pair" && rankCount >= 3) return cost + 8;
    return cost;
  }, 0);
}

export function legalCombos(hand: Card[], level: number, current: Combo | null) {
  return generateCombos(hand, level).filter(combo => beats(combo, current)).sort((a, b) =>
    comboPreservationCost(a, hand, level) - comboPreservationCost(b, hand, level) ||
    a.bombTier - b.bombTier ||
    a.size - b.size ||
    a.rank - b.rank
  );
}

export function comboLabel(combo: Combo | null) {
  if (!combo) return "自由出牌";
  return ({ single: "单张", pair: "对子", triple: "三张", "full-house": "三带二", straight: "顺子", "triple-pairs": "三连对", "steel-plate": "钢板", bomb: `${combo.size}张炸弹`, "straight-flush": "同花顺", "joker-bomb": "四王炸" } as Record<ComboType, string>)[combo.type];
}

export function upgradeForOrder(order: string[], teamFor: (id: string) => 0 | 1) {
  const winner = teamFor(order[0]);
  const partnerIndex = order.findIndex((id, index) => index > 0 && teamFor(id) === winner);
  return { winner, levels: partnerIndex === 1 ? 3 : partnerIndex === 2 ? 2 : 1 };
}
