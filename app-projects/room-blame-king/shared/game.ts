export type PlayerMode = "practice" | "warmup" | "ai" | "small" | "standard" | "large";

export const MAX_ACTIVE_PLAYERS = 8;

export interface ModeConfig {
  mode: PlayerMode;
  label: string;
  rounds: number;
  systemCardsPerRound: number;
  minPlayers: number;
}

export interface CardPlay {
  playerId: string;
  playerName: string;
  card: number;
  isSystem?: boolean;
  delayed?: boolean;
}

export interface PenaltyEvent {
  playerId: string;
  playerName: string;
  sourcePlayerId?: string;
  sourcePlayerName?: string;
  points: number;
  reason: "sixth-card" | "below-all-tails";
  collected: number[];
  card: number;
  rowIndex: number;
}

export interface PlacementEvent {
  play: CardPlay;
  rowIndex: number;
  rowsAfter: number[][];
  penalty?: PenaltyEvent;
}

export interface RoundResolution {
  rows: number[][];
  placements: PlacementEvent[];
  penalties: PenaltyEvent[];
}

export function modeForPlayerCount(count: number): ModeConfig {
  if (count <= 2) return { mode: "ai", label: "人机体验局", rounds: 6, systemCardsPerRound: 0, minPlayers: 1 };
  if (count <= 4) return { mode: "small", label: "小包局", rounds: 6, systemCardsPerRound: 0, minPlayers: 3 };
  if (count <= 8) return { mode: "standard", label: "标准局", rounds: 5, systemCardsPerRound: 0, minPlayers: 5 };
  return { mode: "standard", label: "标准局", rounds: 5, systemCardsPerRound: 0, minPlayers: 5 };
}

export function createDeck(random: () => number = Math.random): number[] {
  const deck = Array.from({ length: 104 }, (_, index) => index + 1);
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

export function cardPotValue(card: number): number {
  if (card >= 11 && card <= 99 && card % 11 === 0) return 4;
  if (card % 10 === 0) return 3;
  if (card % 5 === 0) return 2;
  return 1;
}

export function rowPotValue(row: number[]): number {
  return row.reduce((total, card) => total + cardPotValue(card), 0);
}

export function dealGame(playerIds: string[], random: () => number = Math.random) {
  if (playerIds.length < 1 || playerIds.length > MAX_ACTIVE_PLAYERS) throw new Error(`active player count must be 1-${MAX_ACTIVE_PLAYERS}`);
  const config = modeForPlayerCount(playerIds.length);
  const deck = createDeck(random);
  const rows = deck.splice(0, 4).map(card => [card]);
  const hands = new Map<string, number[]>();
  for (const playerId of playerIds) {
    hands.set(playerId, deck.splice(0, config.rounds).sort((a, b) => a - b));
  }
  const systemHands = Array.from({ length: config.systemCardsPerRound }, () => deck.splice(0, config.rounds));
  return { config, rows, hands, systemHands, remainingDeck: deck };
}

function cloneRows(rows: number[][]): number[][] {
  return rows.map(row => [...row]);
}

function rowForCard(rows: number[][], card: number): number {
  const candidates = rows
    .map((row, index) => ({ index, tail: row[row.length - 1] }))
    .filter(item => item.tail < card)
    .sort((a, b) => b.tail - a.tail);
  if (candidates.length > 0) return candidates[0].index;

  return rows
    .map((row, index) => ({ index, length: row.length, tail: row[row.length - 1] }))
    .sort((a, b) => a.length - b.length || a.tail - b.tail)[0].index;
}

export function forecastCard(rows: number[][], card: number) {
  const belowAllTails = rows.every(row => row[row.length - 1] > card);
  const rowIndex = rowForCard(rows, card);
  const row = rows[rowIndex];
  return {
    rowIndex,
    belowAllTails,
    willTakeRow: belowAllTails || row.length === 5,
    penaltyPoints: belowAllTails || row.length === 5 ? rowPotValue(row) : 0,
    currentRowPots: rowPotValue(row),
    currentRowLength: row.length
  };
}

export function resolveRound(inputRows: number[][], inputPlays: CardPlay[]): RoundResolution {
  if (inputRows.length !== 4 || inputRows.some(row => row.length < 1 || row.length > 5)) {
    throw new Error("rows must contain four non-empty rows with at most five cards");
  }
  const cards = inputPlays.map(play => play.card);
  if (new Set(cards).size !== cards.length) throw new Error("round contains duplicate cards");

  const rows = cloneRows(inputRows);
  const placements: PlacementEvent[] = [];
  const penalties: PenaltyEvent[] = [];

  for (const play of [...inputPlays].sort((a, b) => Number(Boolean(a.delayed)) - Number(Boolean(b.delayed)) || a.card - b.card)) {
    const allTailsAbove = rows.every(row => row[row.length - 1] > play.card);
    const rowIndex = rowForCard(rows, play.card);
    const target = rows[rowIndex];
    let penalty: PenaltyEvent | undefined;

    if (allTailsAbove || target.length === 5) {
      const transferTarget = play.delayed
        ? [...placements].reverse().find(item => !item.play.isSystem && item.play.playerId !== play.playerId)?.play
        : undefined;
      penalty = {
        playerId: transferTarget?.playerId || play.playerId,
        playerName: transferTarget?.playerName || play.playerName,
        sourcePlayerId: transferTarget ? play.playerId : undefined,
        sourcePlayerName: transferTarget ? play.playerName : undefined,
        points: rowPotValue(target),
        reason: allTailsAbove ? "below-all-tails" : "sixth-card",
        collected: [...target],
        card: play.card,
        rowIndex
      };
      rows[rowIndex] = [play.card];
      penalties.push(penalty);
    } else {
      target.push(play.card);
    }

    placements.push({ play, rowIndex, rowsAfter: cloneRows(rows), penalty });
  }

  return { rows, placements, penalties };
}

export function rankingFor(scores: Array<{ id: string; name: string; score: number }>) {
  return [...scores].sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, "zh-CN"));
}

export function rematchThreshold(activePlayers: number): number {
  if (activePlayers <= 2) return activePlayers;
  if (activePlayers <= 4) return 3;
  return 5;
}
