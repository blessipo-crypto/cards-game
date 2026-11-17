import React from 'react';
import { useSalonStore } from '../../store/useSalonStore';
import { BaccaratBetSide, ChipValue } from '../../types/game';
import { CasinoChipSVG } from '../svg/CasinoChipSVG';
import { ChamferPanel } from '../svg/ChamferPanel';
import { PlayingCardSVG } from '../svg/PlayingCardSVG';

const CHIP_DENOMS: ChipValue[] = [50, 100, 500, 1000, 5000];

export const BaccaratTable: React.FC = () => {
  const bac = useSalonStore((s) => s.baccarat);
  const bankroll = useSalonStore((s) => s.bankroll);

  const bacSetSide = useSalonStore((s) => s.bacSetSide);
  const bacAddChip = useSalonStore((s) => s.bacAddChip);
  const bacClearBet = useSalonStore((s) => s.bacClearBet);
  const bacDeal = useSalonStore((s) => s.bacDeal);
  const bacNewRound = useSalonStore((s) => s.bacNewRound);

  return (
    <div className="grid h-full w-full grid-cols-12 gap-5 px-7 py-4">
      {/* Left + Center: Punto / Banco Hands & Betting Felt */}
      <div className="col-span-9 flex flex-col justify-between gap-3">
        {/* Punto vs Banco Cards */}
        <div className="grid grid-cols-2 gap-6">
          <ChamferPanel active={bac.winner === 'punto'} className="p-4 text-center">
            <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
              <span className="font-display text-lg font-bold text-[#93C5FD]">PUNTO (JOUEUR)</span>
              <span className="font-mono-num text-xl font-bold text-[#F3E5AB]">
                {bac.puntoCards.length > 0 ? bac.puntoTotal : '—'}
              </span>
            </div>
            <div className="mt-4 flex min-h-[132px] items-center justify-center gap-3">
              {bac.puntoCards.length === 0 ? (
                <span className="text-xs text-[#9E9484]">Cartes Punto (Modulo 10)</span>
              ) : (
                bac.puntoCards.map((c) => <PlayingCardSVG key={c.id} card={c} size="md" />)
              )}
            </div>
          </ChamferPanel>

          <ChamferPanel active={bac.winner === 'banco'} className="p-4 text-center">
            <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
              <span className="font-display text-lg font-bold text-[#FCA5A5]">BANCO (BANQUE)</span>
              <span className="font-mono-num text-xl font-bold text-[#F3E5AB]">
                {bac.bancoCards.length > 0 ? bac.bancoTotal : '—'}
              </span>
            </div>
            <div className="mt-4 flex min-h-[132px] items-center justify-center gap-3">
              {bac.bancoCards.length === 0 ? (
                <span className="text-xs text-[#9E9484]">Cartes Banco (3e carte auto)</span>
              ) : (
                bac.bancoCards.map((c) => <PlayingCardSVG key={c.id} card={c} size="md" />)
              )}
            </div>
          </ChamferPanel>
        </div>

        {/* Interactive Betting Zones: Punto (1:1), Banco (0.95:1), Égalité (8:1) */}
        <div className="grid grid-cols-3 gap-4">
          {(
            [
              {
                side: 'punto',
                title: 'PUNTO',
                odds: 'Paie 1 : 1',
                accent: 'border-[#3B82F6]/60 bg-[#0D213B]/75',
              },
              {
                side: 'tie',
                title: 'ÉGALITÉ',
                odds: 'Paie 8 : 1',
                accent: 'border-[#D4AF37]/75 bg-[#2A2008]/75',
              },
              {
                side: 'banco',
                title: 'BANCO',
                odds: 'Paie 0.95 : 1',
                accent: 'border-[#9E1B24]/80 bg-[#3B0B11]/75',
              },
            ] as { side: BaccaratBetSide; title: string; odds: string; accent: string }[]
          ).map((zone) => {
            const active = bac.betSide === zone.side;
            return (
              <button
                key={zone.side}
                type="button"
                disabled={bac.phase !== 'BETTING'}
                onClick={() => bacSetSide(zone.side)}
                className={`chamfer-clip cursor-pointer border p-4 text-center transition-all ${
                  active
                    ? `${zone.accent} ring-2 ring-[#F3E5AB] shadow-[0_0_24px_rgba(212,175,55,0.25)]`
                    : 'border-[#D4AF37]/25 bg-[#080A0F]/70 hover:border-[#D4AF37]/60'
                }`}
              >
                <div className="font-display text-lg font-bold text-[#F3E5AB]">{zone.title}</div>
                <div className="mt-0.5 font-mono-num text-xs text-[#D4AF37]">{zone.odds}</div>
                {active && bac.stagedBet > 0 && (
                  <div className="mt-1.5 font-mono-num text-sm font-bold text-emerald-300">
                    Misé : {bac.stagedBet.toLocaleString('fr-FR')} €
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-center font-display text-lg font-bold text-[#F3E5AB]">
          {bac.statusText}
          {bac.lastNet !== null && (
            <span
              className={`ml-3 font-mono-num text-base ${
                bac.lastNet > 0
                  ? 'text-emerald-400'
                  : bac.lastNet < 0
                    ? 'text-rose-400'
                    : 'text-[#F3E5AB]'
              }`}
            >
              {bac.lastNet > 0 ? `+${bac.lastNet.toLocaleString('fr-FR')} €` : `${bac.lastNet.toLocaleString('fr-FR')} €`}
            </span>
          )}
        </div>

        {/* Bottom Chip Rack & Deal */}
        <ChamferPanel className="px-5 py-3.5">
          {bac.phase === 'BETTING' ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                {CHIP_DENOMS.map((val) => (
                  <CasinoChipSVG
                    key={val}
                    value={val}
                    disabled={bankroll < val}
                    onClick={() => bacAddChip(val)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={bac.stagedBet <= 0}
                  onClick={bacClearBet}
                  className="chamfer-clip-sm h-10 cursor-pointer border border-[#D4AF37]/35 bg-[#0D1119] px-4 text-xs font-semibold text-[#D7CEBE] disabled:opacity-35"
                >
                  Effacer
                </button>
                <button
                  type="button"
                  disabled={bac.stagedBet <= 0}
                  onClick={bacDeal}
                  className="gold-foil-btn chamfer-clip-sm h-10 cursor-pointer px-7 text-xs font-bold tracking-wide disabled:opacity-40"
                >
                  Tirer les Cartes ({bac.stagedBet.toLocaleString('fr-FR')} €)
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={bacNewRound}
                className="gold-foil-btn chamfer-clip-sm h-10 cursor-pointer px-8 text-xs font-bold tracking-wide"
              >
                Nouvelle Taille
              </button>
            </div>
          )}
        </ChamferPanel>
      </div>

      {/* Right Column: Route de Monte-Carlo (Big Road Bead Grid) */}
      <div className="col-span-3 flex flex-col gap-3">
        <ChamferPanel className="flex h-full flex-col justify-between p-4">
          <div>
            <div className="border-b border-[#D4AF37]/20 pb-2">
              <h2 className="font-display text-base font-bold text-[#F3E5AB]">
                Route de Monte-Carlo
              </h2>
              <div className="text-[11px] text-[#9E9484]">Grille Big Road des 36 derniers coups</div>
            </div>

            {/* 6 x 6 Bead Grid */}
            <div className="mt-4 grid grid-cols-6 gap-2 rounded-lg border border-[#D4AF37]/25 bg-[#05070B]/90 p-3">
              {Array.from({ length: 36 }).map((_, idx) => {
                const entry = bac.road[idx];
                if (!entry) {
                  return (
                    <div
                      key={idx}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-white/[0.02]"
                    />
                  );
                }
                const cls =
                  entry.winner === 'punto'
                    ? 'border-[#60A5FA] bg-[#102542] text-[#93C5FD]'
                    : entry.winner === 'banco'
                      ? 'border-[#F87171] bg-[#4A121A] text-[#FCA5A5]'
                      : 'border-[#D4AF37] bg-[#2D2206] text-[#F3E5AB]';
                const letter = entry.winner === 'punto' ? 'P' : entry.winner === 'banco' ? 'B' : 'É';
                return (
                  <div
                    key={entry.id}
                    title={`${entry.winner.toUpperCase()} (${entry.puntoTotal}-${entry.bancoTotal})`}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-mono-num text-xs font-bold ${cls}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 border-t border-[#D4AF37]/15 pt-3 font-mono-num text-[11px] text-[#C7BFB0]">
            <div className="flex justify-between">
              <span className="text-[#93C5FD]">P · Punto :</span>
              <span>{bac.road.filter((r) => r.winner === 'punto').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#FCA5A5]">B · Banco :</span>
              <span>{bac.road.filter((r) => r.winner === 'banco').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#F3E5AB]">É · Égalité :</span>
              <span>{bac.road.filter((r) => r.winner === 'tie').length}</span>
            </div>
          </div>
        </ChamferPanel>
      </div>
    </div>
  );
};
