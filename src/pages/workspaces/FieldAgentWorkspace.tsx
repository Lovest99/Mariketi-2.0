import React, { useEffect, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  CloudOff,
  FileBarChart2,
  Home,
  ListTodo,
  MapPin,
  RefreshCw,
  User,
  Wifi,
  WifiOff,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import { cn, formatDateTime } from '../../lib/utils';
import type { FieldInspectionTask, GenderType, OfflineInspectionDraft } from '../../types/mariketi';
import { WorkspaceShell, type NavItem } from '../../components/layout/WorkspaceShell';
import {
  Button,
  EmptyState,
  Input,
  MetricCell,
  SafeImage,
  Select,
  StatusLabel,
  Textarea,
} from '../../components/ui/DesignSystem';

export const FieldAgentWorkspace: React.FC = () => {
  const {
    currentUser,
    fieldTasks,
    listings,
    offlineMode,
    offlineDrafts,
    setOfflineMode,
    saveFieldDraftOffline,
    submitFieldInspection,
    syncOfflineQueue,
    resolveSyncConflict,
    pushToast,
  } = useMariketi();

  const [tab, setTab] = useState<'home' | 'tasks' | 'verify' | 'reports' | 'profile'>('home');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(fieldTasks[0]?.id || '');

  const activeTask: FieldInspectionTask | undefined =
    fieldTasks.find((t) => t.id === selectedTaskId) || fieldTasks[0];

  const [form, setForm] = useState<OfflineInspectionDraft>(() => ({
    taskId: activeTask?.id || '',
    listingId: activeTask?.listingId || '',
    observedBreed: activeTask?.expectedBreed || '',
    observedAgeMonths: 24,
    observedGender: 'Heifer',
    observedWeightKg: 405,
    observedQuantity: activeTask?.expectedQuantity || 10,
    earTagRange: 'ZW-MV-1101 to ZW-MV-1112',
    healthScore: 'Healthy & Cleared',
    vetClearanceRef: 'DVS-CLR-2026-9401',
    gpsCoordinates: '',
    notes: '',
    photos: [],
    savedAt: new Date().toISOString(),
    syncStatus: 'draft',
    retryCount: 0,
  }));

  const [gpsStatus, setGpsStatus] = useState<string>('');

  // Load persisted IndexedDB draft when switching task
  useEffect(() => {
    if (!activeTask) return;
    const saved = offlineDrafts.find((d) => d.taskId === activeTask.id);
    if (saved) {
      setForm(saved);
    } else {
      const linkedListing = listings.find((l) => l.id === activeTask.listingId);
      setForm({
        taskId: activeTask.id,
        listingId: activeTask.listingId,
        observedBreed: linkedListing?.breed || activeTask.expectedBreed,
        observedAgeMonths: linkedListing?.ageMonths || 18,
        observedGender: linkedListing?.gender || 'Mixed Herd',
        observedWeightKg: linkedListing?.weightKg || 320,
        observedQuantity: activeTask.expectedQuantity,
        earTagRange: 'ZW-TAG-2026-01',
        healthScore: 'Healthy & Cleared',
        vetClearanceRef: 'DVS-CLR-2026-9450',
        gpsCoordinates: '',
        notes: '',
        photos: [],
        savedAt: new Date().toISOString(),
        syncStatus: 'draft',
        retryCount: 0,
      });
    }
  }, [activeTask?.id]);

  const queuedCount = offlineDrafts.filter(
    (d) => d.syncStatus === 'queued' || d.syncStatus === 'conflict'
  ).length;
  const completedCount = fieldTasks.filter((t) => t.status === 'Completed').length;
  const pendingCount = fieldTasks.filter((t) => t.status !== 'Completed').length;

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Assigned Tasks', icon: ListTodo, badge: pendingCount },
    { id: 'verify', label: 'Field Verification', icon: ClipboardCheck },
    { id: 'reports', label: 'Sync Queue & Reports', icon: FileBarChart2, badge: queuedCount },
    { id: 'profile', label: 'Agent Profile', icon: User },
  ];

  const handleCaptureGps = () => {
    setGpsStatus('Acquiring GPS fix...');
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          setForm((prev) => ({ ...prev, gpsCoordinates: coords }));
          setGpsStatus('GPS verified on device');
          pushToast('GPS location captured', 'success', coords);
        },
        () => {
          // Graceful fallback for sandboxed iframe environments
          const fallbackCoords = '-20.93640, 29.00720 (District Tower Fix)';
          setForm((prev) => ({ ...prev, gpsCoordinates: fallbackCoords }));
          setGpsStatus('District fallback coordinates captured');
          pushToast('District GPS coordinates recorded', 'info', fallbackCoords);
        },
        { timeout: 5000 }
      );
    } else {
      const fallbackCoords = '-20.93640, 29.00720 (District Tower Fix)';
      setForm((prev) => ({ ...prev, gpsCoordinates: fallbackCoords }));
      setGpsStatus('District fallback coordinates captured');
    }
  };

  const handleCameraUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setForm((prev) => ({
            ...prev,
            photos: [...prev.photos, reader.result as string].slice(0, 6),
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const openTaskForVerification = (taskId: string) => {
    setSelectedTaskId(taskId);
    setTab('verify');
  };

  const handleSaveDraft = async () => {
    await saveFieldDraftOffline({
      ...form,
      savedAt: new Date().toISOString(),
      syncStatus: 'draft',
    });
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.observedBreed.trim()) {
      pushToast('Please record observed breed', 'error');
      return;
    }
    await submitFieldInspection({
      ...form,
      savedAt: new Date().toISOString(),
    });
    setTab('reports');
  };

  return (
    <WorkspaceShell
      workspaceTitle="Field Agent Operations"
      navItems={navItems}
      activeTab={tab}
      onSelectTab={(id) => setTab(id as typeof tab)}
      primaryAction={
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setOfflineMode(!offlineMode)}
            className={cn(
              'h-9 px-2.5 sm:px-3 rounded-md border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors',
              offlineMode
                ? 'bg-[#D99A2B]/15 border-[#D99A2B] text-[#8E5F0C]'
                : 'bg-white border-[#E5E9ED] text-[#21865B]'
            )}
          >
            {offlineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            {offlineMode ? (
              <>
                Offline<span className="hidden sm:inline"> Mode</span>
              </>
            ) : (
              'Online'
            )}
          </button>
          {queuedCount > 0 && !offlineMode && (
            <Button variant="accent" size="sm" onClick={syncOfflineQueue} className="hidden sm:inline-flex">
              <RefreshCw className="w-3.5 h-3.5" />
              Sync ({queuedCount})
            </Button>
          )}
        </div>
      }
    >
      {/* Persistent Connectivity Notice */}
      {offlineMode && (
        <div className="mb-4 p-3 rounded-lg bg-[#091827] text-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
            <CloudOff className="w-4 h-4 text-[#F28C28] shrink-0 mt-0.5 sm:mt-0" />
            <span className="leading-relaxed prose-justify">
              <strong>Offline Field Mode Active:</strong> Forms, GPS coordinates, and photos are persisted safely in local IndexedDB until signal returns.
            </span>
          </div>
          <Button variant="accent" size="sm" onClick={() => setOfflineMode(false)}>
            Reconnect & Sync
          </Button>
        </div>
      )}

      <div className="pb-24 lg:pb-6">
        {tab === 'home' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#10243A]">
                Field Operations · {currentUser?.name}
              </h1>
              <p className="text-sm text-[#697784] mt-0.5">
                {currentUser?.meta?.assignedRegion || 'Matabeleland South & Midlands'} · Offline-first verification console.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <MetricCell label="Assigned Inspections" value={fieldTasks.length} detail="Total queue" />
              <MetricCell label="Pending Tasks" value={pendingCount} detail="Requires farm visit" />
              <MetricCell label="Completed" value={completedCount} detail="Reports synced" />
              <MetricCell
                label="Offline Sync Queue"
                value={queuedCount}
                detail={offlineMode ? 'Waiting for signal' : 'Ready to sync'}
              />
            </div>

            <div className="bg-white border border-[#E5E9ED] rounded-lg p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[#10243A]">Priority Inspections Today</h2>
                <Button variant="secondary" size="sm" onClick={() => setTab('tasks')}>
                  All Tasks
                </Button>
              </div>
              {pendingCount === 0 ? (
                <EmptyState
                  title="All assigned farm inspections complete"
                  description="Every inspection in your regional queue has been verified. New seller verification requests will appear here automatically."
                />
              ) : (
                <div className="space-y-2.5">
                  {fieldTasks
                    .filter((t) => t.status !== 'Completed')
                    .map((task) => (
                      <div
                        key={task.id}
                        className="p-3.5 rounded-md bg-[#FAFAF7] border border-[#E5E9ED] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#697784]">
                            <span className="font-mono font-semibold text-[#10243A]">{task.reference}</span>
                            <span aria-hidden="true">·</span>
                            <span className={task.priority === 'Urgent' ? 'text-[#D64B4B] font-semibold' : ''}>
                              {task.priority} Priority
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>Due {task.scheduledDate}</span>
                          </div>
                          <p className="text-sm font-bold text-[#10243A] leading-snug">{task.listingTitle}</p>
                          <p className="text-xs text-[#697784]">
                            {task.farmName} · {task.district}, {task.province} · Seller: {task.sellerName} ({task.sellerPhone})
                          </p>
                        </div>
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => openTaskForVerification(task.id)}
                          className="w-full sm:w-auto"
                        >
                          Start Inspection
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'tasks' && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-[#10243A]">Assigned Verification Tasks</h1>
            <div className="space-y-3">
              {fieldTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white border border-[#E5E9ED] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#697784]">
                      <span className="font-mono font-bold text-[#10243A]">{task.reference}</span>
                      <span aria-hidden="true">·</span>
                      <span>{task.expectedCategory} ({task.expectedQuantity} head)</span>
                      <span aria-hidden="true">·</span>
                      <span>{task.scheduledDate}</span>
                    </div>
                    <h2 className="text-[15px] font-bold text-[#10243A] leading-snug">{task.listingTitle}</h2>
                    <p className="text-xs text-[#697784]">
                      {task.farmName} · {task.district}, {task.province} · {task.sellerPhone}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5E9ED]">
                    <StatusLabel
                      tone={
                        task.status === 'Completed'
                          ? 'success'
                          : task.status === 'Queued Offline'
                          ? 'warning'
                          : 'info'
                      }
                      label={task.status}
                    />
                    {task.status !== 'Completed' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openTaskForVerification(task.id)}
                      >
                        Open Form
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'verify' && activeTask && (
          <form onSubmit={handleSubmitInspection} className="max-w-2xl space-y-4">
            <div className="bg-white border border-[#E5E9ED] rounded-lg p-4 sm:p-5 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#697784]">
                <span className="font-mono font-bold text-[#10243A]">{activeTask.reference}</span>
                <span>Expected: {activeTask.expectedQuantity} {activeTask.expectedBreed}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#10243A] leading-snug">{activeTask.listingTitle}</h1>
              <p className="text-xs text-[#697784]">
                Seller: {activeTask.sellerName} ({activeTask.sellerPhone}) · {activeTask.farmName}, {activeTask.district}
              </p>
            </div>

            {/* GPS & Evidence Photos */}
            <div className="bg-white border border-[#E5E9ED] rounded-lg p-4 sm:p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-[#10243A]">1. Location & Photographic Evidence</h2>
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
                <Input
                  label="GPS Coordinates"
                  placeholder="Tap Capture GPS on-farm"
                  value={form.gpsCoordinates}
                  onChange={(e) => setForm({ ...form, gpsCoordinates: e.target.value })}
                  className="font-mono"
                />
                <Button type="button" variant="secondary" size="md" onClick={handleCaptureGps}>
                  <MapPin className="w-4 h-4 text-[#F28C28]" />
                  Capture GPS
                </Button>
              </div>
              {gpsStatus && <p className="text-xs text-[#21865B] font-medium">{gpsStatus}</p>}

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#17212B]">
                  Capture Inspection Photos (Stored Offline in IndexedDB)
                </label>
                <label className="h-11 px-4 rounded-md border border-dashed border-[#10243A]/40 bg-[#FAFAF7] hover:bg-[#F4F6F7] inline-flex items-center gap-2 text-xs font-semibold text-[#10243A] cursor-pointer max-w-full">
                  <Camera className="w-4 h-4 text-[#F28C28] shrink-0" />
                  <span className="truncate">Take Photo / Upload Evidence ({form.photos.length} attached)</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={handleCameraUpload}
                  />
                </label>
                {form.photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                    {form.photos.map((src, i) => (
                      <div key={i} className="relative aspect-[4/3] rounded overflow-hidden border border-[#E5E9ED] group">
                        <SafeImage src={src} alt={`Evidence ${i + 1}`} className="w-full h-full" />
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              photos: prev.photos.filter((_, idx) => idx !== i),
                            }))
                          }
                          aria-label={`Remove evidence photo ${i + 1}`}
                          className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-[#091827]/80 hover:bg-[#D64B4B] text-white flex items-center justify-center transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Physical Measurements */}
            <div className="bg-white border border-[#E5E9ED] rounded-lg p-4 sm:p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-[#10243A]">2. Physical Livestock Verification</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Observed Breed"
                  value={form.observedBreed}
                  onChange={(e) => setForm({ ...form, observedBreed: e.target.value })}
                  required
                />
                <Select
                  label="Observed Gender / Composition"
                  value={form.observedGender}
                  onChange={(e) => setForm({ ...form, observedGender: e.target.value as GenderType })}
                >
                  <option value="Bull / Male">Bull / Male</option>
                  <option value="Cow / Female">Cow / Female</option>
                  <option value="Heifer">Heifer</option>
                  <option value="Steer / Ox">Steer / Ox</option>
                  <option value="Mixed Herd">Mixed Herd</option>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Age (Mos)"
                  type="number"
                  min={1}
                  value={form.observedAgeMonths}
                  onChange={(e) => setForm({ ...form, observedAgeMonths: Number(e.target.value) })}
                />
                <Input
                  label="Weight (kg)"
                  type="number"
                  min={1}
                  value={form.observedWeightKg}
                  onChange={(e) => setForm({ ...form, observedWeightKg: Number(e.target.value) })}
                />
                <Input
                  label="Headcount"
                  type="number"
                  min={1}
                  value={form.observedQuantity}
                  onChange={(e) => setForm({ ...form, observedQuantity: Number(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Ear-Tag / Tattoo Range"
                  value={form.earTagRange}
                  onChange={(e) => setForm({ ...form, earTagRange: e.target.value })}
                />
                <Input
                  label="DVS Clearance Reference"
                  value={form.vetClearanceRef}
                  onChange={(e) => setForm({ ...form, vetClearanceRef: e.target.value })}
                />
              </div>
              <Select
                label="Clinical & Condition Assessment"
                value={form.healthScore}
                onChange={(e) =>
                  setForm({
                    ...form,
                    healthScore: e.target.value as OfflineInspectionDraft['healthScore'],
                  })
                }
              >
                <option value="Healthy & Cleared">Healthy & Cleared</option>
                <option value="Minor Observation">Minor Observation</option>
                <option value="Requires Veterinary Review">Requires Veterinary Review</option>
              </Select>
              <Textarea
                label="Field Inspector Notes"
                rows={3}
                placeholder="Note coat condition, crush temperament, dipping register verification, and scale readings..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <Button type="button" variant="secondary" size="lg" onClick={handleSaveDraft}>
                Save Draft Locally
              </Button>
              <Button type="submit" variant="accent" size="lg">
                <CheckCircle2 className="w-4 h-4" />
                {offlineMode ? 'Queue Report Offline' : 'Submit Verification Report'}
              </Button>
            </div>
          </form>
        )}

        {tab === 'verify' && !activeTask && (
          <EmptyState
            title="No verification task selected"
            description="Select an assigned farm inspection from your task queue to capture physical headcount, GPS coordinates, and veterinary records."
            action={
              <Button variant="primary" onClick={() => setTab('tasks')}>
                View Assigned Tasks
              </Button>
            }
          />
        )}

        {tab === 'reports' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-[#10243A]">IndexedDB Sync Queue & Reports</h1>
                <p className="text-xs text-[#697784] mt-0.5">
                  All offline drafts and submitted inspections persist safely across reloads.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={offlineMode || queuedCount === 0}
                onClick={syncOfflineQueue}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync Queue ({queuedCount})
              </Button>
            </div>

            {offlineDrafts.length === 0 ? (
              <div className="bg-white border border-[#E5E9ED] rounded-lg p-6 text-center text-sm text-[#697784]">
                No offline drafts or queued reports in IndexedDB yet. Open a task and save or submit a report (try toggling Offline Mode first to test queue & retry).
              </div>
            ) : (
              <div className="space-y-3">
                {offlineDrafts.map((d) => (
                  <div key={d.taskId} className="bg-white border border-[#E5E9ED] rounded-lg p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-[#697784]">
                          Task {d.taskId} · Saved {formatDateTime(d.savedAt)}
                        </p>
                        <p className="text-sm font-bold text-[#10243A] mt-0.5">
                          {d.observedBreed} · {d.observedQuantity} head · {d.observedWeightKg} kg avg
                        </p>
                      </div>
                      <StatusLabel
                        tone={
                          d.syncStatus === 'synced'
                            ? 'success'
                            : d.syncStatus === 'conflict'
                            ? 'danger'
                            : 'warning'
                        }
                        label={d.syncStatus.toUpperCase()}
                      />
                    </div>
                    {d.syncStatus === 'conflict' && (
                      <div className="p-3 rounded bg-[#FAFAF7] border border-[#D64B4B]/40 text-xs space-y-2.5">
                        <p className="font-semibold text-[#D64B4B] inline-flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          Sync Conflict Detected (Retry #{d.retryCount})
                        </p>
                        <p className="text-[#697784] leading-relaxed prose-justify">{d.conflictReason}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => resolveSyncConflict(d.taskId, 'keep_local')}
                          >
                            Use Field Count ({d.observedQuantity} head)
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => resolveSyncConflict(d.taskId, 'discard')}
                          >
                            Discard Local Draft
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'profile' && (
          <div className="bg-white border border-[#E5E9ED] rounded-lg p-5 max-w-xl space-y-3.5">
            <h1 className="text-lg font-bold text-[#10243A]">Field Agent Credentials</h1>
            <div className="space-y-2 text-sm">
              <p><strong>Inspector:</strong> {currentUser?.name}</p>
              <p><strong>Assigned Region:</strong> {currentUser?.meta?.assignedRegion || 'Matabeleland South & Midlands'}</p>
              <p><strong>Qualifications:</strong> {currentUser?.meta?.qualification || 'BSc Animal Science, Accredited Inspector'}</p>
              <p><strong>Contact:</strong> {currentUser?.phone}</p>
              <p><strong>Storage Engine:</strong> Browser IndexedDB (`mariketi_field_ops_db`)</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile-First Bottom Tab Navigation Bar */}
      <nav
        aria-label="Mobile field navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E5E9ED] shadow-[0_-4px_14px_rgba(9,24,39,0.06)] grid grid-cols-5 min-h-[60px] pb-[env(safe-area-inset-bottom)]"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold border-t-2 transition-colors',
                active
                  ? 'text-[#10243A] border-[#F28C28] bg-[#FAFAF7]'
                  : 'text-[#697784] border-transparent'
              )}
            >
              <Icon className={cn('w-4 h-4', active && 'text-[#C96A0F]')} />
              <span className="truncate max-w-full px-1">{item.label.split(' ')[0]}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 left-1/2 translate-x-2 h-4 min-w-[16px] px-1 rounded-full bg-[#10243A] text-white font-mono text-[9px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </WorkspaceShell>
  );
};
