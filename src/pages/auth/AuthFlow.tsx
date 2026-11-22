import React, { useState } from 'react';
import { z } from 'zod';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
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
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email address'),
  country: z.string().min(2, 'Select your country'),
  phone: z.string().min(7, 'Enter a valid African or international phone number'),
  province: z.string().min(2, 'Select a province or county'),
  district: z.string().min(2, 'Select a district or town'),
});

export const AuthFlow: React.FC = () => {
  const {
    authInitialMode,
    authPreselectedRole,
    loginAsRole,
    loginWithCredentials,
    registerUser,
    pushToast,
  } = useMariketi();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(authInitialMode);
  const [email, setEmail] = useState('tendai.moyo@zimbeefprocurement.co.zw');
  const [password, setPassword] = useState('••••••••••••');
  const [loginError, setLoginError] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);

  // Registration & Role-Tailored Pan-African Onboarding
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    authPreselectedRole || 'buyer'
  );
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    country: 'Zimbabwe',
    phone: '+263 ',
    province: 'Matabeleland South',
    district: 'Gwanda',
    organization: '',
    detailA: '',
    detailB: '',
    verifyCode: '482910',
  });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  const selectedCountry = getCountry(regForm.country);
  const provinces = getProvincesForCountry(regForm.country);
  const districts = getDistrictsForProvince(regForm.country, regForm.province);

  const handleCountryChange = (newCountryName: string) => {
    const nextCountry = getCountry(newCountryName);
    const nextProvinces = Object.keys(nextCountry.provinces);
    const firstProvince = nextProvinces[0] || '';
    const firstDistrict = nextCountry.provinces[firstProvince]?.[0] || '';

    // Replace previous dial code prefix cleanly while preserving typed local digits
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = loginWithCredentials(email);
    if (!ok) {
      setLoginError(
        'No account found for that email. Try one of the instant role workspace cards on the right or register a new account.'
      );
    }
  };

  const handleNextStep = () => {
    if (regStep === 1) {
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
    } else if (regStep === 2) {
      if (!regForm.organization.trim()) {
        setRegErrors({ organization: 'Please provide your farm, business, or operating name' });
        return;
      }
      setRegErrors({});
      setRegStep(3);
    }
  };

  const handleCompleteOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    registerUser({
      name: regForm.name,
      email: regForm.email,
      phone: regForm.phone,
      role: selectedRole,
      organization: regForm.organization,
      country: regForm.country,
      province: regForm.province,
      district: regForm.district,
      meta: { detailA: regForm.detailA, detailB: regForm.detailB },
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
        {/* Left: Auth / Tailored Pan-African Onboarding Form */}
        <div className="lg:col-span-7 bg-white border border-[#DFE6EE] rounded-xl shadow-[0_4px_18px_rgba(16,36,58,0.05)] p-5 sm:p-6">
          <div className="pb-4 mb-4 border-b border-[#DFE6EE] flex items-center justify-between gap-3">
            <MariketiLogo />
            <span className="text-xs font-mono font-medium text-[#526071] hidden sm:inline">
              Pan-African Access · 54 Nations
            </span>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#EEF3F8] border border-[#DFE6EE] rounded-lg mb-5">
            {(
              [
                ['login', 'Sign In'],
                ['register', 'Register'],
                ['forgot', 'Recover'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setLoginError('');
                }}
                className={cn(
                  'h-9 px-2 rounded-md text-xs font-semibold transition-all duration-150 whitespace-nowrap truncate focus-visible:outline-2 focus-visible:outline-[#F28C28]',
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
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#10243A]">Sign in to MARIKETI</h1>
                <p className="text-xs sm:text-sm text-[#526071] mt-1">
                  Enter your registered account email to open your role-specific workspace across Africa.
                </p>
              </div>
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {loginError && <p className="text-xs font-medium text-[#C53939]">{loginError}</p>}
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Sign In to Workspace
              </Button>
            </form>
          )}

          {mode === 'forgot' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-[#10243A]">Password Recovery</h1>
                <p className="text-sm text-[#526071] mt-1">
                  We will send a secure reset code to your verified MARIKETI email address.
                </p>
              </div>
              {recoverySent ? (
                <div className="p-4 rounded-lg bg-[#F7F9FC] border border-[#DFE6EE] text-sm text-[#0F1B2A] flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#1A7A50] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#10243A]">Recovery link dispatched (simulated)</p>
                    <p className="text-xs text-[#526071] mt-1">
                      Check {email} for reset instructions or return to Sign In.
                    </p>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setRecoverySent(true);
                    pushToast('Recovery email sent', 'info');
                  }}
                  className="space-y-4"
                >
                  <Input
                    label="Account Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Button type="submit" variant="primary" size="lg" className="w-full">
                    Send Reset Link
                  </Button>
                </form>
              )}
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between text-xs text-[#526071] mb-1.5">
                  <span className="font-medium">
                    Pan-African Account Onboarding · {selectedCountry.flag} {selectedCountry.name}
                  </span>
                  <span className="font-mono font-semibold text-[#10243A]">Step {regStep} of 3</span>
                </div>
                <div className="h-1.5 bg-[#E5ECF2] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F28C28] transition-all duration-200"
                    style={{ width: `${(regStep / 3) * 100}%` }}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      placeholder="e.g. Tatenda Moyo or Amina Ochieng"
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      error={regErrors.name}
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="name@farm-or-business.africa"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      error={regErrors.email}
                    />
                  </div>

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
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#1E547A]">
                    <span className="inline-flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
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
                    <Button variant="secondary" onClick={() => setRegStep(1)}>
                      Back
                    </Button>
                    <Button variant="primary" onClick={handleNextStep}>
                      Continue to Verification
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {regStep === 3 && (
                <form onSubmit={handleCompleteOnboarding} className="space-y-4">
                  <div className="p-4 rounded-lg bg-[#F7F9FC] border border-[#DFE6EE] text-xs text-[#526071] space-y-1">
                    <p className="font-semibold text-[#10243A]">
                      Email Verification (Demo Step) · {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.region})
                    </p>
                    <p>
                      A 6-digit verification code has been pre-filled for <strong className="text-[#10243A]">{regForm.email}</strong>. Confirm to activate your {selectedRole} workspace.
                    </p>
                  </div>
                  <Input
                    label="6-Digit Verification Code"
                    value={regForm.verifyCode}
                    onChange={(e) => setRegForm({ ...regForm, verifyCode: e.target.value })}
                    className="font-mono tracking-widest"
                    required
                  />
                  <div className="flex justify-between gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={() => setRegStep(2)}>
                      Back
                    </Button>
                    <Button type="submit" variant="accent">
                      Complete Setup & Open Workspace
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right: Instant Role Workspace Access */}
        <div className="lg:col-span-5 surface-navy-editorial text-white rounded-xl border border-white/10 shadow-[0_14px_36px_rgba(9,24,39,0.22)] p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#F69B3D] uppercase tracking-wider">Interactive Ecosystem Preview</p>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1">Switch directly into any MARIKETI role</h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed prose-justify">
              Built for Southern Africa, East Africa, and the whole continent. Every role has its own dedicated navigation, permissions, and live operational state.
            </p>
          </div>

          <div className="space-y-2">
            {ROLES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => loginAsRole(item.role)}
                  className="w-full p-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 hover:border-white/25 text-left flex items-center justify-between gap-3 transition-all duration-150 group focus-visible:outline-2 focus-visible:outline-[#F28C28]"
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
