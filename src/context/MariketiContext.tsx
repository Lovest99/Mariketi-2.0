import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User as FirebaseUser } from 'firebase/auth';
import {
  SEED_AUCTION_BIDS,
  SEED_AUCTION_CENTERS,
  SEED_AUCTION_LOTS,
  SEED_AUCTIONS,
  SEED_AUDIT_LOGS,
  SEED_CENTRE_RECORDS,
  SEED_CONVERSATIONS,
  SEED_DISPUTES,
  SEED_FIELD_TASKS,
  SEED_LISTINGS,
  SEED_NOTIFICATIONS,
  SEED_OFFERS,
  SEED_PRODUCTS,
  SEED_REVIEWS,
  SEED_TRANSACTIONS,
  SEED_TRANSPORT_JOBS,
  SEED_USERS,
  SEED_VEHICLES,
  SUBSCRIPTION_PLANS,
} from '../data/seedData';
import { auth, googleProvider } from '../lib/firebase';
import { generateRef, getCountry } from '../lib/utils';
import {
  createOrSyncUserProfile,
  fetchUserProfile,
  fsAdminUpdateUserStatus,
  fsCancelProductOrder,
  fsCreateAuditLog,
  fsCreateCentreRecord,
  fsCreateConversation,
  fsCreateDispute,
  fsCreateFieldTask,
  fsCreateListing,
  fsCreateNotification,
  fsCreateOffer,
  fsCreateProductOrder,
  fsCreateReview,
  fsCreateTransactionBundle,
  fsCreateVehicle,
  fsIncrementAuctionBidders,
  fsMarkMessagesRead,
  fsMarkNotificationRead,
  fsPlaceAuctionBid,
  fsResolveDispute,
  fsSendMessage,
  fsUpdateAuctionLotStatus,
  fsUpdateCentreRecord,
  fsUpdateFieldTaskStatus,
  fsUpdateListing,
  fsUpdateOffer,
  fsUpdateTransaction,
  fsUpdateTransportJob,
  fsUpdateUserPreferences,
  fsUpdateUserProfile,
  fsUpsertSubscription,
  isBootstrapAdminEmail,
  seedMarketplaceIfEmpty,
  subscribeAuctionLotBids,
  subscribeAuthenticatedData,
  subscribePublicData,
} from '../services/firestoreService';
import {
  deleteOfflineDraft,
  getAllOfflineDrafts,
  saveOfflineDraft,
} from '../services/offlineDb';
import type {
  AgriProduct,
  AppNotification,
  AuctionBid,
  AuctionCenter,
  AuctionEvent,
  AuctionLot,
  AuditLogEntry,
  CollectionCentreRecord,
  Conversation,
  DisputeCase,
  FieldInspectionTask,
  LivestockListing,
  Offer,
  OfflineInspectionDraft,
  ProductOrder,
  SellerReview,
  Transaction,
  TransactionState,
  TransportJob,
  TransportVehicle,
  UserAccount,
  UserRole,
  UserSubscription,
  VerificationReport,
} from '../types/mariketi';

export type PublicPage =
  | 'home'
  | 'marketplace'
  | 'auctions'
  | 'store'
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
  auctionCenters: AuctionCenter[];
  auctions: AuctionEvent[];
  auctionLots: AuctionLot[];
  auctionBidsByLot: Record<string, AuctionBid[]>;
  products: AgriProduct[];
  productOrders: ProductOrder[];
  subscriptions: UserSubscription[];
}

interface MariketiContextValue extends MariketiState {
  currentUser: UserAccount | null;
  firebaseUser: FirebaseUser | null;
  authReady: boolean;
  authLoading: boolean;
  needsOnboarding: boolean;
  isAdminAccount: boolean;
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
  signInWithGoogle: (targetRole?: UserRole) => Promise<void>;
  loginAsRole: (role: UserRole) => void;
  registerUser: (
    user: Omit<UserAccount, 'id' | 'joinedAt' | 'rating' | 'reviewCount' | 'status' | 'verified'>
  ) => Promise<void>;
  logout: () => Promise<void>;
  pushToast: (title: string, tone?: ToastMessage['tone'], description?: string) => void;
  dismissToast: (id: string) => void;

  // Marketplace interactions
  toggleSaveListing: (listingId: string) => void;
  toggleCompareListing: (listingId: string) => void;
  clearCompare: () => void;
  recordListingView: (listingId: string) => void;

  // Listing management
  createListing: (
    listing: Omit<
      LivestockListing,
      'id' | 'reference' | 'listedAt' | 'views' | 'sellerId' | 'sellerName' | 'sellerRating' | 'sellerVerified'
    >
  ) => LivestockListing;
  updateListing: (
    listingId: string,
    updates: Partial<
      Pick<
        LivestockListing,
        'title' | 'breed' | 'priceUsd' | 'quantity' | 'weightKg' | 'description' | 'vaccinationSummary'
      >
    >
  ) => void;
  updateListingStatus: (listingId: string, status: LivestockListing['status']) => void;
  approveListingVerification: (listingId: string, status: LivestockListing['verificationStatus']) => void;
  requestInspectionForListing: (listingId: string) => void;
  updateCurrentUserProfile: (
    updates: Partial<
      Pick<UserAccount, 'name' | 'organization' | 'phone' | 'country' | 'district' | 'province' | 'meta'>
    >
  ) => void;

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
  updateCentreRecord: (recordId: string, updates: Partial<CollectionCentreRecord>) => void;
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

  // Hybrid Physical + Online Auctions
  registeredAuctionIds: string[];
  userPaddleNumber: string;
  registerBidderPaddle: (auctionId: string) => void;
  watchAuctionLotBids: (lotId: string) => () => void;
  placeOnlineBid: (lotId: string, amountUsd: number, maxProxyUsd?: number) => boolean;
  recordFloorBid: (lotId: string, floorPaddle: string, amountUsd: number) => boolean;
  updateAuctionLotStatus: (lotId: string, status: AuctionLot['status']) => void;
  hammerAndAdvanceLot: (lotId: string, outcome: 'Sold' | 'Passed In') => string | null;

  // Agri-Vet Online Store & Subscriptions
  cart: { productId: string; qty: number }[];
  currentUserSubscription: UserSubscription | null;
  addToCart: (productId: string, qty?: number) => void;
  updateCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  checkoutCart: (deliveryAddress: string, country: string) => ProductOrder | null;
  cancelProductOrder: (orderId: string) => void;
  activateSubscription: (planId: string, billingCycle: 'monthly' | 'annual') => void;
  updateSubscriptionStatus: (status: 'active' | 'paused' | 'cancelled') => void;
}

function groupBidsByLot(bids: AuctionBid[]): Record<string, AuctionBid[]> {
  const map: Record<string, AuctionBid[]> = {};
  for (const b of bids) {
    if (!map[b.lotId]) map[b.lotId] = [];
    map[b.lotId].push(b);
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => b.amountUsd - a.amountUsd);
  }
  return map;
}

const INITIAL_SEED_STATE: MariketiState = {
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
  auctionCenters: SEED_AUCTION_CENTERS,
  auctions: SEED_AUCTIONS,
  auctionLots: SEED_AUCTION_LOTS,
  auctionBidsByLot: groupBidsByLot(SEED_AUCTION_BIDS),
  products: SEED_PRODUCTS,
  productOrders: [],
  subscriptions: [],
};

const MariketiContext = createContext<MariketiContextValue | null>(null);

