import React, { useId } from 'react';
import { CardData } from '../../types/game';
import { getCardHCP } from '../../utils/bridgeLogic';
import { SuitIconSVG } from './SuitIconSVG';

interface PlayingCardSVGProps {
  card: CardData;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  playable?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  isTrump?: boolean;
  isDummy?: boolean;
  showHcp?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZE_MAP = {
  xs: { w: 54, h: 76, rankCls: 'text-[11px]', pipCls: 'w-2.5 h-2.5', centerCls: 'w-6 h-6' },
  sm: { w: 72, h: 101, rankCls: 'text-xs', pipCls: 'w-3 h-3', centerCls: 'w-8 h-8' },
  md: { w: 90, h: 126, rankCls: 'text-sm', pipCls: 'w-3.5 h-3.5', centerCls: 'w-10 h-10' },
  lg: { w: 108, h: 151, rankCls: 'text-base', pipCls: 'w-4 h-4', centerCls: 'w-12 h-12' },
};

/**
 * Pure SVG Playing Card (1:1.4 Ratio, 12px corners, Ivory face gradient,
 * internal golden filigree frame, geometric guilloché card back, and dynamic
 * ATOUT / LE MORT / HCP contextual badges). Zero external images.
 */
export const PlayingCardSVG: React.FC<PlayingCardSVGProps> = ({
  card,
  size = 'md',
  playable = false,
  dimmed = false,
  selected = false,
  isTrump = false,
  isDummy = false,
  showHcp = false,
  onClick,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const dims = SIZE_MAP[size];
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const isJoker = card.rank === 'JOKER';
  const inkColor = isJoker ? '#9C781C' : isRed ? '#9E1B24' : '#111520';
  const isCourt = card.rank === 'J' || card.rank === 'Q' || card.rank === 'K' || card.rank === 'A' || isJoker;
  const hcp = showHcp ? getCardHCP(card) : 0;

  return (
    <button
      type="button"
      disabled={!onClick || !playable}
      onClick={playable && onClick ? onClick : undefined}
      aria-label={
        card.faceUp
          ? isJoker
            ? 'Joker'
            : `${card.rank} de ${card.suit}`
          : 'Carte face cachée'
      }
      style={{ width: dims.w, height: dims.h }}
      className={`group relative shrink-0 select-none rounded-[12px] text-left transition-all duration-200 ${
        playable
          ? 'cursor-pointer hover:-translate-y-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3E5AB]'
          : 'cursor-default'
      } ${dimmed ? 'opacity-50 saturate-75' : 'opacity-100'} ${
        selected ? '-translate-y-3 ring-2 ring-[#F3E5AB]' : ''
      } ${className}`}
    >
      {/* Specular Gold Elevation Shadow */}
      <div
        className={`pointer-events-none absolute inset-0 rounded-[12px] transition-shadow duration-200 ${
          playable
            ? 'shadow-[0_12px_26px_rgba(0,0,0,0.65),0_0_0_1px_rgba(212,175,55,0.75)] group-hover:shadow-[0_18px_36px_rgba(0,0,0,0.8),0_0_18px_rgba(212,175,55,0.5)]'
            : 'shadow-[0_10px_22px_rgba(0,0,0,0.58)]'
        }`}
      />

      {card.faceUp ? (
        <svg viewBox="0 0 100 140" className="h-full w-full rounded-[12px]" aria-hidden="true">
          <defs>
            <linearGradient id={`ivory_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FCFBF9" />
              <stop offset="60%" stopColor="#F2EFE9" />
              <stop offset="100%" stopColor="#E6E0D4" />
            </linearGradient>
            <linearGradient id={`frame_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.65" />
              <stop offset="50%" stopColor="#9A7920" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.65" />
            </linearGradient>
          </defs>

          {/* Ivory Card Stock */}
          <rect
            x="0.5"
            y="0.5"
            width="99"
            height="139"
            rx="11"
            fill={`url(#ivory_${uid})`}
            stroke={isTrump || playable ? '#D4AF37' : '#C8BEA8'}
            strokeWidth={isTrump || playable ? '1.6' : '1'}
          />

          {/* Inner Golden Filigree Frame */}
          <rect
            x="6.5"
            y="6.5"
            width="87"
            height="127"
            rx="7"
            fill="none"
            stroke={`url(#frame_${uid})`}
            strokeWidth="0.9"
          />

          {/* Corner Filigree Micro-Dots */}
          <circle cx="10.5" cy="10.5" r="1" fill="#D4AF37" fillOpacity="0.6" />
          <circle cx="89.5" cy="10.5" r="1" fill="#D4AF37" fillOpacity="0.6" />
          <circle cx="10.5" cy="129.5" r="1" fill="#D4AF37" fillOpacity="0.6" />
          <circle cx="89.5" cy="129.5" r="1" fill="#D4AF37" fillOpacity="0.6" />

          {/* Court / Ace / Joker Royal Medallion */}
          {isCourt && (
            <g opacity={isJoker ? '0.45' : '0.22'}>
              <circle cx="50" cy="70" r="24" fill="none" stroke="#D4AF37" strokeWidth="1.2" />
              <polygon
                points="50,43 74,70 50,97 26,70"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="0.9"
              />
            </g>
          )}
        </svg>
      ) : (
        /* Geometric Guilloché Card Back SVG */
        <svg viewBox="0 0 100 140" className="h-full w-full rounded-[12px]" aria-hidden="true">
          <defs>
            <linearGradient id={`backBg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#131926" />
              <stop offset="50%" stopColor="#0A0E16" />
              <stop offset="100%" stopColor="#06080D" />
            </linearGradient>
            <pattern
              id={`guilloche_${uid}`}
              width="12"
              height="12"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 6 L6 0 L12 6 L6 12 Z"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="0.65"
                strokeOpacity="0.45"
              />
              <circle cx="6" cy="6" r="1.2" fill="#D4AF37" fillOpacity="0.35" />
            </pattern>
          </defs>

          <rect
            x="0.5"
            y="0.5"
            width="99"
            height="139"
            rx="11"
            fill={`url(#backBg_${uid})`}
            stroke="#D4AF37"
            strokeOpacity="0.7"
            strokeWidth="1.2"
          />
          <rect
            x="7"
            y="7"
            width="86"
            height="126"
            rx="7"
            fill={`url(#guilloche_${uid})`}
            stroke="#D4AF37"
            strokeOpacity="0.55"
            strokeWidth="0.9"
          />
          {/* Central Watchmaker Rosette */}
          <circle
            cx="50"
            cy="70"
            r="16"
            fill="#0A0D14"
            stroke="#D4AF37"
            strokeWidth="1.2"
          />
          <polygon
            points="50,57 63,70 50,83 37,70"
            fill="none"
            stroke="#F3E5AB"
            strokeWidth="0.9"
          />
          <circle cx="50" cy="70" r="3" fill="#D4AF37" />
        </svg>
      )}

      {/* Face-Up Vector Ranks, Suit Pips & Dynamic Badges */}
      {card.faceUp && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-1.5">
          {/* Top-Left Index */}
          <div className="flex flex-col items-center self-start leading-none">
            <span
              className={`font-display font-bold tracking-tight ${isJoker ? 'text-[9px]' : dims.rankCls}`}
              style={{ color: inkColor }}
            >
              {isJoker ? '★' : card.rank}
            </span>
            {!isJoker && <SuitIconSVG suit={card.suit} className={dims.pipCls} />}
          </div>

          {/* Center Pip or Royal Joker Crown */}
          <div className="flex flex-col items-center justify-center">
            {isJoker ? (
              <svg viewBox="0 0 40 40" className={dims.centerCls} aria-hidden="true">
                <path
                  d="M6 28 L9 12 L16 20 L20 8 L24 20 L31 12 L34 28 Z"
                  fill="#9C781C"
                  stroke="#9E1B24"
                  strokeWidth="1.5"
                />
                <circle cx="9" cy="11" r="2.2" fill="#9E1B24" />
                <circle cx="20" cy="7" r="2.5" fill="#9E1B24" />
                <circle cx="31" cy="11" r="2.2" fill="#9E1B24" />
                <rect x="7" y="29" width="26" height="3.5" rx="1.5" fill="#111520" />
              </svg>
            ) : (
              <SuitIconSVG suit={card.suit} className={dims.centerCls} />
            )}
            {isJoker ? (
              <span className="font-display text-[8px] font-bold tracking-widest text-[#9E1B24]">
                JOKER
              </span>
            ) : (
              isCourt &&
              card.rank !== 'A' && (
                <span
                  className="font-display -mt-0.5 text-[10px] font-bold tracking-widest"
                  style={{ color: '#9C781C' }}
                >
                  {card.rank}
                </span>
              )
            )}
          </div>

          {/* Bottom-Right Mirrored Index */}
          <div className="flex rotate-180 flex-col items-center self-end leading-none">
            <span
              className={`font-display font-bold tracking-tight ${isJoker ? 'text-[9px]' : dims.rankCls}`}
              style={{ color: inkColor }}
            >
              {isJoker ? '★' : card.rank}
            </span>
            {!isJoker && <SuitIconSVG suit={card.suit} className={dims.pipCls} />}
          </div>
        </div>
      )}

      {/* Dynamic Contextual Badges: ATOUT (Belote) / LE MORT & HCP (Bridge) */}
      {card.faceUp && isTrump && (
        <div className="pointer-events-none absolute -top-2 right-1 rounded-sm border border-[#F3E5AB] bg-[#080A0F] px-1.5 py-0.5 font-mono-num text-[8px] font-bold tracking-wider text-[#F3E5AB] shadow">
          ATOUT
        </div>
      )}
      {card.faceUp && isDummy && (
        <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded-sm border border-[#D4AF37] bg-[#102542] px-1.5 py-0.5 font-mono-num text-[8px] font-bold tracking-wider text-[#F3E5AB] shadow whitespace-nowrap">
          LE MORT
        </div>
      )}
      {card.faceUp && hcp > 0 && (
        <div className="pointer-events-none absolute top-1 right-1.5 font-mono-num text-[9px] font-bold text-[#9C781C]">
          +{hcp}
        </div>
      )}
    </button>
  );
};
