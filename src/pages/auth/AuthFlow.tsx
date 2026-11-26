import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Shield,
  ShoppingBag,
  Tractor,
  Truck,
  Warehouse,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import {
  cn,
  getCountry,
  getDistrictsForProvince,
  getProvincesForCountry,
} from '../../lib/utils';
import type { UserRole } from '../../types/mariketi';
import { CountrySelect } from '../../components/shared/CountrySelect';
import { Button, Input, MariketiLogo, Select } from '../../components/ui/DesignSystem';

const ROLES: {
  role: UserRole;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { role: 'buyer', title: 'Buyer', desc: 'Source verified cattle, goats, sheep & commercial lots', icon: ShoppingBag },
  { role: 'seller', title: 'Seller / Farmer', desc: 'List herds, request inspections & negotiate directly', icon: Tractor },
  { role: 'agent', title: 'Field Agent', desc: 'Inspect livestock on-farm with offline mobile sync', icon: ClipboardCheck },
  { role: 'centre', title: 'Collection Centre', desc: 'Manage intake pens, weighbridges & handover release', icon: Warehouse },
  { role: 'transport', title: 'Transport Partner', desc: 'Accept corridor haulage jobs & log proof of delivery', icon: Truck },
  { role: 'admin', title: 'Operations Admin', desc: 'Approve users, assign inspections & resolve disputes', icon: Shield },
];

const regStep1Schema = z.object({
  name: z.string().min(2, 'Enter your full name').max(120, 'Name must be under 120 characters'),
  country: z.string().min(2, 'Select your country'),
  phone: z.string().min(7, 'Enter a valid African or international phone number').max(40),
  province: z.string().min(2, 'Select a province or county'),
  district: z.string().min(2, 'Select a district or town'),
});

