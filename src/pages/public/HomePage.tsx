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
import { ASSET_IMAGES, cn } from '../../lib/utils';
import type { LivestockCategory } from '../../types/mariketi';
import { ListingCard } from '../../components/shared/ListingCard';
import { Button, SafeImage } from '../../components/ui/DesignSystem';

interface HomePageProps {
  onSearchMarketplace: (query: string, category?: LivestockCategory) => void;
}

const CATEGORIES: {
  name: LivestockCategory;
  subtitle: string;
  image: string;
}[] = [
  { name: 'Cattle', subtitle: 'Brahman, Boran, Mashona, Tuli', image: ASSET_IMAGES.brahmanBull },
  { name: 'Goats', subtitle: 'Boer, Kalahari Red, Matabele', image: ASSET_IMAGES.boerGoats },
  { name: 'Sheep', subtitle: 'Dorper, Sabi Heritage', image: ASSET_IMAGES.dorperSheep },
  { name: 'Pigs', subtitle: 'Large White, Landrace Baconers', image: ASSET_IMAGES.largeWhitePigs },
  { name: 'Poultry', subtitle: 'Sasso, Ross 308 Commercial Flocks', image: ASSET_IMAGES.poultryBroilers },
  { name: 'Other livestock', subtitle: 'Stud & Heritage Breeds', image: ASSET_IMAGES.heroCattle },
];

const JOURNEY_STEPS = [
  {
    num: '01',
    title: 'Discover',
    body: 'Filter verified cattle, goats, sheep, pigs, and poultry across all 10 Zimbabwean provinces by breed, weight, and age.',
  },
  {
    num: '02',
    title: 'Verify',
    body: 'Accredited field agents inspect animals on-farm with GPS timestamps, ear-tag counts, live weight sampling, and DVS clearance checks.',
  },
  {
    num: '03',
    title: 'Negotiate',
    body: 'Submit structured offers and counter-offers with an immutable timestamped commercial trail between buyer and farmer.',
  },
  {
    num: '04',
    title: 'Transact',
    body: 'Convert accepted offers into documented transactions with veterinary permits, police stock clearance, and transparent milestones.',
  },
  {
    num: '05',
    title: 'Handover',
    body: 'Coordinate pen check-in at regional Collection Centres and dispatch accredited livestock haulers with PIN-verified proof of delivery.',
  },
  {
    num: '06',
    title: 'Complete & Review',
    body: 'Confirm condition upon arrival, finalize handover documentation, and rate verified trade partners to strengthen market trust.',
  },
];

