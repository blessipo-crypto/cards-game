import { create } from 'zustand';
import {
  BaccaratBetSide,
  BaccaratRoadEntry,
  BankrollPoint,
  BeloteMultiplier,
  BridgeBidCall,
  BridgeStrain,
  BridgeVulnerability,
  CanastaMeld,
  CanastaVariantId,
  CardData,
  ChipValue,
  FeltThemeId,
  HandLogEntry,
  PokerStreet,
  SalonGameId,
  SeatId,
  Suit,
} from '../types/game';
import {
  evaluateBaccaratTotal,
  settleBaccaratBet,
  shouldBancoDrawThird,
} from '../utils/baccaratLogic';
import {
  SEATS,
  chooseBestBeloteCard,
  dealEightCardBeloteHands,
  getBelotePoints,
  getLegalBeloteCards,
  getTrickWinnerBelote,
} from '../utils/beloteLogic';
import {
  canSplitCards,
  createSixDeckShoe,
  evaluateBlackjackHand,
} from '../utils/blackjackLogic';
import {
  BridgeContract,
  calculateHCP,
  canDoubleCall,
  canRedoubleCall,
  chooseAiBridgeBid,
  chooseBestBridgeCard,
  createBridgeHands,
  getHighestContractBid,
  getLegalBridgeCards,
  getTrickWinnerBridge,
  isBidHigher,
  resolveBridgeContract,
} from '../utils/bridgeLogic';
import {
  createShuffledPokerDeck,
  decidePokerAiAction,
  evaluateBestHoldemHand,
} from '../utils/pokerLogic';
import {
  CANASTA_VARIANTS,
  SEATS as CANASTA_SEATS,
  calculateTeamRoundBreakdown,
  canAddCardsToMeld,
  canTeamGoOut,
  chooseAiDiscard,
  computeMeldMeta,
  createCanastaShoe,
  evaluateDiscardPickup,
  evaluateSelectedNewMeld,
  extractRedThreesFromCards,
  getCanastaCardPoints,
  getRequiredInitialMeld,
  isBlackThree,
  isWildCard,
  sortCanastaHand,
} from '../utils/canastaLogic';
import { soundEngine } from '../utils/soundEngine';

const STORAGE_KEY = 'royal_velvet_suite_v1';

let timerBag: number[] = [];
let epochCounter = 0;

function clearTimers() {
  timerBag.forEach((id) => window.clearTimeout(id));
  timerBag = [];
}

function schedule(fn: () => void, ms: number) {
  const myEpoch = epochCounter;
  const id = window.setTimeout(() => {
    if (epochCounter === myEpoch) fn();
  }, ms);
  timerBag.push(id);
}

function nowTimeStr(): string {
  const d = new Date();
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface PersistedData {
  bankroll: number;
  feltTheme: FeltThemeId;
  wins: number;
  handsPlayed: number;
  streak: number;
  muted: boolean;
}

function loadSaved(): PersistedData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        bankroll: 25000,
        feltTheme: 'emerald',
        wins: 0,
        handsPlayed: 0,
        streak: 0,
        muted: false,
      };
    }
    const p = JSON.parse(raw) as Partial<PersistedData>;
    return {
      bankroll: typeof p.bankroll === 'number' ? p.bankroll : 25000,
      feltTheme: p.feltTheme ?? 'emerald',
      wins: p.wins ?? 0,
      handsPlayed: p.handsPlayed ?? 0,
      streak: p.streak ?? 0,
      muted: p.muted ?? false,
    };
  } catch {
    return {
      bankroll: 25000,
      feltTheme: 'emerald',
      wins: 0,
      handsPlayed: 0,
      streak: 0,
      muted: false,
    };
  }
}

function savePersisted(d: PersistedData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    // Ignore storage quota issues
  }
}

export interface BeloteSlice {
  phase: 'READY' | 'AUCTION' | 'PLAYING' | 'ROUND_OVER';
  dealer: SeatId;
  hands: Record<SeatId, CardData[]>;
  selectedSuit: Suit;
  selectedPoints: number; // 80..160 or 250
  multiplier: BeloteMultiplier;
  taker: SeatId | null;
  trump: Suit | null;
  currentTurn: SeatId;
  trick: { seat: SeatId; card: CardData }[];
  nsPoints: number;
  ewPoints: number;
  nsTricks: number;
  ewTricks: number;
  beloteRebeloteSeat: SeatId | null;
  beloteAnnounced: boolean;
  rebeloteAnnounced: boolean;
  dixDeDerTeam: 'NS' | 'EW' | null;
  statusText: string;
}

export interface BridgeSlice {
  phase: 'READY' | 'AUCTION' | 'PLAYING' | 'ROUND_OVER';
  dealer: SeatId;
  vulnerability: BridgeVulnerability;
  hands: Record<SeatId, CardData[]>;
  calls: BridgeBidCall[];
  currentBidTurn: SeatId;
  contract: BridgeContract | null;
  dummyExposed: boolean;
  currentTurn: SeatId;
  trick: { seat: SeatId; card: CardData }[];
  nsTricks: number;
  ewTricks: number;
  nsHcp: number;
  statusText: string;
}

export interface PokerSlice {
  street: PokerStreet;
  deck: CardData[];
  playerHole: CardData[];
  aiLeftHole: CardData[];
  aiRightHole: CardData[];
  community: CardData[];
  pot: number;
  currentBet: number;
  playerCommitted: number;
  aiLeftCommitted: number;
  aiRightCommitted: number;
  playerFolded: boolean;
  aiLeftFolded: boolean;
  aiRightFolded: boolean;
  playerTurn: boolean;
  handEvalText: string;
  statusText: string;
}

export interface BlackjackHand {
  id: string;
  cards: CardData[];
  bet: number;
  isStood: boolean;
  isDoubled: boolean;
  isFromSplit: boolean;
  result?: 'BLACKJACK' | 'WIN' | 'LOSS' | 'PUSH' | 'BUST';
}

export interface BlackjackSlice {
  phase: 'BETTING' | 'PLAYER_TURN' | 'DEALER_TURN' | 'ROUND_OVER';
  shoe: CardData[];
  stagedBet: number;
  dealerCards: CardData[];
  playerHands: BlackjackHand[];
  activeHandIdx: number;
  statusText: string;
  lastNet: number | null;
}

export interface BaccaratSlice {
  phase: 'BETTING' | 'ROUND_OVER';
  betSide: BaccaratBetSide;
  stagedBet: number;
  puntoCards: CardData[];
  bancoCards: CardData[];
  puntoTotal: number;
  bancoTotal: number;
  winner: BaccaratBetSide | null;
  lastNet: number | null;
  road: BaccaratRoadEntry[];
  statusText: string;
}

export interface CanastaSlice {
  variant: CanastaVariantId;
  phase: 'READY' | 'DRAW' | 'MELD_DISCARD' | 'ROUND_OVER';
  dealer: SeatId;
  currentTurn: SeatId;
  stock: CardData[];
  discardPile: CardData[];
  isFrozen: boolean;
  hands: Record<SeatId, CardData[]>;
  feet: Record<SeatId, CardData[]>;
  inFoot: Record<SeatId, boolean>;
  redThrees: { NS: CardData[]; EW: CardData[] };
  melds: CanastaMeld[];
  nsScore: number;
  ewScore: number;
  nsOpened: boolean;
  ewOpened: boolean;
  pendingOpeningIds: string[];
  pendingOpeningPoints: number;
  selectedCardIds: string[];
  hadMeldedBeforeTurn: boolean;
  lastRoundBreakdown: {
    nsTotal: number;
    ewTotal: number;
    nsCanastaBonus: number;
    ewCanastaBonus: number;
    winnerTeam: 'NS' | 'EW' | 'TIE';
  } | null;
  statusText: string;
}

interface SalonStoreState {
  activeScreen: 'CONCIERGERIE' | SalonGameId;
  feltTheme: FeltThemeId;
  bankroll: number;
  wins: number;
  handsPlayed: number;
  streak: number;
  muted: boolean;
  handLogs: HandLogEntry[];
  bankrollHistory: BankrollPoint[];

  belote: BeloteSlice;
  bridge: BridgeSlice;
  canasta: CanastaSlice;
  poker: PokerSlice;
  blackjack: BlackjackSlice;
  baccarat: BaccaratSlice;

  // Top Chrome Actions
  setScreen: (screen: 'CONCIERGERIE' | SalonGameId) => void;
  setFeltTheme: (felt: FeltThemeId) => void;
  cashierTopUp: () => void;
  toggleMute: () => void;

  // Belote Actions
  beloteNewDeal: () => void;
  beloteSetSuit: (suit: Suit) => void;
  beloteSetPoints: (pts: number) => void;
  beloteSetMultiplier: (mult: BeloteMultiplier) => void;
  beloteTakeContract: () => void;
  beloteAiAuction: () => void;
  belotePlayCard: (cardId: string) => void;

  // Bridge Actions
  bridgeNewDeal: () => void;
  bridgePlaceCall: (call: Omit<BridgeBidCall, 'seat'>) => void;
  bridgePlayCard: (cardId: string) => void;

  // Canasta & Variants Actions
  canastaSetVariant: (variant: CanastaVariantId) => void;
  canastaNewDeal: () => void;
  canastaDrawStock: () => void;
  canastaTakePile: () => void;
  canastaToggleSelectCard: (cardId: string) => void;
  canastaMeldSelected: () => void;
  canastaExtendMeld: (meldId: string) => void;
  canastaCancelPendingOpening: () => void;
  canastaDiscardSelected: () => void;

  // Poker Actions
  pokerStartHand: () => void;
  pokerAction: (action: 'fold' | 'check' | 'call' | 'raise', raiseAmount?: number) => void;

  // Blackjack Actions
  bjAddChip: (val: ChipValue) => void;
  bjClearBet: () => void;
  bjDeal: () => void;
  bjHit: () => void;
  bjStand: () => void;
  bjDouble: () => void;
  bjSplit: () => void;
  bjNewHand: () => void;

  // Baccarat Actions
  bacSetSide: (side: BaccaratBetSide) => void;
  bacAddChip: (val: ChipValue) => void;
  bacClearBet: () => void;
  bacDeal: () => void;
  bacNewRound: () => void;
}

const init = loadSaved();
soundEngine.setVolumes(0.35, 0.78, init.muted);

const VULN_CYCLE: BridgeVulnerability[] = ['NONE', 'NS', 'EW', 'ALL'];

