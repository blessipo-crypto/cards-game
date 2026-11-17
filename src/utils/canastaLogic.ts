import {
  CanastaMeld,
  CanastaMeldKind,
  CanastaVariantId,
  CardData,
  Rank,
  SeatId,
  Suit,
} from '../types/game';

export interface CanastaVariantSpec {
  id: CanastaVariantId;
  name: string;
  shortName: string;
  decks: number;
  handSize: number;
  hasFoot: boolean;
  footSize: number;
  drawCount: 1 | 2;
  allowSequences: boolean;
  allowWildMelds: boolean;
  minCanastasToGoOut: number;
  requirePureCanasta: boolean;
  black3HandPenalty: number;
  wildCanastaBonus: number;
  sambaBonus: number;
  targetMatchScore: number;
  summary: string;
}

export const CANASTA_VARIANTS: Record<CanastaVariantId, CanastaVariantSpec> = {
  classic: {
    id: 'classic',
    name: 'Canasta Classique',
    shortName: 'Classique',
    decks: 2,
    handSize: 11,
    hasFoot: false,
    footSize: 0,
    drawCount: 1,
    allowSequences: false,
    allowWildMelds: false,
    minCanastasToGoOut: 1,
    requirePureCanasta: false,
    black3HandPenalty: 5,
    wildCanastaBonus: 0,
    sambaBonus: 0,
    targetMatchScore: 5000,
    summary: '2 jeux + 4 Jokers · 11 cartes · 1 Canasta pour sortir (Pure +500 / Impure +300).',
  },
  modern: {
    id: 'modern',
    name: 'Canasta Moderne (US)',
    shortName: 'Moderne',
    decks: 2,
    handSize: 13,
    hasFoot: false,
    footSize: 0,
    drawCount: 1,
    allowSequences: false,
    allowWildMelds: true,
    minCanastasToGoOut: 2,
    requirePureCanasta: true,
    black3HandPenalty: 5,
    wildCanastaBonus: 2000,
    sambaBonus: 0,
    targetMatchScore: 8500,
    summary: '13 cartes · Canasta de Jokers/2 autorisée (+2000) · 2 Canastas dont 1 Pure requises.',
  },
  hand_and_foot: {
    id: 'hand_and_foot',
    name: 'Hand & Foot (Main & Pied)',
    shortName: 'Hand & Foot',
    decks: 4,
    handSize: 11,
    hasFoot: true,
    footSize: 11,
    drawCount: 2,
    allowSequences: false,
    allowWildMelds: false,
    minCanastasToGoOut: 2,
    requirePureCanasta: true,
    black3HandPenalty: 5,
    wildCanastaBonus: 0,
    sambaBonus: 0,
    targetMatchScore: 10000,
    summary: '4 jeux · Pioche 2 cartes · Main (11) puis Pied secret (11) · 1 Pure + 1 Impure.',
  },
  samba: {
    id: 'samba',
    name: 'Samba (3 Jeux · Séquences)',
    shortName: 'Samba',
    decks: 3,
    handSize: 15,
    hasFoot: false,
    footSize: 0,
    drawCount: 2,
    allowSequences: true,
    allowWildMelds: false,
    minCanastasToGoOut: 2,
    requirePureCanasta: false,
    black3HandPenalty: 5,
    wildCanastaBonus: 0,
    sambaBonus: 1500,
    targetMatchScore: 10000,
    summary: '3 jeux · Pioche 2 cartes · Suites de couleur (Samba 7 cartes = +1500 pts).',
  },
  bolivia: {
    id: 'bolivia',
    name: 'Bolivia (Escalera & Wilds)',
    shortName: 'Bolivia',
    decks: 3,
    handSize: 15,
    hasFoot: false,
    footSize: 0,
    drawCount: 1,
    allowSequences: true,
    allowWildMelds: true,
    minCanastasToGoOut: 2,
    requirePureCanasta: true,
    black3HandPenalty: 100,
    wildCanastaBonus: 2500,
    sambaBonus: 1500,
    targetMatchScore: 15000,
    summary: '3 jeux · Suites Escalera (+1500) + Canasta Wilds (+2500) · 3 noirs en main = -100.',
  },
};

export const CANASTA_VARIANT_LIST: CanastaVariantSpec[] = [
  CANASTA_VARIANTS.classic,
  CANASTA_VARIANTS.modern,
  CANASTA_VARIANTS.hand_and_foot,
  CANASTA_VARIANTS.samba,
  CANASTA_VARIANTS.bolivia,
];

