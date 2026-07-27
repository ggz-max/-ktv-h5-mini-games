import { comboPreservationCost, evaluateCombo, isWild, rankPower, sortHand, type Card } from "./game.ts";

export interface TributePlayer { id: string; seat: number; team: 0 | 1 }
export interface TributePair { payerId: string; receiverId: string; tributeCard: Card; returnCard?: Card }
export interface TributePlan {
  kind: "single" | "double";
  anti: boolean;
  leaderId: string;
  payerIds: string[];
  winnerIds: string[];
  pairs: TributePair[];
}

function highestTributeCard(hand: Card[], level: number) {
  const eligible = hand.filter(card => !isWild(card, level));
  return sortHand(eligible, level).sort((a, b) => rankPower(b.rank, level) - rankPower(a.rank, level))[0];
}

function clockwiseDistance(fromSeat: number, toSeat: number) {
  return (toSeat - fromSeat + 4) % 4;
}

export function buildTributePlan(players: TributePlayer[], hands: Map<string, Card[]>, level: number, finishOrder: string[]): TributePlan {
  if (finishOrder.length !== 4) throw new Error("tribute requires a complete finish order");
  const byId = (playerId: string) => players.find(player => player.id === playerId)!;
  const winnerIds = finishOrder.slice(0, 2);
  const doubleDown = byId(finishOrder[0]).team === byId(finishOrder[1]).team;
  const payerIds = doubleDown ? finishOrder.slice(2) : [finishOrder[3]];
  const bigJokers = payerIds.reduce((total, payerId) => total + (hands.get(payerId) || []).filter(card => card.suit === "joker" && card.rank === 17).length, 0);
  const anti = bigJokers === 2;

  if (anti) return { kind: doubleDown ? "double" : "single", anti: true, leaderId: finishOrder[0], payerIds, winnerIds, pairs: [] };

  const headWinner = byId(finishOrder[0]);
  const offerings = payerIds.map(payerId => ({ payerId, card: highestTributeCard(hands.get(payerId) || [], level) })).sort((a, b) =>
    rankPower(b.card.rank, level) - rankPower(a.card.rank, level) ||
    clockwiseDistance(headWinner.seat, byId(a.payerId).seat) - clockwiseDistance(headWinner.seat, byId(b.payerId).seat)
  );
  const receivers = doubleDown ? winnerIds : [finishOrder[0]];
  const pairs = offerings.map((offering, index) => ({ payerId: offering.payerId, receiverId: receivers[index], tributeCard: offering.card }));
  return { kind: doubleDown ? "double" : "single", anti: false, leaderId: pairs[0].payerId, payerIds, winnerIds, pairs };
}

export function legalReturnCards(hand: Card[], level: number) {
  const lowCards = hand.filter(card => card.suit !== "joker" && card.rank <= 10);
  return sortHand(lowCards.length ? lowCards : hand, level);
}

export function chooseBotReturnCard(hand: Card[], level: number) {
  return [...legalReturnCards(hand, level)].sort((a, b) => {
    const comboA = evaluateCombo([a], level)!;
    const comboB = evaluateCombo([b], level)!;
    return comboPreservationCost(comboA, hand, level) - comboPreservationCost(comboB, hand, level) ||
      rankPower(a.rank, level) - rankPower(b.rank, level);
  })[0];
}
