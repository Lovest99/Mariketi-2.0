import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  GitCompareArrows,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import { cn, formatUSD, ZIMBABWE_PROVINCES } from '../../lib/utils';
import type { LivestockCategory } from '../../types/mariketi';
import { ListingCard } from '../../components/shared/ListingCard';
import { Button, Drawer, EmptyState, SkeletonGrid } from '../../components/ui/DesignSystem';

const CATEGORIES: LivestockCategory[] = [
  'Cattle',
  'Goats',
  'Sheep',
  'Pigs',
  'Poultry',
  'Other livestock',
];

interface MarketplacePageProps {
  initialQuery?: string;
  initialCategory?: LivestockCategory;
  embedded?: boolean;
  onOpenListing?: (id: string) => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  initialQuery = '',
  initialCategory,
  embedded = false,
  onOpenListing,
}) => {
  const {
    listings,
    savedListingIds,
    recentlyViewedIds,
    compareListingIds,
    navigatePublic,
    toggleSaveListing,
    toggleCompareListing,
    clearCompare,
  } = useMariketi();

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string>(initialCategory || '');
  const [breed, setBreed] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [verification, setVerification] = useState('');
  const [gender, setGender] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [maxAgeMonths, setMaxAgeMonths] = useState('');
  const [minWeight, setMinWeight] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [minRating, setMinRating] = useState('');
  const [onlySaved, setOnlySaved] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'weight_desc' | 'verified'>('verified');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const districts = province ? ZIMBABWE_PROVINCES[province] || [] : [];
  const availableBreeds = useMemo(() => {
    const set = new Set<string>();
    listings
      .filter((l) => l.status === 'active' && (!category || l.category === category))
      .forEach((l) => set.add(l.breed));
    return Array.from(set).sort();
  }, [listings, category]);

  const filteredListings = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = listings.filter((l) => {
      if (l.status !== 'active') return false;
      if (onlySaved && !savedListingIds.includes(l.id)) return false;
      if (category && l.category !== category) return false;
      if (breed && l.breed !== breed) return false;
      if (province && l.province !== province) return false;
      if (district && l.district !== district) return false;
      if (verification && l.verificationStatus !== verification) return false;
      if (gender && l.gender !== gender) return false;
      if (maxPrice && l.priceUsd > Number(maxPrice)) return false;
      if (maxAgeMonths && l.ageMonths > Number(maxAgeMonths)) return false;
      if (minWeight && l.weightKg < Number(minWeight)) return false;
      if (minQuantity && l.quantity < Number(minQuantity)) return false;
      if (minRating && l.sellerRating < Number(minRating)) return false;
      if (q) {
        const hay = `${l.title} ${l.breed} ${l.category} ${l.province} ${l.district} ${l.sellerName} ${l.farmName} ${l.reference}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return a.priceUsd - b.priceUsd;
      if (sortBy === 'price_desc') return b.priceUsd - a.priceUsd;
      if (sortBy === 'weight_desc') return b.weightKg - a.weightKg;
      if (sortBy === 'verified') {
        const av = a.verificationStatus === 'Verified' ? 1 : 0;
        const bv = b.verificationStatus === 'Verified' ? 1 : 0;
        if (av !== bv) return bv - av;
      }
      return new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime();
    });
  }, [
    listings,
    onlySaved,
    savedListingIds,
    category,
    breed,
    province,
    district,
    verification,
    gender,
    maxPrice,
    maxAgeMonths,
    minWeight,
    minQuantity,
    minRating,
    query,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / pageSize));
  const paginated = filteredListings.slice((page - 1) * pageSize, page * pageSize);
  const comparedListings = listings.filter((l) => compareListingIds.includes(l.id));
  const recentlyViewed = recentlyViewedIds
    .map((id) => listings.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  const openDetail = (id: string) => {
    if (onOpenListing) {
      onOpenListing(id);
    } else {
      navigatePublic('listing-detail', id);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setCategory('');
    setBreed('');
    setProvince('');
    setDistrict('');
    setVerification('');
    setGender('');
    setMaxPrice('');
    setMaxAgeMonths('');
    setMinWeight('');
    setMinQuantity('');
    setMinRating('');
    setOnlySaved(false);
    setPage(1);
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 180);
  };

  const activeFilterLabels = [
    category,
    breed,
    province,
    district,
    verification,
    gender,
    maxPrice ? `≤ $${maxPrice}` : '',
    maxAgeMonths ? `≤ ${maxAgeMonths} mos` : '',
    minWeight ? `≥ ${minWeight} kg` : '',
    minQuantity ? `≥ ${minQuantity} head` : '',
    minRating ? `${minRating}+ rating` : '',
    onlySaved ? 'Saved lots' : '',
  ].filter(Boolean);
  const activeFilterCount = activeFilterLabels.length;

  const filterControls = (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-[#10243A] mb-1">Province</label>
        <select
          value={province}
          onChange={(e) => {
            setProvince(e.target.value);
            setDistrict('');
            setPage(1);
          }}
          className="w-full h-9 rounded-md bg-white border border-[#E5E9ED] px-2.5 text-sm"
        >
          <option value="">All Zimbabwe Provinces</option>
          {Object.keys(ZIMBABWE_PROVINCES).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#10243A] mb-1.5">District</label>
        <select
          value={district}
          disabled={!province}
          onChange={(e) => {
            setDistrict(e.target.value);
            setPage(1);
          }}
          className="w-full h-9 rounded-md bg-white border border-[#E5E9ED] px-2.5 text-sm disabled:bg-[#F4F6F7] disabled:text-[#697784]"
        >
          <option value="">{province ? 'All districts' : 'Select province first'}</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#10243A] mb-1.5">Verification</label>
        <select
          value={verification}
          onChange={(e) => {
            setVerification(e.target.value);
            setPage(1);
          }}
          className="w-full h-9 rounded-md bg-white border border-[#E5E9ED] px-2.5 text-sm"
        >
          <option value="">Any status</option>
          <option value="Verified">Field Verified Only</option>
          <option value="Inspection Scheduled">Inspection Scheduled</option>
          <option value="Pending Verification">Pending Verification</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#10243A] mb-1.5">Breed</label>
        <select
          value={breed}
          onChange={(e) => {
            setBreed(e.target.value);
            setPage(1);
          }}
          className="w-full h-9 rounded-md bg-white border border-[#E5E9ED] px-2.5 text-sm"
        >
          <option value="">All breeds</option>
          {availableBreeds.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#10243A] mb-1.5">Gender / Herd Type</label>
        <select
          value={gender}
          onChange={(e) => {
            setGender(e.target.value);
            setPage(1);
          }}
          className="w-full h-9 rounded-md bg-white border border-[#E5E9ED] px-2.5 text-sm"
        >
          <option value="">All types</option>
          <option value="Bull / Male">Bull / Male</option>
          <option value="Cow / Female">Cow / Female</option>
          <option value="Heifer">Heifer</option>
          <option value="Steer / Ox">Steer / Ox</option>
          <option value="Mixed Herd">Mixed Herd</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-semibold text-[#10243A] mb-1.5">Max Price ($)</label>
          <input
            type="number"
            placeholder="e.g. 1000"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 rounded-md bg-white border border-[#E5E9ED] px-2.5 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#10243A] mb-1.5">Min Weight (kg)</label>
          <input
            type="number"
            placeholder="e.g. 300"
            value={minWeight}
            onChange={(e) => {
              setMinWeight(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 rounded-md bg-white border border-[#E5E9ED] px-2.5 text-sm font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-semibold text-[#10243A] mb-1.5">Max Age (Mos)</label>
          <input
            type="number"
            placeholder="e.g. 24"
            value={maxAgeMonths}
            onChange={(e) => {
              setMaxAgeMonths(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 rounded-md bg-white border border-[#E5E9ED] px-2.5 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#10243A] mb-1.5">Seller Rating</label>
          <select
            value={minRating}
            onChange={(e) => {
              setMinRating(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 rounded-md bg-white border border-[#E5E9ED] px-2 text-sm"
          >
            <option value="">Any</option>
            <option value="4.8">4.8+ stars</option>
            <option value="4.5">4.5+ stars</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#10243A] mb-1.5">Minimum Headcount</label>
        <input
          type="number"
          placeholder="e.g. 10 head"
          value={minQuantity}
          onChange={(e) => {
            setMinQuantity(e.target.value);
            setPage(1);
          }}
          className="w-full h-9 rounded-md bg-white border border-[#E5E9ED] px-2.5 text-sm font-mono"
        />
      </div>

      {activeFilterCount > 0 && (
        <Button variant="secondary" size="sm" className="w-full" onClick={resetFilters}>
          Clear all filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  return (
    <div className={cn(!embedded && 'max-w-[1280px] mx-auto px-4 sm:px-6 py-6')}>
      {!embedded && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-[#245B83] mb-0.5">Verified Discovery Engine</p>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#10243A]">
            Livestock Marketplace
          </h1>
        </div>
      )}

      {/* Interactive Category Segmented Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-4">
        <button
          type="button"
          onClick={() => {
            setCategory('');
            setPage(1);
          }}
          className={cn(
            'h-9 px-3.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 border transition-colors',
            !category
              ? 'bg-[#10243A] text-white border-[#10243A]'
              : 'bg-white text-[#17212B] border-[#E5E9ED] hover:bg-[#F4F6F7]'
          )}
        >
          All Livestock
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setCategory(cat);
              setPage(1);
            }}
            className={cn(
              'h-9 px-3.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 border transition-colors',
              category === cat
                ? 'bg-[#10243A] text-white border-[#10243A]'
                : 'bg-white text-[#17212B] border-[#E5E9ED] hover:bg-[#F4F6F7]'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search & Controls Toolbar */}
      <div className="bg-white border border-[#E5E9ED] rounded-lg p-3 mb-5 flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[#697784] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search breed, title, district, seller, or ref..."
            className="w-full h-9 pl-9 pr-3 text-sm bg-[#FAFAF7] border border-[#E5E9ED] rounded-md focus:outline-none focus:border-[#10243A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowFiltersMobile((v) => !v)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Button>

          <button
            type="button"
            onClick={() => {
              setOnlySaved((v) => !v);
              setPage(1);
            }}
            className={cn(
              'h-9 px-3 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors',
              onlySaved
                ? 'bg-[#10243A] text-white border-[#10243A]'
                : 'bg-white text-[#17212B] border-[#E5E9ED] hover:bg-[#F4F6F7]'
            )}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Saved ({savedListingIds.length})
          </button>

          {compareListingIds.length > 0 && (
            <Button variant="accent" size="sm" onClick={() => setCompareOpen(true)}>
              <GitCompareArrows className="w-3.5 h-3.5" />
              Compare ({compareListingIds.length})
            </Button>
          )}

          <select
            aria-label="Sort listings"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-9 rounded-md border border-[#E5E9ED] bg-white px-2.5 text-xs font-medium text-[#17212B]"
          >
            <option value="verified">Sort: Verified First</option>
            <option value="newest">Sort: Newest Listed</option>
            <option value="price_asc">Sort: Price Low to High</option>
            <option value="price_desc">Sort: Price High to Low</option>
            <option value="weight_desc">Sort: Heaviest First</option>
          </select>

          <div className="inline-flex border border-[#E5E9ED] rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={cn(
                'h-9 w-9 flex items-center justify-center',
                viewMode === 'grid' ? 'bg-[#10243A] text-white' : 'bg-white text-[#697784]'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={cn(
                'h-9 w-9 flex items-center justify-center',
                viewMode === 'list' ? 'bg-[#10243A] text-white' : 'bg-white text-[#697784]'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Desktop Filters Sidebar */}
        <aside className="hidden lg:block lg:col-span-3 bg-white border border-[#E5E9ED] rounded-lg p-4 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#E5E9ED]">
            <h2 className="text-sm font-bold text-[#10243A]">Filter Livestock</h2>
            <span className="text-xs font-mono text-[#697784] tabular-nums">
              {filteredListings.length} found
            </span>
          </div>
          {filterControls}
        </aside>

        {/* Mobile Filters Panel */}
        {showFiltersMobile && (
          <div className="lg:hidden bg-white border border-[#E5E9ED] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5E9ED]">
              <h2 className="text-sm font-bold text-[#10243A]">Filter Livestock</h2>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setShowFiltersMobile(false)}
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-[#F4F6F7]"
              >
                <X className="w-4 h-4 text-[#697784]" />
              </button>
            </div>
            {filterControls}
          </div>
        )}

        {/* Results */}
        <div className="lg:col-span-9 space-y-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#697784]">
            <p className="tabular-nums">
              Showing <strong className="text-[#10243A]">{filteredListings.length}</strong> active{' '}
              {filteredListings.length === 1 ? 'lot' : 'lots'}
              {activeFilterLabels.length > 0 && (
                <span> · {activeFilterLabels.join(' · ')}</span>
              )}
            </p>
            {(activeFilterCount > 0 || query.trim()) && (
              <button
                type="button"
                onClick={resetFilters}
                className="font-semibold text-[#245B83] hover:text-[#10243A] underline underline-offset-2"
              >
                Reset filters
              </button>
            )}
          </div>
          {isRefreshing ? (
            <SkeletonGrid count={6} />
          ) : paginated.length === 0 ? (
            <EmptyState
              title="No livestock lots match these filters"
              description="Try broadening your province, weight, or price filters, or search across all active Zimbabwean ranches."
              action={
                <Button variant="primary" size="md" onClick={resetFilters}>
                  Reset All Filters
                </Button>
              }
            />
          ) : (
            <>
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'
                    : 'space-y-4'
                )}
              >
                {paginated.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    view={viewMode}
                    saved={savedListingIds.includes(listing.id)}
                    compared={compareListingIds.includes(listing.id)}
                    onOpen={openDetail}
                    onToggleSave={toggleSaveListing}
                    onToggleCompare={toggleCompareListing}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[#E5E9ED]">
                  <p className="text-xs text-[#697784] tabular-nums">
                    Showing {(page - 1) * pageSize + 1}–
                    {Math.min(page * pageSize, filteredListings.length)} of{' '}
                    {filteredListings.length} lots
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-mono text-[#10243A] px-2 tabular-nums">
                      Page {page} / {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Recently Viewed */}
          {recentlyViewed.length > 0 && !embedded && (
            <div className="pt-6 border-t border-[#E5E9ED]">
              <h2 className="text-sm font-bold text-[#10243A] mb-3">Recently Viewed Lots</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {recentlyViewed.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openDetail(item.id)}
                    className="bg-white border border-[#E5E9ED] rounded-lg p-3.5 text-left hover:border-[#10243A] transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-[#697784]">{item.reference}</p>
                      <p className="text-sm font-semibold text-[#10243A] truncate mt-0.5">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#697784] mt-0.5">
                        {item.district} · {item.quantity} head
                      </p>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#10243A] shrink-0 tabular-nums">
                      {formatUSD(item.priceUsd)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side-by-Side Comparison Drawer */}
      <Drawer
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        title={`Compare Livestock Lots (${comparedListings.length}/3)`}
      >
        {comparedListings.length === 0 ? (
          <EmptyState
            title="No listings selected for comparison"
            description="Click the Compare icon on up to 3 livestock listings to evaluate breed, weight, location, and USD pricing side by side."
          />
        ) : (
          <div className="space-y-5">
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={clearCompare}>
                Clear Comparison
              </Button>
            </div>
            <div className="overflow-x-auto border border-[#E5E9ED] rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF7] border-b border-[#E5E9ED]">
                  <tr>
                    <th className="p-3 font-semibold text-[#697784]">Specification</th>
                    {comparedListings.map((l) => (
                      <th key={l.id} className="p-3 font-bold text-[#10243A] min-w-[160px]">
                        <button
                          type="button"
                          onClick={() => {
                            setCompareOpen(false);
                            openDetail(l.id);
                          }}
                          className="text-left hover:text-[#245B83]"
                        >
                          {l.title}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9ED] tabular-nums">
                  {[
                    ['Reference', (l: typeof comparedListings[0]) => l.reference],
                    ['Price (USD)', (l: typeof comparedListings[0]) => `${formatUSD(l.priceUsd)} ${l.priceUnit}`],
                    ['Total Lot Est.', (l: typeof comparedListings[0]) => formatUSD(l.priceUsd * l.quantity)],
                    ['Category & Breed', (l: typeof comparedListings[0]) => `${l.category} · ${l.breed}`],
                    ['Quantity', (l: typeof comparedListings[0]) => `${l.quantity} head`],
                    ['Avg Live Weight', (l: typeof comparedListings[0]) => `${l.weightKg} kg`],
                    ['Age', (l: typeof comparedListings[0]) => l.ageLabel],
                    ['Gender / Herd', (l: typeof comparedListings[0]) => l.gender],
                    ['Location', (l: typeof comparedListings[0]) => `${l.district}, ${l.province}`],
                    ['Verification', (l: typeof comparedListings[0]) => l.verificationStatus],
                    ['Seller Rating', (l: typeof comparedListings[0]) => `${l.sellerRating.toFixed(1)} / 5.0 (${l.sellerName})`],
                  ].map(([label, getter]) => (
                    <tr key={label as string}>
                      <td className="p-3 font-medium text-[#697784] bg-[#FAFAF7]">
                        {label as string}
                      </td>
                      {comparedListings.map((l) => (
                        <td key={l.id} className="p-3 text-[#17212B]">
                          {(getter as (x: typeof comparedListings[0]) => string)(l)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
