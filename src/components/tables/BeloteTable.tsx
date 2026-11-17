import React from 'react';
import { useSalonStore } from '../../store/useSalonStore';
import { BeloteMultiplier, SeatId, Suit } from '../../types/game';
import { getLegalBeloteCards } from '../../utils/beloteLogic';
import { BiddingCardSVG } from '../svg/BiddingCardSVG';
import { ChamferPanel } from '../svg/ChamferPanel';
import { CompassSVG } from '../svg/CompassSVG';
import { PlayingCardSVG } from '../svg/PlayingCardSVG';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const CONTRACT_LEVELS = [80, 90, 100, 110, 120, 130, 140, 150, 160, 250];

export const BeloteTable: React.FC = () => {
  const belote = useSalonStore((s) => s.belote);
  const bankroll = useSalonStore((s) => s.bankroll);

  const beloteNewDeal = useSalonStore((s) => s.beloteNewDeal);
  const beloteSetSuit = useSalonStore((s) => s.beloteSetSuit);
  const beloteSetPoints = useSalonStore((s) => s.beloteSetPoints);
  const beloteSetMultiplier = useSalonStore((s) => s.beloteSetMultiplier);
  const beloteTakeContract = useSalonStore((s) => s.beloteTakeContract);
  const beloteAiAuction = useSalonStore((s) => s.beloteAiAuction);
  const belotePlayCard = useSalonStore((s) => s.belotePlayCard);

  const legalIds = new Set(
    belote.phase === 'PLAYING' && belote.currentTurn === 'S' && belote.trump
      ? getLegalBeloteCards(belote.hands.S, belote.trick, belote.trump, 'S').map((c) => c.id)
      : []
  );

  const trickCardForSeat = (seat: SeatId) =>
    belote.trick.find((t) => t.seat === seat)?.card;

  return (
    <div className="grid h-full w-full grid-cols-12 gap-4 px-6 py-4">
      {/* Left Telemetry & Compass Column */}
      <div className="col-span-3 flex flex-col justify-between gap-3">
        <ChamferPanel className="p-4">
          <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
            <div>
              <h2 className="font-display text-lg font-bold text-[#F3E5AB]">
                Belote & Coinche
              </h2>
              <div className="text-[11px] text-[#9E9484]">Barème Officiel · Total 162 pts</div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center">
            <CompassSVG
              dealer={belote.dealer}
              activeTurn={belote.currentTurn}
              trumpSuit={belote.trump}
              size={124}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#D4AF37]/15 pt-3 font-mono-num text-xs">
            <div className="rounded bg-[#0C121B] p-2 border border-[#D4AF37]/20">
              <div className="text-[10px] text-[#9E9484]">NORD / SUD</div>
              <div className="text-base font-bold text-[#F3E5AB]">{belote.nsPoints} pts</div>
              <div className="text-[10px] text-[#D4AF37]">{belote.nsTricks} plis</div>
            </div>
            <div className="rounded bg-[#0C121B] p-2 border border-[#D4AF37]/20">
              <div className="text-[10px] text-[#9E9484]">EST / OUEST</div>
              <div className="text-base font-bold text-[#E5E0D5]">{belote.ewPoints} pts</div>
              <div className="text-[10px] text-[#9E9484]">{belote.ewTricks} plis</div>
            </div>
          </div>

          {/* Contract & Bonus Readout */}
          <div className="mt-3 space-y-1.5 border-t border-[#D4AF37]/15 pt-2.5 text-xs">
            <div className="flex justify-between font-mono-num">
              <span className="text-[#9E9484]">Contrat :</span>
              <span className="font-bold text-[#F3E5AB]">
                {belote.taker
                  ? `${belote.taker} · ${belote.selectedPoints === 250 ? 'CAPOT' : belote.selectedPoints} (×${belote.multiplier})`
                  : 'En attente'}
              </span>
            </div>
            {belote.beloteAnnounced && (
              <div className="text-[11px] font-semibold text-emerald-400">
                ✓ Belote & Rebelote détectée (+20 pts)
              </div>
            )}
            {belote.dixDeDerTeam && (
              <div className="text-[11px] font-semibold text-[#F3E5AB]">
                ✓ 10 de Der attribué à {belote.dixDeDerTeam} (+10 pts)
              </div>
            )}
          </div>
        </ChamferPanel>

        <ChamferPanel className="p-3.5 text-[11px] text-[#C7BFB0] space-y-1 font-mono-num">
          <div className="font-display text-xs font-bold text-[#D4AF37]">ORDRE DES VALEURS</div>
          <div>Atout : V (20) · 9 (14) · A (11) · 10 (10) · R (4) · D (3)</div>
          <div>Hors : A (11) · 10 (10) · R (4) · D (3) · V (2)</div>
        </ChamferPanel>
      </div>

      {/* Center 4-Seat Table & Interactive Auction */}
      <div className="col-span-9 flex flex-col justify-between">
        {/* North Partner */}
        <div className="flex flex-col items-center">
          <div className="mb-1.5 font-mono-num text-[11px] font-semibold text-[#D4AF37]">
            NORD (PARTENAIRE IA) · {belote.hands.N.length} cartes
          </div>
          <div className="flex -space-x-6">
            {belote.hands.N.map((c) => (
              <PlayingCardSVG key={c.id} card={c} size="xs" />
            ))}
          </div>
        </div>

        {/* Middle Row: West — Center Trick / Auction — East */}
        <div className="my-auto grid grid-cols-12 items-center gap-3">
          {/* West Seat */}
          <div className="col-span-2 flex flex-col items-center">
            <div className="mb-1.5 font-mono-num text-[11px] text-[#C7BFB0]">
              OUEST · {belote.hands.W.length}
            </div>
            <div className="flex flex-col -space-y-14">
              {belote.hands.W.slice(0, 5).map((c) => (
                <PlayingCardSVG key={c.id} card={c} size="xs" />
              ))}
            </div>
          </div>

          {/* Center Interactive Arena */}
          <div className="col-span-8 flex flex-col items-center justify-center">
            {belote.phase === 'READY' || belote.phase === 'ROUND_OVER' ? (
              <ChamferPanel active className="w-full max-w-lg p-5 text-center">
                <div className="font-display text-xl font-bold text-[#F3E5AB]">
                  {belote.phase === 'READY' ? 'Salon de Belote & Coinche' : 'Fin de Donne'}
                </div>
                <p className="mt-2 text-xs text-[#D7CEBE]">{belote.statusText}</p>
                <button
                  type="button"
                  disabled={bankroll < 200}
                  onClick={beloteNewDeal}
                  className="gold-foil-btn chamfer-clip-sm mt-4 h-10 cursor-pointer px-7 text-xs font-bold tracking-wide disabled:opacity-40"
                >
                  Distribuer 8 Cartes (Mise 200 €)
                </button>
              </ChamferPanel>
            ) : belote.phase === 'AUCTION' ? (
              <ChamferPanel active className="w-full max-w-xl p-4">
                <div className="font-display text-sm font-bold text-[#F3E5AB] text-center">
                  Sélecteur d’Atout & Contrat Coinche
                </div>

                {/* Suit Selection */}
                <div className="mt-3 flex justify-center gap-2">
                  {SUITS.map((st) => (
                    <BiddingCardSVG
                      key={st}
                      label="Atout"
                      strain={st}
                      variant={belote.selectedSuit === st ? 'active' : 'standard'}
                      onClick={() => beloteSetSuit(st)}
                    />
                  ))}
                </div>

                {/* Threshold Selection 80..250 */}
                <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                  {CONTRACT_LEVELS.map((pts) => (
                    <BiddingCardSVG
                      key={pts}
                      compact
                      label={pts === 250 ? 'CAPOT 250' : `${pts}`}
                      variant={belote.selectedPoints === pts ? 'active' : 'standard'}
                      onClick={() => beloteSetPoints(pts)}
                    />
                  ))}
                </div>

                {/* Multiplier Normal / Coinche / Surcoinche */}
                <div className="mt-2.5 flex justify-center gap-2">
                  {(
                    [
                      { mult: 1, label: 'Normal ×1' },
                      { mult: 2, label: 'COINCHE ×2' },
                      { mult: 4, label: 'SURCOINCHE ×4' },
                    ] as { mult: BeloteMultiplier; label: string }[]
                  ).map((item) => (
                    <BiddingCardSVG
                      key={item.mult}
                      compact
                      label={item.label}
                      variant={belote.multiplier === item.mult ? 'coinche' : 'standard'}
                      onClick={() => beloteSetMultiplier(item.mult)}
                    />
                  ))}
                </div>

                <div className="mt-3.5 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={beloteTakeContract}
                    className="gold-foil-btn chamfer-clip-sm h-9 cursor-pointer px-5 text-xs font-bold"
                  >
                    Valider le Contrat
                  </button>
                  <button
                    type="button"
                    onClick={beloteAiAuction}
                    className="chamfer-clip-sm h-9 cursor-pointer border border-[#D4AF37]/45 bg-[#0D1119] px-4 text-xs font-semibold text-[#F3E5AB] hover:border-[#F3E5AB]"
                  >
                    Passer (Laisser l’IA)
                  </button>
                </div>
              </ChamferPanel>
            ) : (
              /* Active 4-Seat Center Trick Felt Zone */
              <div className="relative flex h-56 w-80 flex-col items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#05080D]/40 p-3">
                <div className="grid grid-cols-3 grid-rows-3 items-center justify-items-center gap-1.5">
                  <div />
                  <div>
                    {trickCardForSeat('N') && (
                      <PlayingCardSVG
                        card={trickCardForSeat('N')!}
                        size="sm"
                        isTrump={trickCardForSeat('N')!.suit === belote.trump}
                      />
                    )}
                  </div>
                  <div />
                  <div>
                    {trickCardForSeat('W') && (
                      <PlayingCardSVG
                        card={trickCardForSeat('W')!}
                        size="sm"
                        isTrump={trickCardForSeat('W')!.suit === belote.trump}
                      />
                    )}
                  </div>
                  <div className="text-center font-mono-num text-[10px] text-[#D4AF37]">
                    PLI #{belote.nsTricks + belote.ewTricks + 1}
                  </div>
                  <div>
                    {trickCardForSeat('E') && (
                      <PlayingCardSVG
                        card={trickCardForSeat('E')!}
                        size="sm"
                        isTrump={trickCardForSeat('E')!.suit === belote.trump}
                      />
                    )}
                  </div>
                  <div />
                  <div>
                    {trickCardForSeat('S') && (
                      <PlayingCardSVG
                        card={trickCardForSeat('S')!}
                        size="sm"
                        isTrump={trickCardForSeat('S')!.suit === belote.trump}
                      />
                    )}
                  </div>
                  <div />
                </div>
              </div>
            )}

            <div className="mt-2 font-display text-sm font-semibold text-[#F3E5AB]">
              {belote.statusText}
            </div>
          </div>

          {/* East Seat */}
          <div className="col-span-2 flex flex-col items-center">
            <div className="mb-1.5 font-mono-num text-[11px] text-[#C7BFB0]">
              EST · {belote.hands.E.length}
            </div>
            <div className="flex flex-col -space-y-14">
              {belote.hands.E.slice(0, 5).map((c) => (
                <PlayingCardSVG key={c.id} card={c} size="xs" />
              ))}
            </div>
          </div>
        </div>

        {/* South Player Hand with Dynamic ATOUT Badges */}
        <div className="flex flex-col items-center">
          <div className="mb-2 flex items-center gap-3 font-mono-num text-xs text-[#F3E5AB]">
            <span>SUD (VOUS)</span>
            {belote.phase === 'PLAYING' && belote.currentTurn === 'S' && (
              <span className="text-emerald-400">· Votre tour de jouer</span>
            )}
          </div>
          <div className="flex items-center justify-center gap-2">
            {belote.hands.S.map((card) => {
              const isLegal = legalIds.has(card.id);
              const isTurn = belote.phase === 'PLAYING' && belote.currentTurn === 'S';
              return (
                <PlayingCardSVG
                  key={card.id}
                  card={card}
                  size="md"
                  isTrump={belote.trump !== null && card.suit === belote.trump}
                  playable={isTurn && isLegal}
                  dimmed={isTurn && !isLegal}
                  onClick={() => belotePlayCard(card.id)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