export const MariketiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MariketiState>(INITIAL_SEED_STATE);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [accountProfile, setAccountProfile] = useState<UserAccount | null>(null);
  const [workspaceRoleOverride, setWorkspaceRoleOverride] = useState<UserRole | null>(null);
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
  const [registeredAuctionIds, setRegisteredAuctionIds] = useState<string[]>(['auc-1']);
  const [cart, setCart] = useState<{ productId: string; qty: number }[]>([]);

  const pendingRoleTargetRef = useRef<UserRole | null>(null);
  const publicListingsRef = useRef<LivestockListing[]>([]);
  const sellerListingsRef = useRef<LivestockListing[]>([]);

  const isAdminAccount = Boolean(
    firebaseUser && isBootstrapAdminEmail(firebaseUser.email) && firebaseUser.emailVerified
  );

  // Project currentUser with optional Admin workspace preview role
  const currentUser: UserAccount | null = accountProfile
    ? isAdminAccount && workspaceRoleOverride
      ? { ...accountProfile, role: workspaceRoleOverride }
      : accountProfile
    : null;

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

  // Load IndexedDB offline drafts
  useEffect(() => {
    getAllOfflineDrafts().then(setOfflineDrafts).catch(() => {});
  }, []);

  // Browser online/offline state
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

  // 1. Public Marketplace Real-Time Subscription (active listings, verified reviews, public profiles)
  useEffect(() => {
    const unsub = subscribePublicData({
      onListings: (activeList) => {
        publicListingsRef.current = activeList;
        if (activeList.length > 0 || sellerListingsRef.current.length > 0) {
          const merged = new Map<string, LivestockListing>();
          activeList.forEach((l) => merged.set(l.id, l));
          sellerListingsRef.current.forEach((l) => merged.set(l.id, l));
          setState((prev) => ({
            ...prev,
            listings: Array.from(merged.values()).sort((a, b) => b.listedAt.localeCompare(a.listedAt)),
          }));
        }
      },
      onReviews: (revList) => {
        if (revList.length > 0) {
          setState((prev) => ({ ...prev, reviews: revList }));
        }
      },
      onPublicProfiles: (profiles) => {
        if (profiles.length > 0) {
          setState((prev) => {
            // Preserve richer admin-fetched user records if already loaded
            if (prev.users.some((u) => Boolean(u.email))) {
              const map = new Map(prev.users.map((u) => [u.id, u]));
              profiles.forEach((p) => {
                if (!map.has(p.id)) map.set(p.id, p);
              });
              return { ...prev, users: Array.from(map.values()) };
            }
            return { ...prev, users: profiles };
          });
        }
      },
      onAuctionCenters: (centers) => {
        if (centers.length > 0) {
          setState((prev) => ({ ...prev, auctionCenters: centers }));
        }
      },
      onAuctions: (auctions) => {
        if (auctions.length > 0) {
          setState((prev) => ({ ...prev, auctions }));
        }
      },
      onAuctionLots: (lots) => {
        if (lots.length > 0) {
          setState((prev) => ({
            ...prev,
            auctionLots: lots.sort((a, b) => a.lotNumber.localeCompare(b.lotNumber)),
          }));
        }
      },
      onProducts: (products) => {
        if (products.length > 0) {
          setState((prev) => ({ ...prev, products }));
        }
      },
    });
    return () => unsub();
  }, []);

  // 2. Firebase Auth State Observer
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setAccountProfile(null);
        setWorkspaceRoleOverride(null);
        setNeedsOnboarding(false);
        setAuthReady(true);
        return;
      }

      try {
        const existing = await fetchUserProfile(fbUser.uid);
        if (existing) {
          setAccountProfile(existing.account);
          setNeedsOnboarding(false);
          setState((prev) => ({
            ...prev,
            savedListingIds: existing.preferences.savedListingIds,
            recentlyViewedIds: existing.preferences.recentlyViewedIds,
            compareListingIds: existing.preferences.compareListingIds,
          }));
          if (isBootstrapAdminEmail(fbUser.email) && fbUser.emailVerified) {
            if (pendingRoleTargetRef.current) {
              setWorkspaceRoleOverride(pendingRoleTargetRef.current);
              pendingRoleTargetRef.current = null;
            }
            // Seed starter Pan-African dataset if Firestore is empty
            seedMarketplaceIfEmpty(fbUser).catch(() => {});
          }
        } else if (isBootstrapAdminEmail(fbUser.email) && fbUser.emailVerified) {
          // Automatically provision bootstrapped Operations Admin profile on first sign-in
          const created = await createOrSyncUserProfile(fbUser, {
            name: fbUser.displayName || 'Bright Cheteni',
            phone: '+263 77 000 0000',
            role: 'admin',
            organization: 'MARIKETI Pan-African Operations',
            country: 'Zimbabwe',
            province: 'Harare',
            district: 'Harare Central',
          });
          setAccountProfile(created.account);
          setNeedsOnboarding(false);
          if (pendingRoleTargetRef.current) {
            setWorkspaceRoleOverride(pendingRoleTargetRef.current);
            pendingRoleTargetRef.current = null;
          }
          await seedMarketplaceIfEmpty(fbUser).catch(() => {});
        } else {
          // New verified Google user -> guide to Pan-African role & country onboarding
          setAccountProfile(null);
          setNeedsOnboarding(true);
          if (pendingRoleTargetRef.current) {
            setAuthPreselectedRole(pendingRoleTargetRef.current);
            pendingRoleTargetRef.current = null;
          }
          setAuthInitialMode('register');
          setActiveView('public');
          setPublicPage('auth');
        }
      } catch {
        pushToast('Unable to load account profile', 'error', 'Please try signing in again.');
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, [pushToast]);

  // 3. Authenticated Real-Time Subscriptions (ONLY when authReady && firebaseUser)
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const unsub = subscribeAuthenticatedData(firebaseUser, {
      onUsers: (users) => {
        if (users.length > 0) setState((prev) => ({ ...prev, users }));
      },
      onAllListings: (allListings) => {
        if (allListings.length > 0) {
          setState((prev) => ({
            ...prev,
            listings: allListings.sort((a, b) => b.listedAt.localeCompare(a.listedAt)),
          }));
        }
      },
      onSellerListings: (sellerList) => {
        sellerListingsRef.current = sellerList;
        const merged = new Map<string, LivestockListing>();
        publicListingsRef.current.forEach((l) => merged.set(l.id, l));
        sellerList.forEach((l) => merged.set(l.id, l));
        if (merged.size > 0) {
          setState((prev) => ({
            ...prev,
            listings: Array.from(merged.values()).sort((a, b) => b.listedAt.localeCompare(a.listedAt)),
          }));
        }
      },
      onOffers: (offers) => {
        setState((prev) => ({
          ...prev,
          offers: offers.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        }));
      },
      onTransactions: (transactions) => {
        setState((prev) => ({
          ...prev,
          transactions: transactions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        }));
      },
      onFieldTasks: (fieldTasks) => {
        setState((prev) => ({ ...prev, fieldTasks }));
      },
      onCentreRecords: (centreRecords) => {
        setState((prev) => ({ ...prev, centreRecords }));
      },
      onTransportJobs: (transportJobs) => {
        setState((prev) => ({ ...prev, transportJobs }));
      },
      onVehicles: (vehicles) => {
        setState((prev) => ({ ...prev, vehicles }));
      },
      onConversations: (conversations) => {
        setState((prev) => ({ ...prev, conversations }));
      },
      onNotifications: (notifications) => {
        setState((prev) => ({
          ...prev,
          notifications: notifications.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
        }));
      },
      onDisputes: (disputes) => {
        setState((prev) => ({ ...prev, disputes }));
      },
      onAuditLogs: (auditLogs) => {
        setState((prev) => ({
          ...prev,
          auditLogs: auditLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
        }));
      },
      onProductOrders: (productOrders) => {
        setState((prev) => ({
          ...prev,
          productOrders: productOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        }));
      },
      onSubscriptions: (subscriptions) => {
        setState((prev) => ({ ...prev, subscriptions }));
      },
    });

    return () => unsub();
  }, [authReady, firebaseUser]);

  // Helper to run Firestore writes safely without breaking UX
  const runDbWrite = useCallback(
    (promise: Promise<unknown>, errorLabel?: string) => {
      if (!firebaseUser) return;
      promise.catch((err) => {
        console.error(errorLabel || 'Persistence error:', err);
        const msg = err instanceof Error ? err.message : '';
        if (msg.toLowerCase().includes('quota exceeded')) {
          pushToast('Daily quota reached', 'error', 'Changes could not be saved right now.');
        } else if (msg.includes('Missing or insufficient permissions')) {
          pushToast('Action restricted for current role', 'warning');
        }
      });
    },
    [firebaseUser, pushToast]
  );

  const addAudit = useCallback(
    (actor: string, role: UserRole, action: string, target: string) => {
      const entry: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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
      if (firebaseUser) {
        runDbWrite(fsCreateAuditLog(entry, firebaseUser.uid), 'Audit log write');
      }
    },
    [firebaseUser, runDbWrite]
  );

  const addNotification = useCallback(
    (
      recipientRole: UserRole | 'all',
      title: string,
      body: string,
      category: AppNotification['category'],
      recipientUserId?: string
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
      if (firebaseUser && (recipientRole !== 'all' || isAdminAccount)) {
        runDbWrite(fsCreateNotification(notif, recipientUserId), 'Notification write');
      }
    },
    [firebaseUser, isAdminAccount, runDbWrite]
  );

  const navigatePublic = useCallback(
    (page: PublicPage, listingId?: string) => {
      setActiveView('public');
      setPublicPage(page);
      if (listingId) {
        setSelectedListingId(listingId);
        setState((prev) => {
          const nextRecent = [
            listingId,
            ...prev.recentlyViewedIds.filter((id) => id !== listingId),
          ].slice(0, 6);
          if (firebaseUser && accountProfile) {
            runDbWrite(
              fsUpdateUserPreferences(firebaseUser.uid, { recentlyViewedIds: nextRecent }),
              'Recent views sync'
            );
          }
          return {
            ...prev,
            recentlyViewedIds: nextRecent,
            listings: prev.listings.map((l) =>
              l.id === listingId ? { ...l, views: l.views + 1 } : l
            ),
          };
        });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [firebaseUser, accountProfile, runDbWrite]
  );

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

  const signInWithGoogle = useCallback(
    async (targetRole?: UserRole) => {
      setAuthLoading(true);
      if (targetRole) {
        pendingRoleTargetRef.current = targetRole;
      }
      try {
        const credential = await signInWithPopup(auth, googleProvider);
        const fbUser = credential.user;
        const existing = await fetchUserProfile(fbUser.uid);

        if (existing) {
          setAccountProfile(existing.account);
          setNeedsOnboarding(false);
          if (isBootstrapAdminEmail(fbUser.email) && fbUser.emailVerified && targetRole) {
            setWorkspaceRoleOverride(targetRole);
          }
          setActiveView('workspace');
          pushToast(`Signed in as ${existing.account.name}`, 'success');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (isBootstrapAdminEmail(fbUser.email) && fbUser.emailVerified) {
          const created = await createOrSyncUserProfile(fbUser, {
            name: fbUser.displayName || 'Bright Cheteni',
            phone: '+263 77 000 0000',
            role: 'admin',
            organization: 'MARIKETI Pan-African Operations',
            country: 'Zimbabwe',
            province: 'Harare',
            district: 'Harare Central',
          });
          setAccountProfile(created.account);
          setNeedsOnboarding(false);
          if (targetRole) setWorkspaceRoleOverride(targetRole);
          await seedMarketplaceIfEmpty(fbUser).catch(() => {});
          setActiveView('workspace');
          pushToast(`Welcome, ${created.account.name}`, 'success', 'Operations workspace ready.');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setNeedsOnboarding(true);
          setAuthPreselectedRole(targetRole && targetRole !== 'admin' ? targetRole : 'buyer');
          setAuthInitialMode('register');
          setActiveView('public');
          setPublicPage('auth');
          pushToast('Google account connected', 'info', 'Complete your Pan-African profile to enter your workspace.');
        }
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code || '';
        if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
          pushToast('Google sign-in could not complete', 'error', 'Please allow popups and try again.');
        }
      } finally {
        setAuthLoading(false);
      }
    },
    [pushToast]
  );

  const loginAsRole = useCallback(
    (role: UserRole) => {
      if (!firebaseUser) {
        void signInWithGoogle(role);
        return;
      }
      if (isAdminAccount) {
        setWorkspaceRoleOverride(role);
        setActiveView('workspace');
        pushToast(`Switched to ${role.toUpperCase()} workspace`, 'info');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (accountProfile) {
        if (accountProfile.role === role) {
          setActiveView('workspace');
        } else {
          pushToast(
            'Role workspace locked to account',
            'info',
            `Your account is registered as ${accountProfile.role}. Opening your workspace.`
          );
          setActiveView('workspace');
        }
      } else {
        openAuth('register', role === 'admin' ? 'buyer' : role);
      }
    },
    [firebaseUser, isAdminAccount, accountProfile, signInWithGoogle, openAuth, pushToast]
  );

  const registerUser = useCallback(
    async (
      userInput: Omit<UserAccount, 'id' | 'joinedAt' | 'rating' | 'reviewCount' | 'status' | 'verified'>
    ) => {
      setAuthLoading(true);
      try {
        let fbUser = auth.currentUser;
        if (!fbUser) {
          const cred = await signInWithPopup(auth, googleProvider);
          fbUser = cred.user;
        }
        const profile = await createOrSyncUserProfile(fbUser, {
          name: userInput.name || fbUser.displayName || 'MARIKETI Member',
          phone: userInput.phone,
          role: userInput.role,
          organization: userInput.organization,
          country: userInput.country,
          province: userInput.province,
          district: userInput.district,
          meta: userInput.meta,
        });
        setAccountProfile(profile.account);
        setNeedsOnboarding(false);
        setActiveView('workspace');
        addAudit(
          profile.account.name,
          profile.account.role,
          'Completed Pan-African account onboarding',
          `${profile.account.role} (${profile.account.country})`
        );
        pushToast(
          'Account created and saved',
          'success',
          `Welcome to MARIKETI, ${profile.account.name}.`
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code || '';
        if (code !== 'auth/popup-closed-by-user') {
          pushToast('Registration failed', 'error', 'Sign in with Google to save your account.');
        }
      } finally {
        setAuthLoading(false);
      }
    },
    [addAudit, pushToast]
  );

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore sign-out errors
    }
    setAccountProfile(null);
    setWorkspaceRoleOverride(null);
    setNeedsOnboarding(false);
    setActiveView('public');
    setPublicPage('home');
    pushToast('Signed out', 'info');
  }, [pushToast]);

  const toggleSaveListing = useCallback(
    (listingId: string) => {
      setState((prev) => {
        const exists = prev.savedListingIds.includes(listingId);
        const nextSaved = exists
          ? prev.savedListingIds.filter((id) => id !== listingId)
          : [listingId, ...prev.savedListingIds];
        if (firebaseUser && accountProfile) {
          runDbWrite(
            fsUpdateUserPreferences(firebaseUser.uid, { savedListingIds: nextSaved }),
            'Save listing sync'
          );
        }
        return { ...prev, savedListingIds: nextSaved };
      });
    },
    [firebaseUser, accountProfile, runDbWrite]
  );

  const toggleCompareListing = useCallback(
    (listingId: string) => {
      setState((prev) => {
        const exists = prev.compareListingIds.includes(listingId);
        if (exists) {
          const next = prev.compareListingIds.filter((id) => id !== listingId);
          if (firebaseUser && accountProfile) {
            runDbWrite(fsUpdateUserPreferences(firebaseUser.uid, { compareListingIds: next }));
          }
          return { ...prev, compareListingIds: next };
        }
        if (prev.compareListingIds.length >= 3) {
          pushToast('Comparison limit reached', 'warning', 'Compare up to 3 listings side by side.');
          return prev;
        }
        const next = [...prev.compareListingIds, listingId];
        if (firebaseUser && accountProfile) {
          runDbWrite(fsUpdateUserPreferences(firebaseUser.uid, { compareListingIds: next }));
        }
        return { ...prev, compareListingIds: next };
      });
    },
    [firebaseUser, accountProfile, pushToast, runDbWrite]
  );

  const clearCompare = useCallback(() => {
    setState((prev) => ({ ...prev, compareListingIds: [] }));
    if (firebaseUser && accountProfile) {
      runDbWrite(fsUpdateUserPreferences(firebaseUser.uid, { compareListingIds: [] }));
    }
  }, [firebaseUser, accountProfile, runDbWrite]);

  const recordListingView = useCallback(
    (listingId: string) => {
      setState((prev) => {
        const next = [listingId, ...prev.recentlyViewedIds.filter((id) => id !== listingId)].slice(
          0,
          6
        );
        if (firebaseUser && accountProfile) {
          runDbWrite(fsUpdateUserPreferences(firebaseUser.uid, { recentlyViewedIds: next }));
        }
        return { ...prev, recentlyViewedIds: next };
      });
    },
    [firebaseUser, accountProfile, runDbWrite]
  );

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
      const seller = currentUser || state.users.find((u) => u.role === 'seller') || SEED_USERS[1];
      const newListing: LivestockListing = {
        ...input,
        id: `lst-${Date.now()}`,
        reference: generateRef('MRK'),
        listedAt: new Date().toISOString(),
        views: 1,
        sellerId: firebaseUser ? firebaseUser.uid : seller.id,
        sellerName: seller.name,
        sellerRating: seller.rating || 4.8,
        sellerVerified: seller.verified,
        verificationStatus:
          isAdminAccount || input.verificationStatus === 'Unverified'
            ? input.verificationStatus
            : 'Pending Verification',
      };
      setState((prev) => ({
        ...prev,
        listings: [newListing, ...prev.listings],
      }));
      runDbWrite(fsCreateListing(newListing), 'Create listing');

      if (newListing.verificationStatus === 'Pending Verification') {
        const defaultAgent =
          state.users.find((u) => u.role === 'agent' && u.country === newListing.country) ||
          state.users.find((u) => u.role === 'agent') ||
          SEED_USERS[2];
        const task: FieldInspectionTask = {
          id: `tsk-${Date.now()}`,
          reference: generateRef('INS'),
          listingId: newListing.id,
          listingTitle: newListing.title,
          sellerName: seller.name,
          sellerPhone: seller.phone || '',
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
        runDbWrite(fsCreateFieldTask(task, newListing.sellerId), 'Create field task');

        const countryInfo = getCountry(newListing.country);
        addNotification(
          'agent',
          `New verification requested: ${newListing.reference}`,
          `${newListing.title} in ${countryInfo.flag} ${newListing.district}, ${newListing.province}, ${newListing.country}.`,
          'verification',
          defaultAgent.id
        );
      }
      addAudit(seller.name, seller.role, 'Published livestock listing', newListing.reference);
      pushToast('Listing published', 'success', `${newListing.reference} is now live on MARIKETI.`);
      return newListing;
    },
    [currentUser, firebaseUser, isAdminAccount, state.users, addAudit, addNotification, pushToast, runDbWrite]
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
        listings: prev.listings.map((l) => (l.id === listingId ? { ...l, ...updates } : l)),
      }));
      runDbWrite(fsUpdateListing(listingId, updates), 'Update listing');
      addAudit(
        currentUser?.name || 'Seller',
        currentUser?.role || 'seller',
        'Edited livestock listing',
        listingId
      );
      pushToast('Listing updated', 'success', 'Changes are live across the marketplace.');
    },
    [currentUser, addAudit, pushToast, runDbWrite]
  );

  const updateListingStatus = useCallback(
    (listingId: string, status: LivestockListing['status']) => {
      setState((prev) => ({
        ...prev,
        listings: prev.listings.map((l) => (l.id === listingId ? { ...l, status } : l)),
      }));
      runDbWrite(fsUpdateListing(listingId, { status }), 'Update listing status');
      pushToast(`Listing marked as ${status}`, 'info');
    },
    [pushToast, runDbWrite]
  );

  const approveListingVerification = useCallback(
    (listingId: string, verificationStatus: LivestockListing['verificationStatus']) => {
      const target = state.listings.find((l) => l.id === listingId);
      setState((prev) => ({
        ...prev,
        listings: prev.listings.map((l) =>
          l.id === listingId ? { ...l, verificationStatus } : l
        ),
      }));
      runDbWrite(fsUpdateListing(listingId, { verificationStatus }), 'Approve verification');
      const actor = currentUser?.name || 'MARIKETI Admin';
      addAudit(actor, currentUser?.role || 'admin', `Set verification to ${verificationStatus}`, listingId);
      addNotification(
        'seller',
        `Verification updated: ${verificationStatus}`,
        `Listing ${target?.reference || listingId} verification status changed.`,
        'verification',
        target?.sellerId
      );
      pushToast(`Verification set to ${verificationStatus}`, 'success');
    },
    [state.listings, currentUser, addAudit, addNotification, pushToast, runDbWrite]
  );

  const requestInspectionForListing = useCallback(
    (listingId: string) => {
      const listing = state.listings.find((l) => l.id === listingId);
      if (!listing) return;
      if (!firebaseUser) {
        openAuth('login', 'buyer');
        return;
      }
      const sellerAcc = state.users.find((u) => u.id === listing.sellerId);
      const defaultAgent =
        state.users.find((u) => u.role === 'agent' && u.country === listing.country) ||
        state.users.find((u) => u.role === 'agent') ||
        SEED_USERS[2];
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
      runDbWrite(fsCreateFieldTask(task, listing.sellerId), 'Create buyer-requested task');
      if (listing.verificationStatus !== 'Verified') {
        runDbWrite(
          fsUpdateListing(listingId, { verificationStatus: 'Inspection Scheduled' }),
          'Mark inspection scheduled'
        );
      }
      addNotification(
        'agent',
        `Buyer-requested inspection: ${listing.reference}`,
        `Assigned to ${defaultAgent.name} for ${countryInfo.flag} ${listing.district}, ${listing.province}, ${listing.country}.`,
        'verification',
        defaultAgent.id
      );
      pushToast('Field inspection requested', 'success', `Task ${task.reference} dispatched to MARIKETI Field Unit.`);
    },
    [state.listings, state.users, firebaseUser, openAuth, addNotification, pushToast, runDbWrite]
  );

  const submitOffer = useCallback(
    (listingId: string, amountUsd: number, quantity: number, note: string) => {
      const listing = state.listings.find((l) => l.id === listingId);
      if (!listing) return null;
      if (!firebaseUser) {
        pushToast('Sign in to submit an offer', 'info', 'Connect your Google account to trade on MARIKETI.');
        openAuth('login', 'buyer');
        return null;
      }
      const buyer = currentUser || state.users.find((u) => u.role === 'buyer') || SEED_USERS[0];
      const now = new Date().toISOString();
      const newOffer: Offer = {
        id: `off-${Date.now()}`,
        reference: generateRef('OFR'),
        listingId: listing.id,
        listingTitle: listing.title,
        listingRef: listing.reference,
        buyerId: firebaseUser.uid,
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
            actorId: firebaseUser.uid,
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
      runDbWrite(fsCreateOffer(newOffer), 'Submit offer');
      addNotification(
        'seller',
        `New offer ${newOffer.reference} on ${listing.reference}`,
        `${buyer.name} offered $${amountUsd.toLocaleString()} for ${quantity} head.`,
        'offer',
        listing.sellerId
      );
      addAudit(buyer.name, 'buyer', 'Submitted livestock offer', `${newOffer.reference} ($${amountUsd})`);
      pushToast('Offer submitted', 'success', `Reference ${newOffer.reference} sent to ${listing.sellerName}.`);
      return newOffer;
    },
    [state.listings, state.users, currentUser, firebaseUser, openAuth, addNotification, addAudit, pushToast, runDbWrite]
  );

  const counterOffer = useCallback(
    (offerId: string, newAmountUsd: number, quantity: number, note: string) => {
      const target = state.offers.find((o) => o.id === offerId);
      if (!target) return;
      const actor = currentUser || state.users[0];
      const actorRole: 'buyer' | 'seller' = actor.role === 'seller' ? 'seller' : 'buyer';
      const now = new Date().toISOString();
      const nextHistory = [
        ...target.history,
        {
          id: `oh-${Date.now()}`,
          actorId: firebaseUser?.uid || actor.id,
          actorName: actor.name,
          actorRole,
          action: 'counter_offer' as const,
          amountUsd: newAmountUsd,
          quantity,
          note: note || `Counter-offer at $${newAmountUsd.toLocaleString()}`,
          timestamp: now,
        },
      ];
      setState((prev) => ({
        ...prev,
        offers: prev.offers.map((o) =>
          o.id === offerId
            ? {
                ...o,
                currentAmountUsd: newAmountUsd,
                quantity,
                status: 'countered',
                lastActorRole: actorRole,
                updatedAt: now,
                history: nextHistory,
              }
            : o
        ),
      }));
      runDbWrite(
        fsUpdateOffer(offerId, {
          currentAmountUsd: newAmountUsd,
          quantity,
          status: 'countered',
          lastActorRole: actorRole,
          history: nextHistory,
        }),
        'Counter offer'
      );
      addNotification(
        actorRole === 'seller' ? 'buyer' : 'seller',
        'Counter-offer received',
        `${actor.name} proposed $${newAmountUsd.toLocaleString()} (${quantity} head).`,
        'offer',
        actorRole === 'seller' ? target.buyerId : target.sellerId
      );
      addAudit(actor.name, actor.role, 'Issued counter-offer', `${target.reference} ($${newAmountUsd})`);
      pushToast('Counter-offer sent', 'success', 'Full negotiation history preserved.');
    },
    [state.offers, state.users, currentUser, firebaseUser, addNotification, addAudit, pushToast, runDbWrite]
  );

  const acceptOffer = useCallback(
    (offerId: string, note = 'Terms agreed. Ready to initiate transaction.') => {
      const target = state.offers.find((o) => o.id === offerId);
      if (!target) return;
      const actor = currentUser || state.users[0];
      const actorRole: 'buyer' | 'seller' = actor.role === 'seller' ? 'seller' : 'buyer';
      const now = new Date().toISOString();
      const nextHistory = [
        ...target.history,
        {
          id: `oh-${Date.now()}`,
          actorId: firebaseUser?.uid || actor.id,
          actorName: actor.name,
          actorRole,
          action: 'accepted' as const,
          amountUsd: target.currentAmountUsd,
          quantity: target.quantity,
          note,
          timestamp: now,
        },
      ];
      setState((prev) => ({
        ...prev,
        offers: prev.offers.map((o) =>
          o.id === offerId
            ? {
                ...o,
                status: 'accepted',
                lastActorRole: actorRole,
                updatedAt: now,
                history: nextHistory,
              }
            : o
        ),
      }));
      runDbWrite(
        fsUpdateOffer(offerId, {
          currentAmountUsd: target.currentAmountUsd,
          quantity: target.quantity,
          status: 'accepted',
          lastActorRole: actorRole,
          history: nextHistory,
        }),
        'Accept offer'
      );
      addNotification(
        actorRole === 'seller' ? 'buyer' : 'seller',
        'Offer accepted',
        `${actor.name} accepted ${target.reference}. You can now initiate the transaction.`,
        'offer',
        actorRole === 'seller' ? target.buyerId : target.sellerId
      );
      addAudit(actor.name, actor.role, 'Accepted offer', target.reference);
      pushToast('Offer accepted', 'success', 'Proceed to initiate a verified transaction.');
    },
    [state.offers, state.users, currentUser, firebaseUser, addNotification, addAudit, pushToast, runDbWrite]
  );

  const rejectOffer = useCallback(
    (offerId: string, note = 'Offer declined.') => {
      const target = state.offers.find((o) => o.id === offerId);
      if (!target) return;
      const actor = currentUser || state.users[0];
      const actorRole: 'buyer' | 'seller' = actor.role === 'seller' ? 'seller' : 'buyer';
      const now = new Date().toISOString();
      const nextHistory = [
        ...target.history,
        {
          id: `oh-${Date.now()}`,
          actorId: firebaseUser?.uid || actor.id,
          actorName: actor.name,
          actorRole,
          action: 'rejected' as const,
          amountUsd: target.currentAmountUsd,
          quantity: target.quantity,
          note,
          timestamp: now,
        },
      ];
      setState((prev) => ({
        ...prev,
        offers: prev.offers.map((o) =>
          o.id === offerId
            ? {
                ...o,
                status: 'rejected',
                lastActorRole: actorRole,
                updatedAt: now,
                history: nextHistory,
              }
            : o
        ),
      }));
      runDbWrite(
        fsUpdateOffer(offerId, {
          currentAmountUsd: target.currentAmountUsd,
          quantity: target.quantity,
          status: 'rejected',
          lastActorRole: actorRole,
          history: nextHistory,
        }),
        'Reject offer'
      );
      pushToast('Offer declined', 'info');
    },
    [state.offers, state.users, currentUser, firebaseUser, pushToast, runDbWrite]
  );

  const initiateTransactionFromOffer = useCallback(
    (offerId: string, deliveryLocation: string) => {
      const offer = state.offers.find((o) => o.id === offerId);
      if (!offer) return null;
      const listing = state.listings.find((l) => l.id === offer.listingId);
      const now = new Date().toISOString();
      const handoverCode = `HND-${Math.floor(1000 + Math.random() * 9000)}`;
      const listingCountry = getCountry(listing?.country);
      const txnId = `txn-${Date.now()}`;
      const trpId = `trp-${Date.now()}`;
      const txn: Transaction = {
        id: txnId,
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
        transportJobId: trpId,
        documents: [
          { name: 'Agreed Offer Summary', ref: offer.reference, verified: true },
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
        id: trpId,
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

      const centreOp = state.users.find((u) => u.role === 'centre') || SEED_USERS[3];

      setState((prev) => ({
        ...prev,
        transactions: [txn, ...prev.transactions],
        offers: prev.offers.map((o) => (o.id === offerId ? { ...o, status: 'converted' } : o)),
        centreRecords: [newCentreRec, ...prev.centreRecords],
        transportJobs: [newTransportJob, ...prev.transportJobs],
      }));
      runDbWrite(
        fsCreateTransactionBundle(txn, newCentreRec, newTransportJob, centreOp.id),
        'Create transaction bundle'
      );
      addNotification(
        'seller',
        `Transaction ${txn.reference} initiated`,
        `${offer.buyerName} opened transaction for ${txn.listingTitle}.`,
        'transaction',
        offer.sellerId
      );
      addNotification(
        'transport',
        `New transport job ${newTransportJob.reference}`,
        `${txn.quantity} ${txn.listingCategory} from ${txn.pickupLocation} to ${txn.deliveryLocation}.`,
        'logistics'
      );
      addAudit(offer.buyerName, 'buyer', 'Initiated transaction', txn.reference);
      pushToast('Transaction initiated', 'success', `${txn.reference} created with collection & transport records.`);
      return txn;
    },
    [state.offers, state.listings, state.users, addNotification, addAudit, pushToast, runDbWrite]
  );

  const advanceTransactionState = useCallback(
    (transactionId: string, nextState: TransactionState, note: string) => {
      const target = state.transactions.find((t) => t.id === transactionId);
      if (!target) return;
      const actor = currentUser?.name || 'Operations';
      const now = new Date().toISOString();
      const paymentStatus =
        nextState === 'Payment confirmed'
          ? 'Demo Payment Confirmed'
          : nextState === 'Cancelled'
          ? 'Refunded (Demo)'
          : target.paymentStatus;
      const nextTimeline = [
        ...target.timeline,
        {
          id: `te-${Date.now()}`,
          state: nextState,
          actor,
          note,
          timestamp: now,
        },
      ];
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === transactionId
            ? { ...t, state: nextState, paymentStatus, updatedAt: now, timeline: nextTimeline }
            : t
        ),
      }));
      runDbWrite(
        fsUpdateTransaction(transactionId, { state: nextState, paymentStatus, timeline: nextTimeline }),
        'Advance transaction'
      );
      addAudit(actor, currentUser?.role || 'buyer', `Transaction -> ${nextState}`, target.reference);
      addNotification(
        currentUser?.id === target.buyerId ? 'seller' : 'buyer',
        `Transaction updated: ${nextState}`,
        note,
        'transaction',
        currentUser?.id === target.buyerId ? target.sellerId : target.buyerId
      );
      pushToast(`Transaction marked: ${nextState}`, 'success');
    },
    [state.transactions, currentUser, addAudit, addNotification, pushToast, runDbWrite]
  );

  const openDispute = useCallback(
    (transactionId: string, reason: string, description: string) => {
      const txn = state.transactions.find((t) => t.id === transactionId);
      if (!txn) return;
      const actor = currentUser || state.users[0];
      const now = new Date().toISOString();
      const dispute: DisputeCase = {
        id: `dsp-${Date.now()}`,
        reference: generateRef('DSP'),
        transactionId,
        transactionRef: txn.reference,
        openedBy: `${actor.name} (${actor.role})`,
        against:
          actor.id === txn.buyerId ? `${txn.sellerName} (Seller)` : `${txn.buyerName} (Buyer)`,
        reason,
        description,
        status: 'Open',
        createdAt: now,
      };
      const nextTimeline = [
        ...txn.timeline,
        {
          id: `te-${Date.now()}`,
          state: 'Disputed' as const,
          actor: actor.name,
          note: `Dispute ${dispute.reference} opened: ${reason}`,
          timestamp: now,
        },
      ];
      setState((prev) => ({
        ...prev,
        disputes: [dispute, ...prev.disputes],
        transactions: prev.transactions.map((t) =>
          t.id === transactionId ? { ...t, state: 'Disputed', timeline: nextTimeline } : t
        ),
      }));
      runDbWrite(
        fsCreateDispute(dispute, firebaseUser?.uid || actor.id, txn.buyerId, txn.sellerId),
        'Open dispute'
      );
      runDbWrite(
        fsUpdateTransaction(transactionId, { state: 'Disputed', timeline: nextTimeline }),
        'Mark transaction disputed'
      );
      addNotification('admin', `New dispute ${dispute.reference}`, `${reason} on ${txn.reference}.`, 'dispute');
      addAudit(actor.name, actor.role, 'Opened transaction dispute', dispute.reference);
      pushToast('Dispute logged for review', 'warning', `Reference ${dispute.reference} escalated to MARIKETI Operations.`);
    },
    [state.transactions, state.users, currentUser, firebaseUser, addNotification, addAudit, pushToast, runDbWrite]
  );

  const resolveDispute = useCallback(
    (disputeId: string, resolution: string) => {
      setState((prev) => ({
        ...prev,
        disputes: prev.disputes.map((d) =>
          d.id === disputeId ? { ...d, status: 'Resolved', resolution } : d
        ),
      }));
      runDbWrite(fsResolveDispute(disputeId, resolution), 'Resolve dispute');
      addAudit(currentUser?.name || 'Admin', 'admin', 'Resolved dispute', disputeId);
      pushToast('Dispute marked resolved', 'success');
    },
    [currentUser, addAudit, pushToast, runDbWrite]
  );

  const submitSellerReview = useCallback(
    (transactionId: string, rating: number, comment: string) => {
      const txn = state.transactions.find((t) => t.id === transactionId);
      if (!txn) return;
      const review: SellerReview = {
        id: `rev-${Date.now()}`,
        sellerId: txn.sellerId,
        sellerName: txn.sellerName,
        buyerId: firebaseUser?.uid || txn.buyerId,
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
      runDbWrite(fsCreateReview(review, transactionId), 'Create seller review');
      addNotification(
        'seller',
        'New buyer review received',
        `${txn.buyerName} rated ${rating}/5 on ${txn.reference}.`,
        'review',
        txn.sellerId
      );
      pushToast('Review published', 'success', 'Thank you for strengthening marketplace transparency.');
    },
    [state.transactions, firebaseUser, addNotification, pushToast, runDbWrite]
  );

  // Field Agent & IndexedDB Offline Sync
  const saveFieldDraftOffline = useCallback(
    async (draft: OfflineInspectionDraft) => {
      await saveOfflineDraft(draft);
      const all = await getAllOfflineDrafts();
      setOfflineDrafts(all);
      const nextStatus: FieldInspectionTask['status'] =
        draft.syncStatus === 'queued' ? 'Queued Offline' : 'In Progress';
      setState((prev) => ({
        ...prev,
        fieldTasks: prev.fieldTasks.map((t) =>
          t.id === draft.taskId ? { ...t, status: nextStatus } : t
        ),
      }));
      if (!offlineMode) {
        runDbWrite(fsUpdateFieldTaskStatus(draft.taskId, nextStatus), 'Update field task draft status');
      }
      pushToast(
        draft.syncStatus === 'queued' ? 'Saved to Offline Sync Queue' : 'Draft saved locally (IndexedDB)',
        'info',
        'Your inspection data and photos will persist even if you lose signal or refresh.'
      );
    },
    [offlineMode, pushToast, runDbWrite]
  );

  const applyInspectionReportToState = useCallback(
    (draft: OfflineInspectionDraft) => {
      const agent =
        currentUser?.role === 'agent'
          ? currentUser
          : state.users.find((u) => u.role === 'agent') || SEED_USERS[2];
      const report: VerificationReport = {
        id: `ver-${Date.now()}`,
        listingId: draft.listingId,
        agentId: firebaseUser?.uid || agent.id,
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
      const nextVerificationStatus: LivestockListing['verificationStatus'] =
        report.outcome === 'Approved' ? 'Verified' : 'Pending Verification';
      const targetListing = state.listings.find((l) => l.id === draft.listingId);

      setState((prev) => ({
        ...prev,
        listings: prev.listings.map((l) =>
          l.id === draft.listingId
            ? {
                ...l,
                verificationStatus: nextVerificationStatus,
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
      runDbWrite(
        fsUpdateListing(draft.listingId, {
          verificationStatus: nextVerificationStatus,
          verificationReport: report,
          weightKg: draft.observedWeightKg || targetListing?.weightKg,
          quantity: draft.observedQuantity || targetListing?.quantity,
        }),
        'Sync inspection report to listing'
      );
      runDbWrite(fsUpdateFieldTaskStatus(draft.taskId, 'Completed'), 'Complete field task');
      addNotification(
        'seller',
        `Field inspection synced (${report.outcome})`,
        `Inspector ${agent.name} completed on-site verification.`,
        'verification',
        targetListing?.sellerId
      );
      addAudit(agent.name, 'agent', `Synced verification report (${report.outcome})`, draft.listingId);
    },
    [currentUser, firebaseUser, state.users, state.listings, addNotification, addAudit, runDbWrite]
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
      const linkedTxn =
        updates.status === 'Released' && targetRec
          ? state.transactions.find(
              (t) => t.reference === targetRec.transactionRef && t.state !== 'Completed'
            )
          : undefined;
      const nextTimeline = linkedTxn
        ? [
            ...linkedTxn.timeline,
            {
              id: `te-${Date.now()}`,
              state: 'Handover initiated' as const,
              actor: currentUser?.name || 'Collection Hub',
              note: `Released from ${targetRec!.centreName} (${targetRec!.penNumber}) after PIN ${targetRec!.handoverPin} verification.`,
              timestamp: now,
            },
          ]
        : undefined;

      setState((prev) => ({
        ...prev,
        centreRecords: prev.centreRecords.map((r) =>
          r.id === recordId ? { ...r, ...updates } : r
        ),
        transactions:
          linkedTxn && nextTimeline
            ? prev.transactions.map((t) =>
                t.id === linkedTxn.id
                  ? { ...t, state: 'Handover initiated', updatedAt: now, timeline: nextTimeline }
                  : t
              )
            : prev.transactions,
      }));
      runDbWrite(fsUpdateCentreRecord(recordId, updates), 'Update centre record');
      if (linkedTxn && nextTimeline) {
        runDbWrite(
          fsUpdateTransaction(linkedTxn.id, {
            state: 'Handover initiated',
            timeline: nextTimeline,
          }),
          'Advance transaction on centre release'
        );
      }
      addAudit(
        currentUser?.name || 'Collection Hub',
        'centre',
        `Updated intake record (${updates.status || 'details'})`,
        targetRec?.reference || recordId
      );
      pushToast('Collection centre record updated', 'success');
    },
    [state.centreRecords, state.transactions, currentUser, addAudit, pushToast, runDbWrite]
  );

  const createCentreRecord = useCallback(
    (record: Omit<CollectionCentreRecord, 'id' | 'reference'>) => {
      const created: CollectionCentreRecord = {
        ...record,
        id: `ccr-${Date.now()}`,
        reference: generateRef('MCC'),
      };
      setState((prev) => ({ ...prev, centreRecords: [created, ...prev.centreRecords] }));
      runDbWrite(
        fsCreateCentreRecord(created, firebaseUser?.uid || 'usr-centre-1'),
        'Create centre record'
      );
      pushToast('Intake record logged', 'success', `${created.reference} assigned to ${created.penNumber}.`);
    },
    [firebaseUser, pushToast, runDbWrite]
  );

  // Transport Partner
  const acceptTransportJob = useCallback(
    (jobId: string, vehicleReg: string, driverName: string) => {
      const partner =
        currentUser?.role === 'transport'
          ? currentUser
          : state.users.find((u) => u.role === 'transport') || SEED_USERS[4];
      const partnerId = firebaseUser?.uid || partner.id;
      setState((prev) => ({
        ...prev,
        transportJobs: prev.transportJobs.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: 'Accepted',
                assignedPartnerId: partnerId,
                assignedVehicle: vehicleReg,
                assignedDriver: driverName,
              }
            : j
        ),
      }));
      runDbWrite(
        fsUpdateTransportJob(jobId, {
          status: 'Accepted',
          assignedPartnerId: partnerId,
          assignedVehicle: vehicleReg,
          assignedDriver: driverName,
        }),
        'Accept transport job'
      );
      addAudit(partner.name, 'transport', 'Accepted transport job', `${jobId} (${vehicleReg})`);
      pushToast('Transport job accepted', 'success', `Assigned ${vehicleReg} with driver ${driverName}.`);
    },
    [currentUser, firebaseUser, state.users, addAudit, pushToast, runDbWrite]
  );

  const updateTransportJobStatus = useCallback(
    (
      jobId: string,
      status: TransportJob['status'],
      pod?: { recipient: string; code: string; notes: string }
    ) => {
      const now = new Date().toISOString();
      const targetJob = state.transportJobs.find((j) => j.id === jobId);
      const linkedTxn =
        status === 'Delivered' && targetJob
          ? state.transactions.find((t) => t.id === targetJob.transactionId)
          : undefined;
      const nextTimeline = linkedTxn
        ? [
            ...linkedTxn.timeline,
            {
              id: `te-${Date.now()}`,
              state: 'Handover verified' as const,
              actor: targetJob?.assignedDriver || 'Transport Partner',
              note: `Proof of delivery signed by ${pod?.recipient || 'Receiver'} (Code: ${pod?.code || 'Verified'}).`,
              timestamp: now,
            },
          ]
        : undefined;

      const jobUpdates: Partial<TransportJob> = {
        status,
        ...(pod
          ? {
              podRecipient: pod.recipient,
              podCode: pod.code,
              podConditionNotes: pod.notes,
              podDeliveredAt: now,
            }
          : {}),
      };

      setState((prev) => ({
        ...prev,
        transportJobs: prev.transportJobs.map((j) =>
          j.id === jobId ? { ...j, ...jobUpdates } : j
        ),
        transactions:
          linkedTxn && nextTimeline
            ? prev.transactions.map((t) =>
                t.id === linkedTxn.id
                  ? { ...t, state: 'Handover verified', timeline: nextTimeline }
                  : t
              )
            : prev.transactions,
      }));
      runDbWrite(fsUpdateTransportJob(jobId, jobUpdates), 'Update transport job');
      if (linkedTxn && nextTimeline) {
        runDbWrite(
          fsUpdateTransaction(linkedTxn.id, {
            state: 'Handover verified',
            timeline: nextTimeline,
          }),
          'Verify handover on delivery'
        );
      }
      addNotification(
        'buyer',
        `Delivery status: ${status}`,
        `Consignment ${targetJob?.reference || jobId} updated.`,
        'logistics',
        linkedTxn?.buyerId
      );
      addAudit(
        currentUser?.name || 'Transport Partner',
        'transport',
        `Updated job -> ${status}`,
        targetJob?.reference || jobId
      );
      pushToast(`Job marked: ${status}`, 'success');
    },
    [state.transportJobs, state.transactions, currentUser, addNotification, addAudit, pushToast, runDbWrite]
  );

  const addTransportVehicle = useCallback(
    (vehicle: Omit<TransportVehicle, 'id'>) => {
      const created: TransportVehicle = { ...vehicle, id: `veh-${Date.now()}` };
      setState((prev) => ({
        ...prev,
        vehicles: [created, ...prev.vehicles],
      }));
      runDbWrite(
        fsCreateVehicle(created, firebaseUser?.uid || 'usr-transport-1'),
        'Register fleet vehicle'
      );
      pushToast('Vehicle registered to fleet', 'success', vehicle.registration);
    },
    [firebaseUser, pushToast, runDbWrite]
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
      runDbWrite(fsAdminUpdateUserStatus(userId, status, verified), 'Update user status');
      addAudit(currentUser?.name || 'Admin', 'admin', `Updated user status -> ${status}`, userId);
      pushToast(`User status updated to ${status}`, 'success');
    },
    [currentUser, addAudit, pushToast, runDbWrite]
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
      runDbWrite(fsCreateFieldTask(task, listing.sellerId), 'Assign field task');
      runDbWrite(
        fsUpdateListing(listingId, { verificationStatus: 'Inspection Scheduled' }),
        'Mark listing inspection scheduled'
      );
      addAudit(currentUser?.name || 'Admin', 'admin', `Assigned inspection to ${agent.name}`, listing.reference);
      addNotification(
        'agent',
        `Inspection assigned: ${listing.reference}`,
        `${listing.title} (${priority} priority).`,
        'verification',
        agent.id
      );
      pushToast('Field agent assigned', 'success', `${agent.name} assigned to ${listing.reference}.`);
    },
    [state.listings, state.users, currentUser, addAudit, addNotification, pushToast, runDbWrite]
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
      const conv = state.conversations.find((c) => c.id === conversationId);
      const sender = currentUser || state.users[0];
      const now = new Date().toISOString();
      const msg = {
        id: `msg-${Date.now()}`,
        senderId: firebaseUser?.uid || sender.id,
        senderName: sender.name,
        senderRole: sender.role,
        text,
        attachmentName,
        timestamp: now,
        read: true,
      };
      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, updatedAt: now, messages: [...c.messages, msg] }
            : c
        ),
      }));
      if (conv) {
        const participantIds = conv.participants.map((p) => p.id);
        runDbWrite(fsSendMessage(conversationId, participantIds, msg), 'Send message');
      }
    },
    [state.conversations, state.users, currentUser, firebaseUser, runDbWrite]
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
      const senderId = firebaseUser?.uid || sender.id;
      const now = new Date().toISOString();
      const firstMsg = {
        id: `msg-${Date.now()}`,
        senderId,
        senderName: sender.name,
        senderRole: sender.role,
        text: firstMessage,
        timestamp: now,
        read: true,
      };
      const conv: Conversation = {
        id: `cnv-${Date.now()}`,
        subject,
        contextType,
        contextRef,
        participants: [
          { id: senderId, name: sender.name, role: sender.role },
          recipient,
        ],
        updatedAt: now,
        messages: [firstMsg],
      };
      setState((prev) => ({ ...prev, conversations: [conv, ...prev.conversations] }));
      runDbWrite(fsCreateConversation(conv, firstMsg), 'Create conversation');
      pushToast('Message sent', 'success', `Conversation opened with ${recipient.name}.`);
      return conv;
    },
    [currentUser, firebaseUser, state.users, pushToast, runDbWrite]
  );

  const updateCurrentUserProfile = useCallback(
    (
      updates: Partial<
        Pick<UserAccount, 'name' | 'organization' | 'phone' | 'country' | 'district' | 'province' | 'meta'>
      >
    ) => {
      if (!accountProfile) return;
      const updatedUser: UserAccount = {
        ...accountProfile,
        ...updates,
        meta: { ...(accountProfile.meta || {}), ...(updates.meta || {}) },
      };
      setAccountProfile(updatedUser);
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
      }));
      if (firebaseUser) {
        runDbWrite(fsUpdateUserProfile(firebaseUser.uid, updates), 'Update user profile');
      }
      pushToast('Profile settings saved', 'success');
    },
    [accountProfile, firebaseUser, pushToast, runDbWrite]
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      const conv = state.conversations.find((c) => c.id === conversationId);
      const myId = firebaseUser?.uid || currentUser?.id;
      const unreadIds =
        conv?.messages.filter((m) => m.senderId !== myId && !m.read).map((m) => m.id) || [];
      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) => (m.senderId !== myId ? { ...m, read: true } : m)),
              }
            : c
        ),
      }));
      if (unreadIds.length > 0) {
        runDbWrite(fsMarkMessagesRead(conversationId, unreadIds), 'Mark conversation read');
      }
    },
    [state.conversations, firebaseUser?.uid, currentUser?.id, runDbWrite]
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }));
      runDbWrite(fsMarkNotificationRead(id), 'Mark notification read');
    },
    [runDbWrite]
  );

  const markAllNotificationsRead = useCallback(() => {
    const unreadIds = state.notifications.filter((n) => !n.read).map((n) => n.id);
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
    unreadIds.forEach((id) => {
      runDbWrite(fsMarkNotificationRead(id), 'Mark all notifications read');
    });
  }, [state.notifications, runDbWrite]);

  const resetDemoData = useCallback(() => {
    if (firebaseUser && isAdminAccount) {
      seedMarketplaceIfEmpty(firebaseUser, true)
        .then(() => {
          pushToast('Marketplace dataset restored', 'success');
        })
        .catch(() => {
          pushToast('Could not restore dataset', 'error');
        });
      return;
    }
    setState(INITIAL_SEED_STATE);
    pushToast('Demo view refreshed', 'info');
  }, [firebaseUser, isAdminAccount, pushToast]);

  // =========================================================================
  // Hybrid Physical + Online Auctions Actions
  // =========================================================================

  const userPaddleNumber = firebaseUser
    ? `PAD-${firebaseUser.uid.slice(0, 4).toUpperCase()}`
    : 'PAD-GUEST';

  const currentUserSubscription = firebaseUser
    ? state.subscriptions.find((s) => s.userId === firebaseUser.uid) || null
    : null;

  const registerBidderPaddle = useCallback(
    (auctionId: string) => {
      if (!firebaseUser) {
        pushToast('Sign in to register your bidding paddle', 'info', 'Connect your Google account to bid live online.');
        openAuth('login', 'buyer');
        return;
      }
      if (registeredAuctionIds.includes(auctionId)) {
        pushToast('Online paddle already active', 'info', `Your active paddle is ${userPaddleNumber}.`);
        return;
      }
      const target = state.auctions.find((a) => a.id === auctionId);
      setRegisteredAuctionIds((prev) => [...prev, auctionId]);
      if (target) {
        const nextCount = target.registeredBidders + 1;
        setState((prev) => ({
          ...prev,
          auctions: prev.auctions.map((a) =>
            a.id === auctionId ? { ...a, registeredBidders: nextCount } : a
          ),
        }));
        runDbWrite(fsIncrementAuctionBidders(auctionId, nextCount), 'Register bidder paddle');
      }
      pushToast('Online Bidding Paddle Issued', 'success', `Paddle ${userPaddleNumber} is cleared for hybrid bidding.`);
    },
    [firebaseUser, registeredAuctionIds, userPaddleNumber, state.auctions, openAuth, pushToast, runDbWrite]
  );

  const watchAuctionLotBids = useCallback((lotId: string) => {
    return subscribeAuctionLotBids(lotId, (bids) => {
      if (bids.length > 0) {
        setState((prev) => ({
          ...prev,
          auctionBidsByLot: {
            ...prev.auctionBidsByLot,
            [lotId]: bids,
          },
        }));
      }
    });
  }, []);

  const placeOnlineBid = useCallback(
    (lotId: string, amountUsd: number, maxProxyUsd?: number): boolean => {
      if (!firebaseUser) {
        pushToast('Sign in to place a live bid', 'info', 'Google verification is required before bidding.');
        openAuth('login', 'buyer');
        return false;
      }
      const lot = state.auctionLots.find((l) => l.id === lotId);
      if (!lot || lot.status !== 'Live') {
        pushToast('Lot is not open for live bidding', 'warning');
        return false;
      }
      const minBid = Math.max(lot.openingBidUsd, lot.currentBidUsd + lot.bidIncrementUsd);
      if (!Number.isFinite(amountUsd) || amountUsd < minBid) {
        pushToast('Bid below minimum increment', 'warning', `Minimum valid bid is $${minBid.toLocaleString()}.`);
        return false;
      }

      // Auto-register online paddle on first bid so bidding is 1-click smooth
      if (!registeredAuctionIds.includes(lot.auctionId)) {
        setRegisteredAuctionIds((prev) =>
          prev.includes(lot.auctionId) ? prev : [...prev, lot.auctionId]
        );
        const parentAuction = state.auctions.find((a) => a.id === lot.auctionId);
        if (parentAuction) {
          const nextBidders = parentAuction.registeredBidders + 1;
          setState((prev) => ({
            ...prev,
            auctions: prev.auctions.map((a) =>
              a.id === lot.auctionId ? { ...a, registeredBidders: nextBidders } : a
            ),
          }));
          runDbWrite(fsIncrementAuctionBidders(lot.auctionId, nextBidders), 'Auto-register bidder paddle');
        }
      }

      const bidderName = currentUser?.name || firebaseUser.displayName || 'MARIKETI Buyer';
      const now = new Date().toISOString();
      const validProxy = maxProxyUsd && maxProxyUsd >= amountUsd ? maxProxyUsd : undefined;
      const newBid: AuctionBid = {
        id: `bid-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        lotId: lot.id,
        auctionId: lot.auctionId,
        bidderId: firebaseUser.uid,
        bidderName,
        paddleNumber: userPaddleNumber,
        channel: 'Online',
        amountUsd,
        maxProxyUsd: validProxy,
        timestamp: now,
      };

      setState((prev) => ({
        ...prev,
        auctionLots: prev.auctionLots.map((l) =>
          l.id === lotId
            ? {
                ...l,
                currentBidUsd: amountUsd,
                bidCount: l.bidCount + 1,
                highestBidderId: firebaseUser.uid,
                highestBidderName: bidderName,
                highestBidderPaddle: userPaddleNumber,
                highestBidChannel: 'Online',
              }
            : l
        ),
        auctionBidsByLot: {
          ...prev.auctionBidsByLot,
          [lotId]: [newBid, ...(prev.auctionBidsByLot[lotId] || [])].sort(
            (a, b) => b.amountUsd - a.amountUsd
          ),
        },
      }));
      runDbWrite(fsPlaceAuctionBid(lot, newBid), 'Place online auction bid');
      addAudit(bidderName, currentUser?.role || 'buyer', `Placed online bid ($${amountUsd})`, `${lot.lotNumber} (${userPaddleNumber})`);

      const reserveJustMet = lot.currentBidUsd < lot.reservePriceUsd && amountUsd >= lot.reservePriceUsd;
      pushToast(
        reserveJustMet ? 'Bid confirmed — Reserve Met' : 'Online bid confirmed',
        'success',
        validProxy
          ? `Leading ${lot.lotNumber} at $${amountUsd.toLocaleString()} (Auto-bid proxy active up to $${validProxy.toLocaleString()}).`
          : `You hold the high bid on ${lot.lotNumber} at $${amountUsd.toLocaleString()}.`
      );
      return true;
    },
    [
      firebaseUser,
      state.auctionLots,
      state.auctions,
      registeredAuctionIds,
      currentUser,
      userPaddleNumber,
      openAuth,
      pushToast,
      runDbWrite,
      addAudit,
    ]
  );

  const recordFloorBid = useCallback(
    (lotId: string, floorPaddle: string, amountUsd: number): boolean => {
      if (!firebaseUser || !isAdminAccount) {
        pushToast('Auctioneer permission required', 'warning', 'Only Operations Admins / Ring Clerks can log physical floor bids.');
        return false;
      }
      const lot = state.auctionLots.find((l) => l.id === lotId);
      if (!lot || lot.status !== 'Live') {
        pushToast('Open lot to Live before logging floor bids', 'warning');
        return false;
      }
      const minBid = Math.max(lot.openingBidUsd, lot.currentBidUsd + lot.bidIncrementUsd);
      if (!Number.isFinite(amountUsd) || amountUsd < minBid) {
        pushToast('Floor bid too low', 'warning', `Enter at least $${minBid.toLocaleString()}.`);
        return false;
      }
      const cleanPaddle = floorPaddle.trim().toUpperCase() || 'FLOOR-101';
      const now = new Date().toISOString();
      const floorBid: AuctionBid = {
        id: `bid-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        lotId: lot.id,
        auctionId: lot.auctionId,
        bidderId: `floor-${cleanPaddle.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
        bidderName: `Physical Ring Buyer (${cleanPaddle})`,
        paddleNumber: cleanPaddle,
        channel: 'Floor',
        amountUsd,
        timestamp: now,
      };

      // Check if an online bidder holds an active Auto-Bid Proxy cap above this floor bid
      const existingBids = state.auctionBidsByLot[lotId] || [];
      const bestOnlineProxy = existingBids
        .filter((b) => b.channel === 'Online' && typeof b.maxProxyUsd === 'number' && b.maxProxyUsd >= amountUsd + lot.bidIncrementUsd)
        .sort((a, b) => (b.maxProxyUsd || 0) - (a.maxProxyUsd || 0))[0];

      const lotAfterFloor: AuctionLot = {
        ...lot,
        currentBidUsd: amountUsd,
        bidCount: lot.bidCount + 1,
        highestBidderId: floorBid.bidderId,
        highestBidderName: floorBid.bidderName,
        highestBidderPaddle: cleanPaddle,
        highestBidChannel: 'Floor',
      };

      let proxyCounterBid: AuctionBid | null = null;
      let finalLot: AuctionLot = lotAfterFloor;

      if (bestOnlineProxy && bestOnlineProxy.maxProxyUsd) {
        const counterAmount = Math.min(
          bestOnlineProxy.maxProxyUsd,
          amountUsd + lot.bidIncrementUsd
        );
        if (counterAmount >= amountUsd + lot.bidIncrementUsd) {
          proxyCounterBid = {
            id: `bid-${Date.now() + 1}-${Math.random().toString(36).slice(2, 5)}`,
            lotId: lot.id,
            auctionId: lot.auctionId,
            bidderId: bestOnlineProxy.bidderId,
            bidderName: bestOnlineProxy.bidderName,
            paddleNumber: bestOnlineProxy.paddleNumber,
            channel: 'Online',
            amountUsd: counterAmount,
            maxProxyUsd: bestOnlineProxy.maxProxyUsd,
            timestamp: new Date(Date.now() + 250).toISOString(),
          };
          finalLot = {
            ...lotAfterFloor,
            currentBidUsd: counterAmount,
            bidCount: lotAfterFloor.bidCount + 1,
            highestBidderId: proxyCounterBid.bidderId,
            highestBidderName: proxyCounterBid.bidderName,
            highestBidderPaddle: proxyCounterBid.paddleNumber,
            highestBidChannel: 'Online',
          };
        }
      }

      const appendedBids = proxyCounterBid ? [proxyCounterBid, floorBid] : [floorBid];

      setState((prev) => ({
        ...prev,
        auctionLots: prev.auctionLots.map((l) => (l.id === lotId ? finalLot : l)),
        auctionBidsByLot: {
          ...prev.auctionBidsByLot,
          [lotId]: [...appendedBids, ...(prev.auctionBidsByLot[lotId] || [])].sort(
            (a, b) => b.amountUsd - a.amountUsd
          ),
        },
      }));

      if (proxyCounterBid) {
        const counterToWrite = proxyCounterBid;
        runDbWrite(
          fsPlaceAuctionBid(lot, floorBid).then(() =>
            fsPlaceAuctionBid(lotAfterFloor, counterToWrite)
          ),
          'Record floor bid + auto proxy counter'
        );
        addAudit(
          currentUser?.name || 'Auctioneer',
          'admin',
          `Logged Floor $${amountUsd} (${cleanPaddle}) · Auto-Proxy countered $${counterToWrite.amountUsd} (${counterToWrite.paddleNumber})`,
          lot.lotNumber
        );
        pushToast(
          'Auto-Bid Proxy Defended Lead',
          'success',
          `${cleanPaddle} bid $${amountUsd.toLocaleString()}, automatically countered by ${counterToWrite.paddleNumber} at $${counterToWrite.amountUsd.toLocaleString()}.`
        );
      } else {
        runDbWrite(fsPlaceAuctionBid(lot, floorBid), 'Record physical floor bid');
        addAudit(currentUser?.name || 'Auctioneer', 'admin', `Logged Floor Bid $${amountUsd} (${cleanPaddle})`, lot.lotNumber);
        pushToast('Physical floor bid synced to online ring', 'info', `${cleanPaddle} leads at $${amountUsd.toLocaleString()}.`);
      }
      return true;
    },
    [firebaseUser, isAdminAccount, state.auctionLots, state.auctionBidsByLot, currentUser, pushToast, runDbWrite, addAudit]
  );

  const updateAuctionLotStatus = useCallback(
    (lotId: string, status: AuctionLot['status']) => {
      if (!firebaseUser || !isAdminAccount) {
        pushToast('Auctioneer permission required', 'warning');
        return;
      }
      const lot = state.auctionLots.find((l) => l.id === lotId);
      setState((prev) => ({
        ...prev,
        auctionLots: prev.auctionLots.map((l) => (l.id === lotId ? { ...l, status } : l)),
      }));
      runDbWrite(fsUpdateAuctionLotStatus(lotId, status), 'Update auction lot status');
      addAudit(currentUser?.name || 'Auctioneer', 'admin', `Marked lot -> ${status}`, lot?.lotNumber || lotId);
      pushToast(`${lot?.lotNumber || 'Lot'} marked ${status}`, status === 'Sold' ? 'success' : 'info');
    },
    [firebaseUser, isAdminAccount, state.auctionLots, currentUser, pushToast, runDbWrite, addAudit]
  );

  const hammerAndAdvanceLot = useCallback(
    (lotId: string, outcome: 'Sold' | 'Passed In'): string | null => {
      if (!firebaseUser || !isAdminAccount) {
        pushToast('Auctioneer permission required', 'warning');
        return null;
      }
      const lot = state.auctionLots.find((l) => l.id === lotId);
      if (!lot) return null;

      const sameAuctionLots = state.auctionLots
        .filter((l) => l.auctionId === lot.auctionId)
        .sort((a, b) => a.lotNumber.localeCompare(b.lotNumber));
      const nextQueued = sameAuctionLots.find((l) => l.id !== lotId && l.status === 'Queued') || null;

      setState((prev) => ({
        ...prev,
        auctionLots: prev.auctionLots.map((l) => {
          if (l.id === lotId) return { ...l, status: outcome };
          if (nextQueued && l.id === nextQueued.id) return { ...l, status: 'Live' };
          return l;
        }),
      }));

      runDbWrite(fsUpdateAuctionLotStatus(lotId, outcome), 'Hammer current lot');
      if (nextQueued) {
        runDbWrite(fsUpdateAuctionLotStatus(nextQueued.id, 'Live'), 'Open next queued lot');
      }

      addAudit(
        currentUser?.name || 'Auctioneer',
        'admin',
        nextQueued
          ? `Hammered ${lot.lotNumber} (${outcome}) & opened ${nextQueued.lotNumber}`
          : `Hammered ${lot.lotNumber} (${outcome})`,
        lot.lotNumber
      );

      pushToast(
        nextQueued
          ? `${lot.lotNumber} ${outcome} — ${nextQueued.lotNumber} is now Live`
          : `${lot.lotNumber} hammered ${outcome}`,
        outcome === 'Sold' ? 'success' : 'info',
        outcome === 'Sold'
          ? `Hammer price: $${lot.currentBidUsd.toLocaleString()} (${lot.highestBidderPaddle || 'Ring'}).`
          : 'Lot closed below reserve.'
      );
      return nextQueued ? nextQueued.id : null;
    },
    [firebaseUser, isAdminAccount, state.auctionLots, currentUser, pushToast, runDbWrite, addAudit]
  );

  // =========================================================================
  // Agri-Vet Online Store & Recurring Subscription Actions
  // =========================================================================

  const addToCart = useCallback(
    (productId: string, qty = 1) => {
      const prod = state.products.find((p) => p.id === productId);
      if (!prod) return;
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === productId);
        if (existing) {
          return prev.map((i) =>
            i.productId === productId ? { ...i, qty: Math.min(99, i.qty + qty) } : i
          );
        }
        return [...prev, { productId, qty }];
      });
      pushToast('Added to cart', 'success', `${prod.name} (${qty})`);
    },
    [state.products, pushToast]
  );

  const updateCartQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, qty: Math.min(99, qty) } : i))
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const checkoutCart = useCallback(
    (deliveryAddress: string, country: string): ProductOrder | null => {
      if (!firebaseUser) {
        pushToast('Sign in to complete checkout', 'info', 'Connect your Google account to save your Agri-Vet order.');
        openAuth('login', 'buyer');
        return null;
      }
      if (cart.length === 0) {
        pushToast('Your cart is empty', 'warning');
        return null;
      }
      const hasActiveSub = currentUserSubscription?.status === 'active';
      const items = cart
        .map((c) => {
          const prod = state.products.find((p) => p.id === c.productId);
          if (!prod) return null;
          const discountPct =
            hasActiveSub && prod.subscriptionEligible ? prod.subscriptionDiscountPct || 10 : 0;
          const unitPriceUsd = Math.max(1, Math.round(prod.priceUsd * (1 - discountPct / 100)));
          return {
            productId: prod.id,
            name: prod.name,
            qty: c.qty,
            unitPriceUsd,
          };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

      const totalUsd = items.reduce((sum, i) => sum + i.unitPriceUsd * i.qty, 0);
      const buyerName = currentUser?.name || firebaseUser.displayName || 'MARIKETI Buyer';
      const order: ProductOrder = {
        id: `ord-${Date.now()}`,
        reference: generateRef('ORD'),
        buyerId: firebaseUser.uid,
        buyerName,
        country: country || currentUser?.country || 'Zimbabwe',
        deliveryAddress: deliveryAddress.trim() || 'MARIKETI Regional Collection Hub Pickup',
        items,
        totalUsd,
        paymentMode: 'Simulated Demo Checkout (No Live Funds Charged)',
        status: 'Confirmed',
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        productOrders: [order, ...prev.productOrders],
      }));
      setCart([]);
      runDbWrite(fsCreateProductOrder(order), 'Create agri-vet product order');
      addAudit(buyerName, currentUser?.role || 'buyer', 'Placed Agri-Vet Store order', `${order.reference} ($${totalUsd})`);
      pushToast('Order confirmed (Demo Checkout)', 'success', `Reference ${order.reference} saved to your account.`);
      return order;
    },
    [firebaseUser, cart, currentUserSubscription, state.products, currentUser, openAuth, pushToast, runDbWrite, addAudit]
  );

  const cancelProductOrder = useCallback(
    (orderId: string) => {
      setState((prev) => ({
        ...prev,
        productOrders: prev.productOrders.map((o) =>
          o.id === orderId ? { ...o, status: 'Cancelled' } : o
        ),
      }));
      runDbWrite(fsCancelProductOrder(orderId), 'Cancel product order');
      pushToast('Order cancelled', 'info');
    },
    [pushToast, runDbWrite]
  );

  const activateSubscription = useCallback(
    (planId: string, billingCycle: 'monthly' | 'annual') => {
      if (!firebaseUser) {
        pushToast('Sign in to activate a MARIKETI plan', 'info', 'Connect your Google account to manage subscriptions.');
        openAuth('login', 'buyer');
        return;
      }
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
      if (!plan) return;
      const now = new Date();
      const renews = new Date(
        now.getTime() + (billingCycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000
      );
      const alreadyExists = Boolean(currentUserSubscription);
      const userName = currentUser?.name || firebaseUser.displayName || 'MARIKETI Member';
      const sub: UserSubscription = {
        id: firebaseUser.uid,
        userId: firebaseUser.uid,
        userName,
        planId: plan.id,
        planName: plan.name,
        tier: plan.tier,
        billingCycle,
        amountUsd: billingCycle === 'annual' ? plan.annualUsd : plan.monthlyUsd,
        status: 'active',
        startedAt: now.toISOString(),
        renewsAt: renews.toISOString(),
        paymentMode: 'Simulated Demo Billing (No Live Card Charged)',
      };

      setState((prev) => ({
        ...prev,
        subscriptions: [
          sub,
          ...prev.subscriptions.filter((s) => s.userId !== firebaseUser.uid),
        ],
      }));
      runDbWrite(fsUpsertSubscription(sub, alreadyExists), 'Activate MARIKETI subscription');
      addAudit(userName, currentUser?.role || 'buyer', `Activated subscription (${billingCycle})`, plan.name);
      pushToast('Subscription active (Demo Billing)', 'success', `${plan.name} is now active on your account.`);
    },
    [firebaseUser, currentUserSubscription, currentUser, openAuth, pushToast, runDbWrite, addAudit]
  );

  const updateSubscriptionStatus = useCallback(
    (status: 'active' | 'paused' | 'cancelled') => {
      if (!firebaseUser || !currentUserSubscription) return;
      const updated: UserSubscription = {
        ...currentUserSubscription,
        status,
      };
      setState((prev) => ({
        ...prev,
        subscriptions: prev.subscriptions.map((s) =>
          s.userId === firebaseUser.uid ? updated : s
        ),
      }));
      runDbWrite(fsUpsertSubscription(updated, true), 'Update subscription status');
      pushToast(`Subscription ${status}`, 'info');
    },
    [firebaseUser, currentUserSubscription, pushToast, runDbWrite]
  );

  return (
    <MariketiContext.Provider
      value={{
        ...state,
        currentUser,
        firebaseUser,
        authReady,
        authLoading,
        needsOnboarding,
        isAdminAccount,
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
        signInWithGoogle,
        loginAsRole,
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
        registeredAuctionIds,
        userPaddleNumber,
        registerBidderPaddle,
        watchAuctionLotBids,
        placeOnlineBid,
        recordFloorBid,
        updateAuctionLotStatus,
        hammerAndAdvanceLot,
        cart,
        currentUserSubscription,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        checkoutCart,
        cancelProductOrder,
        activateSubscription,
        updateSubscriptionStatus,
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
