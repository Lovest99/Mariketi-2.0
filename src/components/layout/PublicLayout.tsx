import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useMariketi, type PublicPage } from '../../context/MariketiContext';
import { cn } from '../../lib/utils';
import { Button, MariketiLogo } from '../ui/DesignSystem';

const NAV_LINKS: { page: PublicPage; label: string }[] = [
  { page: 'marketplace', label: 'Marketplace' },
  { page: 'how-it-works', label: 'How It Works' },
  { page: 'verification', label: 'Verification' },
  { page: 'about', label: 'About' },
  { page: 'help', label: 'Help' },
];

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    publicPage,
    currentUser,
    navigatePublic,
    openAuth,
    openWorkspace,
    loginAsRole,
  } = useMariketi();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F7] text-[#17212B]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:px-4 focus:py-2 focus:rounded-md focus:bg-[#10243A] focus:text-white focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* Strict 3-zone Top Bar Contract */}
      <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-sm border-b border-[#E5E9ED]">
        <div className="max-w-[1280px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Official MARIKETI Brand Mark */}
          <MariketiLogo onClick={() => navigatePublic('home')} />

          {/* Zone 2: 5 clean single-line text navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#697784]"
          >
            {NAV_LINKS.map((link) => {
              const active = publicPage === link.page;
              return (
                <button
                  key={link.page}
                  type="button"
                  onClick={() => navigatePublic(link.page)}
                  className={cn(
                    'py-1 whitespace-nowrap shrink-0 transition-colors border-b-2',
                    active
                      ? 'text-[#10243A] border-[#F28C28] font-semibold'
                      : 'border-transparent hover:text-[#10243A] hover:border-[#E5E9ED]'
                  )}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:block">
              {currentUser ? (
                <Button variant="primary" size="md" onClick={openWorkspace}>
                  Open Workspace
                </Button>
              ) : (
                <Button variant="primary" size="md" onClick={() => openAuth('login')}>
                  Sign In
                </Button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle menu"
              className="md:hidden h-10 w-10 rounded-md border border-[#E5E9ED] flex items-center justify-center text-[#10243A]"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="md:hidden bg-white border-b border-[#E5E9ED] px-4 py-4 space-y-2">
            {NAV_LINKS.map((link) => (
              <button
                key={link.page}
                type="button"
                onClick={() => {
                  navigatePublic(link.page);
                  setMobileNavOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-md text-sm font-medium',
                  publicPage === link.page
                    ? 'bg-[#F4F6F7] text-[#10243A] font-semibold'
                    : 'text-[#697784]'
                )}
              >
                {link.label}
              </button>
            ))}
            <div className="pt-2 border-t border-[#E5E9ED]">
              {currentUser ? (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    openWorkspace();
                    setMobileNavOpen(false);
                  }}
                >
                  Open Workspace
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    openAuth('login');
                    setMobileNavOpen(false);
                  }}
                >
                  Sign In / Register
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      <main id="main-content" className="flex-1">{children}</main>

      {/* Conversion-focused Editorial Footer */}
      <footer className="bg-[#091827] text-white border-t border-white/10 mt-6">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 space-y-3.5">
              <MariketiLogo inverted onClick={() => navigatePublic('home')} />
              <p className="text-sm text-white/70 leading-relaxed max-w-sm prose-justify">
                Africa’s verified livestock trading infrastructure. Built in Zimbabwe to connect commercial ranchers, smallholder farmers, buyers, field inspectors, collection centres, and transport partners.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => navigatePublic('marketplace')}
                >
                  Explore Livestock
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-transparent text-white border-white/25 hover:bg-white/10 hover:border-white/40"
                  onClick={() => openAuth('register', 'seller')}
                >
                  List Livestock
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-white/90 tracking-wide mb-3">
                Ecosystem Portals
              </h3>
              <ul className="space-y-2 text-sm text-white/65">
                <li>
                  <button
                    type="button"
                    onClick={() => openAuth('register', 'buyer')}
                    className="hover:text-white transition-colors"
                  >
                    Buyer Registration
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openAuth('register', 'seller')}
                    className="hover:text-white transition-colors"
                  >
                    Seller Registration
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openAuth('register', 'agent')}
                    className="hover:text-white transition-colors"
                  >
                    Field Agent Application
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openAuth('register', 'transport')}
                    className="hover:text-white transition-colors"
                  >
                    Transport Partner Registration
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-white/90 tracking-wide mb-3">
                Role Workspaces (Preview)
              </h3>
              <ul className="space-y-2 text-sm text-white/65">
                <li>
                  <button type="button" onClick={() => loginAsRole('buyer')} className="hover:text-[#F28C28] transition-colors">
                    Buyer Workspace
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => loginAsRole('seller')} className="hover:text-[#F28C28] transition-colors">
                    Seller Workspace
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => loginAsRole('agent')} className="hover:text-[#F28C28] transition-colors">
                    Field Agent App (Offline)
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => loginAsRole('centre')} className="hover:text-[#F28C28] transition-colors">
                    Collection Centre Hub
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => loginAsRole('transport')} className="hover:text-[#F28C28] transition-colors">
                    Transport Partner
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => loginAsRole('admin')} className="hover:text-[#F28C28] transition-colors">
                    Operations Admin Console
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-white/90 tracking-wide mb-3">
                Trust & Legal
              </h3>
              <ul className="space-y-2 text-sm text-white/65">
                <li>
                  <button type="button" onClick={() => navigatePublic('how-it-works')} className="hover:text-white transition-colors">
                    How It Works
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigatePublic('verification')} className="hover:text-white transition-colors">
                    Verification Standards
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigatePublic('about')} className="hover:text-white transition-colors">
                    About MARIKETI
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigatePublic('contact')} className="hover:text-white transition-colors">
                    Contact Operations
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigatePublic('help')} className="hover:text-white transition-colors">
                    Help Centre
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigatePublic('terms')} className="hover:text-white transition-colors">
                    Terms of Trade
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigatePublic('privacy')} className="hover:text-white transition-colors">
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 text-xs text-white/55">
            <p>© {new Date().getFullYear()} MARIKETI Livestock Commerce (Pvt) Ltd · Harare & Bulawayo, Zimbabwe.</p>
            <p>Simulated payment states are clearly labeled across transaction workflows.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
