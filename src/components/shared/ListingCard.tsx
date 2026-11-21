import React from 'react';
import { Bookmark, GitCompareArrows, MapPin, ShieldCheck, Clock, ArrowUpRight } from 'lucide-react';
import { cn, formatDate, formatUSD } from '../../lib/utils';
import type { LivestockListing } from '../../types/mariketi';
import { SafeImage } from '../ui/DesignSystem';

interface ListingCardProps {
  listing: LivestockListing;
  view?: 'grid' | 'list';
  saved: boolean;
  compared: boolean;
  onOpen: (id: string) => void;
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  view = 'grid',
  saved,
  compared,
  onOpen,
  onToggleSave,
  onToggleCompare,
}) => {
  const isVerified = listing.verificationStatus === 'Verified';

  if (view === 'list') {
    return (
      <article className="bg-white border border-[#E5E9ED] rounded-lg overflow-hidden hover:border-[#10243A]/35 transition-colors flex flex-col sm:flex-row">
        <button
          type="button"
          onClick={() => onOpen(listing.id)}
          className="sm:w-64 aspect-[4/3] sm:aspect-auto shrink-0 overflow-hidden bg-[#10243A] text-left focus-visible:outline-2 focus-visible:outline-[#F28C28]"
        >
          <SafeImage
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full hover:scale-[1.02] transition-transform duration-200"
          />
        </button>

        <div className="flex-1 p-4 flex flex-col justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3 text-xs text-[#697784]">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="font-mono text-[#10243A] font-medium shrink-0">{listing.reference}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{listing.category} · {listing.breed}</span>
              </div>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-[#21865B] font-semibold whitespace-nowrap shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#B27A15] font-medium whitespace-nowrap shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  {listing.verificationStatus}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onOpen(listing.id)}
              className="mt-1 text-left block group"
            >
              <h3 className="text-[15px] font-bold text-[#10243A] leading-snug group-hover:text-[#245B83] transition-colors">
                {listing.title}
              </h3>
            </button>

            <p className="mt-1 text-[13px] text-[#697784] leading-relaxed line-clamp-2 prose-justify">
              {listing.description}
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#697784] tabular-nums">
              <span>{listing.quantity} head</span>
              <span aria-hidden="true">·</span>
              <span>{listing.weightKg} kg avg</span>
              <span aria-hidden="true">·</span>
              <span>{listing.ageLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {listing.district}, {listing.province}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E9ED] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-[#10243A] font-mono tabular-nums">
                  {formatUSD(listing.priceUsd)}
                </span>
                <span className="text-xs text-[#697784]">{listing.priceUnit}</span>
              </div>
              <span className="text-xs text-[#697784] truncate">
                Seller: {listing.sellerName} ({listing.sellerRating.toFixed(1)})
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onToggleCompare(listing.id)}
                aria-label={compared ? 'Remove from comparison' : 'Add to comparison'}
                className={cn(
                  'h-9 px-3 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors',
                  compared
                    ? 'border-[#10243A] bg-[#10243A] text-white'
                    : 'border-[#E5E9ED] bg-white text-[#17212B] hover:bg-[#F4F6F7]'
                )}
              >
                <GitCompareArrows className="w-3.5 h-3.5" />
                {compared ? 'Comparing' : 'Compare'}
              </button>
              <button
                type="button"
                onClick={() => onToggleSave(listing.id)}
                aria-label={saved ? 'Remove saved listing' : 'Save listing'}
                className={cn(
                  'h-9 w-9 rounded-md border inline-flex items-center justify-center transition-colors',
                  saved
                    ? 'border-[#F28C28] bg-[#F28C28]/10 text-[#10243A]'
                    : 'border-[#E5E9ED] bg-white text-[#697784] hover:text-[#10243A]'
                )}
              >
                <Bookmark className={cn('w-4 h-4', saved && 'fill-[#F28C28] text-[#F28C28]')} />
              </button>
              <button
                type="button"
                onClick={() => onOpen(listing.id)}
                className="h-9 px-3.5 rounded-md bg-[#10243A] text-white text-xs font-medium inline-flex items-center gap-1 hover:bg-[#091827] whitespace-nowrap shrink-0"
              >
                Inspect lot
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="bg-white border border-[#E5E9ED] rounded-lg overflow-hidden flex flex-col hover:border-[#10243A]/35 hover:-translate-y-0.5 transition-all duration-150">
      <div className="relative aspect-[4/3] bg-[#10243A] overflow-hidden">
        <button
          type="button"
          onClick={() => onOpen(listing.id)}
          className="w-full h-full block text-left focus-visible:outline-2 focus-visible:outline-[#F28C28]"
        >
          <SafeImage
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full"
          />
        </button>
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleCompare(listing.id)}
            aria-label={compared ? 'Remove from comparison' : 'Add to comparison'}
            className={cn(
              'h-8 w-8 rounded-md flex items-center justify-center border transition-colors',
              compared
                ? 'bg-[#10243A] text-white border-[#10243A]'
                : 'bg-white/95 text-[#10243A] border-[#E5E9ED] hover:bg-white'
            )}
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onToggleSave(listing.id)}
            aria-label={saved ? 'Remove from saved' : 'Save listing'}
            className="h-8 w-8 rounded-md bg-white/95 border border-[#E5E9ED] flex items-center justify-center text-[#10243A] hover:bg-white transition-colors"
          >
            <Bookmark className={cn('w-3.5 h-3.5', saved && 'fill-[#F28C28] text-[#F28C28]')} />
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between gap-2 text-xs text-[#697784]">
          <span className="truncate min-w-0">
            {listing.category} · {listing.breed}
          </span>
          {isVerified ? (
            <span className="inline-flex items-center gap-1 text-[#21865B] font-semibold whitespace-nowrap shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[#B27A15] font-medium whitespace-nowrap shrink-0">
              <Clock className="w-3.5 h-3.5" />
              {listing.verificationStatus}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpen(listing.id)}
          className="mt-1.5 text-left group"
        >
          <h3 className="text-[15px] font-bold text-[#10243A] leading-snug line-clamp-2 group-hover:text-[#245B83] transition-colors">
            {listing.title}
          </h3>
        </button>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#697784] tabular-nums">
          <span>{listing.quantity} head</span>
          <span aria-hidden="true">·</span>
          <span>{listing.weightKg} kg avg</span>
          <span aria-hidden="true">·</span>
          <span>{listing.ageLabel}</span>
        </div>

        <div className="mt-1.5 flex items-center gap-1 text-xs text-[#697784] min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {listing.district}, {listing.province}
          </span>
        </div>

        <div className="mt-auto pt-3 border-t border-[#E5E9ED] flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-lg font-bold text-[#10243A] font-mono tabular-nums leading-none">
              {formatUSD(listing.priceUsd)}
            </p>
            <p className="text-[11px] text-[#697784] mt-1 truncate">
              {listing.priceUnit} · Listed {formatDate(listing.listedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpen(listing.id)}
            className="text-xs font-semibold text-[#10243A] hover:text-[#C96A0F] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            Details
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
