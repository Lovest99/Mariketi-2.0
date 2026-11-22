import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  SEED_AUDIT_LOGS,
  SEED_CENTRE_RECORDS,
  SEED_CONVERSATIONS,
  SEED_DISPUTES,
  SEED_FIELD_TASKS,
  SEED_LISTINGS,
  SEED_NOTIFICATIONS,
  SEED_OFFERS,
  SEED_REVIEWS,
  SEED_TRANSACTIONS,
  SEED_TRANSPORT_JOBS,
  SEED_USERS,
  SEED_VEHICLES,
} from '../data/seedData';
import { generateRef, getCountry } from '../lib/utils';
import {
  deleteOfflineDraft,
  getAllOfflineDrafts,
  saveOfflineDraft,
} from '../services/offlineDb';
import type {
  AppNotification,
  AuditLogEntry,
  CollectionCentreRecord,
  Conversation,
  DisputeCase,
  FieldInspectionTask,
  LivestockListing,
  Offer,
  OfflineInspectionDraft,
  SellerReview,
  Transaction,
  TransactionState,
  TransportJob,
  TransportVehicle,
  UserAccount,
  UserRole,
  VerificationReport,
} from '../types/mariketi';

export type PublicPage =
  | 'home'
  | 'marketplace'
  | 'listing-detail'
  | 'about'
  | 'how-it-works'
  | 'verification'
  | 'contact'
  | 'help'
  | 'terms'
  | 'privacy'
  | 'auth';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: 'success' | 'info' | 'warning' | 'error';
}

interface MariketiState {
  users: UserAccount[];
  listings: LivestockListing[];
  offers: Offer[];
  transactions: Transaction[];
  fieldTasks: FieldInspectionTask[];
  centreRecords: CollectionCentreRecord[];
  transportJobs: TransportJob[];
  vehicles: TransportVehicle[];
  conversations: Conversation[];
  notifications: AppNotification[];
  reviews: SellerReview[];
  disputes: DisputeCase[];
  auditLogs: AuditLogEntry[];
  savedListingIds: string[];
  recentlyViewedIds: string[];
  compareListingIds: string[];
}

interface MariketiContextValue extends MariketiState {
  currentUser: UserAccount | null;
  activeView: 'public' | 'workspace';
  publicPage: PublicPage;
  selectedListingId: string | null;
  authInitialMode: 'login' | 'register' | 'forgot';
  authPreselectedRole: UserRole | null;
  offlineMode: boolean;
  offlineDrafts: OfflineInspectionDraft[];
  toasts: ToastMessage[];
  setOfflineMode: (val: boolean) => void;
  navigatePublic: (page: PublicPage, listingId?: string) => void;
  openAuth: (mode?: 'login' | 'register' | 'forgot', role?: UserRole) => void;
  openWorkspace: () => void;
  loginAsRole: (role: UserRole) => void;
  loginWithCredentials: (email: string) => boolean;
  registerUser: (user: Omit<UserAccount, 'id' | 'joinedAt' | 'rating' | 'reviewCount' | 'status' | 'verified'>) => void;
  logout: () => void;
  pushToast: (title: string, tone?: ToastMessage['tone'], description?: string) => void;
  dismissToast: (id: string) => void;

  // Marketplace interactions
  toggleSaveListing: (listingId: string) => void;
  toggleCompareListing: (listingId: string) => void;
  clearCompare: () => void;
  recordListingView: (listingId: string) => void;

  // Listing management
  createListing: (listing: Omit<LivestockListing, 'id' | 'reference' | 'listedAt' | 'views' | 'sellerId' | 'sellerName' | 'sellerRating' | 'sellerVerified'>) => LivestockListing;
  updateListing: (listingId: string, updates: Partial<Pick<LivestockListing, 'title' | 'breed' | 'priceUsd' | 'quantity' | 'weightKg' | 'description' | 'vaccinationSummary'>>) => void;
  updateListingStatus: (listingId: string, status: LivestockListing['status']) => void;
  approveListingVerification: (listingId: string, status: LivestockListing['verificationStatus']) => void;
  requestInspectionForListing: (listingId: string) => void;
  updateCurrentUserProfile: (updates: Partial<Pick<UserAccount, 'name' | 'organization' | 'phone' | 'country' | 'district' | 'province' | 'meta'>>) => void;

  // Offers & Negotiations (immutable history)
  submitOffer: (listingId: string, amountUsd: number, quantity: number, note: string) => Offer | null;
  counterOffer: (offerId: string, newAmountUsd: number, quantity: number, note: string) => void;
  acceptOffer: (offerId: string, note?: string) => void;
  rejectOffer: (offerId: string, note?: string) => void;

  // Transactions
  initiateTransactionFromOffer: (offerId: string, deliveryLocation: string) => Transaction | null;
  advanceTransactionState: (transactionId: string, nextState: TransactionState, note: string) => void;
  openDispute: (transactionId: string, reason: string, description: string) => void;
  resolveDispute: (disputeId: string, resolution: string) => void;
  submitSellerReview: (transactionId: string, rating: number, comment: string) => void;

  // Field Agent & IndexedDB Offline Sync
  saveFieldDraftOffline: (draft: OfflineInspectionDraft) => Promise<void>;
  submitFieldInspection: (draft: OfflineInspectionDraft) => Promise<void>;
  syncOfflineQueue: () => Promise<void>;
  resolveSyncConflict: (taskId: string, resolution: 'keep_local' | 'discard') => Promise<void>;

  // Collection Centre
  updateCentreRecord: (
    recordId: string,
    updates: Partial<CollectionCentreRecord>
  ) => void;
  createCentreRecord: (record: Omit<CollectionCentreRecord, 'id' | 'reference'>) => void;

  // Transport Partner
  acceptTransportJob: (jobId: string, vehicleReg: string, driverName: string) => void;
  updateTransportJobStatus: (
    jobId: string,
    status: TransportJob['status'],
    pod?: { recipient: string; code: string; notes: string }
  ) => void;
  addTransportVehicle: (vehicle: Omit<TransportVehicle, 'id'>) => void;

  // Admin
  updateUserStatus: (userId: string, status: UserAccount['status'], verified?: boolean) => void;
  assignFieldTask: (listingId: string, agentId: string, priority: 'Standard' | 'Urgent') => void;
  sendAdminBroadcast: (title: string, body: string, recipientRole: UserRole | 'all') => void;

