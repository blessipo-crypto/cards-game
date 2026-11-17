import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useSalonStore } from '../../store/useSalonStore';
import { SalonCategory, SalonGameId } from '../../types/game';
import { BankrollSparklineD3 } from '../layout/BankrollSparklineD3';
import { ChamferPanel } from '../svg/ChamferPanel';
import { PortalArtworkSVG } from '../svg/PortalArtworkSVG';

interface PortalDefinition {
  id: SalonGameId;
  category: Exclude<SalonCategory, 'all'>;
  title: string;
  subtitle: string;
  players: string;
  rulesSummary: string;
  specBadge: string;
}

const PORTALS: PortalDefinition[] = [
  {
    id: 'belote',
    category: 'trick_taking',
    title: 'Belote & Coinche',
    subtitle: 'Classique, Contrée ×2 & Surcoinche ×4',
    players: '4 Joueurs (N/S vs E/O)',
    rulesSummary:
      'Barème officiel 162 pts (Valet 20, Neuf 14), sélection d’Atout 80–250 Capot, Belote-Rebelote (+20) et 10 de Der (+10).',
    specBadge: '32 Cartes · Piquet',
  },
  {
    id: 'bridge',
    category: 'trick_taking',
    title: 'Bridge Contrat',
    subtitle: 'Duplicate & Rubber · Boîte 35 Enchères',
    players: '4 Joueurs (Sud + Le Mort)',
    rulesSummary:
      'Enchères complètes 1♣–7SA, Contre/Surcontre, exposition du Mort dès l’entame, compteur HCP/40 et boussole de vulnérabilité.',
    specBadge: '52 Cartes · 13 Levées',
  },
  {
    id: 'canasta',
    category: 'trick_taking',
    title: 'Canasta & Variantes',
    subtitle: 'Classique · Moderne · Hand & Foot · Samba · Bolivia',
    players: '4 Joueurs (N/S vs E/O)',
    rulesSummary:
      '5 variantes complètes : 3 Rouges (+100), Canastas Pures (+500) & Impures (+300), suites Samba (+1500) et Hand & Foot à 2 piles.',
    specBadge: '2 à 4 Jeux + Jokers',
  },
  {
    id: 'poker',
    category: 'casino_bank',
    title: 'Texas Hold’em',
    subtitle: 'No-Limit · 3 Sièges & Pot Central',
    players: 'Joueur vs 2 IA',
    rulesSummary:
      'Séquence intégrale Pré-Flop, Flop, Turn, River et Abattage avec Parole, Suivre, Relancer et évaluation des combinaisons.',
    specBadge: '52 Cartes · No-Limit',
  },
  {
    id: 'blackjack',
    category: 'casino_bank',
    title: 'Blackjack 21 Royal',
    subtitle: 'Duel contre le Sabot de la Banque',
    players: 'Solo vs Croupier S17',
    rulesSummary:
      'Calcul dynamique des As (1/11), Tirer, Rester, Doubler, Séparer les paires et paiement Blackjack naturel 3:2.',
    specBadge: 'Sabot 6 Jeux · 3:2',
  },
  {
    id: 'baccarat',
    category: 'casino_bank',
    title: 'Baccarat Punto Banco',
    subtitle: 'Chemin de Fer & Route de Monte-Carlo',
    players: 'Cercle vs Banque',
    rulesSummary:
      'Mises Punto (1:1), Banco (0.95:1) et Égalité (8:1), calcul modulo 10, Naturels 8/9, 3e carte auto et grille Big Road.',
    specBadge: 'Tableau Officiel · Big Road',
  },
];

