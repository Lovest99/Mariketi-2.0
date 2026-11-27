import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gavel,
  HelpCircle,
  Minus,
  Plus,
  Search,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import { playAuctionCue } from '../../lib/auctionAudio';
import {
  ASSET_IMAGES,
  cn,
  formatDate,
  formatDateTime,
  formatUSD,
  getCountryFlag,
} from '../../lib/utils';
import type { AuctionEvent, AuctionLot } from '../../types/mariketi';
import { BidTrendPanel } from '../../components/auctions/BidTrendPanel';
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

interface PendingBidConfirmation {
  amountUsd: number;
  maxProxyUsd?: number;
  label: string;
}

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
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showBeginnerGuide, setShowBeginnerGuide] = useState<boolean>(true);

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

  // Compute current user's bidding position on selectedLot
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

  // Visual flash + live update notice whenever currentBidUsd updates on the same lot
  const [bidFlashKey, setBidFlashKey] = useState<number>(0);
  const [liveUpdateNotice, setLiveUpdateNotice] = useState<string>('');
  const prevBidRef = useRef<{
    lotId: string;
    amount: number;
    leaderId?: string;
  } | null>(null);

  useEffect(() => {
    if (!selectedLot) return;
    const prev = prevBidRef.current;
    if (prev && prev.lotId === selectedLot.id && prev.amount !== selectedLot.currentBidUsd) {
      setBidFlashKey((k) => k + 1);
      const someoneElseBeatMe =
        currentUser &&
        prev.leaderId === currentUser.id &&
        selectedLot.highestBidderId !== currentUser.id;
      if (someoneElseBeatMe) {
        playAuctionCue('outbid', soundEnabled);
        setLiveUpdateNotice(
          `Outbid — ${selectedLot.highestBidderPaddle || 'Ring'} just bid ${formatUSD(selectedLot.currentBidUsd)}`
        );
      } else {
        setLiveUpdateNotice(
          `Price updated to ${formatUSD(selectedLot.currentBidUsd)} (${selectedLot.highestBidderPaddle || 'Ring'})`
        );
      }
      const timer = setTimeout(() => setLiveUpdateNotice(''), 4200);
      prevBidRef.current = {
        lotId: selectedLot.id,
        amount: selectedLot.currentBidUsd,
        leaderId: selectedLot.highestBidderId,
      };
      return () => clearTimeout(timer);
    }
    prevBidRef.current = {
      lotId: selectedLot.id,
      amount: selectedLot.currentBidUsd,
      leaderId: selectedLot.highestBidderId,
    };
  }, [
    selectedLot?.id,
    selectedLot?.currentBidUsd,
    selectedLot?.highestBidderId,
    selectedLot?.highestBidderPaddle,
    currentUser,
    soundEnabled,
  ]);

  // Bidding form, progressive disclosure & safety confirmation states
  const minNextBid = selectedLot
    ? Math.max(selectedLot.openingBidUsd, selectedLot.currentBidUsd + selectedLot.bidIncrementUsd)
    : 0;

  // Safety Confirm ON by default so nervous or slow first-time bidders never bid by accident
  const [safetyConfirmOn, setSafetyConfirmOn] = useState<boolean>(true);
  const [pendingConfirm, setPendingConfirm] = useState<PendingBidConfirmation | null>(null);
  const [showAdvancedBid, setShowAdvancedBid] = useState<boolean>(false);
  const [customBidInput, setCustomBidInput] = useState<string>('');
  const [maxProxyInput, setMaxProxyInput] = useState<string>('');
  const [bidError, setBidError] = useState<string>('');
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [ringCallout, setRingCallout] = useState<RingCallout>('none');

  // Reset per-lot controls cleanly when switching lots
  useEffect(() => {
    setActivePhotoIndex(0);
    setBidError('');
    setPendingConfirm(null);
    setRingCallout('none');
    setShowAdvancedBid(false);
    if (selectedLot) {
      const next = Math.max(
        selectedLot.openingBidUsd,
        selectedLot.currentBidUsd + selectedLot.bidIncrementUsd
      );
      setCustomBidInput(String(next));
      setMaxProxyInput('');
    }
  }, [selectedLot?.id]);

  // Auto-sync custom bid & safely clear stale pending confirm whenever price moves
  useEffect(() => {
    if (!selectedLot) return;
    const next = Math.max(
      selectedLot.openingBidUsd,
      selectedLot.currentBidUsd + selectedLot.bidIncrementUsd
    );
    setCustomBidInput(String(next));
    setPendingConfirm((prev) => (prev && prev.amountUsd < next ? null : prev));
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

  // Helpers for instant per-head & per-kg math (removes mental arithmetic for buyers)
  const calcUnitStats = (amountUsd: number) => {
    if (!selectedLot) return { perHead: 0, perKg: '0.00' };
    const qty = Math.max(1, selectedLot.quantity);
    const totalKg = qty * Math.max(1, selectedLot.avgWeightKg);
    return {
      perHead: Math.round(amountUsd / qty),
      perKg: (amountUsd / totalKg).toFixed(2),
    };
  };

  const customBidNumeric = Number(customBidInput);
  const customStats = calcUnitStats(
    Number.isFinite(customBidNumeric) && customBidNumeric > 0 ? customBidNumeric : minNextBid
  );
  const minNextStats = calcUnitStats(minNextBid);

  const reserveGapUsd = selectedLot
    ? Math.max(0, selectedLot.reservePriceUsd - selectedLot.currentBidUsd)
    : 0;
  const reserveMet = selectedLot
    ? selectedLot.currentBidUsd >= selectedLot.reservePriceUsd
    : false;
  const reserveProgressPct = selectedLot
    ? Math.min(
        100,
        Math.round((selectedLot.currentBidUsd / Math.max(1, selectedLot.reservePriceUsd)) * 100)
      )
    : 0;

  const commitOnlineBid = (amountUsd: number, maxProxyUsd?: number) => {
    if (!selectedLot) return;
    const ok = placeOnlineBid(selectedLot.id, amountUsd, maxProxyUsd);
    if (ok) {
      playAuctionCue('bid-placed', soundEnabled);
      setPendingConfirm(null);
      setMaxProxyInput('');
      setBidError('');
      setRingCallout('none');
      setShowAdvancedBid(false);
    }
  };

  const requestOnlineBid = (amountUsd: number, maxProxyUsd?: number, label = 'Your Bid') => {
    if (!selectedLot) return;
    if (!currentUser) {
      openAuth('login');
      return;
    }
    if (!Number.isFinite(amountUsd) || amountUsd < minNextBid) {
      setBidError(`Minimum valid bid right now is ${formatUSD(minNextBid)}.`);
      return;
    }
    if (maxProxyUsd !== undefined && (!Number.isFinite(maxProxyUsd) || maxProxyUsd < amountUsd)) {
      setBidError('Auto-Bid Limit must be equal to or higher than your bid.');
      return;
    }
    setBidError('');

    if (safetyConfirmOn) {
      setPendingConfirm({ amountUsd, maxProxyUsd, label });
      return;
    }
    commitOnlineBid(amountUsd, maxProxyUsd);
  };

  const handleQuickJump = (multiplier: number) => {
    if (!selectedLot) return;
    const increment = selectedLot.bidIncrementUsd * multiplier;
    const targetAmount = selectedLot.currentBidUsd + increment;
    requestOnlineBid(targetAmount, undefined, `+${formatUSD(increment)} Bid`);
  };

  const handleStepCustomBid = (deltaSteps: number) => {
    if (!selectedLot) return;
    const current = Number(customBidInput);
    const base = Number.isFinite(current) && current >= minNextBid ? current : minNextBid;
    const nextVal = Math.max(minNextBid, base + selectedLot.bidIncrementUsd * deltaSteps);
    setCustomBidInput(String(nextVal));
    setBidError('');
  };

  const handleCustomBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(customBidInput);
    const maxProxy = maxProxyInput.trim() ? Number(maxProxyInput) : undefined;
    requestOnlineBid(
      amount,
      maxProxy,
      maxProxy ? `Custom Bid + Auto-Bid up to ${formatUSD(maxProxy)}` : 'Custom Bid'
    );
  };

  const handleFloorQuickBid = (multiplier: number) => {
    if (!selectedLot) return;
    const targetAmount =
      selectedLot.currentBidUsd + selectedLot.bidIncrementUsd * multiplier;
    const paddle = floorPaddleInput.trim().toUpperCase() || 'FLOOR-114';
    const ok = recordFloorBid(selectedLot.id, paddle, targetAmount);
    if (ok) {
      playAuctionCue('callout', soundEnabled);
      setRingCallout('none');
    }
  };

  const handleFloorBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot) return;
    const amount = Number(floorAmountInput);
    if (!floorPaddleInput.trim() || !Number.isFinite(amount) || amount < minNextBid) return;
    const ok = recordFloorBid(selectedLot.id, floorPaddleInput.trim().toUpperCase(), amount);
    if (ok) {
      playAuctionCue('callout', soundEnabled);
      setRingCallout('none');
    }
  };

  const handleHammerAdvance = (outcome: 'Sold' | 'Passed In') => {
    if (!selectedLot) return;
    const nextLotId = hammerAndAdvanceLot(selectedLot.id, outcome);
    playAuctionCue('hammer', soundEnabled);
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

  const isWinningSelectedLot = userBidPosition?.status === 'leading';

  return (
    <div className={cn(showMobileQuickBidBar && 'pb-24 lg:pb-0')}>
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

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-9">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#F69B3D]">
              Hybrid Physical + Online Auctions
            </p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white">
              Bid live alongside the physical sale ring.
            </h1>
            <p className="mt-2 text-sm text-slate-200 leading-snug max-w-xl">
              Weighbridge-verified cattle &amp; small stock broadcast live from accredited yards across Africa.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            <div className="min-w-0">
              <p className="text-[11px] text-slate-300 font-medium truncate">Active Rings</p>
              <p className="mt-0.5 font-mono text-lg sm:text-2xl font-bold text-[#F69B3D] tabular-nums whitespace-nowrap">
                {liveCount} Live
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-300 font-medium truncate">Sale Yards</p>
              <p className="mt-0.5 font-mono text-lg sm:text-2xl font-bold text-white tabular-nums whitespace-nowrap">
                {auctionCenters.length} Centres
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-300 font-medium truncate">Ring Bidders</p>
              <p className="mt-0.5 font-mono text-lg sm:text-2xl font-bold text-white tabular-nums whitespace-nowrap">
                {totalRegisteredBidders.toLocaleString()}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-300 font-medium truncate">Your Paddle</p>
              <p className="mt-0.5 font-mono text-lg sm:text-2xl font-bold text-white tabular-nums whitespace-nowrap">
                {currentUser ? userPaddleNumber : 'Sign in'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Zero-Scroll Segmented Navigation Bar + Sound & Guide Utilities */}
      <div className="bg-white border-b border-[#DCE4EC]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div
            role="tablist"
            aria-label="Auction views"
            className="grid grid-cols-3 sm:inline-flex rounded-lg bg-[#EEF3F8] p-1 border border-[#DCE4EC] w-full sm:w-auto"
          >
            {(
              [
                { id: 'live-ring', label: 'Live Ring' },
                { id: 'upcoming', label: 'All Sales' },
                { id: 'centers', label: 'Sale Yards' },
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
                    'inline-flex items-center justify-center px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#F28C28]',
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

          {activeTab === 'live-ring' && (
            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBeginnerGuide((v) => !v)}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#CFD9E3] bg-white hover:bg-[#F7F9FC] text-xs font-semibold text-[#10243A] whitespace-nowrap transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#1A4D73] shrink-0" aria-hidden="true" />
                {showBeginnerGuide ? 'Hide Guide' : 'How to Bid'}
              </button>
              <button
                type="button"
                onClick={() => setSoundEnabled((v) => !v)}
                aria-label={soundEnabled ? 'Mute ring sound alerts' : 'Enable ring sound alerts'}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#CFD9E3] bg-white hover:bg-[#F7F9FC] text-xs font-semibold text-[#10243A] whitespace-nowrap transition-colors"
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-[#156B45] shrink-0" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-[#526071] shrink-0" aria-hidden="true" />
                )}
                <span>{soundEnabled ? 'Alerts On' : 'Muted'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Body */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5 sm:py-7">
        {/* ============================================================
            TAB 1: LIVE HYBRID RING
            ============================================================ */}
        {activeTab === 'live-ring' && (
          <div className="space-y-4">
            {/* Compact 3-Step Quick Guide */}
            {showBeginnerGuide && (
              <div className="rounded-xl bg-white border border-[#CFD9E3] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#1A4D73]">
                    Quick Guide · 3 Steps
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowBeginnerGuide(false)}
                    aria-label="Dismiss bidding guide"
                    className="text-xs font-semibold text-[#526071] hover:text-[#10243A] inline-flex items-center gap-1 shrink-0"
                  >
                    <span>Hide</span>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-[#526071]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#10243A] bg-[#EEF3F8] rounded h-5 w-5 flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <span className="truncate">
                      <strong className="text-[#10243A]">Check lot</strong> &amp; auto $/head price
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#10243A] bg-[#EEF3F8] rounded h-5 w-5 flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <span className="truncate">
                      <strong className="text-[#10243A]">Tap Bid</strong> — confirm before sending
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#10243A] bg-[#EEF3F8] rounded h-5 w-5 flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <span className="truncate">
                      <strong className="text-[#10243A]">Green</strong> = winning ·{' '}
                      <strong className="text-[#10243A]">Amber</strong> = outbid
                    </span>
                  </div>
                </div>
              </div>
            )}

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
                        variant="secondary"
                        size="sm"
                        onClick={() => registerBidderPaddle(activeAuction.id)}
                      >
                        Get Free Paddle
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
                          className="h-8 w-8 flex items-center justify-center text-[#10243A] hover:bg-[#F3F6F9] disabled:opacity-35 disabled:cursor-not-allowed"
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
                          className="h-8 w-8 flex items-center justify-center text-[#10243A] hover:bg-[#F3F6F9] border-l border-[#DCE4EC] disabled:opacity-35 disabled:cursor-not-allowed"
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
                {/* LEFT 8 COLS: Active Lot Stage + Effortless Bidding Console + Live Bid Tape */}
                <div className="lg:col-span-8 space-y-5 min-w-0">
                  <Card className="overflow-hidden">
                    {/* Optional Live Ring Callout Strip (Auctioneer Cadence) */}
                    {ringCallout !== 'none' && selectedLot.status === 'Live' && (
                      <div
                        className={cn(
                          'px-4 sm:px-5 py-3 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 border-b',
                          ringCallout === 'going-twice'
                            ? 'bg-[#FFF3E0] text-[#9A4B06] border-[#F2C98A]'
                            : 'bg-[#EEF4FA] text-[#10243A] border-[#CFD9E3]'
                        )}
                      >
                        <span>
                          {ringCallout === 'going-once'
                            ? `Going Once at ${formatUSD(selectedLot.currentBidUsd)} (${selectedLot.highestBidderPaddle || 'Ring'})`
                            : `Going Twice at ${formatUSD(selectedLot.currentBidUsd)} — Final call before hammer`}
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
                            <div className="flex items-center gap-2 min-w-0">
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
                                    ? 'Live Now'
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

                          <p className="mt-1 text-xs text-[#526071]">
                            {getCountryFlag(selectedLot.country)} {selectedLot.farmOrigin} ·{' '}
                            {selectedLot.breed} · {selectedLot.gender}
                          </p>

                          <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2.5 pt-3 border-t border-[#DCE4EC] text-xs">
                            <div>
                              <span className="text-[#526071]">Headcount</span>
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

                        {/* Current High Bid Box with Plain-English Reserve Meter */}
                        <div
                          key={bidFlashKey}
                          className={cn(
                            'rounded-xl bg-[#F7F9FC] border border-[#DCE4EC] p-4',
                            bidFlashKey > 0 && 'animate-bid-flash'
                          )}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-semibold text-[#526071]">
                              {selectedLot.status === 'Sold' ? 'Winning Hammer Price' : 'Current High Bid'}
                            </span>
                            <span
                              className={cn(
                                'text-xs font-semibold tabular-nums',
                                reserveMet ? 'text-[#156B45]' : 'text-[#9A5B06]'
                              )}
                            >
                              {reserveMet
                                ? 'Reserve Met — Will Sell'
                                : `${formatUSD(reserveGapUsd)} to Reserve`}
                            </span>
                          </div>

                          <div className="mt-1 flex items-baseline justify-between gap-2">
                            <p className="font-mono text-3xl font-extrabold text-[#10243A] tabular-nums leading-none">
                              {formatUSD(selectedLot.currentBidUsd)}
                            </p>
                            <p className="font-mono text-xs font-semibold text-[#526071] tabular-nums">
                              ≈{' '}
                              {formatUSD(
                                Math.round(
                                  selectedLot.currentBidUsd / Math.max(1, selectedLot.quantity)
                                )
                              )}{' '}
                              / head
                            </p>
                          </div>

                          {/* Reserve Progress Bar */}
                          <div className="mt-2.5 h-1.5 w-full rounded-full bg-[#DCE4EC] overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-300',
                                reserveMet ? 'bg-[#156B45]' : 'bg-[#F28C28]'
                              )}
                              style={{ width: `${reserveProgressPct}%` }}
                            />
                          </div>

                          <div className="mt-2.5 pt-2.5 border-t border-[#DCE4EC] flex items-center justify-between gap-2 text-xs">
                            {selectedLot.highestBidderPaddle ? (
                              <>
                                <span className="text-[#526071] truncate">
                                  Leading:{' '}
                                  <strong className="text-[#10243A]">
                                    {isWinningSelectedLot
                                      ? 'You'
                                      : selectedLot.highestBidderName || 'Ring Bidder'}
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

                          {liveUpdateNotice && (
                            <p
                              aria-live="polite"
                              className="mt-2 text-[11px] font-semibold text-[#1A4D73] tabular-nums"
                            >
                              {liveUpdateNotice}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ============================================================
                        EFFORTLESS ONLINE BIDDING CONSOLE
                        ============================================================ */}
                    <div className="p-4 sm:p-5 border-t border-[#DCE4EC] bg-[#F7F9FC]/75">
                      {selectedLot.status === 'Live' ? (
                        <div className="space-y-4">
                          {/* Top Row: Clear Bid Mode Switch (Safety Confirm vs Instant 1-Tap) */}
                          <div className="flex flex-wrap items-center justify-between gap-2.5">
                            <div>
                              <h3 className="text-sm font-bold text-[#10243A]">
                                {isWinningSelectedLot
                                  ? 'Your Position on This Lot'
                                  : 'Place Your Bid'}
                              </h3>
                              <p className="text-xs text-[#526071]">
                                {isWinningSelectedLot
                                  ? `You are leading with paddle ${userPaddleNumber}.`
                                  : `Next minimum bid is ${formatUSD(minNextBid)} (step ${formatUSD(selectedLot.bidIncrementUsd)}).`}
                              </p>
                            </div>

                            {currentUser && (
                              <div
                                role="group"
                                aria-label="Bidding speed preference"
                                className="inline-flex rounded-lg bg-white p-0.5 border border-[#CFD9E3]"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSafetyConfirmOn(true);
                                    setPendingConfirm(null);
                                  }}
                                  className={cn(
                                    'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors',
                                    safetyConfirmOn
                                      ? 'bg-[#10243A] text-white'
                                      : 'text-[#526071] hover:text-[#10243A]'
                                  )}
                                >
                                  Safety Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSafetyConfirmOn(false);
                                    setPendingConfirm(null);
                                  }}
                                  className={cn(
                                    'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors',
                                    !safetyConfirmOn
                                      ? 'bg-[#10243A] text-white'
                                      : 'text-[#526071] hover:text-[#10243A]'
                                  )}
                                >
                                  1-Tap Instant
                                </button>
                              </div>
                            )}
                          </div>

                          {/* OUTBID ALERT BANNER */}
                          {userBidPosition?.status === 'outbid' && (
                            <div
                              role="status"
                              className="rounded-lg px-4 py-3 bg-[#FFF8EB] border border-[#F2C98A] text-[#9A5B06] flex flex-wrap items-center justify-between gap-2"
                            >
                              <p className="text-xs sm:text-sm font-bold">
                                You were outbid by {userBidPosition.leader} at{' '}
                                {formatUSD(selectedLot.currentBidUsd)}.
                              </p>
                              <span className="text-xs font-semibold">
                                Tap below to retake the lead
                              </span>
                            </div>
                          )}

                          {/* IN-PLACE SAFETY CONFIRMATION BAR (Zero jarring modal, impossible to misclick) */}
                          {pendingConfirm ? (
                            <div
                              role="region"
                              aria-label="Confirm your bid"
                              className="rounded-xl bg-white border-2 border-[#10243A] p-4 sm:p-5 space-y-3.5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-semibold text-[#1A4D73]">
                                    Please confirm before sending
                                  </p>
                                  <p className="mt-0.5 text-lg sm:text-xl font-extrabold text-[#10243A] font-mono tabular-nums">
                                    Bid {formatUSD(pendingConfirm.amountUsd)} on{' '}
                                    {selectedLot.lotNumber}
                                  </p>
                                  <p className="mt-1 text-xs text-[#526071] font-mono tabular-nums">
                                    {selectedLot.quantity} head · ≈{' '}
                                    {formatUSD(calcUnitStats(pendingConfirm.amountUsd).perHead)} /
                                    head · ${calcUnitStats(pendingConfirm.amountUsd).perKg} / kg
                                    {pendingConfirm.maxProxyUsd
                                      ? ` · Auto-Bid up to ${formatUSD(pendingConfirm.maxProxyUsd)}`
                                      : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    commitOnlineBid(
                                      pendingConfirm.amountUsd,
                                      pendingConfirm.maxProxyUsd
                                    )
                                  }
                                  className="h-12 px-5 rounded-lg bg-[#156B45] hover:bg-[#115939] text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#F28C28]"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Yes, Send Bid ({formatUSD(pendingConfirm.amountUsd)})
                                </button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="lg"
                                  className="h-12"
                                  onClick={() => setPendingConfirm(null)}
                                >
                                  Cancel — Don&apos;t Bid
                                </Button>
                              </div>
                            </div>
                          ) : isWinningSelectedLot ? (
                            /* CALM "YOU ARE WINNING" STATE — prevents slow/new users from accidentally outbidding themselves! */
                            <div className="rounded-xl bg-[#EEF8F3] border border-[#B6DFC9] p-4 sm:p-5 space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                  <CheckCircle2 className="w-5 h-5 text-[#156B45] shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm sm:text-base font-bold text-[#156B45]">
                                      You are winning {selectedLot.lotNumber} at{' '}
                                      <span className="font-mono tabular-nums">
                                        {formatUSD(selectedLot.currentBidUsd)}
                                      </span>
                                    </p>
                                    <p className="text-xs text-[#265C43] mt-0.5 leading-relaxed">
                                      Sit tight — no need to bid again unless someone outbids you.
                                      {userBidPosition?.proxyCap
                                        ? ` Your Auto-Bid Limit is protecting you up to ${formatUSD(userBidPosition.proxyCap)}.`
                                        : ' You can optionally set an Auto-Bid Limit below if you want MARIKETI to defend your lead automatically.'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setShowAdvancedBid((v) => !v)}
                                >
                                  {showAdvancedBid
                                    ? 'Hide Auto-Bid / Raise Options'
                                    : userBidPosition?.proxyCap
                                    ? 'Update Auto-Bid Limit'
                                    : 'Set Auto-Bid Limit'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* PRIMARY ONE-GLANCE BIDDING CONTROLS (Unmistakable Hero CTA + 2 Plain-Dollar Jumps) */
                            <div className="space-y-3">
                              <button
                                type="button"
                                onClick={() => handleQuickJump(1)}
                                className="w-full min-h-[58px] px-5 py-3 rounded-xl bg-[#F28C28] hover:bg-[#DC7918] active:bg-[#C66910] text-[#091827] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10243A] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-left sm:text-center"
                              >
                                <span className="inline-flex items-center gap-2 text-base sm:text-lg font-extrabold tracking-tight">
                                  <Gavel className="w-5 h-5 shrink-0" aria-hidden="true" />
                                  {!currentUser
                                    ? `Sign In with Google to Bid ${formatUSD(minNextBid)}`
                                    : userBidPosition?.status === 'outbid'
                                    ? `Retake Lead — Bid ${formatUSD(minNextBid)}`
                                    : `Bid ${formatUSD(minNextBid)} Now`}
                                </span>
                                <span className="font-mono text-xs font-bold text-[#091827]/85 tabular-nums">
                                  +{formatUSD(selectedLot.bidIncrementUsd)} · ≈{' '}
                                  {formatUSD(minNextStats.perHead)} / head
                                </span>
                              </button>

                              {!currentUser ? (
                                <p className="text-xs text-[#526071] text-center">
                                  Takes 5 seconds · Free online paddle assigned automatically · No card charged now.
                                </p>
                              ) : (
                                <div className="grid grid-cols-2 gap-2.5">
                                  {[2, 5].map((mult) => {
                                    const stepUsd = selectedLot.bidIncrementUsd * mult;
                                    const targetVal = selectedLot.currentBidUsd + stepUsd;
                                    const stats = calcUnitStats(targetVal);
                                    return (
                                      <button
                                        key={mult}
                                        type="button"
                                        onClick={() => handleQuickJump(mult)}
                                        className="rounded-lg px-3.5 py-2.5 bg-white hover:bg-[#EEF3F8] border border-[#CFD9E3] text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#F28C28]"
                                      >
                                        <span className="block text-[11px] font-semibold text-[#526071]">
                                          Jump +{formatUSD(stepUsd)}
                                        </span>
                                        <span className="mt-0.5 flex flex-wrap items-baseline justify-between gap-1">
                                          <span className="font-mono text-sm font-extrabold text-[#10243A] tabular-nums">
                                            {formatUSD(targetVal)}
                                          </span>
                                          <span className="font-mono text-[11px] text-[#526071] tabular-nums">
                                            ≈ {formatUSD(stats.perHead)}/hd
                                          </span>
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* PROGRESSIVE DISCLOSURE: Custom Bid Stepper + Plain-English Auto-Bid Limit */}
                          {currentUser && !pendingConfirm && (
                            <div className="pt-2 border-t border-[#DCE4EC]">
                              <button
                                type="button"
                                onClick={() => setShowAdvancedBid((v) => !v)}
                                className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-[#1A4D73] hover:text-[#10243A] transition-colors"
                              >
                                <span>
                                  Custom Bid Amount or Automatic Bidding Limit
                                </span>
                                <ChevronDown
                                  className={cn(
                                    'w-4 h-4 transition-transform duration-150',
                                    showAdvancedBid && 'rotate-180'
                                  )}
                                />
                              </button>

                              {showAdvancedBid && (
                                <form
                                  onSubmit={handleCustomBidSubmit}
                                  className="mt-3 rounded-xl bg-white border border-[#DCE4EC] p-4 space-y-4"
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Stepper Custom Bid (Zero mobile typing friction!) */}
                                    <div className="space-y-1.5">
                                      <label
                                        htmlFor="custom-bid-input"
                                        className="block text-xs font-semibold text-[#10243A]"
                                      >
                                        Your Bid Amount (USD)
                                      </label>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          aria-label={`Decrease bid by ${formatUSD(selectedLot.bidIncrementUsd)}`}
                                          onClick={() => handleStepCustomBid(-1)}
                                          disabled={customBidNumeric <= minNextBid}
                                          className="h-11 w-11 shrink-0 rounded-lg border border-[#CFD9E3] bg-[#F7F9FC] hover:bg-[#EEF3F8] flex items-center justify-center text-[#10243A] disabled:opacity-40"
                                        >
                                          <Minus className="w-4 h-4" />
                                        </button>
                                        <input
                                          id="custom-bid-input"
                                          type="number"
                                          min={minNextBid}
                                          step={selectedLot.bidIncrementUsd}
                                          value={customBidInput}
                                          onChange={(e) => {
                                            setCustomBidInput(e.target.value);
                                            setBidError('');
                                          }}
                                          className="h-11 w-full rounded-lg bg-white border border-[#CFD9E3] px-3 text-center font-mono text-sm font-bold text-[#10243A] tabular-nums focus:outline-none focus:border-[#10243A]"
                                          required
                                        />
                                        <button
                                          type="button"
                                          aria-label={`Increase bid by ${formatUSD(selectedLot.bidIncrementUsd)}`}
                                          onClick={() => handleStepCustomBid(1)}
                                          className="h-11 w-11 shrink-0 rounded-lg border border-[#CFD9E3] bg-[#F7F9FC] hover:bg-[#EEF3F8] flex items-center justify-center text-[#10243A]"
                                        >
                                          <Plus className="w-4 h-4" />
                                        </button>
                                      </div>
                                      <p className="text-[11px] font-mono text-[#526071] tabular-nums">
                                        ≈ {formatUSD(customStats.perHead)} / head · $
                                        {customStats.perKg} / kg liveweight
                                      </p>
                                    </div>

                                    {/* Plain-English Auto-Bid Limit */}
                                    <div className="space-y-1.5">
                                      <label
                                        htmlFor="autobid-limit-input"
                                        className="block text-xs font-semibold text-[#10243A]"
                                      >
                                        Auto-Bid Limit (Optional USD)
                                      </label>
                                      <input
                                        id="autobid-limit-input"
                                        type="number"
                                        min={minNextBid}
                                        step={selectedLot.bidIncrementUsd}
                                        placeholder="Leave blank for single bid"
                                        value={maxProxyInput}
                                        onChange={(e) => {
                                          setMaxProxyInput(e.target.value);
                                          setBidError('');
                                        }}
                                        className="h-11 w-full rounded-lg bg-white border border-[#CFD9E3] px-3 font-mono text-sm text-[#10243A] tabular-nums placeholder:font-sans placeholder:text-[#667587] focus:outline-none focus:border-[#10243A]"
                                      />
                                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                        {[2, 4, 8].map((mult) => {
                                          const cap =
                                            minNextBid + selectedLot.bidIncrementUsd * mult;
                                          return (
                                            <button
                                              key={mult}
                                              type="button"
                                              onClick={() => {
                                                setMaxProxyInput(String(cap));
                                                setBidError('');
                                              }}
                                              className="px-2 py-0.5 rounded bg-[#F7F9FC] hover:bg-[#EEF3F8] border border-[#CFD9E3] font-mono text-[11px] font-semibold text-[#10243A] tabular-nums"
                                            >
                                              Up to {formatUSD(cap)}
                                            </button>
                                          );
                                        })}
                                        {maxProxyInput && (
                                          <button
                                            type="button"
                                            onClick={() => setMaxProxyInput('')}
                                            className="text-[11px] font-semibold text-[#526071] hover:text-[#10243A] ml-1"
                                          >
                                            Clear
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <p className="text-xs text-[#526071] leading-relaxed">
                                    <strong className="text-[#10243A]">How Auto-Bid works:</strong>{' '}
                                    If you set a limit, MARIKETI bids only one step at a time when someone else bids — protecting your lead automatically without paying more than needed.
                                  </p>

                                  {bidError && (
                                    <p
                                      className="text-xs font-semibold text-[#B92D2D]"
                                      role="alert"
                                    >
                                      {bidError}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap items-center justify-end gap-2">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="md"
                                      onClick={() => setShowAdvancedBid(false)}
                                    >
                                      Close
                                    </Button>
                                    <Button type="submit" variant="primary" size="md">
                                      <Gavel className="w-4 h-4" />
                                      {safetyConfirmOn ? 'Review Custom Bid' : 'Send Custom Bid'}
                                    </Button>
                                  </div>
                                </form>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-[#10243A]">
                              {selectedLot.status === 'Queued'
                                ? 'Lot is queued — opens shortly in the ring'
                                : selectedLot.status === 'Sold'
                                ? `Lot sold at ${formatUSD(selectedLot.currentBidUsd)}`
                                : 'Lot passed in below reserve'}
                            </p>
                            <p className="text-xs text-[#526071] mt-0.5">
                              {selectedLot.status === 'Queued'
                                ? 'You can browse photos and vet certificates now, or jump back to the active live lot.'
                                : 'Select an active live lot from the sale catalog to continue bidding.'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {liveLotInAuction && (
                              <Button
                                variant="accent"
                                size="md"
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
                                  size="md"
                                  onClick={() => registerBidderPaddle(activeAuction.id)}
                                >
                                  Get Free Paddle
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
                                onClick={() => {
                                  playAuctionCue('callout', soundEnabled);
                                  setRingCallout((prev) =>
                                    prev === 'going-once' ? 'going-twice' : 'going-once'
                                  );
                                }}
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
                                  +{formatUSD(selectedLot.bidIncrementUsd * mult)}
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

                  {/* Real-Time Bid Trend Sparkline & Structured Data Table */}
                  <BidTrendPanel
                    lot={selectedLot}
                    bids={activeLotBids}
                    currentUserId={currentUser?.id}
                    userPaddleNumber={userPaddleNumber}
                    flashKey={bidFlashKey}
                  />
                </div>

                {/* RIGHT 4 COLS: Sale Catalog Lot Queue */}
                <div className="lg:col-span-4 space-y-4">
                  <Card className="overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-[#DCE4EC] bg-[#F7F9FC]/70 space-y-2.5">
                      <div>
                        <h3 className="text-sm font-bold text-[#10243A]">
                          Sale Catalog ({lotsForAuction.length} lots)
                        </h3>
                        <p className="text-xs text-[#526071] mt-0.5">
                          Tap any lot to view photos, weights, or place a bid.
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
                              'flex-1 py-1.5 rounded text-[11px] font-semibold transition-colors',
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
                                    ? 'Sold Price'
                                    : 'High Bid'}
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
                      Buyer Protection in Every Ring
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
                          Certified weighbridge tickets are issued immediately when the hammer falls.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="font-mono text-[11px] font-bold text-[#10243A] mt-0.5">
                          03.
                        </span>
                        <span>
                          Floor bids are entered live by the Ring Clerk so online and yard buyers see exact parity.
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="grid grid-cols-4 sm:inline-flex rounded-lg bg-white p-1 border border-[#DCE4EC] w-full sm:w-auto">
                {(['All', 'Live Now', 'Upcoming', 'Completed'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSaleStatusFilter(status)}
                    className={cn(
                      'px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors',
                      saleStatusFilter === status
                        ? 'bg-[#10243A] text-white'
                        : 'text-[#526071] hover:text-[#10243A]'
                    )}
                  >
                    {status === 'Live Now' ? 'Live' : status === 'Completed' ? 'Past' : status}
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
                                Get Free Paddle
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

      {/* Adaptive Compact Sticky Mobile Bidding Bar (<= 64px, shown only on live lot) */}
      {showMobileQuickBidBar && selectedLot && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#DCE4EC] shadow-[0_-4px_16px_rgba(9,24,39,0.08)] px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
          {pendingConfirm ? (
            <>
              <button
                type="button"
                onClick={() =>
                  commitOnlineBid(pendingConfirm.amountUsd, pendingConfirm.maxProxyUsd)
                }
                className="flex-1 h-11 px-4 rounded-lg bg-[#156B45] text-white font-bold text-sm font-mono tabular-nums inline-flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Confirm {formatUSD(pendingConfirm.amountUsd)}
              </button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setPendingConfirm(null)}
              >
                Cancel
              </Button>
            </>
          ) : isWinningSelectedLot ? (
            <div className="w-full flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#156B45] min-w-0">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="text-sm font-bold truncate">
                  You&apos;re Winning ·{' '}
                  <span className="font-mono tabular-nums">
                    {formatUSD(selectedLot.currentBidUsd)}
                  </span>
                </span>
              </div>
              <span className="text-xs font-mono text-[#526071] shrink-0">
                {selectedLot.lotNumber}
              </span>
            </div>
          ) : (
            <>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#526071] truncate">
                  {selectedLot.lotNumber} · ≈ {formatUSD(minNextStats.perHead)}/hd
                </p>
                <p className="text-base font-extrabold font-mono tabular-nums text-[#10243A] leading-tight">
                  {formatUSD(selectedLot.currentBidUsd)}
                </p>
              </div>
              <Button
                variant="accent"
                size="md"
                className="font-mono tabular-nums shrink-0"
                onClick={() => handleQuickJump(1)}
              >
                <Gavel className="w-4 h-4" />
                {currentUser ? `Bid ${formatUSD(minNextBid)}` : 'Sign In to Bid'}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