  // Messaging & Notifications
  sendMessage: (conversationId: string, text: string, attachmentName?: string) => void;
  markConversationRead: (conversationId: string) => void;
  startConversation: (
    subject: string,
    contextType: Conversation['contextType'],
    contextRef: string,
    recipient: { id: string; name: string; role: UserRole },
    firstMessage: string
  ) => Conversation;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  resetDemoData: () => void;
}

const STORAGE_KEY = 'mariketi_v3_panafrica_state';

function loadInitialState(): MariketiState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MariketiState;
      return {
        ...parsed,
        users: (parsed.users || SEED_USERS).map((u) => ({
          ...u,
          country: u.country || 'Zimbabwe',
        })),
        listings: (parsed.listings || SEED_LISTINGS).map((l) => ({
          ...l,
          country: l.country || 'Zimbabwe',
        })),
        fieldTasks: (parsed.fieldTasks || SEED_FIELD_TASKS).map((t) => ({
          ...t,
          country: t.country || 'Zimbabwe',
        })),
      };
    }
  } catch {
    // ignore corrupted storage
  }
  return {
    users: SEED_USERS,
    listings: SEED_LISTINGS,
    offers: SEED_OFFERS,
    transactions: SEED_TRANSACTIONS,
    fieldTasks: SEED_FIELD_TASKS,
    centreRecords: SEED_CENTRE_RECORDS,
    transportJobs: SEED_TRANSPORT_JOBS,
    vehicles: SEED_VEHICLES,
    conversations: SEED_CONVERSATIONS,
    notifications: SEED_NOTIFICATIONS,
    reviews: SEED_REVIEWS,
    disputes: SEED_DISPUTES,
    auditLogs: SEED_AUDIT_LOGS,
    savedListingIds: ['lst-1', 'lst-10'],
    recentlyViewedIds: ['lst-1', 'lst-10'],
    compareListingIds: [],
  };
}

const MariketiContext = createContext<MariketiContextValue | null>(null);

