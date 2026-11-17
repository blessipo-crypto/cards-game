import { CardData, Rank, Suit } from '../types/game';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SHOE_DECKS = 6;
export const TOTAL_SHOE_CARDS = SHOE_DECKS * 52;
export const RESHUFFLE_THRESHOLD = 65;

let uidCounter = 0;

export function createSixDeckShoe(): CardData[] {
  const shoe: CardData[] = [];
  for (let d = 0; d < SHOE_DECKS; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        uidCounter += 1;
        shoe.push({
          id: `c_${d}_${suit}_${rank}_${uidCounter}`,
          suit,
          rank,
          faceUp: true,
        });
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

export function getBlackjackRankValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'K' || rank === 'Q' || rank === 'J' || rank === '10') return 10;
  return parseInt(rank, 10);
}

export interface HandEval {
  total: number;
  isSoft: boolean;
  isBust: boolean;
  isNaturalBlackjack: boolean;
}

export function evaluateBlackjackHand(
  cards: CardData[],
  options?: { onlyFaceUp?: boolean; isFromSplit?: boolean }
): HandEval {
  const visible = options?.onlyFaceUp ? cards.filter((c) => c.faceUp) : cards;
  let total = 0;
  let aces = 0;

  for (const c of visible) {
    if (c.rank === 'A') aces += 1;
    total += getBlackjackRankValue(c.rank);
  }

  let softAces = aces;
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces -= 1;
  }

  return {
    total,
    isSoft: softAces > 0 && total <= 21,
    isBust: total > 21,
    isNaturalBlackjack:
      !options?.isFromSplit && visible.length === 2 && total === 21,
  };
}

export function canSplitCards(cards: CardData[]): boolean {
  if (cards.length !== 2) return false;
  return getBlackjackRankValue(cards[0].rank) === getBlackjackRankValue(cards[1].rank);
}

export function formatChips(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = `$${abs.toLocaleString('en-US')}`;
  return amount < 0 ? `-${formatted}` : formatted;
}
