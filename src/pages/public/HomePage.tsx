import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Search,
  ShieldCheck,
  Check,
  MapPin,
  FileCheck2,
  Truck,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import {
  AFRICAN_REGION_SUMMARY,
  ASSET_IMAGES,
  cn,
  getCountryRegion,
} from '../../lib/utils';
import type { AfricanRegion, LivestockCategory } from '../../types/mariketi';
import { ListingCard } from '../../components/shared/ListingCard';
import { CountrySelect } from '../../components/shared/CountrySelect';
import { Button, SafeImage } from '../../components/ui/DesignSystem';

interface HomePageProps {
  onSearchMarketplace: (
    query: string,
    category?: LivestockCategory,
    country?: string,
    region?: AfricanRegion
  ) => void;
}

const CATEGORIES: {
  name: LivestockCategory;
  subtitle: string;
  image: string;
}[] = [
  { name: 'Cattle', subtitle: 'Brahman, Boran, Ankole, Tuli', image: ASSET_IMAGES.brahmanBull },
  { name: 'Goats', subtitle: 'Boer, Galla, Kalahari Red', image: ASSET_IMAGES.boerGoats },
  { name: 'Sheep', subtitle: 'Dorper, Red Maasai, Sabi', image: ASSET_IMAGES.dorperSheep },
  { name: 'Pigs', subtitle: 'Large White, Landrace Baconers', image: ASSET_IMAGES.largeWhitePigs },
  { name: 'Poultry', subtitle: 'Sasso, Kuroiler, Ross 308', image: ASSET_IMAGES.poultryBroilers },
  { name: 'Other livestock', subtitle: 'Stud & Heritage Breeds', image: ASSET_IMAGES.heroCattle },
];

const JOURNEY_STEPS = [
  {
    num: '01',
    title: 'Discover',
    body: 'Filter verified cattle, goats, sheep, pigs, and poultry across all 54 African nations — starting from Southern & East Africa across the continent.',
  },
  {
    num: '02',
    title: 'Verify',
    body: 'Accredited field agents inspect animals on-farm with GPS timestamps, ear-tag counts, live weight sampling, and national veterinary clearance checks.',
  },
  {
    num: '03',
    title: 'Negotiate',
    body: 'Submit structured offers and counter-offers with an immutable timestamped commercial trail between buyer and farmer.',
  },
  {
    num: '04',
    title: 'Transact',
    body: 'Convert accepted offers into documented transactions with veterinary movement permits, stock clearance, and transparent milestones.',
  },
  {
    num: '05',
    title: 'Handover',
    body: 'Coordinate pen check-in at regional Collection Centres and dispatch accredited livestock haulers with PIN-verified proof of delivery.',
  },
  {
    num: '06',
    title: 'Complete & Review',
    body: 'Confirm condition upon arrival, finalize handover documentation, and rate verified trade partners to strengthen continental market trust.',
  },
];

const FAQS = [
  {
    q: 'How does MARIKETI verify livestock before buyers travel or commit?',
    a: 'An accredited MARIKETI Field Agent visits the farm or collection kraal in person, confirms breed, headcount, average live weight, ear-tag ranges, and national veterinary movement documentation, and uploads GPS-stamped photographs directly to the listing.',
  },
  {
    q: 'Which African regions and countries does MARIKETI cover?',
    a: 'MARIKETI supports all 54 African nations — starting with active commercial corridors across Southern Africa (Zimbabwe, South Africa, Botswana, Namibia, Zambia) and East Africa (Kenya, Tanzania, Uganda, Ethiopia, Rwanda), and expanding seamlessly across West, Central, and North Africa.',
  },
  {
    q: 'Can smallholder farmers and rural agents use MARIKETI with weak mobile signal?',
    a: 'Yes. Our Field Agent operations app runs offline-first with IndexedDB local persistence, allowing inspectors to capture photos, GPS coordinates, and checklists in rural districts and automatically sync once connectivity returns.',
  },
  {
    q: 'Does MARIKETI handle live bank payments or escrow in this version?',
    a: 'This release transparently separates simulated demo payment states from live payment rails. Payment milestones are tracked in demo mode so commercial teams can test negotiation, collection, and handover workflows end to end.',
  },
];

