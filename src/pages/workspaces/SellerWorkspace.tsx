import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Handshake,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Pencil,
  PlusCircle,
  Settings,
  Star,
  Upload,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import {
  ASSET_IMAGES,
  cn,
  formatDate,
  formatUSD,
  getCountry,
  getCountryFlag,
  getDistrictsForProvince,
  getProvincesForCountry,
} from '../../lib/utils';
import type { GenderType, LivestockCategory, LivestockListing } from '../../types/mariketi';
import { WorkspaceShell, type NavItem } from '../../components/layout/WorkspaceShell';
import { CountrySelect } from '../../components/shared/CountrySelect';
import { MessagingView } from '../../components/shared/MessagingView';
import { NegotiationPanel } from '../../components/shared/NegotiationPanel';
import { TransactionDetailModal } from '../../components/shared/TransactionDetailModal';
import {
  Button,
  Input,
  MetricCell,
  Modal,
  SafeImage,
  Select,
  StatusLabel,
  Textarea,
} from '../../components/ui/DesignSystem';

const REVENUE_DATA = [
  { month: 'Jun', revenue: 9200 },
  { month: 'Jul', revenue: 14800 },
  { month: 'Aug', revenue: 11400 },
  { month: 'Sep', revenue: 18600 },
  { month: 'Oct', revenue: 22100 },
  { month: 'Nov', revenue: 16450 },
];

const WIZARD_STEPS = [
  '1. Category',
  '2. Specifications',
  '3. Pricing & Qty',
  '4. Location',
  '5. Photos & Docs',
  '6. Verification',
  '7. Preview & Publish',
];

const CATEGORY_DEFAULT_PHOTO: Record<LivestockCategory, string> = {
  Cattle: ASSET_IMAGES.brahmanBull,
  Goats: ASSET_IMAGES.boerGoats,
  Sheep: ASSET_IMAGES.dorperSheep,
  Pigs: ASSET_IMAGES.largeWhitePigs,
  Poultry: ASSET_IMAGES.poultryBroilers,
  'Other livestock': ASSET_IMAGES.heroCattle,
};

