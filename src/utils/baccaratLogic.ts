import { BaccaratBetSide, CardData, Rank } from '../types/game';

export function getBaccaratCardPoints(rank: Rank): number {
  if (rank === 'A') return 1;
  if (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return 0;
  return parseInt(rank, 10);
}

export function evaluateBaccaratTotal(cards: CardData[]): number {
  const sum = cards.reduce((acc, c) => acc + getBaccaratCardPoints(c.rank), 0);
  return sum % 10;
}

/**
 * Official Monte Carlo Punto Banco third-card drawing rule for Banco (Banker)
 */
export function shouldBancoDrawThird(
  bancoTotal: number,
  puntoThirdCard: CardData | null
): boolean {
  if (!puntoThirdCard) {
    return bancoTotal <= 5;
  }
  const p3 = getBaccaratCardPoints(puntoThirdCard.rank);
  if (bancoTotal <= 2) return true;
  if (bancoTotal === 3) return p3 !== 8;
  if (bancoTotal === 4) return p3 >= 2 && p3 <= 7;
  if (bancoTotal === 5) return p3 >= 4 && p3 <= 7;
  if (bancoTotal === 6) return p3 === 6 || p3 === 7;
  return false;
}

export function settleBaccaratBet(
  betSide: BaccaratBetSide,
  betAmount: number,
  puntoTotal: number,
  bancoTotal: number
): { winner: BaccaratBetSide; returned: number; net: number } {
  let winner: BaccaratBetSide = 'tie';
  if (puntoTotal > bancoTotal) winner = 'punto';
  else if (bancoTotal > puntoTotal) winner = 'banco';

  let returned = 0;
  if (winner === 'tie') {
    if (betSide === 'tie') {
      returned = betAmount * 9; // 8:1 + stake
    } else {
      returned = betAmount; // Push on Punto/Banco when Tie lands
    }
  } else if (winner === betSide) {
    if (betSide === 'punto') returned = betAmount * 2;
    else if (betSide === 'banco') returned = betAmount + Math.floor(betAmount * 0.95);
  }

  return {
    winner,
    returned,
    net: returned - betAmount,
  };
}