export const SEATS: SeatId[] = ['N', 'E', 'S', 'W'];

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Exclude<Rank, 'JOKER'>[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

const SEQ_ORDER: Rank[] = ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const HAND_SORT_ORDER: Record<Rank, number> = {
  JOKER: 15,
  '2': 14,
  A: 13,
  K: 12,
  Q: 11,
  J: 10,
  '10': 9,
  '9': 8,
  '8': 7,
  '7': 6,
  '6': 5,
  '5': 4,
  '4': 3,
  '3': 2,
};

export function isRedThree(card: CardData): boolean {
  return card.rank === '3' && (card.suit === 'hearts' || card.suit === 'diamonds');
}

export function isBlackThree(card: CardData): boolean {
  return card.rank === '3' && (card.suit === 'spades' || card.suit === 'clubs');
}

export function isWildCard(card: CardData): boolean {
  return card.rank === 'JOKER' || card.rank === '2';
}

export function getCanastaCardPoints(card: CardData, variant: CanastaVariantId, inHand = false): number {
  if (card.rank === 'JOKER') return 50;
  if (card.rank === '2' || card.rank === 'A') return 20;
  if (isRedThree(card)) return 100;
  if (isBlackThree(card)) {
    return inHand ? CANASTA_VARIANTS[variant].black3HandPenalty : 5;
  }
  if (['K', 'Q', 'J', '10', '9', '8'].includes(card.rank)) return 10;
  return 5; // 4, 5, 6, 7
}

export function sortCanastaHand(cards: CardData[]): CardData[] {
  return [...cards].sort((a, b) => {
    const diff = HAND_SORT_ORDER[b.rank] - HAND_SORT_ORDER[a.rank];
    if (diff !== 0) return diff;
    return a.suit.localeCompare(b.suit);
  });
}

export function createCanastaShoe(variant: CanastaVariantId): CardData[] {
  const spec = CANASTA_VARIANTS[variant];
  const deck: CardData[] = [];
  for (let d = 0; d < spec.decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          id: `can_${d}_${suit}_${rank}`,
          suit,
          rank,
          faceUp: false,
        });
      }
    }
    // 2 Jokers per deck
    deck.push({ id: `can_${d}_joker_1`, suit: 'hearts', rank: 'JOKER', faceUp: false });
    deck.push({ id: `can_${d}_joker_2`, suit: 'spades', rank: 'JOKER', faceUp: false });
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function extractRedThreesFromCards(
  cards: CardData[],
  stock: CardData[],
  faceUpForPlayer: boolean
): { hand: CardData[]; redThrees: CardData[]; stock: CardData[] } {
  const nextStock = [...stock];
  const redThrees: CardData[] = [];
  const queue = [...cards];
  const kept: CardData[] = [];

  while (queue.length > 0) {
    const c = queue.shift()!;
    if (isRedThree(c)) {
      redThrees.push({ ...c, faceUp: true });
      if (nextStock.length > 0) {
        queue.push({ ...nextStock.pop()!, faceUp: faceUpForPlayer });
      }
    } else {
      kept.push({ ...c, faceUp: faceUpForPlayer });
    }
  }

  return {
    hand: faceUpForPlayer ? sortCanastaHand(kept) : kept,
    redThrees,
    stock: nextStock,
  };
}

export function getRequiredInitialMeld(teamScore: number, variant: CanastaVariantId): number {
  if (teamScore < 0) return 15;
  if (teamScore < 1500) return 50;
  if (teamScore < 3000) return 90;
  return variant === 'modern' ? 150 : 120;
}

export function computeMeldMeta(
  cards: CardData[],
  kind: CanastaMeldKind,
  variant: CanastaVariantId,
  rankLabel: string
): { isPure: boolean; isCanasta: boolean; bonus: number } {
  const spec = CANASTA_VARIANTS[variant];
  const isCanasta = cards.length >= 7;

  if (kind === 'sequence') {
    return {
      isPure: true,
      isCanasta,
      bonus: isCanasta ? spec.sambaBonus : 0,
    };
  }

  if (kind === 'wild') {
    const allTwos = cards.every((c) => c.rank === '2');
    const bonus = isCanasta
      ? allTwos && variant === 'modern'
        ? 2500
        : spec.wildCanastaBonus || 2000
      : 0;
    return {
      isPure: allTwos,
      isCanasta,
      bonus,
    };
  }

  const hasWild = cards.some(isWildCard);
  const isPure = !hasWild;
  let bonus = 0;
  if (isCanasta) {
    if (variant === 'modern' && isPure && (rankLabel === '7' || rankLabel === 'A')) {
      bonus = 1500;
    } else {
      bonus = isPure ? 500 : 300;
    }
  }

  return { isPure, isCanasta, bonus };
}

