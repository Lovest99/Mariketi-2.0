import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  ClipboardCheck,
  Download,
  FileText,
  History,
  LayoutDashboard,
  ListChecks,
  Settings,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import { formatDateTime, formatUSD } from '../../lib/utils';
import type { UserRole } from '../../types/mariketi';
import { WorkspaceShell, type NavItem } from '../../components/layout/WorkspaceShell';
import { TransactionDetailModal } from '../../components/shared/TransactionDetailModal';
import {
  Button,
  EmptyState,
  Input,
  MetricCell,
  Select,
  StatusLabel,
  Textarea,
} from '../../components/ui/DesignSystem';

const VOLUME_SERIES = [
  { month: 'Jun', volume: 48200, fees: 1446 },
  { month: 'Jul', volume: 63900, fees: 1917 },
  { month: 'Aug', volume: 59100, fees: 1773 },
  { month: 'Sep', volume: 81400, fees: 2442 },
  { month: 'Oct', volume: 96500, fees: 2895 },
  { month: 'Nov', volume: 112800, fees: 3384 },
];

export const AdminWorkspace: React.FC = () => {
  const {
    users,
    listings,
    transactions,
    centreRecords,
    transportJobs,
    disputes,
    auditLogs,
    updateUserStatus,
    approveListingVerification,
    updateListingStatus,
    assignFieldTask,
    resolveDispute,
    sendAdminBroadcast,
    pushToast,
  } = useMariketi();

  const [tab, setTab] = useState('overview');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState<Record<string, string>>({});
  const [broadcast, setBroadcast] = useState({
    recipientRole: 'all' as UserRole | 'all',
    title: '',
    body: '',
  });

  const activeUsers = users.filter((u) => u.status === 'active').length;
  const activeListings = listings.filter((l) => l.status === 'active').length;
  const pendingVerifications = listings.filter((l) => l.verificationStatus !== 'Verified');
  const completedTxns = transactions.filter((t) => t.state === 'Completed').length;
  const txnVolume = transactions.reduce((s, t) => s + t.agreedAmountUsd, 0);
  const openDisputes = disputes.filter((d) => d.status !== 'Resolved');
  const agents = users.filter((u) => u.role === 'agent');
  const selectedTxn = transactions.find((t) => t.id === selectedTxnId) || null;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    listings.forEach((l) => {
      map[l.category] = (map[l.category] || 0) + l.quantity;
    });
    return Object.entries(map).map(([category, head]) => ({ category, head }));
  }, [listings]);

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users & Roles', icon: Users, badge: users.length },
    { id: 'listings', label: 'Listings Moderation', icon: ListChecks },
    { id: 'verification', label: 'Verification Queue', icon: ClipboardCheck, badge: pendingVerifications.length },
    { id: 'logistics', label: 'Centres & Transport', icon: Truck },
    { id: 'transactions', label: 'Transactions & Ledger', icon: FileText },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle, badge: openDisputes.length },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'notifications', label: 'Broadcasts', icon: Bell },
    { id: 'audit', label: 'Audit Logs', icon: History },
    { id: 'settings', label: 'Platform Settings', icon: Settings },
  ];

  const handleExportCsv = () => {
    const rows = [
      ['Reference', 'Buyer', 'Seller', 'Livestock', 'Qty', 'Agreed USD', 'State'],
      ...transactions.map((t) => [
        t.reference,
        t.buyerName,
        t.sellerName,
        t.listingTitle,
        String(t.quantity),
        String(t.agreedAmountUsd),
        t.state,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mariketi-transactions-report.csv';
    a.click();
    URL.revokeObjectURL(url);
    pushToast('CSV report exported', 'success');
  };

  return (
    <WorkspaceShell
      workspaceTitle="Operations Admin"
      navItems={navItems}
      activeTab={tab}
      onSelectTab={setTab}
      primaryAction={
        <Button variant="secondary" size="sm" onClick={handleExportCsv}>
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      }
    >
      {tab === 'overview' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#10243A]">MARIKETI Operations Console</h1>
            <p className="text-sm text-[#697784] mt-0.5">
              National oversight across verified farmers, commercial buyers, field inspectors, collection hubs, and haulage.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <MetricCell label="Registered Users" value={users.length} detail={`${activeUsers} active accounts`} />
            <MetricCell label="Active Listings" value={activeListings} detail={`${pendingVerifications.length} pending inspection`} />
            <MetricCell label="Transaction Volume" value={formatUSD(txnVolume)} detail={`${completedTxns} completed`} />
            <MetricCell label="Open Disputes" value={openDisputes.length} detail="Active investigations" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 min-w-0 bg-white border border-[#E5E9ED] rounded-lg p-4 sm:p-5">
              <h2 className="text-sm font-bold text-[#10243A] mb-0.5">
                Marketplace Trade Volume Trend (USD)
              </h2>
              <p className="text-xs text-[#697784] mb-3.5">Simulated platform GMV growth across Zimbabwe</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={VOLUME_SERIES}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E9ED" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#697784' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#697784' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [formatUSD(Number(v || 0)), 'Volume']} />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="#10243A"
                      strokeWidth={2}
                      fill="#245B83"
                      fillOpacity={0.14}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 min-w-0 bg-white border border-[#E5E9ED] rounded-lg p-4 sm:p-5">
              <h2 className="text-sm font-bold text-[#10243A] mb-0.5">
                Listed Headcount by Species
              </h2>
              <p className="text-xs text-[#697784] mb-3.5">Live inventory across active lots</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E9ED" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#697784' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="category" width={92} tick={{ fontSize: 11, fill: '#17212B' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="head" fill="#F28C28" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-[#10243A]">Users & Role Access Control</h1>
            <div className="flex flex-wrap gap-1.5">
              {['all', 'buyer', 'seller', 'agent', 'centre', 'transport', 'admin'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setUserRoleFilter(r)}
                  className={`h-8 px-3 rounded-md text-xs font-medium capitalize border ${
                    userRoleFilter === r
                      ? 'bg-[#10243A] text-white border-[#10243A]'
                      : 'bg-white text-[#17212B] border-[#E5E9ED]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E5E9ED] rounded-lg overflow-hidden">
            {/* Mobile stacked cards */}
            <div className="md:hidden divide-y divide-[#E5E9ED]">
              {users
                .filter((u) => userRoleFilter === 'all' || u.role === userRoleFilter)
                .map((u) => (
                  <div key={u.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="capitalize font-semibold text-[#245B83]">{u.role}</span>
                      <StatusLabel
                        tone={
                          u.status === 'active'
                            ? 'success'
                            : u.status === 'suspended'
                            ? 'danger'
                            : 'warning'
                        }
                        label={`${u.status}${u.verified ? ' · Verified' : ''}`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#10243A]">{u.name}</p>
                      <p className="text-xs text-[#697784] mt-0.5">
                        {u.organization || u.email} · {u.phone}
                      </p>
                      <p className="text-xs text-[#697784]">
                        {u.district}, {u.province}
                      </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      {u.status !== 'active' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => updateUserStatus(u.id, 'active', true)}
                        >
                          Approve
                        </Button>
                      )}
                      {u.status === 'active' && u.role !== 'admin' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateUserStatus(u.id, 'suspended')}
                        >
                          Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF7] border-b border-[#E5E9ED] text-[#697784]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">User / Organization</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Region</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9ED]">
                  {users
                    .filter((u) => userRoleFilter === 'all' || u.role === userRoleFilter)
                    .map((u) => (
                      <tr key={u.id} className="hover:bg-[#FAFAF7]">
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#10243A]">{u.name}</p>
                          <p className="text-[#697784]">
                            {u.organization || u.email} · {u.phone}
                          </p>
                        </td>
                        <td className="py-3 px-4 capitalize font-semibold text-[#245B83]">{u.role}</td>
                        <td className="py-3 px-4 text-[#697784]">
                          {u.district}, {u.province}
                        </td>
                        <td className="py-3 px-4">
                          <StatusLabel
                            tone={
                              u.status === 'active'
                                ? 'success'
                                : u.status === 'suspended'
                                ? 'danger'
                                : 'warning'
                            }
                            label={`${u.status}${u.verified ? ' · Verified' : ''}`}
                          />
                        </td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          {u.status !== 'active' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => updateUserStatus(u.id, 'active', true)}
                            >
                              Approve
                            </Button>
                          )}
                          {u.status === 'active' && u.role !== 'admin' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => updateUserStatus(u.id, 'suspended')}
                            >
                              Suspend
                            </Button>
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

      {tab === 'listings' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-[#10243A]">Listings Moderation</h1>
          <div className="bg-white border border-[#E5E9ED] rounded-lg overflow-hidden">
            {/* Mobile stacked cards */}
            <div className="md:hidden divide-y divide-[#E5E9ED]">
              {listings.map((l) => (
                <div key={l.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-bold text-[#10243A]">{l.reference}</span>
                    <StatusLabel
                      tone={l.verificationStatus === 'Verified' ? 'success' : 'warning'}
                      label={l.verificationStatus}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#10243A]">{l.title}</p>
                    <p className="text-xs text-[#697784] mt-0.5">
                      Seller: {l.sellerName} · Status: <span className="capitalize font-medium text-[#10243A]">{l.status}</span>
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    {l.verificationStatus !== 'Verified' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => approveListingVerification(l.id, 'Verified')}
                      >
                        Approve Verified
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        updateListingStatus(l.id, l.status === 'active' ? 'paused' : 'active')
                      }
                    >
                      {l.status === 'active' ? 'Pause' : 'Restore'}
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
                    <th className="py-3 px-4 font-semibold">Ref / Listing</th>
                    <th className="py-3 px-4 font-semibold">Seller</th>
                    <th className="py-3 px-4 font-semibold">Verification</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9ED]">
                  {listings.map((l) => (
                    <tr key={l.id} className="hover:bg-[#FAFAF7]">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#10243A]">{l.reference}</span>
                        <p className="text-[#17212B] font-medium">{l.title}</p>
                      </td>
                      <td className="py-3 px-4 text-[#697784]">{l.sellerName}</td>
                      <td className="py-3 px-4">
                        <StatusLabel
                          tone={l.verificationStatus === 'Verified' ? 'success' : 'warning'}
                          label={l.verificationStatus}
                        />
                      </td>
                      <td className="py-3 px-4 capitalize">{l.status}</td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        {l.verificationStatus !== 'Verified' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => approveListingVerification(l.id, 'Verified')}
                          >
                            Approve Verified
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            updateListingStatus(l.id, l.status === 'active' ? 'paused' : 'active')
                          }
                        >
                          {l.status === 'active' ? 'Pause' : 'Restore'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'verification' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-[#10243A]">Field Verification Assignment Queue</h1>
          {pendingVerifications.length === 0 ? (
            <EmptyState
              title="Verification queue is clear"
              description="All active livestock listings have completed field inspection and carry verified documentation."
            />
          ) : (
            <div className="space-y-3">
              {pendingVerifications.map((l) => (
                <div
                  key={l.id}
                  className="bg-white border border-[#E5E9ED] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-[#697784]">
                      {l.reference} · {l.district}, {l.province}
                    </p>
                    <h2 className="text-[15px] font-bold text-[#10243A] leading-snug mt-0.5">{l.title}</h2>
                    <p className="text-xs text-[#697784] mt-0.5">
                      Seller: {l.sellerName} ({l.farmName}) · {l.quantity} head
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() =>
                        assignFieldTask(l.id, agents[0]?.id || 'usr-agent-1', 'Urgent')
                      }
                    >
                      Assign {agents[0]?.name || 'Field Agent'} (Urgent)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'logistics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-[#E5E9ED] rounded-lg p-4 sm:p-5 space-y-3 min-w-0">
            <h2 className="text-sm font-bold text-[#10243A] inline-flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-[#F28C28] shrink-0" />
              Collection Centre Movements ({centreRecords.length})
            </h2>
            <div className="divide-y divide-[#E5E9ED] text-xs">
              {centreRecords.map((r) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#10243A] truncate">{r.listingTitle}</p>
                    <p className="text-[#697784] truncate">
                      {r.centreName} · {r.penNumber} · {r.quantity} head
                    </p>
                  </div>
                  <StatusLabel tone={r.status === 'Released' ? 'success' : 'info'} label={r.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E5E9ED] rounded-lg p-4 sm:p-5 space-y-3 min-w-0">
            <h2 className="text-sm font-bold text-[#10243A] inline-flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#245B83] shrink-0" />
              Transport Corridor Consignments ({transportJobs.length})
            </h2>
            <div className="divide-y divide-[#E5E9ED] text-xs">
              {transportJobs.map((j) => (
                <div key={j.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#10243A] truncate">{j.listingTitle}</p>
                    <p className="text-[#697784] truncate">
                      {j.pickupLocation} → {j.destination}
                    </p>
                  </div>
                  <StatusLabel tone={j.status === 'Delivered' ? 'success' : 'info'} label={j.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-[#10243A]">Transactions & Simulated Payment Ledger</h1>
          <div className="bg-white border border-[#E5E9ED] rounded-lg overflow-hidden">
            {/* Mobile stacked cards */}
            <div className="md:hidden divide-y divide-[#E5E9ED]">
              {transactions.map((t) => (
                <div key={t.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-bold text-[#10243A]">{t.reference}</span>
                    <StatusLabel
                      tone={t.state === 'Completed' ? 'success' : t.state === 'Disputed' ? 'danger' : 'info'}
                      label={t.state}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#10243A]">
                      {t.buyerName} ← {t.sellerName}
                    </p>
                    <p className="text-xs text-[#697784] mt-0.5">{t.paymentStatus}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-sm font-bold text-[#10243A] tabular-nums">
                      {formatUSD(t.agreedAmountUsd)}
                    </span>
                    <Button variant="secondary" size="sm" onClick={() => setSelectedTxnId(t.id)}>
                      Inspect
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
                    <th className="py-3 px-4 font-semibold">Parties</th>
                    <th className="py-3 px-4 font-semibold">Payment State</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold">Milestone</th>
                    <th className="py-3 px-4 font-semibold text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9ED] tabular-nums">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-[#FAFAF7]">
                      <td className="py-3 px-4 font-mono font-bold text-[#10243A]">{t.reference}</td>
                      <td className="py-3 px-4">
                        {t.buyerName} ← {t.sellerName}
                      </td>
                      <td className="py-3 px-4 text-[#697784]">{t.paymentStatus}</td>
                      <td className="py-3 px-4 font-mono font-bold text-right text-[#10243A]">
                        {formatUSD(t.agreedAmountUsd)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusLabel
                          tone={t.state === 'Completed' ? 'success' : t.state === 'Disputed' ? 'danger' : 'info'}
                          label={t.state}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedTxnId(t.id)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'disputes' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-[#10243A]">Dispute Investigation Console</h1>
          {disputes.length === 0 ? (
            <EmptyState
              title="No active trade disputes"
              description="Any handover variances, veterinary paperwork issues, or settlement escalations opened by buyers or sellers will appear here."
            />
          ) : (
            <div className="space-y-3.5">
              {disputes.map((d) => (
                <div key={d.id} className="bg-white border border-[#E5E9ED] rounded-lg p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-[#697784]">
                        {d.reference} · Transaction {d.transactionRef} · {formatDateTime(d.createdAt)}
                      </p>
                      <h2 className="text-[15px] font-bold text-[#10243A] mt-0.5 leading-snug">{d.reason}</h2>
                      <p className="text-xs text-[#697784]">
                        Opened by {d.openedBy} against {d.against}
                      </p>
                    </div>
                    <StatusLabel
                      tone={d.status === 'Resolved' ? 'success' : 'danger'}
                      label={d.status}
                    />
                  </div>
                  <p className="text-sm text-[#17212B] leading-relaxed prose-justify">{d.description}</p>
                  {d.status === 'Resolved' ? (
                    <p className="text-xs text-[#21865B] font-medium pt-2 border-t border-[#E5E9ED] leading-relaxed prose-justify">
                      Resolution: {d.resolution}
                    </p>
                  ) : (
                    <div className="pt-3 border-t border-[#E5E9ED] flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Record investigation outcome & settlement decision..."
                        value={resolutionText[d.id] || ''}
                        onChange={(e) =>
                          setResolutionText({ ...resolutionText, [d.id]: e.target.value })
                        }
                        className="flex-1 min-w-0 h-9 rounded-md border border-[#E5E9ED] px-3 text-xs focus:outline-none focus:border-[#10243A]"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          resolveDispute(
                            d.id,
                            resolutionText[d.id] || 'Verified against Gweru Hub weighbridge receipt; closed by Operations.'
                          )
                        }
                      >
                        Mark Resolved
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-[#10243A]">Analytics & Operational Reporting</h1>
            <Button variant="primary" size="sm" onClick={handleExportCsv}>
              <Download className="w-4 h-4" />
              Download Transactions CSV
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <MetricCell label="Avg Verification Turnaround" value="18.4 hrs" detail="Matabeleland & Midlands" />
            <MetricCell label="Offer-to-Transaction Rate" value="64%" detail="Verified vs 28% unverified" />
            <MetricCell label="Zero-Incident Deliveries" value="98.2%" detail="Accredited transport fleet" />
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!broadcast.title.trim() || !broadcast.body.trim()) return;
            sendAdminBroadcast(broadcast.title, broadcast.body, broadcast.recipientRole);
            setBroadcast({ recipientRole: 'all', title: '', body: '' });
          }}
          className="bg-white border border-[#E5E9ED] rounded-lg p-5 max-w-xl space-y-4"
        >
          <h1 className="text-lg font-bold text-[#10243A]">Broadcast Operational Notice</h1>
          <Select
            label="Target Role Group"
            value={broadcast.recipientRole}
            onChange={(e) =>
              setBroadcast({ ...broadcast, recipientRole: e.target.value as UserRole | 'all' })
            }
          >
            <option value="all">All Platform Roles</option>
            <option value="seller">Sellers / Farmers</option>
            <option value="buyer">Buyers</option>
            <option value="agent">Field Verification Agents</option>
            <option value="centre">Collection Centres</option>
            <option value="transport">Transport Partners</option>
          </Select>
          <Input
            label="Notification Headline"
            placeholder="e.g. DVS Movement Permit Update — Midlands Corridor"
            value={broadcast.title}
            onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })}
            required
          />
          <Textarea
            label="Message Details"
            rows={3}
            value={broadcast.body}
            onChange={(e) => setBroadcast({ ...broadcast, body: e.target.value })}
            required
          />
          <Button type="submit" variant="primary">
            Send Broadcast
          </Button>
        </form>
      )}

      {tab === 'audit' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-[#10243A]">System Audit Logs</h1>
          <div className="bg-white border border-[#E5E9ED] rounded-lg divide-y divide-[#E5E9ED]">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-[#10243A]">{log.actor}</span>{' '}
                  <span className="text-[#245B83] capitalize">({log.role})</span>{' '}
                  <span className="text-[#697784]">— {log.action}:</span>{' '}
                  <span className="font-mono text-[#10243A] break-all">{log.target}</span>
                </div>
                <span className="font-mono text-[11px] text-[#697784] shrink-0">
                  {formatDateTime(log.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="bg-white border border-[#E5E9ED] rounded-lg p-5 max-w-xl space-y-4">
          <h1 className="text-lg font-bold text-[#10243A]">Platform Governance Settings</h1>
          <Input label="Primary Operating Currency" defaultValue="USD (United States Dollar)" disabled />
          <Input label="Default Offer Expiry Window" defaultValue="5 Days (120 Hours)" />
          <Input label="Settlement Mode" defaultValue="Simulated Demo Settlement (No Live Financial Rails)" disabled />
          <Button variant="primary" onClick={() => pushToast('Governance settings saved', 'success')}>
            Save Platform Settings
          </Button>
        </div>
      )}

      <TransactionDetailModal
        transaction={selectedTxn}
        onClose={() => setSelectedTxnId(null)}
        roleView="admin"
      />
    </WorkspaceShell>
  );
};
