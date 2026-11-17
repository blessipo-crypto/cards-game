import { CardData, Rank, SeatId, Suit } from '../types/game';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const BELOTE_RANKS: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SEATS: SeatId[] = ['S', 'W', 'N', 'E'];

let beloteUid = 0;

export function createBeloteDeck(): CardData[] {
  const deck: CardData[] = [];
  for (const suit of SUITS) {
    for (const rank of BELOTE_RANKS) {
      beloteUid += 1;
      deck.push({
        id: `bel_${suit}_${rank}_${beloteUid}`,
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
  return deck;
}

export function dealEightCardBeloteHands(): Record<SeatId, CardData[]> {
  const deck = createBeloteDeck();
  const sortHand = (cards: CardData[]) =>
    [...cards].sort((a, b) => {
      const s = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
      return s !== 0 ? s : BELOTE_RANKS.indexOf(b.rank) - BELOTE_RANKS.indexOf(a.rank);
    });

  return {
    S: sortHand(deck.slice(0, 8).map((c) => ({ ...c, faceUp: true }))),
    W: deck.slice(8, 16).map((c) => ({ ...c, faceUp: false })),
    N: deck.slice(16, 24).map((c) => ({ ...c, faceUp: false })),
    E: deck.slice(24, 32).map((c) => ({ ...c, faceUp: false })),
  };
}

export function getBelotePoints(rank: Rank, isTrump: boolean): number {
  if (isTrump) {
    switch (rank) {
      case 'J': return 20;
      case '9': return 14;
      case 'A': return 11;
      case '10': return 10;
      case 'K': return 4;
      case 'Q': return 3;
      default: return 0;
    }
  }
  switch (rank) {
    case 'A': return 11;
    case '10': return 10;
    case 'K': return 4;
    case 'Q': return 3;
    case 'J': return 2;
    default: return 0;
  }
}

export function getBeloteOrder(rank: Rank, isTrump: boolean): number {
  if (isTrump) {
    const order: Rank[] = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J'];
    return order.indexOf(rank);
  }
  const order: Rank[] = ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'];
  return order.indexOf(rank);
}

export function isPartner(a: SeatId, b: SeatId): boolean {
  return (
    ((a === 'N' || a === 'S') && (b === 'N' || b === 'S')) ||
    ((a === 'E' || a === 'W') && (b === 'E' || b === 'W'))
  );
}

export function getTrickWinnerBelote(
  trick: { seat: SeatId; card: CardData }[],
  trump: Suit
): SeatId {
  const leadSuit = trick[0].card.suit;
  let best = trick[0];
  for (let i = 1; i < trick.length; i++) {
    const cur = trick[i];
    const curTrump = cur.card.suit === trump;
    const bestTrump = best.card.suit === trump;
    if (curTrump && !bestTrump) {
      best = cur;
    } else if (curTrump && bestTrump) {
      if (getBeloteOrder(cur.card.rank, true) > getBeloteOrder(best.card.rank, true)) {
        best = cur;
      }
    } else if (!bestTrump && cur.card.suit === leadSuit) {
      if (getBeloteOrder(cur.card.rank, false) > getBeloteOrder(best.card.rank, false)) {
        best = cur;
      }
    }
  }
  return best.seat;
}

export function getLegalBeloteCards(
  hand: CardData[],
  trick: { seat: SeatId; card: CardData }[],
  trump: Suit,
  mySeat: SeatId
): CardData[] {
  if (trick.length === 0) return hand;
  const leadSuit = trick[0].card.suit;
  const following = hand.filter((c) => c.suit === leadSuit);

  if (following.length > 0) {
    if (leadSuit === trump) {
      const highTrumpOrder = Math.max(
        ...trick
          .filter((t) => t.card.suit === trump)
          .map((t) => getBeloteOrder(t.card.rank, true))
      );
      const higher = following.filter(
        (c) => getBeloteOrder(c.rank, true) > highTrumpOrder
      );
      return higher.length > 0 ? higher : following;
    }
    return following;
  }

  const currentWinSeat = getTrickWinnerBelote(trick, trump);
  if (isPartner(mySeat, currentWinSeat)) {
    return hand;
  }

  const trumps = hand.filter((c) => c.suit === trump);
  if (trumps.length > 0) {
    const trickTrumps = trick.filter((t) => t.card.suit === trump);
    if (trickTrumps.length > 0) {
      const maxOrder = Math.max(
        ...trickTrumps.map((t) => getBeloteOrder(t.card.rank, true))
      );
      const over = trumps.filter((c) => getBeloteOrder(c.rank, true) > maxOrder);
      return over.length > 0 ? over : trumps;
    }
    return trumps;
  }

  return hand;
}

export function chooseBestBeloteCard(
  hand: CardData[],
  trick: { seat: SeatId; card: CardData }[],
  trump: Suit,
  seat: SeatId
): CardData {
  const legal = getLegalBeloteCards(hand, trick, trump, seat);
  if (legal.length === 1) return legal[0];
  if (trick.length === 0) {
    const sorted = [...legal].sort(
      (a, b) =>
        getBelotePoints(b.rank, b.suit === trump) -
        getBelotePoints(a.rank, a.suit === trump)
    );
    return sorted[0];
  }
  const currentWin = getTrickWinnerBelote(trick, trump);
  if (isPartner(seat, currentWin)) {
    const sorted = [...legal].sort(
      (a, b) =>
        getBeloteOrder(a.rank, a.suit === trump) -
        getBeloteOrder(b.rank, b.suit === trump)
    );
    return sorted[0];
  }
  const sorted = [...legal].sort(
    (a, b) =>
      getBeloteOrder(b.rank, b.suit === trump) -
      getBeloteOrder(a.rank, a.suit === trump)
  );
  return sorted[0];
}
