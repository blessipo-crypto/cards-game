import React, { useEffect, useState } from 'react';
import { ArrowLeft, Coins, Volume2, VolumeX } from 'lucide-react';
import { useSalonStore } from '../../store/useSalonStore';
import { FeltThemeId } from '../../types/game';

const FELT_SWATCHES: { id: FeltThemeId; label: string; color: string }[] = [
  { id: 'emerald', label: 'Émeraude', color: '#0F3D2E' },
  { id: 'crimson', label: 'Pourpre', color: '#4A121A' },
  { id: 'sapphire', label: 'Saphir', color: '#102542' },
  { id: 'obsidian', label: 'Obsidienne', color: '#151923' },
];

export const WindowChromeBar: React.FC = () => {
  const activeScreen = useSalonStore((s) => s.activeScreen);
  const feltTheme = useSalonStore((s) => s.feltTheme);
  const bankroll = useSalonStore((s) => s.bankroll);
  const handsPlayed = useSalonStore((s) => s.handsPlayed);
  const streak = useSalonStore((s) => s.streak);
  const muted = useSalonStore((s) => s.muted);

  const setScreen = useSalonStore((s) => s.setScreen);
  const setFeltTheme = useSalonStore((s) => s.setFeltTheme);
  const cashierTopUp = useSalonStore((s) => s.cashierTopUp);
  const toggleMute = useSalonStore((s) => s.toggleMute);

  const [fps, setFps] = useState(60);

  // Real requestAnimationFrame 60 FPS telemetry counter
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      frameCount += 1;
      if (now - lastTime >= 800) {
        const measured = Math.min(60, Math.round((frameCount * 1000) / (now - lastTime)));
        setFps(measured);
        frameCount = 0;
        lastTime = now;
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return (
    <header className="relative z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-[#D4AF37]/30 bg-[#080A0F]/95 px-5 backdrop-blur-md">
      {/* Left: Brand Crest & Salon Return */}
      <div className="flex items-center gap-4">
        {activeScreen !== 'CONCIERGERIE' && (
          <button
            type="button"
            onClick={() => setScreen('CONCIERGERIE')}
            aria-label="Retour à la Conciergerie"
            className="chamfer-clip-sm flex h-9 cursor-pointer items-center gap-1.5 border border-[#D4AF37]/40 bg-[#10141E] px-3 text-xs font-semibold text-[#F3E5AB] transition-colors hover:border-[#F3E5AB] hover:bg-[#1A2030] whitespace-nowrap"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>Conciergerie</span>
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 36 36" className="h-7 w-7 text-[#D4AF37]" fill="none" aria-hidden="true">
            <polygon points="18,2 34,18 18,34 2,18" stroke="currentColor" strokeWidth="1.4" />
            <polygon points="18,7 29,18 18,29 7,18" stroke="currentColor" strokeOpacity="0.55" strokeWidth="0.9" />
            <circle cx="18" cy="18" r="3" fill="#F3E5AB" />
          </svg>
          <div className="flex flex-col leading-none">
            <span className="font-display text-sm font-bold tracking-[0.14em] text-[#F3E5AB] whitespace-nowrap">
              ROYAL VELVET SUITE
            </span>
            <span className="text-[10px] tracking-[0.18em] text-[#9E9484] whitespace-nowrap">
              MONTE-CARLO · HAUTE HORLOGERIE
            </span>
          </div>
        </div>
      </div>

      {/* Center: VIP Passport & Live Bankroll + Caisse Rapide */}
      <div className="flex items-center gap-5">
        <div className="hidden xl:flex items-center gap-3 border-r border-[#D4AF37]/20 pr-5 text-xs text-[#C7BFB0]">
          <span className="font-display text-[11px] font-semibold tracking-wider text-[#D4AF37]">
            PASSEPORT VIP
          </span>
          <span aria-hidden="true" className="text-[#D4AF37]/40">·</span>
          <span className="font-mono-num">Mains : {handsPlayed}</span>
          <span aria-hidden="true" className="text-[#D4AF37]/40">·</span>
          <span className="font-mono-num text-[#F3E5AB]">Série : {streak}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] uppercase tracking-wider text-[#9E9484]">Bankroll</span>
            <span className="font-mono-num text-base font-bold text-[#F3E5AB] whitespace-nowrap">
              {bankroll.toLocaleString('fr-FR')} €
            </span>
          </div>

          <button
            type="button"
            onClick={cashierTopUp}
            aria-label="Caisse rapide ajouter 50 000 euros"
            className="gold-foil-btn chamfer-clip-sm flex h-8 cursor-pointer items-center gap-1.5 px-3 text-[11px] font-bold tracking-wide whitespace-nowrap"
          >
            <Coins className="h-3.5 w-3.5" />
            <span>+50 000 €</span>
          </button>
        </div>
      </div>

      {/* Right: Live Felt Selector, Audio & 60 FPS Telemetry */}
      <div className="flex items-center gap-3">
        <div
          role="group"
          aria-label="Sélecteur de feutrine"
          className="hidden md:flex items-center gap-1 rounded border border-[#D4AF37]/25 bg-[#0D1018] p-1"
        >
          {FELT_SWATCHES.map((sw) => {
            const active = feltTheme === sw.id;
            return (
              <button
                key={sw.id}
                type="button"
                onClick={() => setFeltTheme(sw.id)}
                title={`Feutrine ${sw.label}`}
                aria-label={`Feutrine ${sw.label}`}
                aria-pressed={active}
                className={`flex h-6 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#D4AF37]/20 text-[#F3E5AB] ring-1 ring-[#D4AF37]/60'
                    : 'text-[#9E9484] hover:text-[#F5EFE6]'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-[#D4AF37]/70"
                  style={{ backgroundColor: sw.color }}
                />
                <span className="hidden lg:inline">{sw.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Activer le son' : 'Couper le son'}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-[#D4AF37]/30 bg-[#0D1018] text-[#D4AF37] hover:border-[#F3E5AB]"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        <div className="hidden sm:flex items-center gap-1.5 border-l border-[#D4AF37]/20 pl-3 font-mono-num text-[11px] text-[#A8B2C4]">
          <span className="text-[#D4AF37]">{fps}</span>
          <span>FPS</span>
        </div>
      </div>
    </header>
  );
};