export interface EvaluatedNewMeld {
  valid: boolean;
  kind?: CanastaMeldKind;
  rankLabel?: string;
  suit?: Suit;
  sortedCards?: CardData[];
  points: number;
  error?: string;
}

export function evaluateSelectedNewMeld(
  selected: CardData[],
  variant: CanastaVariantId
): EvaluatedNewMeld {
  const spec = CANASTA_VARIANTS[variant];
  if (selected.length < 3) {
    return { valid: false, points: 0, error: 'Sélectionnez au moins 3 cartes pour poser une combinaison.' };
  }

  if (selected.some(isRedThree)) {
    return { valid: false, points: 0, error: 'Les 3 rouges ne se combinent pas en meld.' };
  }

  const blackThrees = selected.filter(isBlackThree);
  if (blackThrees.length > 0) {
    return {
      valid: false,
      points: 0,
      error: 'Les 3 noirs gèlent la défausse et ne forment pas de combinaison standard.',
    };
  }

  const wilds = selected.filter(isWildCard);
  const naturals = selected.filter((c) => !isWildCard(c));

  // 1. Wild-only meld (Moderne / Bolivia)
  if (naturals.length === 0) {
    if (!spec.allowWildMelds) {
      return {
        valid: false,
        points: 0,
        error: `Les combinaisons pures de Jokers/2 ne sont pas autorisées en ${spec.shortName}.`,
      };
    }
    const pts = selected.reduce((sum, c) => sum + getCanastaCardPoints(c, variant), 0);
    return {
      valid: true,
      kind: 'wild',
      rankLabel: 'WILDS',
      sortedCards: sortCanastaHand(selected),
      points: pts,
    };
  }

  // 2. Check if all naturals share the same rank (Rank Meld)
  const firstRank = naturals[0].rank;
  const sameRank = naturals.every((c) => c.rank === firstRank);

  if (sameRank) {
    if (naturals.length < 2) {
      return { valid: false, points: 0, error: 'Une combinaison exige au moins 2 cartes naturelles.' };
    }
    if (wilds.length > 3) {
      return { valid: false, points: 0, error: 'Maximum 3 jokers/2 par combinaison.' };
    }
    if (wilds.length >= naturals.length) {
      return {
        valid: false,
        points: 0,
        error: 'Les cartes naturelles doivent être strictement majoritaires.',
      };
    }
    const pts = selected.reduce((sum, c) => sum + getCanastaCardPoints(c, variant), 0);
    return {
      valid: true,
      kind: 'rank',
      rankLabel: firstRank,
      sortedCards: [...naturals, ...wilds],
      points: pts,
    };
  }

  // 3. Check Sequence Meld (Samba & Bolivia)
  if (spec.allowSequences && wilds.length === 0) {
    const firstSuit = naturals[0].suit;
    const sameSuit = naturals.every((c) => c.suit === firstSuit);
    if (sameSuit) {
      const indices = naturals.map((c) => SEQ_ORDER.indexOf(c.rank)).sort((a, b) => a - b);
      const consecutive =
        indices[0] >= 0 &&
        indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
      if (consecutive) {
        const sortedSeq = [...naturals].sort(
          (a, b) => SEQ_ORDER.indexOf(a.rank) - SEQ_ORDER.indexOf(b.rank)
        );
        const low = sortedSeq[0].rank;
        const high = sortedSeq[sortedSeq.length - 1].rank;
        const pts = sortedSeq.reduce((sum, c) => sum + getCanastaCardPoints(c, variant), 0);
        return {
          valid: true,
          kind: 'sequence',
          rankLabel: `${low}-${high}`,
          suit: firstSuit,
          sortedCards: sortedSeq,
          points: pts,
        };
      }
    }
  }

  return {
    valid: false,
    points: 0,
    error: spec.allowSequences
      ? 'Combinez 3+ cartes de même rang (avec jokers limités) ou 3+ cartes consécutives de même couleur.'
      : 'Combinez au moins 2 cartes naturelles de même rang (+ max 3 jokers/2).',
  };
}