export const HomePage: React.FC<HomePageProps> = ({ onSearchMarketplace }) => {
  const {
    listings,
    savedListingIds,
    compareListingIds,
    navigatePublic,
    openAuth,
    toggleSaveListing,
    toggleCompareListing,
    loginAsRole,
  } = useMariketi();

  const [heroQuery, setHeroQuery] = useState('');
  const [heroCountry, setHeroCountry] = useState('');
  const [heroCategory, setHeroCategory] = useState<string>('');
  const [openFaq, setOpenFaq] = useState<number>(0);

  const featuredListings = listings
    .filter((l) => l.status === 'active')
    .slice(0, 6);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchMarketplace(
      heroQuery,
      (heroCategory as LivestockCategory) || undefined,
      heroCountry || undefined
    );
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-[#071320] text-white overflow-hidden">
        <div className="absolute inset-0">
          <SafeImage
            src={ASSET_IMAGES.heroCattle}
            alt="Commercial Brahman and Boran cattle herd grazing across African savanna ranches"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#071320]/95 via-[#0A1C30]/80 to-[#091827]/38" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#071320]/70 to-transparent" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-10 sm:py-14 lg:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#F69B3D] uppercase tracking-wider mb-2.5">
              Verified Livestock Marketplace · Across Africa
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(7,19,32,0.35)]">
              The smarter way to buy and sell livestock across Africa.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-200 leading-relaxed max-w-xl prose-justify tracking-[0.005em]">
              Starting from Southern Africa and expanding across East, West, Central, and North Africa — discover field-verified herds, connect with trusted ranchers and abattoirs, and complete handover with confidence.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                variant="accent"
                size="lg"
                onClick={() => navigatePublic('marketplace')}
              >
                Explore Livestock
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="inverted"
                size="lg"
                onClick={() => openAuth('register', 'seller')}
              >
                Sell Livestock
              </Button>
            </div>
          </div>

          {/* Prominent Pan-African Livestock Search Bar */}
          <form
            onSubmit={handleHeroSearch}
            className="mt-8 bg-white rounded-xl p-2 border border-white/25 shadow-[0_18px_44px_rgba(5,16,30,0.34)] max-w-5xl grid grid-cols-1 sm:grid-cols-12 gap-2 text-[#0F1B2A]"
          >
            <div className="sm:col-span-5 relative flex items-center min-w-0">
              <Search className="w-4 h-4 text-[#526071] absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
                placeholder="Search breed, country, district, or ref (e.g. Boran, Kenya, Gwanda)..."
                className="w-full h-10 pl-9 pr-3 text-sm bg-transparent focus:outline-none placeholder:text-[#667587] min-w-0"
              />
            </div>
            <div className="sm:col-span-3 pt-1 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[#DFE6EE] min-w-0">
              <CountrySelect
                value={heroCountry}
                onChange={setHeroCountry}
                includeAllOption="All Africa (54 Nations)"
                ariaLabel="Filter by African country"
                selectClassName="h-10 border-0 shadow-none bg-transparent hover:border-transparent focus:ring-0 font-medium text-[#10243A] px-2.5"
              />
            </div>
            <div className="sm:col-span-2 pt-1 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[#DFE6EE] min-w-0">
              <select
                aria-label="Livestock category"
                value={heroCategory}
                onChange={(e) => setHeroCategory(e.target.value)}
                className="w-full h-10 px-2.5 text-sm font-medium bg-transparent text-[#10243A] focus:outline-none"
              >
                <option value="">All Livestock</option>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" size="md" className="w-full">
                Search Lots
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Trust & Verification Strip (Full-width row immediately below hero) */}
      <section className="bg-white border-b border-[#DFE6EE]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 lg:gap-x-0 lg:divide-x lg:divide-[#DFE6EE]">
          <div className="lg:pr-6">
            <p className="font-mono text-xl sm:text-2xl font-bold text-[#10243A] tabular-nums">54 Nations</p>
            <p className="text-xs text-[#526071] mt-0.5 leading-snug">Southern Africa to East, West, Central & North Africa</p>
          </div>
          <div className="lg:px-6">
            <p className="font-mono text-xl sm:text-2xl font-bold text-[#10243A] tabular-nums">1,420+ Head</p>
            <p className="text-xs text-[#526071] mt-0.5 leading-snug">Physically verified across Southern & East Africa</p>
          </div>
          <div className="lg:px-6">
            <p className="font-mono text-xl sm:text-2xl font-bold text-[#10243A] tabular-nums">100% Traced</p>
            <p className="text-xs text-[#526071] mt-0.5 leading-snug">Ear-tags, national veterinary clearances & handover PINs</p>
          </div>
          <div className="lg:pl-6">
            <p className="font-mono text-xl sm:text-2xl font-bold text-[#10243A] tabular-nums">6 Roles</p>
            <p className="text-xs text-[#526071] mt-0.5 leading-snug">Unified buyer, seller, agent, hub & transport network</p>
          </div>
        </div>
      </section>

      {/* Featured Verified Livestock */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 lg:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-semibold text-[#1E547A] uppercase tracking-wider mb-1">Active Commercial Lots</p>
            <h2 className="text-2xl sm:text-[28px] font-bold text-[#10243A]">
              Featured verified livestock
            </h2>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigatePublic('marketplace')}
          >
            View all listings
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              saved={savedListingIds.includes(listing.id)}
              compared={compareListingIds.includes(listing.id)}
              onOpen={(id) => navigatePublic('listing-detail', id)}
              onToggleSave={toggleSaveListing}
              onToggleCompare={toggleCompareListing}
            />
          ))}
        </div>
      </section>

      {/* Browse by Category */}
      <section className="bg-white border-y border-[#DFE6EE] py-10 lg:py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#1E547A] uppercase tracking-wider mb-1">Species Taxonomy</p>
            <h2 className="text-2xl sm:text-[28px] font-bold text-[#10243A]">
              Browse by livestock category
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat) => {
              const count = listings.filter(
                (l) => l.status === 'active' && l.category === cat.name
              ).length;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => onSearchMarketplace('', cat.name)}
                  className="group text-left bg-[#F7F9FC] border border-[#DFE6EE] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(16,36,58,0.03)] hover:bg-white hover:border-[#10243A]/45 hover:shadow-[0_8px_20px_rgba(16,36,58,0.08)] hover:-translate-y-0.5 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#F28C28]"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#10243A]">
                    <SafeImage
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="p-3.5">
                    <p className="text-sm font-bold text-[#10243A]">{cat.name}</p>
                    <p className="text-[11px] text-[#526071] mt-0.5 line-clamp-1">{cat.subtitle}</p>
                    <p className="text-[11px] font-mono font-semibold text-[#1E547A] mt-1.5 tabular-nums">
                      {count} active {count === 1 ? 'lot' : 'lots'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pan-African Regional Corridors (Southern Africa -> East -> West -> Central -> North) */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-10 lg:pt-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#1E547A] uppercase tracking-wider mb-1">
              Continental Coverage · 54 African Nations
            </p>
            <h2 className="text-2xl sm:text-[28px] font-bold text-[#10243A]">
              From Southern Africa to East Africa and across the continent
            </h2>
            <p className="mt-1.5 text-sm text-[#526071] leading-relaxed prose-justify">
              Anchored in Southern Africa and expanding rapidly across East Africa’s high-volume livestock corridors — explore active verified stock by region or country.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigatePublic('marketplace')}
          >
            Browse all 54 countries
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {AFRICAN_REGION_SUMMARY.map((item) => {
            const regionCount = listings.filter(
              (l) => l.status === 'active' && getCountryRegion(l.country) === item.region
            ).length;
            return (
              <button
                key={item.region}
                type="button"
                onClick={() => onSearchMarketplace('', undefined, undefined, item.region)}
                className="group text-left bg-white border border-[#DFE6EE] rounded-xl p-4 shadow-[0_1px_3px_rgba(16,36,58,0.03)] hover:border-[#10243A]/45 hover:shadow-[0_8px_20px_rgba(16,36,58,0.08)] hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-[#F28C28]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base tracking-wide leading-none" aria-hidden="true">
                      {item.highlightFlags.join(' ')}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#526071] group-hover:text-[#C96A0F] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                  <h3 className="text-sm font-bold text-[#10243A] mt-3">{item.shortLabel}</h3>
                  <p className="text-xs text-[#526071] mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <p className="mt-3 pt-2.5 border-t border-[#DFE6EE] text-[11px] font-mono font-semibold text-[#1E547A] tabular-nums">
                  {regionCount > 0
                    ? `${regionCount} active ${regionCount === 1 ? 'lot' : 'lots'}`
                    : 'Onboarding corridors'}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* How MARIKETI Works */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 lg:py-12">
        <div className="max-w-2xl mb-7">
          <p className="text-xs font-semibold text-[#1E547A] uppercase tracking-wider mb-1">End-to-End Trade Architecture</p>
          <h2 className="text-2xl sm:text-[28px] font-bold text-[#10243A]">
            From farm inspection to verified handover
          </h2>
          <p className="mt-2 text-sm text-[#526071] leading-relaxed prose-justify">
            Traditional livestock trade relies on informal brokers, unverified weight estimates, and risky long-distance travel. MARIKETI structures every stage into a verifiable operational chain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {JOURNEY_STEPS.map((step) => (
            <div
              key={step.num}
              className="bg-white border border-[#DFE6EE] rounded-xl p-5 shadow-[0_1px_3px_rgba(16,36,58,0.03)]"
            >
              <span className="font-mono text-xs font-bold text-[#C96A0F]">{step.num}.</span>
              <h3 className="text-[15px] font-bold text-[#10243A] mt-1.5">{step.title}</h3>
              <p className="text-[13px] text-[#526071] mt-1.5 leading-relaxed prose-justify">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Verification Matters (Balanced 2-column editorial split) */}
      <section className="surface-navy-editorial text-white py-10 lg:py-12 border-y border-white/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 rounded-xl overflow-hidden border border-white/15 shadow-[0_14px_34px_rgba(5,16,30,0.35)] min-h-[260px] lg:min-h-[300px]">
              <SafeImage
                src={ASSET_IMAGES.fieldAgent}
                alt="MARIKETI accredited field agent inspecting ear-tagged commercial cattle"
                className="w-full h-full lg:h-full object-cover"
              />
            </div>

            <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
              <div>
                <p className="text-xs font-semibold text-[#F69B3D] uppercase tracking-wider mb-1.5">
                  Physical Field Verification
                </p>
                <h2 className="text-2xl sm:text-[28px] font-bold text-white leading-tight">
                  Every verified listing is backed by boots on the ground.
                </h2>
                <p className="mt-2.5 text-sm text-slate-200/95 leading-relaxed prose-justify tracking-[0.005em]">
                  Before commercial buyers commit capital or dispatch haulage trucks, MARIKETI Field Agents physically inspect herds across Southern Africa, East Africa (Kenya, Tanzania, Uganda), and expanding continental corridors — even in remote districts using our offline mobile app.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/15 text-sm">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#F69B3D] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Physical Headcount & Ear Tags</p>
                    <p className="text-xs text-slate-300 mt-0.5">Tag ranges recorded and matched to owner herd registers.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#F69B3D] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-white">GPS & Time-Stamped Proof</p>
                    <p className="text-xs text-slate-300 mt-0.5">Exact farm coordinates logged at point of inspection.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <FileCheck2 className="w-4 h-4 text-[#F69B3D] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Veterinary Clearance Review</p>
                    <p className="text-xs text-slate-300 mt-0.5">National veterinary movement permits (DVS, KVB, TVLA, DALRRD) checked.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Truck className="w-4 h-4 text-[#F69B3D] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Collection Hub Continuity</p>
                    <p className="text-xs text-slate-300 mt-0.5">Weighbridge intake and PIN-verified delivery release.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="accent" size="md" onClick={() => navigatePublic('verification')}>
                  Read Verification Standard
                </Button>
                <Button
                  variant="inverted"
                  size="md"
                  onClick={() => loginAsRole('agent')}
                >
                  Inspect Field Agent App
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits for Farmers & Buyers + Role Ecosystem */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#DFE6EE] rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(16,36,58,0.04)] flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-[#1E547A] uppercase tracking-wider mb-1">For Farmers & Commercial Ranches</p>
              <h3 className="text-xl font-bold text-[#10243A]">
                Reach verified commercial buyers without middlemen eroding margins.
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#0F1B2A]">
                {[
                  'Guided 7-step listing workflow with draft saving and clear pricing in USD.',
                  'Independent field verification boosts buyer confidence and speeds up serious offers.',
                  'Full immutable counter-offer history so you never lose track of negotiated terms.',
                  'Seamless scheduling into regional Collection Centres and accredited haulage.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#1A7A50] mt-0.5 shrink-0" />
                    <span className="text-[13px] text-[#526071] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-5 pt-4 border-t border-[#DFE6EE] flex flex-wrap gap-2.5">
              <Button variant="primary" size="sm" onClick={() => openAuth('register', 'seller')}>
                Register as a Seller
              </Button>
              <Button variant="secondary" size="sm" onClick={() => loginAsRole('seller')}>
                Preview Seller Workspace
              </Button>
            </div>
          </div>

          <div className="bg-white border border-[#DFE6EE] rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(16,36,58,0.04)] flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-[#1E547A] uppercase tracking-wider mb-1">For Abattoirs, Feedlots & Breeders</p>
              <h3 className="text-xl font-bold text-[#10243A]">
                Procure inspected herds across Africa with complete traceability.
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#0F1B2A]">
                {[
                  'Compare up to three verified livestock lots side by side on weight, breed, country, and price.',
                  'Inspect GPS-stamped field verification reports and national veterinary clearances upfront.',
                  'Track every order across 11 clear operational milestones from offer to handover.',
                  'Receive PIN-verified proof of delivery and rate sellers after completion.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#1A7A50] mt-0.5 shrink-0" />
                    <span className="text-[13px] text-[#526071] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-5 pt-4 border-t border-[#DFE6EE] flex flex-wrap gap-2.5">
              <Button variant="accent" size="sm" onClick={() => openAuth('register', 'buyer')}>
                Register as a Buyer
              </Button>
              <Button variant="secondary" size="sm" onClick={() => loginAsRole('buyer')}>
                Preview Buyer Workspace
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Attributable Testimonials */}
      <section className="bg-white border-y border-[#DFE6EE] py-10 lg:py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#1E547A] uppercase tracking-wider mb-1">Verified Trade Outcomes</p>
            <h2 className="text-2xl sm:text-[28px] font-bold text-[#10243A]">
              Trusted by commercial ranchers and procurement leads across Africa
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                quote:
                  'Before MARIKETI we spent three days driving between districts to inspect steers that rarely matched phone descriptions. Having on-site weight samples and DVS references cut our sourcing cycle by 60%.',
                name: '🇿🇼 Tendai Moyo',
                role: 'Head of Livestock Procurement',
                org: 'Highveld Abattoir & Meat Supply, Harare',
              },
              {
                quote:
                  'East Africa’s Boran and Dorper trade moves huge volume, yet buyers struggled to verify ranch quality remotely. MARIKETI’s Laikipia field inspections connected our stud directly with Nairobi and cross-border feedlots.',
                name: '🇰🇪 Joseph Kipkorir',
                role: 'Managing Rancher',
                org: 'Rift Valley Boran Ranches, Nanyuki',
              },
              {
                quote:
                  'Integrating our Arusha and Namanga corridor trade with verified ear-tag counts, TVLA clearance logs, and PIN-verified haulage removed informal broker friction on every consignment.',
                name: '🇹🇿 Baraka Mollel',
                role: 'Commercial Livestock Director',
                org: 'Serengeti Plains Livestock Co., Arusha',
              },
            ].map((t) => (
              <blockquote
                key={t.name}
                className="bg-[#F7F9FC] border border-[#DFE6EE] rounded-xl p-5 flex flex-col justify-between"
              >
                <p className="text-[13px] text-[#0F1B2A] leading-relaxed prose-justify">“{t.quote}”</p>
                <footer className="mt-4 pt-3.5 border-t border-[#DFE6EE]">
                  <p className="text-sm font-bold text-[#10243A]">{t.name}</p>
                  <p className="text-xs text-[#526071] mt-0.5">
                    {t.role} · {t.org}
                  </p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-[960px] mx-auto px-4 sm:px-6 py-10 lg:py-12">
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#1E547A] uppercase tracking-wider mb-1">Common Questions</p>
          <h2 className="text-2xl sm:text-[28px] font-bold text-[#10243A]">
            Frequently asked questions
          </h2>
        </div>

        <div className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.03)] divide-y divide-[#DFE6EE] overflow-hidden">
          {FAQS.map((item, idx) => {
            const expanded = openFaq === idx;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(expanded ? -1 : idx)}
                  aria-expanded={expanded}
                  className={cn(
                    'w-full px-5 py-4 flex items-center justify-between gap-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#F28C28]',
                    expanded ? 'bg-[#F7F9FC]' : 'hover:bg-[#F7F9FC]/70'
                  )}
                >
                  <span className="text-sm font-semibold text-[#10243A]">{item.q}</span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-[#526071] shrink-0 transition-transform duration-150',
                      expanded && 'rotate-180 text-[#10243A]'
                    )}
                  />
                </button>
                {expanded && (
                  <div className="px-5 pb-4 pt-1 bg-[#F7F9FC] text-[13px] text-[#526071] leading-relaxed prose-justify">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