const FAQS = [
  {
    q: 'How does MARIKETI verify livestock before buyers travel or commit?',
    a: 'An accredited MARIKETI Field Agent visits the farm or collection kraal in person, confirms breed, headcount, average live weight, ear-tag ranges, and veterinary movement documentation, and uploads GPS-stamped photographs directly to the listing.',
  },
  {
    q: 'Can smallholder farmers and rural agents use MARIKETI with weak mobile signal?',
    a: 'Yes. Our Field Agent operations app runs offline-first with IndexedDB local persistence, allowing inspectors to capture photos, GPS coordinates, and checklists in rural districts and automatically sync once connectivity returns.',
  },
  {
    q: 'Does MARIKETI handle live bank payments or escrow in this version?',
    a: 'This release transparently separates simulated demo payment states from live payment rails. Payment milestones are tracked in demo mode so commercial teams can test negotiation, collection, and handover workflows end to end.',
  },
  {
    q: 'How are transport and regional collection centres coordinated?',
    a: 'Once an offer converts into a transaction, regional Collection Centres receive expected intake manifests and accredited Transport Partners can accept corridor haulage jobs with PIN-verified proof of delivery.',
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
  const [heroCategory, setHeroCategory] = useState<string>('');
  const [openFaq, setOpenFaq] = useState<number>(0);

  const featuredListings = listings
    .filter((l) => l.status === 'active')
    .slice(0, 6);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchMarketplace(
      heroQuery,
      (heroCategory as LivestockCategory) || undefined
    );
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-[#091827] text-white overflow-hidden">
        <div className="absolute inset-0">
          <SafeImage
            src={ASSET_IMAGES.heroCattle}
            alt="Commercial Brahman and Boran cattle herd grazing in Matabeleland South, Zimbabwe"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#091827]/92 via-[#091827]/72 to-[#091827]/30" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-10 sm:py-14 lg:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#F28C28] tracking-wide mb-2.5">
              Verified Livestock Marketplace · Zimbabwe & Southern Africa
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-extrabold leading-[1.08] tracking-tight text-white">
              The smarter way to buy and sell livestock.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/85 leading-relaxed max-w-xl prose-justify">
              Discover verified livestock, connect with trusted farmers and buyers, and move from negotiation to handover with greater confidence.
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
                variant="secondary"
                size="lg"
                className="bg-white/10 text-white border-white/25 hover:bg-white/20 hover:border-white/40"
                onClick={() => openAuth('register', 'seller')}
              >
                Sell Livestock
              </Button>
            </div>
          </div>

          {/* Prominent Livestock Search Bar */}
          <form
            onSubmit={handleHeroSearch}
            className="mt-8 bg-white rounded-lg p-2 border border-[#E5E9ED] max-w-4xl grid grid-cols-1 sm:grid-cols-12 gap-2 text-[#17212B]"
          >
            <div className="sm:col-span-6 relative flex items-center min-w-0">
              <Search className="w-4 h-4 text-[#697784] absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
                placeholder="Search breed, district, seller, or ref (e.g. Brahman, Gwanda)..."
                className="w-full h-10 pl-9 pr-3 text-sm bg-transparent focus:outline-none placeholder:text-[#697784] min-w-0"
              />
            </div>
            <div className="sm:col-span-3 pt-1 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[#E5E9ED] min-w-0">
              <select
                aria-label="Livestock category"
                value={heroCategory}
                onChange={(e) => setHeroCategory(e.target.value)}
                className="w-full h-10 px-2.5 text-sm bg-transparent text-[#17212B] focus:outline-none"
              >
                <option value="">All Livestock</option>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" variant="primary" size="md" className="w-full">
                Search Lots
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Trust & Verification Strip (Full-width row immediately below hero) */}
      <section className="bg-white border-b border-[#E5E9ED]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 lg:gap-x-0 lg:divide-x lg:divide-[#E5E9ED]">
          <div className="lg:pr-6">
            <p className="font-mono text-xl sm:text-2xl font-bold text-[#10243A] tabular-nums">1,420+</p>
            <p className="text-xs text-[#697784] mt-0.5 leading-snug">Head physically verified across Zimbabwe in 2026</p>
          </div>
          <div className="lg:px-6">
            <p className="font-mono text-xl sm:text-2xl font-bold text-[#10243A] tabular-nums">10 Provinces</p>
            <p className="text-xs text-[#697784] mt-0.5 leading-snug">Active ranchers from Matabeleland to Mashonaland</p>
          </div>
          <div className="lg:px-6">
            <p className="font-mono text-xl sm:text-2xl font-bold text-[#10243A] tabular-nums">100% Traced</p>
            <p className="text-xs text-[#697784] mt-0.5 leading-snug">Ear-tag ranges, DVS clearance & handover PIN logs</p>
          </div>
          <div className="lg:pl-6">
            <p className="font-mono text-xl sm:text-2xl font-bold text-[#10243A] tabular-nums">6 Roles</p>
            <p className="text-xs text-[#697784] mt-0.5 leading-snug">Unified buyer, seller, agent, hub & transport network</p>
          </div>
        </div>
      </section>

      {/* Featured Verified Livestock */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 lg:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-semibold text-[#245B83] mb-1">Active Commercial Lots</p>
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
      <section className="bg-white border-y border-[#E5E9ED] py-10 lg:py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#245B83] mb-1">Species Taxonomy</p>
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
                  className="group text-left bg-[#FAFAF7] border border-[#E5E9ED] rounded-lg overflow-hidden hover:border-[#10243A] transition-colors"
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
                    <p className="text-[11px] text-[#697784] mt-0.5 line-clamp-1">{cat.subtitle}</p>
                    <p className="text-[11px] font-mono text-[#245B83] mt-1.5 tabular-nums">
                      {count} active {count === 1 ? 'lot' : 'lots'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* How MARIKETI Works */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 lg:py-12">
        <div className="max-w-2xl mb-7">
          <p className="text-xs font-semibold text-[#245B83] mb-1">End-to-End Trade Architecture</p>
          <h2 className="text-2xl sm:text-[28px] font-bold text-[#10243A]">
            From farm inspection to verified handover
          </h2>
          <p className="mt-2 text-sm text-[#697784] leading-relaxed prose-justify">
            Traditional livestock trade relies on informal brokers, unverified weight estimates, and risky long-distance travel. MARIKETI structures every stage into a verifiable operational chain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {JOURNEY_STEPS.map((step) => (
            <div
              key={step.num}
              className="bg-white border border-[#E5E9ED] rounded-lg p-5"
            >
              <span className="font-mono text-xs font-semibold text-[#C96A0F]">{step.num}.</span>
              <h3 className="text-[15px] font-bold text-[#10243A] mt-1.5">{step.title}</h3>
              <p className="text-[13px] text-[#697784] mt-1.5 leading-relaxed prose-justify">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Verification Matters (Balanced 2-column editorial split) */}
      <section className="bg-[#10243A] text-white py-10 lg:py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 rounded-lg overflow-hidden border border-white/15 min-h-[260px] lg:min-h-[300px]">
              <SafeImage
                src={ASSET_IMAGES.fieldAgent}
                alt="MARIKETI accredited field agent inspecting ear-tagged Brahman cattle in Zimbabwe"
                className="w-full h-full lg:h-full object-cover"
              />
            </div>

            <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
              <div>
                <p className="text-xs font-semibold text-[#F28C28] mb-1.5">
                  Physical Field Verification
                </p>
                <h2 className="text-2xl sm:text-[28px] font-bold text-white leading-tight">
                  Every verified listing is backed by boots on the ground.
                </h2>
                <p className="mt-2.5 text-sm text-white/80 leading-relaxed prose-justify">
                  Before commercial buyers commit capital or dispatch haulage trucks, MARIKETI Field Agents physically inspect herds in Matabeleland, Midlands, Masvingo, and Mashonaland — even in low-connectivity districts using our offline mobile app.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/15 text-sm">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#F28C28] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Physical Headcount & Ear Tags</p>
                    <p className="text-xs text-white/65 mt-0.5">Tag ranges recorded and matched to owner dipping cards.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#F28C28] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">GPS & Time-Stamped Proof</p>
                    <p className="text-xs text-white/65 mt-0.5">Exact farm coordinates logged at point of inspection.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <FileCheck2 className="w-4 h-4 text-[#F28C28] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Veterinary Clearance Review</p>
                    <p className="text-xs text-white/65 mt-0.5">DVS movement readiness and vaccination logs checked.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Truck className="w-4 h-4 text-[#F28C28] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Collection Hub Continuity</p>
                    <p className="text-xs text-white/65 mt-0.5">Weighbridge intake and PIN-verified delivery release.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="accent" size="md" onClick={() => navigatePublic('verification')}>
                  Read Verification Standard
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  className="bg-transparent text-white border-white/25 hover:bg-white/10"
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
          <div className="bg-white border border-[#E5E9ED] rounded-lg p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-[#245B83] mb-1">For Farmers & Commercial Ranches</p>
              <h3 className="text-xl font-bold text-[#10243A]">
                Reach verified commercial buyers without middlemen eroding margins.
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#17212B]">
                {[
                  'Guided 7-step listing workflow with draft saving and clear pricing in USD.',
                  'Independent field verification boosts buyer confidence and speeds up serious offers.',
                  'Full immutable counter-offer history so you never lose track of negotiated terms.',
                  'Seamless scheduling into regional Collection Centres and accredited haulage.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#21865B] mt-0.5 shrink-0" />
                    <span className="text-[13px] text-[#697784] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-5 pt-4 border-t border-[#E5E9ED] flex flex-wrap gap-2.5">
              <Button variant="primary" size="sm" onClick={() => openAuth('register', 'seller')}>
                Register as a Seller
              </Button>
              <Button variant="secondary" size="sm" onClick={() => loginAsRole('seller')}>
                Preview Seller Workspace
              </Button>
            </div>
          </div>

          <div className="bg-white border border-[#E5E9ED] rounded-lg p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-[#245B83] mb-1">For Abattoirs, Feedlots & Breeders</p>
              <h3 className="text-xl font-bold text-[#10243A]">
                Procure inspected herds nationwide with complete traceability.
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#17212B]">
                {[
                  'Compare up to three verified livestock lots side by side on weight, breed, and price.',
                  'Inspect GPS-stamped field verification reports and veterinary clearance refs upfront.',
                  'Track every order across 11 clear operational milestones from offer to handover.',
                  'Receive PIN-verified proof of delivery and rate sellers after completion.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#21865B] mt-0.5 shrink-0" />
                    <span className="text-[13px] text-[#697784] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-5 pt-4 border-t border-[#E5E9ED] flex flex-wrap gap-2.5">
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
      <section className="bg-white border-y border-[#E5E9ED] py-10 lg:py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#245B83] mb-1">Verified Trade Outcomes</p>
            <h2 className="text-2xl sm:text-[28px] font-bold text-[#10243A]">
              Trusted by commercial ranchers and procurement leads
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                quote:
                  'Before MARIKETI we spent three days driving between districts to inspect steers that rarely matched phone descriptions. Having Chiedza’s on-site weight sample and DVS reference cut our sourcing cycle by 60%.',
                name: 'Tendai Moyo',
                role: 'Head of Livestock Procurement',
                org: 'Highveld Abattoir & Meat Supply, Harare',
              },
              {
                quote:
                  'Listing our registered Brahman bulls and Boran cross steers directly to verified commercial feedlots lifted our realized price per kilogram while eliminating informal broker delays.',
                name: 'Nkosilathi Ndlovu',
                role: 'Managing Rancher',
                org: 'Umzingwane Valley Stud & Ranch, Gwanda',
              },
              {
                quote:
                  'Integrating our Gweru Collection Hub check-in manifests with accredited livestock haulers means every animal is weighed, watered, and signed off with an auditable handover code.',
                name: 'Tafadzwa Nyoni',
                role: 'Facility Operations Lead',
                org: 'Gweru Central Livestock Collection Hub, Midlands',
              },
            ].map((t) => (
              <blockquote
                key={t.name}
                className="bg-[#FAFAF7] border border-[#E5E9ED] rounded-lg p-5 flex flex-col justify-between"
              >
                <p className="text-[13px] text-[#17212B] leading-relaxed prose-justify">“{t.quote}”</p>
                <footer className="mt-4 pt-3.5 border-t border-[#E5E9ED]">
                  <p className="text-sm font-bold text-[#10243A]">{t.name}</p>
                  <p className="text-xs text-[#697784] mt-0.5">
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
          <p className="text-xs font-semibold text-[#245B83] mb-1">Common Questions</p>
          <h2 className="text-2xl sm:text-[28px] font-bold text-[#10243A]">
            Frequently asked questions
          </h2>
        </div>

        <div className="bg-white border border-[#E5E9ED] rounded-lg divide-y divide-[#E5E9ED]">
          {FAQS.map((item, idx) => {
            const expanded = openFaq === idx;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(expanded ? -1 : idx)}
                  aria-expanded={expanded}
                  className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-[#FAFAF7] transition-colors"
                >
                  <span className="text-sm font-semibold text-[#10243A]">{item.q}</span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-[#697784] shrink-0 transition-transform',
                      expanded && 'rotate-180'
                    )}
                  />
                </button>
                {expanded && (
                  <div className="px-5 pb-4 text-[13px] text-[#697784] leading-relaxed prose-justify">
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
