import React from 'react';
import { BridgeStrain, Suit } from '../../types/game';
import { SuitIconSVG } from './SuitIconSVG';

interface BiddingCardSVGProps {
  label: string;
  strain?: BridgeStrain | Suit;
  variant?: 'standard' | 'pass' | 'double' | 'redouble' | 'coinche' | 'active';
  disabled?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

/**
 * Beveled Bidding Card SVG / hybrid vector button for Bridge Bidding Box
 * (1♣..7SA, PASSE, CONTRE X, SURCONTRE XX) & Belote Coinche contracts (80..250, COINCHE ×2, SURCOINCHE ×4).
 */
export const BiddingCardSVG: React.FC<BiddingCardSVGProps> = ({
  label,
  strain,
  variant = 'standard',
  disabled = false,
  onClick,
  compact = false,
}) => {
  const styleMap = {
    standard: 'border-[#D4AF37]/40 bg-gradient-to-b from-[#FCFBF9] to-[#E6E0D4] text-[#111520]',
    active: 'border-[#F3E5AB] bg-gradient-to-b from-[#F3E5AB] to-[#D4AF37] text-[#080A0F]',
    pass: 'border-[#10B981]/55 bg-gradient-to-b from-[#0E3929] to-[#061D14] text-[#D1FAE5]',
    double: 'border-[#9E1B24]/80 bg-gradient-to-b from-[#7E161E] to-[#46090E] text-[#FEE2E2]',
    redouble: 'border-[#38BDF8]/65 bg-gradient-to-b from-[#153A66] to-[#0A1E38] text-[#E0F2FE]',
    coinche: 'border-[#D4AF37] bg-gradient-to-b from-[#5F131C] to-[#2B060A] text-[#F3E5AB]',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`chamfer-clip-sm relative flex cursor-pointer items-center justify-center gap-1 border font-mono-num font-bold shadow-md transition-all duration-150 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-25 ${
        compact ? 'h-8 px-2 text-xs' : 'h-9 px-3 text-xs'
      } ${styleMap[variant]}`}
    >
      <span className="whitespace-nowrap">{label}</span>
      {strain && strain !== 'NT' && (
        <SuitIconSVG
          suit={strain}
          className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}
          onDark={variant === 'pass' || variant === 'double' || variant === 'coinche'}
        />
      )}
      {strain === 'NT' && (
        <span className="font-display text-[11px] font-extrabold tracking-tight text-[#102542]">
          SA
        </span>
      )}
    </button>
  );
};
