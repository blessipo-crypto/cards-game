import { CardData, ChipValue, PokerStreet, Rank, Suit } from '../types/game';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let pokerUid = 0;

export function createShuffledPokerDeck(faceUp = true): CardData[] {
  const deck: CardData[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      pokerUid += 1;
      deck.push({
        id: `pk_${suit}_${rank}_${pokerUid}`,
        suit,
        rank,
        faceUp,
      });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function rankToNumber(rank: Rank): number {
  switch (rank) {
    case 'A':
      return 14;
    case 'K':
      return 13;
    case 'Q':
      return 12;
    case 'J':
      return 11;
    default:
      return parseInt(rank, 10);
  }
}

export interface PokerHandRank {
  category: number; // 0 High Card .. 8 Straight Flush
  label: string;
  score: number; // comparable numeric score
}

const HAND_LABELS = [
  'Carte Haute',
  'Une Paire',
  'Double Paire',
  'Brelan',
  'Quinte',
  'Couleur',
  'Full',
  'Carré',
  'Quinte Flush',
];

function evaluateFiveCards(cards: CardData[]): PokerHandRank {
  const vals = cards.map((c) => rankToNumber(c.rank)).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  const counts = new Map<number, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);

  const uniqueDesc = Array.from(counts.keys()).sort((a, b) => {
    const diff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
    return diff !== 0 ? diff : b - a;
  });

  // Check Straight (including Wheel A-2-3-4-5)
  const uniqSorted = Array.from(new Set(vals)).sort((a, b) => b - a);
  let straightHigh = 0;
  if (uniqSorted.length === 5) {
    if (uniqSorted[0] - uniqSorted[4] === 4) {
      straightHigh = uniqSorted[0];
    } else if (
      uniqSorted[0] === 14 &&
      uniqSorted[1] === 5 &&
      uniqSorted[2] === 4 &&
      uniqSorted[3] === 3 &&
      uniqSorted[4] === 2
    ) {
      straightHigh = 5;
    }
  }

  const freqPattern = uniqueDesc.map((v) => counts.get(v) ?? 0);
  let category = 0;
  let tiebreakers = uniqueDesc;

  if (isFlush && straightHigh > 0) {
    category = 8;
    tiebreakers = [straightHigh];
  } else if (freqPattern[0] === 4) {
    category = 7;
  } else if (freqPattern[0] === 3 && freqPattern[1] === 2) {
    category = 6;
  } else if (isFlush) {
    category = 5;
    tiebreakers = vals;
  } else if (straightHigh > 0) {
    category = 4;
    tiebreakers = [straightHigh];
  } else if (freqPattern[0] === 3) {
    category = 3;
  } else if (freqPattern[0] === 2 && freqPattern[1] === 2) {
    category = 2;
  } else if (freqPattern[0] === 2) {
    category = 1;
  } else {
    category = 0;
    tiebreakers = vals;
  }

  let score = category * 15 ** 5;
  for (let i = 0; i < 5; i++) {
    score += (tiebreakers[i] ?? 0) * 15 ** (4 - i);
  }

  return {
    category,
    label:
      category === 8 && straightHigh === 14 ? 'Quinte Flush Royale' : HAND_LABELS[category],
    score,
  };
}

export function evaluateBestHoldemHand(
  hole: CardData[],
  community: CardData[]
): PokerHandRank {
  const all = [...hole, ...community];
  if (all.length < 5) {
    const vals = all.map((c) => rankToNumber(c.rank)).sort((a, b) => b - a);
    const hasPair = vals.length >= 2 && vals[0] === vals[1];
    return {
      category: hasPair ? 1 : 0,
      label: hasPair ? 'Paire Servie' : 'Carte Haute',
      score: (hasPair ? 1 : 0) * 1000 + (vals[0] ?? 0) * 20 + (vals[1] ?? 0),
    };
  }

  let best: PokerHandRank | null = null;
  const n = all.length;
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            const rank = evaluateFiveCards([all[a], all[b], all[c], all[d], all[e]]);
            if (!best || rank.score > best.score) best = rank;
          }
        }
      }
    }
  }
  return best ?? evaluateFiveCards(all.slice(0, 5));
}

export function decidePokerAiAction(
  hole: CardData[],
  community: CardData[],
  street: PokerStreet,
  toCall: number,
  stack: number,
  aggressionBias: number
): { action: 'fold' | 'check' | 'call' | 'raise'; amount: number } {
  const ev = evaluateBestHoldemHand(hole, community);
  const v0 = rankToNumber(hole[0]?.rank ?? '2');
  const v1 = rankToNumber(hole[1]?.rank ?? '2');
  const suited = hole[0]?.suit === hole[1]?.suit;
  const preflopStrength =
    (v0 === v1 ? 0.45 : 0) +
    (Math.max(v0, v1) / 14) * 0.35 +
    (suited ? 0.1 : 0) +
    (Math.abs(v0 - v1) <= 2 ? 0.08 : 0);

  const strength =
    street === 'PREFLOP'
      ? Math.min(1, preflopStrength)
      : Math.min(1, ev.category / 4 + 0.18);

  const roll = Math.random();
  if (toCall > 0) {
    if (strength < 0.28 && toCall > 80 && roll > aggressionBias * 0.5) {
      return { action: 'fold', amount: 0 };
    }
    if (strength > 0.65 && stack > toCall + 100 && roll < 0.42 + aggressionBias * 0.25) {
      return { action: 'raise', amount: Math.min(stack, toCall + 100) };
    }
    return { action: 'call', amount: Math.min(stack, toCall) };
  }

  if ((strength > 0.52 || roll < aggressionBias * 0.3) && stack >= 50) {
    return { action: 'raise', amount: Math.min(stack, strength > 0.72 ? 100 : 50) };
  }
  return { action: 'check', amount: 0 };
}

export function amountToChips(amount: number): ChipValue[] {
  const denoms: ChipValue[] = [5000, 1000, 500, 100, 50];
  const result: ChipValue[] = [];
  let rem = Math.max(0, Math.round(amount));
  for (const d of denoms) {
    while (rem >= d && result.length < 18) {
      result.push(d);
      rem -= d;
    }
  }
  if (result.length === 0 && amount > 0) result.push(50);
  return result;
}