export const SellerWorkspace: React.FC = () => {
  const {
    currentUser,
    listings,
    offers,
    transactions,
    conversations,
    reviews,
    createListing,
    updateListing,
    updateListingStatus,
    requestInspectionForListing,
    updateCurrentUserProfile,
    pushToast,
  } = useMariketi();

  const [tab, setTab] = useState('overview');
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<LivestockListing | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    breed: '',
    priceUsd: '',
    quantity: '',
    weightKg: '',
    description: '',
    vaccinationSummary: '',
  });
  const [sellerSettings, setSellerSettings] = useState({
    organization: currentUser?.organization || '',
    phone: currentUser?.phone || '',
    country: currentUser?.country || 'Zimbabwe',
    province: currentUser?.province || 'Matabeleland South',
    district: currentUser?.district || 'Gwanda',
    vetReg: currentUser?.meta?.vetReg || 'DVS-MS-2041',
  });

  useEffect(() => {
    setSellerSettings({
      organization: currentUser?.organization || '',
      phone: currentUser?.phone || '',
      country: currentUser?.country || 'Zimbabwe',
      province: currentUser?.province || 'Matabeleland South',
      district: currentUser?.district || 'Gwanda',
      vetReg: currentUser?.meta?.vetReg || 'DVS-MS-2041',
    });
  }, [
    currentUser?.id,
    currentUser?.organization,
    currentUser?.phone,
    currentUser?.country,
    currentUser?.province,
    currentUser?.district,
    currentUser?.meta?.vetReg,
  ]);

  // 7-step Listing Creation Wizard state (persisted draft)
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(() => {
    const defaultCountry = currentUser?.country || 'Zimbabwe';
    const defaultProvinces = getProvincesForCountry(defaultCountry);
    const defaultProv = currentUser?.province || defaultProvinces[0] || 'Matabeleland South';
    const defaultDist =
      currentUser?.district || getDistrictsForProvince(defaultCountry, defaultProv)[0] || 'Gwanda';
    try {
      const saved = localStorage.getItem('mariketi_seller_listing_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          country: parsed.country || defaultCountry,
        };
      }
    } catch {
      // ignore
    }
    return {
      category: 'Cattle' as LivestockCategory,
      title: '',
      breed: '',
      ageMonths: '24',
      gender: 'Steer / Ox' as GenderType,
      weightKg: '420',
      description: '',
      vaccinationSummary: 'FMD, Anthrax, Quarter Evil, and weekly acaricide dipping up to date.',
      feedingRegime: 'Rotational sweetveld grazing with mineral lick.',
      priceUsd: '820',
      priceUnit: 'per head' as 'per head' | 'total lot',
      quantity: '10',
      country: defaultCountry,
      province: defaultProv,
      district: defaultDist,
      farmName: currentUser?.organization || 'Umzingwane Valley Stud & Ranch',
      photoPreview: ASSET_IMAGES.brahmanBull as string,
      vetDocName: 'Vet-Clearance-Ready.pdf',
      requestFieldVerification: true,
    };
  });
  const [wizardError, setWizardError] = useState('');
  const [publishedRef, setPublishedRef] = useState<string | null>(null);

  const myListings = listings;
  const activeListings = myListings.filter((l) => l.status === 'active');
  const pendingVerifications = myListings.filter(
    (l) => l.verificationStatus !== 'Verified'
  );
  const incomingOffers = offers.filter(
    (o) => o.status === 'pending' || o.status === 'countered'
  );
  const completedSales = transactions.filter((t) => t.state === 'Completed');
  const totalRevenue = transactions.reduce((sum, t) => sum + t.agreedAmountUsd, 0);
  const selectedTxn = transactions.find((t) => t.id === selectedTxnId) || null;
  const unreadMessagesCount = conversations.reduce(
    (sum, c) => sum + c.messages.filter((m) => !m.read && m.senderId !== currentUser?.id).length,
    0
  );

  const openEditListing = (l: LivestockListing) => {
    setEditingListing(l);
    setEditForm({
      title: l.title,
      breed: l.breed,
      priceUsd: String(l.priceUsd),
      quantity: String(l.quantity),
      weightKg: String(l.weightKg),
      description: l.description,
      vaccinationSummary: l.vaccinationSummary,
    });
  };

  const handleSaveListingEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;
    if (!editForm.title.trim() || Number(editForm.priceUsd) <= 0 || Number(editForm.quantity) <= 0) {
      pushToast('Title, price, and quantity must be valid', 'error');
      return;
    }
    updateListing(editingListing.id, {
      title: editForm.title.trim(),
      breed: editForm.breed.trim(),
      priceUsd: Number(editForm.priceUsd),
      quantity: Number(editForm.quantity),
      weightKg: Number(editForm.weightKg) || editingListing.weightKg,
      description: editForm.description.trim(),
      vaccinationSummary: editForm.vaccinationSummary.trim(),
    });
    setEditingListing(null);
  };

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'listings', label: 'My Listings', icon: ListChecks, badge: activeListings.length },
    { id: 'create', label: 'Create Listing', icon: PlusCircle },
    { id: 'offers', label: 'Offers & Negotiations', icon: Handshake, badge: incomingOffers.length },
    { id: 'transactions', label: 'Orders & Transactions', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessagesCount },
    { id: 'verification', label: 'Verification', icon: ClipboardCheck, badge: pendingVerifications.length },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const saveDraftLocal = () => {
    localStorage.setItem('mariketi_seller_listing_draft', JSON.stringify(draft));
    pushToast('Listing draft saved locally', 'info');
  };

  const validateAndAdvance = () => {
    setWizardError('');
    if (step === 2) {
      if (!draft.title.trim() || !draft.breed.trim()) {
        setWizardError('Please enter both a clear listing title and livestock breed.');
        return;
      }
    }
    if (step === 3) {
      if (Number(draft.priceUsd) <= 0 || Number(draft.quantity) <= 0) {
        setWizardError('Asking price and quantity must be greater than zero.');
        return;
      }
    }
    if (step === 4) {
      if (!draft.farmName.trim() || !draft.district.trim()) {
        setWizardError('Please provide your farm name and district.');
        return;
      }
    }
    setStep((s) => Math.min(7, s + 1));
  };

  const handlePublish = () => {
    const ageNum = Number(draft.ageMonths) || 12;
    const created = createListing({
      title: draft.title.trim(),
      category: draft.category,
      breed: draft.breed.trim(),
      ageMonths: ageNum,
      ageLabel: ageNum >= 24 ? `${Math.floor(ageNum / 12)} yrs ${ageNum % 12} mos` : `${ageNum} months`,
      gender: draft.gender,
      weightKg: Number(draft.weightKg) || 100,
      quantity: Number(draft.quantity) || 1,
      priceUsd: Number(draft.priceUsd) || 100,
      priceUnit: draft.priceUnit,
      country: draft.country || currentUser?.country || 'Zimbabwe',
      province: draft.province,
      district: draft.district,
      farmName: draft.farmName.trim(),
      verificationStatus: draft.requestFieldVerification
        ? 'Pending Verification'
        : 'Unverified',
      status: 'active',
      images: [draft.photoPreview || CATEGORY_DEFAULT_PHOTO[draft.category as LivestockCategory]],
      description:
        draft.description.trim() ||
        `Healthy ${draft.breed} lot raised at ${draft.farmName} in ${draft.district}, ${draft.province}, ${draft.country || 'Zimbabwe'}.`,
      vaccinationSummary: draft.vaccinationSummary,
      feedingRegime: draft.feedingRegime,
      featured: false,
    });
    localStorage.removeItem('mariketi_seller_listing_draft');
    setPublishedRef(created.reference);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraft((d: typeof draft) => ({ ...d, photoPreview: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <WorkspaceShell
      workspaceTitle="Seller Workspace"
      navItems={navItems}
      activeTab={tab}
      onSelectTab={setTab}
      primaryAction={
        <Button
          variant="accent"
          size="sm"
          onClick={() => {
            setPublishedRef(null);
            setStep(1);
            setTab('create');
          }}
        >
          <PlusCircle className="w-4 h-4" />
          New Listing
        </Button>
      }
    >
      {tab === 'overview' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#10243A] tracking-tight">
              {currentUser?.organization || 'Farm Operations Overview'}
            </h1>
            <p className="text-sm text-[#526071] mt-0.5">
              Manage active herds, field inspections, incoming commercial offers, and handovers.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <MetricCell label="Active Listings" value={activeListings.length} detail="Live on marketplace" />
            <MetricCell label="Pending Verification" value={pendingVerifications.length} detail="Awaiting field visit" />
            <MetricCell label="Offers Received" value={incomingOffers.length} detail="Needs response" />
            <MetricCell label="Completed Sales" value={completedSales.length} detail="Verified handovers" />
            <MetricCell
              label="Recorded Volume"
              value={formatUSD(totalRevenue)}
              detail="Demo trade ledger"
              className="col-span-2 lg:col-span-1"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 min-w-0 bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3.5">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[#10243A]">Monthly Sales Volume (USD)</h2>
                  <p className="text-xs text-[#526071]">6-month commercial livestock turnover</p>
                </div>
                <span className="font-mono text-xs text-[#526071] shrink-0">USD</span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={REVENUE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DFE6EE" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#526071' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#526071' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v) => [formatUSD(Number(v || 0)), 'Volume']}
                      contentStyle={{ borderRadius: 8, borderColor: '#DFE6EE', fontSize: 12 }}
                    />
                    <Bar dataKey="revenue" fill="#10243A" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 min-w-0 bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 sm:p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-[#10243A]">Recent Seller Activity</h2>
              <div className="divide-y divide-[#DFE6EE] text-xs">
                {offers.slice(0, 4).map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#10243A] truncate">{o.listingTitle}</p>
                      <p className="text-[#526071] mt-0.5">
                        {o.buyerName} · {o.status}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-[#10243A] tabular-nums shrink-0">
                      {formatUSD(o.currentAmountUsd)}
                    </span>
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="sm" className="w-full" onClick={() => setTab('offers')}>
                Review All Offers
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'listings' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-[#10243A]">My Livestock Listings</h1>
            <Button variant="accent" size="sm" onClick={() => setTab('create')}>
              <PlusCircle className="w-4 h-4" />
              Create Listing
            </Button>
          </div>
          <div className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] overflow-hidden">
            {/* Mobile stacked cards */}
            <div className="md:hidden divide-y divide-[#DFE6EE]">
              {myListings.map((l) => (
                <div key={l.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-[#10243A]">{l.reference}</span>
                    <StatusLabel
                      tone={l.verificationStatus === 'Verified' ? 'success' : 'warning'}
                      label={l.verificationStatus}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#10243A]">{l.title}</p>
                    <p className="text-xs text-[#526071] mt-0.5">
                      {l.quantity} head · {l.weightKg} kg · {getCountryFlag(l.country)} {l.district}, {l.country} · <span className="capitalize font-medium text-[#10243A]">{l.status}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="font-mono text-sm font-bold text-[#10243A] tabular-nums">
                      {formatUSD(l.priceUsd)} <span className="text-[11px] font-sans font-normal text-[#526071]">{l.priceUnit}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEditListing(l)}>
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      {l.status === 'active' ? (
                        <Button variant="ghost" size="sm" onClick={() => updateListingStatus(l.id, 'paused')}>
                          Pause
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => updateListingStatus(l.id, 'active')}>
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F9FC] border-b border-[#DFE6EE] text-[#526071]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Ref / Lot</th>
                    <th className="py-3 px-4 font-semibold">Specs</th>
                    <th className="py-3 px-4 font-semibold text-right">Price</th>
                    <th className="py-3 px-4 font-semibold">Verification</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DFE6EE] tabular-nums">
                  {myListings.map((l) => (
                    <tr key={l.id} className="hover:bg-[#F7F9FC]/80 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-mono font-semibold text-[#10243A]">{l.reference}</p>
                        <p className="text-[#0F1B2A] font-medium mt-0.5">{l.title}</p>
                      </td>
                      <td className="py-3 px-4 text-[#526071]">
                        {l.quantity} head · {l.weightKg} kg · {getCountryFlag(l.country)} {l.district}, {l.country}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-right text-[#10243A]">
                        {formatUSD(l.priceUsd)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusLabel
                          tone={l.verificationStatus === 'Verified' ? 'success' : 'warning'}
                          label={l.verificationStatus}
                        />
                      </td>
                      <td className="py-3 px-4 capitalize font-medium text-[#10243A]">{l.status}</td>
                      <td className="py-3 px-4 text-right space-x-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditListing(l)}
                          className="text-xs font-semibold text-[#10243A] hover:text-[#C96A0F] inline-flex items-center gap-1 transition-colors rounded focus-visible:outline-2 focus-visible:outline-[#F28C28]"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        {l.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => updateListingStatus(l.id, 'paused')}
                            className="text-xs font-medium text-[#526071] hover:text-[#10243A] underline-offset-4 hover:underline transition-colors rounded focus-visible:outline-2 focus-visible:outline-[#F28C28]"
                          >
                            Pause
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateListingStatus(l.id, 'active')}
                            className="text-xs font-semibold text-[#1A7A50] hover:underline underline-offset-4 transition-colors rounded focus-visible:outline-2 focus-visible:outline-[#F28C28]"
                          >
                            Activate
                          </button>
                        )}
                        {l.status !== 'archived' && (
                          <button
                            type="button"
                            onClick={() => updateListingStatus(l.id, 'archived')}
                            className="text-xs font-semibold text-[#C53939] hover:underline underline-offset-4 transition-colors rounded focus-visible:outline-2 focus-visible:outline-[#F28C28]"
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'create' && (
        <div className="max-w-3xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-[#10243A] tracking-tight">Create Livestock Listing</h1>
              <p className="text-xs text-[#526071] mt-0.5">
                Guided 7-step publication with field verification request and local draft saving.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={saveDraftLocal}>
              Save Draft
            </Button>
          </div>

          {publishedRef ? (
            <div className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-6 sm:p-7 text-center space-y-3.5">
              <CheckCircle2 className="w-10 h-10 text-[#1A7A50] mx-auto" />
              <h2 className="text-xl font-bold text-[#10243A]">
                Listing Published — <span className="font-mono">{publishedRef}</span>
              </h2>
              <p className="text-sm text-[#526071] max-w-md mx-auto leading-relaxed prose-justify">
                Your livestock lot is now discoverable on MARIKETI. If you requested field verification, an inspection task has been automatically dispatched to our regional field unit.
              </p>
              <div className="flex flex-wrap justify-center gap-2.5 pt-1">
                <Button variant="primary" onClick={() => setTab('listings')}>
                  View My Listings
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPublishedRef(null);
                    setStep(1);
                  }}
                >
                  Create Another Lot
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 sm:p-5 space-y-5">
              {/* Step progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#10243A]">{WIZARD_STEPS[step - 1]}</span>
                  <span className="font-mono text-[#526071]">Step {step} of 7</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {WIZARD_STEPS.map((label, idx) => (
                    <div
                      key={label}
                      className={cn(
                        'h-1.5 rounded-full transition-colors',
                        idx + 1 <= step ? 'bg-[#F28C28]' : 'bg-[#DFE6EE]'
                      )}
                    />
                  ))}
                </div>
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-[#10243A]">Select Livestock Category</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(['Cattle', 'Goats', 'Sheep', 'Pigs', 'Poultry', 'Other livestock'] as LivestockCategory[]).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setDraft((d: typeof draft) => ({
                            ...d,
                            category: cat,
                            photoPreview: CATEGORY_DEFAULT_PHOTO[cat],
                          }))
                        }
                        className={cn(
                          'p-4 rounded-xl border text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#F28C28]',
                          draft.category === cat
                            ? 'border-[#0F243B] bg-gradient-to-b from-[#152F4B] to-[#0F243B] text-white shadow-[0_4px_12px_rgba(16,36,58,0.2)]'
                            : 'border-[#DFE6EE] bg-white hover:bg-[#F7F9FC] hover:border-[#B6C3D1] text-[#10243A]'
                        )}
                      >
                        <p className="text-sm font-bold">{cat}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <Input
                    label="Listing Title"
                    placeholder="e.g. Lot of 15 Brahman Cross Feedlot Steers"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Breed"
                      placeholder="e.g. Brahman, Boer, Dorper"
                      value={draft.breed}
                      onChange={(e) => setDraft({ ...draft, breed: e.target.value })}
                    />
                    <Select
                      label="Gender / Herd Composition"
                      value={draft.gender}
                      onChange={(e) => setDraft({ ...draft, gender: e.target.value as GenderType })}
                    >
                      <option value="Bull / Male">Bull / Male</option>
                      <option value="Cow / Female">Cow / Female</option>
                      <option value="Heifer">Heifer</option>
                      <option value="Steer / Ox">Steer / Ox</option>
                      <option value="Mixed Herd">Mixed Herd</option>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Input
                      label="Age (Months)"
                      type="number"
                      min={1}
                      value={draft.ageMonths}
                      onChange={(e) => setDraft({ ...draft, ageMonths: e.target.value })}
                    />
                    <Input
                      label="Avg Live Weight (kg)"
                      type="number"
                      min={1}
                      value={draft.weightKg}
                      onChange={(e) => setDraft({ ...draft, weightKg: e.target.value })}
                    />
                  </div>
                  <Textarea
                    label="Herd Description"
                    rows={3}
                    placeholder="Describe conformation, breeding history, temperament, and suitability..."
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Asking Price (USD)"
                      type="number"
                      min={1}
                      value={draft.priceUsd}
                      onChange={(e) => setDraft({ ...draft, priceUsd: e.target.value })}
                    />
                    <Select
                      label="Pricing Unit"
                      value={draft.priceUnit}
                      onChange={(e) => setDraft({ ...draft, priceUnit: e.target.value as 'per head' | 'total lot' })}
                    >
                      <option value="per head">Per Head</option>
                      <option value="total lot">Total Lot</option>
                    </Select>
                    <Input
                      label="Quantity (Head)"
                      type="number"
                      min={1}
                      value={draft.quantity}
                      onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-[#F7F9FC] border border-[#DFE6EE] flex items-center justify-between text-sm">
                    <span className="text-[#526071]">Estimated Total Lot Value</span>
                    <span className="font-mono font-bold text-[#10243A] tabular-nums">
                      {formatUSD(
                        draft.priceUnit === 'per head'
                          ? Number(draft.priceUsd || 0) * Number(draft.quantity || 0)
                          : Number(draft.priceUsd || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <Input
                    label="Farm / Ranch Name"
                    value={draft.farmName}
                    onChange={(e) => setDraft({ ...draft, farmName: e.target.value })}
                  />
                  <CountrySelect
                    label="Country (All 54 African Nations)"
                    value={draft.country || 'Zimbabwe'}
                    onChange={(nextCountry) => {
                      const nextProvs = getProvincesForCountry(nextCountry);
                      const firstProv = nextProvs[0] || '';
                      const firstDist = firstProv
                        ? getDistrictsForProvince(nextCountry, firstProv)[0] || ''
                        : '';
                      setDraft({
                        ...draft,
                        country: nextCountry,
                        province: firstProv,
                        district: firstDist,
                      });
                    }}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Province / County"
                      value={draft.province}
                      onChange={(e) => {
                        const p = e.target.value;
                        const c = draft.country || 'Zimbabwe';
                        setDraft({
                          ...draft,
                          province: p,
                          district: getDistrictsForProvince(c, p)[0] || '',
                        });
                      }}
                    >
                      {getProvincesForCountry(draft.country || 'Zimbabwe').map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="District / Town"
                      value={draft.district}
                      onChange={(e) => setDraft({ ...draft, district: e.target.value })}
                    >
                      {getDistrictsForProvince(draft.country || 'Zimbabwe', draft.province).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div className="aspect-[4/3] rounded-lg overflow-hidden border border-[#DFE6EE]">
                      <SafeImage src={draft.photoPreview} alt="Livestock preview" className="w-full h-full" />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-[#10243A]">
                        Upload Livestock Photograph
                      </label>
                      <label className="h-10 px-4 rounded-lg border border-[#D4DDE6] bg-white hover:bg-[#F7F9FC] hover:border-[#B6C3D1] inline-flex items-center gap-2 text-xs font-semibold text-[#10243A] cursor-pointer transition-all duration-150 shadow-[0_1px_2px_rgba(16,36,58,0.04)]">
                        <Upload className="w-4 h-4 text-[#F28C28]" />
                        Choose Photo from Device
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      </label>
                      <Input
                        label="Vaccination & Dipping Notes"
                        value={draft.vaccinationSummary}
                        onChange={(e) => setDraft({ ...draft, vaccinationSummary: e.target.value })}
                      />
                      <Input
                        label="Supporting Document Reference"
                        value={draft.vetDocName}
                        onChange={(e) => setDraft({ ...draft, vetDocName: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  <label className="flex items-start gap-3 p-4 rounded-lg border border-[#DFE6EE] bg-[#F7F9FC] hover:border-[#B6C3D1] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={draft.requestFieldVerification}
                      onChange={(e) =>
                        setDraft({ ...draft, requestFieldVerification: e.target.checked })
                      }
                      className="mt-1 accent-[#10243A]"
                    />
                    <div>
                      <p className="text-sm font-bold text-[#10243A]">
                        Request On-Site MARIKETI Field Verification (Recommended)
                      </p>
                      <p className="text-xs text-[#526071] mt-1 leading-relaxed prose-justify">
                        An accredited Field Agent in {getCountryFlag(draft.country)} {draft.province}, {draft.country || 'Zimbabwe'} will be dispatched to confirm headcount, weights, ear tags, and {getCountry(draft.country).vetAuthority} papers. Verified listings receive significantly more commercial offers.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {step === 7 && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-[#10243A]">Review Before Publishing</p>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 rounded-lg bg-[#F7F9FC] border border-[#DFE6EE]">
                    <div className="sm:col-span-4 aspect-[4/3] rounded-lg overflow-hidden border border-[#DFE6EE]">
                      <SafeImage src={draft.photoPreview} alt={draft.title} className="w-full h-full" />
                    </div>
                    <div className="sm:col-span-8 space-y-2 text-xs">
                      <p className="text-base font-bold text-[#10243A]">{draft.title}</p>
                      <p className="text-[#526071]">
                        {draft.category} · {draft.breed} · {draft.gender} · {draft.weightKg} kg avg
                      </p>
                      <p className="font-mono text-base font-bold text-[#10243A]">
                        {formatUSD(Number(draft.priceUsd))} {draft.priceUnit} × {draft.quantity} head
                      </p>
                      <p className="text-[#526071]">
                        Location: {getCountryFlag(draft.country)} {draft.farmName}, {draft.district}, {draft.province}, {draft.country || 'Zimbabwe'}
                      </p>
                      <p className="text-[#1A7A50] font-semibold">
                        {draft.requestFieldVerification
                          ? 'Field verification will be dispatched automatically'
                          : 'Publishing without field verification'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {wizardError && <p className="text-xs text-[#C53939] font-medium">{wizardError}</p>}

              <div className="flex items-center justify-between pt-4 border-t border-[#DFE6EE]">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={step === 1}
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                >
                  Previous
                </Button>
                {step < 7 ? (
                  <Button type="button" variant="primary" onClick={validateAndAdvance}>
                    Next Step
                  </Button>
                ) : (
                  <Button type="button" variant="accent" onClick={handlePublish}>
                    Publish Livestock Listing
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'offers' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-[#10243A]">Incoming Offers & Negotiations</h1>
          <NegotiationPanel roleView="seller" />
        </div>
      )}

      {tab === 'transactions' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-[#10243A] tracking-tight">Seller Orders & Transactions</h1>
          <div className="space-y-3">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-colors hover:border-[#C5D1DE]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-[#526071]">
                    {txn.reference} · Buyer: {txn.buyerName}
                  </p>
                  <h3 className="text-[15px] font-bold text-[#10243A] mt-0.5 leading-snug">
                    {txn.listingTitle} ({txn.quantity} head)
                  </h3>
                  <p className="text-xs text-[#526071] mt-0.5">Hub: {txn.collectionCentreName}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[#DFE6EE] shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="font-mono font-bold text-[#10243A] tabular-nums">{formatUSD(txn.agreedAmountUsd)}</p>
                    <StatusLabel tone={txn.state === 'Completed' ? 'success' : 'info'} label={txn.state} />
                  </div>
                  <Button variant="primary" size="sm" onClick={() => setSelectedTxnId(txn.id)}>
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'messages' && <MessagingView />}

      {tab === 'verification' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-[#10243A] tracking-tight">Herd Verification Status</h1>
          <div className="space-y-3">
            {myListings.map((l) => (
              <div
                key={l.id}
                className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-[#526071]">{l.reference}</p>
                  <p className="text-sm font-bold text-[#10243A]">{l.title}</p>
                  <p className="text-xs text-[#526071] mt-0.5">
                    {getCountryFlag(l.country)} {l.district}, {l.province}, {l.country} · {l.quantity} head
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <StatusLabel
                    tone={l.verificationStatus === 'Verified' ? 'success' : 'warning'}
                    label={l.verificationStatus}
                  />
                  {l.verificationStatus !== 'Verified' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => requestInspectionForListing(l.id)}
                    >
                      Dispatch Inspector
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-[#10243A] tracking-tight">Buyer Reviews</h1>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                  <span className="font-bold text-[#10243A]">{r.buyerName}</span>
                  <span className="font-mono text-[#526071]">
                    {r.rating.toFixed(1)}/5.0 · {formatDate(r.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-[#526071] mt-2 leading-relaxed prose-justify">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateCurrentUserProfile({
              organization: sellerSettings.organization.trim(),
              phone: sellerSettings.phone.trim(),
              country: sellerSettings.country,
              province: sellerSettings.province,
              district: sellerSettings.district,
              meta: { ...(currentUser?.meta || {}), vetReg: sellerSettings.vetReg.trim() },
            });
          }}
          className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-5 max-w-xl space-y-4"
        >
          <h1 className="text-lg font-bold text-[#10243A]">Farm & Seller Settings</h1>
          <Input
            label="Farm / Ranch Name"
            value={sellerSettings.organization}
            onChange={(e) => setSellerSettings({ ...sellerSettings, organization: e.target.value })}
            required
          />
          <CountrySelect
            label="Country (All 54 African Nations)"
            value={sellerSettings.country}
            showDialCode
            onChange={(nextCountry) => {
              const nextProvs = getProvincesForCountry(nextCountry);
              const firstProv = nextProvs[0] || '';
              const firstDist = firstProv
                ? getDistrictsForProvince(nextCountry, firstProv)[0] || ''
                : '';
              setSellerSettings({
                ...sellerSettings,
                country: nextCountry,
                province: firstProv,
                district: firstDist,
              });
            }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select
              label="Province / County"
              value={sellerSettings.province}
              onChange={(e) => {
                const nextProv = e.target.value;
                setSellerSettings({
                  ...sellerSettings,
                  province: nextProv,
                  district: getDistrictsForProvince(sellerSettings.country, nextProv)[0] || '',
                });
              }}
            >
              {getProvincesForCountry(sellerSettings.country).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Select
              label="District / Town"
              value={sellerSettings.district}
              onChange={(e) => setSellerSettings({ ...sellerSettings, district: e.target.value })}
            >
              {getDistrictsForProvince(sellerSettings.country, sellerSettings.province).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="Contact Phone"
            value={sellerSettings.phone}
            onChange={(e) => setSellerSettings({ ...sellerSettings, phone: e.target.value })}
            required
          />
          <Input
            label={`National Veterinary Registration Ref (${getCountry(sellerSettings.country).vetAuthority})`}
            value={sellerSettings.vetReg}
            onChange={(e) => setSellerSettings({ ...sellerSettings, vetReg: e.target.value })}
          />
          <Button type="submit" variant="primary">
            Update Farm Details
          </Button>
        </form>
      )}

      {/* Edit Listing Modal */}
      <Modal
        open={!!editingListing}
        onClose={() => setEditingListing(null)}
        title="Edit Livestock Listing"
        subtitle={
          editingListing
            ? `${editingListing.reference} · ${getCountryFlag(editingListing.country)} ${editingListing.district}, ${editingListing.province}, ${editingListing.country}`
            : ''
        }
      >
        <form onSubmit={handleSaveListingEdits} className="space-y-4">
          <Input
            label="Listing Title"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Breed"
              value={editForm.breed}
              onChange={(e) => setEditForm({ ...editForm, breed: e.target.value })}
              required
            />
            <Input
              label="Avg Live Weight (kg)"
              type="number"
              min={1}
              value={editForm.weightKg}
              onChange={(e) => setEditForm({ ...editForm, weightKg: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label={`Asking Price (USD ${editingListing?.priceUnit || 'per head'})`}
              type="number"
              min={1}
              value={editForm.priceUsd}
              onChange={(e) => setEditForm({ ...editForm, priceUsd: e.target.value })}
              required
            />
            <Input
              label="Quantity (Head)"
              type="number"
              min={1}
              value={editForm.quantity}
              onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
              required
            />
          </div>
          <Input
            label="Vaccination & Dipping Summary"
            value={editForm.vaccinationSummary}
            onChange={(e) => setEditForm({ ...editForm, vaccinationSummary: e.target.value })}
          />
          <Textarea
            label="Herd Description"
            rows={3}
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditingListing(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Listing Changes
            </Button>
          </div>
        </form>
      </Modal>

      <TransactionDetailModal
        transaction={selectedTxn}
        onClose={() => setSelectedTxnId(null)}
        roleView="seller"
      />
    </WorkspaceShell>
  );
};