export const MariketiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MariketiState>(loadInitialState);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeView, setActiveView] = useState<'public' | 'workspace'>('public');
  const [publicPage, setPublicPage] = useState<PublicPage>('home');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [authPreselectedRole, setAuthPreselectedRole] = useState<UserRole | null>(null);
  const [offlineMode, setOfflineMode] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineInspectionDraft[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage quota exceeded
    }
  }, [state]);

  useEffect(() => {
    getAllOfflineDrafts().then(setOfflineDrafts).catch(() => {});
  }, []);

  useEffect(() => {
    const onOffline = () => setOfflineMode(true);
    const onOnline = () => setOfflineMode(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const pushToast = useCallback(
    (title: string, tone: ToastMessage['tone'] = 'success', description?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, description, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addAudit = useCallback(
    (actor: string, role: UserRole, action: string, target: string) => {
      const entry: AuditLogEntry = {
        id: `aud-${Date.now()}`,
        actor,
        role,
        action,
        target,
        timestamp: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        auditLogs: [entry, ...prev.auditLogs],
      }));
    },
    []
  );

  const addNotification = useCallback(
    (
      recipientRole: UserRole | 'all',
      title: string,
      body: string,
      category: AppNotification['category']
    ) => {
      const notif: AppNotification = {
        id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        recipientRole,
        title,
        body,
        category,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setState((prev) => ({
        ...prev,
        notifications: [notif, ...prev.notifications],
      }));
    },
    []
  );

  const navigatePublic = useCallback((page: PublicPage, listingId?: string) => {
    setActiveView('public');
    setPublicPage(page);
    if (listingId) {
      setSelectedListingId(listingId);
      setState((prev) => ({
        ...prev,
        recentlyViewedIds: [
          listingId,
          ...prev.recentlyViewedIds.filter((id) => id !== listingId),
        ].slice(0, 6),
        listings: prev.listings.map((l) =>
          l.id === listingId ? { ...l, views: l.views + 1 } : l
        ),
      }));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openAuth = useCallback(
    (mode: 'login' | 'register' | 'forgot' = 'login', role?: UserRole) => {
      setAuthInitialMode(mode);
      setAuthPreselectedRole(role ?? null);
      setActiveView('public');
      setPublicPage('auth');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const openWorkspace = useCallback(() => {
    if (!currentUser) {
      openAuth('login');
      return;
    }
    setActiveView('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentUser, openAuth]);

  const loginAsRole = useCallback(
    (role: UserRole) => {
      const found = state.users.find((u) => u.role === role);
      if (found) {
        setCurrentUser(found);
        setActiveView('workspace');
        pushToast(`Signed in as ${found.name}`, 'info', `${found.organization || role.toUpperCase()} workspace ready.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [state.users, pushToast]
  );

  const loginWithCredentials = useCallback(
    (email: string) => {
      const found = state.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (found) {
        setCurrentUser(found);
        setActiveView('workspace');
        pushToast(`Welcome back, ${found.name}`, 'success');
        return true;
      }
      return false;
    },
    [state.users, pushToast]
  );

  const registerUser = useCallback(
    (userInput: Omit<UserAccount, 'id' | 'joinedAt' | 'rating' | 'reviewCount' | 'status' | 'verified'>) => {
      const newUser: UserAccount = {
        ...userInput,
        id: `usr-${Date.now()}`,
        joinedAt: new Date().toISOString(),
        rating: 5.0,
        reviewCount: 0,
        status: 'active',
        verified: userInput.role === 'buyer',
      };
      setState((prev) => ({ ...prev, users: [newUser, ...prev.users] }));
      setCurrentUser(newUser);
      setActiveView('workspace');
      addAudit(newUser.name, newUser.role, 'Completed account onboarding', `${newUser.role} account`);
      pushToast('Account created and onboarded', 'success', `Welcome to MARIKETI, ${newUser.name}.`);
    },
    [addAudit, pushToast]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setActiveView('public');
    setPublicPage('home');
    pushToast('Signed out', 'info');
  }, [pushToast]);

  const toggleSaveListing = useCallback(
    (listingId: string) => {
      setState((prev) => {
        const exists = prev.savedListingIds.includes(listingId);
        return {
          ...prev,
          savedListingIds: exists
            ? prev.savedListingIds.filter((id) => id !== listingId)
            : [listingId, ...prev.savedListingIds],
        };
      });
    },
    []
  );

  const toggleCompareListing = useCallback(
    (listingId: string) => {
      setState((prev) => {
        const exists = prev.compareListingIds.includes(listingId);
        if (exists) {
          return {
            ...prev,
            compareListingIds: prev.compareListingIds.filter((id) => id !== listingId),
          };
        }
        if (prev.compareListingIds.length >= 3) {
          pushToast('Comparison limit reached', 'warning', 'Compare up to 3 listings side by side.');
          return prev;
        }
        return {
          ...prev,
          compareListingIds: [...prev.compareListingIds, listingId],
        };
      });
    },
    [pushToast]
  );

  const clearCompare = useCallback(() => {
    setState((prev) => ({ ...prev, compareListingIds: [] }));
  }, []);

  const recordListingView = useCallback((listingId: string) => {
    setState((prev) => ({
      ...prev,
      recentlyViewedIds: [
        listingId,
        ...prev.recentlyViewedIds.filter((id) => id !== listingId),
      ].slice(0, 6),
    }));
  }, []);

  const createListing = useCallback(
    (
      input: Omit<
        LivestockListing,
        | 'id'
        | 'reference'
        | 'listedAt'
        | 'views'
        | 'sellerId'
        | 'sellerName'
        | 'sellerRating'
        | 'sellerVerified'
      >
    ) => {
      const seller = currentUser || state.users.find((u) => u.role === 'seller')!;
      const newListing: LivestockListing = {
        ...input,
        id: `lst-${Date.now()}`,
        reference: generateRef('MRK'),
        listedAt: new Date().toISOString(),
        views: 1,
        sellerId: seller.id,
        sellerName: seller.name,
        sellerRating: seller.rating || 4.8,
        sellerVerified: seller.verified,
      };
      setState((prev) => ({
        ...prev,
        listings: [newListing, ...prev.listings],
      }));
      if (newListing.verificationStatus === 'Pending Verification') {
        const defaultAgent =
          state.users.find((u) => u.role === 'agent' && u.country === newListing.country) ||
          state.users.find((u) => u.role === 'agent')!;
        const task: FieldInspectionTask = {
          id: `tsk-${Date.now()}`,
          reference: generateRef('INS'),
          listingId: newListing.id,
          listingTitle: newListing.title,
          sellerName: seller.name,
          sellerPhone: seller.phone,
          farmName: newListing.farmName,
          country: newListing.country,
          province: newListing.province,
          district: newListing.district,
          assignedAgentId: defaultAgent.id,
          assignedAgentName: defaultAgent.name,
          scheduledDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
          priority: 'Standard',
          status: 'Assigned',
          expectedCategory: newListing.category,
          expectedBreed: newListing.breed,
          expectedQuantity: newListing.quantity,
        };
        setState((prev) => ({
          ...prev,
          fieldTasks: [task, ...prev.fieldTasks],
        }));
        const countryInfo = getCountry(newListing.country);
        addNotification(
          'agent',
          `New verification requested: ${newListing.reference}`,
          `${newListing.title} in ${countryInfo.flag} ${newListing.district}, ${newListing.province}, ${newListing.country}.`,
          'verification'
        );
      }
      addAudit(seller.name, seller.role, 'Published livestock listing', newListing.reference);
      pushToast('Listing published', 'success', `${newListing.reference} is now live on MARIKETI.`);
      return newListing;
    },
    [currentUser, state.users, addAudit, addNotification, pushToast]
  );

  const updateListingStatus = useCallback(
    (listingId: string, status: LivestockListing['status']) => {
      setState((prev) => ({
        ...prev,
        listings: prev.listings.map((l) => (l.id === listingId ? { ...l, status } : l)),
      }));
      pushToast(`Listing marked as ${status}`, 'info');
    },
    [pushToast]
  );

  const approveListingVerification = useCallback(
    (listingId: string, verificationStatus: LivestockListing['verificationStatus']) => {
      setState((prev) => ({
        ...prev,
        listings: prev.listings.map((l) =>
          l.id === listingId ? { ...l, verificationStatus } : l
        ),
      }));
      const actor = currentUser?.name || 'MARIKETI Admin';
      addAudit(actor, currentUser?.role || 'admin', `Set verification to ${verificationStatus}`, listingId);
      addNotification('seller', `Verification updated: ${verificationStatus}`, `Listing ${listingId} verification status changed.`, 'verification');
      pushToast(`Verification set to ${verificationStatus}`, 'success');
    },
    [currentUser, addAudit, addNotification, pushToast]
  );

  const requestInspectionForListing = useCallback(
    (listingId: string) => {
      const listing = state.listings.find((l) => l.id === listingId);
      if (!listing) return;
      const sellerAcc = state.users.find((u) => u.id === listing.sellerId);
      const defaultAgent =
        state.users.find((u) => u.role === 'agent' && u.country === listing.country) ||
        state.users.find((u) => u.role === 'agent')!;
      const countryInfo = getCountry(listing.country);
      const task: FieldInspectionTask = {
        id: `tsk-${Date.now()}`,
        reference: generateRef('INS'),
        listingId: listing.id,
        listingTitle: listing.title,
        sellerName: listing.sellerName,
        sellerPhone: sellerAcc?.phone || `${countryInfo.dialCode} 71 290 4412`,
        farmName: listing.farmName,
        country: listing.country,
        province: listing.province,
        district: listing.district,
        assignedAgentId: defaultAgent.id,
        assignedAgentName: defaultAgent.name,
        scheduledDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        priority: 'Urgent',
        status: 'Assigned',
        expectedCategory: listing.category,
        expectedBreed: listing.breed,
        expectedQuantity: listing.quantity,
      };
      setState((prev) => ({
        ...prev,
        fieldTasks: [task, ...prev.fieldTasks],
        listings: prev.listings.map((l) =>
          l.id === listingId && l.verificationStatus !== 'Verified'
            ? { ...l, verificationStatus: 'Inspection Scheduled' }
            : l
        ),
      }));
      addNotification(
        'agent',
        `Buyer-requested inspection: ${listing.reference}`,
        `Assigned to ${defaultAgent.name} for ${countryInfo.flag} ${listing.district}, ${listing.province}, ${listing.country}.`,
        'verification'
      );
      pushToast('Field inspection requested', 'success', `Task ${task.reference} dispatched to MARIKETI Field Unit.`);
    },
    [state.listings, state.users, addNotification, pushToast]
  );

  const submitOffer = useCallback(
    (listingId: string, amountUsd: number, quantity: number, note: string) => {
      const listing = state.listings.find((l) => l.id === listingId);
      if (!listing) return null;
      const buyer =
        currentUser?.role === 'buyer'
          ? currentUser
          : state.users.find((u) => u.role === 'buyer')!;
      const now = new Date().toISOString();
      const newOffer: Offer = {
        id: `off-${Date.now()}`,
        reference: generateRef('OFR'),
        listingId: listing.id,
        listingTitle: listing.title,
        listingRef: listing.reference,
        buyerId: buyer.id,
        buyerName: buyer.name,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        currentAmountUsd: amountUsd,
        quantity,
        status: 'pending',
        lastActorRole: 'buyer',
        expiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
        createdAt: now,
        updatedAt: now,
        history: [
          {
            id: `oh-${Date.now()}`,
            actorId: buyer.id,
            actorName: buyer.name,
            actorRole: 'buyer',
            action: 'initial_offer',
            amountUsd,
            quantity,
            note: note || `Submitted offer of $${amountUsd.toLocaleString()} for ${quantity} head.`,
            timestamp: now,
          },
        ],
      };
      setState((prev) => ({ ...prev, offers: [newOffer, ...prev.offers] }));
      addNotification(
        'seller',
        `New offer ${newOffer.reference} on ${listing.reference}`,
        `${buyer.name} offered $${amountUsd.toLocaleString()} for ${quantity} head.`,
        'offer'
      );
      addAudit(buyer.name, 'buyer', 'Submitted livestock offer', `${newOffer.reference} ($${amountUsd})`);
      pushToast('Offer submitted', 'success', `Reference ${newOffer.reference} sent to ${listing.sellerName}.`);
      return newOffer;
    },
    [state.listings, state.users, currentUser, addNotification, addAudit, pushToast]
  );

  const counterOffer = useCallback(
    (offerId: string, newAmountUsd: number, quantity: number, note: string) => {
      const actor = currentUser || state.users[0];
      const actorRole: 'buyer' | 'seller' = actor.role === 'seller' ? 'seller' : 'buyer';
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        offers: prev.offers.map((o) => {
          if (o.id !== offerId) return o;
          return {
            ...o,
            currentAmountUsd: newAmountUsd,
            quantity,
            status: 'countered',
            lastActorRole: actorRole,
            updatedAt: now,
            history: [
              ...o.history,
              {
                id: `oh-${Date.now()}`,
                actorId: actor.id,
                actorName: actor.name,
                actorRole,
                action: 'counter_offer',
                amountUsd: newAmountUsd,
                quantity,
                note: note || `Counter-offer at $${newAmountUsd.toLocaleString()}`,
                timestamp: now,
              },
            ],
          };
        }),
      }));
      addNotification(
        actorRole === 'seller' ? 'buyer' : 'seller',
        'Counter-offer received',
        `${actor.name} proposed $${newAmountUsd.toLocaleString()} (${quantity} head).`,
        'offer'
      );
      addAudit(actor.name, actor.role, 'Issued counter-offer', `${offerId} ($${newAmountUsd})`);
      pushToast('Counter-offer sent', 'success', 'Full negotiation history preserved.');
    },
    [currentUser, state.users, addNotification, addAudit, pushToast]
  );

  const acceptOffer = useCallback(
    (offerId: string, note = 'Terms agreed. Ready to initiate transaction.') => {
      const actor = currentUser || state.users[0];
      const actorRole: 'buyer' | 'seller' = actor.role === 'seller' ? 'seller' : 'buyer';
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        offers: prev.offers.map((o) => {
          if (o.id !== offerId) return o;
          return {
            ...o,
            status: 'accepted',
            lastActorRole: actorRole,
            updatedAt: now,
            history: [
              ...o.history,
              {
                id: `oh-${Date.now()}`,
                actorId: actor.id,
                actorName: actor.name,
                actorRole,
                action: 'accepted',
                amountUsd: o.currentAmountUsd,
                quantity: o.quantity,
                note,
                timestamp: now,
              },
            ],
          };
        }),
      }));
      addNotification(
        actorRole === 'seller' ? 'buyer' : 'seller',
        'Offer accepted',
        `${actor.name} accepted the offer. You can now initiate the transaction.`,
        'offer'
      );
      addAudit(actor.name, actor.role, 'Accepted offer', offerId);
      pushToast('Offer accepted', 'success', 'Proceed to initiate a verified transaction.');
    },
    [currentUser, state.users, addNotification, addAudit, pushToast]
  );

  const rejectOffer = useCallback(
    (offerId: string, note = 'Offer declined.') => {
      const actor = currentUser || state.users[0];
      const actorRole: 'buyer' | 'seller' = actor.role === 'seller' ? 'seller' : 'buyer';
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        offers: prev.offers.map((o) => {
          if (o.id !== offerId) return o;
          return {
            ...o,
            status: 'rejected',
            lastActorRole: actorRole,
            updatedAt: now,
            history: [
              ...o.history,
              {
                id: `oh-${Date.now()}`,
                actorId: actor.id,
                actorName: actor.name,
                actorRole,
                action: 'rejected',
                amountUsd: o.currentAmountUsd,
                quantity: o.quantity,
                note,
                timestamp: now,
              },
            ],
          };
        }),
      }));
      pushToast('Offer declined', 'info');
    },
    [currentUser, state.users, pushToast]
  );

  const initiateTransactionFromOffer = useCallback(
    (offerId: string, deliveryLocation: string) => {
      const offer = state.offers.find((o) => o.id === offerId);
      if (!offer) return null;
      const listing = state.listings.find((l) => l.id === offer.listingId);
      const now = new Date().toISOString();
      const handoverCode = `HND-${Math.floor(1000 + Math.random() * 9000)}`;
      const listingCountry = getCountry(listing?.country);
      const txn: Transaction = {
        id: `txn-${Date.now()}`,
        reference: generateRef('TXN'),
        offerId: offer.id,
        listingId: offer.listingId,
        listingTitle: offer.listingTitle,
        listingCategory: listing?.category || 'Cattle',
        quantity: offer.quantity,
        buyerId: offer.buyerId,
        buyerName: offer.buyerName,
        sellerId: offer.sellerId,
        sellerName: offer.sellerName,
        agreedAmountUsd: offer.currentAmountUsd,
        state: 'Awaiting payment',
        paymentMode: 'Simulated Demo Settlement (No Live Funds Held)',
        paymentStatus: 'Unpaid',
        collectionCentreName: `${listing?.district || 'Regional'} Livestock Collection Hub (${listingCountry.flag} ${listingCountry.name})`,
        pickupLocation: listing
          ? `${listingCountry.flag} ${listing.farmName}, ${listing.district}, ${listingCountry.name}`
          : 'Registered Ranch',
        deliveryLocation: deliveryLocation || 'Buyer Designated Receiving Depot',
        handoverCode,
        documents: [
          {
            name: 'Agreed Offer Summary',
            ref: offer.reference,
            verified: true,
          },
          {
            name: `Veterinary Movement Clearance (${listingCountry.vetAuthority} — Pending)`,
            ref: `VET-${listingCountry.code}-PENDING`,
            verified: false,
          },
        ],
        timeline: [
          {
            id: `te-${Date.now()}-1`,
            state: 'Offer accepted',
            actor: offer.sellerName,
            note: `Offer ${offer.reference} agreed at $${offer.currentAmountUsd.toLocaleString()}.`,
            timestamp: offer.updatedAt,
          },
          {
            id: `te-${Date.now()}-2`,
            state: 'Initiated',
            actor: offer.buyerName,
            note: 'Transaction workspace created from accepted offer.',
            timestamp: now,
          },
          {
            id: `te-${Date.now()}-3`,
            state: 'Awaiting payment',
            actor: 'MARIKETI Workflow',
            note: 'Awaiting demo settlement confirmation (simulated environment — no live escrow or bank rails active).',
            timestamp: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      const newCentreRec: CollectionCentreRecord = {
        id: `ccr-${Date.now()}`,
        reference: generateRef('MCC'),
        centreName: txn.collectionCentreName,
        country: listingCountry.name,
        transactionRef: txn.reference,
        listingTitle: txn.listingTitle,
        category: txn.listingCategory,
        quantity: txn.quantity,
        sellerName: txn.sellerName,
        buyerName: txn.buyerName,
        penNumber: 'Pen Pending Assignment',
        checkedWeightAvgKg: listing?.weightKg || 350,
        status: 'Expected',
        expectedAt: new Date(Date.now() + 86400000 * 3).toISOString(),
        handoverPin: handoverCode,
        notes: 'Created automatically upon transaction initiation.',
      };

      const newTransportJob: TransportJob = {
        id: `trp-${Date.now()}`,
        reference: generateRef('TRP'),
        transactionId: txn.id,
        transactionRef: txn.reference,
        listingTitle: txn.listingTitle,
        category: txn.listingCategory,
        quantity: txn.quantity,
        country: listingCountry.name,
        pickupLocation: txn.pickupLocation,
        destination: txn.deliveryLocation,
        distanceKm: 215,
        requirements: `Accredited ${txn.listingCategory.toLowerCase()} carrier with ventilation and water access.`,
        scheduledDate: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
        feeUsd: Math.max(220, txn.quantity * 12),
        status: 'Available',
      };

      setState((prev) => ({
        ...prev,
        transactions: [txn, ...prev.transactions],
        offers: prev.offers.map((o) =>
          o.id === offerId ? { ...o, status: 'converted' } : o
        ),
        centreRecords: [newCentreRec, ...prev.centreRecords],
        transportJobs: [newTransportJob, ...prev.transportJobs],
      }));
      addNotification('seller', `Transaction ${txn.reference} initiated`, `${offer.buyerName} opened transaction for ${txn.listingTitle}.`, 'transaction');
      addNotification('transport', `New transport job ${newTransportJob.reference}`, `${txn.quantity} ${txn.listingCategory} from ${txn.pickupLocation} to ${txn.deliveryLocation}.`, 'logistics');
      addAudit(offer.buyerName, 'buyer', 'Initiated transaction', txn.reference);
      pushToast('Transaction initiated', 'success', `${txn.reference} created with collection & transport records.`);
      return txn;
    },
    [state.offers, state.listings, addNotification, addAudit, pushToast]
  );

  const advanceTransactionState = useCallback(
    (transactionId: string, nextState: TransactionState, note: string) => {
      const actor = currentUser?.name || 'Operations';
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) => {
          if (t.id !== transactionId) return t;
          const paymentStatus =
            nextState === 'Payment confirmed'
              ? 'Demo Payment Confirmed'
              : nextState === 'Cancelled'
              ? 'Refunded (Demo)'
              : t.paymentStatus;
          return {
            ...t,
            state: nextState,
            paymentStatus,
            updatedAt: now,
            timeline: [
              ...t.timeline,
              {
                id: `te-${Date.now()}`,
                state: nextState,
                actor,
                note,
                timestamp: now,
              },
            ],
          };
        }),
      }));
      addAudit(actor, currentUser?.role || 'buyer', `Transaction -> ${nextState}`, transactionId);
      addNotification('all', `Transaction updated: ${nextState}`, note, 'transaction');
      pushToast(`Transaction marked: ${nextState}`, 'success');
    },
    [currentUser, addAudit, addNotification, pushToast]
  );

  const openDispute = useCallback(
    (transactionId: string, reason: string, description: string) => {
      const txn = state.transactions.find((t) => t.id === transactionId);
      if (!txn) return;
      const actor = currentUser || state.users[0];
      const dispute: DisputeCase = {
        id: `dsp-${Date.now()}`,
        reference: generateRef('DSP'),
        transactionId,
        transactionRef: txn.reference,
        openedBy: `${actor.name} (${actor.role})`,
        against: actor.id === txn.buyerId ? `${txn.sellerName} (Seller)` : `${txn.buyerName} (Buyer)`,
        reason,
        description,
        status: 'Open',
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        disputes: [dispute, ...prev.disputes],
        transactions: prev.transactions.map((t) =>
          t.id === transactionId
            ? {
                ...t,
                state: 'Disputed',
                timeline: [
                  ...t.timeline,
                  {
                    id: `te-${Date.now()}`,
                    state: 'Disputed',
                    actor: actor.name,
                    note: `Dispute ${dispute.reference} opened: ${reason}`,
                    timestamp: new Date().toISOString(),
                  },
                ],
              }
            : t
        ),
      }));
      addNotification('admin', `New dispute ${dispute.reference}`, `${reason} on ${txn.reference}.`, 'dispute');
      addAudit(actor.name, actor.role, 'Opened transaction dispute', dispute.reference);
      pushToast('Dispute logged for review', 'warning', `Reference ${dispute.reference} escalated to MARIKETI Operations.`);
    },
    [state.transactions, state.users, currentUser, addNotification, addAudit, pushToast]
  );

  const resolveDispute = useCallback(
    (disputeId: string, resolution: string) => {
      setState((prev) => ({
        ...prev,
        disputes: prev.disputes.map((d) =>
          d.id === disputeId ? { ...d, status: 'Resolved', resolution } : d
        ),
      }));
      addAudit(currentUser?.name || 'Admin', 'admin', 'Resolved dispute', disputeId);
      pushToast('Dispute marked resolved', 'success');
    },
    [currentUser, addAudit, pushToast]
  );

  const submitSellerReview = useCallback(
    (transactionId: string, rating: number, comment: string) => {
      const txn = state.transactions.find((t) => t.id === transactionId);
      if (!txn) return;
      const review: SellerReview = {
        id: `rev-${Date.now()}`,
        sellerId: txn.sellerId,
        sellerName: txn.sellerName,
        buyerId: txn.buyerId,
        buyerName: txn.buyerName,
        transactionRef: txn.reference,
        rating,
        comment,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        reviews: [review, ...prev.reviews],
        transactions: prev.transactions.map((t) =>
          t.id === transactionId ? { ...t, hasReview: true } : t
        ),
      }));
      addNotification('seller', 'New buyer review received', `${txn.buyerName} rated ${rating}/5 on ${txn.reference}.`, 'review');
      pushToast('Review published', 'success', 'Thank you for strengthening marketplace transparency.');
    },
    [state.transactions, addNotification, pushToast]
  );

  // Field Agent & IndexedDB Offline Sync
  const saveFieldDraftOffline = useCallback(
    async (draft: OfflineInspectionDraft) => {
      await saveOfflineDraft(draft);
      const all = await getAllOfflineDrafts();
      setOfflineDrafts(all);
      setState((prev) => ({
        ...prev,
        fieldTasks: prev.fieldTasks.map((t) =>
          t.id === draft.taskId
            ? {
                ...t,
                status: draft.syncStatus === 'queued' ? 'Queued Offline' : 'In Progress',
              }
            : t
        ),
      }));
      pushToast(
        draft.syncStatus === 'queued' ? 'Saved to Offline Sync Queue' : 'Draft saved locally (IndexedDB)',
        'info',
        'Your inspection data and photos will persist even if you lose signal or refresh.'
      );
    },
    [pushToast]
  );

  const applyInspectionReportToState = useCallback(
    (draft: OfflineInspectionDraft) => {
      const agent = currentUser?.role === 'agent' ? currentUser : state.users.find((u) => u.role === 'agent')!;
      const report: VerificationReport = {
        id: `ver-${Date.now()}`,
        listingId: draft.listingId,
        agentId: agent.id,
        agentName: agent.name,
        inspectedAt: draft.savedAt,
        gpsCoordinates: draft.gpsCoordinates || '-20.1500, 28.5833',
        observedBreed: draft.observedBreed,
        observedAgeMonths: draft.observedAgeMonths,
        observedGender: draft.observedGender,
        observedWeightKg: draft.observedWeightKg,
        observedQuantity: draft.observedQuantity,
        earTagRange: draft.earTagRange || 'AF-VERIFIED-TAG',
        healthScore: draft.healthScore,
        vetClearanceRef: draft.vetClearanceRef || generateRef('VET'),
        notes: draft.notes,
        photos: draft.photos,
        outcome: draft.healthScore === 'Requires Veterinary Review' ? 'Flagged' : 'Approved',
      };
      setState((prev) => ({
        ...prev,
        listings: prev.listings.map((l) =>
          l.id === draft.listingId
            ? {
                ...l,
                verificationStatus: report.outcome === 'Approved' ? 'Verified' : 'Pending Verification',
                verificationReport: report,
                weightKg: draft.observedWeightKg || l.weightKg,
                quantity: draft.observedQuantity || l.quantity,
              }
            : l
        ),
        fieldTasks: prev.fieldTasks.map((t) =>
          t.id === draft.taskId ? { ...t, status: 'Completed' } : t
        ),
      }));
      addNotification(
        'seller',
        `Field inspection synced (${report.outcome})`,
        `Inspector ${agent.name} completed on-site verification.`,
        'verification'
      );
      addAudit(agent.name, 'agent', `Synced verification report (${report.outcome})`, draft.listingId);
    },
    [currentUser, state.users, addNotification, addAudit]
  );

  const submitFieldInspection = useCallback(
    async (draft: OfflineInspectionDraft) => {
      if (offlineMode) {
        const queued: OfflineInspectionDraft = {
          ...draft,
          syncStatus: 'queued',
          savedAt: new Date().toISOString(),
        };
        await saveFieldDraftOffline(queued);
        return;
      }
      applyInspectionReportToState(draft);
      await saveOfflineDraft({ ...draft, syncStatus: 'synced' });
      const all = await getAllOfflineDrafts();
      setOfflineDrafts(all);
      pushToast('Inspection report submitted & verified', 'success', 'Listing updated across the MARIKETI marketplace.');
    },
    [offlineMode, saveFieldDraftOffline, applyInspectionReportToState, pushToast]
  );

  const syncOfflineQueue = useCallback(async () => {
    if (offlineMode) {
      pushToast('Cannot sync while offline', 'warning', 'Switch back online to upload queued reports.');
      return;
    }
    const drafts = await getAllOfflineDrafts();
    const pending = drafts.filter((d) => d.syncStatus === 'queued' || d.syncStatus === 'conflict');
    if (pending.length === 0) {
      pushToast('All field records are up to date', 'info');
      return;
    }
    for (const draft of pending) {
      // Simulate conflict detection if listing quantity changed remotely while offline on first retry
      const remoteListing = state.listings.find((l) => l.id === draft.listingId);
      if (
        remoteListing &&
        draft.retryCount === 0 &&
        Math.abs(remoteListing.quantity - draft.observedQuantity) >= 5 &&
        draft.syncStatus !== 'conflict'
      ) {
        await saveOfflineDraft({
          ...draft,
          syncStatus: 'conflict',
          retryCount: 1,
          conflictReason: `Remote listing states ${remoteListing.quantity} head, but field count recorded ${draft.observedQuantity} head.`,
        });
      } else {
        applyInspectionReportToState(draft);
        await saveOfflineDraft({ ...draft, syncStatus: 'synced', conflictReason: undefined });
      }
    }
    const refreshed = await getAllOfflineDrafts();
    setOfflineDrafts(refreshed);
    const hasConflicts = refreshed.some((d) => d.syncStatus === 'conflict');
    if (hasConflicts) {
      pushToast('Sync completed with 1 conflict', 'warning', 'Review quantity variance in the Sync Queue.');
    } else {
      pushToast(`Synced ${pending.length} inspection report(s)`, 'success');
    }
  }, [offlineMode, state.listings, applyInspectionReportToState, pushToast]);

  const resolveSyncConflict = useCallback(
    async (taskId: string, resolution: 'keep_local' | 'discard') => {
      const drafts = await getAllOfflineDrafts();
      const target = drafts.find((d) => d.taskId === taskId);
      if (!target) return;
      if (resolution === 'keep_local') {
        applyInspectionReportToState(target);
        await saveOfflineDraft({ ...target, syncStatus: 'synced', conflictReason: undefined });
        pushToast('Conflict resolved using field count', 'success');
      } else {
        await deleteOfflineDraft(taskId);
        pushToast('Local conflicting draft discarded', 'info');
      }
      const refreshed = await getAllOfflineDrafts();
      setOfflineDrafts(refreshed);
    },
    [applyInspectionReportToState, pushToast]
  );

  // Collection Centre
  const updateCentreRecord = useCallback(
    (recordId: string, updates: Partial<CollectionCentreRecord>) => {
      const targetRec = state.centreRecords.find((r) => r.id === recordId);
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        centreRecords: prev.centreRecords.map((r) =>
          r.id === recordId ? { ...r, ...updates } : r
        ),
        transactions:
          updates.status === 'Released' && targetRec
            ? prev.transactions.map((t) =>
                t.reference === targetRec.transactionRef && t.state !== 'Completed'
                  ? {
                      ...t,
                      state: 'Handover initiated',
                      updatedAt: now,
                      timeline: [
                        ...t.timeline,
                        {
                          id: `te-${Date.now()}`,
                          state: 'Handover initiated',
                          actor: currentUser?.name || 'Collection Hub',
                          note: `Released from ${targetRec.centreName} (${targetRec.penNumber}) after PIN ${targetRec.handoverPin} verification.`,
                          timestamp: now,
                        },
                      ],
                    }
                  : t
              )
            : prev.transactions,
      }));
      addAudit(
        currentUser?.name || 'Collection Hub',
        'centre',
        `Updated intake record (${updates.status || 'details'})`,
        targetRec?.reference || recordId
      );
      pushToast('Collection centre record updated', 'success');
    },
    [state.centreRecords, currentUser, addAudit, pushToast]
  );

  const createCentreRecord = useCallback(
    (record: Omit<CollectionCentreRecord, 'id' | 'reference'>) => {
      const created: CollectionCentreRecord = {
        ...record,
        id: `ccr-${Date.now()}`,
        reference: generateRef('MCC'),
      };
      setState((prev) => ({ ...prev, centreRecords: [created, ...prev.centreRecords] }));
      pushToast('Intake record logged', 'success', `${created.reference} assigned to ${created.penNumber}.`);
    },
    [pushToast]
  );

  // Transport Partner
  const acceptTransportJob = useCallback(
    (jobId: string, vehicleReg: string, driverName: string) => {
      const partner = currentUser?.role === 'transport' ? currentUser : state.users.find((u) => u.role === 'transport')!;
      setState((prev) => ({
        ...prev,
        transportJobs: prev.transportJobs.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: 'Accepted',
                assignedPartnerId: partner.id,
                assignedVehicle: vehicleReg,
                assignedDriver: driverName,
              }
            : j
        ),
      }));
      addAudit(partner.name, 'transport', 'Accepted transport job', `${jobId} (${vehicleReg})`);
      pushToast('Transport job accepted', 'success', `Assigned ${vehicleReg} with driver ${driverName}.`);
    },
    [currentUser, state.users, addAudit, pushToast]
  );

  const updateTransportJobStatus = useCallback(
    (
      jobId: string,
      status: TransportJob['status'],
      pod?: { recipient: string; code: string; notes: string }
    ) => {
      const now = new Date().toISOString();
      const targetJob = state.transportJobs.find((j) => j.id === jobId);
      setState((prev) => ({
        ...prev,
        transportJobs: prev.transportJobs.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status,
                ...(pod
                  ? {
                      podRecipient: pod.recipient,
                      podCode: pod.code,
                      podConditionNotes: pod.notes,
                      podDeliveredAt: now,
                    }
                  : {}),
              }
            : j
        ),
        transactions:
          status === 'Delivered' && targetJob
            ? prev.transactions.map((t) =>
                t.id === targetJob.transactionId
                  ? {
                      ...t,
                      state: 'Handover verified',
                      timeline: [
                        ...t.timeline,
                        {
                          id: `te-${Date.now()}`,
                          state: 'Handover verified',
                          actor: targetJob.assignedDriver || 'Transport Partner',
                          note: `Proof of delivery signed by ${pod?.recipient || 'Receiver'} (Code: ${pod?.code || 'Verified'}).`,
                          timestamp: now,
                        },
                      ],
                    }
                  : t
              )
            : prev.transactions,
      }));
      addNotification('buyer', `Delivery status: ${status}`, `Consignment ${targetJob?.reference || jobId} updated.`, 'logistics');
      addAudit(currentUser?.name || 'Transport Partner', 'transport', `Updated job -> ${status}`, targetJob?.reference || jobId);
      pushToast(`Job marked: ${status}`, 'success');
    },
    [state.transportJobs, currentUser, addNotification, addAudit, pushToast]
  );

  const addTransportVehicle = useCallback(
    (vehicle: Omit<TransportVehicle, 'id'>) => {
      setState((prev) => ({
        ...prev,
        vehicles: [{ ...vehicle, id: `veh-${Date.now()}` }, ...prev.vehicles],
      }));
      pushToast('Vehicle registered to fleet', 'success', vehicle.registration);
    },
    [pushToast]
  );

  // Admin
  const updateUserStatus = useCallback(
    (userId: string, status: UserAccount['status'], verified?: boolean) => {
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === userId ? { ...u, status, verified: verified ?? u.verified } : u
        ),
      }));
      addAudit(currentUser?.name || 'Admin', 'admin', `Updated user status -> ${status}`, userId);
      pushToast(`User status updated to ${status}`, 'success');
    },
    [currentUser, addAudit, pushToast]
  );

  const assignFieldTask = useCallback(
    (listingId: string, agentId: string, priority: 'Standard' | 'Urgent') => {
      const listing = state.listings.find((l) => l.id === listingId);
      const agent = state.users.find((u) => u.id === agentId);
      if (!listing || !agent) return;
      const sellerAcc = state.users.find((u) => u.id === listing.sellerId);
      const countryInfo = getCountry(listing.country);
      const task: FieldInspectionTask = {
        id: `tsk-${Date.now()}`,
        reference: generateRef('INS'),
        listingId: listing.id,
        listingTitle: listing.title,
        sellerName: listing.sellerName,
        sellerPhone: sellerAcc?.phone || `${countryInfo.dialCode} 71 290 4412`,
        farmName: listing.farmName,
        country: listing.country,
        province: listing.province,
        district: listing.district,
        assignedAgentId: agent.id,
        assignedAgentName: agent.name,
        scheduledDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        priority,
        status: 'Assigned',
        expectedCategory: listing.category,
        expectedBreed: listing.breed,
        expectedQuantity: listing.quantity,
      };
      setState((prev) => ({
        ...prev,
        fieldTasks: [task, ...prev.fieldTasks],
        listings: prev.listings.map((l) =>
          l.id === listingId ? { ...l, verificationStatus: 'Inspection Scheduled' } : l
        ),
      }));
      addAudit(currentUser?.name || 'Admin', 'admin', `Assigned inspection to ${agent.name}`, listing.reference);
      addNotification('agent', `Inspection assigned: ${listing.reference}`, `${listing.title} (${priority} priority).`, 'verification');
      pushToast('Field agent assigned', 'success', `${agent.name} assigned to ${listing.reference}.`);
    },
    [state.listings, state.users, currentUser, addAudit, addNotification, pushToast]
  );

  const sendAdminBroadcast = useCallback(
    (title: string, body: string, recipientRole: UserRole | 'all') => {
      addNotification(recipientRole, title, body, 'transaction');
      addAudit(currentUser?.name || 'Admin', 'admin', `Broadcast sent to ${recipientRole}`, title);
      pushToast('Notification broadcast sent', 'success');
    },
    [addNotification, addAudit, currentUser, pushToast]
  );

  // Messaging
  const sendMessage = useCallback(
    (conversationId: string, text: string, attachmentName?: string) => {
      const sender = currentUser || state.users[0];
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                updatedAt: now,
                messages: [
                  ...c.messages,
                  {
                    id: `msg-${Date.now()}`,
                    senderId: sender.id,
                    senderName: sender.name,
                    senderRole: sender.role,
                    text,
                    attachmentName,
                    timestamp: now,
                    read: true,
                  },
                ],
              }
            : c
        ),
      }));
    },
    [currentUser, state.users]
  );

  const startConversation = useCallback(
    (
      subject: string,
      contextType: Conversation['contextType'],
      contextRef: string,
      recipient: { id: string; name: string; role: UserRole },
      firstMessage: string
    ) => {
      const sender = currentUser || state.users[0];
      const now = new Date().toISOString();
      const conv: Conversation = {
        id: `cnv-${Date.now()}`,
        subject,
        contextType,
        contextRef,
        participants: [
          { id: sender.id, name: sender.name, role: sender.role },
          recipient,
        ],
        updatedAt: now,
        messages: [
          {
            id: `msg-${Date.now()}`,
            senderId: sender.id,
            senderName: sender.name,
            senderRole: sender.role,
            text: firstMessage,
            timestamp: now,
            read: true,
          },
        ],
      };
      setState((prev) => ({ ...prev, conversations: [conv, ...prev.conversations] }));
      pushToast('Message sent', 'success', `Conversation opened with ${recipient.name}.`);
      return conv;
    },
    [currentUser, state.users, pushToast]
  );

  const updateListing = useCallback(
    (
      listingId: string,
      updates: Partial<
        Pick<
          LivestockListing,
          'title' | 'breed' | 'priceUsd' | 'quantity' | 'weightKg' | 'description' | 'vaccinationSummary'
        >
      >
    ) => {
      setState((prev) => ({
        ...prev,
        listings: prev.listings.map((l) =>
          l.id === listingId ? { ...l, ...updates } : l
        ),
      }));
      addAudit(currentUser?.name || 'Seller', currentUser?.role || 'seller', 'Edited livestock listing', listingId);
      pushToast('Listing updated', 'success', 'Changes are live across the marketplace.');
    },
    [currentUser, addAudit, pushToast]
  );

  const updateCurrentUserProfile = useCallback(
    (
      updates: Partial<
        Pick<UserAccount, 'name' | 'organization' | 'phone' | 'country' | 'district' | 'province' | 'meta'>
      >
    ) => {
      if (!currentUser) return;
      const updatedUser: UserAccount = {
        ...currentUser,
        ...updates,
        meta: { ...(currentUser.meta || {}), ...(updates.meta || {}) },
      };
      setCurrentUser(updatedUser);
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
      }));
      pushToast('Profile settings saved', 'success');
    },
    [currentUser, pushToast]
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.senderId !== currentUser?.id ? { ...m, read: true } : m
                ),
              }
            : c
        ),
      }));
    },
    [currentUser?.id]
  );

  const markNotificationRead = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const resetDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      users: SEED_USERS,
      listings: SEED_LISTINGS,
      offers: SEED_OFFERS,
      transactions: SEED_TRANSACTIONS,
      fieldTasks: SEED_FIELD_TASKS,
      centreRecords: SEED_CENTRE_RECORDS,
      transportJobs: SEED_TRANSPORT_JOBS,
      vehicles: SEED_VEHICLES,
      conversations: SEED_CONVERSATIONS,
      notifications: SEED_NOTIFICATIONS,
      reviews: SEED_REVIEWS,
      disputes: SEED_DISPUTES,
      auditLogs: SEED_AUDIT_LOGS,
      savedListingIds: ['lst-1', 'lst-10'],
      recentlyViewedIds: ['lst-1', 'lst-10'],
      compareListingIds: [],
    });
    pushToast('Demo dataset restored', 'info');
  }, [pushToast]);

  return (
    <MariketiContext.Provider
      value={{
        ...state,
        currentUser,
        activeView,
        publicPage,
        selectedListingId,
        authInitialMode,
        authPreselectedRole,
        offlineMode,
        offlineDrafts,
        toasts,
        setOfflineMode,
        navigatePublic,
        openAuth,
        openWorkspace,
        loginAsRole,
        loginWithCredentials,
        registerUser,
        logout,
        pushToast,
        dismissToast,
        toggleSaveListing,
        toggleCompareListing,
        clearCompare,
        recordListingView,
        createListing,
        updateListing,
        updateListingStatus,
        approveListingVerification,
        requestInspectionForListing,
        updateCurrentUserProfile,
        submitOffer,
        counterOffer,
        acceptOffer,
        rejectOffer,
        initiateTransactionFromOffer,
        advanceTransactionState,
        openDispute,
        resolveDispute,
        submitSellerReview,
        saveFieldDraftOffline,
        submitFieldInspection,
        syncOfflineQueue,
        resolveSyncConflict,
        updateCentreRecord,
        createCentreRecord,
        acceptTransportJob,
        updateTransportJobStatus,
        addTransportVehicle,
        updateUserStatus,
        assignFieldTask,
        sendAdminBroadcast,
        sendMessage,
        markConversationRead,
        startConversation,
        markNotificationRead,
        markAllNotificationsRead,
        resetDemoData,
      }}
    >
      {children}
    </MariketiContext.Provider>
  );
};

export function useMariketi() {
  const ctx = useContext(MariketiContext);
  if (!ctx) throw new Error('useMariketi must be used within MariketiProvider');
  return ctx;
}
