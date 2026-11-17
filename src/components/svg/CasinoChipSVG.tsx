import React from 'react';
import { ChipValue } from '../../types/game';

interface CasinoChipSVGProps {
  value: ChipValue;
  disabled?: boolean;
  onClick?: () => void;
  size?: number;
}

const CHIP_PALETTE: Record<
  ChipValue,
  { outer: string; inner: string; edge: string; label: string }
> = {
  50: { outer: '#0F3D2E', inner: '#082219', edge: '#D4AF37', label: '50' },
  100: { outer: '#141926', inner: '#090C12', edge: '#F3E5AB', label: '100' },
  500: { outer: '#4A121A', inner: '#26070B', edge: '#D4AF37', label: '500' },
  1000: { outer: '#102542', inner: '#071324', edge: '#F3E5AB', label: '1K' },
  5000: { outer: '#9E7818', inner: '#4A3608', edge: '#FAF0C8', label: '5K' },
};

/**
 * Pure SVG Casino Chip with radial serrated stroke-dasharray,
 * numbered central medallion, and 3D stack drop shadow.
 */
export const CasinoChipSVG: React.FC<CasinoChipSVGProps> = ({
  value,
  disabled = false,
  onClick,
  size = 52,
}) => {
  const pal = CHIP_PALETTE[value];

  return (
    <button
      type="button"
      disabled={disabled || !onClick}
      onClick={onClick}
      aria-label={`Jeton ${value} €`}
      style={{ width: size, height: size }}
      className="group relative shrink-0 cursor-pointer rounded-full transition-transform duration-150 hover:-translate-y-1 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
    >
      <svg
        viewBox="0 0 64 64"
        className="h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.75)]"
        aria-hidden="true"
      >
        {/* Stack Thickness Edge Shadow */}
        <circle cx="32" cy="34.5" r="28" fill="#040507" />
        {/* Main Chip Body */}
        <circle cx="32" cy="31" r="28" fill={pal.outer} stroke={pal.edge} strokeWidth="1.5" />
        {/* Radial Serrated Edge Teeth */}
        <circle
          cx="32"
          cy="31"
          r="24.5"
          fill="none"
          stroke={pal.edge}
          strokeWidth="4.2"
          strokeDasharray="5.2 5.05"
          strokeOpacity="0.92"
        />
        {/* Inner Champagne Gold Ring */}
        <circle
          cx="32"
          cy="31"
          r="17.5"
          fill={pal.inner}
          stroke={pal.edge}
          strokeWidth="1.2"
        />
        {/* Inner Filigree Dotted Ring */}
        <circle
          cx="32"
          cy="31"
          r="14.5"
          fill="none"
          stroke={pal.edge}
          strokeOpacity="0.45"
          strokeDasharray="1.5 2.5"
          strokeWidth="0.9"
        />
        {/* Central Numbered Medallion */}
        <text
          x="32"
          y="34.5"
          textAnchor="middle"
          fill="#F3E5AB"
          className="font-mono-num text-[12px] font-bold"
        >
          {pal.label}
        </text>
      </svg>
    </button>
  );
};
