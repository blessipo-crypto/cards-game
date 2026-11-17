import React from 'react';
import { useSalonStore } from '../../store/useSalonStore';
import { CasinoChipSVG } from '../svg/CasinoChipSVG';
import { ChamferPanel } from '../svg/ChamferPanel';
import { PlayingCardSVG } from '../svg/PlayingCardSVG';

export const PokerTable: React.FC = () => {
  const poker = useSalonStore((s) => s.poker);
  const bankroll = useSalonStore((s) => s.bankroll);
  const pokerStartHand = useSalonStore((s) => s.pokerStartHand);
  const pokerAction = useSalonStore((s) => s.pokerAction);

  const needToCall = Math.max(0, poker.currentBet - poker.playerCommitted);

  return (
    <div className="flex h-full w-full flex-col justify-between px-8 py-5">
      {/* Top Opponents Row */}
      <div className="grid grid-cols-3 items-start gap-6">
        <ChamferPanel className="p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-display font-bold text-[#F3E5AB]">Valérie (Ouest)</span>
            <span className="font-mono-num text-[#9E9484]">
              {poker.aiLeftFolded ? 'Couchée' : `Misé ${poker.aiLeftCommitted} €`}
            </span>
          </div>
          <div className="mt-2.5 flex justify-center gap-2">
            {poker.aiLeftHole.map((c) => (
              <PlayingCardSVG key={c.id} card={c} size="sm" dimmed={poker.aiLeftFolded} />
            ))}
          </div>
        </ChamferPanel>

        {/* Center Pot & Street Indicator */}
        <ChamferPanel active className="p-4 text-center">
          <div className="font-mono-num text-[11px] uppercase tracking-[0.18em] text-[#D4AF37]">
            Texas Hold’em No-Limit · {poker.street}
          </div>
          <div className="mt-1 font-mono-num text-2xl font-bold text-[#F3E5AB]">
            Pot : {poker.pot.toLocaleString('fr-FR')} €
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <CasinoChipSVG value={500} size={32} />
            <CasinoChipSVG value={100} size={32} />
            <CasinoChipSVG value={1000} size={32} />
          </div>
        </ChamferPanel>

        <ChamferPanel className="p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-display font-bold text-[#F3E5AB]">Viktor (Est)</span>
            <span className="font-mono-num text-[#9E9484]">
              {poker.aiRightFolded ? 'Couché' : `Misé ${poker.aiRightCommitted} €`}
            </span>
          </div>
          <div className="mt-2.5 flex justify-center gap-2">
            {poker.aiRightHole.map((c) => (
              <PlayingCardSVG key={c.id} card={c} size="sm" dimmed={poker.aiRightFolded} />
            ))}
          </div>
        </ChamferPanel>
      </div>

      {/* Center Community Board (Flop / Turn / River) */}
      <div className="my-auto flex flex-col items-center justify-center gap-3">
        <div className="flex min-h-[144px] items-center justify-center gap-3 rounded-2xl border border-[#D4AF37]/30 bg-[#05080D]/45 px-6 py-3">
          {poker.community.length === 0 ? (
            <span className="font-display text-sm text-[#9E9484]">
              Tableau communautaire (Flop · Turn · River)
            </span>
          ) : (
            poker.community.map((c) => <PlayingCardSVG key={c.id} card={c} size="md" />)
          )}
        </div>

        <div className="font-display text-base font-semibold text-[#F3E5AB]">
          {poker.statusText}
        </div>
      </div>

      {/* Bottom Player Hole Cards & Action Bar */}
      <div className="flex items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex gap-2.5">
            {poker.playerHole.map((c) => (
              <PlayingCardSVG
                key={c.id}
                card={c}
                size="md"
                dimmed={poker.playerFolded}
                playable={poker.playerTurn}
              />
            ))}
          </div>
          {poker.handEvalText && (
            <ChamferPanel className="px-4 py-2.5">
              <div className="text-[10px] uppercase tracking-wider text-[#9E9484]">
                Combinaison
              </div>
              <div className="font-display text-sm font-bold text-[#F3E5AB]">
                {poker.handEvalText}
              </div>
            </ChamferPanel>
          )}
        </div>

        <ChamferPanel className="p-3.5">
          {poker.street === 'READY' || poker.street === 'SHOWDOWN' ? (
            <button
              type="button"
              disabled={bankroll < 100}
              onClick={pokerStartHand}
              className="gold-foil-btn chamfer-clip-sm h-11 cursor-pointer px-8 text-xs font-bold tracking-wide disabled:opacity-40"
            >
              Distribuer Nouvelle Main (Ante 100 €)
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => pokerAction('fold')}
                className="chamfer-clip-sm h-10 cursor-pointer border border-[#9E1B24]/80 bg-[#3B0A10] px-4 text-xs font-bold text-rose-100 hover:bg-[#521018]"
              >
                Se coucher
              </button>
              <button
                type="button"
                onClick={() => pokerAction(needToCall > 0 ? 'call' : 'check')}
                className="chamfer-clip-sm h-10 cursor-pointer border border-[#D4AF37]/50 bg-[#0D131D] px-5 text-xs font-bold text-[#F3E5AB] hover:border-[#F3E5AB]"
              >
                {needToCall > 0 ? `Suivre (${needToCall} €)` : 'Parole (Check)'}
              </button>
              <button
                type="button"
                disabled={bankroll < 200}
                onClick={() => pokerAction('raise', 200)}
                className="gold-foil-btn chamfer-clip-sm h-10 cursor-pointer px-5 text-xs font-bold disabled:opacity-40"
              >
                Relancer +200 €
              </button>
              <button
                type="button"
                disabled={bankroll < 500}
                onClick={() => pokerAction('raise', 500)}
                className="gold-foil-btn chamfer-clip-sm h-10 cursor-pointer px-5 text-xs font-bold disabled:opacity-40"
              >
                Miser +500 €
              </button>
            </div>
          )}
        </ChamferPanel>
      </div>
    </div>
  );
};
