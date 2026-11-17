import React from 'react';
import { useSalonStore } from '../../store/useSalonStore';
import {
  CANASTA_VARIANT_LIST,
  CANASTA_VARIANTS,
  evaluateDiscardPickup,
  evaluateSelectedNewMeld,
  getCanastaCardPoints,
  getRequiredInitialMeld,
} from '../../utils/canastaLogic';
import { ChamferPanel } from '../svg/ChamferPanel';
import { PlayingCardSVG } from '../svg/PlayingCardSVG';
import { SuitIconSVG } from '../svg/SuitIconSVG';

export const CanastaTable: React.FC = () => {
  const canasta = useSalonStore((s) => s.canasta);
  const bankroll = useSalonStore((s) => s.bankroll);

  const canastaSetVariant = useSalonStore((s) => s.canastaSetVariant);
  const canastaNewDeal = useSalonStore((s) => s.canastaNewDeal);
  const canastaDrawStock = useSalonStore((s) => s.canastaDrawStock);
  const canastaTakePile = useSalonStore((s) => s.canastaTakePile);
  const canastaToggleSelectCard = useSalonStore((s) => s.canastaToggleSelectCard);
  const canastaMeldSelected = useSalonStore((s) => s.canastaMeldSelected);
  const canastaExtendMeld = useSalonStore((s) => s.canastaExtendMeld);
  const canastaCancelPendingOpening = useSalonStore((s) => s.canastaCancelPendingOpening);
  const canastaDiscardSelected = useSalonStore((s) => s.canastaDiscardSelected);

  const spec = CANASTA_VARIANTS[canasta.variant];
  const selectedSet = new Set(canasta.selectedCardIds);
  const selectedCards = canasta.hands.S.filter((c) => selectedSet.has(c.id));
  const selectedPoints = selectedCards.reduce(
    (sum, c) => sum + getCanastaCardPoints(c, canasta.variant),
    0
  );
  const meldCheck = evaluateSelectedNewMeld(selectedCards, canasta.variant);

  const nsMelds = canasta.melds.filter((m) => m.team === 'NS');
  const ewMelds = canasta.melds.filter((m) => m.team === 'EW');
  const requiredOpen = getRequiredInitialMeld(canasta.nsScore, canasta.variant);

  const pickupPlan =
    canasta.phase === 'DRAW' && canasta.currentTurn === 'S'
      ? evaluateDiscardPickup(
          canasta.hands.S,
          canasta.discardPile,
          canasta.isFrozen,
          canasta.nsOpened,
          requiredOpen,
          nsMelds
        )
      : { canTake: false, usedHandCardIds: [] };

  const topDiscard = canasta.discardPile[canasta.discardPile.length - 1];
  const isSouthDraw = canasta.phase === 'DRAW' && canasta.currentTurn === 'S';
  const isSouthMeld = canasta.phase === 'MELD_DISCARD' && canasta.currentTurn === 'S';

  return (
    <div className="grid h-full w-full grid-cols-12 gap-4 px-6 py-3.5">
      {/* Left Column: Variant Switcher, Partnership Scoreboard & Barème */}
      <div className="col-span-3 flex flex-col justify-between gap-2.5">
        <ChamferPanel className="p-3.5">
          <div className="border-b border-[#D4AF37]/20 pb-2">
            <h2 className="font-display text-lg font-bold text-[#F3E5AB]">
              {spec.name}
            </h2>
            <div className="text-[11px] text-[#9E9484]">
              Objectif Match : {spec.targetMatchScore.toLocaleString('fr-FR')} pts
            </div>
          </div>

          {/* 5 Canasta Variants Selector */}
          <div className="mt-2.5">
            <div className="mb-1.5 font-display text-[10px] font-bold tracking-wider text-[#D4AF37]">
              VARIANTES OFFICIELLES (5)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {CANASTA_VARIANT_LIST.map((v) => {
                const active = canasta.variant === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => canastaSetVariant(v.id)}
                    className={`chamfer-clip-sm cursor-pointer px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                      active
                        ? 'bg-[#D4AF37]/25 text-[#F3E5AB] ring-1 ring-[#D4AF37]'
                        : 'border border-[#D4AF37]/20 bg-[#0B0F17] text-[#B7AFA0] hover:border-[#D4AF37]/50 hover:text-[#F5EFE6]'
                    } ${v.id === 'hand_and_foot' ? 'col-span-2' : ''}`}
                  >
                    {v.shortName}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-[#C7BFB0]">{spec.summary}</p>
          </div>

          {/* Scoreboard N/S vs E/O */}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#D4AF37]/15 pt-2.5 font-mono-num text-xs">
            <div className="rounded border border-[#D4AF37]/25 bg-[#0C121B] p-2">
              <div className="text-[10px] text-[#9E9484]">NORD / SUD</div>
              <div className="text-base font-bold text-[#F3E5AB]">
                {canasta.nsScore.toLocaleString('fr-FR')}
              </div>
              <div className="text-[10px] text-[#D4AF37]">
                {nsMelds.filter((m) => m.isCanasta).length} Canasta · 3♥×{canasta.redThrees.NS.length}
              </div>
            </div>
            <div className="rounded border border-[#D4AF37]/20 bg-[#0C121B] p-2">
              <div className="text-[10px] text-[#9E9484]">EST / OUEST</div>
              <div className="text-base font-bold text-[#E5E0D5]">
                {canasta.ewScore.toLocaleString('fr-FR')}
              </div>
              <div className="text-[10px] text-[#9E9484]">
                {ewMelds.filter((m) => m.isCanasta).length} Canasta · 3♥×{canasta.redThrees.EW.length}
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-[#D4AF37]/15 pt-2 font-mono-num text-[11px]">
            <span className="text-[#9E9484]">Ouverture N/S :</span>
            <span className={canasta.nsOpened ? 'font-bold text-emerald-400' : 'font-bold text-[#F3E5AB]'}>
              {canasta.nsOpened
                ? '✓ Ouverte'
                : `${canasta.pendingOpeningPoints} / ${requiredOpen} pts`}
            </span>
          </div>
        </ChamferPanel>

        <ChamferPanel className="p-3 text-[10px] text-[#C7BFB0] space-y-1 font-mono-num">
          <div className="font-display text-[11px] font-bold text-[#D4AF37]">BARÈME CANASTA</div>
          <div>Joker : 50 · As / 2 : 20 · R–8 : 10 · 7–4 : 5</div>
          <div>3 Rouge : +100 (×4 = +800) · Pure : +500 · Impure : +300</div>
          {spec.allowSequences && (
            <div className="text-[#F3E5AB]">Samba Suite (7 cartes) : +1 500 pts</div>
          )}
          {spec.allowWildMelds && (
            <div className="text-[#F3E5AB]">Canasta Wilds (2/Joker) : +{spec.wildCanastaBonus} pts</div>
          )}
        </ChamferPanel>
      </div>

      {/* Right Arena: 4-Seat Table, Stock/Discard, Team Melds & South Hand */}
      <div className="col-span-9 flex flex-col justify-between gap-2">
        {/* Top Row: Opponent & Partner Telemetry */}
        <div className="grid grid-cols-3 items-center gap-3">
          <div className="rounded-lg border border-[#D4AF37]/20 bg-[#070B12]/70 px-3 py-1.5 font-mono-num text-xs">
            <span className="text-[#9E9484]">OUEST (E/O) · </span>
            <span className="font-bold text-[#F5EFE6]">
              {canasta.hands.W.length} cartes
              {spec.hasFoot ? ` (${canasta.inFoot.W ? 'Pied' : `Main + ${canasta.feet.W.length}`})` : ''}
            </span>
          </div>

          <div className="rounded-lg border border-[#D4AF37]/30 bg-[#070B12]/80 px-3 py-1.5 text-center font-mono-num text-xs">
            <span className="text-[#D4AF37]">NORD (PARTENAIRE N/S) · </span>
            <span className="font-bold text-[#F3E5AB]">
              {canasta.hands.N.length} cartes
              {spec.hasFoot ? ` (${canasta.inFoot.N ? 'Pied' : `Main + ${canasta.feet.N.length}`})` : ''}
            </span>
          </div>

          <div className="rounded-lg border border-[#D4AF37]/20 bg-[#070B12]/70 px-3 py-1.5 text-right font-mono-num text-xs">
            <span className="text-[#9E9484]">EST (E/O) · </span>
            <span className="font-bold text-[#F5EFE6]">
              {canasta.hands.E.length} cartes
              {spec.hasFoot ? ` (${canasta.inFoot.E ? 'Pied' : `Main + ${canasta.feet.E.length}`})` : ''}
            </span>
          </div>
        </div>

        {/* Center Playfield: Stock/Discard + Partnership Melds */}
        {canasta.phase === 'READY' || canasta.phase === 'ROUND_OVER' ? (
          <div className="my-auto flex flex-col items-center justify-center">
            <ChamferPanel active className="w-full max-w-xl p-5 text-center">
              <div className="font-display text-xl font-bold text-[#F3E5AB]">
                {canasta.phase === 'READY'
                  ? `Salon ${spec.name}`
                  : 'Fin de Manche Canasta'}
              </div>
              <p className="mt-2 text-xs text-[#D7CEBE]">{canasta.statusText}</p>
              {canasta.lastRoundBreakdown && (
                <div className="mt-3 grid grid-cols-2 gap-3 rounded border border-[#D4AF37]/20 bg-[#080C12] p-2.5 font-mono-num text-xs">
                  <div>
                    <div className="text-[10px] text-[#9E9484]">NORD / SUD</div>
                    <div className="text-sm font-bold text-[#F3E5AB]">
                      {canasta.lastRoundBreakdown.nsTotal >= 0
                        ? `+${canasta.lastRoundBreakdown.nsTotal}`
                        : canasta.lastRoundBreakdown.nsTotal}{' '}
                      pts
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9E9484]">EST / OUEST</div>
                    <div className="text-sm font-bold text-[#E5E0D5]">
                      {canasta.lastRoundBreakdown.ewTotal >= 0
                        ? `+${canasta.lastRoundBreakdown.ewTotal}`
                        : canasta.lastRoundBreakdown.ewTotal}{' '}
                      pts
                    </div>
                  </div>
                </div>
              )}
              <button
                type="button"
                disabled={bankroll < 200}
                onClick={canastaNewDeal}
                className="gold-foil-btn chamfer-clip-sm mt-4 h-10 cursor-pointer px-7 text-xs font-bold tracking-wide disabled:opacity-40"
              >
                Distribuer {spec.shortName} (Mise 200 €)
              </button>
            </ChamferPanel>
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-12 gap-3 overflow-hidden py-1">
            {/* Stock & Discard Pile */}
            <ChamferPanel className="col-span-4 flex flex-col items-center justify-center gap-3 p-3">
              <div className="flex items-center gap-5">
                {/* Pioche */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-mono-num text-[10px] uppercase tracking-wider text-[#D4AF37]">
                    Pioche ({canasta.stock.length})
                  </span>
                  <PlayingCardSVG
                    card={{ id: 'stock_back', suit: 'spades', rank: 'A', faceUp: false }}
                    size="sm"
                    playable={isSouthDraw}
                    onClick={isSouthDraw ? canastaDrawStock : undefined}
                  />
                </div>

                {/* Défausse */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-mono-num text-[10px] uppercase tracking-wider text-[#C7BFB0]">
                    Défausse ({canasta.discardPile.length})
                    {canasta.isFrozen && (
                      <span className="ml-1 rounded bg-[#9E1B24] px-1 py-0.5 text-[9px] text-white">
                        GELÉE
                      </span>
                    )}
                  </span>
                  {topDiscard ? (
                    <PlayingCardSVG
                      card={topDiscard}
                      size="sm"
                      playable={isSouthDraw && pickupPlan.canTake}
                      dimmed={isSouthDraw && !pickupPlan.canTake}
                      onClick={isSouthDraw && pickupPlan.canTake ? canastaTakePile : undefined}
                    />
                  ) : (
                    <div className="flex h-[101px] w-[72px] items-center justify-center rounded-[12px] border border-dashed border-[#D4AF37]/30 text-[10px] text-[#9E9484]">
                      Vide
                    </div>
                  )}
                </div>
              </div>

              {isSouthDraw && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={canastaDrawStock}
                    className="gold-foil-btn chamfer-clip-sm h-8 cursor-pointer px-3.5 text-[11px] font-bold"
                  >
                    Piocher (+{spec.drawCount})
                  </button>
                  <button
                    type="button"
                    disabled={!pickupPlan.canTake}
                    onClick={canastaTakePile}
                    className="chamfer-clip-sm h-8 cursor-pointer border border-[#D4AF37]/45 bg-[#0D1119] px-3 text-[11px] font-semibold text-[#F3E5AB] hover:border-[#F3E5AB] disabled:opacity-40"
                  >
                    Prendre Défausse
                  </button>
                </div>
              )}
            </ChamferPanel>

            {/* Melds Area: N/S (clickable to extend!) + E/O */}
            <ChamferPanel className="col-span-8 flex flex-col justify-between p-3 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#D4AF37]/15 pb-1 text-[11px]">
                <span className="font-display font-bold text-[#F3E5AB]">
                  COMBINAISONS POSÉES (CLIQUEZ SUR UNE ZONE N/S POUR COMPLÉTER)
                </span>
                <span className="font-mono-num text-[#D4AF37]">
                  N/S : {nsMelds.length} · E/O : {ewMelds.length}
                </span>
              </div>

              <div className="my-auto grid grid-cols-2 gap-2.5 py-1.5 overflow-y-auto luxury-scroll max-h-44">
                {/* NS Melds */}
                <div className="space-y-1.5">
                  <div className="font-mono-num text-[10px] font-semibold text-[#D4AF37]">
                    NORD / SUD
                  </div>
                  {nsMelds.length === 0 ? (
                    <div className="rounded border border-dashed border-[#D4AF37]/20 p-2 text-[11px] text-[#9E9484]">
                      Aucune combinaison N/S (Ouverture {requiredOpen} pts).
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {nsMelds.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          disabled={!isSouthMeld || canasta.selectedCardIds.length === 0}
                          onClick={() => canastaExtendMeld(m.id)}
                          className={`flex items-center gap-1.5 rounded border px-2 py-1 text-left font-mono-num text-[11px] transition-colors ${
                            m.isCanasta
                              ? m.isPure
                                ? 'border-[#9E1B24] bg-[#4A121A]/75 text-[#F3E5AB]'
                                : 'border-[#D4AF37] bg-[#141A26] text-[#F3E5AB]'
                              : 'border-[#D4AF37]/30 bg-[#0A0F17] text-[#E5E0D5]'
                          } ${
                            isSouthMeld && canasta.selectedCardIds.length > 0
                              ? 'cursor-pointer hover:border-[#F3E5AB] hover:bg-[#1B2433]'
                              : 'cursor-default'
                          }`}
                        >
                          {m.suit && <SuitIconSVG suit={m.suit} className="h-3 w-3" />}
                          <span className="font-bold">{m.rankLabel}</span>
                          <span className="text-[10px] text-[#D4AF37]">×{m.cards.length}</span>
                          {m.isCanasta && (
                            <span className="rounded bg-[#080A0F] px-1 text-[9px] text-[#F3E5AB]">
                              ★ +{m.bonus}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* EW Melds */}
                <div className="space-y-1.5">
                  <div className="font-mono-num text-[10px] font-semibold text-[#9E9484]">
                    EST / OUEST
                  </div>
                  {ewMelds.length === 0 ? (
                    <div className="rounded border border-dashed border-white/10 p-2 text-[11px] text-[#9E9484]">
                      Aucune combinaison E/O.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {ewMelds.map((m) => (
                        <div
                          key={m.id}
                          className={`flex items-center gap-1.5 rounded border px-2 py-1 font-mono-num text-[11px] ${
                            m.isCanasta
                              ? 'border-[#D4AF37] bg-[#141A26] text-[#F3E5AB]'
                              : 'border-white/15 bg-[#0A0F17] text-[#C7BFB0]'
                          }`}
                        >
                          <span className="font-bold">{m.rankLabel}</span>
                          <span className="text-[10px] text-[#9E9484]">×{m.cards.length}</span>
                          {m.isCanasta && (
                            <span className="rounded bg-[#080A0F] px-1 text-[9px] text-[#F3E5AB]">
                              ★ +{m.bonus}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ChamferPanel>
          </div>
        )}

        {/* Status Banner */}
        <div className="text-center font-display text-xs font-semibold text-[#F3E5AB]">
          {canasta.statusText}
        </div>

        {/* South Hand + Action Bar */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="font-mono-num text-xs text-[#F3E5AB]">
              SUD (VOUS) · {canasta.hands.S.length} cartes
              {spec.hasFoot && ` · ${canasta.inFoot.S ? 'Dans le Pied' : `Pied : ${canasta.feet.S.length}`}`}
            </span>

            {isSouthMeld && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!meldCheck.valid}
                  onClick={canastaMeldSelected}
                  className="gold-foil-btn chamfer-clip-sm h-8 cursor-pointer px-3.5 text-[11px] font-bold disabled:opacity-40"
                >
                  Poser Combinaison ({selectedPoints} pts)
                </button>

                {canasta.pendingOpeningIds.length > 0 && !canasta.nsOpened && (
                  <button
                    type="button"
                    onClick={canastaCancelPendingOpening}
                    className="chamfer-clip-sm h-8 cursor-pointer border border-rose-400/50 bg-[#26070B] px-3 text-[11px] font-semibold text-rose-200"
                  >
                    Annuler Ouverture
                  </button>
                )}

                <button
                  type="button"
                  disabled={canasta.selectedCardIds.length !== 1}
                  onClick={canastaDiscardSelected}
                  className="chamfer-clip-sm h-8 cursor-pointer border border-[#D4AF37]/50 bg-[#0D1119] px-3.5 text-[11px] font-semibold text-[#F3E5AB] hover:border-[#F3E5AB] disabled:opacity-40"
                >
                  Défausser (1 carte)
                </button>
              </div>
            )}
          </div>

          <div className="flex max-w-full items-center justify-center -space-x-3.5 px-2">
            {canasta.hands.S.map((card) => (
              <PlayingCardSVG
                key={card.id}
                card={card}
                size="sm"
                playable={isSouthMeld}
                selected={selectedSet.has(card.id)}
                onClick={() => canastaToggleSelectCard(card.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
