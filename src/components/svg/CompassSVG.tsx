import React from 'react';
import { BridgeVulnerability, SeatId, Suit } from '../../types/game';
import { SuitIconSVG } from './SuitIconSVG';

interface CompassSVGProps {
  dealer: SeatId;
  activeTurn?: SeatId;
  vulnerability?: BridgeVulnerability;
  trumpSuit?: Suit | 'NT' | null;
  size?: number;
}

/**
 * Haute Horlogerie Cardinal Compass Medallion (SVG).
 * Shows N/S/E/W Vulnerability (Emerald = Non-Vulnérable, Crimson = Vulnérable),
 * Dealer (D) pin, Active Turn highlight, and Active Trump jewel.
 */
export const CompassSVG: React.FC<CompassSVGProps> = ({
  dealer,
  activeTurn = 'S',
  vulnerability = 'NONE',
  trumpSuit = null,
  size = 128,
}) => {
  const nsVuln = vulnerability === 'NS' || vulnerability === 'ALL';
  const ewVuln = vulnerability === 'EW' || vulnerability === 'ALL';

  const seatColor = (seat: SeatId) => {
    const isTurn = activeTurn === seat;
    if (isTurn) return '#F3E5AB';
    const isVuln = seat === 'N' || seat === 'S' ? nsVuln : ewVuln;
    return isVuln ? '#D9434E' : '#34D399';
  };

  return (
    <div
      style={{ width: size, height: size }}
      className="relative flex shrink-0 items-center justify-center select-none"
      aria-label={`Boussole Donneur ${dealer}, Tour ${activeTurn}`}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="compassDial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#121722" />
            <stop offset="80%" stopColor="#080A0F" />
            <stop offset="100%" stopColor="#040508" />
          </radialGradient>
        </defs>

        {/* Outer Bezel Ring */}
        <circle
          cx="60"
          cy="60"
          r="56"
          fill="url(#compassDial)"
          stroke="#D4AF37"
          strokeWidth="1.6"
        />
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="#D4AF37"
          strokeOpacity="0.35"
          strokeDasharray="3 3"
          strokeWidth="0.8"
        />

        {/* Vulnerability Axis Wedges */}
        <polygon
          points="60,12 42,34 78,34"
          fill={nsVuln ? '#9E1B24' : '#0F3D2E'}
          fillOpacity="0.85"
          stroke={activeTurn === 'N' ? '#F3E5AB' : '#D4AF37'}
          strokeWidth={activeTurn === 'N' ? '1.6' : '0.6'}
        />
        <polygon
          points="60,108 42,86 78,86"
          fill={nsVuln ? '#9E1B24' : '#0F3D2E'}
          fillOpacity="0.85"
          stroke={activeTurn === 'S' ? '#F3E5AB' : '#D4AF37'}
          strokeWidth={activeTurn === 'S' ? '1.6' : '0.6'}
        />
        <polygon
          points="12,60 34,42 34,78"
          fill={ewVuln ? '#9E1B24' : '#0F3D2E'}
          fillOpacity="0.85"
          stroke={activeTurn === 'W' ? '#F3E5AB' : '#D4AF37'}
          strokeWidth={activeTurn === 'W' ? '1.6' : '0.6'}
        />
        <polygon
          points="108,60 86,42 86,78"
          fill={ewVuln ? '#9E1B24' : '#0F3D2E'}
          fillOpacity="0.85"
          stroke={activeTurn === 'E' ? '#F3E5AB' : '#D4AF37'}
          strokeWidth={activeTurn === 'E' ? '1.6' : '0.6'}
        />

        {/* Cardinal Labels */}
        <text
          x="60"
          y="27"
          textAnchor="middle"
          className="font-display text-[10px] font-bold"
          fill={seatColor('N')}
        >
          N{dealer === 'N' ? '·D' : ''}
        </text>
        <text
          x="60"
          y="100"
          textAnchor="middle"
          className="font-display text-[10px] font-bold"
          fill={seatColor('S')}
        >
          S{dealer === 'S' ? '·D' : ''}
        </text>
        <text
          x="23"
          y="63"
          textAnchor="middle"
          className="font-display text-[10px] font-bold"
          fill={seatColor('W')}
        >
          O{dealer === 'W' ? '·D' : ''}
        </text>
        <text
          x="97"
          y="63"
          textAnchor="middle"
          className="font-display text-[10px] font-bold"
          fill={seatColor('E')}
        >
          E{dealer === 'E' ? '·D' : ''}
        </text>

        {/* Center Jewel Ring */}
        <circle
          cx="60"
          cy="60"
          r="19"
          fill="#0B0E16"
          stroke="#D4AF37"
          strokeWidth="1.4"
        />
      </svg>

      {/* Center Active Trump Jewel */}
      <div className="pointer-events-none absolute flex items-center justify-center">
        {trumpSuit === 'NT' ? (
          <span className="font-display text-xs font-extrabold text-[#F3E5AB]">SA</span>
        ) : trumpSuit ? (
          <SuitIconSVG suit={trumpSuit} className="h-5 w-5" onDark />
        ) : (
          <span className="font-mono-num text-[10px] font-bold text-[#D4AF37]">—</span>
        )}
      </div>
    </div>
  );
};
