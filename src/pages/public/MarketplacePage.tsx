import React, { useEffect, useMemo, useState } from 'react';
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
import {
  AFRICAN_REGIONS,
  AFRICAN_REGION_SUMMARY,
  cn,
  formatUSD,
  getCountryFlag,
  getCountryRegion,
  getDistrictsForProvince,
  getProvincesForCountry,
} from '../../lib/utils';
import type { AfricanRegion, LivestockCategory } from '../../types/mariketi';
import { ListingCard } from '../../components/shared/ListingCard';
import { CountrySelect } from '../../components/shared/CountrySelect';
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
  initialCountry?: string;
  initialRegion?: AfricanRegion;
  embedded?: boolean;
  onOpenListing?: (id: string) => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  initialQuery = '',
  initialCategory,
  initialCountry = '',
  initialRegion,
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
  const [region, setRegion] = useState<AfricanRegion | ''>(initialRegion || '');
  const [country, setCountry] = useState<string>(initialCountry || '');
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

  useEffect(() => {
    setQuery(initialQuery);
    setCategory(initialCategory || '');
    setCountry(initialCountry || '');
    setRegion(initialRegion || '');
    setProvince('');
    setDistrict('');
    setPage(1);
  }, [initialQuery, initialCategory, initialCountry, initialRegion]);

  const provinces = country ? getProvincesForCountry(country) : [];
  const districts = country && province ? getDistrictsForProvince(country, province) : [];

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
      if (region && getCountryRegion(l.country) !== region) return false;
      if (country && l.country !== country) return false;
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
        const hay = `${l.title} ${l.breed} ${l.category} ${l.country} ${getCountryRegion(l.country)} ${l.province} ${l.district} ${l.sellerName} ${l.farmName} ${l.reference}`.toLowerCase();
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
    region,
    country,
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
    setRegion('');
    setCountry('');
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
    region,
    country ? `${getCountryFlag(country)} ${country}` : '',
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

  const fieldClass =
    'w-full h-9 rounded-lg bg-white border border-[#D4DDE6] px-2.5 text-sm text-[#0F1B2A] shadow-[0_1px_2px_rgba(16,36,58,0.02)] transition-all duration-150 hover:border-[#B6C3D1] focus:outline-none focus:border-[#10243A] focus:ring-2 focus:ring-[#10243A]/12';

  const filterControls = (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-[#10243A] mb-1">African Region</label>
        <select
          value={region}
          onChange={(e) => {
            const nextRegion = e.target.value as AfricanRegion | '';
            setRegion(nextRegion);
            if (country && nextRegion && getCountryRegion(country) !== nextRegion) {
              setCountry('');
              setProvince('');
              setDistrict('');
            }
            setPage(1);
          }}
          className={fieldClass}
        >
          <option value="">All Africa (54 Nations)</option>
          {AFRICAN_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#10243A] mb-1">Country</label>
        <CountrySelect
          value={country}
          regionFilter={region}
          includeAllOption={region ? `All ${region}` : 'All 54 African Countries'}
          ariaLabel="Filter by country"
          selectClassName="h-9 px-2.5"
          onChange={(nextCountry) => {
            setCountry(nextCountry);
            setProvince('');
            setDistrict('');
            setPage(1);
          }}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#10243A] mb-1">Province / County</label>
        <select
          value={province}
          disabled={!country}
          onChange={(e) => {
            setProvince(e.target.value);
            setDistrict('');
            setPage(1);
          }}
          className={cn(fieldClass, 'disabled:bg-[#F3F6F9] disabled:text-[#526071]')}
        >
          <option value="">{country ? `All ${country} regions` : 'Select country first'}</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#10243A] mb-1">District / Town</label>
        <select
          value={district}
          disabled={!province}
          onChange={(e) => {
            setDistrict(e.target.value);
            setPage(1);
          }}
          className={cn(fieldClass, 'disabled:bg-[#F3F6F9] disabled:text-[#526071]')}
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
        <label className="block text-xs font-semibold text-[#10243A] mb-1">Verification</label>
        <select
          value={verification}
          onChange={(e) => {
            setVerification(e.target.value);
            setPage(1);
          }}
          className={fieldClass}
        >
          <option value="">Any status</option>
          <option value="Verified">Field Verified Only</option>
          <option value="Inspection Scheduled">Inspection Scheduled</option>
          <option value="Pending Verification">Pending Verification</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#10243A] mb-1">Breed</label>
        <select
          value={breed}
          onChange={(e) => {
            setBreed(e.target.value);
            setPage(1);
          }}
          className={fieldClass}
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
        <label className="block text-xs font-semibold text-[#10243A] mb-1">Gender / Herd Type</label>
        <select
          value={gender}
          onChange={(e) => {
            setGender(e.target.value);
            setPage(1);
          }}
          className={fieldClass}
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
          <label className="block text-xs font-semibold text-[#10243A] mb-1">Max Price ($)</label>
          <input
            type="number"
            placeholder="e.g. 1000"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            className={cn(fieldClass, 'font-mono')}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#10243A] mb-1">Min Weight (kg)</label>
          <input
            type="number"
            placeholder="e.g. 300"
            value={minWeight}
            onChange={(e) => {
              setMinWeight(e.target.value);
              setPage(1);
            }}
            className={cn(fieldClass, 'font-mono')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-semibold text-[#10243A] mb-1">Max Age (Mos)</label>
          <input
            type="number"
            placeholder="e.g. 24"
            value={maxAgeMonths}
            onChange={(e) => {
              setMaxAgeMonths(e.target.value);
              setPage(1);
            }}
            className={cn(fieldClass, 'font-mono')}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#10243A] mb-1">Seller Rating</label>
          <select
            value={minRating}
            onChange={(e) => {
              setMinRating(e.target.value);
              setPage(1);
            }}
            className={cn(fieldClass, 'px-2')}
          >
            <option value="">Any</option>
            <option value="4.8">4.8+ stars</option>
            <option value="4.5">4.5+ stars</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#10243A] mb-1">Minimum Headcount</label>
        <input
          type="number"
          placeholder="e.g. 10 head"
          value={minQuantity}
          onChange={(e) => {
            setMinQuantity(e.target.value);
            setPage(1);
          }}
          className={cn(fieldClass, 'font-mono')}
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
          <p className="text-xs font-semibold text-[#1E547A] mb-0.5">
            Pan-African Verified Discovery Engine · 54 Countries
          </p>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#10243A]">
            African Livestock Marketplace
          </h1>
        </div>
      )}

      {/* Interactive Pan-African Region Filter Bar (Ordered Southern -> East -> West -> Central -> North) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2.5">
        <button
          type="button"
          onClick={() => {
            setRegion('');
            setCountry('');
            setProvince('');
            setDistrict('');
            setPage(1);
          }}
          className={cn(
            'h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#F28C28]',
            !region
              ? 'bg-[#10243A] text-white border-[#10243A] shadow-[0_1px_3px_rgba(16,36,58,0.2)]'
              : 'bg-white text-[#10243A] border-[#D4DDE6] hover:bg-[#F7F9FC] hover:border-[#B6C3D1]'
          )}
        >
          All Africa (54)
        </button>
        {AFRICAN_REGION_SUMMARY.map((item) => (
          <button
            key={item.region}
            type="button"
            onClick={() => {
              setRegion(item.region);
              if (country && getCountryRegion(country) !== item.region) {
                setCountry('');
                setProvince('');
                setDistrict('');
              }
              setPage(1);
            }}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#F28C28] inline-flex items-center gap-1.5',
              region === item.region
                ? 'bg-[#10243A] text-white border-[#10243A] shadow-[0_1px_3px_rgba(16,36,58,0.2)]'
                : 'bg-white text-[#10243A] border-[#D4DDE6] hover:bg-[#F7F9FC] hover:border-[#B6C3D1]'
            )}
          >
            <span aria-hidden="true">{item.highlightFlags[0]}</span>
            <span>{item.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Interactive Category Segmented Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-4">
        <button
          type="button"
          onClick={() => {
            setCategory('');
            setPage(1);
          }}
          className={cn(
            'h-9 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#F28C28]',
            !category
              ? 'bg-[#10243A] text-white border-[#10243A] shadow-[0_1px_3px_rgba(16,36,58,0.2)]'
              : 'bg-white text-[#10243A] border-[#D4DDE6] hover:bg-[#F7F9FC] hover:border-[#B6C3D1]'
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
              'h-9 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#F28C28]',
              category === cat
                ? 'bg-[#10243A] text-white border-[#10243A] shadow-[0_1px_3px_rgba(16,36,58,0.2)]'
                : 'bg-white text-[#10243A] border-[#D4DDE6] hover:bg-[#F7F9FC] hover:border-[#B6C3D1]'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search & Controls Toolbar */}
      <div className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-3 mb-5 flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[#526071] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search breed, country, region, district, seller, or ref..."
            className="w-full h-9 pl-9 pr-3 text-sm bg-[#F7F9FC] border border-[#D4DDE6] rounded-lg text-[#0F1B2A] placeholder:text-[#667587] transition-all duration-150 hover:border-[#B6C3D1] focus:outline-none focus:bg-white focus:border-[#10243A] focus:ring-2 focus:ring-[#10243A]/12"
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
              'h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#F28C28]',
              onlySaved
                ? 'bg-[#10243A] text-white border-[#10243A] shadow-[0_1px_3px_rgba(16,36,58,0.2)]'
                : 'bg-white text-[#10243A] border-[#D4DDE6] hover:bg-[#F7F9FC] hover:border-[#B6C3D1]'
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
            className="h-9 rounded-lg border border-[#D4DDE6] bg-white hover:border-[#B6C3D1] px-2.5 text-xs font-semibold text-[#10243A] transition-colors focus:outline-none focus:border-[#10243A]"
          >
            <option value="verified">Sort: Verified First</option>
            <option value="newest">Sort: Newest Listed</option>
            <option value="price_asc">Sort: Price Low to High</option>
            <option value="price_desc">Sort: Price High to Low</option>
            <option value="weight_desc">Sort: Heaviest First</option>
          </select>

          <div className="inline-flex border border-[#D4DDE6] rounded-lg overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={cn(
                'h-9 w-9 flex items-center justify-center transition-colors',
                viewMode === 'grid' ? 'bg-[#10243A] text-white' : 'bg-white text-[#526071] hover:bg-[#F7F9FC] hover:text-[#10243A]'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={cn(
                'h-9 w-9 flex items-center justify-center transition-colors border-l border-[#D4DDE6]',
                viewMode === 'list' ? 'bg-[#10243A] text-white' : 'bg-white text-[#526071] hover:bg-[#F7F9FC] hover:text-[#10243A]'
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
        <aside className="hidden lg:block lg:col-span-3 bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#DFE6EE]">
            <h2 className="text-sm font-bold text-[#10243A]">Filter Livestock</h2>
            <span className="text-xs font-mono font-semibold text-[#526071] tabular-nums">
              {filteredListings.length} found
            </span>
          </div>
          {filterControls}
        </aside>

        {/* Mobile Filters Panel */}
        {showFiltersMobile && (
          <div className="lg:hidden bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#DFE6EE]">
              <h2 className="text-sm font-bold text-[#10243A]">Filter Livestock</h2>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setShowFiltersMobile(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#EEF3F8] transition-colors"
              >
                <X className="w-4 h-4 text-[#526071]" />
              </button>
            </div>
            {filterControls}
          </div>
        )}

        {/* Results */}
        <div className="lg:col-span-9 space-y-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#526071]">
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
                className="font-semibold text-[#1E547A] hover:text-[#10243A] underline underline-offset-4 transition-colors"
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
              description="Try broadening your region, country, weight, or price filters, or explore verified herds across all active African ranches."
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
                <div className="flex items-center justify-between pt-4 border-t border-[#DFE6EE]">
                  <p className="text-xs text-[#526071] tabular-nums">
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
                    <span className="text-xs font-mono font-semibold text-[#10243A] px-2 tabular-nums">
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
            <div className="pt-6 border-t border-[#DFE6EE]">
              <h2 className="text-sm font-bold text-[#10243A] mb-3">Recently Viewed Lots</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {recentlyViewed.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openDetail(item.id)}
                    className="bg-white border border-[#DFE6EE] rounded-xl p-3.5 text-left shadow-[0_1px_2px_rgba(16,36,58,0.03)] hover:border-[#10243A]/45 hover:shadow-[0_6px_16px_rgba(16,36,58,0.07)] transition-all duration-150 flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-[#F28C28]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-[#526071]">{item.reference}</p>
                      <p className="text-sm font-semibold text-[#10243A] truncate mt-0.5">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#526071] mt-0.5 truncate">
                        {getCountryFlag(item.country)} {item.district}, {item.country} · {item.quantity} head
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
            <div className="overflow-x-auto border border-[#DFE6EE] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F9FC] border-b border-[#DFE6EE]">
                  <tr>
                    <th className="p-3 font-semibold text-[#526071]">Specification</th>
                    {comparedListings.map((l) => (
                      <th key={l.id} className="p-3 font-bold text-[#10243A] min-w-[160px]">
                        <button
                          type="button"
                          onClick={() => {
                            setCompareOpen(false);
                            openDetail(l.id);
                          }}
                          className="text-left hover:text-[#1E547A] underline-offset-4 hover:underline transition-colors"
                        >
                          {l.title}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DFE6EE] tabular-nums">
                  {[
                    ['Reference', (l: typeof comparedListings[0]) => l.reference],
                    ['Price (USD)', (l: typeof comparedListings[0]) => `${formatUSD(l.priceUsd)} ${l.priceUnit}`],
                    ['Total Lot Est.', (l: typeof comparedListings[0]) => formatUSD(l.priceUsd * l.quantity)],
                    ['Category & Breed', (l: typeof comparedListings[0]) => `${l.category} · ${l.breed}`],
                    ['Quantity', (l: typeof comparedListings[0]) => `${l.quantity} head`],
                    ['Avg Live Weight', (l: typeof comparedListings[0]) => `${l.weightKg} kg`],
                    ['Age', (l: typeof comparedListings[0]) => l.ageLabel],
                    ['Gender / Herd', (l: typeof comparedListings[0]) => l.gender],
                    ['Location', (l: typeof comparedListings[0]) => `${getCountryFlag(l.country)} ${l.district}, ${l.province}, ${l.country}`],
                    ['Verification', (l: typeof comparedListings[0]) => l.verificationStatus],
                    ['Seller Rating', (l: typeof comparedListings[0]) => `${l.sellerRating.toFixed(1)} / 5.0 (${l.sellerName})`],
                  ].map(([label, getter]) => (
                    <tr key={label as string}>
                      <td className="p-3 font-semibold text-[#526071] bg-[#F7F9FC]">
                        {label as string}
                      </td>
                      {comparedListings.map((l) => (
                        <td key={l.id} className="p-3 text-[#0F1B2A]">
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
