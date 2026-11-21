import React, { useEffect, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Globe,
  LogOut,
  Menu,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import { cn, formatDateTime } from '../../lib/utils';
import type { UserRole } from '../../types/mariketi';
import { Button, Drawer, MariketiLogo } from '../ui/DesignSystem';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface WorkspaceShellProps {
  workspaceTitle: string;
  navItems: NavItem[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  primaryAction?: React.ReactNode;
  children: React.ReactNode;
}

const ROLE_LABELS: { role: UserRole; label: string }[] = [
  { role: 'buyer', label: 'Buyer Workspace' },
  { role: 'seller', label: 'Seller Workspace' },
  { role: 'agent', label: 'Field Agent App' },
  { role: 'centre', label: 'Collection Centre' },
  { role: 'transport', label: 'Transport Partner' },
  { role: 'admin', label: 'Admin Console' },
];

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  workspaceTitle,
  navItems,
  activeTab,
  onSelectTab,
  primaryAction,
  children,
}) => {
  const {
    currentUser,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    navigatePublic,
    loginAsRole,
    logout,
    resetDemoData,
  } = useMariketi();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const roleNotifications = notifications.filter(
    (n) => n.recipientRole === 'all' || n.recipientRole === currentUser?.role
  );
  const unreadCount = roleNotifications.filter((n) => !n.read).length;
  const activeItem = navItems.find((n) => n.id === activeTab);

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#091827] text-white">
      <div className="h-14 sm:h-16 px-4 flex items-center justify-between border-b border-white/10">
        <MariketiLogo inverted onClick={() => navigatePublic('home')} />
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden h-9 w-9 flex items-center justify-center text-white/70 hover:text-white rounded-md"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Switcher */}
      <div className="px-3 py-2.5 border-b border-white/10">
        <button
          type="button"
          onClick={() => setRoleSwitcherOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-left"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{workspaceTitle}</p>
            <p className="text-[11px] text-white/60 truncate">{currentUser?.name}</p>
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-white/60 shrink-0 transition-transform',
              roleSwitcherOpen && 'rotate-180'
            )}
          />
        </button>
        {roleSwitcherOpen && (
          <div className="mt-2 py-1 rounded-md bg-[#10243A] border border-white/10 space-y-0.5">
            {ROLE_LABELS.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => {
                  loginAsRole(r.role);
                  setRoleSwitcherOpen(false);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-1.5 text-xs flex items-center justify-between text-left hover:bg-white/10 transition-colors',
                  currentUser?.role === r.role ? 'text-[#F28C28] font-semibold' : 'text-white/80'
                )}
              >
                <span>{r.label}</span>
                {currentUser?.role === r.role && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5" aria-label="Workspace navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={cn(
                'w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-[#10243A] text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              )}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={cn('w-4 h-4 shrink-0', isActive ? 'text-[#F28C28]' : 'text-white/60')}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="font-mono text-[11px] font-semibold text-[#F28C28] tabular-nums shrink-0">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Utilities */}
      <div className="p-3 border-t border-white/10 space-y-1">
        <button
          type="button"
          onClick={() => navigatePublic('marketplace')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-white/75 hover:text-white hover:bg-white/5"
        >
          <Globe className="w-4 h-4" />
          Public Marketplace
        </button>
        <button
          type="button"
          onClick={resetDemoData}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-white/60 hover:text-white hover:bg-white/5"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Demo Data
        </button>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-white/75 hover:text-white hover:bg-white/5"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F6F7]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 max-w-[82vw] h-full">{renderSidebarContent()}</div>
          <button
            type="button"
            className="flex-1 bg-[#091827]/60"
            aria-label="Close sidebar overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 sm:h-16 bg-white border-b border-[#E5E9ED] px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden h-9 w-9 -ml-1 flex items-center justify-center text-[#10243A] hover:bg-[#F4F6F7] rounded-md shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="text-[#697784] hidden sm:inline truncate">{workspaceTitle}</span>
              <span className="text-[#697784] hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-[#10243A] truncate">
                {activeItem?.label || 'Overview'}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {primaryAction}
            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              aria-label="Open notifications"
              className="relative h-9 w-9 rounded-md border border-[#E5E9ED] bg-white hover:bg-[#F4F6F7] flex items-center justify-center text-[#10243A] shrink-0"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-[#F28C28] text-[#091827] font-mono text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 max-w-[1440px] w-full mx-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Notifications Drawer */}
      <Drawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title={`Notifications (${unreadCount} unread)`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#697784]">
              Real-time alerts for offers, verifications, logistics, and transactions.
            </p>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllNotificationsRead}>
                Mark all read
              </Button>
            )}
          </div>
          <div className="divide-y divide-[#E5E9ED] border border-[#E5E9ED] rounded-lg">
            {roleNotifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => markNotificationRead(n.id)}
                className={cn(
                  'w-full text-left p-4 transition-colors hover:bg-[#F4F6F7]',
                  !n.read && 'bg-[#FAFAF7]'
                )}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-[#697784]">
                  <span className="font-semibold text-[#10243A] capitalize">{n.category}</span>
                  <span className="font-mono text-[11px]">{formatDateTime(n.timestamp)}</span>
                </div>
                <p className="text-sm font-semibold text-[#10243A] mt-1">{n.title}</p>
                <p className="text-xs text-[#697784] mt-0.5 leading-relaxed">{n.body}</p>
              </button>
            ))}
          </div>
        </div>
      </Drawer>
    </div>
  );
};