const GoogleMark: React.FC = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export const AuthFlow: React.FC = () => {
  const {
    authInitialMode,
    authPreselectedRole,
    firebaseUser,
    authLoading,
    needsOnboarding,
    signInWithGoogle,
    loginAsRole,
    registerUser,
  } = useMariketi();

  const [mode, setMode] = useState<'login' | 'register'>(
    needsOnboarding || authInitialMode === 'register' ? 'register' : 'login'
  );
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    authPreselectedRole && authPreselectedRole !== 'admin' ? authPreselectedRole : 'buyer'
  );
  const [regForm, setRegForm] = useState({
    name: firebaseUser?.displayName || '',
    country: 'Zimbabwe',
    phone: '+263 ',
    province: 'Matabeleland South',
    district: 'Gwanda',
    organization: '',
    detailA: '',
    detailB: '',
  });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (needsOnboarding) {
      setMode('register');
    }
    if (firebaseUser?.displayName && !regForm.name) {
      setRegForm((prev) => ({ ...prev, name: firebaseUser.displayName || prev.name }));
    }
  }, [needsOnboarding, firebaseUser?.displayName, regForm.name]);

  const selectedCountry = getCountry(regForm.country);
  const provinces = getProvincesForCountry(regForm.country);
  const districts = getDistrictsForProvince(regForm.country, regForm.province);

  const handleCountryChange = (newCountryName: string) => {
    const nextCountry = getCountry(newCountryName);
    const nextProvinces = Object.keys(nextCountry.provinces);
    const firstProvince = nextProvinces[0] || '';
    const firstDistrict = nextCountry.provinces[firstProvince]?.[0] || '';

    const currentTrimmed = regForm.phone.trim();
    const oldDial = selectedCountry.dialCode;
    const localDigits = currentTrimmed.startsWith(oldDial)
      ? currentTrimmed.slice(oldDial.length).trim()
      : currentTrimmed.replace(/^\+\d+\s*/, '');

    setRegForm({
      ...regForm,
      country: nextCountry.name,
      province: firstProvince,
      district: firstDistrict,
      phone: localDigits ? `${nextCountry.dialCode} ${localDigits}` : `${nextCountry.dialCode} `,
    });
  };

  const handleNextStep = () => {
    const check = regStep1Schema.safeParse(regForm);
    if (!check.success) {
      const errs: Record<string, string> = {};
      check.error.issues.forEach((i) => {
        errs[String(i.path[0])] = i.message;
      });
      setRegErrors(errs);
      return;
    }
    setRegErrors({});
    setRegStep(2);
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.organization.trim()) {
      setRegErrors({ organization: 'Please provide your farm, business, or operating name' });
      return;
    }
    setRegErrors({});
    await registerUser({
      name: regForm.name.trim(),
      email: firebaseUser?.email || '',
      phone: regForm.phone.trim(),
      role: selectedRole,
      organization: regForm.organization.trim(),
      country: regForm.country,
      province: regForm.province,
      district: regForm.district,
      meta: { detailA: regForm.detailA.trim(), detailB: regForm.detailB.trim() },
    });
  };

  const roleSpecificLabels: Record<UserRole, { org: string; a: string; b: string }> = {
    buyer: {
      org: 'Business / Abattoir / Farm Name',
      a: 'Primary Livestock Interest (e.g. Boran Steers, Boer Goats)',
      b: 'Typical Monthly Procurement Volume (Head)',
    },
    seller: {
      org: 'Farm / Ranch / Cooperative Name',
      a: 'Seller Classification (Commercial Stud, Ranch, Pastoralist Co-op)',
      b: `${selectedCountry.vetAuthority} / Veterinary Registration Ref (Optional)`,
    },
    agent: {
      org: 'Assigned Field Region / Station',
      a: 'Agricultural / Veterinary Qualifications',
      b: 'Years of Livestock Inspection Experience',
    },
    centre: {
      org: 'Collection Centre Facility Name',
      a: 'Total Kraal / Pen Capacity (Head)',
      b: 'Weighbridge & Biosecurity Certification Ref',
    },
    transport: {
      org: 'Haulage Company Name',
      a: 'Vehicle Fleet Count & Capacity (Head)',
      b: 'Primary Operating Corridors (e.g. Harare–Gaborone, Nairobi–Arusha)',
    },
    admin: {
      org: 'MARIKETI Operations Unit',
      a: 'Operational Clearance Scope',
      b: 'Employee ID',
    },
  };

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Google Sign-In & Pan-African Role Onboarding */}
        <div className="lg:col-span-7 bg-white border border-[#DFE6EE] rounded-xl shadow-[0_4px_18px_rgba(16,36,58,0.05)] p-5 sm:p-6">
          <div className="pb-4 mb-4 border-b border-[#DFE6EE] flex items-center justify-between gap-3">
            <MariketiLogo />
            <span className="text-xs font-mono font-medium text-[#526071] hidden sm:inline">
              Pan-African Access · 54 Nations
            </span>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#EEF3F8] border border-[#DFE6EE] rounded-lg mb-5">
            {(
              [
                ['login', 'Sign In'],
                ['register', 'Complete Profile / Register'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'h-9 px-3 rounded-md text-xs font-semibold transition-all duration-150 whitespace-nowrap truncate focus-visible:outline-2 focus-visible:outline-[#F28C28]',
                  mode === m
                    ? 'bg-white text-[#10243A] shadow-[0_1px_3px_rgba(16,36,58,0.09)]'
                    : 'text-[#526071] hover:text-[#10243A]'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'login' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#10243A]">Sign in to MARIKETI</h1>
                <p className="text-xs sm:text-sm text-[#526071] mt-1 leading-relaxed">
                  Authenticate securely with your Google account to manage verified livestock listings, offers, inspections, haulage, and trade records across Africa.
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={authLoading}
                onClick={() => void signInWithGoogle()}
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GoogleMark />
                )}
                Continue with Google
              </Button>

              <div className="p-4 rounded-lg bg-[#F7F9FC] border border-[#DFE6EE] space-y-2 text-xs text-[#526071]">
                <p className="font-semibold text-[#10243A] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1A7A50]" />
                  Verified Pan-African Account Protection
                </p>
                <p className="leading-relaxed">
                  First-time users will be guided to select their operational role (Buyer, Seller, Field Agent, Collection Centre, or Transport Partner) and African country corridor right after connecting Google.
                </p>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-5">
              {firebaseUser && (
                <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#065F46] flex items-center justify-between gap-2">
                  <span className="font-medium truncate">
                    Connected Google account: <strong>{firebaseUser.email}</strong>
                  </span>
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#059669]" />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between text-xs text-[#526071] mb-1.5">
                  <span className="font-medium">
                    Pan-African Account Onboarding · {selectedCountry.flag} {selectedCountry.name}
                  </span>
                  <span className="font-mono font-semibold text-[#10243A]">Step {regStep} of 2</span>
                </div>
                <div className="h-1.5 bg-[#E5ECF2] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F28C28] transition-all duration-200"
                    style={{ width: `${(regStep / 2) * 100}%` }}
                  />
                </div>
              </div>

              {regStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#10243A] mb-2">
                      1. Select your primary role on MARIKETI
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {ROLES.filter((r) => r.role !== 'admin').map((r) => {
                        const Icon = r.icon;
                        const active = selectedRole === r.role;
                        return (
                          <button
                            key={r.role}
                            type="button"
                            onClick={() => setSelectedRole(r.role)}
                            className={cn(
                              'p-3 rounded-lg border text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#F28C28]',
                              active
                                ? 'border-[#10243A] bg-[#10243A] text-white shadow-[0_3px_10px_rgba(16,36,58,0.18)]'
                                : 'border-[#D4DDE6] bg-white hover:bg-[#F7F9FC] hover:border-[#B6C3D1] text-[#0F1B2A]'
                            )}
                          >
                            <Icon
                              className={cn(
                                'w-4 h-4 mb-1.5',
                                active ? 'text-[#F69B3D]' : 'text-[#1E547A]'
                              )}
                            />
                            <p className="text-xs font-bold">{r.title}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CountrySelect
                      label="Country (All 54 African Nations)"
                      value={regForm.country}
                      onChange={handleCountryChange}
                      showDialCode
                    />
                    <Input
                      label={`Phone Number (${selectedCountry.flag} ${selectedCountry.dialCode})`}
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      error={regErrors.phone}
                    />
                  </div>

                  <Input
                    label="Full Name"
                    placeholder="e.g. Tatenda Moyo or Amina Ochieng"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    error={regErrors.name}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Province / County / State"
                      value={regForm.province}
                      onChange={(e) => {
                        const p = e.target.value;
                        const nextDistricts = getDistrictsForProvince(regForm.country, p);
                        setRegForm({
                          ...regForm,
                          province: p,
                          district: nextDistricts[0] || '',
                        });
                      }}
                    >
                      {provinces.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="District / Town"
                      value={regForm.district}
                      onChange={(e) => setRegForm({ ...regForm, district: e.target.value })}
                    >
                      {districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <Button variant="primary" size="lg" className="w-full" onClick={handleNextStep}>
                    Continue to {ROLES.find((r) => r.role === selectedRole)?.title} Details
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {regStep === 2 && (
                <form onSubmit={handleCompleteOnboarding} className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#1E547A]">
                    <span>
                      Tailored {ROLES.find((r) => r.role === selectedRole)?.title} Setup
                    </span>
                    <span className="text-[#526071] font-medium">
                      {selectedCountry.flag} {regForm.district}, {regForm.country}
                    </span>
                  </div>
                  <Input
                    label={roleSpecificLabels[selectedRole].org}
                    value={regForm.organization}
                    onChange={(e) => setRegForm({ ...regForm, organization: e.target.value })}
                    error={regErrors.organization}
                  />
                  <Input
                    label={roleSpecificLabels[selectedRole].a}
                    value={regForm.detailA}
                    onChange={(e) => setRegForm({ ...regForm, detailA: e.target.value })}
                  />
                  <Input
                    label={roleSpecificLabels[selectedRole].b}
                    value={regForm.detailB}
                    onChange={(e) => setRegForm({ ...regForm, detailB: e.target.value })}
                  />
                  <div className="flex justify-between gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={() => setRegStep(1)}>
                      Back
                    </Button>
                    <Button type="submit" variant="accent" disabled={authLoading}>
                      {authLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : !firebaseUser ? (
                        <GoogleMark />
                      ) : null}
                      {firebaseUser
                        ? 'Save Profile & Open Workspace'
                        : 'Continue with Google & Finish'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right: Role Workspace Access */}
        <div className="lg:col-span-5 surface-navy-editorial text-white rounded-xl border border-white/10 shadow-[0_14px_36px_rgba(9,24,39,0.22)] p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#F69B3D]">Pan-African Workspaces</p>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1">Enter your MARIKETI role workspace</h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed prose-justify">
              Built for Southern Africa, East Africa, and the whole continent. Select a workspace below to sign in with Google and access dedicated role tools.
            </p>
          </div>

          <div className="space-y-2">
            {ROLES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.role}
                  type="button"
                  disabled={authLoading}
                  onClick={() => loginAsRole(item.role)}
                  className="w-full p-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 hover:border-white/25 text-left flex items-center justify-between gap-3 transition-all duration-150 group focus-visible:outline-2 focus-visible:outline-[#F28C28] disabled:opacity-60"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 text-[#F69B3D] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-white leading-snug">{item.title} Workspace</p>
                      <p className="text-[11px] text-slate-300 mt-0.5 truncate">{item.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#F69B3D] group-hover:translate-x-0.5 shrink-0 transition-all duration-150" />
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/12 text-[11px] text-slate-300 flex items-center justify-between gap-2">
            <span>Active corridors</span>
            <span className="tracking-wider">🇿🇼 🇿🇦 🇧🇼 🇰🇪 🇹🇿 🇺🇬 🇳🇬 +47</span>
          </div>
        </div>
      </div>
    </div>
  );
};
