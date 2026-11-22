import React, { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  ClipboardCheck,
  History,
  KeyRound,
  LayoutDashboard,
  Plus,
  Warehouse,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import { formatDateTime, getCountryFlag } from '../../lib/utils';
import type { CollectionCentreRecord, LivestockCategory } from '../../types/mariketi';
import { WorkspaceShell, type NavItem } from '../../components/layout/WorkspaceShell';
import {
  Button,
  EmptyState,
  Input,
  MetricCell,
  Modal,
  Select,
  StatusLabel,
} from '../../components/ui/DesignSystem';

export const CollectionCentreWorkspace: React.FC = () => {
  const { currentUser, centreRecords, updateCentreRecord, createCentreRecord, pushToast } =
    useMariketi();

  const [tab, setTab] = useState('overview');
  const [checkInModal, setCheckInModal] = useState<CollectionCentreRecord | null>(null);
  const [penInput, setPenInput] = useState('Kraal A-03');
  const [weightInput, setWeightInput] = useState('385');

  const [handoverModal, setHandoverModal] = useState<CollectionCentreRecord | null>(null);
  const [pinAttempt, setPinAttempt] = useState('');

  const [newIntakeOpen, setNewIntakeOpen] = useState(false);
  const [intakeForm, setIntakeForm] = useState({
    transactionRef: 'TXN-2026-9088',
    listingTitle: '',
    category: 'Cattle' as LivestockCategory,
    quantity: '10',
    sellerName: '',
    buyerName: '',
    penNumber: 'Kraal A-04',
    checkedWeightAvgKg: '390',
  });

  const expected = centreRecords.filter((r) => r.status === 'Expected');
  const onSite = centreRecords.filter(
    (r) =>
      r.status === 'Checked In' ||
      r.status === 'Inspected' ||
      r.status === 'Ready for Handover'
  );
  const released = centreRecords.filter((r) => r.status === 'Released');
  const totalHeadOnSite = onSite.reduce((sum, r) => sum + r.quantity, 0);
  const totalCapacity = 420;
  const occupancyPct = Math.min(100, Math.round((totalHeadOnSite / totalCapacity) * 100));

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Centre Overview', icon: LayoutDashboard },
    { id: 'incoming', label: 'Expected & Check-In', icon: ArrowDownToLine, badge: expected.length },
    { id: 'onsite', label: 'On-Site & Handover', icon: Warehouse, badge: onSite.length },
    { id: 'outgoing', label: 'Outgoing & History', icon: ArrowUpFromLine },
    { id: 'capacity', label: 'Pen Capacity & Reports', icon: BarChart3 },
  ];

  const handleConfirmCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInModal) return;
    updateCentreRecord(checkInModal.id, {
      status: 'Checked In',
      penNumber: penInput,
      checkedWeightAvgKg: Number(weightInput) || checkInModal.checkedWeightAvgKg,
      checkedInAt: new Date().toISOString(),
    });
    setCheckInModal(null);
  };

  const handleReleaseHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverModal) return;
    if (pinAttempt.trim().toUpperCase() !== handoverModal.handoverPin.toUpperCase()) {
      pushToast('Handover PIN mismatch', 'error', `Expected PIN: ${handoverModal.handoverPin}`);
      return;
    }
    updateCentreRecord(handoverModal.id, {
      status: 'Released',
      releasedAt: new Date().toISOString(),
    });
    setHandoverModal(null);
    setPinAttempt('');
  };

  const handleNewIntake = (e: React.FormEvent) => {
    e.preventDefault();
    createCentreRecord({
      centreName: currentUser?.organization || 'Gweru Central Livestock Collection Hub',
      country: currentUser?.country || 'Zimbabwe',
      transactionRef: intakeForm.transactionRef,
      listingTitle: intakeForm.listingTitle,
      category: intakeForm.category,
      quantity: Number(intakeForm.quantity) || 1,
      sellerName: intakeForm.sellerName,
      buyerName: intakeForm.buyerName,
      penNumber: intakeForm.penNumber,
      checkedWeightAvgKg: Number(intakeForm.checkedWeightAvgKg) || 300,
      status: 'Checked In',
      expectedAt: new Date().toISOString(),
      checkedInAt: new Date().toISOString(),
      handoverPin: `HND-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: 'Direct intake logged at facility weighbridge.',
    });
    setNewIntakeOpen(false);
  };

  return (
    <WorkspaceShell
      workspaceTitle="Collection Centre Hub"
      navItems={navItems}
      activeTab={tab}
      onSelectTab={setTab}
      primaryAction={
        <Button variant="accent" size="sm" onClick={() => setNewIntakeOpen(true)}>
          <Plus className="w-4 h-4" />
          Log Check-In
        </Button>
      }
    >
      {tab === 'overview' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#10243A] tracking-tight">
              {currentUser?.organization || 'Gweru Central Livestock Collection Hub'}
            </h1>
            <p className="text-sm text-[#526071] mt-0.5">
              {getCountryFlag(currentUser?.country)} {currentUser?.country || 'Zimbabwe'} · Facility {currentUser?.meta?.facilityCode || 'MCC-GWERU-01'} · Traceable intake, pen holding, weighbridge checks, and PIN-verified release.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <MetricCell label="Expected Arrivals" value={expected.length} detail="Scheduled manifests" />
            <MetricCell label="Lots On-Site" value={onSite.length} detail={`${totalHeadOnSite} head penned`} />
            <MetricCell label="Released Consignments" value={released.length} detail="Verified handovers" />
            <MetricCell label="Pen Utilization" value={`${occupancyPct}%`} detail={`${totalHeadOnSite} / ${totalCapacity} head`} />
          </div>

          <div className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#DFE6EE]">
              <h2 className="text-sm font-bold text-[#10243A]">Active Collection & Movement Register</h2>
            </div>

            {/* Mobile stacked cards */}
            <div className="md:hidden divide-y divide-[#DFE6EE]">
              {centreRecords.map((rec) => (
                <div key={rec.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-[#10243A]">
                      {rec.reference} · {rec.penNumber}
                    </span>
                    <StatusLabel
                      tone={
                        rec.status === 'Released'
                          ? 'success'
                          : rec.status === 'Expected'
                          ? 'warning'
                          : 'info'
                      }
                      label={rec.status}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#10243A]">
                      {getCountryFlag(rec.country)} {rec.listingTitle} ({rec.quantity} head)
                    </p>
                    <p className="text-xs text-[#526071] mt-0.5">
                      {rec.centreName} · {rec.sellerName} → {rec.buyerName} · {rec.checkedWeightAvgKg} kg avg
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-[11px] text-[#526071]">{rec.transactionRef}</span>
                    <div>
                      {rec.status === 'Expected' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setCheckInModal(rec);
                            setPenInput(rec.penNumber);
                            setWeightInput(String(rec.checkedWeightAvgKg));
                          }}
                        >
                          Check In
                        </Button>
                      )}
                      {rec.status === 'Checked In' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateCentreRecord(rec.id, { status: 'Ready for Handover' })}
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          Clear Handover
                        </Button>
                      )}
                      {rec.status === 'Ready for Handover' && (
                        <Button variant="accent" size="sm" onClick={() => setHandoverModal(rec)}>
                          <KeyRound className="w-3.5 h-3.5" />
                          Release PIN
                        </Button>
                      )}
                      {rec.status === 'Released' && (
                        <span className="text-xs text-[#1A7A50] font-semibold">Completed</span>
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
                    <th className="py-3 px-4 font-semibold">Ref / Txn</th>
                    <th className="py-3 px-4 font-semibold">Consignment</th>
                    <th className="py-3 px-4 font-semibold">Pen</th>
                    <th className="py-3 px-4 font-semibold text-right">Avg Weight</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Next Step</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DFE6EE] tabular-nums">
                  {centreRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-[#F7F9FC]/80 transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <span className="font-semibold text-[#10243A]">{rec.reference}</span>
                        <span className="block text-[11px] text-[#526071]">{rec.transactionRef}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#10243A]">
                          {getCountryFlag(rec.country)} {rec.listingTitle} ({rec.quantity} head)
                        </p>
                        <p className="text-[#526071]">
                          {rec.centreName} · {rec.sellerName} → {rec.buyerName}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#10243A]">{rec.penNumber}</td>
                      <td className="py-3 px-4 font-mono text-right text-[#0F1B2A]">{rec.checkedWeightAvgKg} kg</td>
                      <td className="py-3 px-4">
                        <StatusLabel
                          tone={
                            rec.status === 'Released'
                              ? 'success'
                              : rec.status === 'Expected'
                              ? 'warning'
                              : 'info'
                          }
                          label={rec.status}
                        />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {rec.status === 'Expected' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setCheckInModal(rec);
                              setPenInput(rec.penNumber);
                              setWeightInput(String(rec.checkedWeightAvgKg));
                            }}
                          >
                            Check In
                          </Button>
                        )}
                        {rec.status === 'Checked In' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              updateCentreRecord(rec.id, { status: 'Ready for Handover' })
                            }
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            Clear for Handover
                          </Button>
                        )}
                        {rec.status === 'Ready for Handover' && (
                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => setHandoverModal(rec)}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Release PIN
                          </Button>
                        )}
                        {rec.status === 'Released' && (
                          <span className="text-[#1A7A50] font-semibold">Completed</span>
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

      {(tab === 'incoming' || tab === 'onsite' || tab === 'outgoing') && (() => {
        const filteredRecords =
          tab === 'incoming' ? expected : tab === 'onsite' ? onSite : released;
        return (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-[#10243A] tracking-tight">
              {tab === 'incoming'
                ? 'Expected Incoming Livestock'
                : tab === 'onsite'
                ? 'On-Site Penned Stock & Handover Queue'
                : 'Outgoing & Historical Movement Log'}
            </h1>
            {filteredRecords.length === 0 ? (
              <EmptyState
                title={
                  tab === 'incoming'
                    ? 'No expected arrivals right now'
                    : tab === 'onsite'
                    ? 'No livestock currently penned on-site'
                    : 'No released consignments yet'
                }
                description="Scheduled intake manifests, weighbridge check-ins, and PIN-verified releases will appear here automatically."
              />
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="text-xs font-mono text-[#526071] flex flex-wrap gap-x-1.5 gap-y-0.5">
                        <span>{rec.reference}</span>
                        <span aria-hidden="true">·</span>
                        <span>{rec.transactionRef}</span>
                        <span aria-hidden="true">·</span>
                        <span>Pen: {rec.penNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          PIN: <strong className="text-[#10243A]">{rec.handoverPin}</strong>
                        </span>
                      </div>
                      <h2 className="text-[15px] font-bold text-[#10243A] leading-snug">
                        {getCountryFlag(rec.country)} {rec.listingTitle} ({rec.quantity} head)
                      </h2>
                      <p className="text-xs text-[#526071] leading-relaxed">
                        {rec.centreName} · From {rec.sellerName} to {rec.buyerName} · {rec.notes}
                      </p>
                      <p className="text-[11px] font-mono text-[#526071]">
                        Expected: {formatDateTime(rec.expectedAt)}
                        {rec.releasedAt ? ` · Released: ${formatDateTime(rec.releasedAt)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#DFE6EE]">
                      {rec.status === 'Expected' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setCheckInModal(rec);
                            setPenInput(rec.penNumber);
                            setWeightInput(String(rec.checkedWeightAvgKg));
                          }}
                        >
                          Check In & Weigh
                        </Button>
                      )}
                      {rec.status === 'Checked In' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateCentreRecord(rec.id, { status: 'Ready for Handover' })}
                        >
                          Mark Ready
                        </Button>
                      )}
                      {rec.status === 'Ready for Handover' && (
                        <Button variant="accent" size="sm" onClick={() => setHandoverModal(rec)}>
                          Verify PIN & Release
                        </Button>
                      )}
                      {rec.status === 'Released' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A7A50]">
                          <History className="w-3.5 h-3.5" />
                          Released
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {tab === 'capacity' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-[#10243A] tracking-tight">Facility Pen Capacity & Biosecurity</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ['Cattle Kraals (Block A)', 18, 180, 'Weighbridge & dipping race active'],
              ['Small-Stock Pens (Block B)', 24, 160, 'Shaded troughs & footbath biosecurity'],
              ['Porcine Transit Bays (Block C)', 0, 80, 'Sanitized after last dispatch'],
            ].map(([name, used, cap, note]) => {
              const pct = Math.round(((used as number) / (cap as number)) * 100);
              return (
                <div key={name as string} className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#10243A]">{name as string}</span>
                    <span className="font-mono text-[#526071] tabular-nums shrink-0">
                      {used as number} / {cap as number} head
                    </span>
                  </div>
                  <div className="h-2 bg-[#EEF3F8] rounded-full overflow-hidden">
                    <div className="h-full bg-[#10243A] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-[#526071]">{note as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Check-In Modal */}
      <Modal
        open={!!checkInModal}
        onClose={() => setCheckInModal(null)}
        title="Livestock Check-In & Weighbridge Intake"
        subtitle={checkInModal ? `${checkInModal.reference} · ${checkInModal.listingTitle}` : ''}
      >
        <form onSubmit={handleConfirmCheckIn} className="space-y-4">
          <Input
            label="Assign Holding Pen / Kraal"
            value={penInput}
            onChange={(e) => setPenInput(e.target.value)}
            required
          />
          <Input
            label="Weighbridge Average Weight (kg)"
            type="number"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCheckInModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Check-In
            </Button>
          </div>
        </form>
      </Modal>

      {/* Handover Release PIN Modal */}
      <Modal
        open={!!handoverModal}
        onClose={() => setHandoverModal(null)}
        title="Verify Handover PIN & Release Livestock"
        subtitle={handoverModal ? `${handoverModal.listingTitle} (${handoverModal.quantity} head)` : ''}
      >
        <form onSubmit={handleReleaseHandover} className="space-y-4">
          <p className="text-xs text-[#526071] leading-relaxed prose-justify">
            Enter the authorized transaction handover code provided by the Buyer or Transport Partner. (For testing, PIN is{' '}
            <strong className="font-mono text-[#10243A]">{handoverModal?.handoverPin}</strong>.)
          </p>
          <Input
            label="Handover Release PIN"
            placeholder="e.g. HND-4829"
            value={pinAttempt}
            onChange={(e) => setPinAttempt(e.target.value)}
            className="font-mono uppercase"
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setHandoverModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent">
              Confirm Release
            </Button>
          </div>
        </form>
      </Modal>

      {/* Direct Intake Modal */}
      <Modal
        open={newIntakeOpen}
        onClose={() => setNewIntakeOpen(false)}
        title="Log New Facility Check-In"
      >
        <form onSubmit={handleNewIntake} className="space-y-3.5">
          <Input
            label="Listing / Herd Title"
            placeholder="e.g. 12 Boran Weaner Steers"
            value={intakeForm.listingTitle}
            onChange={(e) => setIntakeForm({ ...intakeForm, listingTitle: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Category"
              value={intakeForm.category}
              onChange={(e) =>
                setIntakeForm({ ...intakeForm, category: e.target.value as LivestockCategory })
              }
            >
              <option value="Cattle">Cattle</option>
              <option value="Goats">Goats</option>
              <option value="Sheep">Sheep</option>
              <option value="Pigs">Pigs</option>
              <option value="Poultry">Poultry</option>
            </Select>
            <Input
              label="Headcount"
              type="number"
              value={intakeForm.quantity}
              onChange={(e) => setIntakeForm({ ...intakeForm, quantity: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Seller Name"
              value={intakeForm.sellerName}
              onChange={(e) => setIntakeForm({ ...intakeForm, sellerName: e.target.value })}
              required
            />
            <Input
              label="Buyer Name"
              value={intakeForm.buyerName}
              onChange={(e) => setIntakeForm({ ...intakeForm, buyerName: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Assigned Pen"
              value={intakeForm.penNumber}
              onChange={(e) => setIntakeForm({ ...intakeForm, penNumber: e.target.value })}
              required
            />
            <Input
              label="Avg Weight (kg)"
              type="number"
              value={intakeForm.checkedWeightAvgKg}
              onChange={(e) => setIntakeForm({ ...intakeForm, checkedWeightAvgKg: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setNewIntakeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Intake Record
            </Button>
          </div>
        </form>
      </Modal>
    </WorkspaceShell>
  );
};
