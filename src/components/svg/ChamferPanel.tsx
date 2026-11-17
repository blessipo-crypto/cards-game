import React from 'react';

interface ChamferPanelProps {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  onClick?: () => void;
}

/**
 * Octagonal Chamfer HUD panel ("Haute Horlogerie") with double gold hairline
 * borders and precision corner filigree ornaments rendered in pure SVG.
 */
export const ChamferPanel: React.FC<ChamferPanelProps> = ({
  children,
  className = '',
  active = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative chamfer-clip bg-[#080A0F]/88 backdrop-blur-md transition-transform duration-200 ${className}`}
      style={{
        boxShadow: active
          ? '0 20px 50px rgba(0, 0, 0, 0.72), 0 0 28px rgba(212, 175, 55, 0.18)'
          : '0 18px 44px rgba(0, 0, 0, 0.65)',
      }}
    >
      {/* Outer & Inner Double Gold Hairline + Corner Ornaments SVG Overlay */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="chamferGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F3E5AB" stopOpacity={active ? 0.9 : 0.55} />
            <stop offset="50%" stopColor="#D4AF37" stopOpacity={active ? 0.85 : 0.42} />
            <stop offset="100%" stopColor="#8E6C18" stopOpacity={active ? 0.9 : 0.5} />
          </linearGradient>
        </defs>
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          fill="none"
          stroke="url(#chamferGoldGrad)"
          strokeWidth="1.25"
        />
        <rect
          x="5"
          y="5"
          width="calc(100% - 10px)"
          height="calc(100% - 10px)"
          fill="none"
          stroke="#D4AF37"
          strokeOpacity={active ? 0.45 : 0.22}
          strokeWidth="0.75"
        />
      </svg>

      {/* Four Corner Bevel Accent Chevrons */}
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-0 left-0 h-5 w-5 text-[#D4AF37]"
        aria-hidden="true"
      >
        <path d="M12 1 L1 12 M15 4 L4 15" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <circle cx="13.5" cy="13.5" r="1" fill="#F3E5AB" fillOpacity="0.65" />
      </svg>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-0 right-0 h-5 w-5 text-[#D4AF37]"
        aria-hidden="true"
      >
        <path d="M8 1 L19 12 M5 4 L16 15" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <circle cx="6.5" cy="13.5" r="1" fill="#F3E5AB" fillOpacity="0.65" />
      </svg>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute bottom-0 left-0 h-5 w-5 text-[#D4AF37]"
        aria-hidden="true"
      >
        <path d="M1 8 L12 19 M4 5 L15 16" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <circle cx="13.5" cy="6.5" r="1" fill="#F3E5AB" fillOpacity="0.65" />
      </svg>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 text-[#D4AF37]"
        aria-hidden="true"
      >
        <path d="M19 8 L8 19 M16 5 L5 16" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <circle cx="6.5" cy="6.5" r="1" fill="#F3E5AB" fillOpacity="0.65" />
      </svg>

      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
};
