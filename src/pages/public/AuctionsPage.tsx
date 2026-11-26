import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Search,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import {
  ASSET_IMAGES,
  cn,
  formatDate,
  formatDateTime,
  formatUSD,
  getCountryFlag,
} from '../../lib/utils';
import type { AuctionEvent, AuctionLot } from '../../types/mariketi';
import {
  Button,
  Card,
  EmptyState,
  Input,
  SafeImage,
  StatusLabel,
} from '../../components/ui/DesignSystem';

type AuctionsTab = 'live-ring' | 'upcoming' | 'centers';
type QueueFilter = 'All' | 'Live' | 'Queued' | 'Sold';
type RingCallout = 'none' | 'going-once' | 'going-twice';

const LOT_STATUS_TONE: Record<
  AuctionLot['status'],
  'success' | 'warning' | 'info' | 'neutral'
> = {
  Live: 'success',
  Queued: 'info',
  Sold: 'warning',
  'Passed In': 'neutral',
};

const AUCTION_STATUS_TONE: Record<
  AuctionEvent['status'],
  'success' | 'info' | 'neutral'
> = {
  'Live Now': 'success',
  Upcoming: 'info',
  Completed: 'neutral',
};

const FLOOR_PADDLE_PRESETS = ['FLOOR-104', 'FLOOR-114', 'FLOOR-208'];

