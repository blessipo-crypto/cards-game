import React from 'react';
import { Suit } from '../../types/game';

interface SuitIconSVGProps {
  suit: Suit;
  className?: string;
  onDark?: boolean;
}

/**
 * Precision beveled vector suit pip (Spade, Heart, Diamond, Club)
 * using Monte-Carlo Crimson (#9E1B24) and Obsidian/Champagne accents.
 */
export const SuitIconSVG: React.FC<SuitIconSVGProps> = ({
  suit,
  className = 'w-5 h-5',
  onDark = false,
}) => {
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const fill = isRed ? '#9E1B24' : onDark ? '#F3E5AB' : '#111520';
  const highlight = isRed ? '#D9434E' : onDark ? '#FFF7D6' : '#333B4F';

  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      {suit === 'spades' && (
        <g>
          <path
            d="M16 3 C16 3 5 12.5 5 19.2 C5 23.2 8.2 25.5 11.4 25.5 C13.3 25.5 14.7 24.4 15.4 23.2 L13.4 29 H18.6 L16.6 23.2 C17.3 24.4 18.7 25.5 20.6 25.5 C23.8 25.5 27 23.2 27 19.2 C27 12.5 16 3 16 3 Z"
            fill={fill}
          />
          <path
            d="M15.8 5.2 C13 8 7.4 14 7.4 18.6 C7.4 20.6 8.5 22 10 22.7"
            fill="none"
            stroke={highlight}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />
        </g>
      )}
      {suit === 'hearts' && (
        <g>
          <path
            d="M16 27.5 C16 27.5 4.5 19.8 4.5 11.4 C4.5 7.4 7.7 4.5 11.3 4.5 C13.5 4.5 15.1 5.6 16 7.3 C16.9 5.6 18.5 4.5 20.7 4.5 C24.3 4.5 27.5 7.4 27.5 11.4 C27.5 19.8 16 27.5 16 27.5 Z"
            fill={fill}
          />
          <path
            d="M7.2 11.4 C7.2 8.9 9 7 11.3 7"
            fill="none"
            stroke={highlight}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
        </g>
      )}
      {suit === 'diamonds' && (
        <g>
          <polygon points="16,3 26.5,16 16,29 5.5,16" fill={fill} />
          <polygon
            points="16,5.8 23.5,16 16,26.2 8.5,16"
            fill="none"
            stroke={highlight}
            strokeWidth="1"
            strokeOpacity="0.55"
          />
        </g>
      )}
      {suit === 'clubs' && (
        <g>
          <circle cx="16" cy="9.5" r="5.3" fill={fill} />
          <circle cx="9.6" cy="18.2" r="5.3" fill={fill} />
          <circle cx="22.4" cy="18.2" r="5.3" fill={fill} />
          <path d="M14.7 16.5 L12.8 28.8 H19.2 L17.3 16.5 Z" fill={fill} />
          <path
            d="M13.5 7.2 A3.5 3.5 0 0 1 18.2 6.8"
            fill="none"
            stroke={highlight}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />
        </g>
      )}
    </svg>
  );
};
