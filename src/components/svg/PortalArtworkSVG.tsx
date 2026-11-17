import React from 'react';
import { SalonGameId } from '../../types/game';

interface PortalArtworkSVGProps {
  game: SalonGameId;
}

/**
 * Pure Vector Signature Artwork for each of the 5 Front Desk Salons.
 * Zero external image assets.
 */
export const PortalArtworkSVG: React.FC<PortalArtworkSVGProps> = ({ game }) => {
  return (
    <svg viewBox="0 0 220 110" className="h-24 w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`pIvory_${game}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCFBF9" />
          <stop offset="100%" stopColor="#E6E0D4" />
        </linearGradient>
      </defs>

      {/* Ambient Architectural Arch Lines */}
      <path
        d="M20 98 Q110 10 200 98"
        fill="none"
        stroke="#D4AF37"
        strokeOpacity="0.22"
        strokeWidth="1"
      />
      <line x1="16" y1="98" x2="204" y2="98" stroke="#D4AF37" strokeOpacity="0.3" strokeWidth="1" />

      {game === 'belote' && (
        <g>
          {/* Valet & Neuf d'Atout */}
          <g transform="translate(64,16) rotate(-10)">
            <rect width="48" height="68" rx="6" fill={`url(#pIvory_${game})`} stroke="#D4AF37" strokeWidth="1.2" />
            <text x="8" y="18" fill="#111520" className="font-display text-[13px] font-bold">V</text>
            <text x="16" y="44" fill="#111520" className="text-[20px]">♠</text>
          </g>
          <g transform="translate(106,12) rotate(8)">
            <rect width="48" height="68" rx="6" fill={`url(#pIvory_${game})`} stroke="#D4AF37" strokeWidth="1.4" />
            <text x="8" y="18" fill="#9E1B24" className="font-display text-[13px] font-bold">9</text>
            <text x="16" y="44" fill="#9E1B24" className="text-[20px]">♥</text>
            <rect x="14" y="-5" width="28" height="10" rx="2" fill="#080A0F" stroke="#D4AF37" strokeWidth="0.8" />
            <text x="28" y="2.5" textAnchor="middle" fill="#F3E5AB" className="font-mono-num text-[6px] font-bold">ATOUT</text>
          </g>
        </g>
      )}

      {game === 'bridge' && (
        <g>
          {/* Bidding Card + 4♠ Contract */}
          <g transform="translate(56,22) rotate(-8)">
            <rect width="46" height="64" rx="6" fill={`url(#pIvory_${game})`} stroke="#D4AF37" strokeWidth="1.2" />
            <text x="23" y="34" textAnchor="middle" fill="#111520" className="font-display text-[16px] font-bold">4♠</text>
            <text x="23" y="48" textAnchor="middle" fill="#9C781C" className="font-mono-num text-[7px] font-bold">CONTRAT</text>
          </g>
          <g transform="translate(114,16) rotate(10)">
            <rect width="46" height="64" rx="6" fill={`url(#pIvory_${game})`} stroke="#D4AF37" strokeWidth="1.2" />
            <text x="9" y="17" fill="#111520" className="font-display text-[12px] font-bold">A</text>
            <text x="15" y="42" fill="#111520" className="text-[20px]">♠</text>
          </g>
        </g>
      )}

      {game === 'poker' && (
        <g>
          {/* Pocket Aces + Flop Royal */}
          <g transform="translate(50,20) rotate(-12)">
            <rect width="44" height="62" rx="6" fill={`url(#pIvory_${game})`} stroke="#D4AF37" strokeWidth="1.2" />
            <text x="8" y="16" fill="#111520" className="font-display text-[12px] font-bold">A</text>
            <text x="15" y="40" fill="#111520" className="text-[18px]">♠</text>
          </g>
          <g transform="translate(88,12)">
            <rect width="44" height="62" rx="6" fill={`url(#pIvory_${game})`} stroke="#D4AF37" strokeWidth="1.4" />
            <text x="8" y="16" fill="#9E1B24" className="font-display text-[12px] font-bold">A</text>
            <text x="15" y="40" fill="#9E1B24" className="text-[18px]">♥</text>
          </g>
          <circle cx="152" cy="64" r="14" fill="#4A121A" stroke="#D4AF37" strokeWidth="1.4" strokeDasharray="3 2.5" />
          <text x="152" y="67.5" textAnchor="middle" fill="#F3E5AB" className="font-mono-num text-[8px] font-bold">ALL-IN</text>
        </g>
      )}

      {game === 'blackjack' && (
        <g>
          <g transform="translate(64,18) rotate(-9)">
            <rect width="48" height="68" rx="6" fill={`url(#pIvory_${game})`} stroke="#D4AF37" strokeWidth="1.2" />
            <text x="8" y="18" fill="#111520" className="font-display text-[13px] font-bold">A</text>
            <text x="16" y="44" fill="#111520" className="text-[20px]">♠</text>
          </g>
          <g transform="translate(106,12) rotate(9)">
            <rect width="48" height="68" rx="6" fill={`url(#pIvory_${game})`} stroke="#D4AF37" strokeWidth="1.5" />
            <text x="8" y="18" fill="#9E1B24" className="font-display text-[13px] font-bold">R</text>
            <text x="16" y="44" fill="#9E1B24" className="text-[20px]">♦</text>
          </g>
          <circle cx="110" cy="82" r="11" fill="#080A0F" stroke="#D4AF37" strokeWidth="1.2" />
          <text x="110" y="85.5" textAnchor="middle" fill="#F3E5AB" className="font-mono-num text-[10px] font-bold">21</text>
        </g>
      )}

      {game === 'baccarat' && (
        <g>
          <g transform="translate(62,18) rotate(-7)">
            <rect width="46" height="64" rx="6" fill={`url(#pIvory_${game})`} stroke="#D4AF37" strokeWidth="1.2" />
            <text x="8" y="17" fill="#9E1B24" className="font-display text-[12px] font-bold">9</text>
            <text x="15" y="42" fill="#9E1B24" className="text-[19px]">♥</text>
          </g>
          <g transform="translate(110,18) rotate(7)">
            <rect width="46" height="64" rx="6" fill={`url(#pIvory_${game})`} stroke="#D4AF37" strokeWidth="1.2" />
            <text x="8" y="17" fill="#111520" className="font-display text-[12px] font-bold">R</text>
            <text x="15" y="42" fill="#111520" className="text-[19px]">♣</text>
          </g>
          <rect x="85" y="76" width="50" height="14" rx="2" fill="#4A121A" stroke="#D4AF37" strokeWidth="0.9" />
          <text x="110" y="85.5" textAnchor="middle" fill="#F3E5AB" className="font-mono-num text-[7.5px] font-bold">BANCO 9</text>
        </g>
      )}

      {game === 'canasta' && (
        <g>
          <g transform="translate(48,20) rotate(-11)">
            <rect width="44" height="62" rx="6" fill={`url(#pIvory_${game})`} stroke="#D4AF37" strokeWidth="1.2" />
            <text x="8" y="16" fill="#9E1B24" className="font-display text-[12px] font-bold">3</text>
            <text x="15" y="40" fill="#9E1B24" className="text-[18px]">♥</text>
          </g>
          <g transform="translate(88,12)">
            <rect width="44" height="62" rx="6" fill={`url(#pIvory_${game})`} stroke="#D4AF37" strokeWidth="1.4" />
            <text x="8" y="16" fill="#111520" className="font-display text-[12px] font-bold">A</text>
            <text x="15" y="40" fill="#111520" className="text-[18px]">♠</text>
          </g>
          <g transform="translate(128,20) rotate(11)">
            <rect width="44" height="62" rx="6" fill={`url(#pIvory_${game})`} stroke="#D4AF37" strokeWidth="1.3" />
            <text x="7" y="16" fill="#9C781C" className="font-display text-[11px] font-bold">★</text>
            <text x="22" y="40" textAnchor="middle" fill="#9E1B24" className="font-display text-[9px] font-bold">JOKER</text>
          </g>
          <rect x="69" y="77" width="82" height="14" rx="2" fill="#0F3D2E" stroke="#D4AF37" strokeWidth="0.95" />
          <text x="110" y="86.5" textAnchor="middle" fill="#F3E5AB" className="font-mono-num text-[7.5px] font-bold">CANASTA +500</text>
        </g>
      )}
    </svg>
  );
};