export const useSalonStore = create<SalonStoreState>((set, get) => {
  const persist = () => {
    const s = get();
    savePersisted({
      bankroll: s.bankroll,
      feltTheme: s.feltTheme,
      wins: s.wins,
      handsPlayed: s.handsPlayed,
      streak: s.streak,
      muted: s.muted,
    });
  };

  const logResult = (game: SalonGameId, summary: string, delta: number, won: boolean | null) => {
    const s = get();
    const nextBankroll = Math.max(0, s.bankroll);
    const entry: HandLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      game,
      summary,
      delta,
      timestamp: nowTimeStr(),
    };
    const nextPoint: BankrollPoint = {
      step: s.bankrollHistory.length,
      balance: nextBankroll,
      label: summary,
    };

    if (won === true) soundEngine.playWinFanfare(delta >= 500);
    else if (won === false) soundEngine.playLossTone();
    else soundEngine.playChipClink(1);

    set({
      wins: won === true ? s.wins + 1 : s.wins,
      handsPlayed: s.handsPlayed + 1,
      streak: won === true ? s.streak + 1 : won === false ? 0 : s.streak,
      handLogs: [entry, ...s.handLogs].slice(0, 14),
      bankrollHistory: [...s.bankrollHistory, nextPoint].slice(-24),
    });
    persist();
  };

  // --- BELOTE STEPPER ---
  const stepBelote = () => {
    const b = get().belote;
    if (b.phase !== 'PLAYING' || !b.trump) return;

    if (b.trick.length === 4) {
      const winner = getTrickWinnerBelote(b.trick, b.trump);
      const pts = b.trick.reduce(
        (acc, t) => acc + getBelotePoints(t.card.rank, t.card.suit === b.trump),
        0
      );
      const finished = SEATS.every((seat) => b.hands[seat].length === 0);
      const dixBonus = finished ? 10 : 0;
      const dixTeam = finished ? (winner === 'N' || winner === 'S' ? 'NS' : 'EW') : null;
      const add = pts + dixBonus;

      const nsPoints = b.nsPoints + (winner === 'N' || winner === 'S' ? add : 0);
      const ewPoints = b.ewPoints + (winner === 'E' || winner === 'W' ? add : 0);
      const nsTricks = b.nsTricks + (winner === 'N' || winner === 'S' ? 1 : 0);
      const ewTricks = b.ewTricks + (winner === 'E' || winner === 'W' ? 1 : 0);

      if (finished) {
        const capotNS = nsTricks === 8;
        const capotEW = ewTricks === 8;
        const finalNS = capotNS ? 252 : nsPoints;
        const finalEW = capotEW ? 252 : ewPoints;
        const nsTook = b.taker === 'N' || b.taker === 'S';
        const target = b.selectedPoints === 250 ? 250 : b.selectedPoints;
        const made = nsTook
          ? b.selectedPoints === 250
            ? capotNS
            : finalNS >= target && finalNS > finalEW
          : b.selectedPoints === 250
            ? !capotEW
            : finalEW < target;

        const stake = 200 * b.multiplier;
        const reward = made ? stake * 2 + (capotNS ? 500 : 0) : 0;
        const delta = reward - 200;

        set((st) => ({
          bankroll: st.bankroll + reward,
          belote: {
            ...b,
            phase: 'ROUND_OVER',
            trick: [],
            nsPoints: finalNS,
            ewPoints: finalEW,
            nsTricks,
            ewTricks,
            dixDeDerTeam: dixTeam,
            statusText: made
              ? `Contrat rempli ! Nord/Sud ${finalNS} pts vs Est/Ouest ${finalEW} pts (+${reward.toLocaleString('fr-FR')} €).`
              : `Contrat chuté ! Nord/Sud ${finalNS} pts vs Est/Ouest ${finalEW} pts.`,
          },
        }));
        logResult(
          'belote',
          `Belote ${b.selectedPoints} (${b.trump.toUpperCase()}) · ${finalNS}-${finalEW}`,
          delta,
          made
        );
        return;
      }

      soundEngine.playChipClink(1);
      set({
        belote: {
          ...b,
          trick: [],
          currentTurn: winner,
          nsPoints,
          ewPoints,
          nsTricks,
          ewTricks,
          statusText: `Pli remporté par ${winner} (+${pts} pts).`,
        },
      });
      if (winner !== 'S') {
        schedule(() => stepBelote(), 480);
      }
      return;
    }

    if (b.currentTurn !== 'S') {
      const seat = b.currentTurn;
      const hand = b.hands[seat];
      const chosen = chooseBestBeloteCard(hand, b.trick, b.trump, seat);
      const nextSeat = SEATS[(SEATS.indexOf(seat) + 1) % 4];
      soundEngine.playCardDeal();

      set({
        belote: {
          ...b,
          hands: { ...b.hands, [seat]: hand.filter((c) => c.id !== chosen.id) },
          trick: [...b.trick, { seat, card: { ...chosen, faceUp: true } }],
          currentTurn: nextSeat,
          statusText: `${seat} joue ${chosen.rank}.`,
        },
      });

      if (b.trick.length + 1 === 4 || nextSeat !== 'S') {
        schedule(() => stepBelote(), 420);
      }
    }
  };

  // --- BRIDGE BIDDING & PLAY STEPPER ---
  const stepBridgeAuction = () => {
    const br = get().bridge;
    if (br.phase !== 'AUCTION') return;

    // Check 3 consecutive passes after a bid (or 4 passes from start)
    const len = br.calls.length;
    const allPassStart = len === 4 && br.calls.every((c) => c.type === 'PASS');
    const threePassesAfterAction =
      len >= 4 &&
      br.calls.slice(-3).every((c) => c.type === 'PASS') &&
      br.calls.some((c) => c.type !== 'PASS');

    if (allPassStart) {
      set({
        bridge: {
          ...br,
          phase: 'ROUND_OVER',
          statusText: '4 Passe généraux — Donne annulée. Relancez une donne.',
        },
      });
      return;
    }

    if (threePassesAfterAction) {
      const contract = resolveBridgeContract(br.calls);
      if (!contract) return;
      const leadIdx = (SEATS.indexOf(contract.declarer) + 1) % 4;
      const firstTurn = SEATS[leadIdx];
      const nsControlsDummy = contract.declarer === 'S' || contract.declarer === 'N';
      const firstIsHuman = firstTurn === 'S' || (firstTurn === 'N' && nsControlsDummy);

      soundEngine.playCardFlip();
      set({
        bridge: {
          ...br,
          phase: 'PLAYING',
          contract,
          currentTurn: firstTurn,
          dummyExposed: false,
          statusText: `Contrat final : ${contract.level}${contract.strain === 'NT' ? 'SA' : contract.strain.toUpperCase()} par ${contract.declarer} (Objectif ${contract.targetTricks} levées).`,
        },
      });
      if (!firstIsHuman) {
        schedule(() => stepBridgePlay(), 520);
      }
      return;
    }

    if (br.currentBidTurn !== 'S') {
      const seat = br.currentBidTurn;
      const call = chooseAiBridgeBid(br.hands[seat], br.calls, seat);
      const nextTurn = SEATS[(SEATS.indexOf(seat) + 1) % 4];
      soundEngine.playUiClick();

      set({
        bridge: {
          ...br,
          calls: [...br.calls, call],
          currentBidTurn: nextTurn,
          statusText:
            call.type === 'BID'
              ? `${seat} déclare ${call.level}${call.strain === 'NT' ? 'SA' : call.strain?.toUpperCase()}`
              : `${seat} Passe.`,
        },
      });
      schedule(() => stepBridgeAuction(), 380);
    }
  };

  const stepBridgePlay = () => {
    const br = get().bridge;
    if (br.phase !== 'PLAYING' || !br.contract) return;
    const contract = br.contract;

    if (br.trick.length === 4) {
      const winner = getTrickWinnerBridge(br.trick, contract.strain);
      const nsTricks = br.nsTricks + (winner === 'N' || winner === 'S' ? 1 : 0);
      const ewTricks = br.ewTricks + (winner === 'E' || winner === 'W' ? 1 : 0);
      const done = SEATS.every((seat) => br.hands[seat].length === 0);

      if (done) {
        const nsDeclaring = contract.declarer === 'N' || contract.declarer === 'S';
        const made = nsDeclaring
          ? nsTricks >= contract.targetTricks
          : ewTricks < contract.targetTricks;
        const mult = contract.redoubled ? 4 : contract.doubled ? 2 : 1;
        const reward = made ? 400 * mult + Math.max(0, nsTricks - contract.targetTricks) * 100 : 0;
        const delta = reward - 200;

        set((st) => ({
          bankroll: st.bankroll + reward,
          bridge: {
            ...br,
            phase: 'ROUND_OVER',
            trick: [],
            nsTricks,
            ewTricks,
            statusText: made
              ? `Contrat réussi (${nsTricks} levées N/S) ! +${reward.toLocaleString('fr-FR')} €`
              : `Contrat chuté (${nsTricks} levées N/S sur ${contract.targetTricks} requises).`,
          },
        }));
        logResult(
          'bridge',
          `Bridge ${contract.level}${contract.strain === 'NT' ? 'SA' : contract.strain[0].toUpperCase()} · ${nsTricks}/${contract.targetTricks}`,
          delta,
          made
        );
        return;
      }

      const nsControlsDummy = contract.declarer === 'S' || contract.declarer === 'N';
      const humanTurn = winner === 'S' || (winner === 'N' && nsControlsDummy);
      soundEngine.playChipClink(1);

      set({
        bridge: {
          ...br,
          trick: [],
          currentTurn: winner,
          nsTricks,
          ewTricks,
          statusText: `Levée remportée par ${winner} (N/S ${nsTricks} – E/O ${ewTricks}).`,
        },
      });

      if (!humanTurn) {
        schedule(() => stepBridgePlay(), 420);
      }
      return;
    }

    const nsControlsDummy = br.contract.declarer === 'S' || br.contract.declarer === 'N';
    const isHuman = br.currentTurn === 'S' || (br.currentTurn === 'N' && nsControlsDummy);

    if (!isHuman) {
      const seat = br.currentTurn;
      const hand = br.hands[seat];
      const chosen = chooseBestBridgeCard(hand, br.trick, br.contract.strain, seat);
      const nextSeat = SEATS[(SEATS.indexOf(seat) + 1) % 4];
      const dummySeat = br.contract.dummy;

      // Reveal Dummy immediately upon opening lead
      const updatedHands = {
        ...br.hands,
        [seat]: hand.filter((c) => c.id !== chosen.id),
      };
      if (!br.dummyExposed) {
        updatedHands[dummySeat] = updatedHands[dummySeat].map((c) => ({ ...c, faceUp: true }));
      }

      soundEngine.playCardDeal();
      const nextHuman = nextSeat === 'S' || (nextSeat === 'N' && nsControlsDummy);

      set({
        bridge: {
          ...br,
          hands: updatedHands,
          dummyExposed: true,
          trick: [...br.trick, { seat, card: { ...chosen, faceUp: true } }],
          currentTurn: nextSeat,
          statusText: `${seat} joue ${chosen.rank}.`,
        },
      });

      if (br.trick.length + 1 === 4 || !nextHuman) {
        schedule(() => stepBridgePlay(), 400);
      }
    }
  };

  // --- BLACKJACK SETTLEMENT ---
  const settleBlackjack = (hands: BlackjackHand[], dealer: CardData[]) => {
    const dEval = evaluateBlackjackHand(dealer);
    let totalReturned = 0;
    let totalWager = 0;
    let winsInc = 0;
    let lossesInc = 0;

    const settled: BlackjackHand[] = hands.map((h) => {
      totalWager += h.bet;
      const pEval = evaluateBlackjackHand(h.cards, { isFromSplit: h.isFromSplit });
      let result: BlackjackHand['result'] = 'LOSS';
      let ret = 0;

      if (pEval.isBust) {
        result = 'BUST';
        lossesInc += 1;
      } else if (pEval.isNaturalBlackjack && !dEval.isNaturalBlackjack) {
        result = 'BLACKJACK';
        ret = h.bet + Math.floor(h.bet * 1.5);
        winsInc += 1;
      } else if (dEval.isNaturalBlackjack && !pEval.isNaturalBlackjack) {
        result = 'LOSS';
        lossesInc += 1;
      } else if (pEval.isNaturalBlackjack && dEval.isNaturalBlackjack) {
        result = 'PUSH';
        ret = h.bet;
      } else if (dEval.isBust || pEval.total > dEval.total) {
        result = 'WIN';
        ret = h.bet * 2;
        winsInc += 1;
      } else if (pEval.total === dEval.total) {
        result = 'PUSH';
        ret = h.bet;
      } else {
        result = 'LOSS';
        lossesInc += 1;
      }
      totalReturned += ret;
      return { ...h, result };
    });

    const net = totalReturned - totalWager;
    set((st) => ({
      bankroll: st.bankroll + totalReturned,
      blackjack: {
        ...st.blackjack,
        phase: 'ROUND_OVER',
        dealerCards: dealer,
        playerHands: settled,
        lastNet: net,
        statusText:
          net > 0
            ? `Gain de +${net.toLocaleString('fr-FR')} € face à la Banque (${dEval.total}).`
            : net === 0
              ? `Égalité (${dEval.total}) — Mise restituée.`
              : `La Banque l'emporte avec ${dEval.total}.`,
      },
    }));
    logResult(
      'blackjack',
      `Blackjack 21 · Croupier ${dEval.total}`,
      net,
      net > 0 ? true : net < 0 ? false : null
    );
  };

  const runBlackjackDealer = (hands: BlackjackHand[], dealer: CardData[], shoe: CardData[]) => {
    const revealed = dealer.map((c) => ({ ...c, faceUp: true }));
    let curShoe = [...shoe];
    const dCards = [...revealed];
    const allBust = hands.every((h) => evaluateBlackjackHand(h.cards).isBust);

    if (!allBust) {
      while (evaluateBlackjackHand(dCards).total < 17 && curShoe.length > 0) {
        dCards.push({ ...curShoe.pop()!, faceUp: true });
      }
    }

    set((st) => ({
      blackjack: {
        ...st.blackjack,
        shoe: curShoe,
        dealerCards: dCards,
      },
    }));
    settleBlackjack(hands, dCards);
  };

  // --- CANASTA ROUND END & AI STEPPER ---
  const finishCanastaRound = (
    wentOutTeam: 'NS' | 'EW' | null,
    concealedOut: boolean,
    reasonText: string
  ) => {
    const c = get().canasta;
    const nsUnmelded = [...c.hands.N, ...c.hands.S, ...c.feet.N, ...c.feet.S];
    const ewUnmelded = [...c.hands.E, ...c.hands.W, ...c.feet.E, ...c.feet.W];

    const nsBr = calculateTeamRoundBreakdown(
      'NS',
      c.melds,
      c.redThrees.NS.length,
      nsUnmelded,
      wentOutTeam === 'NS',
      wentOutTeam === 'NS' && concealedOut,
      c.variant
    );
    const ewBr = calculateTeamRoundBreakdown(
      'EW',
      c.melds,
      c.redThrees.EW.length,
      ewUnmelded,
      wentOutTeam === 'EW',
      wentOutTeam === 'EW' && concealedOut,
      c.variant
    );

    const nextNsScore = c.nsScore + nsBr.total;
    const nextEwScore = c.ewScore + ewBr.total;
    const winnerTeam: 'NS' | 'EW' | 'TIE' =
      nsBr.total > ewBr.total ? 'NS' : ewBr.total > nsBr.total ? 'EW' : 'TIE';

    const reward = winnerTeam === 'NS' ? 600 : winnerTeam === 'TIE' ? 200 : 0;
    const delta = reward - 200;

    set((st) => ({
      bankroll: st.bankroll + reward,
      canasta: {
        ...c,
        phase: 'ROUND_OVER',
        selectedCardIds: [],
        pendingOpeningIds: [],
        pendingOpeningPoints: 0,
        nsScore: nextNsScore,
        ewScore: nextEwScore,
        lastRoundBreakdown: {
          nsTotal: nsBr.total,
          ewTotal: ewBr.total,
          nsCanastaBonus: nsBr.canastaBonus,
          ewCanastaBonus: ewBr.canastaBonus,
          winnerTeam,
        },
        statusText: `${reasonText} N/S ${nsBr.total >= 0 ? `+${nsBr.total}` : nsBr.total} pts vs E/O ${ewBr.total >= 0 ? `+${ewBr.total}` : ewBr.total} pts.`,
      },
    }));

    logResult(
      'canasta',
      `Canasta ${CANASTA_VARIANTS[c.variant].shortName} · ${nsBr.total} vs ${ewBr.total}`,
      delta,
      winnerTeam === 'NS' ? true : winnerTeam === 'EW' ? false : null
    );
  };

  const stepCanastaAi = () => {
    const c = get().canasta;
    if (c.phase === 'READY' || c.phase === 'ROUND_OVER' || c.currentTurn === 'S') return;

    const seat = c.currentTurn;
    const team: 'NS' | 'EW' = seat === 'N' ? 'NS' : 'EW';
    const spec = CANASTA_VARIANTS[c.variant];

    let stock = [...c.stock];
    let discardPile = [...c.discardPile];
    let isFrozen = c.isFrozen;
    let hand = [...c.hands[seat]];
    let feet = { ...c.feet };
    let inFoot = { ...c.inFoot };
    let redThrees = {
      NS: [...c.redThrees.NS],
      EW: [...c.redThrees.EW],
    };
    let melds = [...c.melds];
    let nsOpened = c.nsOpened;
    let ewOpened = c.ewOpened;

    // 1. Draw from Stock (or stop if empty)
    if (stock.length < spec.drawCount) {
      finishCanastaRound(null, false, 'Pioche épuisée !');
      return;
    }

    const drawnRaw: CardData[] = [];
    for (let i = 0; i < spec.drawCount && stock.length > 0; i++) {
      drawnRaw.push(stock.pop()!);
    }
    const extracted = extractRedThreesFromCards(drawnRaw, stock, false);
    stock = extracted.stock;
    redThrees[team] = [...redThrees[team], ...extracted.redThrees];
    hand = [...hand, ...extracted.hand];
    soundEngine.playCardDeal();

    // 2. AI attempts extending existing team melds first
    const teamOpened = team === 'NS' ? nsOpened : ewOpened;
    if (teamOpened) {
      for (let mIdx = 0; mIdx < melds.length; mIdx++) {
        const m = melds[mIdx];
        if (m.team !== team || m.kind !== 'rank') continue;
        const matches = hand.filter((card) => card.rank === m.rankLabel && !isWildCard(card));
        for (const match of matches) {
          const res = canAddCardsToMeld([match], m, c.variant);
          if (res.valid && res.nextCards && hand.length > 1) {
            const meta = computeMeldMeta(res.nextCards, m.kind, c.variant, m.rankLabel);
            melds[mIdx] = { ...m, cards: res.nextCards, ...meta };
            hand = hand.filter((x) => x.id !== match.id);
          }
        }
      }
    }

    // 3. AI checks if it can lay down a new 3+ rank meld
    const requiredPts = getRequiredInitialMeld(team === 'NS' ? c.nsScore : c.ewScore, c.variant);
    const byRank = new Map<string, CardData[]>();
    for (const card of hand) {
      if (isWildCard(card) || card.rank === '3') continue;
      const arr = byRank.get(card.rank) || [];
      arr.push(card);
      byRank.set(card.rank, arr);
    }

    for (const [rank, group] of byRank.entries()) {
      if (group.length >= 3 && hand.length - group.length >= 1) {
        const evalRes = evaluateSelectedNewMeld(group, c.variant);
        if (evalRes.valid && evalRes.sortedCards) {
          if (teamOpened || evalRes.points >= requiredPts) {
            const meta = computeMeldMeta(evalRes.sortedCards, 'rank', c.variant, rank);
            melds.push({
              id: `meld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              team,
              kind: 'rank',
              rankLabel: rank,
              cards: evalRes.sortedCards.map((x) => ({ ...x, faceUp: true })),
              ...meta,
            });
            const usedIds = new Set(group.map((x) => x.id));
            hand = hand.filter((x) => !usedIds.has(x.id));
            if (team === 'NS') nsOpened = true;
            else ewOpened = true;
            soundEngine.playChipClink(2);
            break;
          }
        }
      }
    }

    // 4. Hand & Foot transition if hand emptied
    if (spec.hasFoot && hand.length === 0 && !inFoot[seat] && feet[seat].length > 0) {
      const footExt = extractRedThreesFromCards(feet[seat], stock, false);
      stock = footExt.stock;
      redThrees[team] = [...redThrees[team], ...footExt.redThrees];
      hand = footExt.hand;
      feet = { ...feet, [seat]: [] };
      inFoot = { ...inFoot, [seat]: true };
    }

    // 5. Check Going Out if hand has 0 or 1 card left
    const goCheck = canTeamGoOut(
      melds.filter((m) => m.team === team),
      c.variant
    );
    if (hand.length <= 1 && goCheck.allowed) {
      if (hand.length === 1) {
        const last = { ...hand[0], faceUp: true };
        discardPile.push(last);
        hand = [];
      }
      set({
        canasta: {
          ...c,
          stock,
          discardPile,
          hands: { ...c.hands, [seat]: [] },
          feet,
          inFoot,
          redThrees,
          melds,
          nsOpened,
          ewOpened,
        },
      });
      finishCanastaRound(team, false, `${seat} (${team}) sort et ferme la manche !`);
      return;
    }

    // 6. AI discards 1 card
    const discarded = hand.length > 0 ? chooseAiDiscard(hand, c.variant) : null;
    if (discarded) {
      hand = hand.filter((x) => x.id !== discarded.id);
      discardPile.push({ ...discarded, faceUp: true });
      if (isWildCard(discarded) || isBlackThree(discarded)) {
        isFrozen = true;
      }
    }

    const nextSeat = CANASTA_SEATS[(CANASTA_SEATS.indexOf(seat) + 1) % 4];
    const nextPhase = nextSeat === 'S' ? 'DRAW' : 'DRAW';

    set({
      canasta: {
        ...c,
        phase: nextPhase,
        currentTurn: nextSeat,
        stock,
        discardPile,
        isFrozen,
        hands: { ...c.hands, [seat]: hand },
        feet,
        inFoot,
        redThrees,
        melds,
        nsOpened,
        ewOpened,
        statusText:
          nextSeat === 'S'
            ? `${seat} défausse ${discarded ? discarded.rank : ''}. À vous de piocher ou prendre la défausse.`
            : `${seat} défausse ${discarded ? discarded.rank : ''} · Tour de ${nextSeat}…`,
      },
    });

    if (nextSeat !== 'S') {
      schedule(() => stepCanastaAi(), 520);
    }
  };

  return {
    activeScreen: 'CONCIERGERIE',
    feltTheme: init.feltTheme,
    bankroll: init.bankroll,
    wins: init.wins,
    handsPlayed: init.handsPlayed,
    streak: init.streak,
    muted: init.muted,
    handLogs: [],
    bankrollHistory: [{ step: 0, balance: init.bankroll, label: 'Ouverture' }],

    belote: {
      phase: 'READY',
      dealer: 'W',
      hands: { N: [], E: [], S: [], W: [] },
      selectedSuit: 'spades',
      selectedPoints: 80,
      multiplier: 1,
      taker: null,
      trump: null,
      currentTurn: 'S',
      trick: [],
      nsPoints: 0,
      ewPoints: 0,
      nsTricks: 0,
      ewTricks: 0,
      beloteRebeloteSeat: null,
      beloteAnnounced: false,
      rebeloteAnnounced: false,
      dixDeDerTeam: null,
      statusText: 'Distribuez 8 cartes pour ouvrir les enchères Belote & Coinche.',
    },

    bridge: {
      phase: 'READY',
      dealer: 'S',
      vulnerability: 'NONE',
      hands: { N: [], E: [], S: [], W: [] },
      calls: [],
      currentBidTurn: 'S',
      contract: null,
      dummyExposed: false,
      currentTurn: 'W',
      trick: [],
      nsTricks: 0,
      ewTricks: 0,
      nsHcp: 0,
      statusText: 'Distribuez les 52 cartes pour ouvrir la Boîte d’Enchères Duplicate.',
    },

    canasta: {
      variant: 'classic',
      phase: 'READY',
      dealer: 'W',
      currentTurn: 'S',
      stock: [],
      discardPile: [],
      isFrozen: false,
      hands: { N: [], E: [], S: [], W: [] },
      feet: { N: [], E: [], S: [], W: [] },
      inFoot: { N: false, E: false, S: false, W: false },
      redThrees: { NS: [], EW: [] },
      melds: [],
      nsScore: 0,
      ewScore: 0,
      nsOpened: false,
      ewOpened: false,
      pendingOpeningIds: [],
      pendingOpeningPoints: 0,
      selectedCardIds: [],
      hadMeldedBeforeTurn: false,
      lastRoundBreakdown: null,
      statusText: 'Choisissez votre variante (Classique, Moderne, Hand & Foot, Samba, Bolivia) et distribuez.',
    },

    poker: {
      street: 'READY',
      deck: [],
      playerHole: [],
      aiLeftHole: [],
      aiRightHole: [],
      community: [],
      pot: 0,
      currentBet: 0,
      playerCommitted: 0,
      aiLeftCommitted: 0,
      aiRightCommitted: 0,
      playerFolded: false,
      aiLeftFolded: false,
      aiRightFolded: false,
      playerTurn: false,
      handEvalText: '',
      statusText: 'Cliquez sur Distribuer pour poser l’ante de 100 €.',
    },

    blackjack: {
      phase: 'BETTING',
      shoe: createSixDeckShoe(),
      stagedBet: 0,
      dealerCards: [],
      playerHands: [],
      activeHandIdx: 0,
      statusText: 'Sélectionnez vos jetons ci-dessous puis distribuez.',
      lastNet: null,
    },

    baccarat: {
      phase: 'BETTING',
      betSide: 'banco',
      stagedBet: 0,
      puntoCards: [],
      bancoCards: [],
      puntoTotal: 0,
      bancoTotal: 0,
      winner: null,
      lastNet: null,
      road: [],
      statusText: 'Choisissez Punto (1:1), Banco (0.95:1) ou Égalité (8:1) et misez.',
    },

    setScreen: (screen) => {
      clearTimers();
      epochCounter += 1;
      soundEngine.playUiClick();
      if (screen !== 'CONCIERGERIE') {
        soundEngine.startAmbience(get().feltTheme);
      }
      set({ activeScreen: screen });
    },

    setFeltTheme: (feltTheme) => {
      soundEngine.playUiClick();
      if (get().activeScreen !== 'CONCIERGERIE') {
        soundEngine.startAmbience(feltTheme);
      }
      set({ feltTheme });
      persist();
    },

    cashierTopUp: () => {
      soundEngine.playChipClink(4);
      set((st) => ({
        bankroll: st.bankroll + 50000,
        bankrollHistory: [
          ...st.bankrollHistory,
          { step: st.bankrollHistory.length, balance: st.bankroll + 50000, label: 'Caisse +50k' },
        ].slice(-24),
      }));
      persist();
    },

    toggleMute: () => {
      const next = !get().muted;
      soundEngine.setVolumes(0.35, 0.78, next);
      set({ muted: next });
      persist();
    },

    // ===========================
    // BELOTE & COINCHE ENGINE
    // ===========================
    beloteNewDeal: () => {
      clearTimers();
      epochCounter += 1;
      const s = get();
      if (s.bankroll < 200) return;

      soundEngine.playShuffle();
      const hands = dealEightCardBeloteHands();
      const nextDealer = SEATS[(SEATS.indexOf(s.belote.dealer) + 1) % 4];

      set({
        bankroll: s.bankroll - 200,
        belote: {
          phase: 'AUCTION',
          dealer: nextDealer,
          hands,
          selectedSuit: 'spades',
          selectedPoints: 80,
          multiplier: 1,
          taker: null,
          trump: null,
          currentTurn: 'S',
          trick: [],
          nsPoints: 0,
          ewPoints: 0,
          nsTricks: 0,
          ewTricks: 0,
          beloteRebeloteSeat: null,
          beloteAnnounced: false,
          rebeloteAnnounced: false,
          dixDeDerTeam: null,
          statusText: 'Choisissez votre couleur d’Atout, le palier (80 à 250) et l’éventuelle Coinche.',
        },
      });
    },

    beloteSetSuit: (selectedSuit) => {
      soundEngine.playUiClick();
      set((st) => ({ belote: { ...st.belote, selectedSuit } }));
    },

    beloteSetPoints: (selectedPoints) => {
      soundEngine.playUiClick();
      set((st) => ({ belote: { ...st.belote, selectedPoints } }));
    },

    beloteSetMultiplier: (multiplier) => {
      soundEngine.playUiClick();
      set((st) => ({ belote: { ...st.belote, multiplier } }));
    },

    beloteTakeContract: () => {
      const b = get().belote;
      if (b.phase !== 'AUCTION') return;
      const trump = b.selectedSuit;
      const hasK = b.hands.S.some((c) => c.suit === trump && c.rank === 'K');
      const hasQ = b.hands.S.some((c) => c.suit === trump && c.rank === 'Q');
      const beloteSeat = hasK && hasQ ? 'S' : null;

      soundEngine.playCardFlip();
      set({
        belote: {
          ...b,
          phase: 'PLAYING',
          trump,
          taker: 'S',
          currentTurn: 'S',
          beloteRebeloteSeat: beloteSeat,
          statusText: `Contrat Sud : ${b.selectedPoints === 250 ? 'CAPOT 250' : b.selectedPoints} à l'Atout ${trump.toUpperCase()}${b.multiplier > 1 ? ` (×${b.multiplier})` : ''}. Jouez une carte.`,
        },
      });
    },

    beloteAiAuction: () => {
      const b = get().belote;
      if (b.phase !== 'AUCTION') return;
      // Find best trump suit for West/East or North
      const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
      let bestSeat: SeatId = 'N';
      let bestSuit: Suit = 'hearts';
      let bestScore = -1;
      for (const seat of ['N', 'W', 'E'] as SeatId[]) {
        for (const st of suits) {
          const val = b.hands[seat]
            .filter((c) => c.suit === st)
            .reduce((sum, c) => sum + getBelotePoints(c.rank, true), 0);
          if (val > bestScore) {
            bestScore = val;
            bestSeat = seat;
            bestSuit = st;
          }
        }
      }

      const hasK = b.hands.S.some((c) => c.suit === bestSuit && c.rank === 'K');
      const hasQ = b.hands.S.some((c) => c.suit === bestSuit && c.rank === 'Q');

      soundEngine.playCardFlip();
      set({
        belote: {
          ...b,
          phase: 'PLAYING',
          trump: bestSuit,
          taker: bestSeat,
          selectedSuit: bestSuit,
          selectedPoints: 80,
          currentTurn: 'S',
          beloteRebeloteSeat: hasK && hasQ ? 'S' : null,
          statusText: `${bestSeat} prend à 80 Atout ${bestSuit.toUpperCase()}. À vous d’entamer.`,
        },
      });
    },

    belotePlayCard: (cardId) => {
      const b = get().belote;
      if (b.phase !== 'PLAYING' || b.currentTurn !== 'S' || !b.trump || b.trick.length >= 4) return;
      const legal = getLegalBeloteCards(b.hands.S, b.trick, b.trump, 'S');
      const card = legal.find((c) => c.id === cardId);
      if (!card) return;

      let beloteAnnounced = b.beloteAnnounced;
      let rebeloteAnnounced = b.rebeloteAnnounced;
      let nsPoints = b.nsPoints;
      let note = `Vous jouez ${card.rank}.`;

      if (
        b.beloteRebeloteSeat === 'S' &&
        card.suit === b.trump &&
        (card.rank === 'K' || card.rank === 'Q')
      ) {
        if (!beloteAnnounced) {
          beloteAnnounced = true;
          note = 'Annonce : BELOTE !';
        } else if (!rebeloteAnnounced) {
          rebeloteAnnounced = true;
          nsPoints += 20;
          note = 'Annonce : REBELOTE ! (+20 pts)';
        }
      }

      soundEngine.playCardDeal();
      const nextSeat = SEATS[(SEATS.indexOf('S') + 1) % 4];
      set({
        belote: {
          ...b,
          hands: { ...b.hands, S: b.hands.S.filter((c) => c.id !== cardId) },
          trick: [...b.trick, { seat: 'S', card: { ...card, faceUp: true } }],
          currentTurn: nextSeat,
          beloteAnnounced,
          rebeloteAnnounced,
          nsPoints,
          statusText: note,
        },
      });
      schedule(() => stepBelote(), 400);
    },

    // ===========================
    // BRIDGE CONTRAT ENGINE
    // ===========================
    bridgeNewDeal: () => {
      clearTimers();
      epochCounter += 1;
      const s = get();
      if (s.bankroll < 200) return;

      soundEngine.playShuffle();
      const hands = createBridgeHands();
      const nextDealer = SEATS[(SEATS.indexOf(s.bridge.dealer) + 1) % 4];
      const nextVuln = VULN_CYCLE[(VULN_CYCLE.indexOf(s.bridge.vulnerability) + 1) % 4];
      const nsHcp = calculateHCP(hands.S) + calculateHCP(hands.N);

      set({
        bankroll: s.bankroll - 200,
        bridge: {
          phase: 'AUCTION',
          dealer: nextDealer,
          vulnerability: nextVuln,
          hands,
          calls: [],
          currentBidTurn: nextDealer,
          contract: null,
          dummyExposed: false,
          currentTurn: nextDealer,
          trick: [],
          nsTricks: 0,
          ewTricks: 0,
          nsHcp,
          statusText:
            nextDealer === 'S'
              ? 'Vous êtes Donneur : ouvrez les enchères dans la Boîte ci-dessous.'
              : `${nextDealer} est Donneur… Enchères en cours.`,
        },
      });

      if (nextDealer !== 'S') {
        schedule(() => stepBridgeAuction(), 450);
      }
    },

    bridgePlaceCall: (call) => {
      const br = get().bridge;
      if (br.phase !== 'AUCTION' || br.currentBidTurn !== 'S') return;

      const highest = getHighestContractBid(br.calls);
      if (call.type === 'BID' && (!call.level || !call.strain || !isBidHigher(call.level, call.strain, highest))) {
        return;
      }
      if (call.type === 'DOUBLE' && !canDoubleCall(br.calls, 'S')) return;
      if (call.type === 'REDOUBLE' && !canRedoubleCall(br.calls, 'S')) return;

      soundEngine.playUiClick();
      const fullCall: BridgeBidCall = { ...call, seat: 'S' };
      const nextTurn = SEATS[(SEATS.indexOf('S') + 1) % 4];

      set({
        bridge: {
          ...br,
          calls: [...br.calls, fullCall],
          currentBidTurn: nextTurn,
          statusText:
            call.type === 'BID'
              ? `Sud déclare ${call.level}${call.strain === 'NT' ? 'SA' : call.strain?.toUpperCase()}`
              : call.type === 'PASS'
                ? 'Sud Passe.'
                : call.type === 'DOUBLE'
                  ? 'Sud Contre (X) !'
                  : 'Sud Surcontre (XX) !',
        },
      });
      schedule(() => stepBridgeAuction(), 380);
    },

    bridgePlayCard: (cardId) => {
      const br = get().bridge;
      if (br.phase !== 'PLAYING' || !br.contract || br.trick.length >= 4) return;
      const nsControlsDummy = br.contract.declarer === 'S' || br.contract.declarer === 'N';
      const seat = br.currentTurn;
      const isHuman = seat === 'S' || (seat === 'N' && nsControlsDummy);
      if (!isHuman) return;

      const legal = getLegalBridgeCards(br.hands[seat], br.trick);
      const card = legal.find((c) => c.id === cardId);
      if (!card) return;

      const updatedHands = {
        ...br.hands,
        [seat]: br.hands[seat].filter((c) => c.id !== cardId),
      };
      const dummySeat = br.contract.dummy;
      if (!br.dummyExposed) {
        updatedHands[dummySeat] = updatedHands[dummySeat].map((c) => ({ ...c, faceUp: true }));
      }

      soundEngine.playCardDeal();
      const nextSeat = SEATS[(SEATS.indexOf(seat) + 1) % 4];

      set({
        bridge: {
          ...br,
          hands: updatedHands,
          dummyExposed: true,
          trick: [...br.trick, { seat, card: { ...card, faceUp: true } }],
          currentTurn: nextSeat,
          statusText: `${seat === 'N' ? 'Le Mort' : 'Sud'} joue ${card.rank}.`,
        },
      });
      schedule(() => stepBridgePlay(), 380);
    },

    // ===========================
    // CANASTA & VARIANTS ENGINE
    // ===========================
    canastaSetVariant: (variant) => {
      clearTimers();
      epochCounter += 1;
      soundEngine.playUiClick();
      const spec = CANASTA_VARIANTS[variant];
      set((st) => ({
        canasta: {
          ...st.canasta,
          variant,
          phase: 'READY',
          stock: [],
          discardPile: [],
          isFrozen: false,
          hands: { N: [], E: [], S: [], W: [] },
          feet: { N: [], E: [], S: [], W: [] },
          inFoot: { N: false, E: false, S: false, W: false },
          redThrees: { NS: [], EW: [] },
          melds: [],
          nsScore: 0,
          ewScore: 0,
          nsOpened: false,
          ewOpened: false,
          pendingOpeningIds: [],
          pendingOpeningPoints: 0,
          selectedCardIds: [],
          lastRoundBreakdown: null,
          statusText: `${spec.name} sélectionnée : ${spec.summary}`,
        },
      }));
    },

    canastaNewDeal: () => {
      clearTimers();
      epochCounter += 1;
      const s = get();
      if (s.bankroll < 200) return;

      const c = s.canasta;
      const spec = CANASTA_VARIANTS[c.variant];
      soundEngine.playShuffle();

      // Reset match totals if a partnership already reached target score
      const matchReset =
        c.nsScore >= spec.targetMatchScore || c.ewScore >= spec.targetMatchScore;
      const baseNsScore = matchReset ? 0 : c.nsScore;
      const baseEwScore = matchReset ? 0 : c.ewScore;

      let stock = createCanastaShoe(c.variant);
      const hands: Record<SeatId, CardData[]> = { N: [], E: [], S: [], W: [] };
      const feet: Record<SeatId, CardData[]> = { N: [], E: [], S: [], W: [] };
      const redThrees: { NS: CardData[]; EW: CardData[] } = { NS: [], EW: [] };

      for (const seat of CANASTA_SEATS) {
        const rawHand = stock.splice(-spec.handSize);
        const team: 'NS' | 'EW' = seat === 'N' || seat === 'S' ? 'NS' : 'EW';
        const ext = extractRedThreesFromCards(rawHand, stock, seat === 'S');
        stock = ext.stock;
        hands[seat] = ext.hand;
        redThrees[team].push(...ext.redThrees);

        if (spec.hasFoot) {
          feet[seat] = stock.splice(-spec.footSize).map((x) => ({ ...x, faceUp: false }));
        }
      }

      // Flip initial discard (never start frozen on a Red 3; replace if Red 3)
      let firstDiscard = stock.pop()!;
      while (firstDiscard && firstDiscard.rank === '3' && (firstDiscard.suit === 'hearts' || firstDiscard.suit === 'diamonds') && stock.length > 0) {
        redThrees.NS.push({ ...firstDiscard, faceUp: true });
        firstDiscard = stock.pop()!;
      }
      const discardPile = firstDiscard ? [{ ...firstDiscard, faceUp: true }] : [];
      const isFrozen = firstDiscard ? isWildCard(firstDiscard) || isBlackThree(firstDiscard) : false;

      set({
        bankroll: s.bankroll - 200,
        canasta: {
          ...c,
          phase: 'DRAW',
          dealer: CANASTA_SEATS[(CANASTA_SEATS.indexOf(c.dealer) + 1) % 4],
          currentTurn: 'S',
          stock,
          discardPile,
          isFrozen,
          hands,
          feet,
          inFoot: { N: false, E: false, S: false, W: false },
          redThrees,
          melds: [],
          nsScore: baseNsScore,
          ewScore: baseEwScore,
          nsOpened: false,
          ewOpened: false,
          pendingOpeningIds: [],
          pendingOpeningPoints: 0,
          selectedCardIds: [],
          hadMeldedBeforeTurn: false,
          lastRoundBreakdown: null,
          statusText: `Donne ${spec.shortName} prête ! Piochez ${spec.drawCount} carte${spec.drawCount > 1 ? 's' : ''} ou prenez la défausse.`,
        },
      });
    },

    canastaDrawStock: () => {
      const c = get().canasta;
      if (c.phase !== 'DRAW' || c.currentTurn !== 'S') return;
      const spec = CANASTA_VARIANTS[c.variant];
      if (c.stock.length === 0) {
        finishCanastaRound(null, false, 'Pioche épuisée !');
        return;
      }

      let stock = [...c.stock];
      const rawDrawn: CardData[] = [];
      for (let i = 0; i < spec.drawCount && stock.length > 0; i++) {
        rawDrawn.push(stock.pop()!);
      }
      const ext = extractRedThreesFromCards(rawDrawn, stock, true);
      stock = ext.stock;
      const nextHand = sortCanastaHand([...c.hands.S, ...ext.hand]);
      const hadMeldedBeforeTurn = c.melds.some((m) => m.team === 'NS');

      soundEngine.playCardDeal();
      set({
        canasta: {
          ...c,
          phase: 'MELD_DISCARD',
          stock,
          hands: { ...c.hands, S: nextHand },
          redThrees: { ...c.redThrees, NS: [...c.redThrees.NS, ...ext.redThrees] },
          pendingOpeningIds: [],
          pendingOpeningPoints: 0,
          hadMeldedBeforeTurn,
          statusText:
            ext.redThrees.length > 0
              ? `3 Rouge (+100) exposé et remplacé ! Posez vos combinaisons ou sélectionnez 1 carte à défausser.`
              : `Vous avez pioché ${spec.drawCount} carte${spec.drawCount > 1 ? 's' : ''}. Posez vos combinaisons ou défaussez 1 carte.`,
        },
      });
    },

    canastaTakePile: () => {
      const c = get().canasta;
      if (c.phase !== 'DRAW' || c.currentTurn !== 'S') return;
      const nsMelds = c.melds.filter((m) => m.team === 'NS');
      const requiredPts = getRequiredInitialMeld(c.nsScore, c.variant);
      const plan = evaluateDiscardPickup(
        c.hands.S,
        c.discardPile,
        c.isFrozen,
        c.nsOpened,
        requiredPts,
        nsMelds
      );

      if (!plan.canTake) {
        soundEngine.playUiClick();
        set({ canasta: { ...c, statusText: plan.reason || 'Prise de défausse impossible.' } });
        return;
      }

      const top = { ...c.discardPile[c.discardPile.length - 1], faceUp: true };
      const restPile = c.discardPile.slice(0, -1).map((x) => ({ ...x, faceUp: true }));
      const usedSet = new Set(plan.usedHandCardIds);
      const usedHandCards = c.hands.S.filter((x) => usedSet.has(x.id));
      let nextMelds = [...c.melds];
      let nsOpened = c.nsOpened;

      if (plan.mode === 'extend_meld' && plan.targetMeldId) {
        nextMelds = nextMelds.map((m) => {
          if (m.id !== plan.targetMeldId) return m;
          const nextCards = [...m.cards, top];
          const meta = computeMeldMeta(nextCards, m.kind, c.variant, m.rankLabel);
          return { ...m, cards: nextCards, ...meta };
        });
      } else {
        const combined = [top, ...usedHandCards];
        const meta = computeMeldMeta(combined, 'rank', c.variant, top.rank);
        nextMelds.push({
          id: `meld_${Date.now()}`,
          team: 'NS',
          kind: 'rank',
          rankLabel: top.rank,
          cards: combined,
          ...meta,
        });
        nsOpened = true;
      }

      const ext = extractRedThreesFromCards(restPile, c.stock, true);
      const nextHand = sortCanastaHand([
        ...c.hands.S.filter((x) => !usedSet.has(x.id)),
        ...ext.hand,
      ]);

      soundEngine.playChipClink(3);
      set({
        canasta: {
          ...c,
          phase: 'MELD_DISCARD',
          stock: ext.stock,
          discardPile: [],
          isFrozen: false,
          hands: { ...c.hands, S: nextHand },
          redThrees: { ...c.redThrees, NS: [...c.redThrees.NS, ...ext.redThrees] },
          melds: nextMelds,
          nsOpened,
          selectedCardIds: [],
          pendingOpeningIds: [],
          pendingOpeningPoints: 0,
          hadMeldedBeforeTurn: c.melds.some((m) => m.team === 'NS'),
          statusText: `Défausse récupérée (${c.discardPile.length} cartes) et combinée sur ${top.rank} ! Posez ou défaussez 1 carte.`,
        },
      });
    },

    canastaToggleSelectCard: (cardId) => {
      const c = get().canasta;
      if (c.phase !== 'MELD_DISCARD' || c.currentTurn !== 'S') return;
      soundEngine.playUiClick();
      const exists = c.selectedCardIds.includes(cardId);
      set({
        canasta: {
          ...c,
          selectedCardIds: exists
            ? c.selectedCardIds.filter((id) => id !== cardId)
            : [...c.selectedCardIds, cardId],
        },
      });
    },

    canastaMeldSelected: () => {
      const c = get().canasta;
      if (c.phase !== 'MELD_DISCARD' || c.currentTurn !== 'S') return;
      const spec = CANASTA_VARIANTS[c.variant];
      const selected = c.hands.S.filter((x) => c.selectedCardIds.includes(x.id));
      const evalRes = evaluateSelectedNewMeld(selected, c.variant);

      if (!evalRes.valid || !evalRes.sortedCards || !evalRes.kind || !evalRes.rankLabel) {
        set({ canasta: { ...c, statusText: evalRes.error || 'Combinaison invalide.' } });
        return;
      }

      const remaining = c.hands.S.filter((x) => !c.selectedCardIds.includes(x.id));
      const nsMelds = c.melds.filter((m) => m.team === 'NS');
      const meta = computeMeldMeta(evalRes.sortedCards, evalRes.kind, c.variant, evalRes.rankLabel);
      const newMeld: CanastaMeld = {
        id: `meld_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        team: 'NS',
        kind: evalRes.kind,
        rankLabel: evalRes.rankLabel,
        suit: evalRes.suit,
        cards: evalRes.sortedCards.map((x) => ({ ...x, faceUp: true })),
        ...meta,
      };

      const nextMelds = [...c.melds, newMeld];
      const requiredOpen = getRequiredInitialMeld(c.nsScore, c.variant);
      const nextPendingPts = c.nsOpened ? 0 : c.pendingOpeningPoints + evalRes.points;
      const nextPendingIds = c.nsOpened ? [] : [...c.pendingOpeningIds, newMeld.id];
      const nowOpened = c.nsOpened || nextPendingPts >= requiredOpen;

      // Check Hand & Foot foot pickup if hand emptied
      let nextHands = { ...c.hands, S: remaining };
      let nextFeet = { ...c.feet };
      let nextInFoot = { ...c.inFoot };
      let nextStock = [...c.stock];
      let nextRedNs = [...c.redThrees.NS];

      if (spec.hasFoot && remaining.length === 0 && !c.inFoot.S && c.feet.S.length > 0) {
        const footExt = extractRedThreesFromCards(c.feet.S, nextStock, true);
        nextStock = footExt.stock;
        nextRedNs = [...nextRedNs, ...footExt.redThrees];
        nextHands = { ...nextHands, S: footExt.hand };
        nextFeet = { ...nextFeet, S: [] };
        nextInFoot = { ...nextInFoot, S: true };
      }

      // Check immediate Going Out if 0 cards remain
      if (nextHands.S.length === 0) {
        const goRes = canTeamGoOut([...nsMelds, newMeld], c.variant);
        if (!nowOpened || !goRes.allowed) {
          set({
            canasta: {
              ...c,
              statusText: !nowOpened
                ? `Ouverture minimale de ${requiredOpen} pts non atteinte.`
                : goRes.reason || 'Impossible de sortir maintenant (gardez au moins 1 carte à défausser).',
            },
          });
          return;
        }
        set({
          canasta: {
            ...c,
            stock: nextStock,
            hands: nextHands,
            feet: nextFeet,
            inFoot: nextInFoot,
            redThrees: { ...c.redThrees, NS: nextRedNs },
            melds: nextMelds,
            nsOpened: true,
            pendingOpeningIds: [],
            pendingOpeningPoints: 0,
            selectedCardIds: [],
          },
        });
        finishCanastaRound('NS', !c.hadMeldedBeforeTurn, 'Vous posez votre dernière carte et sortez !');
        return;
      }

      soundEngine.playChipClink(2);
      set({
        canasta: {
          ...c,
          stock: nextStock,
          hands: nextHands,
          feet: nextFeet,
          inFoot: nextInFoot,
          redThrees: { ...c.redThrees, NS: nextRedNs },
          melds: nextMelds,
          nsOpened: nowOpened,
          pendingOpeningIds: nowOpened ? [] : nextPendingIds,
          pendingOpeningPoints: nowOpened ? 0 : nextPendingPts,
          selectedCardIds: [],
          statusText: nowOpened
            ? `Combinaison ${evalRes.rankLabel} posée (+${evalRes.points} pts).`
            : `Ouverture en cours : ${nextPendingPts} / ${requiredOpen} pts (posez encore ${requiredOpen - nextPendingPts} pts ou annulez).`,
        },
      });
    },

    canastaExtendMeld: (meldId) => {
      const c = get().canasta;
      if (c.phase !== 'MELD_DISCARD' || c.currentTurn !== 'S') return;
      const target = c.melds.find((m) => m.id === meldId && m.team === 'NS');
      if (!target) return;

      const selected = c.hands.S.filter((x) => c.selectedCardIds.includes(x.id));
      const check = canAddCardsToMeld(selected, target, c.variant);
      if (!check.valid || !check.nextCards) {
        set({ canasta: { ...c, statusText: check.error || 'Extension invalide.' } });
        return;
      }

      const spec = CANASTA_VARIANTS[c.variant];
      const remaining = c.hands.S.filter((x) => !c.selectedCardIds.includes(x.id));
      const addedPts = selected.reduce((sum, x) => sum + getCanastaCardPoints(x, c.variant), 0);
      const nextMeta = computeMeldMeta(check.nextCards, target.kind, c.variant, target.rankLabel);
      const nextMelds = c.melds.map((m) =>
        m.id === meldId ? { ...m, cards: check.nextCards!.map((x) => ({ ...x, faceUp: true })), ...nextMeta } : m
      );

      let nextHands = { ...c.hands, S: remaining };
      let nextFeet = { ...c.feet };
      let nextInFoot = { ...c.inFoot };
      let nextStock = [...c.stock];
      let nextRedNs = [...c.redThrees.NS];

      if (spec.hasFoot && remaining.length === 0 && !c.inFoot.S && c.feet.S.length > 0) {
        const footExt = extractRedThreesFromCards(c.feet.S, nextStock, true);
        nextStock = footExt.stock;
        nextRedNs = [...nextRedNs, ...footExt.redThrees];
        nextHands = { ...nextHands, S: footExt.hand };
        nextFeet = { ...nextFeet, S: [] };
        nextInFoot = { ...nextInFoot, S: true };
      }

      if (nextHands.S.length === 0) {
        const goRes = canTeamGoOut(nextMelds.filter((m) => m.team === 'NS'), c.variant);
        if (!c.nsOpened || !goRes.allowed) {
          set({
            canasta: {
              ...c,
              statusText: goRes.reason || 'Impossible de vider votre main sans respecter les Canastas requises.',
            },
          });
          return;
        }
        set({
          canasta: {
            ...c,
            stock: nextStock,
            hands: nextHands,
            feet: nextFeet,
            inFoot: nextInFoot,
            redThrees: { ...c.redThrees, NS: nextRedNs },
            melds: nextMelds,
            selectedCardIds: [],
          },
        });
        finishCanastaRound('NS', !c.hadMeldedBeforeTurn, 'Vous complétez vos combinaisons et sortez !');
        return;
      }

      const requiredOpen = getRequiredInitialMeld(c.nsScore, c.variant);
      const nextPendingPts = c.nsOpened ? 0 : c.pendingOpeningPoints + addedPts;
      const nowOpened = c.nsOpened || nextPendingPts >= requiredOpen;

      soundEngine.playChipClink(nextMeta.isCanasta ? 4 : 1);
      set({
        canasta: {
          ...c,
          stock: nextStock,
          hands: nextHands,
          feet: nextFeet,
          inFoot: nextInFoot,
          redThrees: { ...c.redThrees, NS: nextRedNs },
          melds: nextMelds,
          nsOpened: nowOpened,
          pendingOpeningIds: nowOpened ? [] : c.pendingOpeningIds,
          pendingOpeningPoints: nowOpened ? 0 : nextPendingPts,
          selectedCardIds: [],
          statusText: nextMeta.isCanasta
            ? `★ CANASTA ${nextMeta.isPure ? 'PURE' : 'IMPURE'} sur ${target.rankLabel} (+${nextMeta.bonus} pts) !`
            : `Carte(s) ajoutée(s) à ${target.rankLabel}.`,
        },
      });
    },

    canastaCancelPendingOpening: () => {
      const c = get().canasta;
      if (c.pendingOpeningIds.length === 0) return;
      const pendingSet = new Set(c.pendingOpeningIds);
      const returnedCards = c.melds
        .filter((m) => pendingSet.has(m.id))
        .flatMap((m) => m.cards);
      const nextMelds = c.melds.filter((m) => !pendingSet.has(m.id));
      const nextHand = sortCanastaHand([...c.hands.S, ...returnedCards]);
      soundEngine.playUiClick();
      set({
        canasta: {
          ...c,
          hands: { ...c.hands, S: nextHand },
          melds: nextMelds,
          pendingOpeningIds: [],
          pendingOpeningPoints: 0,
          selectedCardIds: [],
          statusText: 'Ouverture annulée — cartes remises en main.',
        },
      });
    },

    canastaDiscardSelected: () => {
      const c = get().canasta;
      if (c.phase !== 'MELD_DISCARD' || c.currentTurn !== 'S') return;

      if (c.pendingOpeningIds.length > 0 && !c.nsOpened) {
        const req = getRequiredInitialMeld(c.nsScore, c.variant);
        set({
          canasta: {
            ...c,
            statusText: `Ouverture incomplète (${c.pendingOpeningPoints}/${req} pts) : ajoutez des points ou cliquez Annuler Ouverture.`,
          },
        });
        return;
      }

      if (c.selectedCardIds.length !== 1) {
        set({
          canasta: {
            ...c,
            statusText: 'Sélectionnez exactement 1 carte en main à défausser.',
          },
        });
        return;
      }

      const card = c.hands.S.find((x) => x.id === c.selectedCardIds[0]);
      if (!card) return;

      const remaining = c.hands.S.filter((x) => x.id !== card.id);
      const spec = CANASTA_VARIANTS[c.variant];
      const discardPile = [...c.discardPile, { ...card, faceUp: true }];
      const isFrozen = c.isFrozen || isWildCard(card) || isBlackThree(card);

      // Hand & Foot pickup if discarding last Hand card
      if (spec.hasFoot && remaining.length === 0 && !c.inFoot.S && c.feet.S.length > 0) {
        const footExt = extractRedThreesFromCards(c.feet.S, c.stock, true);
        soundEngine.playCardFlip();
        set({
          canasta: {
            ...c,
            phase: 'DRAW',
            currentTurn: 'W',
            stock: footExt.stock,
            discardPile,
            isFrozen,
            hands: { ...c.hands, S: footExt.hand },
            feet: { ...c.feet, S: [] },
            inFoot: { ...c.inFoot, S: true },
            redThrees: { ...c.redThrees, NS: [...c.redThrees.NS, ...footExt.redThrees] },
            selectedCardIds: [],
            statusText: 'Main vidée — Vous prenez votre Pied (11 cartes) ! Tour d’Ouest…',
          },
        });
        schedule(() => stepCanastaAi(), 500);
        return;
      }

      // Check Going Out on discard
      if (remaining.length === 0) {
        const goRes = canTeamGoOut(
          c.melds.filter((m) => m.team === 'NS'),
          c.variant
        );
        if (!goRes.allowed) {
          set({
            canasta: {
              ...c,
              statusText: goRes.reason || 'Impossible de défausser votre dernière carte sans les Canastas requises.',
            },
          });
          return;
        }
        set({
          canasta: {
            ...c,
            discardPile,
            isFrozen,
            hands: { ...c.hands, S: [] },
            selectedCardIds: [],
          },
        });
        finishCanastaRound('NS', !c.hadMeldedBeforeTurn, 'Vous défaussez votre dernière carte et sortez !');
        return;
      }

      soundEngine.playCardDeal();
      set({
        canasta: {
          ...c,
          phase: 'DRAW',
          currentTurn: 'W',
          discardPile,
          isFrozen,
          hands: { ...c.hands, S: remaining },
          selectedCardIds: [],
          statusText: `Vous défaussez ${card.rank}. Tour d’Ouest…`,
        },
      });
      schedule(() => stepCanastaAi(), 500);
    },

    // ===========================
    // POKER HOLD'EM NO-LIMIT
    // ===========================
    pokerStartHand: () => {
      const s = get();
      const ante = 100;
      if (s.bankroll < ante) return;

      soundEngine.playShuffle();
      const deck = createShuffledPokerDeck(true);
      const playerHole = [deck[0], deck[1]];
      const aiLeftHole = [{ ...deck[2], faceUp: false }, { ...deck[3], faceUp: false }];
      const aiRightHole = [{ ...deck[4], faceUp: false }, { ...deck[5], faceUp: false }];
      const ev = evaluateBestHoldemHand(playerHole, []);

      set({
        bankroll: s.bankroll - ante,
        poker: {
          street: 'PREFLOP',
          deck: deck.slice(6),
          playerHole,
          aiLeftHole,
          aiRightHole,
          community: [],
          pot: ante * 3,
          currentBet: 0,
          playerCommitted: ante,
          aiLeftCommitted: ante,
          aiRightCommitted: ante,
          playerFolded: false,
          aiLeftFolded: false,
          aiRightFolded: false,
          playerTurn: true,
          handEvalText: ev.label,
          statusText: 'Pré-Flop : Parole (Check), Miser/Relancer ou Se coucher.',
        },
      });
    },

    pokerAction: (action, raiseAmount = 200) => {
      const s = get();
      const pk = s.poker;
      if (!pk.playerTurn || pk.street === 'READY' || pk.street === 'SHOWDOWN') return;

      let bankroll = s.bankroll;
      let pot = pk.pot;
      let playerCommitted = pk.playerCommitted;
      let currentBet = pk.currentBet;
      let aiLeftFolded = pk.aiLeftFolded;
      let aiRightFolded = pk.aiRightFolded;
      let aiLeftCommitted = pk.aiLeftCommitted;
      let aiRightCommitted = pk.aiRightCommitted;

      if (action === 'fold') {
        set({
          poker: {
            ...pk,
            street: 'SHOWDOWN',
            playerFolded: true,
            playerTurn: false,
            aiLeftHole: pk.aiLeftHole.map((c) => ({ ...c, faceUp: true })),
            aiRightHole: pk.aiRightHole.map((c) => ({ ...c, faceUp: true })),
            statusText: 'Vous vous couchez — Le pot revient à la table.',
          },
        });
        logResult('poker', 'Hold’em · Couché', -playerCommitted, false);
        return;
      }

      if (action === 'call') {
        const callNeed = Math.min(bankroll, Math.max(0, currentBet - playerCommitted));
        bankroll -= callNeed;
        playerCommitted += callNeed;
        pot += callNeed;
        soundEngine.playChipClink(1);
      } else if (action === 'raise') {
        const add = Math.min(bankroll, raiseAmount + Math.max(0, currentBet - playerCommitted));
        bankroll -= add;
        playerCommitted += add;
        pot += add;
        currentBet = Math.max(currentBet, playerCommitted);
        soundEngine.playChipClink(3);
      } else {
        soundEngine.playUiClick();
      }

      const notes: string[] = [];
      if (!aiLeftFolded) {
        const need = Math.max(0, currentBet - aiLeftCommitted);
        const dec = decidePokerAiAction(pk.aiLeftHole, pk.community, pk.street, need, 4000, 0.45);
        if (dec.action === 'fold') {
          aiLeftFolded = true;
          notes.push('Valérie se couche');
        } else {
          const paid = dec.action === 'raise' ? dec.amount : need;
          aiLeftCommitted += paid;
          pot += paid;
          notes.push(paid > 0 ? `Valérie suit ${paid} €` : 'Valérie parole');
        }
      }

      if (!aiRightFolded) {
        const need = Math.max(0, currentBet - aiRightCommitted);
        const dec = decidePokerAiAction(pk.aiRightHole, pk.community, pk.street, need, 4000, 0.7);
        if (dec.action === 'fold') {
          aiRightFolded = true;
          notes.push('Viktor se couche');
        } else {
          const paid = dec.action === 'raise' ? dec.amount : need;
          aiRightCommitted += paid;
          pot += paid;
          notes.push(paid > 0 ? `Viktor suit ${paid} €` : 'Viktor parole');
        }
      }

      if (aiLeftFolded && aiRightFolded) {
        set({
          bankroll: bankroll + pot,
          poker: {
            ...pk,
            street: 'SHOWDOWN',
            pot,
            playerCommitted,
            aiLeftFolded: true,
            aiRightFolded: true,
            playerTurn: false,
            statusText: `Tous les adversaires se couchent ! Vous remportez ${pot.toLocaleString('fr-FR')} €.`,
          },
        });
        logResult('poker', 'Hold’em · Pot remporté par abandon', pot - playerCommitted, true);
        return;
      }

      let nextStreet: PokerStreet = pk.street;
      let nextCommunity = [...pk.community];
      let nextDeck = [...pk.deck];

      if (pk.street === 'PREFLOP') {
        nextStreet = 'FLOP';
        nextCommunity = nextDeck.slice(0, 3);
        nextDeck = nextDeck.slice(3);
      } else if (pk.street === 'FLOP') {
        nextStreet = 'TURN';
        nextCommunity = [...nextCommunity, nextDeck[0]];
        nextDeck = nextDeck.slice(1);
      } else if (pk.street === 'TURN') {
        nextStreet = 'RIVER';
        nextCommunity = [...nextCommunity, nextDeck[0]];
        nextDeck = nextDeck.slice(1);
      } else if (pk.street === 'RIVER') {
        nextStreet = 'SHOWDOWN';
      }

      soundEngine.playCardDeal();
      const pEval = evaluateBestHoldemHand(pk.playerHole, nextCommunity);

      if (nextStreet === 'SHOWDOWN') {
        const lEval = aiLeftFolded ? null : evaluateBestHoldemHand(pk.aiLeftHole, nextCommunity);
        const rEval = aiRightFolded ? null : evaluateBestHoldemHand(pk.aiRightHole, nextCommunity);
        const best = Math.max(pEval.score, lEval?.score ?? -1, rEval?.score ?? -1);
        const won = pEval.score === best;
        const returned = won ? pot : 0;

        set({
          bankroll: bankroll + returned,
          poker: {
            ...pk,
            street: 'SHOWDOWN',
            deck: nextDeck,
            community: nextCommunity,
            aiLeftHole: pk.aiLeftHole.map((c) => ({ ...c, faceUp: true })),
            aiRightHole: pk.aiRightHole.map((c) => ({ ...c, faceUp: true })),
            pot,
            currentBet,
            playerCommitted,
            aiLeftCommitted,
            aiRightCommitted,
            aiLeftFolded,
            aiRightFolded,
            playerTurn: false,
            handEvalText: pEval.label,
            statusText: won
              ? `Abattage gagnant (${pEval.label}) ! Vous empochez ${pot.toLocaleString('fr-FR')} €.`
              : `Abattage perdu avec ${pEval.label} (${notes.join(' · ')}).`,
          },
        });
        logResult('poker', `Hold’em · ${pEval.label}`, returned - playerCommitted, won);
        return;
      }

      set({
        bankroll,
        poker: {
          ...pk,
          street: nextStreet,
          deck: nextDeck,
          community: nextCommunity,
          pot,
          currentBet: playerCommitted,
          playerCommitted,
          aiLeftCommitted,
          aiRightCommitted,
          aiLeftFolded,
          aiRightFolded,
          playerTurn: true,
          handEvalText: pEval.label,
          statusText: `${nextStreet} : ${notes.join(' · ')}`,
        },
      });
    },

    // ===========================
    // BLACKJACK 21 ROYAL
    // ===========================
    bjAddChip: (val) => {
      const s = get();
      if (s.blackjack.phase !== 'BETTING' || s.bankroll < val) return;
      soundEngine.playChipClink(2);
      set({
        bankroll: s.bankroll - val,
        blackjack: { ...s.blackjack, stagedBet: s.blackjack.stagedBet + val },
      });
    },

    bjClearBet: () => {
      const s = get();
      if (s.blackjack.phase !== 'BETTING' || s.blackjack.stagedBet <= 0) return;
      soundEngine.playUiClick();
      set({
        bankroll: s.bankroll + s.blackjack.stagedBet,
        blackjack: { ...s.blackjack, stagedBet: 0 },
      });
    },

    bjDeal: () => {
      const s = get();
      const bj = s.blackjack;
      if (bj.phase !== 'BETTING' || bj.stagedBet <= 0) return;

      let shoe = bj.shoe.length < 40 ? createSixDeckShoe() : [...bj.shoe];
      const p1 = { ...shoe.pop()!, faceUp: true };
      const d1 = { ...shoe.pop()!, faceUp: true };
      const p2 = { ...shoe.pop()!, faceUp: true };
      const d2 = { ...shoe.pop()!, faceUp: false };

      const hand: BlackjackHand = {
        id: `bj_${Date.now()}`,
        cards: [p1, p2],
        bet: bj.stagedBet,
        isStood: false,
        isDoubled: false,
        isFromSplit: false,
      };
      const dealer = [d1, d2];
      soundEngine.playCardDeal();

      const pEval = evaluateBlackjackHand(hand.cards);
      const dEval = evaluateBlackjackHand(dealer);

      if (pEval.isNaturalBlackjack || dEval.isNaturalBlackjack) {
        const revealed = dealer.map((c) => ({ ...c, faceUp: true }));
        set({
          blackjack: {
            ...bj,
            shoe,
            stagedBet: 0,
            dealerCards: revealed,
            playerHands: [hand],
            activeHandIdx: 0,
            lastNet: null,
          },
        });
        settleBlackjack([hand], revealed);
        return;
      }

      set({
        blackjack: {
          ...bj,
          phase: 'PLAYER_TURN',
          shoe,
          stagedBet: 0,
          dealerCards: dealer,
          playerHands: [hand],
          activeHandIdx: 0,
          lastNet: null,
          statusText: 'À vous de jouer : Tirer, Rester, Doubler ou Séparer.',
        },
      });
    },

    bjHit: () => {
      const s = get();
      const bj = s.blackjack;
      if (bj.phase !== 'PLAYER_TURN') return;
      const shoe = [...bj.shoe];
      const card = { ...shoe.pop()!, faceUp: true };
      soundEngine.playCardDeal();

      const hands = bj.playerHands.map((h, i) =>
        i === bj.activeHandIdx ? { ...h, cards: [...h.cards, card] } : h
      );
      const cur = hands[bj.activeHandIdx];
      const ev = evaluateBlackjackHand(cur.cards, { isFromSplit: cur.isFromSplit });

      if (ev.isBust || ev.total === 21) {
        const stood = hands.map((h, i) =>
          i === bj.activeHandIdx ? { ...h, isStood: true } : h
        );
        if (bj.activeHandIdx + 1 < stood.length) {
          set({
            blackjack: {
              ...bj,
              shoe,
              playerHands: stood,
              activeHandIdx: bj.activeHandIdx + 1,
            },
          });
        } else {
          runBlackjackDealer(stood, bj.dealerCards, shoe);
        }
      } else {
        set({ blackjack: { ...bj, shoe, playerHands: hands } });
      }
    },

    bjStand: () => {
      const bj = get().blackjack;
      if (bj.phase !== 'PLAYER_TURN') return;
      soundEngine.playUiClick();
      const stood = bj.playerHands.map((h, i) =>
        i === bj.activeHandIdx ? { ...h, isStood: true } : h
      );
      if (bj.activeHandIdx + 1 < stood.length) {
        set({
          blackjack: { ...bj, playerHands: stood, activeHandIdx: bj.activeHandIdx + 1 },
        });
      } else {
        runBlackjackDealer(stood, bj.dealerCards, bj.shoe);
      }
    },

    bjDouble: () => {
      const s = get();
      const bj = s.blackjack;
      const cur = bj.playerHands[bj.activeHandIdx];
      if (bj.phase !== 'PLAYER_TURN' || !cur || cur.cards.length !== 2 || s.bankroll < cur.bet) return;

      const shoe = [...bj.shoe];
      const card = { ...shoe.pop()!, faceUp: true };
      soundEngine.playChipClink(2);

      const hands = bj.playerHands.map((h, i) =>
        i === bj.activeHandIdx
          ? { ...h, bet: h.bet * 2, isDoubled: true, isStood: true, cards: [...h.cards, card] }
          : h
      );
      set({ bankroll: s.bankroll - cur.bet });
      if (bj.activeHandIdx + 1 < hands.length) {
        set({
          blackjack: { ...bj, shoe, playerHands: hands, activeHandIdx: bj.activeHandIdx + 1 },
        });
      } else {
        runBlackjackDealer(hands, bj.dealerCards, shoe);
      }
    },

    bjSplit: () => {
      const s = get();
      const bj = s.blackjack;
      const cur = bj.playerHands[0];
      if (
        bj.phase !== 'PLAYER_TURN' ||
        bj.playerHands.length !== 1 ||
        !canSplitCards(cur.cards) ||
        s.bankroll < cur.bet
      ) {
        return;
      }

      const shoe = [...bj.shoe];
      const c1 = { ...shoe.pop()!, faceUp: true };
      const c2 = { ...shoe.pop()!, faceUp: true };
      soundEngine.playCardDeal();

      const h1: BlackjackHand = {
        id: `${cur.id}_1`,
        cards: [cur.cards[0], c1],
        bet: cur.bet,
        isStood: false,
        isDoubled: false,
        isFromSplit: true,
      };
      const h2: BlackjackHand = {
        id: `${cur.id}_2`,
        cards: [cur.cards[1], c2],
        bet: cur.bet,
        isStood: false,
        isDoubled: false,
        isFromSplit: true,
      };

      set({
        bankroll: s.bankroll - cur.bet,
        blackjack: {
          ...bj,
          shoe,
          playerHands: [h1, h2],
          activeHandIdx: 0,
          statusText: 'Main séparée : jouez la Main 1 puis la Main 2.',
        },
      });
    },

    bjNewHand: () => {
      const bj = get().blackjack;
      soundEngine.playUiClick();
      set({
        blackjack: {
          ...bj,
          phase: 'BETTING',
          stagedBet: 0,
          dealerCards: [],
          playerHands: [],
          activeHandIdx: 0,
          lastNet: null,
          statusText: 'Placez vos jetons puis cliquez sur Distribuer.',
        },
      });
    },

    // ===========================
    // BACCARAT PUNTO BANCO
    // ===========================
    bacSetSide: (betSide) => {
      const bac = get().baccarat;
      if (bac.phase !== 'BETTING') return;
      soundEngine.playUiClick();
      set({ baccarat: { ...bac, betSide } });
    },

    bacAddChip: (val) => {
      const s = get();
      if (s.baccarat.phase !== 'BETTING' || s.bankroll < val) return;
      soundEngine.playChipClink(2);
      set({
        bankroll: s.bankroll - val,
        baccarat: { ...s.baccarat, stagedBet: s.baccarat.stagedBet + val },
      });
    },

    bacClearBet: () => {
      const s = get();
      if (s.baccarat.phase !== 'BETTING' || s.baccarat.stagedBet <= 0) return;
      soundEngine.playUiClick();
      set({
        bankroll: s.bankroll + s.baccarat.stagedBet,
        baccarat: { ...s.baccarat, stagedBet: 0 },
      });
    },

    bacDeal: () => {
      const s = get();
      const bac = s.baccarat;
      if (bac.phase !== 'BETTING' || bac.stagedBet <= 0) return;

      const deck = createShuffledPokerDeck(true);
      const puntoCards = [deck[0], deck[2]];
      const bancoCards = [deck[1], deck[3]];
      let cursor = 4;

      let pTot = evaluateBaccaratTotal(puntoCards);
      let bTot = evaluateBaccaratTotal(bancoCards);
      const natural = pTot >= 8 || bTot >= 8;

      if (!natural) {
        let p3: CardData | null = null;
        if (pTot <= 5) {
          p3 = deck[cursor++];
          puntoCards.push(p3);
          pTot = evaluateBaccaratTotal(puntoCards);
        }
        if (shouldBancoDrawThird(bTot, p3)) {
          bancoCards.push(deck[cursor++]);
          bTot = evaluateBaccaratTotal(bancoCards);
        }
      }

      const settled = settleBaccaratBet(bac.betSide, bac.stagedBet, pTot, bTot);
      const entry: BaccaratRoadEntry = {
        id: `road_${Date.now()}`,
        winner: settled.winner,
        puntoTotal: pTot,
        bancoTotal: bTot,
        natural,
      };

      soundEngine.playCardDeal();
      set({
        bankroll: s.bankroll + settled.returned,
        baccarat: {
          ...bac,
          phase: 'ROUND_OVER',
          stagedBet: 0,
          puntoCards,
          bancoCards,
          puntoTotal: pTot,
          bancoTotal: bTot,
          winner: settled.winner,
          lastNet: settled.net,
          road: [...bac.road, entry].slice(-36),
          statusText: `${settled.winner === 'tie' ? 'ÉGALITÉ' : settled.winner.toUpperCase()} (${pTot} vs ${bTot})${natural ? ' · Naturel !' : ''}`,
        },
      });
      logResult(
        'baccarat',
        `Baccarat · ${settled.winner.toUpperCase()} ${pTot}-${bTot}`,
        settled.net,
        settled.net > 0 ? true : settled.net < 0 ? false : null
      );
    },

    bacNewRound: () => {
      const bac = get().baccarat;
      soundEngine.playUiClick();
      set({
        baccarat: {
          ...bac,
          phase: 'BETTING',
          stagedBet: 0,
          puntoCards: [],
          bancoCards: [],
          puntoTotal: 0,
          bancoTotal: 0,
          winner: null,
          lastNet: null,
          statusText: 'Choisissez votre zone et placez vos jetons.',
        },
      });
    },
  };
});
