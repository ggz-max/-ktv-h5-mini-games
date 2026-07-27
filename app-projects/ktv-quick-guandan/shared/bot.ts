import { beats, comboPreservationCost, evaluateCombo, type Card, type Combo } from "./game.ts";

export type BotReason = "finish" | "yield-to-teammate" | "feed-teammate" | "block-opponent" | "normal" | "no-play";
export type BotDecision = { action: "pass"; reason: BotReason } | { action: "play"; combo: Combo; reason: BotReason };

interface BotContext {
  hand: Card[];
  level: number;
  currentCombo: Combo | null;
  options: Combo[];
  teammateLeading: boolean;
  teammateHand: Card[];
  opponentCardCounts: number[];
}

function strategicOptions(options: Combo[], hand: Card[], level: number) {
  return [...options].sort((a, b) =>
    comboPreservationCost(a, hand, level) - comboPreservationCost(b, hand, level) ||
    a.bombTier - b.bombTier ||
    b.size - a.size ||
    a.rank - b.rank
  );
}

function largestCombination(options: Combo[], hand: Card[], level: number) {
  return strategicOptions(options, hand, level)[0];
}

export function chooseBotDecision(context: BotContext): BotDecision {
  const { hand, level, currentCombo, options, teammateLeading, teammateHand, opponentCardCounts } = context;
  const finish = options.find(option => option.cards.length === hand.length);
  if (finish) return { action: "play", combo: finish, reason: "finish" };
  if (teammateLeading) return { action: "pass", reason: "yield-to-teammate" };
  if (!options.length) return { action: "pass", reason: "no-play" };

  const nonBombs = options.filter(option => option.bombTier === 0);
  const safeNonBombs = nonBombs.filter(option => comboPreservationCost(option, hand, level) < 100);
  const opponentAtOne = opponentCardCounts.some(count => count === 1);
  const opponentDanger = opponentCardCounts.some(count => count <= 3);

  if (!currentCombo) {
    if (teammateHand.length === 1) {
      const singles = safeNonBombs.filter(option => option.type === "single");
      if (singles.length) {
        const teammateCard = evaluateCombo(teammateHand, level);
        const feedable = teammateCard ? singles.filter(option => beats(teammateCard, option)) : [];
        const chosen = feedable.length
          ? [...feedable].sort((a, b) => b.rank - a.rank)[0]
          : [...singles].sort((a, b) => a.rank - b.rank)[0];
        return { action: "play", combo: chosen, reason: "feed-teammate" };
      }
    }

    if (opponentAtOne) {
      const protectedOptions = safeNonBombs.filter(option => option.type !== "single");
      if (protectedOptions.length) return { action: "play", combo: largestCombination(protectedOptions, hand, level), reason: "block-opponent" };
    }

    return { action: "play", combo: largestCombination(safeNonBombs.length ? safeNonBombs : options, hand, level), reason: opponentDanger ? "block-opponent" : "normal" };
  }

  if (opponentAtOne) {
    const nonBomb = strategicOptions(safeNonBombs, hand, level).sort((a, b) =>
      comboPreservationCost(a, hand, level) - comboPreservationCost(b, hand, level) || b.rank - a.rank
    )[0];
    return { action: "play", combo: nonBomb || options[0], reason: "block-opponent" };
  }

  return { action: "play", combo: options[0], reason: opponentDanger ? "block-opponent" : "normal" };
}
