import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  FileCheck2,
  MapPin,
  MessageSquare,
  Share2,
  ShieldCheck,
  Star,
  ClipboardCheck,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import { cn, formatDate, formatDateTime, formatUSD, getCountry } from '../../lib/utils';
import { ListingCard } from '../../components/shared/ListingCard';
import {
  Button,
  Input,
  Modal,
  SafeImage,
  StatusLabel,
  Textarea,
} from '../../components/ui/DesignSystem';

export const ListingDetailPage: React.FC = () => {
  const {
    listings,
    reviews,
    selectedListingId,
    savedListingIds,
    compareListingIds,
    navigatePublic,
    toggleSaveListing,
    toggleCompareListing,
    submitOffer,
    requestInspectionForListing,
    startConversation,
    pushToast,
    loginAsRole,
    currentUser,
  } = useMariketi();

  const listing =
    listings.find((l) => l.id === selectedListingId) || listings[0];
  const countryMeta = getCountry(listing.country);

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const [offerQty, setOfferQty] = useState(String(listing.quantity));
  const [offerPricePerHead, setOfferPricePerHead] = useState(
    String(Math.round(listing.priceUsd * 0.96))
  );
  const [offerNote, setOfferNote] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  useEffect(() => {
    setActivePhotoIdx(0);
    setOfferQty(String(listing.quantity));
    setOfferPricePerHead(String(Math.round(listing.priceUsd * 0.96)));
    setOfferNote('');
  }, [listing.id, listing.quantity, listing.priceUsd]);

  const isSaved = savedListingIds.includes(listing.id);
  const sellerReviews = reviews.filter((r) => r.sellerId === listing.sellerId);
  const similarListings = listings
    .filter(
      (l) =>
        l.id !== listing.id &&
        l.status === 'active' &&
        (l.category === listing.category || l.country === listing.country)
    )
    .slice(0, 3);

  const totalAsking = listing.priceUsd * listing.quantity;
  const proposedTotal = Number(offerQty || 0) * Number(offerPricePerHead || 0);

  const handleMakeOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Math.max(1, Math.min(listing.quantity, Number(offerQty)));
    const total = Math.max(1, Number(offerPricePerHead) * qty);
    submitOffer(listing.id, total, qty, offerNote);
    setOfferModalOpen(false);
    setOfferNote('');
  };

  const handleContactSeller = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMsg.trim()) return;
    startConversation(
      listing.title,
      'Listing',
      listing.reference,
      { id: listing.sellerId, name: listing.sellerName, role: 'seller' },
      contactMsg.trim()
    );
    setContactModalOpen(false);
    setContactMsg('');
  };

  const handleShare = () => {
    const shareText = `${listing.title} (${listing.reference}) · ${countryMeta.flag} ${listing.country} — ${formatUSD(listing.priceUsd)} ${listing.priceUnit} on MARIKETI`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).catch(() => {});
    }
    pushToast('Listing summary copied', 'info', listing.reference);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-10">
      {/* Breadcrumb & Back */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <button
          type="button"
          onClick={() => navigatePublic('marketplace')}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#526071] hover:text-[#10243A] transition-colors focus-visible:outline-2 focus-visible:outline-[#F28C28] rounded"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
          Back to Marketplace
        </button>
        <div className="text-xs font-mono text-[#526071]">
          {listing.reference} · Listed {formatDate(listing.listedAt)} · {listing.views} views
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Gallery, Specs, Verification Report, Seller Profile */}
        <div className="lg:col-span-8 space-y-5 min-w-0">
          {/* Image Gallery */}
          <div className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] overflow-hidden">
            <div className="aspect-[16/10] bg-[#10243A]">
              <SafeImage
                src={listing.images[activePhotoIdx] || listing.images[0]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            </div>
            {listing.images.length > 1 && (
              <div className="p-3 bg-[#F7F9FC] border-t border-[#DFE6EE] flex items-center gap-2.5 overflow-x-auto">
                {listing.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIdx(idx)}
                    className={cn(
                      'w-20 aspect-[4/3] rounded-lg overflow-hidden border-2 shrink-0 transition-all duration-150',
                      activePhotoIdx === idx
                        ? 'border-[#F28C28] ring-2 ring-[#F28C28]/25'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    )}
                  >
                    <SafeImage src={img} alt={`${listing.title} view ${idx + 1}`} className="w-full h-full" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Description */}
          <div className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-medium text-[#526071]">
                <span>{listing.category}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>{listing.breed}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>
                  {countryMeta.flag} {listing.district}, {listing.province}, {listing.country}
                </span>
              </div>
              <StatusLabel
                tone={listing.verificationStatus === 'Verified' ? 'success' : 'warning'}
                label={listing.verificationStatus}
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#10243A]">
              {listing.title}
            </h1>
            <p className="text-sm text-[#0F1B2A] leading-relaxed prose-justify">{listing.description}</p>

            {/* Specifications Grid */}
            <div className="pt-3.5 border-t border-[#DFE6EE] grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 tabular-nums">
              {[
                ['Breed', listing.breed],
                ['Age', listing.ageLabel],
                ['Gender / Group', listing.gender],
                ['Avg Live Weight', `${listing.weightKg} kg`],
                ['Available Quantity', `${listing.quantity} head`],
                ['Farm Location', `${countryMeta.flag} ${listing.district}, ${listing.country}`],
              ].map(([k, v]) => (
                <div key={k} className="p-2.5 sm:p-3 rounded-lg bg-[#F7F9FC] border border-[#DFE6EE] min-w-0">
                  <p className="text-[11px] font-medium text-[#526071] truncate">{k}</p>
                  <p className="text-[13px] font-semibold text-[#10243A] mt-0.5 truncate">{v}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
              <div>
                <p className="font-semibold text-[#10243A]">Vaccination & Health Protocol</p>
                <p className="text-[#526071] mt-1 leading-relaxed prose-justify">{listing.vaccinationSummary}</p>
              </div>
              <div>
                <p className="font-semibold text-[#10243A]">Pasture & Feeding Regime</p>
                <p className="text-[#526071] mt-1 leading-relaxed prose-justify">{listing.feedingRegime}</p>
              </div>
            </div>
          </div>

          {/* Field Verification Report */}
          <div className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#DFE6EE]">
              <div>
                <h2 className="text-lg font-bold text-[#10243A]">
                  On-Site Field Verification Report
                </h2>
                <p className="text-xs text-[#526071] mt-0.5">
                  Independent physical inspection conducted by MARIKETI Field Operations ({countryMeta.region}).
                </p>
              </div>
              <StatusLabel
                tone={listing.verificationReport ? 'success' : 'warning'}
                label={listing.verificationReport ? 'Inspection Approved' : listing.verificationStatus}
              />
            </div>

            {listing.verificationReport ? (
              <div className="pt-5 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs tabular-nums">
                  <div>
                    <p className="text-[#526071]">Inspector</p>
                    <p className="font-semibold text-[#10243A] mt-0.5">
                      {listing.verificationReport.agentName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#526071]">Inspection Date</p>
                    <p className="font-mono text-[#10243A] mt-0.5">
                      {formatDate(listing.verificationReport.inspectedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#526071]">Ear Tag Range</p>
                    <p className="font-mono text-[#10243A] mt-0.5">
                      {listing.verificationReport.earTagRange}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#526071]">Vet Clearance ({countryMeta.vetAuthority})</p>
                    <p className="font-mono text-[#1A7A50] font-semibold mt-0.5">
                      {listing.verificationReport.vetClearanceRef}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F7F9FC] border border-[#DFE6EE] text-xs space-y-1.5">
                  <p className="font-semibold text-[#10243A] inline-flex flex-wrap items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-[#1A7A50] shrink-0" />
                    <span>Health Score: {listing.verificationReport.healthScore} · GPS:</span>{' '}
                    <span className="font-mono">{listing.verificationReport.gpsCoordinates}</span>
                  </p>
                  <p className="text-[#526071] leading-relaxed prose-justify">
                    {listing.verificationReport.notes}
                  </p>
                </div>

                {listing.verificationReport.photos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#10243A] mb-2">
                      Inspection Evidence Photographs
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {listing.verificationReport.photos.map((photo, idx) => (
                        <div key={idx} className="aspect-[4/3] rounded-lg overflow-hidden border border-[#DFE6EE]">
                          <SafeImage
                            src={photo}
                            alt={`Field inspection evidence ${idx + 1}`}
                            className="w-full h-full"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-sm text-[#526071] leading-relaxed">
                  This lot has not yet completed physical field inspection. You can dispatch an accredited MARIKETI Field Agent to verify headcount, weights, and veterinary papers before committing.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => requestInspectionForListing(listing.id)}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Request Field Inspection
                </Button>
              </div>
            )}
          </div>

          {/* Seller Profile & Verified Reviews */}
          <div className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#DFE6EE]">
              <div>
                <p className="text-xs font-medium text-[#526071]">Verified Farm / Seller</p>
                <h2 className="text-base sm:text-lg font-bold text-[#10243A] mt-0.5">
                  {listing.farmName}
                </h2>
                <p className="text-xs text-[#526071] mt-0.5">
                  Managed by {listing.sellerName} · {countryMeta.flag} {listing.district}, {listing.province}, {listing.country}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-lg font-bold font-mono text-[#10243A] inline-flex items-center gap-1 tabular-nums">
                  <Star className="w-4 h-4 fill-[#F28C28] text-[#F28C28]" />
                  {listing.sellerRating.toFixed(1)}
                </p>
                <p className="text-xs text-[#526071]">
                  {sellerReviews.length} verified trade reviews
                </p>
              </div>
            </div>

            {sellerReviews.length > 0 ? (
              <div className="space-y-3">
                {sellerReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-lg bg-[#F7F9FC] border border-[#DFE6EE] space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#10243A]">
                        {rev.buyerName} · <span className="font-mono text-[#526071]">{rev.transactionRef}</span>
                      </span>
                      <span className="font-mono font-semibold text-[#10243A]">
                        {rev.rating.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <p className="text-xs text-[#526071] leading-relaxed prose-justify">{rev.comment}</p>
                    <p className="text-[11px] text-[#526071]">{formatDateTime(rev.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#526071]">No completed buyer reviews logged yet.</p>
            )}
          </div>
        </div>

        {/* Right: Sticky Purchase / Offer Module */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          <div className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_4px_18px_rgba(16,36,58,0.06)] p-5 space-y-4">
            <div className="pb-3.5 border-b border-[#DFE6EE]">
              <p className="text-xs font-medium text-[#526071]">Asking Price</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#10243A]">
                  {formatUSD(listing.priceUsd)}
                </span>
                <span className="text-xs text-[#526071]">{listing.priceUnit}</span>
              </div>
              <p className="text-xs text-[#526071] mt-1.5 tabular-nums">
                Full lot ({listing.quantity} head):{' '}
                <strong className="font-mono text-[#10243A]">{formatUSD(totalAsking)}</strong>
              </p>
            </div>

            <div className="space-y-2 text-xs text-[#526071]">
              <div className="flex items-center justify-between">
                <span>Availability</span>
                <span className="font-semibold text-[#1A7A50]">
                  Available ({listing.quantity} head)
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Origin</span>
                <span className="font-medium text-[#10243A] inline-flex items-center gap-1 text-right">
                  <MapPin className="w-3.5 h-3.5 text-[#526071] shrink-0" />
                  {countryMeta.flag} {listing.district}, {listing.country}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Inspection Status</span>
                <span className="font-semibold text-[#10243A]">{listing.verificationStatus}</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <Button
                variant="accent"
                size="lg"
                className="w-full"
                onClick={() => setOfferModalOpen(true)}
              >
                Make an Offer
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => setContactModalOpen(true)}
              >
                <MessageSquare className="w-4 h-4" />
                Contact Seller
              </Button>
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => requestInspectionForListing(listing.id)}
              >
                <ShieldCheck className="w-4 h-4" />
                Request Fresh Inspection
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#DFE6EE]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toggleSaveListing(listing.id)}
              >
                <Bookmark
                  className={cn(
                    'w-3.5 h-3.5',
                    isSaved && 'fill-[#F28C28] text-[#F28C28]'
                  )}
                />
                {isSaved ? 'Saved' : 'Save Lot'}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleShare}>
                <Share2 className="w-3.5 h-3.5" />
                Share
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-[#F7F9FC] border border-[#DFE6EE] text-[11px] text-[#526071] leading-relaxed">
              Offers create an immutable negotiation trail. You can track all active offers and handovers inside the{' '}
              <button
                type="button"
                onClick={() => loginAsRole('buyer')}
                className="font-semibold text-[#10243A] hover:text-[#1E547A] underline underline-offset-2 transition-colors"
              >
                Buyer Workspace
              </button>
              .
            </div>
          </div>
        </aside>
      </div>

      {/* Similar Livestock */}
      {similarListings.length > 0 && (
        <section className="mt-10 pt-8 border-t border-[#DFE6EE]">
          <h2 className="text-lg sm:text-xl font-bold text-[#10243A] mb-4">Similar Livestock Lots</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {similarListings.map((sim) => (
              <ListingCard
                key={sim.id}
                listing={sim}
                saved={savedListingIds.includes(sim.id)}
                compared={compareListingIds.includes(sim.id)}
                onOpen={(id) => {
                  setActivePhotoIdx(0);
                  navigatePublic('listing-detail', id);
                }}
                onToggleSave={toggleSaveListing}
                onToggleCompare={toggleCompareListing}
              />
            ))}
          </div>
        </section>
      )}

      {/* Compact Mobile Sticky Primary CTA Bar (<= 64px, under 15% mobile viewport cap) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#DFE6EE] shadow-[0_-6px_20px_rgba(9,24,39,0.08)] px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-extrabold font-mono tabular-nums text-[#10243A] leading-none">
            {formatUSD(listing.priceUsd)}
          </p>
          <p className="text-[11px] text-[#526071] mt-0.5 truncate">
            {listing.priceUnit} · {listing.quantity} head
          </p>
        </div>
        <Button variant="accent" size="md" onClick={() => setOfferModalOpen(true)}>
          Make Offer
        </Button>
      </div>

      {/* Make Offer Modal */}
      <Modal
        open={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        title="Submit Livestock Offer"
        subtitle={`${listing.reference} · ${listing.title}`}
      >
        <form onSubmit={handleMakeOffer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Offer per Head (USD)"
              type="number"
              min={1}
              required
              value={offerPricePerHead}
              onChange={(e) => setOfferPricePerHead(e.target.value)}
            />
            <Input
              label={`Quantity (max ${listing.quantity})`}
              type="number"
              min={1}
              max={listing.quantity}
              required
              value={offerQty}
              onChange={(e) => setOfferQty(e.target.value)}
            />
          </div>
          <div className="p-3.5 rounded-lg bg-[#F7F9FC] border border-[#DFE6EE] flex items-center justify-between text-sm">
            <span className="text-[#526071]">Total Offer Value</span>
            <span className="font-mono font-bold text-[#10243A] tabular-nums">
              {formatUSD(proposedTotal)}
            </span>
          </div>
          <Textarea
            label="Commercial Terms & Collection Preference"
            rows={3}
            placeholder="Specify preferred handover hub (e.g., Gweru Hub, Nanyuki Hub, or Namanga Corridor), payment timing, or veterinary clearance requirements..."
            value={offerNote}
            onChange={(e) => setOfferNote(e.target.value)}
            required
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {!currentUser && (
              <p className="text-[11px] text-[#526071]">
                Will submit under Buyer preview profile (Tendai Moyo).
              </p>
            )}
            <div className="flex gap-2 sm:ml-auto justify-end">
              <Button type="button" variant="secondary" onClick={() => setOfferModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                <CheckCircle2 className="w-4 h-4" />
                Submit Offer
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Contact Seller Modal */}
      <Modal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title={`Message ${listing.sellerName}`}
        subtitle={`${listing.farmName} · ${listing.reference}`}
      >
        <form onSubmit={handleContactSeller} className="space-y-4">
          <Textarea
            label="Your Message"
            rows={4}
            placeholder="Ask about dipping logs, calving dates, transport loading ramps, or bulk lot pricing..."
            value={contactMsg}
            onChange={(e) => setContactMsg(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setContactModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Send Message
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
