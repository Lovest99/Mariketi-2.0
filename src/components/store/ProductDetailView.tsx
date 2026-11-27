import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingCart,
  Star,
} from 'lucide-react';
import { ASSET_IMAGES, cn, formatUSD } from '../../lib/utils';
import type { AgriProduct, AgriProductCategory } from '../../types/mariketi';
import { Button, Card, SafeImage } from '../ui/DesignSystem';

interface ProductDetailViewProps {
  product: AgriProduct;
  relatedProducts: AgriProduct[];
  hasActiveSub: boolean;
  inCartQty: number;
  onBack: () => void;
  onAddToCart: (productId: string, qty: number) => void;
  onBuyNow: (productId: string, qty: number) => void;
  onSelectProduct: (productId: string) => void;
  onViewPlans: () => void;
}

type DetailTab = 'specs' | 'usage' | 'delivery';

const CATEGORY_METADATA: Record<
  AgriProductCategory,
  {
    storage: string;
    shelfLife: string;
    species: string;
    usageSteps: string[];
    deliveryNote: string;
  }
> = {
  'Veterinary & Vaccines': {
    storage: '2°C – 8°C Cold-Chain Insulated Pack',
    shelfLife: '18 months (batch serial tracked)',
    species: 'Cattle, Goats & Sheep',
    usageSteps: [
      'Maintain cold-chain gel packs until immediately before kraal administration.',
      'Use calibrated sterile dosing needle/drencher and record batch number on your herd passport.',
      'Observe standard withdrawal window before slaughter or live-auction movement clearance.',
    ],
    deliveryNote:
      'Dispatched in temperature-monitored insulated boxes via MARIKETI Regional Hubs (same-day pickup or 24–48h courier).',
  },
  'Traceability & Ear Tags': {
    storage: 'Dry cool storage away from UV heat',
    shelfLife: '10-year transponder durability',
    species: 'Commercial & Stud Cattle, Goats, Sheep',
    usageSteps: [
      'Disinfect applicator pin and tag stud prior to tagging in the middle third of the ear.',
      'Scan each RFID transponder into your MARIKETI Seller Workspace to link animal IDs.',
      'Field Agents verify linked RFID series directly during on-farm pre-auction inspections.',
    ],
    deliveryNote:
      'Pre-encoded with your farm registry prefix and shipped continent-wide within 2–4 business days.',
  },
  'Nutrition & Minerals': {
    storage: 'Elevated dry pallet under roof cover',
    shelfLife: '24 months sealed',
    species: 'Beef Cattle, Dairy, Boer & Dorper Flocks',
    usageSteps: [
      'Place blocks or troughs near primary water points with unrestricted clean water access.',
      'Allow gradual 7-day adaptation period for cattle transitioning from dry winter grazing.',
      'Target 120–180g daily intake per adult beast (25–40g for small stock).',
    ],
    deliveryNote:
      'Bulk pallet pickup at Harare, Bulawayo, Gwanda, Masvingo, and regional East/Southern Africa hubs.',
  },
  'Ranch Equipment': {
    storage: 'Indoor dry shed after wash-down',
    shelfLife: '2-year commercial farm warranty',
    species: 'All Commercial Livestock Operations',
    usageSteps: [
      'Inspect calibration and battery/solar charge before crush sessions or gate dosing.',
      'Rinse galvanised hardware clean after kraal use to protect sensors and fittings.',
      'Export liveweight logs directly into MARIKETI listings and auction catalog weights.',
    ],
    deliveryNote:
      'Tracked commercial freight courier directly to farm gate or nearest MARIKETI Collection Centre.',
  },
};

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  relatedProducts,
  hasActiveSub,
  inCartQty,
  onBack,
  onAddToCart,
  onBuyNow,
  onSelectProduct,
  onViewPlans,
}) => {
  const [qty, setQty] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<DetailTab>('specs');
  const [activeImgIdx, setActiveImgIdx] = useState<number>(0);

  const meta = CATEGORY_METADATA[product.category];
  const discountPct =
    product.subscriptionEligible && product.subscriptionDiscountPct
      ? product.subscriptionDiscountPct
      : 0;
  const memberUnitPrice = discountPct
    ? Math.round(product.priceUsd * (1 - discountPct / 100))
    : product.priceUsd;
  const activeUnitPrice = hasActiveSub ? memberUnitPrice : product.priceUsd;
  const lineTotal = activeUnitPrice * qty;
  const potentialSavingsPerUnit = product.priceUsd - memberUnitPrice;

  const gallery = useMemo(() => {
    const extras =
      product.category === 'Ranch Equipment'
        ? [ASSET_IMAGES.auctionRing, ASSET_IMAGES.fieldAgent]
        : product.category === 'Nutrition & Minerals'
        ? [ASSET_IMAGES.heroCattle, ASSET_IMAGES.boerGoats]
        : [ASSET_IMAGES.agriVetSupplies, ASSET_IMAGES.fieldAgent];
    return Array.from(new Set([product.image, ...extras])).slice(0, 3);
  }, [product.image, product.category]);

  return (
    <div className="space-y-6">
      {/* Compact Single-Row Back & SKU Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10243A] hover:text-[#1A4D73] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </button>
        <span className="font-mono text-xs text-[#526071] tabular-nums">
          {product.sku}
        </span>
      </div>

      {/* Main Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 7 COLS: Gallery + Tabbed Technical Details */}
        <div className="lg:col-span-7 space-y-5 min-w-0">
          <Card className="overflow-hidden">
            <div className="aspect-[16/10] bg-[#071320] overflow-hidden">
              <SafeImage
                src={gallery[activeImgIdx] || product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {gallery.length > 1 && (
              <div className="p-3 bg-[#F7F9FC] border-t border-[#DCE4EC] grid grid-cols-3 gap-2.5 max-w-xs">
                {gallery.map((img, idx) => (
                  <button
                    key={img + idx}
                    type="button"
                    onClick={() => setActiveImgIdx(idx)}
                    className={cn(
                      'aspect-[4/3] rounded-md overflow-hidden border-2 transition-all',
                      activeImgIdx === idx
                        ? 'border-[#F28C28]'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    )}
                  >
                    <SafeImage
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Zero-Scroll 3-Tab Product Information Module */}
          <Card className="overflow-hidden">
            <div className="p-2 bg-[#F7F9FC] border-b border-[#DCE4EC]">
              <div
                role="tablist"
                aria-label="Product details"
                className="grid grid-cols-3 rounded-lg bg-[#EEF3F8] p-1 border border-[#DCE4EC]"
              >
                {(
                  [
                    { id: 'specs', label: 'Specs' },
                    { id: 'usage', label: 'Usage & Care' },
                    { id: 'delivery', label: 'Delivery' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      'py-2 rounded-md text-xs font-semibold transition-colors',
                      activeTab === t.id
                        ? 'bg-[#10243A] text-white'
                        : 'text-[#526071] hover:text-[#10243A]'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {activeTab === 'specs' && (
                <div className="space-y-4">
                  <p className="text-sm text-[#0F1B2A] leading-relaxed">
                    {product.description}
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#DCE4EC] text-xs">
                    {[
                      ['Brand', product.brand],
                      ['Pack Size', product.unitLabel],
                      ['Category', product.category],
                      ['Target Species', meta.species],
                      ['Storage', meta.storage],
                      ['Shelf Life / Warranty', meta.shelfLife],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="p-2.5 rounded-lg bg-[#F7F9FC] border border-[#DCE4EC]"
                      >
                        <p className="text-[11px] text-[#526071]">{label}</p>
                        <p className="font-semibold text-[#10243A] mt-0.5 leading-snug">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'usage' && (
                <ol className="space-y-3 text-xs sm:text-sm text-[#526071] leading-relaxed">
                  {meta.usageSteps.map((step, i) => (
                    <li key={step} className="flex items-start gap-2.5">
                      <span className="font-mono text-xs font-bold text-[#10243A] bg-[#EEF3F8] rounded h-6 w-6 flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}

              {activeTab === 'delivery' && (
                <div className="space-y-3 text-xs sm:text-sm text-[#526071] leading-relaxed">
                  <p className="text-[#0F1B2A] font-medium">{meta.deliveryNote}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-[#F7F9FC] border border-[#DCE4EC]">
                      <p className="text-xs font-bold text-[#10243A]">Coverage</p>
                      <p className="text-xs text-[#526071] mt-0.5">
                        {product.countryAvailability}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F7F9FC] border border-[#DCE4EC]">
                      <p className="text-xs font-bold text-[#10243A]">Collection Hub Pickup</p>
                      <p className="text-xs text-[#526071] mt-0.5">
                        Zero freight fee at MARIKETI Sale Yards
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT 5 COLS: Sticky Buy Box */}
        <aside className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          <Card className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#1A4D73]">{product.category}</span>
                {product.vetApproved && (
                  <span className="font-semibold text-[#156B45] inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Vet Approved
                  </span>
                )}
              </div>

              <h1 className="mt-1.5 text-xl sm:text-2xl font-bold text-[#10243A] leading-snug">
                {product.name}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#526071]">
                <span>{product.brand}</span>
                <span>·</span>
                <span>{product.unitLabel}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#10243A]">
                  <Star className="w-3.5 h-3.5 fill-[#F28C28] text-[#F28C28]" />
                  4.9
                </span>
              </div>
            </div>

            {/* Pricing Row */}
            <div className="pt-3.5 border-t border-[#DCE4EC]">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-extrabold text-[#10243A] tabular-nums">
                    {formatUSD(activeUnitPrice)}
                  </span>
                  {hasActiveSub && discountPct > 0 && (
                    <span className="font-mono text-sm text-[#526071] line-through tabular-nums">
                      {formatUSD(product.priceUsd)}
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs font-semibold text-[#156B45] tabular-nums">
                  {product.stockQty} in stock
                </span>
              </div>
              {discountPct > 0 && (
                <p className="mt-1 text-xs font-semibold text-[#156B45]">
                  {hasActiveSub
                    ? `Member discount applied (${discountPct}% off)`
                    : `Members pay ${formatUSD(memberUnitPrice)} (save ${formatUSD(potentialSavingsPerUnit)}/unit)`}
                </p>
              )}
            </div>

            {/* Quantity & Herd Pack Selector */}
            <div className="space-y-2.5 pt-3 border-t border-[#DCE4EC]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#10243A]">Quantity</span>
                <div className="inline-flex items-center gap-1">
                  {[1, 3, 5, 10].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQty(preset)}
                      className={cn(
                        'px-2 py-1 rounded text-[11px] font-mono font-semibold border transition-colors',
                        qty === preset
                          ? 'bg-[#10243A] text-white border-[#10243A]'
                          : 'bg-[#F7F9FC] text-[#10243A] border-[#CFD9E3] hover:bg-[#EEF3F8]'
                      )}
                    >
                      {preset}×
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-lg border border-[#CFD9E3] bg-white overflow-hidden">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="h-10 w-10 flex items-center justify-center text-[#10243A] hover:bg-[#F3F6F9]"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-mono text-sm font-bold text-[#10243A] tabular-nums">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQty((q) => Math.min(99, q + 1))}
                    className="h-10 w-10 flex items-center justify-center text-[#10243A] hover:bg-[#F3F6F9]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-[#526071]">Subtotal</p>
                  <p className="font-mono text-lg font-extrabold text-[#10243A] tabular-nums">
                    {formatUSD(lineTotal)}
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="space-y-2.5 pt-2">
              <Button
                variant="accent"
                size="lg"
                className="w-full"
                onClick={() => onBuyNow(product.id, qty)}
              >
                Buy Now · {formatUSD(lineTotal)}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => onAddToCart(product.id, qty)}
              >
                <ShoppingCart className="w-4 h-4" />
                {inCartQty > 0
                  ? `Add ${qty} More (${inCartQty} in cart)`
                  : `Add ${qty} to Cart`}
              </Button>
            </div>

            {/* Subscription Savings Callout */}
            {!hasActiveSub && discountPct > 0 && (
              <div className="rounded-lg bg-[#F7F9FC] border border-[#DCE4EC] p-3 flex items-center justify-between gap-2 text-xs">
                <span className="text-[#526071]">
                  Save <strong className="text-[#156B45]">{discountPct}%</strong> with a MARIKETI Plan
                </span>
                <button
                  type="button"
                  onClick={onViewPlans}
                  className="font-semibold text-[#10243A] hover:text-[#1A4D73] inline-flex items-center gap-1 shrink-0"
                >
                  Plans
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </Card>
        </aside>
      </div>

      {/* Related Supplies */}
      {relatedProducts.length > 0 && (
        <section className="pt-6 border-t border-[#DCE4EC]">
          <h2 className="text-base sm:text-lg font-bold text-[#10243A] mb-4">
            Related Agri-Vet Supplies
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedProducts.map((rel) => (
              <button
                key={rel.id}
                type="button"
                onClick={() => {
                  setQty(1);
                  setActiveImgIdx(0);
                  onSelectProduct(rel.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-left bg-white border border-[#DCE4EC] hover:border-[#10243A]/35 rounded-xl overflow-hidden flex flex-col transition-colors focus-visible:outline-2 focus-visible:outline-[#F28C28]"
              >
                <div className="aspect-[16/10] w-full bg-[#071320] overflow-hidden">
                  <SafeImage
                    src={rel.image}
                    alt={rel.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3.5 flex-1 w-full flex flex-col justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold text-[#1A4D73] truncate">
                      {rel.category}
                    </p>
                    <h3 className="mt-0.5 text-sm font-bold text-[#10243A] line-clamp-2">
                      {rel.name}
                    </h3>
                  </div>
                  <div className="flex items-baseline justify-between pt-2 border-t border-[#DCE4EC]">
                    <span className="font-mono text-base font-extrabold text-[#10243A] tabular-nums">
                      {formatUSD(rel.priceUsd)}
                    </span>
                    <span className="text-xs font-semibold text-[#1A4D73]">View →</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
