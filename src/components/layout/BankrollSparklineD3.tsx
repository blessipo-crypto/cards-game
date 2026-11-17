import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { BankrollPoint } from '../../types/game';

interface BankrollSparklineD3Props {
  points: BankrollPoint[];
  width?: number;
  height?: number;
}

/**
 * D3 SVG Line & Area Chart visualizing real-time Bankroll progression across the session.
 */
export const BankrollSparklineD3: React.FC<BankrollSparklineD3Props> = ({
  points,
  width = 320,
  height = 54,
}) => {
  const { linePath, areaPath, lastPoint } = useMemo(() => {
    const data = points.length >= 2 ? points : [...points, { step: 1, balance: points[0]?.balance ?? 25000, label: 'Actuel' }];
    const padX = 6;
    const padY = 6;

    const minVal = d3.min(data, (d) => d.balance) ?? 0;
    const maxVal = d3.max(data, (d) => d.balance) ?? 25000;
    const span = Math.max(500, maxVal - minVal);

    const x = d3
      .scaleLinear()
      .domain([0, data.length - 1])
      .range([padX, width - padX]);

    const y = d3
      .scaleLinear()
      .domain([minVal - span * 0.12, maxVal + span * 0.12])
      .range([height - padY, padY]);

    const lineGen = d3
      .line<BankrollPoint>()
      .x((_, i) => x(i))
      .y((d) => y(d.balance))
      .curve(d3.curveMonotoneX);

    const areaGen = d3
      .area<BankrollPoint>()
      .x((_, i) => x(i))
      .y0(height - padY)
      .y1((d) => y(d.balance))
      .curve(d3.curveMonotoneX);

    const last = data[data.length - 1];
    return {
      linePath: lineGen(data) ?? '',
      areaPath: areaGen(data) ?? '',
      lastPoint: { cx: x(data.length - 1), cy: y(last.balance) },
    };
  }, [points, width, height]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[54px] w-full overflow-visible"
      aria-label="Courbe D3 de progression du Bankroll"
    >
      <defs>
        <linearGradient id="d3BankrollArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#d3BankrollArea)" />
      <path
        d={linePath}
        fill="none"
        stroke="#D4AF37"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle
        cx={lastPoint.cx}
        cy={lastPoint.cy}
        r="3"
        fill="#F3E5AB"
        stroke="#080A0F"
        strokeWidth="1.2"
      />
    </svg>
  );
};
