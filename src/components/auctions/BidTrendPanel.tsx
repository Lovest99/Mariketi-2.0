import React, { useMemo, useState } from 'react';
import { cn, formatUSD } from '../../lib/utils';
import type { AuctionBid, AuctionLot } from '../../types/mariketi';
import { Card } from '../ui/DesignSystem';

interface BidTrendPanelProps {
  lot: AuctionLot;
  bids: AuctionBid[];
  currentUserId?: string;
  userPaddleNumber: string;
  flashKey: number;
}

interface ChartPoint {
  index: number;
  label: string;
  amountUsd: number;
  channel: 'Opening' | 'Floor' | 'Online';
  paddle: string;
  bidderName: string;
  timeShort: string;
  perHead: number;
}

function formatShortTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

export const BidTrendPanel: React.FC<BidTrendPanelProps> = ({
  lot,
  bids,
  currentUserId,
  userPaddleNumber,
  flashKey,
}) => {
  const [viewMode, setViewMode] = useState<'both' | 'table'>('both');
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  // Build chronological points from Opening Ask -> all recorded bids (ascending)
  const points = useMemo<ChartPoint[]>(() => {
    const qty = Math.max(1, lot.quantity);
    const ascBids = [...bids].sort((a, b) => a.amountUsd - b.amountUsd);
    const opening: ChartPoint = {
      index: 0,
      label: 'Open',
      amountUsd: lot.openingBidUsd,
      channel: 'Opening',
      paddle: 'OPEN',
      bidderName: 'Opening Ask',
      timeShort: 'Start',
      perHead: Math.round(lot.openingBidUsd / qty),
    };
    const mapped = ascBids.map((b, i) => ({
      index: i + 1,
      label: `#${i + 1}`,
      amountUsd: b.amountUsd,
      channel: b.channel,
      paddle: b.paddleNumber,
      bidderName: b.bidderName,
      timeShort: formatShortTime(b.timestamp),
      perHead: Math.round(b.amountUsd / qty),
    }));
    return [opening, ...mapped];
  }, [bids, lot.openingBidUsd, lot.quantity]);

  // Trend KPIs
  const trendStats = useMemo(() => {
    const gainUsd = Math.max(0, lot.currentBidUsd - lot.openingBidUsd);
    const gainPct =
      lot.openingBidUsd > 0 ? Math.round((gainUsd / lot.openingBidUsd) * 100) : 0;
    let avgStep = lot.bidIncrementUsd;
    if (points.length > 1) {
      let sum = 0;
      for (let i = 1; i < points.length; i++) {
        sum += Math.max(0, points[i].amountUsd - points[i - 1].amountUsd);
      }
      avgStep = Math.round(sum / (points.length - 1));
    }
    const floorCount = bids.filter((b) => b.channel === 'Floor').length;
    const onlineCount = bids.filter((b) => b.channel === 'Online').length;
    return { gainUsd, gainPct, avgStep, floorCount, onlineCount };
  }, [bids, lot.bidIncrementUsd, lot.currentBidUsd, lot.openingBidUsd, points]);

  // SVG Sparkline geometry
  const svgWidth = 560;
  const svgHeight = 132;
  const padX = 24;
  const padY = 18;
  const innerW = svgWidth - padX * 2;
  const innerH = svgHeight - padY * 2;

  const allValues = [...points.map((p) => p.amountUsd), lot.reservePriceUsd];
  const minVal = Math.min(...allValues) * 0.96;
  const maxVal = Math.max(...allValues) * 1.03;
  const span = Math.max(1, maxVal - minVal);

  const getX = (idx: number) =>
    points.length <= 1 ? padX + innerW / 2 : padX + (idx / (points.length - 1)) * innerW;
  const getY = (val: number) => padY + innerH - ((val - minVal) / span) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.amountUsd).toFixed(1)}`)
    .join(' ');
  const areaPath =
    points.length > 1
      ? `${linePath} L ${getX(points.length - 1).toFixed(1)} ${(svgHeight - padY).toFixed(1)} L ${getX(0).toFixed(1)} ${(svgHeight - padY).toFixed(1)} Z`
      : '';

  const reserveY = getY(lot.reservePriceUsd);
  const reserveMet = lot.currentBidUsd >= lot.reservePriceUsd;

  const activePoint =
    focusedIdx !== null && points[focusedIdx]
      ? points[focusedIdx]
      : points[points.length - 1];

  const qty = Math.max(1, lot.quantity);

  return (
    <Card className="overflow-hidden">
      {/* Compact Header */}
      <div className="px-4 py-3 border-b border-[#DCE4EC] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[#10243A] truncate">
            Bid Trend &amp; History · {lot.lotNumber}
          </h3>
        </div>
        <div className="inline-flex rounded-md bg-[#EEF3F8] p-0.5 border border-[#DCE4EC] shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={cn(
              'px-2.5 py-1 rounded text-[11px] font-semibold transition-colors',
              viewMode === 'both'
                ? 'bg-[#10243A] text-white'
                : 'text-[#526071] hover:text-[#10243A]'
            )}
          >
            Trend
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={cn(
              'px-2.5 py-1 rounded text-[11px] font-semibold transition-colors',
              viewMode === 'table'
                ? 'bg-[#10243A] text-white'
                : 'text-[#526071] hover:text-[#10243A]'
            )}
          >
            Table ({bids.length})
          </button>
        </div>
      </div>

      {/* Compact Single-Row Metrics Bar */}
      <div className="grid grid-cols-4 divide-x divide-[#DCE4EC] border-b border-[#DCE4EC] bg-[#F7F9FC] text-center">
        <div className="py-2 px-1.5">
          <p className="text-[10px] font-medium text-[#526071] truncate">Opening</p>
          <p className="font-mono text-xs font-bold text-[#10243A] tabular-nums whitespace-nowrap">
            {formatUSD(lot.openingBidUsd)}
          </p>
        </div>
        <div className="py-2 px-1.5">
          <p className="text-[10px] font-medium text-[#526071] truncate">Gain</p>
          <p className="font-mono text-xs font-bold text-[#156B45] tabular-nums whitespace-nowrap">
            +{trendStats.gainPct}%
          </p>
        </div>
        <div className="py-2 px-1.5">
          <p className="text-[10px] font-medium text-[#526071] truncate">Avg Step</p>
          <p className="font-mono text-xs font-bold text-[#10243A] tabular-nums whitespace-nowrap">
            +{formatUSD(trendStats.avgStep)}
          </p>
        </div>
        <div className="py-2 px-1.5">
          <p className="text-[10px] font-medium text-[#526071] truncate">Floor / Web</p>
          <p className="font-mono text-xs font-bold text-[#10243A] tabular-nums whitespace-nowrap">
            {trendStats.floorCount} / {trendStats.onlineCount}
          </p>
        </div>
      </div>

      {/* Sparkline Chart Section */}
      {viewMode === 'both' && (
        <div className="px-4 py-3 border-b border-[#DCE4EC] bg-white space-y-2">
          {/* Interactive Point Readout */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-bold text-[#10243A] tabular-nums">
                {activePoint.label}
              </span>
              <span
                className={cn(
                  'font-semibold whitespace-nowrap',
                  activePoint.channel === 'Floor'
                    ? 'text-[#B85E09]'
                    : activePoint.channel === 'Online'
                    ? 'text-[#1A4D73]'
                    : 'text-[#526071]'
                )}
              >
                {activePoint.channel === 'Opening' ? 'Start' : activePoint.paddle}
              </span>
              <span className="font-mono font-bold text-[#10243A] tabular-nums">
                {formatUSD(activePoint.amountUsd)}
              </span>
              <span className="font-mono text-[11px] text-[#526071] tabular-nums hidden sm:inline">
                ({formatUSD(activePoint.perHead)}/hd)
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#526071] shrink-0">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#B85E09]" />
                Floor
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#1A4D73]" />
                Online
              </span>
            </div>
          </div>

          {/* Responsive SVG Sparkline */}
          <div className="w-full">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-[126px] overflow-visible"
              role="img"
              aria-label={`Price trend sparkline for ${lot.lotNumber} from ${formatUSD(lot.openingBidUsd)} to ${formatUSD(lot.currentBidUsd)}`}
            >
              <defs>
                <linearGradient id={`sparkFill-${lot.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F28C28" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#F28C28" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Baseline */}
              <line
                x1={padX}
                y1={svgHeight - padY}
                x2={svgWidth - padX}
                y2={svgHeight - padY}
                stroke="#E2E8F0"
                strokeWidth="1"
              />

              {/* Reserve Price Reference Line */}
              <line
                x1={padX}
                y1={reserveY}
                x2={svgWidth - padX}
                y2={reserveY}
                stroke={reserveMet ? '#156B45' : '#9A5B06'}
                strokeWidth="1.25"
                strokeDasharray="4 4"
                opacity="0.75"
              />
              <text
                x={svgWidth - padX}
                y={Math.max(12, reserveY - 5)}
                textAnchor="end"
                fontSize="10"
                fontWeight="600"
                fill={reserveMet ? '#156B45' : '#9A5B06'}
                fontFamily="IBM Plex Mono, monospace"
              >
                Reserve {formatUSD(lot.reservePriceUsd)}
              </text>

              {/* Area Fill */}
              {areaPath && <path d={areaPath} fill={`url(#sparkFill-${lot.id})`} />}

              {/* Price Trend Line */}
              {points.length > 1 && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#F28C28"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Bid Nodes */}
              {points.map((pt, i) => {
                const cx = getX(i);
                const cy = getY(pt.amountUsd);
                const isSelected = activePoint.index === pt.index;
                const fill =
                  pt.channel === 'Floor'
                    ? '#B85E09'
                    : pt.channel === 'Online'
                    ? '#1A4D73'
                    : '#64748B';
                return (
                  <g
                    key={`${pt.label}-${i}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setFocusedIdx(i)}
                    onClick={() => setFocusedIdx(i)}
                  >
                    <circle cx={cx} cy={cy} r={12} fill="transparent" />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 5.5 : 4}
                      fill={fill}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Structured Single-Row Bid History Data Table */}
      {bids.length === 0 ? (
        <div className="p-5 text-center text-xs text-[#526071]">
          No bids yet · Opening ask{' '}
          <span className="font-mono font-bold text-[#10243A] tabular-nums">
            {formatUSD(lot.openingBidUsd)}
          </span>
        </div>
      ) : (
        <div className="max-h-[260px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F7F9FC] border-b border-[#DCE4EC] sticky top-0 z-10">
              <tr className="text-[11px] font-semibold text-[#526071]">
                <th className="py-2 pl-4 pr-2">#</th>
                <th className="py-2 px-2">Paddle</th>
                <th className="py-2 px-2">Source</th>
                <th className="py-2 px-2 text-right">Bid</th>
                <th className="py-2 pl-2 pr-4 text-right">$/Hd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE4EC] text-xs">
              {bids.map((bid, idx) => {
                const bidRank = bids.length - idx;
                const isMine =
                  Boolean(currentUserId) &&
                  (bid.bidderId === currentUserId || bid.paddleNumber === userPaddleNumber);
                return (
                  <tr
                    key={bid.id}
                    className={cn(
                      'transition-colors',
                      idx === 0 ? 'bg-[#EEF8F3]/75' : 'bg-white hover:bg-[#F7F9FC]',
                      idx === 0 && flashKey > 0 && 'animate-bid-flash'
                    )}
                  >
                    <td className="py-2.5 pl-4 pr-2 font-mono text-[#526071] tabular-nums whitespace-nowrap">
                      {bidRank}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <span className="font-mono font-semibold text-[#10243A] tabular-nums">
                        {bid.paddleNumber}
                      </span>
                      {isMine && (
                        <span className="ml-1.5 text-[10px] font-bold text-[#156B45]">You</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <span
                        className={cn(
                          'font-semibold',
                          bid.channel === 'Floor' ? 'text-[#B85E09]' : 'text-[#1A4D73]'
                        )}
                      >
                        {bid.channel === 'Floor' ? 'Floor' : 'Online'}
                      </span>
                      {bid.maxProxyUsd && (
                        <span className="ml-1 text-[10px] text-[#526071]">· Auto</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-[#10243A] tabular-nums whitespace-nowrap">
                      {formatUSD(bid.amountUsd)}
                    </td>
                    <td className="py-2.5 pl-2 pr-4 text-right font-mono text-[#526071] tabular-nums whitespace-nowrap">
                      {formatUSD(Math.round(bid.amountUsd / qty))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
