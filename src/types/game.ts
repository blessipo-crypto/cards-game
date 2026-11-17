export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'JOKER';

export type SalonGameId = 'belote' | 'bridge' | 'canasta' | 'poker' | 'blackjack' | 'baccarat';

export type SalonCategory = 'all' | 'trick_taking' | 'casino_bank';

export type FeltThemeId = 'emerald' | 'crimson' | 'sapphire' | 'obsidian';

export type ChipValue = 50 | 100 | 500 | 1000 | 5000;

export type SeatId = 'N' | 'E' | 'S' | 'W';

export interface CardData {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type BeloteMultiplier = 1 | 2 | 4; // 1 = Normal, 2 = Coinché, 4 = Surcoinché

export type BridgeStrain = 'clubs' | 'diamonds' | 'hearts' | 'spades' | 'NT';
export type BridgeVulnerability = 'NONE' | 'NS' | 'EW' | 'ALL';

export interface BridgeBidCall {
  seat: SeatId;
  type: 'BID' | 'PASS' | 'DOUBLE' | 'REDOUBLE';
  level?: number; // 1..7
  strain?: BridgeStrain;
}

export type CanastaVariantId = 'classic' | 'modern' | 'hand_and_foot' | 'samba' | 'bolivia';

export type CanastaMeldKind = 'rank' | 'wild' | 'sequence';

export interface CanastaMeld {
  id: string;
  team: 'NS' | 'EW';
  kind: CanastaMeldKind;
  rankLabel: string;
  suit?: Suit;
  cards: CardData[];
  isPure: boolean;
  isCanasta: boolean;
  bonus: number;
}

export type PokerStreet = 'READY' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

export type BaccaratBetSide = 'punto' | 'banco' | 'tie';

export interface BaccaratRoadEntry {
  id: string;
  winner: BaccaratBetSide;
  puntoTotal: number;
  bancoTotal: number;
  natural: boolean;
}

export interface HandLogEntry {
  id: string;
  game: SalonGameId;
  summary: string;
  delta: number;
  timestamp: string;
}

export interface BankrollPoint {
  step: number;
  balance: number;
  label: string;
}
