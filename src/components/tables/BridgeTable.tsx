import React from 'react';
import { useSalonStore } from '../../store/useSalonStore';
import { BridgeStrain, SeatId } from '../../types/game';
import {
  STRAIN_ORDER,
  canDoubleCall,
  canRedoubleCall,
  getHighestContractBid,
  isBidHigher,
} from '../../utils/bridgeLogic';
import { getLegalBridgeCards } from '../../utils/bridgeLogic';
import { BiddingCardSVG } from '../svg/BiddingCardSVG';
import { ChamferPanel } from '../svg/ChamferPanel';
import { CompassSVG } from '../svg/CompassSVG';
import { PlayingCardSVG } from '../svg/PlayingCardSVG';

const LEVELS = [1, 2, 3, 4, 5, 6, 7];
const VULN_LABEL = {
  NONE: 'Personne Vulnérable',
  NS: 'Nord / Sud Vulnérables',
  EW: 'Est / Ouest Vulnérables',
  ALL: 'Tous Vulnérables',
};

export const BridgeTable: React.FC = () => {
  const bridge = useSalonStore((s) => s.bridge);
  const bankroll = useSalonStore((s) => s.bankroll);

  const bridgeNewDeal = useSalonStore((s) => s.bridgeNewDeal);
  const bridgePlaceCall = useSalonStore((s) => s.bridgePlaceCall);
  const bridgePlayCard = useSalonStore((s) => s.bridgePlayCard);

  const highestBid = getHighestContractBid(bridge.calls);
  const isSouthBidTurn = bridge.phase === 'AUCTION' && bridge.currentBidTurn === 'S';

  const nsControlsDummy =
    bridge.contract && (bridge.contract.declarer === 'S' || bridge.contract.declarer === 'N');

  const legalSouthIds = new Set(
    bridge.phase === 'PLAYING' && bridge.currentTurn === 'S'
      ? getLegalBridgeCards(bridge.hands.S, bridge.trick).map((c) => c.id)
      : []
  );

  const legalNorthIds = new Set(
    bridge.phase === 'PLAYING' && nsControlsDummy && bridge.currentTurn === 'N'
      ? getLegalBridgeCards(bridge.hands.N, bridge.trick).map((c) => c.id)
      : []
  );

  const trickCardForSeat = (seat: SeatId) =>
    bridge.trick.find((t) => t.seat === seat)?.card;

  const formatCall = (c: (typeof bridge.calls)[number]) => {
    if (c.type === 'PASS') return 'PASSE';
    if (c.type === 'DOUBLE') return 'X';
    if (c.type === 'REDOUBLE') return 'XX';
    const sym: Record<BridgeStrain, string> = {
      clubs: '♣',
      diamonds: '♦',
      hearts: '♥',
      spades: '♠',
      NT: 'SA',
    };
    return `${c.level}${c.strain ? sym[c.strain] : ''}`;
  };

  return (
    <div className="grid h-full w-full grid-cols-12 gap-4 px-6 py-3.5">
      {/* Left Bridge Telemetry, Compass & Auction Sequence */}
      <div className="col-span-3 flex flex-col justify-between gap-3">
        <ChamferPanel className="p-3.5">
          <div className="border-b border-[#D4AF37]/20 pb-2">
            <h2 className="font-display text-lg font-bold text-[#F3E5AB]">Bridge Contrat</h2>
            <div className="text-[11px] text-[#9E9484]">{VULN_LABEL[bridge.vulnerability]}</div>
          </div>

          <div className="mt-2.5 flex items-center justify-center">
            <CompassSVG
              dealer={bridge.dealer}
              activeTurn={bridge.phase === 'AUCTION' ? bridge.currentBidTurn : bridge.currentTurn}
              vulnerability={bridge.vulnerability}
              trumpSuit={bridge.contract?.strain ?? null}
              size={112}
            />
          </div>

          {/* HCP / 40 & 13-Trick Counter */}
          <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-[#D4AF37]/15 pt-2.5 font-mono-num text-xs">
            <div className="rounded bg-[#0C121B] p-2 border border-[#D4AF37]/20">
              <div className="text-[10px] text-[#9E9484]">HONNEURS (HCP)</div>
              <div className="text-base font-bold text-[#F3E5AB]">
                {bridge.nsHcp} <span className="text-[11px] font-normal text-[#9E9484]">/ 40</span>
              </div>
              <div className="text-[10px] text-[#D4AF37]">Ligne Nord / Sud</div>
            </div>

            <div className="rounded bg-[#0C121B] p-2 border border-[#D4AF37]/20">
              <div className="text-[10px] text-[#9E9484]">LEVÉES (13)</div>
              <div className="text-base font-bold text-[#F3E5AB]">
                {bridge.nsTricks}{' '}
                <span className="text-[11px] font-normal text-[#9E9484]">
                  {bridge.contract ? `/ ${bridge.contract.targetTricks}` : 'N/S'}
                </span>
              </div>
              <div className="text-[10px] text-[#9E9484]">E/O : {bridge.ewTricks}</div>
            </div>
          </div>

          {bridge.contract && (
            <div className="mt-2 rounded border border-[#D4AF37]/30 bg-[#0A0F18] px-2.5 py-1.5 font-mono-num text-[11px] text-[#F3E5AB]">
              Contrat : {bridge.contract.level}
              {bridge.contract.strain === 'NT' ? 'SA' : bridge.contract.strain.toUpperCase()} ·
              Déclarant {bridge.contract.declarer} · Mort {bridge.contract.dummy}
            </div>
          )}
        </ChamferPanel>

        {/* Live Bidding History Sequence */}
        <ChamferPanel className="flex-1 p-3 overflow-hidden">
          <div className="font-display text-xs font-bold tracking-wider text-[#D4AF37] border-b border-[#D4AF37]/15 pb-1">
            SÉQUENCE D’ENCHÈRES
          </div>
          <div className="mt-1.5 grid grid-cols-4 gap-1 text-center font-mono-num text-[10px] text-[#9E9484]">
            <span>N</span>
            <span>E</span>
            <span>S</span>
            <span>O</span>
          </div>
          <div className="mt-1 grid grid-cols-4 gap-1 max-h-28 overflow-y-auto luxury-scroll text-center font-mono-num text-[11px]">
            {bridge.calls.map((c, idx) => (
              <div
                key={idx}
                className={`rounded py-0.5 ${
                  c.type === 'BID'
                    ? 'bg-[#D4AF37]/20 font-bold text-[#F3E5AB]'
                    : c.type === 'DOUBLE'
                      ? 'bg-[#9E1B24]/50 font-bold text-rose-200'
                      : 'text-[#9E9484]'
                }`}
              >
                {formatCall(c)}
              </div>
            ))}
          </div>
        </ChamferPanel>
      </div>

      {/* Main Table: North (Le Mort) — Center (35-Bid Box or Trick Zone) — South */}
      <div className="col-span-9 flex flex-col justify-between">
        {/* North Seat (Exposes LE MORT face-up on opening lead) */}
        <div className="flex flex-col items-center">
          <div className="mb-1 flex items-center gap-2 font-mono-num text-[11px] text-[#D4AF37]">
            <span>
              NORD {bridge.dummyExposed ? '— LE MORT (EXPOSÉ)' : `(PARTENAIRE IA · ${bridge.hands.N.length} cartes)`}
            </span>
          </div>
          <div className="flex items-center justify-center -space-x-5">
            {bridge.hands.N.map((card) => {
              const canPlay = Boolean(nsControlsDummy && bridge.currentTurn === 'N' && legalNorthIds.has(card.id));
              return (
                <PlayingCardSVG
                  key={card.id}
                  card={card}
                  size="xs"
                  isDummy={bridge.dummyExposed}
                  showHcp={bridge.dummyExposed}
                  playable={canPlay}
                  dimmed={Boolean(nsControlsDummy && bridge.currentTurn === 'N' && !canPlay)}
                  onClick={() => bridgePlayCard(card.id)}
                />
              );
            })}
          </div>
        </div>

        {/* Center Zone: Bidding Box (35 bids + Pass/X/XX) OR Active Trick Arena */}
        <div className="my-auto flex flex-col items-center justify-center">
          {bridge.phase === 'READY' || bridge.phase === 'ROUND_OVER' ? (
            <ChamferPanel active className="w-full max-w-lg p-5 text-center">
              <h3 className="font-display text-xl font-bold text-[#F3E5AB]">
                {bridge.phase === 'READY' ? 'Salon Duplicate & Rubber' : 'Bilan de la Donne'}
              </h3>
              <p className="mt-2 text-xs text-[#D7CEBE]">{bridge.statusText}</p>
              <button
                type="button"
                disabled={bankroll < 200}
                onClick={bridgeNewDeal}
                className="gold-foil-btn chamfer-clip-sm mt-4 h-10 cursor-pointer px-7 text-xs font-bold tracking-wide disabled:opacity-40"
              >
                Donner 52 Cartes (Mise 200 €)
              </button>
            </ChamferPanel>
          ) : bridge.phase === 'AUCTION' ? (
            <ChamferPanel active className="w-full max-w-2xl p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-sm font-bold text-[#F3E5AB]">
                  Boîte d’Enchères (1♣ à 7SA)
                </span>
                <span className="font-mono-num text-[11px] text-[#D4AF37]">
                  {isSouthBidTurn ? 'À vous de parler' : `Tour de ${bridge.currentBidTurn}…`}
                </span>
              </div>

              {/* 7 x 5 Grid of all 35 Bidding Cards */}
              <div className="grid grid-cols-5 gap-1.5">
                {LEVELS.map((lvl) =>
                  STRAIN_ORDER.map((strain) => {
                    const legal = isSouthBidTurn && isBidHigher(lvl, strain, highestBid);
                    return (
                      <BiddingCardSVG
                        key={`${lvl}_${strain}`}
                        compact
                        label={`${lvl}`}
                        strain={strain}
                        disabled={!legal}
                        onClick={() => bridgePlaceCall({ type: 'BID', level: lvl, strain })}
                      />
                    );
                  })
                )}
              </div>

              {/* Special Calls: PASSE, CONTRE X, SURCONTRE XX */}
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <BiddingCardSVG
                  label="PASSE"
                  variant="pass"
                  disabled={!isSouthBidTurn}
                  onClick={() => bridgePlaceCall({ type: 'PASS' })}
                />
                <BiddingCardSVG
                  label="CONTRE (X)"
                  variant="double"
                  disabled={!isSouthBidTurn || !canDoubleCall(bridge.calls, 'S')}
                  onClick={() => bridgePlaceCall({ type: 'DOUBLE' })}
                />
                <BiddingCardSVG
                  label="SURCONTRE (XX)"
                  variant="redouble"
                  disabled={!isSouthBidTurn || !canRedoubleCall(bridge.calls, 'S')}
                  onClick={() => bridgePlaceCall({ type: 'REDOUBLE' })}
                />
              </div>
            </ChamferPanel>
          ) : (
            /* Trick Playing Felt Zone */
            <div className="flex w-full items-center justify-between px-4">
              <div className="text-center font-mono-num text-[11px] text-[#9E9484]">
                OUEST · {bridge.hands.W.length}
              </div>

              <div className="flex h-48 w-80 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#05080D]/45 p-3">
                <div className="grid grid-cols-3 grid-rows-3 items-center justify-items-center gap-1">
                  <div />
                  <div>
                    {trickCardForSeat('N') && <PlayingCardSVG card={trickCardForSeat('N')!} size="sm" />}
                  </div>
                  <div />
                  <div>
                    {trickCardForSeat('W') && <PlayingCardSVG card={trickCardForSeat('W')!} size="sm" />}
                  </div>
                  <div className="font-mono-num text-[10px] text-[#D4AF37]">
                    LEVÉE #{bridge.nsTricks + bridge.ewTricks + 1}
                  </div>
                  <div>
                    {trickCardForSeat('E') && <PlayingCardSVG card={trickCardForSeat('E')!} size="sm" />}
                  </div>
                  <div />
                  <div>
                    {trickCardForSeat('S') && <PlayingCardSVG card={trickCardForSeat('S')!} size="sm" />}
                  </div>
                  <div />
                </div>
              </div>

              <div className="text-center font-mono-num text-[11px] text-[#9E9484]">
                EST · {bridge.hands.E.length}
              </div>
            </div>
          )}

          <div className="mt-1.5 font-display text-sm font-semibold text-[#F3E5AB]">
            {bridge.statusText}
          </div>
        </div>

        {/* South Player Hand (13 cards sorted by suit + HCP indicators) */}
        <div className="flex flex-col items-center">
          <div className="mb-1.5 flex items-center gap-3 font-mono-num text-xs text-[#F3E5AB]">
            <span>SUD (VOUS)</span>
            {bridge.phase === 'PLAYING' && bridge.currentTurn === 'S' && (
              <span className="text-emerald-400">· Jouez une carte</span>
            )}
          </div>
          <div className="flex items-center justify-center -space-x-3">
            {bridge.hands.S.map((card) => {
              const isLegal = legalSouthIds.has(card.id);
              const isTurn = bridge.phase === 'PLAYING' && bridge.currentTurn === 'S';
              return (
                <PlayingCardSVG
                  key={card.id}
                  card={card}
                  size="sm"
                  showHcp
                  playable={isTurn && isLegal}
                  dimmed={isTurn && !isLegal}
                  onClick={() => bridgePlayCard(card.id)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
