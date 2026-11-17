import React from 'react';
import { FrontDeskConciergerie } from './components/conciergerie/FrontDeskConciergerie';
import { WindowChromeBar } from './components/layout/WindowChromeBar';
import { BaccaratTable } from './components/tables/BaccaratTable';
import { BeloteTable } from './components/tables/BeloteTable';
import { BlackjackTable } from './components/tables/BlackjackTable';
import { BridgeTable } from './components/tables/BridgeTable';
import { PokerTable } from './components/tables/PokerTable';
import { useSalonStore } from './store/useSalonStore';
import { FeltThemeId } from './types/game';

const FELT_BACKGROUND: Record<FeltThemeId, string> = {
  emerald: 'var(--felt-emerald)',
  crimson: 'var(--felt-crimson)',
  sapphire: 'var(--felt-sapphire)',
  obsidian: 'var(--felt-obsidian)',
};

export default function App() {
  const activeScreen = useSalonStore((s) => s.activeScreen);
  const feltTheme = useSalonStore((s) => s.feltTheme);

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#080A0F] select-none"
      style={{ backgroundImage: FELT_BACKGROUND[feltTheme] }}
    >
      {/* Subtle Pure CSS Velvet Grain & Specular Rim */}
      <div className="velvet-grain pointer-events-none absolute inset-0 opacity-80" />
      <div
        className="pointer-events-none absolute inset-3 rounded-2xl border border-[#D4AF37]/20"
        aria-hidden="true"
      />

      {/* Custom Windows PC Desktop Chrome Bar */}
      <WindowChromeBar />

      {/* Main Viewport Area (Locked 16:9 / 1920x1080 Zero-Scroll) */}
      <div className="relative z-10 flex-1 overflow-hidden">
        {activeScreen === 'CONCIERGERIE' && <FrontDeskConciergerie />}
        {activeScreen === 'belote' && <BeloteTable />}
        {activeScreen === 'bridge' && <BridgeTable />}
        {activeScreen === 'poker' && <PokerTable />}
        {activeScreen === 'blackjack' && <BlackjackTable />}
        {activeScreen === 'baccarat' && <BaccaratTable />}
      </div>
    </div>
  );
}