export function canAddCardsToMeld(
  cardsToAdd: CardData[],
  meld: CanastaMeld,
  variant: CanastaVariantId
): { valid: boolean; nextCards?: CardData[]; error?: string } {
  if (cardsToAdd.length === 0) {
    return { valid: false, error: 'Sélectionnez au moins 1 carte à ajouter.' };
  }
  if (cardsToAdd.some(isRedThree) || cardsToAdd.some(isBlackThree)) {
    return { valid: false, error: 'Impossible d’ajouter un 3 à une combinaison.' };
  }

  const combined = [...meld.cards, ...cardsToAdd];

  if (meld.kind === 'wild') {
    if (!cardsToAdd.every(isWildCard)) {
      return { valid: false, error: 'Une Canasta de Wilds n’accepte que des 2 ou Jokers.' };
    }
    return { valid: true, nextCards: sortCanastaHand(combined) };
  }

  if (meld.kind === 'sequence') {
    if (!CANASTA_VARIANTS[variant].allowSequences) {
      return { valid: false, error: 'Suites non actives dans cette variante.' };
    }
    if (cardsToAdd.some(isWildCard)) {
      return { valid: false, error: 'Les suites Samba/Bolivia sont purement naturelles.' };
    }
    if (!cardsToAdd.every((c) => c.suit === meld.suit)) {
      return { valid: false, error: 'Toutes les cartes de la suite doivent partager la même couleur.' };
    }
    const indices = combined.map((c) => SEQ_ORDER.indexOf(c.rank)).sort((a, b) => a - b);
    const consecutive =
      indices[0] >= 0 &&
      indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
    if (!consecutive) {
      return { valid: false, error: 'Les cartes ajoutées doivent prolonger la suite sans trou ni doublon.' };
    }
    const sortedSeq = [...combined].sort(
      (a, b) => SEQ_ORDER.indexOf(a.rank) - SEQ_ORDER.indexOf(b.rank)
    );
    return { valid: true, nextCards: sortedSeq };
  }

  // Standard Rank Meld
  const wilds = combined.filter(isWildCard);
  const naturals = combined.filter((c) => !isWildCard(c));
  if (!naturals.every((c) => c.rank === meld.rankLabel)) {
    return { valid: false, error: `Cette combinaison n’accepte que des ${meld.rankLabel} ou jokers.` };
  }
  if (wilds.length > 3 || wilds.length >= naturals.length) {
    return { valid: false, error: 'Max 3 jokers/2 et majorité de cartes naturelles requise.' };
  }

  return { valid: true, nextCards: [...naturals, ...wilds] };
}

export interface DiscardPickupPlan {
  canTake: boolean;
  reason?: string;
  mode?: 'new_meld' | 'extend_meld';
  usedHandCardIds: string[];
  targetMeldId?: string;
}

export function evaluateDiscardPickup(
  hand: CardData[],
  discardPile: CardData[],
  isFrozen: boolean,
  hasOpened: boolean,
  requiredOpenPts: number,
  teamMelds: CanastaMeld[]
): DiscardPickupPlan {
  if (discardPile.length === 0) {
    return { canTake: false, reason: 'La défausse est vide.', usedHandCardIds: [] };
  }

  const top = discardPile[discardPile.length - 1];
  if (isWildCard(top) || isBlackThree(top) || isRedThree(top)) {
    return {
      canTake: false,
      reason: 'Impossible de prendre une défausse coiffée d’un Joker, d’un 2 ou d’un 3.',
      usedHandCardIds: [],
    };
  }

  const matchingNaturals = hand.filter((c) => c.rank === top.rank && !isWildCard(c));
  const wildsInHand = hand.filter(isWildCard);

  // Case 1: Frozen or not yet opened -> need 2 natural matches
  if (isFrozen || !hasOpened) {
    if (matchingNaturals.length < 2) {
      return {
        canTake: false,
        reason: isFrozen
          ? `Défausse gelée : il faut deux ${top.rank} naturels en main.`
          : `Avant ouverture : il faut deux ${top.rank} naturels en main.`,
        usedHandCardIds: [],
      };
    }

    if (!hasOpened) {
      // Top card + 2 matching naturals + any extra same-rank cards in hand if needed
      const meldPts =
        getCanastaCardPoints(top, 'classic') * 3;
      // If still short of requiredOpenPts, check if player has other natural melds/cards to reach threshold?
      // Simplified clean rule: top card + 2 matching naturals counts toward initial meld, or check if player can reach threshold with hand melds
      if (meldPts < requiredOpenPts) {
        // Check if hand has additional matching naturals or another quick pair/triple to supplement
        const extra = matchingNaturals.slice(2).reduce((s, c) => s + getCanastaCardPoints(c, 'classic'), 0);
        if (meldPts + extra < requiredOpenPts) {
          return {
            canTake: false,
            reason: `Ouverture ${requiredOpenPts} pts requise (ce trio vaut ${meldPts + extra} pts).`,
            usedHandCardIds: [],
          };
        }
      }
    }

    return {
      canTake: true,
      mode: 'new_meld',
      usedHandCardIds: [matchingNaturals[0].id, matchingNaturals[1].id],
    };
  }

  // Case 2: Opened and Unfrozen
  const existingMeld = teamMelds.find(
    (m) => m.kind === 'rank' && m.rankLabel === top.rank
  );
  if (existingMeld) {
    return {
      canTake: true,
      mode: 'extend_meld',
      usedHandCardIds: [],
      targetMeldId: existingMeld.id,
    };
  }

  if (matchingNaturals.length >= 2) {
    return {
      canTake: true,
      mode: 'new_meld',
      usedHandCardIds: [matchingNaturals[0].id, matchingNaturals[1].id],
    };
  }

  if (matchingNaturals.length === 1 && wildsInHand.length >= 1) {
    return {
      canTake: true,
      mode: 'new_meld',
      usedHandCardIds: [matchingNaturals[0].id, wildsInHand[0].id],
    };
  }

  return {
    canTake: false,
    reason: `Il faut deux ${top.rank}, un ${top.rank} + un joker/2, ou une combinaison de ${top.rank} posée.`,
    usedHandCardIds: [],
  };
}