export const AuctionsPage: React.FC = () => {
  const {
    auctionCenters,
    auctions,
    auctionLots,
    auctionBidsByLot,
    registeredAuctionIds,
    userPaddleNumber,
    currentUser,
    isAdminAccount,
    registerBidderPaddle,
    watchAuctionLotBids,
    placeOnlineBid,
    recordFloorBid,
    updateAuctionLotStatus,
    hammerAndAdvanceLot,
    openAuth,
  } = useMariketi();

  const [activeTab, setActiveTab] = useState<AuctionsTab>('live-ring');

  // Default to the first Live Now auction, or first auction overall
  const defaultAuctionId = useMemo(() => {
    const live = auctions.find((a) => a.status === 'Live Now');
    return live?.id || auctions[0]?.id || '';
  }, [auctions]);

  const [selectedAuctionId, setSelectedAuctionId] = useState<string>(defaultAuctionId);

  useEffect(() => {
    if (!selectedAuctionId && defaultAuctionId) {
      setSelectedAuctionId(defaultAuctionId);
    }
  }, [defaultAuctionId, selectedAuctionId]);

  const activeAuction = useMemo(
    () => auctions.find((a) => a.id === selectedAuctionId) || auctions[0] || null,
    [auctions, selectedAuctionId]
  );

  const lotsForAuction = useMemo(() => {
    if (!activeAuction) return [];
    return auctionLots
      .filter((l) => l.auctionId === activeAuction.id)
      .sort((a, b) => a.lotNumber.localeCompare(b.lotNumber));
  }, [auctionLots, activeAuction]);

  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('All');

  // Auto-select the live lot (or first lot) whenever activeAuction changes
  useEffect(() => {
    if (lotsForAuction.length === 0) {
      setSelectedLotId('');
      return;
    }
    const stillValid = lotsForAuction.some((l) => l.id === selectedLotId);
    if (!stillValid) {
      const liveLot = lotsForAuction.find((l) => l.status === 'Live') || lotsForAuction[0];
      setSelectedLotId(liveLot.id);
    }
  }, [lotsForAuction, selectedLotId]);

  const selectedLot = useMemo(
    () => lotsForAuction.find((l) => l.id === selectedLotId) || lotsForAuction[0] || null,
    [lotsForAuction, selectedLotId]
  );

  const liveLotInAuction = useMemo(
    () => lotsForAuction.find((l) => l.status === 'Live') || null,
    [lotsForAuction]
  );

  const selectedLotIndex = useMemo(() => {
    if (!selectedLot) return -1;
    return lotsForAuction.findIndex((l) => l.id === selectedLot.id);
  }, [lotsForAuction, selectedLot]);

  const filteredQueueLots = useMemo(() => {
    if (queueFilter === 'All') return lotsForAuction;
    return lotsForAuction.filter((l) => l.status === queueFilter);
  }, [lotsForAuction, queueFilter]);

  // Subscribe to real-time bids for the active lot
  useEffect(() => {
    if (!selectedLot?.id) return;
    const unsub = watchAuctionLotBids(selectedLot.id);
    return () => unsub();
  }, [selectedLot?.id, watchAuctionLotBids]);

  const activeLotBids = useMemo(() => {
    if (!selectedLot) return [];
    return auctionBidsByLot[selectedLot.id] || [];
  }, [auctionBidsByLot, selectedLot]);

  // Visual flash trigger whenever currentBidUsd updates on the viewed lot
  const [bidFlashKey, setBidFlashKey] = useState<number>(0);
  const prevBidRef = useRef<{ lotId: string; amount: number } | null>(null);

  useEffect(() => {
    if (!selectedLot) return;
    const prev = prevBidRef.current;
    if (prev && prev.lotId === selectedLot.id && prev.amount !== selectedLot.currentBidUsd) {
      setBidFlashKey((k) => k + 1);
    }
    prevBidRef.current = { lotId: selectedLot.id, amount: selectedLot.currentBidUsd };
  }, [selectedLot?.id, selectedLot?.currentBidUsd]);

  // Bidding form & guard states
  const minNextBid = selectedLot
    ? Math.max(selectedLot.openingBidUsd, selectedLot.currentBidUsd + selectedLot.bidIncrementUsd)
    : 0;

  const [customBidInput, setCustomBidInput] = useState<string>('');
  const [maxProxyInput, setMaxProxyInput] = useState<string>('');
  const [bidError, setBidError] = useState<string>('');
  const [confirmGuardEnabled, setConfirmGuardEnabled] = useState<boolean>(false);
  const [armedBidAmount, setArmedBidAmount] = useState<number | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [ringCallout, setRingCallout] = useState<RingCallout>('none');

  // Auto-disarm 2-step confirmation after 5s
  useEffect(() => {
    if (armedBidAmount === null) return;
    const t = setTimeout(() => setArmedBidAmount(null), 5000);
    return () => clearTimeout(t);
  }, [armedBidAmount]);

  useEffect(() => {
    setActivePhotoIndex(0);
    setBidError('');
    setArmedBidAmount(null);
    setRingCallout('none');
    if (selectedLot) {
      const next = Math.max(
        selectedLot.openingBidUsd,
        selectedLot.currentBidUsd + selectedLot.bidIncrementUsd
      );
      setCustomBidInput(String(next));
      setMaxProxyInput('');
    }
  }, [selectedLot?.id]);

  // Keep custom bid synced cleanly when a competing bid lands on the same lot
  useEffect(() => {
    if (!selectedLot) return;
    const next = Math.max(
      selectedLot.openingBidUsd,
      selectedLot.currentBidUsd + selectedLot.bidIncrementUsd
    );
    setCustomBidInput(String(next));
    setArmedBidAmount(null);
    setRingCallout('none');
  }, [selectedLot?.currentBidUsd, selectedLot?.bidIncrementUsd, selectedLot?.openingBidUsd]);

  // Admin Ring Clerk physical floor bid inputs
  const [floorPaddleInput, setFloorPaddleInput] = useState<string>('FLOOR-114');
  const [floorAmountInput, setFloorAmountInput] = useState<string>('');

  useEffect(() => {
    if (selectedLot) {
      setFloorAmountInput(
        String(
          Math.max(
            selectedLot.openingBidUsd,
            selectedLot.currentBidUsd + selectedLot.bidIncrementUsd
          )
        )
      );
    }
  }, [
    selectedLot?.id,
    selectedLot?.currentBidUsd,
    selectedLot?.bidIncrementUsd,
    selectedLot?.openingBidUsd,
  ]);

  // Upcoming sales filters
  const [saleStatusFilter, setSaleStatusFilter] = useState<'All' | AuctionEvent['status']>('All');
  const [saleSearch, setSaleSearch] = useState<string>('');

  const filteredSales = useMemo(() => {
    return auctions.filter((a) => {
      if (saleStatusFilter !== 'All' && a.status !== saleStatusFilter) return false;
      if (saleSearch.trim()) {
        const q = saleSearch.toLowerCase();
        const hay = `${a.title} ${a.reference} ${a.centerName} ${a.country} ${a.province} ${a.district} ${a.auctioneerName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [auctions, saleStatusFilter, saleSearch]);

  // Centers country filter
  const [centerCountryFilter, setCenterCountryFilter] = useState<string>('All');
  const centerCountries = useMemo(() => {
    const unique = Array.from(new Set(auctionCenters.map((c) => c.country)));
    return ['All', ...unique];
  }, [auctionCenters]);

  const filteredCenters = useMemo(() => {
    if (centerCountryFilter === 'All') return auctionCenters;
    return auctionCenters.filter((c) => c.country === centerCountryFilter);
  }, [auctionCenters, centerCountryFilter]);

  const liveCount = auctions.filter((a) => a.status === 'Live Now').length;
  const totalRegisteredBidders = auctions.reduce((acc, a) => acc + a.registeredBidders, 0);
  const isRegisteredForActive = activeAuction
    ? registeredAuctionIds.includes(activeAuction.id)
    : false;

  // Compute current user's bidding status on selectedLot
  const userBidPosition = useMemo(() => {
    if (!selectedLot || !currentUser) return null;
    const isLeading =
      selectedLot.highestBidderId === currentUser.id ||
      selectedLot.highestBidderPaddle === userPaddleNumber;
    const userBids = activeLotBids.filter(
      (b) => b.bidderId === currentUser.id || b.paddleNumber === userPaddleNumber
    );
    const highestProxy = userBids.reduce<number>(
      (max, b) => (b.maxProxyUsd && b.maxProxyUsd > max ? b.maxProxyUsd : max),
      0
    );
    if (isLeading) {
      return { status: 'leading' as const, proxyCap: highestProxy || null };
    }
    if (userBids.length > 0) {
      return {
        status: 'outbid' as const,
        leader: selectedLot.highestBidderPaddle || 'Another bidder',
      };
    }
    return null;
  }, [selectedLot, currentUser, userPaddleNumber, activeLotBids]);

  // Live per-head & per-kg breakdown for custom bid input
  const customBidNumeric = Number(customBidInput);
  const livePricingBreakdown = useMemo(() => {
    if (!selectedLot) return null;
    const basis =
      Number.isFinite(customBidNumeric) && customBidNumeric > 0
        ? customBidNumeric
        : minNextBid;
    const qty = Math.max(1, selectedLot.quantity);
    const totalKg = qty * Math.max(1, selectedLot.avgWeightKg);
    return {
      basis,
      perHead: Math.round(basis / qty),
      perKg: (basis / totalKg).toFixed(2),
    };
  }, [selectedLot, customBidNumeric, minNextBid]);

  const reserveProgressPct = selectedLot
    ? Math.min(100, Math.round((selectedLot.currentBidUsd / Math.max(1, selectedLot.reservePriceUsd)) * 100))
    : 0;
  const reserveMet = selectedLot
    ? selectedLot.currentBidUsd >= selectedLot.reservePriceUsd
    : false;

  const executeOnlineBid = (targetAmount: number, maxProxy?: number) => {
    if (!selectedLot) return;
    if (!currentUser) {
      openAuth('login');
      return;
    }
    if (!Number.isFinite(targetAmount) || targetAmount < minNextBid) {
      setBidError(`Enter at least ${formatUSD(minNextBid)} to meet the next increment.`);
      return;
    }
    if (maxProxy !== undefined && (!Number.isFinite(maxProxy) || maxProxy < targetAmount)) {
      setBidError('Max Auto-Bid Proxy must be greater than or equal to your bid.');
      return;
    }
    setBidError('');

    if (confirmGuardEnabled && armedBidAmount !== targetAmount) {
      setArmedBidAmount(targetAmount);
      return;
    }
    setArmedBidAmount(null);
    const ok = placeOnlineBid(selectedLot.id, targetAmount, maxProxy);
    if (ok) {
      setMaxProxyInput('');
      setRingCallout('none');
    }
  };

  const handleQuickBid = (multiplier: number) => {
    if (!selectedLot) return;
    const targetAmount =
      selectedLot.currentBidUsd + selectedLot.bidIncrementUsd * multiplier;
    executeOnlineBid(targetAmount);
  };

  const handleCustomBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(customBidInput);
    const maxProxy = maxProxyInput.trim() ? Number(maxProxyInput) : undefined;
    executeOnlineBid(amount, maxProxy);
  };

  const handleFloorQuickBid = (multiplier: number) => {
    if (!selectedLot) return;
    const targetAmount =
      selectedLot.currentBidUsd + selectedLot.bidIncrementUsd * multiplier;
    const paddle = floorPaddleInput.trim().toUpperCase() || 'FLOOR-114';
    const ok = recordFloorBid(selectedLot.id, paddle, targetAmount);
    if (ok) setRingCallout('none');
  };

  const handleFloorBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot) return;
    const amount = Number(floorAmountInput);
    if (!floorPaddleInput.trim() || !Number.isFinite(amount) || amount < minNextBid) return;
    const ok = recordFloorBid(selectedLot.id, floorPaddleInput.trim().toUpperCase(), amount);
    if (ok) setRingCallout('none');
  };

  const handleHammerAdvance = (outcome: 'Sold' | 'Passed In') => {
    if (!selectedLot) return;
    const nextLotId = hammerAndAdvanceLot(selectedLot.id, outcome);
    setRingCallout('none');
    if (nextLotId) {
      setSelectedLotId(nextLotId);
    }
  };

  const handleJumpToAuction = (auctionId: string) => {
    setSelectedAuctionId(auctionId);
    setActiveTab('live-ring');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showMobileQuickBidBar =
    activeTab === 'live-ring' && selectedLot?.status === 'Live';

  return (
    <div className={cn(showMobileQuickBidBar && 'pb-20 lg:pb-0')}>
      {/* Editorial Hybrid Auction Banner */}
      <section className="relative bg-[#071320] text-white overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <SafeImage
            src={ASSET_IMAGES.auctionRing}
            alt="MARIKETI physical livestock auction ring with simultaneous online bidding"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#071320]/96 via-[#0A1C30]/88 to-[#091827]/58" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-9 sm:py-12">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-[#F69B3D]">
              Hybrid Physical + Online Livestock Auctions
            </p>
            <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Bid live alongside the physical sale-yard ring.
            </h1>
            <p className="mt-3 text-sm sm:text-[15px] text-slate-200 leading-relaxed max-w-2xl prose-justify">
              Launching with accredited physical auction centres across Zimbabwe and expanding into Southern & East Africa. Every lot is weighbridge-verified, veterinary cleared, and broadcast in real time so floor bidders and online buyers compete transparently in one unified ring.
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <p className="text-xs text-slate-300 font-medium">Active Live Rings</p>
              <p className="mt-0.5 font-mono text-xl sm:text-2xl font-bold text-[#F69B3D] tabular-nums">
                {liveCount} Live Now
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-300 font-medium">Physical Sale Yards</p>
              <p className="mt-0.5 font-mono text-xl sm:text-2xl font-bold text-white tabular-nums">
                {auctionCenters.length} Centres
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-300 font-medium">Registered Ring Bidders</p>
              <p className="mt-0.5 font-mono text-xl sm:text-2xl font-bold text-white tabular-nums">
                {totalRegisteredBidders.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-300 font-medium">Your Online Paddle</p>
              <p className="mt-0.5 font-mono text-xl sm:text-2xl font-bold text-white tabular-nums">
                {currentUser ? userPaddleNumber : 'Sign in to bid'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Segmented Navigation Bar */}
      <div className="bg-white border-b border-[#DCE4EC]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Auction views"
            className="inline-flex rounded-lg bg-[#EEF3F8] p-1 border border-[#DCE4EC] w-full sm:w-auto overflow-x-auto"
          >
            {(
              [
                { id: 'live-ring', label: 'Live Hybrid Ring' },
                { id: 'upcoming', label: 'Upcoming & Past Sales' },
                { id: 'centers', label: 'Physical Auction Centres' },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 sm:flex-initial inline-flex items-center justify-center px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#F28C28]',
                    active
                      ? 'bg-[#10243A] text-white'
                      : 'text-[#526071] hover:text-[#10243A]'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeAuction && activeTab === 'live-ring' && (
            <p className="text-xs text-[#526071]">
              Simultaneous Ring Sync ·{' '}
              <strong className="text-[#10243A]">{activeAuction.mode}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Main Tab Body */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 sm:py-9">
        {/* ============================================================
            TAB 1: LIVE HYBRID RING
            ============================================================ */}
        {activeTab === 'live-ring' && (
          <div className="space-y-5">
            {/* Auction Selector & Bidder Paddle Strip */}
            <Card className="p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <label
                    htmlFor="auction-selector"
                    className="text-xs font-semibold text-[#526071] shrink-0"
                  >
                    Sale Ring
                  </label>
                  <select
                    id="auction-selector"
                    value={activeAuction?.id || ''}
                    onChange={(e) => setSelectedAuctionId(e.target.value)}
                    className="h-10 rounded-lg bg-[#F7F9FC] border border-[#CFD9E3] px-3 text-sm font-semibold text-[#10243A] focus:outline-none focus:border-[#10243A] min-w-0 flex-1 max-w-xl"
                  >
                    {auctions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {getCountryFlag(a.country)} [{a.status}] {a.title} — {a.centerName}
                      </option>
                    ))}
                  </select>
                </div>

                {activeAuction && (
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusLabel
                      tone={AUCTION_STATUS_TONE[activeAuction.status]}
                      label={activeAuction.status}
                    />
                    <span className="text-xs text-[#526071] font-mono tabular-nums">
                      {activeAuction.registeredBidders} bidders · {activeAuction.totalLots} lots
                    </span>
                    {isRegisteredForActive ? (
                      <span className="text-xs font-semibold text-[#156B45] font-mono tabular-nums">
                        Paddle {userPaddleNumber} Ready
                      </span>
                    ) : (
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => registerBidderPaddle(activeAuction.id)}
                      >
                        Register Online Paddle
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {activeAuction && (
                <div className="mt-3 pt-3 border-t border-[#DCE4EC] flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs text-[#526071]">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      {getCountryFlag(activeAuction.country)} {activeAuction.centerName},{' '}
                      {activeAuction.district}
                    </span>
                    <span>
                      Auctioneer:{' '}
                      <strong className="text-[#10243A]">{activeAuction.auctioneerName}</strong>
                    </span>
                    <span className="font-mono tabular-nums">Ref: {activeAuction.reference}</span>
                    <span>{formatDateTime(activeAuction.startsAt)}</span>
                  </div>

                  {/* Quick Lot Stepper */}
                  {selectedLot && lotsForAuction.length > 1 && (
                    <div className="flex items-center gap-2 shrink-0">
                      {liveLotInAuction && liveLotInAuction.id !== selectedLot.id && (
                        <button
                          type="button"
                          onClick={() => setSelectedLotId(liveLotInAuction.id)}
                          className="text-xs font-semibold text-[#156B45] hover:underline mr-1"
                        >
                          Jump to Live ({liveLotInAuction.lotNumber})
                        </button>
                      )}
                      <span className="font-mono text-[11px] text-[#526071] tabular-nums">
                        Lot {selectedLotIndex + 1} of {lotsForAuction.length}
                      </span>
                      <div className="inline-flex items-center rounded-md border border-[#CFD9E3] bg-white overflow-hidden">
                        <button
                          type="button"
                          aria-label="Previous lot"
                          disabled={selectedLotIndex <= 0}
                          onClick={() =>
                            selectedLotIndex > 0 &&
                            setSelectedLotId(lotsForAuction[selectedLotIndex - 1].id)
                          }
                          className="h-7 w-7 flex items-center justify-center text-[#10243A] hover:bg-[#F3F6F9] disabled:opacity-35 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Next lot"
                          disabled={selectedLotIndex >= lotsForAuction.length - 1}
                          onClick={() =>
                            selectedLotIndex < lotsForAuction.length - 1 &&
                            setSelectedLotId(lotsForAuction[selectedLotIndex + 1].id)
                          }
                          className="h-7 w-7 flex items-center justify-center text-[#10243A] hover:bg-[#F3F6F9] border-l border-[#DCE4EC] disabled:opacity-35 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {selectedLot ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT 8 COLS: Active Lot Stage + Bidding Console + Live Bid Tape */}
                <div className="lg:col-span-8 space-y-5 min-w-0">
                  <Card className="overflow-hidden">
                    {/* Optional Live Ring Callout Strip (Auctioneer Cadence) */}
                    {ringCallout !== 'none' && selectedLot.status === 'Live' && (
                      <div
                        className={cn(
                          'px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 border-b',
                          ringCallout === 'going-twice'
                            ? 'bg-[#FFF3E0] text-[#9A4B06] border-[#F2C98A]'
                            : 'bg-[#EEF4FA] text-[#10243A] border-[#CFD9E3]'
                        )}
                      >
                        <span>
                          {ringCallout === 'going-once'
                            ? `Auctioneer Call: Going Once at ${formatUSD(selectedLot.currentBidUsd)} (${selectedLot.highestBidderPaddle || 'Ring'})`
                            : `Final Warning: Going Twice at ${formatUSD(selectedLot.currentBidUsd)} — Last call before hammer`}
                        </span>
                        <span className="font-mono text-xs tabular-nums shrink-0">
                          {selectedLot.lotNumber}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12">
                      {/* Lot Photo Stage — unobstructed photography */}
                      <div className="md:col-span-6 bg-[#071320] flex flex-col">
                        <div className="aspect-[4/3] w-full overflow-hidden">
                          <SafeImage
                            src={selectedLot.images[activePhotoIndex] || selectedLot.images[0]}
                            alt={selectedLot.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {selectedLot.images.length > 1 && (
                          <div className="p-2.5 flex items-center gap-2 bg-[#0B1C2F] border-t border-white/10">
                            {selectedLot.images.map((img, idx) => (
                              <button
                                key={img + idx}
                                type="button"
                                onClick={() => setActivePhotoIndex(idx)}
                                className={cn(
                                  'h-11 w-16 rounded overflow-hidden border-2 transition-all',
                                  activePhotoIndex === idx
                                    ? 'border-[#F28C28]'
                                    : 'border-transparent opacity-70 hover:opacity-100'
                                )}
                              >
                                <SafeImage
                                  src={img}
                                  alt={`${selectedLot.title} view ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Lot Specs & High Bid Summary */}
                      <div className="md:col-span-6 p-5 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-xs font-bold text-[#10243A] tabular-nums">
                                {selectedLot.lotNumber}
                              </span>
                              <span className="text-[#CBD5E1]" aria-hidden="true">
                                ·
                              </span>
                              <StatusLabel
                                tone={LOT_STATUS_TONE[selectedLot.status]}
                                label={
                                  selectedLot.status === 'Live'
                                    ? 'Live on Floor & Online'
                                    : selectedLot.status
                                }
                              />
                            </div>
                            <span className="text-xs font-mono font-semibold text-[#526071] tabular-nums shrink-0">
                              {selectedLot.bidCount} {selectedLot.bidCount === 1 ? 'bid' : 'bids'}
                            </span>
                          </div>

                          <h2 className="mt-2 text-lg sm:text-xl font-bold text-[#10243A] leading-snug">
                            {selectedLot.title}
                          </h2>

                          <p className="mt-1.5 text-xs text-[#526071]">
                            {getCountryFlag(selectedLot.country)} {selectedLot.farmOrigin} ·{' '}
                            {selectedLot.breed} · {selectedLot.gender}
                          </p>

                          <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-[#DCE4EC] text-xs">
                            <div>
                              <span className="text-[#526071]">Quantity</span>
                              <p className="font-mono font-semibold text-[#10243A] tabular-nums">
                                {selectedLot.quantity} head
                              </p>
                            </div>
                            <div>
                              <span className="text-[#526071]">Avg Live Weight</span>
                              <p className="font-mono font-semibold text-[#10243A] tabular-nums">
                                {selectedLot.avgWeightKg} kg
                              </p>
                            </div>
                            <div>
                              <span className="text-[#526071]">Age Profile</span>
                              <p className="font-semibold text-[#10243A]">{selectedLot.ageLabel}</p>
                            </div>
                            <div>
                              <span className="text-[#526071]">Vet Clearance</span>
                              <p className="font-mono font-semibold text-[#156B45] truncate">
                                {selectedLot.vetCertRef}
                              </p>
                            </div>
                          </div>

                          <p className="mt-3 text-xs text-[#526071] leading-relaxed">
                            {selectedLot.notes}
                          </p>
                        </div>

                        {/* Current High Bid Box with Bid Flash & Reserve Meter */}
                        <div
                          key={bidFlashKey}
                          className={cn(
                            'rounded-lg bg-[#F7F9FC] border border-[#DCE4EC] p-3.5',
                            bidFlashKey > 0 && 'animate-bid-flash'
                          )}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-semibold text-[#526071]">
                              {selectedLot.status === 'Sold' ? 'Hammer Price' : 'Current High Bid'}
                            </span>
                            <span
                              className={cn(
                                'text-xs font-semibold tabular-nums',
                                reserveMet ? 'text-[#156B45]' : 'text-[#9A5B06]'
                              )}
                            >
                              {reserveMet
                                ? 'Reserve Met'
                                : `${reserveProgressPct}% toward reserve`}
                            </span>
                          </div>

                          <div className="mt-1 flex items-baseline justify-between gap-2">
                            <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#10243A] tabular-nums">
                              {formatUSD(selectedLot.currentBidUsd)}
                            </p>
                            <p className="font-mono text-xs text-[#526071] tabular-nums">
                              ≈{' '}
                              {formatUSD(
                                Math.round(
                                  selectedLot.currentBidUsd / Math.max(1, selectedLot.quantity)
                                )
                              )}{' '}
                              / head
                            </p>
                          </div>

                          {/* Clean Reserve Progress Bar */}
                          <div className="mt-2 h-1.5 w-full rounded-full bg-[#DCE4EC] overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-300',
                                reserveMet ? 'bg-[#156B45]' : 'bg-[#F28C28]'
                              )}
                              style={{ width: `${reserveProgressPct}%` }}
                            />
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-[#DCE4EC] flex items-center justify-between gap-2 text-xs">
                            {selectedLot.highestBidderPaddle ? (
                              <>
                                <span className="text-[#526071] truncate">
                                  Leading:{' '}
                                  <strong className="text-[#10243A]">
                                    {selectedLot.highestBidderName || 'Ring Bidder'}
                                  </strong>
                                </span>
                                <span
                                  className={cn(
                                    'font-mono font-semibold shrink-0',
                                    selectedLot.highestBidChannel === 'Floor'
                                      ? 'text-[#B85E09]'
                                      : 'text-[#1A4D73]'
                                  )}
                                >
                                  {selectedLot.highestBidChannel === 'Floor'
                                    ? `Floor · ${selectedLot.highestBidderPaddle}`
                                    : `Online · ${selectedLot.highestBidderPaddle}`}
                                </span>
                              </>
                            ) : (
                              <span className="text-[#526071]">
                                Opening ask:{' '}
                                <strong className="font-mono tabular-nums text-[#10243A]">
                                  {formatUSD(selectedLot.openingBidUsd)}
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Online Bidding Action Panel */}
                    <div className="p-4 sm:p-5 border-t border-[#DCE4EC] bg-[#F7F9FC]/70">
                      {selectedLot.status === 'Live' ? (
                        <div className="space-y-4">
                          {/* Live Bidder Position Banner */}
                          {userBidPosition && (
                            <div
                              className={cn(
                                'rounded-lg px-3.5 py-2.5 border text-xs sm:text-[13px] flex flex-wrap items-center justify-between gap-2',
                                userBidPosition.status === 'leading'
                                  ? 'bg-[#EEF8F3] border-[#B6DFC9] text-[#156B45]'
                                  : 'bg-[#FFF8EB] border-[#F2C98A] text-[#9A5B06]'
                              )}
                            >
                              <span className="font-semibold">
                                {userBidPosition.status === 'leading'
                                  ? `You hold the high bid on ${selectedLot.lotNumber} at ${formatUSD(selectedLot.currentBidUsd)}.`
                                  : `Outbid by ${userBidPosition.leader} — tap a quick bid below to retake the lead.`}
                              </span>
                              {userBidPosition.status === 'leading' && userBidPosition.proxyCap && (
                                <span className="font-mono text-xs font-bold tabular-nums">
                                  Auto-bid cap: {formatUSD(userBidPosition.proxyCap)}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-bold text-[#10243A]">
                                Place Real-Time Online Bid
                              </h3>
                              <p className="text-xs text-[#526071]">
                                Minimum next bid:{' '}
                                <span className="font-mono font-semibold text-[#10243A] tabular-nums">
                                  {formatUSD(minNextBid)}
                                </span>{' '}
                                · Increment {formatUSD(selectedLot.bidIncrementUsd)}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="inline-flex items-center gap-1.5 text-xs text-[#526071] cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={confirmGuardEnabled}
                                  onChange={(e) => {
                                    setConfirmGuardEnabled(e.target.checked);
                                    setArmedBidAmount(null);
                                  }}
                                  className="rounded border-[#CFD9E3] text-[#10243A] focus:ring-[#F28C28]"
                                />
                                <span>2-step confirm</span>
                              </label>
                              {currentUser ? (
                                <span className="text-xs font-mono font-semibold text-[#1A4D73] tabular-nums">
                                  {userPaddleNumber}
                                </span>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => openAuth('login')}
                                >
                                  Sign In to Bid
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Mobile-Safe Quick Increment Buttons */}
                          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                            {[1, 2, 5].map((mult) => {
                              const nextVal =
                                selectedLot.currentBidUsd + selectedLot.bidIncrementUsd * mult;
                              const isArmed = armedBidAmount === nextVal;
                              return (
                                <button
                                  key={mult}
                                  type="button"
                                  onClick={() => handleQuickBid(mult)}
                                  className={cn(
                                    'rounded-lg px-2.5 py-2.5 text-center transition-colors border focus-visible:outline-2 focus-visible:outline-[#F28C28]',
                                    isArmed
                                      ? 'bg-[#156B45] text-white border-[#156B45]'
                                      : mult === 1
                                      ? 'bg-[#F28C28] hover:bg-[#DC7918] text-[#091827] border-transparent'
                                      : 'bg-white hover:bg-[#EEF3F8] text-[#10243A] border-[#CFD9E3]'
                                  )}
                                >
                                  <span className="block text-[11px] font-semibold opacity-85">
                                    {isArmed ? 'Tap to confirm' : `+${mult}x increment`}
                                  </span>
                                  <span className="block font-mono text-xs sm:text-sm font-extrabold tabular-nums mt-0.5">
                                    {formatUSD(nextVal)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Custom Bid + Optional Proxy Ceiling + Live Breakdown */}
                          <form
                            onSubmit={handleCustomBidSubmit}
                            className="space-y-3 pt-3 border-t border-[#DCE4EC]"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                              <div className="sm:col-span-4">
                                <Input
                                  label="Custom Bid (USD)"
                                  type="number"
                                  min={minNextBid}
                                  step={selectedLot.bidIncrementUsd}
                                  value={customBidInput}
                                  onChange={(e) => {
                                    setCustomBidInput(e.target.value);
                                    setBidError('');
                                    setArmedBidAmount(null);
                                  }}
                                  className="font-mono tabular-nums"
                                  required
                                />
                              </div>
                              <div className="sm:col-span-5">
                                <Input
                                  label="Max Auto-Bid Proxy (Optional USD)"
                                  type="number"
                                  min={minNextBid}
                                  step={selectedLot.bidIncrementUsd}
                                  placeholder="Auto-defends against floor bids"
                                  value={maxProxyInput}
                                  onChange={(e) => {
                                    setMaxProxyInput(e.target.value);
                                    setBidError('');
                                  }}
                                  className="font-mono tabular-nums"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <Button
                                  type="submit"
                                  variant="primary"
                                  size="md"
                                  className="w-full"
                                >
                                  <Gavel className="w-4 h-4" />
                                  {armedBidAmount === Number(customBidInput)
                                    ? 'Confirm Bid'
                                    : 'Submit Bid'}
                                </Button>
                              </div>
                            </div>

                            {bidError ? (
                              <p className="text-xs font-semibold text-[#B92D2D]" role="alert">
                                {bidError}
                              </p>
                            ) : (
                              livePricingBreakdown && (
                                <p className="text-[11px] text-[#526071] font-mono tabular-nums">
                                  At {formatUSD(livePricingBreakdown.basis)} total: ≈{' '}
                                  {formatUSD(livePricingBreakdown.perHead)} / head · $
                                  {livePricingBreakdown.perKg} / kg liveweight (
                                  {(selectedLot.quantity * selectedLot.avgWeightKg).toLocaleString()}{' '}
                                  kg est. lot weight)
                                </p>
                              )
                            )}
                          </form>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-[#10243A]">
                              {selectedLot.status === 'Queued'
                                ? 'Lot is queued for the auction ring'
                                : selectedLot.status === 'Sold'
                                ? `Lot hammered down at ${formatUSD(selectedLot.currentBidUsd)}`
                                : 'Lot passed in below reserve'}
                            </p>
                            <p className="text-xs text-[#526071] mt-0.5">
                              {selectedLot.status === 'Queued'
                                ? 'Register your online paddle now so you are ready when the auctioneer opens this lot.'
                                : 'Select an active live lot from the sale catalog to continue bidding.'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {liveLotInAuction && (
                              <Button
                                variant="accent"
                                size="sm"
                                onClick={() => setSelectedLotId(liveLotInAuction.id)}
                              >
                                Go to Live Lot ({liveLotInAuction.lotNumber})
                              </Button>
                            )}
                            {selectedLot.status === 'Queued' &&
                              activeAuction &&
                              !isRegisteredForActive && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => registerBidderPaddle(activeAuction.id)}
                                >
                                  Register Paddle
                                </Button>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Auctioneer / Admin Physical Ring Clerk Console */}
                  {isAdminAccount && (
                    <Card className="p-4 sm:p-5 border-[#10243A]/25 bg-white space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#DCE4EC]">
                        <div>
                          <p className="text-xs font-semibold text-[#B85E09]">
                            Auctioneer Ring Clerk Console
                          </p>
                          <h3 className="text-sm font-bold text-[#10243A] mt-0.5">
                            Live Physical Floor Parity & Hammer Controls
                          </h3>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {selectedLot.status !== 'Live' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => updateAuctionLotStatus(selectedLot.id, 'Live')}
                            >
                              Open Lot Live
                            </Button>
                          )}
                          {selectedLot.status === 'Live' && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  setRingCallout((prev) =>
                                    prev === 'going-once' ? 'going-twice' : 'going-once'
                                  )
                                }
                              >
                                {ringCallout === 'going-once'
                                  ? 'Call Going Twice'
                                  : 'Call Going Once'}
                              </Button>
                              <Button
                                variant="accent"
                                size="sm"
                                onClick={() => handleHammerAdvance('Sold')}
                              >
                                Hammer Sold & Next
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleHammerAdvance('Passed In')}
                              >
                                Pass In
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {selectedLot.status === 'Live' && (
                        <div className="space-y-3">
                          {/* Quick Floor Paddle Selector + 1-Tap Floor Increment Keys */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold text-[#526071] mr-1">
                                Floor Paddle:
                              </span>
                              {FLOOR_PADDLE_PRESETS.map((pad) => (
                                <button
                                  key={pad}
                                  type="button"
                                  onClick={() => setFloorPaddleInput(pad)}
                                  className={cn(
                                    'px-2.5 py-1 rounded-md font-mono text-xs font-semibold border transition-colors',
                                    floorPaddleInput === pad
                                      ? 'bg-[#10243A] text-white border-[#10243A]'
                                      : 'bg-[#F7F9FC] text-[#10243A] border-[#CFD9E3] hover:bg-[#EEF3F8]'
                                  )}
                                >
                                  {pad}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {[1, 2, 5].map((mult) => (
                                <Button
                                  key={mult}
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="font-mono tabular-nums"
                                  onClick={() => handleFloorQuickBid(mult)}
                                >
                                  Floor +{mult}x
                                </Button>
                              ))}
                            </div>
                          </div>

                          <form
                            onSubmit={handleFloorBidSubmit}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-2 border-t border-[#DCE4EC]"
                          >
                            <div className="sm:col-span-4">
                              <Input
                                label="Custom Floor Paddle"
                                value={floorPaddleInput}
                                onChange={(e) => setFloorPaddleInput(e.target.value)}
                                placeholder="FLOOR-114"
                                className="font-mono uppercase"
                                required
                              />
                            </div>
                            <div className="sm:col-span-4">
                              <Input
                                label="Floor Bid Amount (USD)"
                                type="number"
                                min={minNextBid}
                                step={selectedLot.bidIncrementUsd}
                                value={floorAmountInput}
                                onChange={(e) => setFloorAmountInput(e.target.value)}
                                className="font-mono tabular-nums"
                                required
                              />
                            </div>
                            <div className="sm:col-span-4">
                              <Button
                                type="submit"
                                variant="primary"
                                size="md"
                                className="w-full"
                              >
                                Record Floor Bid
                              </Button>
                            </div>
                          </form>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Real-Time Unified Bid Tape (Floor vs Online) */}
                  <Card className="overflow-hidden">
                    <div className="px-4 sm:px-5 py-3.5 border-b border-[#DCE4EC] flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-[#10243A]">
                          Live Unified Bid Tape · {selectedLot.lotNumber}
                        </h3>
                        <p className="text-xs text-[#526071]">
                          Chronological record combining physical sale-yard floor paddles and online bidders.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-semibold text-[#1A4D73] tabular-nums shrink-0">
                        {activeLotBids.length} recorded
                      </span>
                    </div>

                    {activeLotBids.length === 0 ? (
                      <div className="p-6 text-center text-sm text-[#526071]">
                        No bids recorded on this lot yet. Opening ask is{' '}
                        <span className="font-mono font-semibold text-[#10243A] tabular-nums">
                          {formatUSD(selectedLot.openingBidUsd)}
                        </span>
                        .
                      </div>
                    ) : (
                      <div className="divide-y divide-[#DCE4EC] max-h-[340px] overflow-y-auto">
                        {activeLotBids.map((bid, idx) => {
                          const isMine =
                            currentUser &&
                            (bid.bidderId === currentUser.id ||
                              bid.paddleNumber === userPaddleNumber);
                          return (
                            <div
                              key={bid.id}
                              className={cn(
                                'px-4 sm:px-5 py-3 flex items-center justify-between gap-4 text-sm',
                                idx === 0 && 'bg-[#F7F9FC]',
                                idx === 0 && bidFlashKey > 0 && 'animate-bid-flash'
                              )}
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                                  <span
                                    className={cn(
                                      'text-xs font-semibold',
                                      bid.channel === 'Floor'
                                        ? 'text-[#B85E09]'
                                        : 'text-[#1A4D73]'
                                    )}
                                  >
                                    {bid.channel === 'Floor' ? 'Physical Floor' : 'Online Ring'}
                                  </span>
                                  <span className="text-xs font-mono font-semibold text-[#10243A] tabular-nums">
                                    {bid.paddleNumber}
                                  </span>
                                  <span className="text-xs text-[#526071] truncate">
                                    · {isMine ? 'You' : bid.bidderName}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#526071] mt-0.5">
                                  {formatDateTime(bid.timestamp)}
                                  {bid.maxProxyUsd ? ' · Auto-bid proxy active' : ''}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-mono font-bold text-[#10243A] tabular-nums">
                                  {formatUSD(bid.amountUsd)}
                                </p>
                                {idx === 0 && (
                                  <p className="text-[11px] font-semibold text-[#156B45]">
                                    Leading
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </div>

                {/* RIGHT 4 COLS: Sale Catalog Lot Queue */}
                <div className="lg:col-span-4 space-y-4">
                  <Card className="overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-[#DCE4EC] bg-[#F7F9FC]/70 space-y-2.5">
                      <div>
                        <h3 className="text-sm font-bold text-[#10243A]">
                          Sale Catalog Queue ({lotsForAuction.length})
                        </h3>
                        <p className="text-xs text-[#526071] mt-0.5">
                          Select any lot to inspect vet certs or place live bids.
                        </p>
                      </div>

                      {/* Queue Status Filter */}
                      <div className="inline-flex rounded-md bg-white p-0.5 border border-[#DCE4EC] w-full">
                        {(['All', 'Live', 'Queued', 'Sold'] as QueueFilter[]).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setQueueFilter(status)}
                            className={cn(
                              'flex-1 py-1 rounded text-[11px] font-semibold transition-colors',
                              queueFilter === status
                                ? 'bg-[#10243A] text-white'
                                : 'text-[#526071] hover:text-[#10243A]'
                            )}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="divide-y divide-[#DCE4EC]">
                      {filteredQueueLots.length === 0 ? (
                        <div className="p-5 text-center text-xs text-[#526071]">
                          No lots currently in &ldquo;{queueFilter}&rdquo; status.
                        </div>
                      ) : (
                        filteredQueueLots.map((lot) => {
                          const isSelected = lot.id === selectedLot.id;
                          const userLeadsLot =
                            currentUser &&
                            (lot.highestBidderId === currentUser.id ||
                              lot.highestBidderPaddle === userPaddleNumber);
                          return (
                            <button
                              key={lot.id}
                              type="button"
                              onClick={() => setSelectedLotId(lot.id)}
                              className={cn(
                                'w-full text-left p-4 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#F28C28]',
                                isSelected
                                  ? 'bg-[#EEF4FA] ring-1 ring-inset ring-[#10243A]/15'
                                  : 'hover:bg-[#F7F9FC]'
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-bold text-[#10243A] tabular-nums">
                                  {lot.lotNumber} · {lot.quantity} hd
                                </span>
                                <div className="flex items-center gap-2">
                                  {userLeadsLot && (
                                    <span className="text-[11px] font-semibold text-[#156B45]">
                                      You Lead
                                    </span>
                                  )}
                                  <StatusLabel
                                    tone={LOT_STATUS_TONE[lot.status]}
                                    label={lot.status}
                                  />
                                </div>
                              </div>
                              <p className="mt-1 text-sm font-semibold text-[#10243A] line-clamp-1">
                                {lot.title}
                              </p>
                              <p className="text-xs text-[#526071] mt-0.5">
                                {lot.breed} · Avg {lot.avgWeightKg} kg
                              </p>
                              <div className="mt-2 flex items-baseline justify-between text-xs">
                                <span className="text-[#526071]">
                                  {lot.status === 'Queued'
                                    ? 'Opening'
                                    : lot.status === 'Sold'
                                    ? 'Hammer Price'
                                    : 'Current Bid'}
                                </span>
                                <span className="font-mono font-bold text-[#10243A] tabular-nums">
                                  {formatUSD(
                                    lot.status === 'Queued'
                                      ? lot.openingBidUsd
                                      : lot.currentBidUsd
                                  )}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </Card>

                  <Card className="p-4 space-y-2.5">
                    <h4 className="text-xs font-semibold text-[#1A4D73]">
                      Hybrid Ring Assurance
                    </h4>
                    <ol className="space-y-2 text-xs text-[#526071] leading-relaxed">
                      <li className="flex items-start gap-2.5">
                        <span className="font-mono text-[11px] font-bold text-[#10243A] mt-0.5">
                          01.
                        </span>
                        <span>
                          Every lot is physically penned, weighed, and cleared by veterinary inspectors before ring entry.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="font-mono text-[11px] font-bold text-[#10243A] mt-0.5">
                          02.
                        </span>
                        <span>
                          Certified sale-yard weighbridge tickets are issued immediately upon hammer fall.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="font-mono text-[11px] font-bold text-[#10243A] mt-0.5">
                          03.
                        </span>
                        <span>
                          Floor bids are keyed live by the MARIKETI Ring Clerk so online buyers see exact parity.
                        </span>
                      </li>
                    </ol>
                  </Card>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No lots catalogued for this auction yet"
                description="Select another upcoming or live sale from the ring selector above, or explore our Physical Auction Centres."
                action={
                  <Button variant="primary" onClick={() => setActiveTab('upcoming')}>
                    Browse Upcoming Sales
                  </Button>
                }
              />
            )}
          </div>
        )}

        {/* ============================================================
            TAB 2: UPCOMING & PAST SALES
            ============================================================ */}
        {activeTab === 'upcoming' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="inline-flex rounded-lg bg-white p-1 border border-[#DCE4EC] w-fit">
                {(['All', 'Live Now', 'Upcoming', 'Completed'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSaleStatusFilter(status)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                      saleStatusFilter === status
                        ? 'bg-[#10243A] text-white'
                        : 'text-[#526071] hover:text-[#10243A]'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-[#526071] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={saleSearch}
                  onChange={(e) => setSaleSearch(e.target.value)}
                  placeholder="Search sale, yard, country, auctioneer..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-white border border-[#CFD9E3] text-sm text-[#0F1B2A] placeholder:text-[#667587] focus:outline-none focus:border-[#10243A]"
                />
              </div>
            </div>

            {filteredSales.length === 0 ? (
              <EmptyState
                title="No matching auction sales"
                description="Try clearing your search or switching the status filter to inspect all regional sales."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSaleStatusFilter('All');
                      setSaleSearch('');
                    }}
                  >
                    Reset Filters
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredSales.map((sale) => {
                  const registered = registeredAuctionIds.includes(sale.id);
                  const saleLotCount = auctionLots.filter((l) => l.auctionId === sale.id).length;
                  return (
                    <Card key={sale.id} className="overflow-hidden flex flex-col">
                      <div className="aspect-[16/9] bg-[#071320] overflow-hidden">
                        <SafeImage
                          src={sale.coverImage}
                          alt={sale.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <StatusLabel
                                tone={AUCTION_STATUS_TONE[sale.status]}
                                label={sale.status}
                              />
                              <span className="font-mono text-xs text-[#526071] tabular-nums">
                                {sale.reference} · {sale.totalLots} lots
                              </span>
                            </div>
                            <span className="text-xs text-[#526071] font-mono tabular-nums">
                              {formatDateTime(sale.startsAt)}
                            </span>
                          </div>

                          <h3 className="mt-2 text-lg font-bold text-[#10243A] leading-snug">
                            {sale.title}
                          </h3>

                          <p className="mt-1 text-xs text-[#526071]">
                            {getCountryFlag(sale.country)} {sale.centerName} · {sale.district},{' '}
                            {sale.province} · {sale.mode}
                          </p>
                          <p className="mt-0.5 text-xs text-[#526071]">
                            Auctioneer:{' '}
                            <strong className="text-[#10243A]">{sale.auctioneerName}</strong> ·{' '}
                            <span className="font-mono tabular-nums">
                              {sale.registeredBidders} bidders
                            </span>
                          </p>

                          <p className="mt-3 text-[13px] text-[#526071] leading-relaxed">
                            {sale.catalogNotes}
                          </p>
                        </div>

                        <div className="pt-3.5 border-t border-[#DCE4EC] flex flex-wrap items-center justify-between gap-2.5">
                          <span className="text-xs text-[#526071] font-mono tabular-nums">
                            {saleLotCount > 0
                              ? `${saleLotCount} interactive lots ready`
                              : 'Catalog finalizing'}
                          </span>
                          <div className="flex items-center gap-2">
                            {sale.status !== 'Completed' && !registered && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => registerBidderPaddle(sale.id)}
                              >
                                Register Paddle
                              </Button>
                            )}
                            {registered && (
                              <span className="text-xs font-semibold text-[#156B45] inline-flex items-center gap-1 mr-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Registered
                              </span>
                            )}
                            <Button
                              variant={sale.status === 'Live Now' ? 'accent' : 'primary'}
                              size="sm"
                              onClick={() => handleJumpToAuction(sale.id)}
                            >
                              {sale.status === 'Live Now' ? 'Enter Live Ring' : 'Inspect Lots'}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 3: PHYSICAL AUCTION CENTRES
            ============================================================ */}
        {activeTab === 'centers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#1A4D73]">
                  Countrywide Launch Network · Expanding Across Africa
                </p>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold text-[#10243A]">
                  Accredited Physical Auction Centres & Sale Yards
                </h2>
                <p className="mt-1 text-sm text-[#526071] max-w-2xl">
                  Starting with primary sale-yard hubs across Zimbabwe (Gwanda, Bulawayo, Harare, Masvingo) and interconnected with regional partner yards in South Africa, Botswana, and Kenya.
                </p>
              </div>

              <div className="inline-flex flex-wrap rounded-lg bg-white p-1 border border-[#DCE4EC]">
                {centerCountries.map((country) => (
                  <button
                    key={country}
                    type="button"
                    onClick={() => setCenterCountryFilter(country)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap',
                      centerCountryFilter === country
                        ? 'bg-[#10243A] text-white'
                        : 'text-[#526071] hover:text-[#10243A]'
                    )}
                  >
                    {country === 'All'
                      ? 'All Countries'
                      : `${getCountryFlag(country)} ${country}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCenters.map((center) => {
                const centerAuction = auctions.find((a) => a.centerId === center.id);
                return (
                  <Card key={center.id} className="overflow-hidden flex flex-col">
                    <div className="aspect-[16/10] bg-[#071320] overflow-hidden">
                      <SafeImage
                        src={center.image}
                        alt={center.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#1A4D73] truncate">
                            {getCountryFlag(center.country)} {center.country} · {center.code}
                          </span>
                          <StatusLabel
                            tone={center.status === 'Active' ? 'success' : 'info'}
                            label={center.status}
                          />
                        </div>

                        <h3 className="mt-1.5 text-base font-bold text-[#10243A] leading-snug">
                          {center.name}
                        </h3>
                        <p className="mt-1 text-xs text-[#526071]">
                          {center.address} · {center.province}
                        </p>

                        <div className="mt-3.5 pt-3 border-t border-[#DCE4EC] grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[#526071]">Pen Capacity</span>
                            <p className="font-mono font-bold text-[#10243A] tabular-nums">
                              {center.penCapacityHead.toLocaleString()} head
                            </p>
                          </div>
                          <div>
                            <span className="text-[#526071]">Weighbridge</span>
                            <p className="font-semibold text-[#156B45]">
                              {center.weighbridgeCertified ? 'Certified Digital' : 'Standard'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#526071]">Vet Authority</span>
                            <p className="font-semibold text-[#10243A] truncate">
                              {center.vetAuthority}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#526071]">Next Sale</span>
                            <p className="font-mono font-semibold text-[#10243A] tabular-nums">
                              {formatDate(center.nextSaleDate)}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 text-xs text-[#526071]">
                          <strong className="text-[#10243A]">Ring Manager:</strong>{' '}
                          {center.ringManager}
                        </p>
                        <p className="mt-1.5 text-xs text-[#526071] leading-relaxed">
                          <strong className="text-[#10243A]">Facilities:</strong>{' '}
                          {center.facilities.join(' · ')}
                        </p>
                      </div>

                      {centerAuction && (
                        <div className="pt-3 border-t border-[#DCE4EC]">
                          <Button
                            variant={centerAuction.status === 'Live Now' ? 'accent' : 'secondary'}
                            size="sm"
                            className="w-full"
                            onClick={() => handleJumpToAuction(centerAuction.id)}
                          >
                            {centerAuction.status === 'Live Now'
                              ? 'Join Live Ring at This Yard'
                              : 'View Scheduled Sale'}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Compact Sticky Mobile Quick-Bid Bar (<= 64px, shown only on live lot) */}
      {showMobileQuickBidBar && selectedLot && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#DCE4EC] shadow-[0_-4px_16px_rgba(9,24,39,0.08)] px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[#526071] truncate">
              {selectedLot.lotNumber} · High Bid
            </p>
            <p className="text-base font-extrabold font-mono tabular-nums text-[#10243A] leading-tight">
              {formatUSD(selectedLot.currentBidUsd)}
            </p>
          </div>
          <Button
            variant="accent"
            size="md"
            className="font-mono tabular-nums shrink-0"
            onClick={() => handleQuickBid(1)}
          >
            <Gavel className="w-4 h-4" />
            {armedBidAmount === minNextBid ? 'Confirm' : 'Bid'} {formatUSD(minNextBid)}
          </Button>
        </div>
      )}
    </div>
  );
};
