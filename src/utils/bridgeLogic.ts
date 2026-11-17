import {
  BridgeBidCall,
  BridgeStrain,
  CardData,
  Rank,
  SeatId,
  Suit,
} from '../types/game';
import { isPartner } from './beloteLogic';
import { rankToNumber } from './pokerLogic';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const STRAIN_ORDER: BridgeStrain[] = ['clubs', 'diamonds', 'hearts', 'spades', 'NT'];

let bridgeUid = 0;

export function createBridgeHands(): Record<SeatId, CardData[]> {
  const deck: CardData[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      bridgeUid += 1;
      deck.push({
        id: `br_${suit}_${rank}_${bridgeUid}`,
        suit,
        rank,
        faceUp: true,
      });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const sortHand = (cards: CardData[]) =>
    cards.sort((a, b) => {
      const sDiff = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
      return sDiff !== 0 ? sDiff : rankToNumber(b.rank) - rankToNumber(a.rank);
    });

  return {
    S: sortHand(deck.slice(0, 13).map((c) => ({ ...c, faceUp: true }))),
    W: sortHand(deck.slice(13, 26).map((c) => ({ ...c, faceUp: false }))),
    N: sortHand(deck.slice(26, 39).map((c) => ({ ...c, faceUp: false }))),
    E: sortHand(deck.slice(39, 52).map((c) => ({ ...c, faceUp: false }))),
  };
}

export function getCardHCP(card: CardData): number {
  if (card.rank === 'A') return 4;
  if (card.rank === 'K') return 3;
  if (card.rank === 'Q') return 2;
  if (card.rank === 'J') return 1;
  return 0;
}

export function calculateHCP(hand: CardData[]): number {
  return hand.reduce((sum, c) => sum + getCardHCP(c), 0);
}

export function bidRankIndex(level: number, strain: BridgeStrain): number {
  return (level - 1) * 5 + STRAIN_ORDER.indexOf(strain);
}

export function getHighestContractBid(calls: BridgeBidCall[]): BridgeBidCall | null {
  for (let i = calls.length - 1; i >= 0; i--) {
    if (calls[i].type === 'BID') return calls[i];
  }
  return null;
}

export function isBidHigher(
  level: number,
  strain: BridgeStrain,
  currentHigh: BridgeBidCall | null
): boolean {
  if (!currentHigh || currentHigh.level === undefined || !currentHigh.strain) return true;
  return bidRankIndex(level, strain) > bidRankIndex(currentHigh.level, currentHigh.strain);
}

export function canDoubleCall(calls: BridgeBidCall[], mySeat: SeatId): boolean {
  const lastNonPass = [...calls].reverse().find((c) => c.type !== 'PASS');
  if (!lastNonPass || lastNonPass.type !== 'BID') return false;
  return !isPartner(mySeat, lastNonPass.seat);
}

export function canRedoubleCall(calls: BridgeBidCall[], mySeat: SeatId): boolean {
  const lastNonPass = [...calls].reverse().find((c) => c.type !== 'PASS');
  if (!lastNonPass || lastNonPass.type !== 'DOUBLE') return false;
  return !isPartner(mySeat, lastNonPass.seat);
}

export function chooseAiBridgeBid(
  hand: CardData[],
  calls: BridgeBidCall[],
  seat: SeatId
): BridgeBidCall {
  const hcp = calculateHCP(hand);
  const highest = getHighestContractBid(calls);

  // Determine AI's natural opening/response level
  if (!highest && hcp >= 12) {
    // Pick longest 5+ major/minor suit or 1NT (15-17)
    if (hcp >= 15 && hcp <= 17) {
      return { seat, type: 'BID', level: 1, strain: 'NT' };
    }
    let bestSuit: Suit = 'clubs';
    let maxLen = 0;
    for (const s of ['spades', 'hearts', 'diamonds', 'clubs'] as Suit[]) {
      const len = hand.filter((c) => c.suit === s).length;
      if (len > maxLen) {
        maxLen = len;
        bestSuit = s;
      }
    }
    return { seat, type: 'BID', level: 1, strain: bestSuit };
  }

  // Partner raise if high enough and not yet bid too high
  if (highest && isPartner(seat, highest.seat) && highest.level && highest.level < 3 && hcp >= 9) {
    const nextLvl = highest.level + 1;
    if (highest.strain && isBidHigher(nextLvl, highest.strain, highest)) {
      return { seat, type: 'BID', level: nextLvl, strain: highest.strain };
    }
  }

  return { seat, type: 'PASS' };
}

export interface BridgeContract {
  level: number;
  strain: BridgeStrain;
  declarer: SeatId;
  dummy: SeatId;
  targetTricks: number;
  doubled: boolean;
  redoubled: boolean;
}

export function resolveBridgeContract(calls: BridgeBidCall[]): BridgeContract | null {
  const high = getHighestContractBid(calls);
  if (!high || high.level === undefined || !high.strain) return null;

  const declarerTeam = high.seat === 'N' || high.seat === 'S' ? ['N', 'S'] : ['E', 'W'];
  // First player on declaring side to mention the final strain becomes Declarer
  const firstMention = calls.find(
    (c) => c.type === 'BID' && c.strain === high.strain && declarerTeam.includes(c.seat)
  );
  const declarer = firstMention?.seat ?? high.seat;
  const dummyMap: Record<SeatId, SeatId> = { N: 'S', S: 'N', E: 'W', W: 'E' };

  const idxHigh = calls.lastIndexOf(high);
  const afterHigh = calls.slice(idxHigh + 1);
  const doubled = afterHigh.some((c) => c.type === 'DOUBLE');
  const redoubled = afterHigh.some((c) => c.type === 'REDOUBLE');

  return {
    level: high.level,
    strain: high.strain,
    declarer,
    dummy: dummyMap[declarer],
    targetTricks: 6 + high.level,
    doubled,
    redoubled,
  };
}

export function getLegalBridgeCards(
  hand: CardData[],
  trick: { seat: SeatId; card: CardData }[]
): CardData[] {
  if (trick.length === 0) return hand;
  const leadSuit = trick[0].card.suit;
  const following = hand.filter((c) => c.suit === leadSuit);
  return following.length > 0 ? following : hand;
}

export function getTrickWinnerBridge(
  trick: { seat: SeatId; card: CardData }[],
  strain: BridgeStrain
): SeatId {
  const leadSuit = trick[0].card.suit;
  let best = trick[0];
  for (let i = 1; i < trick.length; i++) {
    const cur = trick[i];
    const curIsTrump = strain !== 'NT' && cur.card.suit === strain;
    const bestIsTrump = strain !== 'NT' && best.card.suit === strain;
    if (curIsTrump && !bestIsTrump) {
      best = cur;
    } else if (curIsTrump && bestIsTrump) {
      if (rankToNumber(cur.card.rank) > rankToNumber(best.card.rank)) {
        best = cur;
      }
    } else if (!bestIsTrump && cur.card.suit === leadSuit) {
      if (rankToNumber(cur.card.rank) > rankToNumber(best.card.rank)) {
        best = cur;
      }
    }
  }
  return best.seat;
}

export function chooseBestBridgeCard(
  hand: CardData[],
  trick: { seat: SeatId; card: CardData }[],
  strain: BridgeStrain,
  seat: SeatId
): CardData {
  const legal = getLegalBridgeCards(hand, trick);
  if (legal.length === 1) return legal[0];
  if (trick.length === 0) {
    return [...legal].sort((a, b) => rankToNumber(b.rank) - rankToNumber(a.rank))[0];
  }
  const winSeat = getTrickWinnerBridge(trick, strain);
  if (isPartner(seat, winSeat)) {
    return [...legal].sort((a, b) => rankToNumber(a.rank) - rankToNumber(b.rank))[0];
  }
  return [...legal].sort((a, b) => rankToNumber(b.rank) - rankToNumber(a.rank))[0];
}