export function canTeamGoOut(
  teamMelds: CanastaMeld[],
  variant: CanastaVariantId
): { allowed: boolean; reason?: string } {
  const spec = CANASTA_VARIANTS[variant];
  const canastas = teamMelds.filter((m) => m.isCanasta);
  if (canastas.length < spec.minCanastasToGoOut) {
    return {
      allowed: false,
      reason: `${spec.shortName} exige au moins ${spec.minCanastasToGoOut} Canasta${spec.minCanastasToGoOut > 1 ? 's' : ''} avant de sortir.`,
    };
  }
  if (spec.requirePureCanasta && !canastas.some((m) => m.isPure)) {
    return {
      allowed: false,
      reason: `${spec.shortName} exige au moins 1 Canasta Pure (sans Joker/2) pour sortir.`,
    };
  }
  return { allowed: true };
}

export function calculateTeamRoundBreakdown(
  team: 'NS' | 'EW',
  melds: CanastaMeld[],
  redThreeCount: number,
  unmeldedCards: CardData[],
  wentOut: boolean,
  concealedOut: boolean,
  variant: CanastaVariantId
): {
  canastaBonus: number;
  redThreePoints: number;
  meldCardPoints: number;
  goingOutBonus: number;
  handPenalty: number;
  total: number;
} {
  const teamMelds = melds.filter((m) => m.team === team);
  const canastaBonus = teamMelds.reduce((s, m) => s + m.bonus, 0);
  const meldCardPoints = teamMelds.reduce(
    (s, m) => s + m.cards.reduce((cs, c) => cs + getCanastaCardPoints(c, variant), 0),
    0
  );

  const rawRed3 = redThreeCount === 4 ? 800 : redThreeCount * 100;
  const redThreePoints = teamMelds.length > 0 ? rawRed3 : -rawRed3;

  const goingOutBonus = wentOut ? (concealedOut ? 200 : 100) : 0;
  const handPenalty = unmeldedCards.reduce(
    (s, c) => s + getCanastaCardPoints(c, variant, true),
    0
  );

  const total = canastaBonus + redThreePoints + meldCardPoints + goingOutBonus - handPenalty;

  return {
    canastaBonus,
    redThreePoints,
    meldCardPoints,
    goingOutBonus,
    handPenalty,
    total,
  };
}

/**
 * AI assistant for E / N / W Canasta seats: finds best legal melds/extensions and safest discard.
 */
export function chooseAiDiscard(hand: CardData[], variant: CanastaVariantId): CardData {
  // Prefer discarding unmelded Black 3s (freeze!), then low singles (4..7), then high singles, never wilds unless forced
  const black3 = hand.find(isBlackThree);
  if (black3) return black3;

  const counts = new Map<Rank, number>();
  for (const c of hand) {
    counts.set(c.rank, (counts.get(c.rank) || 0) + 1);
  }

  const nonWilds = hand.filter((c) => !isWildCard(c));
  const singles = nonWilds.filter((c) => (counts.get(c.rank) || 0) === 1);
  if (singles.length > 0) {
    return [...singles].sort(
      (a, b) => getCanastaCardPoints(a, variant) - getCanastaCardPoints(b, variant)
    )[0];
  }

  if (nonWilds.length > 0) {
    return [...nonWilds].sort(
      (a, b) => getCanastaCardPoints(a, variant) - getCanastaCardPoints(b, variant)
    )[0];
  }

  return hand[hand.length - 1];
}
