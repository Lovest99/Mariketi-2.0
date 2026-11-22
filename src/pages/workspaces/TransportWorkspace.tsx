import React, { useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  DollarSign,
  History,
  LayoutDashboard,
  MapPin,
  Plus,
  Truck,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import { formatDateTime, formatUSD, getCountry, getCountryFlag } from '../../lib/utils';
import type { TransportJob } from '../../types/mariketi';
import { WorkspaceShell, type NavItem } from '../../components/layout/WorkspaceShell';
import {
  Button,
  EmptyState,
  Input,
  MetricCell,
  Modal,
  Select,
  StatusLabel,
  Textarea,
} from '../../components/ui/DesignSystem';

export const TransportWorkspace: React.FC = () => {
  const {
    currentUser,
    transportJobs,
    vehicles,
    acceptTransportJob,
    updateTransportJobStatus,
    addTransportVehicle,
  } = useMariketi();

  const [tab, setTab] = useState('overview');
  const [acceptTarget, setAcceptTarget] = useState<TransportJob | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || '');

  const [podTarget, setPodTarget] = useState<TransportJob | null>(null);
  const [podRecipient, setPodRecipient] = useState('');
  const [podCode, setPodCode] = useState('');
  const [podNotes, setPodNotes] = useState('All livestock offloaded in healthy condition, zero transit injuries.');

  const defaultDialPrefix = `${getCountry(currentUser?.country).dialCode} `;
  const [addVehOpen, setAddVehOpen] = useState(false);
  const [vehForm, setVehForm] = useState({
    registration: '',
    model: '',
    capacityHead: '30',
    suitableFor: 'Cattle, Goats, Sheep',
    driverName: '',
    driverPhone: defaultDialPrefix,
  });

  const available = transportJobs.filter((j) => j.status === 'Available');
  const active = transportJobs.filter(
    (j) =>
      j.status === 'Accepted' ||
      j.status === 'En Route to Pickup' ||
      j.status === 'Loaded & In Transit'
  );
  const delivered = transportJobs.filter((j) => j.status === 'Delivered');
  const totalEarnings = delivered.reduce((sum, j) => sum + j.feeUsd, 0);

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Dispatch Overview', icon: LayoutDashboard },
    { id: 'available', label: 'Available Jobs', icon: ClipboardList, badge: available.length },
    { id: 'active', label: 'Active Deliveries', icon: Truck, badge: active.length },
    { id: 'history', label: 'Delivery History & Earnings', icon: History },
    { id: 'fleet', label: 'Vehicles & Drivers', icon: DollarSign },
  ];

  const handleAcceptJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTarget) return;
    const veh = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
    acceptTransportJob(
      acceptTarget.id,
      `${veh.registration} (${veh.model})`,
      veh.driverName
    );
    setAcceptTarget(null);
  };

  const handleSubmitPod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!podTarget) return;
    updateTransportJobStatus(podTarget.id, 'Delivered', {
      recipient: podRecipient,
      code: podCode,
      notes: podNotes,
    });
    setPodTarget(null);
    setPodRecipient('');
    setPodCode('');
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    addTransportVehicle({
      registration: vehForm.registration.toUpperCase(),
      model: vehForm.model,
      capacityHead: Number(vehForm.capacityHead) || 20,
      suitableFor: vehForm.suitableFor,
      driverName: vehForm.driverName,
      driverPhone: vehForm.driverPhone,
      status: 'Available',
    });
    setAddVehOpen(false);
    setVehForm({
      registration: '',
      model: '',
      capacityHead: '30',
      suitableFor: 'Cattle, Goats, Sheep',
      driverName: '',
      driverPhone: defaultDialPrefix,
    });
  };

  return (
    <WorkspaceShell
      workspaceTitle="Transport Partner"
      navItems={navItems}
      activeTab={tab}
      onSelectTab={setTab}
      primaryAction={
        <Button variant="accent" size="sm" onClick={() => setTab('available')}>
          Available Loads ({available.length})
        </Button>
      }
    >
      {tab === 'overview' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#10243A] tracking-tight">
              {currentUser?.organization || 'Savannah Livestock Haulage'}
            </h1>
            <p className="text-sm text-[#526071] mt-0.5">
              {getCountryFlag(currentUser?.country)} Corridors: {currentUser?.meta?.operatingCorridors || 'Southern & East Africa Cross-Border Corridors'} · Accredited livestock transport dispatch.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <MetricCell label="Available Jobs" value={available.length} detail="Open haulage requests" />
            <MetricCell label="Active Deliveries" value={active.length} detail="In corridor transit" />
            <MetricCell label="Completed Trips" value={delivered.length} detail="POD verified" />
            <MetricCell label="Recorded Earnings" value={formatUSD(totalEarnings)} detail="Completed haulage fees" />
          </div>

          <div className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 sm:p-5 space-y-3.5">
            <h2 className="text-sm font-bold text-[#10243A]">Live Consignment Board</h2>
            <div className="space-y-3">
              {transportJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-3.5 sm:p-4 rounded-lg bg-[#F7F9FC] border border-[#DFE6EE] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#526071]">
                      <span className="font-mono font-bold text-[#10243A]">{job.reference}</span>
                      <span aria-hidden="true">·</span>
                      <span>{job.category} ({job.quantity} head)</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{job.distanceKm} km</span>
                      <span aria-hidden="true">·</span>
                      <span>Scheduled {job.scheduledDate}</span>
                    </div>
                    <p className="text-sm font-bold text-[#10243A] leading-snug">
                      {job.country ? `${getCountryFlag(job.country)} ` : ''}{job.listingTitle}
                    </p>
                    <p className="text-xs text-[#526071] flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#F28C28] shrink-0 mt-0.5" />
                      <span>
                        {job.pickupLocation} → {job.destination}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[#DFE6EE] shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-base font-bold text-[#10243A] tabular-nums">
                        {formatUSD(job.feeUsd)}
                      </p>
                      <StatusLabel
                        tone={
                          job.status === 'Delivered'
                            ? 'success'
                            : job.status === 'Available'
                            ? 'warning'
                            : 'info'
                        }
                        label={job.status}
                      />
                    </div>
                    {job.status === 'Available' && (
                      <Button variant="accent" size="sm" onClick={() => setAcceptTarget(job)}>
                        Accept Job
                      </Button>
                    )}
                    {job.status === 'Accepted' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => updateTransportJobStatus(job.id, 'En Route to Pickup')}
                      >
                        Start Pickup
                      </Button>
                    )}
                    {job.status === 'En Route to Pickup' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => updateTransportJobStatus(job.id, 'Loaded & In Transit')}
                      >
                        Mark Loaded
                      </Button>
                    )}
                    {job.status === 'Loaded & In Transit' && (
                      <Button variant="accent" size="sm" onClick={() => setPodTarget(job)}>
                        Complete POD
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(tab === 'available' || tab === 'active' || tab === 'history') && (() => {
        const filteredJobs =
          tab === 'available' ? available : tab === 'active' ? active : delivered;
        return (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-[#10243A] tracking-tight">
              {tab === 'available'
                ? 'Available Livestock Haulage Jobs'
                : tab === 'active'
                ? 'Active Deliveries'
                : 'Delivery History & Proof of Delivery'}
            </h1>
            {filteredJobs.length === 0 ? (
              <EmptyState
                title={
                  tab === 'available'
                    ? 'No open haulage jobs available'
                    : tab === 'active'
                    ? 'No active corridor deliveries'
                    : 'No completed deliveries recorded yet'
                }
                description="Accepted consignments, active transit dispatches, and verified proof-of-delivery records will appear here."
              />
            ) : (
              <div className="space-y-3">
                {filteredJobs.map((job) => (
                  <div key={job.id} className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-[#526071]">
                          {job.reference} · Txn {job.transactionRef} · {job.distanceKm} km
                        </p>
                        <h2 className="text-[15px] font-bold text-[#10243A] mt-0.5 leading-snug">
                          {job.country ? `${getCountryFlag(job.country)} ` : ''}{job.listingTitle} ({job.quantity} head)
                        </h2>
                        <p className="text-xs text-[#526071] mt-1">
                          <strong className="text-[#10243A]">Pickup:</strong> {job.pickupLocation}
                        </p>
                        <p className="text-xs text-[#526071]">
                          <strong className="text-[#10243A]">Destination:</strong> {job.destination}
                        </p>
                        <p className="text-xs text-[#526071] mt-1">
                          <strong className="text-[#10243A]">Requirements:</strong> {job.requirements}
                        </p>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#DFE6EE]">
                        <p className="font-mono text-lg font-bold text-[#10243A] tabular-nums">
                          {formatUSD(job.feeUsd)}
                        </p>
                        <StatusLabel
                          tone={job.status === 'Delivered' ? 'success' : 'info'}
                          label={job.status}
                        />
                      </div>
                    </div>

                    {job.assignedVehicle && (
                      <p className="text-xs text-[#526071] pt-2 border-t border-[#DFE6EE]">
                        Assigned Rig: <strong className="text-[#10243A]">{job.assignedVehicle}</strong> · Driver:{' '}
                        <strong className="text-[#10243A]">{job.assignedDriver}</strong>
                      </p>
                    )}

                    {job.podDeliveredAt && (
                      <div className="p-3.5 rounded-lg bg-[#F7F9FC] border border-[#DFE6EE] text-xs space-y-1">
                        <p className="font-semibold text-[#1A7A50] inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          Proof of Delivery Verified · {formatDateTime(job.podDeliveredAt)}
                        </p>
                        <p className="text-[#526071]">
                          Signed by: {job.podRecipient} · Handover Code: <span className="font-mono text-[#10243A]">{job.podCode}</span>
                        </p>
                        <p className="text-[#526071] leading-relaxed prose-justify">{job.podConditionNotes}</p>
                      </div>
                    )}

                    {job.status !== 'Delivered' && (
                      <div className="flex flex-wrap justify-end gap-2">
                        {job.status === 'Available' && (
                          <Button variant="accent" size="sm" onClick={() => setAcceptTarget(job)}>
                            Accept & Assign Rig
                          </Button>
                        )}
                        {job.status === 'Accepted' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => updateTransportJobStatus(job.id, 'En Route to Pickup')}
                          >
                            Dispatch to Pickup
                          </Button>
                        )}
                        {job.status === 'En Route to Pickup' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => updateTransportJobStatus(job.id, 'Loaded & In Transit')}
                          >
                            Confirm Loaded & In Transit
                          </Button>
                        )}
                        {job.status === 'Loaded & In Transit' && (
                          <Button variant="accent" size="sm" onClick={() => setPodTarget(job)}>
                            Submit Proof of Delivery
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {tab === 'fleet' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-[#10243A] tracking-tight">Accredited Vehicles & Drivers</h1>
            <Button variant="primary" size="sm" onClick={() => setAddVehOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vehicles.map((v) => (
              <div key={v.id} className="bg-white border border-[#DFE6EE] rounded-xl shadow-[0_1px_3px_rgba(16,36,58,0.04)] p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-[#10243A]">{v.registration}</span>
                  <StatusLabel
                    tone={v.status === 'Available' ? 'success' : 'info'}
                    label={v.status}
                  />
                </div>
                <p className="text-sm font-semibold text-[#0F1B2A]">{v.model}</p>
                <p className="text-xs text-[#526071]">
                  Capacity: {v.capacityHead} head · {v.suitableFor}
                </p>
                <p className="text-xs text-[#526071] pt-2 border-t border-[#DFE6EE]">
                  Driver: <strong className="text-[#10243A]">{v.driverName}</strong> ({v.driverPhone})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accept Job Modal */}
      <Modal
        open={!!acceptTarget}
        onClose={() => setAcceptTarget(null)}
        title="Accept Transport Job"
        subtitle={acceptTarget ? `${acceptTarget.reference} · ${formatUSD(acceptTarget.feeUsd)}` : ''}
      >
        <form onSubmit={handleAcceptJob} className="space-y-4">
          <Select
            label="Assign Accredited Vehicle & Driver"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration} — {v.model} (Driver: {v.driverName})
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAcceptTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent">
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Proof of Delivery Modal */}
      <Modal
        open={!!podTarget}
        onClose={() => setPodTarget(null)}
        title="Proof of Delivery (POD) Sign-Off"
        subtitle={podTarget ? `${podTarget.reference} · ${podTarget.destination}` : ''}
      >
        <form onSubmit={handleSubmitPod} className="space-y-4">
          <Input
            label="Receiving Person Full Name"
            placeholder="e.g. Tendai Moyo (Receiving Bay)"
            value={podRecipient}
            onChange={(e) => setPodRecipient(e.target.value)}
            required
          />
          <Input
            label="Buyer Handover Code"
            placeholder="e.g. HND-4829"
            value={podCode}
            onChange={(e) => setPodCode(e.target.value)}
            className="font-mono uppercase"
            required
          />
          <Textarea
            label="Offload Condition Notes"
            rows={3}
            value={podNotes}
            onChange={(e) => setPodNotes(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPodTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent">
              Confirm Delivery & Close Trip
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Vehicle Modal */}
      <Modal open={addVehOpen} onClose={() => setAddVehOpen(false)} title="Register Livestock Carrier">
        <form onSubmit={handleAddVehicle} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Registration Plate"
              placeholder="e.g. AGD-9021"
              value={vehForm.registration}
              onChange={(e) => setVehForm({ ...vehForm, registration: e.target.value })}
              required
            />
            <Input
              label="Capacity (Head)"
              type="number"
              value={vehForm.capacityHead}
              onChange={(e) => setVehForm({ ...vehForm, capacityHead: e.target.value })}
              required
            />
          </div>
          <Input
            label="Vehicle Make & Carrier Spec"
            placeholder="e.g. Mercedes-Benz Axor Double-Deck"
            value={vehForm.model}
            onChange={(e) => setVehForm({ ...vehForm, model: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Assigned Driver Name"
              value={vehForm.driverName}
              onChange={(e) => setVehForm({ ...vehForm, driverName: e.target.value })}
              required
            />
            <Input
              label="Driver Phone"
              value={vehForm.driverPhone}
              onChange={(e) => setVehForm({ ...vehForm, driverPhone: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddVehOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add to Fleet
            </Button>
          </div>
        </form>
      </Modal>
    </WorkspaceShell>
  );
};
