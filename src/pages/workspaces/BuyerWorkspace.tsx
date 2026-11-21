import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  Compass,
  FileText,
  Handshake,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Star,
  ArrowUpRight,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import { formatDate, formatUSD } from '../../lib/utils';
import { WorkspaceShell, type NavItem } from '../../components/layout/WorkspaceShell';
import { ListingCard } from '../../components/shared/ListingCard';
import { MessagingView } from '../../components/shared/MessagingView';
import { NegotiationPanel } from '../../components/shared/NegotiationPanel';
import { TransactionDetailModal } from '../../components/shared/TransactionDetailModal';
import { MarketplacePage } from '../public/MarketplacePage';
import {
  Button,
  EmptyState,
  Input,
  MetricCell,
  StatusLabel,
} from '../../components/ui/DesignSystem';

export const BuyerWorkspace: React.FC = () => {
  const {
    currentUser,
    listings,
    offers,
    transactions,
    conversations,
    reviews,
    savedListingIds,
    compareListingIds,
    navigatePublic,
    toggleSaveListing,
    toggleCompareListing,
    updateCurrentUserProfile,
  } = useMariketi();

  const [tab, setTab] = useState('overview');
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    name: currentUser?.name || '',
    org: currentUser?.organization || '',
    phone: currentUser?.phone || '',
    district: currentUser?.district || '',
  });

  useEffect(() => {
    setSettingsForm({
      name: currentUser?.name || '',
      org: currentUser?.organization || '',
      phone: currentUser?.phone || '',
      district: currentUser?.district || '',
    });
  }, [currentUser?.id, currentUser?.name, currentUser?.organization, currentUser?.phone, currentUser?.district]);

  const activeOffers = offers.filter((o) => o.status === 'pending' || o.status === 'countered');
  const activeOrders = transactions.filter((t) => t.state !== 'Completed' && t.state !== 'Cancelled');
  const completedOrders = transactions.filter((t) => t.state === 'Completed');
  const savedListings = listings.filter((l) => savedListingIds.includes(l.id));
  const selectedTxn = transactions.find((t) => t.id === selectedTxnId) || null;
  const unreadMessagesCount = conversations.reduce(
    (sum, c) => sum + c.messages.filter((m) => !m.read && m.senderId !== currentUser?.id).length,
    0
  );

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'discover', label: 'Discover Livestock', icon: Compass },
    { id: 'saved', label: 'Saved Lots', icon: Bookmark, badge: savedListings.length },
    { id: 'offers', label: 'Offers & Negotiations', icon: Handshake, badge: activeOffers.length },
    { id: 'transactions', label: 'Orders & Transactions', icon: FileText, badge: activeOrders.length },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessagesCount },
    { id: 'reviews', label: 'My Reviews', icon: Star },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <WorkspaceShell
      workspaceTitle="Buyer Workspace"
      navItems={navItems}
      activeTab={tab}
      onSelectTab={setTab}
      primaryAction={
        <Button variant="accent" size="sm" onClick={() => setTab('discover')}>
          Browse Stock
        </Button>
      }
    >
      {tab === 'overview' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#10243A]">
              Welcome back, {currentUser?.name}
            </h1>
            <p className="text-sm text-[#697784] mt-0.5">
              {currentUser?.organization} · Procurement overview across verified Zimbabwean farms.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <MetricCell label="Active Offers" value={activeOffers.length} detail="Open negotiations" />
            <MetricCell
              label="Pending Purchases"
              value={offers.filter((o) => o.status === 'accepted').length}
              detail="Ready to initiate"
            />
            <MetricCell label="Active Orders" value={activeOrders.length} detail="In transit / handover" />
            <MetricCell label="Completed Purchases" value={completedOrders.length} detail="Verified handovers" />
            <MetricCell
              label="Saved Listings"
              value={savedListings.length}
              detail="Shortlisted lots"
              className="col-span-2 lg:col-span-1"
            />
          </div>

          {/* Active Transactions Responsive Register */}
          <div className="bg-white border border-[#E5E9ED] rounded-lg overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#E5E9ED] flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#10243A]">Active Orders & Handovers</h2>
              <Button variant="ghost" size="sm" onClick={() => setTab('transactions')}>
                View all
              </Button>
            </div>

            {/* Mobile stacked cards */}
            <div className="md:hidden divide-y divide-[#E5E9ED]">
              {transactions.map((txn) => (
                <div key={txn.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-[#10243A]">{txn.reference}</span>
                    <StatusLabel
                      tone={
                        txn.state === 'Completed'
                          ? 'success'
                          : txn.state === 'Disputed'
                          ? 'danger'
                          : 'info'
                      }
                      label={txn.state}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#17212B]">
                      {txn.listingTitle} ({txn.quantity} head)
                    </p>
                    <p className="text-xs text-[#697784] mt-0.5">Seller: {txn.sellerName}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-sm font-bold text-[#10243A] tabular-nums">
                      {formatUSD(txn.agreedAmountUsd)}
                    </span>
                    <Button variant="secondary" size="sm" onClick={() => setSelectedTxnId(txn.id)}>
                      Manage
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF7] border-b border-[#E5E9ED] text-[#697784]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Reference</th>
                    <th className="py-3 px-4 font-semibold">Livestock Lot</th>
                    <th className="py-3 px-4 font-semibold">Seller</th>
                    <th className="py-3 px-4 font-semibold text-right">Agreed (USD)</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9ED]">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-[#FAFAF7]">
                      <td className="py-3 px-4 font-mono font-semibold text-[#10243A]">
                        {txn.reference}
                      </td>
                      <td className="py-3 px-4 text-[#17212B] font-medium">
                        {txn.listingTitle} ({txn.quantity} head)
                      </td>
                      <td className="py-3 px-4 text-[#697784]">{txn.sellerName}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-right text-[#10243A] tabular-nums">
                        {formatUSD(txn.agreedAmountUsd)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusLabel
                          tone={
                            txn.state === 'Completed'
                              ? 'success'
                              : txn.state === 'Disputed'
                              ? 'danger'
                              : 'info'
                          }
                          label={txn.state}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedTxnId(txn.id)}
                          className="text-xs font-semibold text-[#10243A] hover:text-[#C96A0F] inline-flex items-center gap-1"
                        >
                          Manage
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'discover' && (
        <MarketplacePage
          embedded
          onOpenListing={(id) => navigatePublic('listing-detail', id)}
        />
      )}

      {tab === 'saved' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-[#10243A]">Saved Livestock Lots</h1>
          {savedListings.length === 0 ? (
            <EmptyState
              title="No saved lots yet"
              description="Bookmark verified listings while browsing to compare herds and track price changes."
              action={
                <Button variant="primary" onClick={() => setTab('discover')}>
                  Explore Marketplace
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedListings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  saved
                  compared={compareListingIds.includes(l.id)}
                  onOpen={(id) => navigatePublic('listing-detail', id)}
                  onToggleSave={toggleSaveListing}
                  onToggleCompare={toggleCompareListing}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'offers' && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-[#10243A]">Offers & Negotiations</h1>
            <p className="text-xs text-[#697784] mt-0.5">
              Counter-offer, accept seller terms, or convert accepted offers into traceable transactions.
            </p>
          </div>
          <NegotiationPanel
            roleView="buyer"
            onTransactionCreated={() => setTab('transactions')}
          />
        </div>
      )}

      {tab === 'transactions' && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-[#10243A]">Orders & Transactions</h1>
            <p className="text-xs text-[#697784] mt-0.5">
              Click any transaction to manage simulated settlement confirmation, collection check-in, delivery tracking, handover PIN, or disputes.
            </p>
          </div>
          <div className="space-y-3">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="bg-white border border-[#E5E9ED] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#697784]">
                    <span className="font-mono font-bold text-[#10243A]">{txn.reference}</span>
                    <span aria-hidden="true">·</span>
                    <span>Seller: {txn.sellerName}</span>
                    <span aria-hidden="true">·</span>
                    <span>Handover PIN: <strong className="font-mono text-[#10243A]">{txn.handoverCode}</strong></span>
                  </div>
                  <h3 className="text-[15px] font-bold text-[#10243A] leading-snug">
                    {txn.listingTitle} ({txn.quantity} head)
                  </h3>
                  <p className="text-xs text-[#697784]">
                    {txn.pickupLocation} → {txn.deliveryLocation}
                  </p>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[#E5E9ED] shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-base sm:text-lg font-bold font-mono text-[#10243A] tabular-nums">
                      {formatUSD(txn.agreedAmountUsd)}
                    </p>
                    <StatusLabel
                      tone={txn.state === 'Completed' ? 'success' : txn.state === 'Disputed' ? 'danger' : 'info'}
                      label={txn.state}
                    />
                  </div>
                  <Button variant="primary" size="sm" onClick={() => setSelectedTxnId(txn.id)}>
                    Open Transaction
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'messages' && <MessagingView />}

      {tab === 'reviews' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-[#10243A]">Published Seller Reviews</h1>
          <div className="space-y-3">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-white border border-[#E5E9ED] rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                  <span className="font-bold text-[#10243A]">
                    {rev.sellerName} · <span className="font-mono text-[#697784]">{rev.transactionRef}</span>
                  </span>
                  <span className="font-mono font-bold text-[#10243A]">
                    {rev.rating.toFixed(1)} / 5.0 · {formatDate(rev.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-[#697784] mt-2 leading-relaxed prose-justify">{rev.comment}</p>
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
              name: settingsForm.name.trim(),
              organization: settingsForm.org.trim(),
              phone: settingsForm.phone.trim(),
              district: settingsForm.district.trim(),
            });
          }}
          className="bg-white border border-[#E5E9ED] rounded-lg p-5 max-w-xl space-y-4"
        >
          <h1 className="text-lg font-bold text-[#10243A]">Buyer Profile & Procurement Settings</h1>
          <Input
            label="Full Name"
            value={settingsForm.name}
            onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
          />
          <Input
            label="Business / Organization"
            value={settingsForm.org}
            onChange={(e) => setSettingsForm({ ...settingsForm, org: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Phone"
              value={settingsForm.phone}
              onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
            />
            <Input
              label="Primary District"
              value={settingsForm.district}
              onChange={(e) => setSettingsForm({ ...settingsForm, district: e.target.value })}
            />
          </div>
          <Button type="submit" variant="primary">
            Save Changes
          </Button>
        </form>
      )}

      <TransactionDetailModal
        transaction={selectedTxn}
        onClose={() => setSelectedTxnId(null)}
        roleView="buyer"
      />
    </WorkspaceShell>
  );
};
