import { create } from 'zustand';
import {
  BaccaratBetSide,
  BaccaratRoadEntry,
  BankrollPoint,
  BeloteMultiplier,
  BridgeBidCall,
  BridgeStrain,
  BridgeVulnerability,
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