export const FrontDeskConciergerie: React.FC = () => {
  const [filter, setFilter] = useState<SalonCategory>('all');
  const setScreen = useSalonStore((s) => s.setScreen);
  const handLogs = useSalonStore((s) => s.handLogs);
  const bankrollHistory = useSalonStore((s) => s.bankrollHistory);

  const visiblePortals = PORTALS.filter(
    (p) => filter === 'all' || p.category === filter
  );

  return (
    <div className="flex h-full w-full flex-col justify-between px-6 py-4">
      {/* Hero Conciergerie Title & Category Filter Tabs */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D4AF37]/20 pb-3.5">
        <div>
          <h1 className="gold-title-shimmer font-display text-3xl font-bold tracking-wide lg:text-4xl">
            Conciergerie des Salons Privés
          </h1>
          <p className="mt-1 text-xs text-[#C8BFA9]">
            Sélectionnez un salon pour accéder instantanément à la table vectorielle Haute Horlogerie.
          </p>
        </div>

        {/* Interactive Category Tabs */}
        <div
          role="tablist"
          aria-label="Filtrer les salons"
          className="flex items-center gap-1.5 rounded border border-[#D4AF37]/25 bg-[#080A0F]/85 p-1"
        >
          {(
            [
              { id: 'all', label: 'Tous les Salons (6)' },
              { id: 'trick_taking', label: 'Plis, Contrat & Canasta' },
              { id: 'casino_bank', label: 'Cercle & Banque' },
            ] as { id: SalonCategory; label: string }[]
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={`cursor-pointer rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#D4AF37]/25 text-[#F3E5AB] ring-1 ring-[#D4AF37]/65'
                    : 'text-[#9E9484] hover:text-[#F5EFE6]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6 Architectural Portals Grid */}
      <main className="my-auto grid grid-cols-1 gap-3.5 py-3 md:grid-cols-3 xl:grid-cols-6">
        {visiblePortals.map((portal) => (
          <ChamferPanel
            key={portal.id}
            onClick={() => setScreen(portal.id)}
            className="group cursor-pointer p-4 transition-transform duration-200 hover:-translate-y-1.5"
          >
            <div className="flex h-full flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono-num text-[#D4AF37]">
                  <span>{portal.specBadge}</span>
                </div>

                <div className="mt-2 rounded bg-[#05070B]/80 px-2 py-1.5 border border-[#D4AF37]/15">
                  <PortalArtworkSVG game={portal.id} />
                </div>

                <h2 className="mt-3 font-display text-lg font-bold tracking-wide text-[#F3E5AB]">
                  {portal.title}
                </h2>
                <div className="text-[11px] font-medium text-[#D4AF37]/90">
                  {portal.subtitle}
                </div>

                <p className="mt-2 text-xs leading-relaxed text-[#C7BFB0]">
                  {portal.rulesSummary}
                </p>
              </div>

              <div className="border-t border-[#D4AF37]/15 pt-2.5">
                <div className="mb-2.5 text-[11px] font-mono-num text-[#9E9484]">
                  {portal.players}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setScreen(portal.id);
                  }}
                  className="gold-foil-btn chamfer-clip-sm flex h-9 w-full cursor-pointer items-center justify-center gap-2 text-xs font-bold tracking-wide whitespace-nowrap"
                >
                  <span>Entrer au Salon</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </ChamferPanel>
        ))}
      </main>

      {/* Bottom Dock: Live Hand Journal + D3 Bankroll Curve + Technical Engine Spec */}
      <footer className="grid grid-cols-12 gap-4">
        <ChamferPanel className="col-span-12 lg:col-span-6 p-3">
          <div className="flex items-center justify-between border-b border-[#D4AF37]/15 pb-1.5 text-[11px]">
            <span className="font-display font-bold tracking-wider text-[#F3E5AB]">
              JOURNAL EN DIRECT DES DERNIÈRES MAINS
            </span>
            <span className="font-mono-num text-[#9E9484]">
              {handLogs.length} entrée{handLogs.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="mt-2 flex h-12 flex-col gap-1 overflow-y-auto luxury-scroll pr-1 text-xs">
            {handLogs.length === 0 ? (
              <div className="text-[#9E9484]">
                Aucune main enregistrée pour cette session — ouvrez un salon ci-dessus pour débuter.
              </div>
            ) : (
              handLogs.slice(0, 3).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between border-b border-white/5 pb-0.5 font-mono-num text-[11px]"
                >
                  <span className="text-[#D7CEBE]">
                    <span className="text-[#D4AF37]">{log.timestamp}</span> · {log.summary}
                  </span>
                  <span
                    className={
                      log.delta > 0
                        ? 'font-bold text-emerald-400'
                        : log.delta < 0
                          ? 'font-bold text-rose-400'
                          : 'text-[#F3E5AB]'
                    }
                  >
                    {log.delta > 0 ? `+${log.delta.toLocaleString('fr-FR')} €` : `${log.delta.toLocaleString('fr-FR')} €`}
                  </span>
                </div>
              ))
            )}
          </div>
        </ChamferPanel>

        <ChamferPanel className="col-span-12 md:col-span-6 lg:col-span-3 p-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-display font-bold tracking-wider text-[#F3E5AB]">
              COURBE BANKROLL (D3)
            </span>
            <span className="font-mono-num text-[#D4AF37]">Session</span>
          </div>
          <div className="mt-1">
            <BankrollSparklineD3 points={bankrollHistory} />
          </div>
        </ChamferPanel>

        <ChamferPanel className="col-span-12 md:col-span-6 lg:col-span-3 p-3">
          <div className="font-display text-[11px] font-bold tracking-wider text-[#F3E5AB]">
            SYNTHÈSE TECHNIQUE DU MOTEUR
          </div>
          <div className="mt-1.5 space-y-1 text-[11px] text-[#C7BFB0] font-mono-num">
            <div>Rendu Vectoriel Pur SVG · Ratio 1:1.4</div>
            <div>6 Moteurs : Belote · Bridge · Canasta (5 Var.)</div>
            <div>Audio Synthétique Web Audio · 60 FPS</div>
          </div>
        </ChamferPanel>
      </footer>
    </div>
  );
};
