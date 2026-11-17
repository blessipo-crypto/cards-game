import React from 'react';
import { useSalonStore } from '../../store/useSalonStore';
import { ChipValue } from '../../types/game';
import { canSplitCards, evaluateBlackjackHand } from '../../utils/blackjackLogic';
import { CasinoChipSVG } from '../svg/CasinoChipSVG';
import { ChamferPanel } from '../svg/ChamferPanel';
import { PlayingCardSVG } from '../svg/PlayingCardSVG';

const CHIP_DENOMS: ChipValue[] = [50, 100, 500, 1000, 5000];

export const BlackjackTable: React.FC = () => {
  const bj = useSalonStore((s) => s.blackjack);
  const bankroll = useSalonStore((s) => s.bankroll);

  const bjAddChip = useSalonStore((s) => s.bjAddChip);
  const bjClearBet = useSalonStore((s) => s.bjClearBet);
  const bjDeal = useSalonStore((s) => s.bjDeal);
  const bjHit = useSalonStore((s) => s.bjHit);
  const bjStand = useSalonStore((s) => s.bjStand);
  const bjDouble = useSalonStore((s) => s.bjDouble);
  const bjSplit = useSalonStore((s) => s.bjSplit);
  const bjNewHand = useSalonStore((s) => s.bjNewHand);

  const dealerHasHidden = bj.dealerCards.some((c) => !c.faceUp);
  const dealerEval = evaluateBlackjackHand(bj.dealerCards, { onlyFaceUp: dealerHasHidden });
  const activeHand = bj.playerHands[bj.activeHandIdx];

  const canDouble =
    bj.phase === 'PLAYER_TURN' &&
    Boolean(activeHand) &&
    activeHand.cards.length === 2 &&
    bankroll >= activeHand.bet;
  const canSplit =
    bj.phase === 'PLAYER_TURN' &&
    bj.playerHands.length === 1 &&
    Boolean(activeHand) &&
    canSplitCards(activeHand.cards) &&
    bankroll >= activeHand.bet;

  return (
    <div className="flex h-full w-full flex-col justify-between px-8 py-5">
      {/* Top: Dealer Bank Zone */}
      <div className="flex flex-col items-center">
        <ChamferPanel className="px-6 py-3 text-center">
          <div className="flex items-center justify-center gap-4 text-xs">
            <span className="font-display font-bold tracking-wider text-[#F3E5AB]">
              SABOT DE LA BANQUE (S17)
            </span>
            {bj.dealerCards.length > 0 && (
              <span className="font-mono-num font-bold text-[#D4AF37]">
                Score : {dealerEval.total}
                {dealerHasHidden ? ' + ?' : ''}
              </span>
            )}
          </div>
          <div className="mt-3 flex min-h-[126px] items-center justify-center gap-3">
            {bj.dealerCards.length === 0 ? (
              <span className="text-xs text-[#9E9484]">
                Blackjack naturel payé 3 pour 2 · Le croupier tire à 16 et reste à 17
              </span>
            ) : (
              bj.dealerCards.map((c) => <PlayingCardSVG key={c.id} card={c} size="md" />)
            )}
          </div>
        </ChamferPanel>
      </div>

      {/* Center Status Banner */}
      <div className="my-auto flex flex-col items-center gap-2 text-center">
        <div className="font-display text-xl font-bold text-[#F3E5AB]">{bj.statusText}</div>
        {bj.phase === 'ROUND_OVER' && bj.lastNet !== null && (
          <div
            className={`font-mono-num text-lg font-bold ${
              bj.lastNet > 0
                ? 'text-emerald-400'
                : bj.lastNet < 0
                  ? 'text-rose-400'
                  : 'text-[#F3E5AB]'
            }`}
          >
            {bj.lastNet > 0 ? `+${bj.lastNet.toLocaleString('fr-FR')} €` : `${bj.lastNet.toLocaleString('fr-FR')} €`}
          </div>
        )}
      </div>

      {/* Player Hand(s) + Bottom Chip & Action Dock */}
      <div className="flex flex-col items-center gap-4">
        {bj.playerHands.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-8">
            {bj.playerHands.map((hand, idx) => {
              const ev = evaluateBlackjackHand(hand.cards, { isFromSplit: hand.isFromSplit });
              const isCurrent = bj.phase === 'PLAYER_TURN' && idx === bj.activeHandIdx;
              return (
                <ChamferPanel key={hand.id} active={isCurrent} className="px-5 py-3">
                  <div className="mb-2 flex items-center justify-between gap-4 font-mono-num text-xs">
                    <span className="font-bold text-[#F3E5AB]">
                      {bj.playerHands.length > 1 ? `Main ${idx + 1}` : 'Votre Main'} : {ev.total}
                      {ev.isSoft && ev.total <= 21 ? ' (Souple)' : ''}
                    </span>
                    <span className="text-[#D4AF37]">{hand.bet.toLocaleString('fr-FR')} €</span>
                    {hand.result && (
                      <span
                        className={
                          hand.result === 'WIN' || hand.result === 'BLACKJACK'
                            ? 'font-bold text-emerald-400'
                            : hand.result === 'PUSH'
                              ? 'font-bold text-amber-300'
                              : 'font-bold text-rose-400'
                        }
                      >
                        {hand.result}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2.5">
                    {hand.cards.map((c) => (
                      <PlayingCardSVG key={c.id} card={c} size="md" playable={isCurrent} />
                    ))}
                  </div>
                </ChamferPanel>
              );
            })}
          </div>
        )}

        <ChamferPanel className="w-full max-w-3xl px-5 py-3.5">
          {bj.phase === 'BETTING' && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                {CHIP_DENOMS.map((val) => (
                  <CasinoChipSVG
                    key={val}
                    value={val}
                    disabled={bankroll < val}
                    onClick={() => bjAddChip(val)}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="font-mono-num text-sm font-bold text-[#F3E5AB]">
                  Mise : {bj.stagedBet.toLocaleString('fr-FR')} €
                </div>
                <button
                  type="button"
                  disabled={bj.stagedBet <= 0}
                  onClick={bjClearBet}
                  className="chamfer-clip-sm h-10 cursor-pointer border border-[#D4AF37]/35 bg-[#0D1119] px-4 text-xs font-semibold text-[#D7CEBE] disabled:opacity-35"
                >
                  Effacer
                </button>
                <button
                  type="button"
                  disabled={bj.stagedBet <= 0}
                  onClick={bjDeal}
                  className="gold-foil-btn chamfer-clip-sm h-10 cursor-pointer px-6 text-xs font-bold tracking-wide disabled:opacity-40"
                >
                  Distribuer
                </button>
              </div>
            </div>
          )}

          {bj.phase === 'PLAYER_TURN' && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={bjHit}
                className="gold-foil-btn chamfer-clip-sm h-10 cursor-pointer px-6 text-xs font-bold tracking-wide"
              >
                Tirer (Hit)
              </button>
              <button
                type="button"
                onClick={bjStand}
                className="chamfer-clip-sm h-10 cursor-pointer border border-[#D4AF37]/50 bg-[#0D131D] px-6 text-xs font-bold text-[#F3E5AB] hover:border-[#F3E5AB]"
              >
                Rester (Stand)
              </button>
              <button
                type="button"
                disabled={!canDouble}
                onClick={bjDouble}
                className="chamfer-clip-sm h-10 cursor-pointer border border-[#D4AF37]/35 bg-[#0D1119] px-5 text-xs font-semibold text-[#D4AF37] disabled:opacity-35"
              >
                Doubler
              </button>
              <button
                type="button"
                disabled={!canSplit}
                onClick={bjSplit}
                className="chamfer-clip-sm h-10 cursor-pointer border border-[#D4AF37]/35 bg-[#0D1119] px-5 text-xs font-semibold text-[#D4AF37] disabled:opacity-35"
              >
                Séparer
              </button>
            </div>
          )}

          {bj.phase === 'ROUND_OVER' && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={bjNewHand}
                className="gold-foil-btn chamfer-clip-sm h-10 cursor-pointer px-8 text-xs font-bold tracking-wide"
              >
                Nouvelle Main
              </button>
            </div>
          )}
        </ChamferPanel>
      </div>
    </div>
  );
};
