import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Gavel,
  MapPin,
  Radio,
  Scale,
  Search,
  ShieldCheck,
  Ticket,
  Users,
  Wifi,
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

  // Bidding form states
  const minNextBid = selectedLot
    ? Math.max(selectedLot.openingBidUsd, selectedLot.currentBidUsd + selectedLot.bidIncrementUsd)
    : 0;

  const [customBidInput, setCustomBidInput] = useState<string>('');
  const [maxProxyInput, setMaxProxyInput] = useState<string>('');
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  useEffect(() => {
    setActivePhotoIndex(0);
    if (selectedLot) {
      const next = Math.max(
        selectedLot.openingBidUsd,
        selectedLot.currentBidUsd + selectedLot.bidIncrementUsd
      );
      setCustomBidInput(String(next));
      setMaxProxyInput('');
    }
  }, [selectedLot?.id, selectedLot?.currentBidUsd, selectedLot?.bidIncrementUsd, selectedLot?.openingBidUsd]);

  // Admin Ring Clerk physical floor bid inputs
  const [floorPaddleInput, setFloorPaddleInput] = useState<string>('FLOOR-114');
  const [floorAmountInput, setFloorAmountInput] = useState<string>('');

  useEffect(() => {
    if (selectedLot) {
      setFloorAmountInput(
        String(Math.max(selectedLot.openingBidUsd, selectedLot.currentBidUsd + selectedLot.bidIncrementUsd))
      );
    }
  }, [selectedLot?.id, selectedLot?.currentBidUsd, selectedLot?.bidIncrementUsd, selectedLot?.openingBidUsd]);

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

  const handleQuickBid = (multiplier: number) => {
    if (!selectedLot) return;
    if (!currentUser) {
      openAuth('login');
      return;
    }
    const targetAmount =
      selectedLot.currentBidUsd + selectedLot.bidIncrementUsd * multiplier;
    placeOnlineBid(selectedLot.id, targetAmount);
  };

  const handleCustomBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot) return;
    if (!currentUser) {
      openAuth('login');
      return;
    }
    const amount = Number(customBidInput);
    const maxProxy = maxProxyInput.trim() ? Number(maxProxyInput) : undefined;
    if (!Number.isFinite(amount) || amount < minNextBid) return;
    const ok = placeOnlineBid(selectedLot.id, amount, maxProxy);
    if (ok) {
      setMaxProxyInput('');
    }
  };

  const handleFloorBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot) return;
    const amount = Number(floorAmountInput);
    if (!floorPaddleInput.trim() || !Number.isFinite(amount) || amount < minNextBid) return;
    recordFloorBid(selectedLot.id, floorPaddleInput.trim().toUpperCase(), amount);
  };

  const handleJumpToAuction = (auctionId: string) => {
    setSelectedAuctionId(auctionId);
    setActiveTab('live-ring');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      {/* Editorial Hybrid Auction Banner */}
      <section className="relative bg-[#071320] text-white overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <SafeImage
            src={ASSET_IMAGES.auctionRing}
            alt="MARIKETI physical livestock auction ring with simultaneous online bidding"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#071320]/96 via-[#0A1C30]/86 to-[#091827]/55" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-9 sm:py-12">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-[#F69B3D] uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-3.5 h-3.5" aria-hidden="true" />
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
      <div className="bg-white border-b border-[#DFE6EE]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Auction views"
            className="inline-flex rounded-lg bg-[#EEF3F8] p-1 border border-[#DFE6EE] w-full sm:w-auto overflow-x-auto"
          >
            {(
              [
                { id: 'live-ring', label: 'Live Hybrid Ring', icon: Gavel },
                { id: 'upcoming', label: 'Upcoming & Past Sales', icon: Calendar },
                { id: 'centers', label: 'Physical Auction Centres', icon: Building2 },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-[#F28C28]',
                    active
                      ? 'bg-[#10243A] text-white shadow-xs'
                      : 'text-[#526071] hover:text-[#10243A]'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeAuction && activeTab === 'live-ring' && (
            <div className="flex items-center gap-2.5 text-xs text-[#526071]">
              <Wifi className="w-3.5 h-3.5 text-[#1A7A50] shrink-0" aria-hidden="true" />
              <span>
                Simultaneous Ring Sync · <strong className="text-[#10243A]">{activeAuction.mode}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Body */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 sm:py-9">
        {/* ============================================================
            TAB 1: LIVE HYBRID RING
            ============================================================ */}
        {activeTab === 'live-ring' && (
          <div className="space-y-6">
            {/* Auction Selector & Bidder Paddle Strip */}
            <Card className="p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 flex-1">
                  <label
                    htmlFor="auction-selector"
                    className="text-xs font-semibold text-[#526071] uppercase tracking-wider shrink-0"
                  >
                    Sale Ring
                  </label>
                  <select
                    id="auction-selector"
                    value={activeAuction?.id || ''}
                    onChange={(e) => setSelectedAuctionId(e.target.value)}
                    className="h-10 rounded-lg bg-[#F7F9FC] border border-[#D4DDE6] px-3 text-sm font-semibold text-[#10243A] focus:outline-none focus:border-[#10243A] min-w-0 flex-1 max-w-xl"
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
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A7A50] font-mono tabular-nums">
                        <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
                        Paddle {userPaddleNumber} Active
                      </span>
                    ) : (
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => registerBidderPaddle(activeAuction.id)}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        Register Online Paddle
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {activeAuction && (
                <div className="mt-3 pt-3 border-t border-[#DFE6EE] flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#526071]">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#1E547A]" aria-hidden="true" />
                    {getCountryFlag(activeAuction.country)} {activeAuction.centerName}, {activeAuction.district}
                  </span>
                  <span>Auctioneer: <strong className="text-[#10243A]">{activeAuction.auctioneerName}</strong></span>
                  <span className="font-mono tabular-nums">Ref: {activeAuction.reference}</span>
                  <span>{formatDateTime(activeAuction.startsAt)}</span>
                </div>
              )}
            </Card>

            {selectedLot ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT 8 COLS: Active Lot Stage + Bidding Console + Live Bid Tape */}
                <div className="lg:col-span-8 space-y-5">
                  <Card className="overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-12">
                      {/* Lot Photo Stage */}
                      <div className="md:col-span-6 bg-[#071320] flex flex-col">
                        <div className="relative aspect-[4/3] w-full overflow-hidden">
                          <SafeImage
                            src={selectedLot.images[activePhotoIndex] || selectedLot.images[0]}
                            alt={selectedLot.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 bg-[#071320]/85 text-white px-2.5 py-1 rounded-md text-xs font-mono font-bold tabular-nums border border-white/15">
                            {selectedLot.lotNumber} · {selectedLot.quantity} Head
                          </div>
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
                            <StatusLabel
                              tone={LOT_STATUS_TONE[selectedLot.status]}
                              label={
                                selectedLot.status === 'Live'
                                  ? 'Live on Floor & Online'
                                  : selectedLot.status
                              }
                            />
                            <span className="text-xs font-mono font-semibold text-[#526071] tabular-nums">
                              {selectedLot.bidCount} {selectedLot.bidCount === 1 ? 'bid' : 'bids'}
                            </span>
                          </div>

                          <h2 className="mt-2 text-lg sm:text-xl font-bold text-[#10243A] leading-snug">
                            {selectedLot.title}
                          </h2>

                          <p className="mt-1.5 text-xs text-[#526071]">
                            {getCountryFlag(selectedLot.country)} {selectedLot.farmOrigin} · {selectedLot.breed} · {selectedLot.gender}
                          </p>

                          <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-[#DFE6EE] text-xs">
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
                              <p className="font-mono font-semibold text-[#1A7A50] truncate">
                                {selectedLot.vetCertRef}
                              </p>
                            </div>
                          </div>

                          <p className="mt-3 text-xs text-[#526071] leading-relaxed">
                            {selectedLot.notes}
                          </p>
                        </div>

                        {/* Current High Bid Box */}
                        <div className="rounded-lg bg-[#F7F9FC] border border-[#DFE6EE] p-3.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-semibold text-[#526071] uppercase tracking-wider">
                              {selectedLot.status === 'Sold' ? 'Hammer Price' : 'Current High Bid'}
                            </span>
                            <span
                              className={cn(
                                'text-xs font-semibold',
                                selectedLot.currentBidUsd >= selectedLot.reservePriceUsd
                                  ? 'text-[#1A7A50]'
                                  : 'text-[#9A630A]'
                              )}
                            >
                              {selectedLot.currentBidUsd >= selectedLot.reservePriceUsd
                                ? 'Reserve Met'
                                : 'Reserve Not Yet Met'}
                            </span>
                          </div>

                          <div className="mt-1 flex items-baseline justify-between gap-2">
                            <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#10243A] tabular-nums">
                              {formatUSD(selectedLot.currentBidUsd)}
                            </p>
                            <p className="font-mono text-xs text-[#526071] tabular-nums">
                              ≈ {formatUSD(Math.round(selectedLot.currentBidUsd / Math.max(1, selectedLot.quantity)))} / head
                            </p>
                          </div>

                          <div className="mt-2 pt-2 border-t border-[#DFE6EE] flex items-center justify-between gap-2 text-xs">
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
                                      ? 'text-[#C96A0F]'
                                      : 'text-[#1E547A]'
                                  )}
                                >
                                  {selectedLot.highestBidChannel === 'Floor'
                                    ? `Physical Floor · ${selectedLot.highestBidderPaddle}`
                                    : `Online Ring · ${selectedLot.highestBidderPaddle}`}
                                </span>
                              </>
                            ) : (
                              <span className="text-[#526071]">
                                Opening ask: <strong className="font-mono tabular-nums text-[#10243A]">{formatUSD(selectedLot.openingBidUsd)}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Online Bidding Action Panel */}
                    <div className="p-4 sm:p-5 border-t border-[#DFE6EE] bg-[#F7F9FC]/65">
                      {selectedLot.status === 'Live' ? (
                        <div className="space-y-4">
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
                                (increment {formatUSD(selectedLot.bidIncrementUsd)})
                              </p>
                            </div>
                            {currentUser ? (
                              <span className="text-xs font-mono font-semibold text-[#1E547A] tabular-nums">
                                Bidding as {userPaddleNumber}
                              </span>
                            ) : (
                              <Button variant="primary" size="sm" onClick={() => openAuth('login')}>
                                Sign In to Bid Live
                              </Button>
                            )}
                          </div>

                          {/* Quick Increment Buttons */}
                          <div className="grid grid-cols-3 gap-2.5">
                            {[1, 2, 5].map((mult) => {
                              const nextVal =
                                selectedLot.currentBidUsd + selectedLot.bidIncrementUsd * mult;
                              return (
                                <Button
                                  key={mult}
                                  type="button"
                                  variant={mult === 1 ? 'accent' : 'secondary'}
                                  size="md"
                                  className="font-mono tabular-nums"
                                  onClick={() => handleQuickBid(mult)}
                                >
                                  Bid {formatUSD(nextVal)}
                                </Button>
                              );
                            })}
                          </div>

                          {/* Custom Bid + Optional Proxy Ceiling */}
                          <form
                            onSubmit={handleCustomBidSubmit}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-2 border-t border-[#DFE6EE]"
                          >
                            <div className="sm:col-span-4">
                              <Input
                                label="Custom Bid (USD)"
                                type="number"
                                min={minNextBid}
                                step={selectedLot.bidIncrementUsd}
                                value={customBidInput}
                                onChange={(e) => setCustomBidInput(e.target.value)}
                                className="font-mono tabular-nums"
                                required
                              />
                            </div>
                            <div className="sm:col-span-5">
                              <Input
                                label="Optional Max Auto-Bid Proxy (USD)"
                                type="number"
                                min={minNextBid}
                                step={selectedLot.bidIncrementUsd}
                                placeholder="Leave blank for direct bid"
                                value={maxProxyInput}
                                onChange={(e) => setMaxProxyInput(e.target.value)}
                                className="font-mono tabular-nums"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <Button type="submit" variant="primary" size="md" className="w-full">
                                <Gavel className="w-4 h-4" />
                                Submit Bid
                              </Button>
                            </div>
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
                          {selectedLot.status === 'Queued' && activeAuction && !isRegisteredForActive && (
                            <Button
                              variant="accent"
                              size="sm"
                              onClick={() => registerBidderPaddle(activeAuction.id)}
                            >
                              Register Paddle
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Auctioneer / Admin Physical Ring Clerk Console */}
                  {isAdminAccount && (
                    <Card className="p-4 sm:p-5 border-[#10243A]/30 bg-[#F7F9FC]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DFE6EE]">
                        <div>
                          <p className="text-xs font-semibold text-[#C96A0F] uppercase tracking-wider">
                            Auctioneer Ring Clerk Console
                          </p>
                          <h3 className="text-sm font-bold text-[#10243A] mt-0.5">
                            Log Physical Floor Bids & Control Lot Hammer
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
                                variant="accent"
                                size="sm"
                                onClick={() => updateAuctionLotStatus(selectedLot.id, 'Sold')}
                              >
                                Hammer Sold
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => updateAuctionLotStatus(selectedLot.id, 'Passed In')}
                              >
                                Pass In
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {selectedLot.status === 'Live' && (
                        <form
                          onSubmit={handleFloorBidSubmit}
                          className="mt-3.5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                        >
                          <div className="sm:col-span-4">
                            <Input
                              label="Physical Floor Paddle"
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
                            <Button type="submit" variant="primary" size="md" className="w-full">
                              Record Floor Bid
                            </Button>
                          </div>
                        </form>
                      )}
                    </Card>
                  )}

                  {/* Real-Time Unified Bid Tape (Floor vs Online) */}
                  <Card className="overflow-hidden">
                    <div className="px-4 sm:px-5 py-3.5 border-b border-[#DFE6EE] flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-[#10243A]">
                          Live Unified Bid Tape · {selectedLot.lotNumber}
                        </h3>
                        <p className="text-xs text-[#526071]">
                          Chronological record combining physical sale-yard floor paddles and online bidders.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-semibold text-[#1E547A] tabular-nums">
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
                      <div className="divide-y divide-[#DFE6EE] max-h-[340px] overflow-y-auto">
                        {activeLotBids.map((bid, idx) => (
                          <div
                            key={bid.id}
                            className={cn(
                              'px-4 sm:px-5 py-3 flex items-center justify-between gap-4 text-sm',
                              idx === 0 && 'bg-[#F7F9FC]'
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                                <span
                                  className={cn(
                                    'text-xs font-semibold uppercase tracking-wide',
                                    bid.channel === 'Floor'
                                      ? 'text-[#C96A0F]'
                                      : 'text-[#1E547A]'
                                  )}
                                >
                                  {bid.channel === 'Floor' ? 'Physical Floor' : 'Online Ring'}
                                </span>
                                <span className="text-xs font-mono font-semibold text-[#10243A] tabular-nums">
                                  {bid.paddleNumber}
                                </span>
                                <span className="text-xs text-[#526071] truncate">
                                  · {bid.bidderName}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#526071] mt-0.5">
                                {formatDateTime(bid.timestamp)}
                                {bid.maxProxyUsd
                                  ? ` · Proxy ceiling active`
                                  : ''}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-mono font-bold text-[#10243A] tabular-nums">
                                {formatUSD(bid.amountUsd)}
                              </p>
                              {idx === 0 && (
                                <p className="text-[11px] font-semibold text-[#1A7A50]">
                                  Leading
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                {/* RIGHT 4 COLS: Sale Catalog Lot Queue */}
                <div className="lg:col-span-4 space-y-4">
                  <Card className="overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-[#DFE6EE] bg-[#F7F9FC]/70">
                      <h3 className="text-sm font-bold text-[#10243A]">
                        Sale Catalog Queue
                      </h3>
                      <p className="text-xs text-[#526071] mt-0.5">
                        Select any lot to inspect vet certs or place live bids.
                      </p>
                    </div>
                    <div className="divide-y divide-[#DFE6EE]">
                      {lotsForAuction.map((lot) => {
                        const isSelected = lot.id === selectedLot.id;
                        return (
                          <button
                            key={lot.id}
                            type="button"
                            onClick={() => setSelectedLotId(lot.id)}
                            className={cn(
                              'w-full text-left p-4 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#F28C28]',
                              isSelected
                                ? 'bg-[#EEF4FA] border-l-3 border-l-[#F28C28]'
                                : 'hover:bg-[#F7F9FC]'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-bold text-[#10243A] tabular-nums">
                                {lot.lotNumber} · {lot.quantity} hd
                              </span>
                              <StatusLabel
                                tone={LOT_STATUS_TONE[lot.status]}
                                label={lot.status}
                              />
                            </div>
                            <p className="mt-1 text-sm font-semibold text-[#10243A] line-clamp-1">
                              {lot.title}
                            </p>
                            <p className="text-xs text-[#526071] mt-0.5">
                              {lot.breed} · Avg {lot.avgWeightKg} kg
                            </p>
                            <div className="mt-2 flex items-baseline justify-between text-xs">
                              <span className="text-[#526071]">
                                {lot.status === 'Queued' ? 'Opening' : 'Current Bid'}
                              </span>
                              <span className="font-mono font-bold text-[#10243A] tabular-nums">
                                {formatUSD(
                                  lot.status === 'Queued' ? lot.openingBidUsd : lot.currentBidUsd
                                )}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>

                  <Card className="p-4 space-y-2.5">
                    <h4 className="text-xs font-semibold text-[#1E547A] uppercase tracking-wider">
                      Hybrid Ring Assurance
                    </h4>
                    <ul className="space-y-2 text-xs text-[#526071] leading-relaxed">
                      <li className="flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#1A7A50] shrink-0 mt-0.5" />
                        <span>Every lot is physically penned, weighed, and cleared by veterinary inspectors before ring entry.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Scale className="w-4 h-4 text-[#1A7A50] shrink-0 mt-0.5" />
                        <span>Certified sale-yard weighbridge tickets issued immediately upon hammer fall.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-[#1A7A50] shrink-0 mt-0.5" />
                        <span>Floor bids are keyed live by the MARIKETI Ring Clerk so online buyers see exact parity.</span>
                      </li>
                    </ul>
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
              <div className="inline-flex rounded-lg bg-white p-1 border border-[#DFE6EE] w-fit">
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
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-white border border-[#D4DDE6] text-sm text-[#0F1B2A] placeholder:text-[#667587] focus:outline-none focus:border-[#10243A]"
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
                      <div className="relative aspect-[16/9] bg-[#071320] overflow-hidden">
                        <SafeImage
                          src={sale.coverImage}
                          alt={sale.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#071320]/85 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 text-white">
                          <span className="font-mono text-xs font-semibold tabular-nums">
                            {sale.reference} · {sale.mode}
                          </span>
                          <span className="font-mono text-xs font-semibold tabular-nums">
                            {sale.totalLots} Catalogued Lots
                          </span>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <StatusLabel
                              tone={AUCTION_STATUS_TONE[sale.status]}
                              label={sale.status}
                            />
                            <span className="text-xs text-[#526071] font-mono tabular-nums">
                              {formatDateTime(sale.startsAt)}
                            </span>
                          </div>

                          <h3 className="mt-2 text-lg font-bold text-[#10243A] leading-snug">
                            {sale.title}
                          </h3>

                          <p className="mt-1 text-xs text-[#526071]">
                            {getCountryFlag(sale.country)} {sale.centerName} · {sale.district}, {sale.province}
                          </p>
                          <p className="mt-0.5 text-xs text-[#526071]">
                            Auctioneer: <strong className="text-[#10243A]">{sale.auctioneerName}</strong> ·{' '}
                            <span className="font-mono tabular-nums">{sale.registeredBidders} bidders</span>
                          </p>

                          <p className="mt-3 text-[13px] text-[#526071] leading-relaxed">
                            {sale.catalogNotes}
                          </p>
                        </div>

                        <div className="pt-3.5 border-t border-[#DFE6EE] flex flex-wrap items-center justify-between gap-2.5">
                          <span className="text-xs text-[#526071] font-mono tabular-nums">
                            {saleLotCount > 0 ? `${saleLotCount} interactive lots ready` : 'Catalog finalizing'}
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
                              <span className="text-xs font-semibold text-[#1A7A50] inline-flex items-center gap-1 mr-1">
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
                <p className="text-xs font-semibold text-[#1E547A] uppercase tracking-wider">
                  Countrywide Launch Network · Expanding Across Africa
                </p>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold text-[#10243A]">
                  Accredited Physical Auction Centres & Sale Yards
                </h2>
                <p className="mt-1 text-sm text-[#526071] max-w-2xl">
                  Starting with primary sale-yard hubs across Zimbabwe (Gwanda, Bulawayo, Harare, Masvingo) and interconnected with regional partner yards in South Africa, Botswana, and Kenya.
                </p>
              </div>

              <div className="inline-flex flex-wrap rounded-lg bg-white p-1 border border-[#DFE6EE]">
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
                    {country === 'All' ? 'All Countries' : `${getCountryFlag(country)} ${country}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCenters.map((center) => {
                const centerAuction = auctions.find((a) => a.centerId === center.id);
                return (
                  <Card key={center.id} className="overflow-hidden flex flex-col">
                    <div className="relative aspect-[16/10] bg-[#071320] overflow-hidden">
                      <SafeImage
                        src={center.image}
                        alt={center.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-[#071320]/85 text-white px-2.5 py-1 rounded text-[11px] font-mono font-bold border border-white/15">
                        {center.code}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#1E547A]">
                            {getCountryFlag(center.country)} {center.country} · {center.province}
                          </span>
                          <StatusLabel
                            tone={center.status === 'Active' ? 'success' : 'info'}
                            label={center.status}
                          />
                        </div>

                        <h3 className="mt-1.5 text-base font-bold text-[#10243A] leading-snug">
                          {center.name}
                        </h3>
                        <p className="mt-1 text-xs text-[#526071]">{center.address}</p>

                        <div className="mt-3.5 pt-3 border-t border-[#DFE6EE] grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[#526071]">Pen Capacity</span>
                            <p className="font-mono font-bold text-[#10243A] tabular-nums">
                              {center.penCapacityHead.toLocaleString()} head
                            </p>
                          </div>
                          <div>
                            <span className="text-[#526071]">Weighbridge</span>
                            <p className="font-semibold text-[#1A7A50]">
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
                          <strong className="text-[#10243A]">Ring Manager:</strong> {center.ringManager}
                        </p>
                        <p className="mt-1.5 text-xs text-[#526071] leading-relaxed">
                          <strong className="text-[#10243A]">Facilities:</strong>{' '}
                          {center.facilities.join(' · ')}
                        </p>
                      </div>

                      {centerAuction && (
                        <div className="pt-3 border-t border-[#DFE6EE]">
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
    </div>
  );
};
