import React, { useState } from 'react';
import { z } from 'zod';
import { ArrowRight, CheckCircle2, Mail, MapPin, Phone, Search, ShieldCheck } from 'lucide-react';
import { useMariketi, type PublicPage } from '../../context/MariketiContext';
import { ASSET_IMAGES } from '../../lib/utils';
import { Button, Input, SafeImage, Textarea } from '../../components/ui/DesignSystem';

const contactSchema = z.object({
  name: z.string().min(2, 'Please enter your full name'),
  email: z.string().email('Please enter a valid email address'),
  topic: z.string().min(2, 'Please select a topic'),
  message: z.string().min(10, 'Please include at least 10 characters'),
});

export const StaticPages: React.FC<{ page: PublicPage }> = ({ page }) => {
  const { navigatePublic, openAuth, pushToast, loginAsRole } = useMariketi();
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    topic: 'Buyer or Seller Onboarding',
    message: '',
  });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [helpSearch, setHelpSearch] = useState('');

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = contactSchema.safeParse(contactForm);
    if (!res.success) {
      const errs: Record<string, string> = {};
      res.error.issues.forEach((i) => {
        errs[String(i.path[0])] = i.message;
      });
      setContactErrors(errs);
      return;
    }
    setContactErrors({});
    setContactSubmitted(true);
    pushToast('Inquiry received', 'success', 'MARIKETI Operations will respond within 1 business day.');
  };

  if (page === 'about') {
    return (
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
        <div className="space-y-2.5 max-w-2xl">
          <p className="text-xs font-semibold text-[#245B83]">About MARIKETI</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10243A]">
            Building trusted commercial infrastructure for African livestock.
          </h1>
          <p className="text-sm sm:text-base text-[#697784] leading-relaxed prose-justify">
            Livestock represents billions of dollars in productive agricultural wealth across Southern Africa, yet buying and selling cattle, goats, sheep, pigs, and poultry remains fragmented. MARIKETI brings field-verified transparency, structured negotiation, and traceable handover logistics into one coherent platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            ['Zimbabwe First, Pan-African Scale', 'Designed around Zimbabwean provincial corridors, DVS veterinary clearances, and regional collection centres, with multi-country architecture ready for SADC expansion.'],
            ['Six Integrated Operational Roles', 'Buyers, Sellers, Field Verification Agents, Collection Centres, Transport Partners, and Operations Administrators collaborate on shared real-time records.'],
            ['Built for Rural Reliability', 'Offline-first IndexedDB field inspection tools ensure verification data never disappears when agents operate in low-connectivity ranching districts.'],
          ].map(([title, body]) => (
            <div key={title} className="bg-white border border-[#E5E9ED] rounded-lg p-5">
              <h2 className="text-[15px] font-bold text-[#10243A]">{title}</h2>
              <p className="text-[13px] text-[#697784] mt-1.5 leading-relaxed prose-justify">{body}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#10243A] text-white rounded-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <h2 className="text-xl font-bold">Ready to trade on MARIKETI?</h2>
            <p className="text-sm text-white/75 mt-1">
              Explore active verified herds or open a Seller, Buyer, Agent, or Transport account.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="accent" onClick={() => navigatePublic('marketplace')}>
              Explore Marketplace
            </Button>
            <Button
              variant="secondary"
              className="bg-transparent text-white border-white/25 hover:bg-white/10"
              onClick={() => openAuth('register')}
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'how-it-works') {
    const steps = [
      ['01. Discover Verified Stock', 'Search commercial cattle, goats, sheep, pigs, and poultry by breed, province, weight, age, and verification status.'],
      ['02. Independent On-Site Verification', 'Field Agents travel to farms to confirm live headcounts, sample weights, ear tags, GPS coordinates, and veterinary readiness.'],
      ['03. Structured Negotiation', 'Submit USD offers and receive counter-offers with an immutable history of every proposed price and quantity.'],
      ['04. Transparent Transaction Milestones', 'Track 11 operational states from offer acceptance to veterinary clearance, collection booking, and delivery scheduling.'],
      ['05. Collection Hub & Accredited Haulage', 'Check livestock into regional Collection Centres for weighbridge intake and dispatch accredited carriers with PIN-verified proof of delivery.'],
      ['06. Verified Handover & Reputation', 'Confirm arrival condition using your unique handover PIN and publish a verified seller review.'],
    ];
    return (
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold text-[#245B83]">Trade Lifecycle</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10243A]">
            How MARIKETI moves livestock from ranch to handover
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {steps.map(([title, desc]) => (
            <div key={title} className="bg-white border border-[#E5E9ED] rounded-lg p-5">
              <h2 className="text-[15px] font-bold text-[#10243A]">{title}</h2>
              <p className="text-[13px] text-[#697784] mt-1.5 leading-relaxed prose-justify">{desc}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="accent" onClick={() => navigatePublic('marketplace')}>
            Browse Active Listings
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="secondary" onClick={() => loginAsRole('buyer')}>
            Try Buyer Workspace
          </Button>
        </div>
      </div>
    );
  }

  if (page === 'verification') {
    return (
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-6 space-y-3.5 flex flex-col justify-center">
            <p className="text-xs font-semibold text-[#245B83]">Verification Protocol</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10243A]">
              Physical inspection standards built for agricultural reality.
            </h1>
            <p className="text-sm text-[#697784] leading-relaxed prose-justify">
              Photographs alone are never enough in livestock commerce. MARIKETI deploys accredited animal science technicians and field agents across Zimbabwe to independently verify every eligible lot.
            </p>
            <div className="pt-1 flex flex-wrap gap-2.5">
              <Button variant="primary" onClick={() => loginAsRole('agent')}>
                Open Field Agent App
              </Button>
              <Button variant="secondary" onClick={() => openAuth('register', 'agent')}>
                Apply as Field Agent
              </Button>
            </div>
          </div>
          <div className="lg:col-span-6 rounded-lg overflow-hidden border border-[#E5E9ED] min-h-[240px]">
            <SafeImage
              src={ASSET_IMAGES.fieldAgent}
              alt="Field verification inspector examining cattle"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Identity & Ownership', 'Confirms registered seller ID, brand mark, dipping card, and farm location.'],
            ['Breed & Conformation', 'Records observed breed purity, gender composition, and visual body condition score.'],
            ['Weight & Headcount', 'Verifies exact lot headcount and digital scale or girth-tape live weight samples.'],
            ['Veterinary Readiness', 'Checks vaccination history and Department of Veterinary Services (DVS) movement clearance.'],
          ].map(([title, body]) => (
            <div key={title} className="bg-white border border-[#E5E9ED] rounded-lg p-4">
              <ShieldCheck className="w-4 h-4 text-[#21865B] mb-2" />
              <h2 className="text-sm font-bold text-[#10243A]">{title}</h2>
              <p className="text-xs text-[#697784] mt-1.5 leading-relaxed prose-justify">{body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page === 'contact') {
    return (
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-semibold text-[#245B83]">Contact Operations</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10243A]">
              Speak with the MARIKETI trade desk.
            </h1>
            <p className="text-sm text-[#697784] leading-relaxed prose-justify">
              Reach our Harare headquarters or regional verification coordinators for commercial procurement, stud ranch listings, or logistics partnerships.
            </p>
            <div className="space-y-2.5 pt-1 text-sm text-[#17212B]">
              <p className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#F28C28] shrink-0 mt-0.5" />
                <span>148 Samora Machel Ave, Harare · Regional Hubs: Gweru & Bulawayo</span>
              </p>
              <p className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#F28C28] shrink-0 mt-0.5" />
                <span>+263 24 270 8840 / +263 77 200 1001</span>
              </p>
              <p className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-[#F28C28] shrink-0 mt-0.5" />
                <span>operations@mariketi.africa</span>
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#E5E9ED] rounded-lg p-5">
            {contactSubmitted ? (
              <div className="py-10 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#21865B] mx-auto" />
                <h2 className="text-lg font-bold text-[#10243A]">Message received</h2>
                <p className="text-sm text-[#697784] max-w-md mx-auto">
                  Thank you, {contactForm.name}. A MARIKETI trade coordinator has logged your request under {contactForm.topic}.
                </p>
                <Button variant="secondary" onClick={() => setContactSubmitted(false)}>
                  Send Another Inquiry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    error={contactErrors.name}
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    error={contactErrors.email}
                  />
                </div>
                <Input
                  label="Topic"
                  value={contactForm.topic}
                  onChange={(e) => setContactForm({ ...contactForm, topic: e.target.value })}
                  error={contactErrors.topic}
                />
                <Textarea
                  label="How can we assist?"
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  error={contactErrors.message}
                />
                <Button type="submit" variant="primary" size="md">
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (page === 'help') {
    const articles = [
      ['Getting Started as a Seller', 'How to complete farm verification, photograph livestock clearly, and publish your first lot in 7 guided steps.'],
      ['Making & Negotiating Offers', 'All offers and counter-offers are stored in an immutable history with timestamps and automatic expiry timers.'],
      ['Field Verification & Offline Sync', 'How MARIKETI field agents capture GPS-stamped evidence offline using IndexedDB and resolve sync conflicts.'],
      ['Collection Centre Check-In & Handover PIN', 'How animals are weighed, penned, and released only upon presenting the unique transaction handover code.'],
      ['Dispute Investigation Process', 'How buyers or sellers escalate weight variances, documentation issues, or delivery concerns to MARIKETI Operations.'],
    ].filter(
      ([t, b]) =>
        !helpSearch.trim() ||
        t.toLowerCase().includes(helpSearch.toLowerCase()) ||
        b.toLowerCase().includes(helpSearch.toLowerCase())
    );

    return (
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-[#245B83]">Help Centre</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10243A]">
            Guides for buyers, farmers, agents, and transport partners
          </h1>
          <div className="pt-1 max-w-lg">
            <div className="relative">
              <Search className="w-4 h-4 text-[#697784] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={helpSearch}
                onChange={(e) => setHelpSearch(e.target.value)}
                placeholder="Search help guides (e.g. verification, PIN, offers)..."
                className="w-full h-10 pl-10 pr-4 bg-white border border-[#E5E9ED] rounded-md text-sm focus:outline-none focus:border-[#10243A]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {articles.map(([title, body]) => (
            <div key={title} className="bg-white border border-[#E5E9ED] rounded-lg p-4 sm:p-5">
              <h2 className="text-[15px] font-bold text-[#10243A]">{title}</h2>
              <p className="text-[13px] text-[#697784] mt-1 leading-relaxed prose-justify">{body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Terms or Privacy
  const isTerms = page === 'terms';
  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-5">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-[#245B83]">Legal & Compliance</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10243A]">
          {isTerms ? 'Terms of Trade' : 'Privacy & Data Protection Policy'}
        </h1>
      </div>
      <div className="bg-white border border-[#E5E9ED] rounded-lg p-5 sm:p-7 space-y-4 text-sm text-[#697784] leading-relaxed prose-justify">
        {isTerms ? (
          <>
            <p>
              <strong className="text-[#10243A]">1. Scope of Platform:</strong> MARIKETI operates a verified digital livestock marketplace connecting buyers, sellers, field verification agents, collection centres, and transport partners in Zimbabwe and Southern Africa.
            </p>
            <p>
              <strong className="text-[#10243A]">2. Simulated Payment Disclosure:</strong> Where demo settlement indicators are shown in the interface, no real bank accounts, mobile-money wallets, or escrow funds are charged or held. Production payment protection applies only once an accredited payment rail is activated and confirmed.
            </p>
            <p>
              <strong className="text-[#10243A]">3. Veterinary & Movement Compliance:</strong> Sellers warrant that all listed livestock are lawfully owned and eligible for Zimbabwe Department of Veterinary Services (DVS) movement permits and Zimbabwe Republic Police stock clearance.
            </p>
          </>
        ) : (
          <>
            <p>
              <strong className="text-[#10243A]">1. Operational Data Collection:</strong> We collect account identification, farm location coordinates, inspection photography, and transaction records strictly to verify livestock identity and coordinate lawful handover.
            </p>
            <p>
              <strong className="text-[#10243A]">2. Offline Field Storage:</strong> Field Agent inspection drafts, GPS coordinates, and photos are stored locally in browser IndexedDB until synchronized with operations servers.
            </p>
            <p>
              <strong className="text-[#10243A]">3. Access Control:</strong> Role-based permissions govern access to personal phone numbers, transaction ledgers, and audit logs.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
