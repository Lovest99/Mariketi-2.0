import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
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
} from '../data/seedData';
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
  MessageItem,
  Offer,
  ProductOrder,
  SellerReview,
  Transaction,
  TransportJob,
  TransportVehicle,
  UserAccount,
  UserRole,
  UserSubscription,
} from '../types/mariketi';

export const BOOTSTRAP_ADMIN_EMAIL = 'brightcheteni1@gmail.com';

export function isBootstrapAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL);
}

// ============================================================================
// Defensive Payload Validation & Sanitization (Synced with firebase-blueprint.json)
// ============================================================================

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const REF_PATTERN = /^[A-Z0-9-]+$/;

export function sanitizeId(raw: string, fallbackPrefix = 'doc'): string {
  const cleaned = (raw || '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  if (cleaned.length >= 1 && ID_PATTERN.test(cleaned)) return cleaned;
  return `${fallbackPrefix}-${Date.now()}`;
}

export function sanitizeRef(raw: string, fallbackPrefix = 'MRK'): string {
  const cleaned = (raw || '').toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 40);
  if (cleaned.length >= 3 && REF_PATTERN.test(cleaned)) return cleaned;
  return `${fallbackPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function clampStr(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const str = (val ?? fallback).toString();
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

export function clampNum(val: number | undefined | null, min: number, max: number, fallback = min): number {
  const n = typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  return Math.min(max, Math.max(min, n));
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      result[k] = v;
    }
  }
  return result as T;
}

function tsToIso(val: unknown, fallback?: string): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string' && val.length > 0) {
    return val;
  }
  return fallback || new Date().toISOString();
}

export interface StoredUserPreferences {
  savedListingIds: string[];
  recentlyViewedIds: string[];
  compareListingIds: string[];
}

export interface UserProfileRecord {
  account: UserAccount;
  preferences: StoredUserPreferences;
}

function mapUserDoc(data: Record<string, unknown>): UserProfileRecord {
  const account: UserAccount = {
    id: String(data.id || data.uid || ''),
    name: String(data.name || 'MARIKETI Member'),
    email: String(data.email || ''),
    phone: String(data.phone || ''),
    role: (data.role as UserRole) || 'buyer',
    organization: data.organization ? String(data.organization) : undefined,
    country: String(data.country || 'Zimbabwe'),
    province: String(data.province || ''),
    district: String(data.district || ''),
    verified: Boolean(data.verified),
    status: (data.status as UserAccount['status']) || 'active',
    rating: typeof data.rating === 'number' ? data.rating : 5.0,
    reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 0,
    joinedAt: tsToIso(data.joinedAt ?? data.createdAt),
    meta: data.meta && typeof data.meta === 'object' ? (data.meta as Record<string, string>) : undefined,
  };
  const preferences: StoredUserPreferences = {
    savedListingIds: Array.isArray(data.savedListingIds) ? (data.savedListingIds as string[]) : [],
    recentlyViewedIds: Array.isArray(data.recentlyViewedIds) ? (data.recentlyViewedIds as string[]) : [],
    compareListingIds: Array.isArray(data.compareListingIds) ? (data.compareListingIds as string[]) : [],
  };
  return { account, preferences };
}

function mapPublicProfile(data: Record<string, unknown>): UserAccount {
  return {
    id: String(data.id || data.uid || ''),
    name: String(data.name || 'MARIKETI Participant'),
    email: '',
    phone: '',
    role: (data.role as UserRole) || 'seller',
    organization: data.organization ? String(data.organization) : undefined,
    country: String(data.country || 'Zimbabwe'),
    province: String(data.province || ''),
    district: String(data.district || ''),
    verified: Boolean(data.verified),
    status: (data.status as UserAccount['status']) || 'active',
    rating: typeof data.rating === 'number' ? data.rating : 4.8,
    reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 0,
    joinedAt: tsToIso(data.joinedAt ?? data.createdAt),
  };
}

function mapListingDoc(data: Record<string, unknown>): LivestockListing {
  return {
    id: String(data.id || ''),
    reference: String(data.reference || ''),
    title: String(data.title || ''),
    category: data.category as LivestockListing['category'],
    breed: String(data.breed || ''),
    ageMonths: Number(data.ageMonths ?? 0),
    ageLabel: String(data.ageLabel || ''),
    gender: data.gender as LivestockListing['gender'],
    weightKg: Number(data.weightKg ?? 0),
    quantity: Number(data.quantity ?? 1),
    priceUsd: Number(data.priceUsd ?? 0),
    priceUnit: (data.priceUnit as LivestockListing['priceUnit']) || 'per head',
    country: String(data.country || 'Zimbabwe'),
    province: String(data.province || ''),
    district: String(data.district || ''),
    farmName: String(data.farmName || ''),
    sellerId: String(data.sellerId || ''),
    sellerName: String(data.sellerName || ''),
    sellerRating: Number(data.sellerRating ?? 4.8),
    sellerVerified: Boolean(data.sellerVerified),
    verificationStatus: data.verificationStatus as LivestockListing['verificationStatus'],
    verificationReport: data.verificationReport as LivestockListing['verificationReport'],
    status: (data.status as LivestockListing['status']) || 'active',
    listedAt: tsToIso(data.listedAt ?? data.createdAt),
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    description: String(data.description || ''),
    vaccinationSummary: String(data.vaccinationSummary || ''),
    feedingRegime: String(data.feedingRegime || ''),
    featured: Boolean(data.featured),
    views: Number(data.views ?? 0),
  };
}

function mapOfferDoc(data: Record<string, unknown>): Offer {
  return {
    id: String(data.id || ''),
    reference: String(data.reference || ''),
    listingId: String(data.listingId || ''),
    listingTitle: String(data.listingTitle || ''),
    listingRef: String(data.listingRef || ''),
    buyerId: String(data.buyerId || ''),
    buyerName: String(data.buyerName || ''),
    sellerId: String(data.sellerId || ''),
    sellerName: String(data.sellerName || ''),
    currentAmountUsd: Number(data.currentAmountUsd ?? 0),
    quantity: Number(data.quantity ?? 1),
    status: data.status as Offer['status'],
    lastActorRole: (data.lastActorRole as 'buyer' | 'seller') || 'buyer',
    expiresAt: tsToIso(data.expiresAt),
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
    history: Array.isArray(data.history) ? (data.history as Offer['history']) : [],
  };
}

function mapTransactionDoc(data: Record<string, unknown>): Transaction {
  return {
    id: String(data.id || ''),
    reference: String(data.reference || ''),
    offerId: String(data.offerId || ''),
    listingId: String(data.listingId || ''),
    listingTitle: String(data.listingTitle || ''),
    listingCategory: data.listingCategory as Transaction['listingCategory'],
    quantity: Number(data.quantity ?? 1),
    buyerId: String(data.buyerId || ''),
    buyerName: String(data.buyerName || ''),
    sellerId: String(data.sellerId || ''),
    sellerName: String(data.sellerName || ''),
    agreedAmountUsd: Number(data.agreedAmountUsd ?? 0),
    state: data.state as Transaction['state'],
    paymentMode: 'Simulated Demo Settlement (No Live Funds Held)',
    paymentStatus: (data.paymentStatus as Transaction['paymentStatus']) || 'Unpaid',
    collectionCentreName: String(data.collectionCentreName || ''),
    pickupLocation: String(data.pickupLocation || ''),
    deliveryLocation: String(data.deliveryLocation || ''),
    handoverCode: String(data.handoverCode || ''),
    transportJobId: data.transportJobId ? String(data.transportJobId) : undefined,
    documents: Array.isArray(data.documents) ? (data.documents as Transaction['documents']) : [],
    timeline: Array.isArray(data.timeline) ? (data.timeline as Transaction['timeline']) : [],
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
    hasReview: Boolean(data.hasReview),
  };
}

function mapFieldTaskDoc(data: Record<string, unknown>): FieldInspectionTask {
  return {
    id: String(data.id || ''),
    reference: String(data.reference || ''),
    listingId: String(data.listingId || ''),
    listingTitle: String(data.listingTitle || ''),
    sellerName: String(data.sellerName || ''),
    sellerPhone: String(data.sellerPhone || ''),
    farmName: String(data.farmName || ''),
    country: String(data.country || 'Zimbabwe'),
    province: String(data.province || ''),
    district: String(data.district || ''),
    assignedAgentId: String(data.assignedAgentId || ''),
    assignedAgentName: String(data.assignedAgentName || ''),
    scheduledDate: String(data.scheduledDate || ''),
    priority: (data.priority as FieldInspectionTask['priority']) || 'Standard',
    status: (data.status as FieldInspectionTask['status']) || 'Assigned',
    expectedCategory: data.expectedCategory as FieldInspectionTask['expectedCategory'],
    expectedBreed: String(data.expectedBreed || ''),
    expectedQuantity: Number(data.expectedQuantity ?? 1),
  };
}

function mapCentreRecordDoc(data: Record<string, unknown>): CollectionCentreRecord {
  return {
    id: String(data.id || ''),
    reference: String(data.reference || ''),
    centreName: String(data.centreName || ''),
    country: data.country ? String(data.country) : undefined,
    transactionRef: String(data.transactionRef || ''),
    listingTitle: String(data.listingTitle || ''),
    category: data.category as CollectionCentreRecord['category'],
    quantity: Number(data.quantity ?? 1),
    sellerName: String(data.sellerName || ''),
    buyerName: String(data.buyerName || ''),
    penNumber: String(data.penNumber || ''),
    checkedWeightAvgKg: Number(data.checkedWeightAvgKg ?? 0),
    status: data.status as CollectionCentreRecord['status'],
    expectedAt: tsToIso(data.expectedAt),
    checkedInAt: data.checkedInAt ? tsToIso(data.checkedInAt) : undefined,
    releasedAt: data.releasedAt ? tsToIso(data.releasedAt) : undefined,
    handoverPin: String(data.handoverPin || ''),
    notes: String(data.notes || ''),
  };
}

function mapTransportJobDoc(data: Record<string, unknown>): TransportJob {
  return {
    id: String(data.id || ''),
    reference: String(data.reference || ''),
    transactionId: String(data.transactionId || ''),
    transactionRef: String(data.transactionRef || ''),
    listingTitle: String(data.listingTitle || ''),
    category: data.category as TransportJob['category'],
    quantity: Number(data.quantity ?? 1),
    pickupLocation: String(data.pickupLocation || ''),
    destination: String(data.destination || ''),
    country: data.country ? String(data.country) : undefined,
    distanceKm: Number(data.distanceKm ?? 0),
    requirements: String(data.requirements || ''),
    scheduledDate: String(data.scheduledDate || ''),
    feeUsd: Number(data.feeUsd ?? 0),
    status: data.status as TransportJob['status'],
    assignedPartnerId: data.assignedPartnerId ? String(data.assignedPartnerId) : undefined,
    assignedDriver: data.assignedDriver ? String(data.assignedDriver) : undefined,
    assignedVehicle: data.assignedVehicle ? String(data.assignedVehicle) : undefined,
    podRecipient: data.podRecipient ? String(data.podRecipient) : undefined,
    podCode: data.podCode ? String(data.podCode) : undefined,
    podDeliveredAt: data.podDeliveredAt ? tsToIso(data.podDeliveredAt) : undefined,
    podConditionNotes: data.podConditionNotes ? String(data.podConditionNotes) : undefined,
  };
}

function mapVehicleDoc(data: Record<string, unknown>): TransportVehicle {
  return {
    id: String(data.id || ''),
    registration: String(data.registration || ''),
    model: String(data.model || ''),
    capacityHead: Number(data.capacityHead ?? 1),
    suitableFor: String(data.suitableFor || ''),
    driverName: String(data.driverName || ''),
    driverPhone: String(data.driverPhone || ''),
    status: (data.status as TransportVehicle['status']) || 'Available',
  };
}

function mapNotificationDoc(data: Record<string, unknown>): AppNotification {
  return {
    id: String(data.id || ''),
    recipientRole: (data.recipientRole as AppNotification['recipientRole']) || 'all',
    title: String(data.title || ''),
    body: String(data.body || ''),
    category: (data.category as AppNotification['category']) || 'transaction',
    timestamp: tsToIso(data.createdAt),
    read: Boolean(data.read),
    linkView: data.linkView ? String(data.linkView) : undefined,
  };
}

function mapReviewDoc(data: Record<string, unknown>): SellerReview {
  return {
    id: String(data.id || ''),
    sellerId: String(data.sellerId || ''),
    sellerName: String(data.sellerName || ''),
    buyerId: String(data.buyerId || ''),
    buyerName: String(data.buyerName || ''),
    transactionRef: String(data.transactionRef || ''),
    rating: Number(data.rating ?? 5),
    comment: String(data.comment || ''),
    createdAt: tsToIso(data.createdAt),
  };
}

function mapDisputeDoc(data: Record<string, unknown>): DisputeCase {
  return {
    id: String(data.id || ''),
    reference: String(data.reference || ''),
    transactionId: String(data.transactionId || ''),
    transactionRef: String(data.transactionRef || ''),
    openedBy: String(data.openedBy || ''),
    against: String(data.against || ''),
    reason: String(data.reason || ''),
    description: String(data.description || ''),
    status: (data.status as DisputeCase['status']) || 'Open',
    resolution: data.resolution ? String(data.resolution) : undefined,
    createdAt: tsToIso(data.createdAt),
  };
}

function mapAuditLogDoc(data: Record<string, unknown>): AuditLogEntry {
  return {
    id: String(data.id || ''),
    actor: String(data.actor || ''),
    role: (data.role as UserRole) || 'admin',
    action: String(data.action || ''),
    target: String(data.target || ''),
    timestamp: tsToIso(data.createdAt),
  };
}

function mapAuctionCenterDoc(data: Record<string, unknown>): AuctionCenter {
  return {
    id: String(data.id || ''),
    code: String(data.code || ''),
    name: String(data.name || ''),
    country: String(data.country || 'Zimbabwe'),
    province: String(data.province || ''),
    district: String(data.district || ''),
    address: String(data.address || ''),
    penCapacityHead: Number(data.penCapacityHead ?? 500),
    weighbridgeCertified: Boolean(data.weighbridgeCertified),
    vetAuthority: String(data.vetAuthority || ''),
    ringManager: String(data.ringManager || ''),
    nextSaleDate: tsToIso(data.nextSaleDate),
    status: (data.status as AuctionCenter['status']) || 'Active',
    facilities: Array.isArray(data.facilities) ? (data.facilities as string[]) : [],
    image: String(data.image || ''),
  };
}

function mapAuctionEventDoc(data: Record<string, unknown>): AuctionEvent {
  return {
    id: String(data.id || ''),
    reference: String(data.reference || ''),
    title: String(data.title || ''),
    centerId: String(data.centerId || ''),
    centerName: String(data.centerName || ''),
    country: String(data.country || 'Zimbabwe'),
    province: String(data.province || ''),
    district: String(data.district || ''),
    auctioneerName: String(data.auctioneerName || ''),
    mode: (data.mode as AuctionEvent['mode']) || 'Hybrid (Physical + Online)',
    status: (data.status as AuctionEvent['status']) || 'Upcoming',
    startsAt: tsToIso(data.startsAt),
    endsAt: tsToIso(data.endsAt),
    totalLots: Number(data.totalLots ?? 0),
    registeredBidders: Number(data.registeredBidders ?? 0),
    catalogNotes: String(data.catalogNotes || ''),
    coverImage: String(data.coverImage || ''),
  };
}

function mapAuctionLotDoc(data: Record<string, unknown>): AuctionLot {
  return {
    id: String(data.id || ''),
    auctionId: String(data.auctionId || ''),
    lotNumber: String(data.lotNumber || 'LOT-01'),
    title: String(data.title || ''),
    category: data.category as AuctionLot['category'],
    breed: String(data.breed || ''),
    quantity: Number(data.quantity ?? 1),
    avgWeightKg: Number(data.avgWeightKg ?? 300),
    ageLabel: String(data.ageLabel || ''),
    gender: data.gender as AuctionLot['gender'],
    reservePriceUsd: Number(data.reservePriceUsd ?? 500),
    openingBidUsd: Number(data.openingBidUsd ?? 400),
    currentBidUsd: Number(data.currentBidUsd ?? 400),
    bidIncrementUsd: Number(data.bidIncrementUsd ?? 50),
    bidCount: Number(data.bidCount ?? 0),
    highestBidderId: data.highestBidderId ? String(data.highestBidderId) : undefined,
    highestBidderName: data.highestBidderName ? String(data.highestBidderName) : undefined,
    highestBidderPaddle: data.highestBidderPaddle ? String(data.highestBidderPaddle) : undefined,
    highestBidChannel: data.highestBidChannel
      ? (data.highestBidChannel as 'Online' | 'Floor')
      : undefined,
    status: (data.status as AuctionLot['status']) || 'Queued',
    vetCertRef: String(data.vetCertRef || ''),
    farmOrigin: String(data.farmOrigin || ''),
    country: String(data.country || 'Zimbabwe'),
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    notes: String(data.notes || ''),
  };
}

function mapAuctionBidDoc(data: Record<string, unknown>): AuctionBid {
  return {
    id: String(data.id || ''),
    lotId: String(data.lotId || ''),
    auctionId: String(data.auctionId || ''),
    bidderId: String(data.bidderId || ''),
    bidderName: String(data.bidderName || ''),
    paddleNumber: String(data.paddleNumber || ''),
    channel: (data.channel as 'Online' | 'Floor') || 'Online',
    amountUsd: Number(data.amountUsd ?? 0),
    maxProxyUsd: typeof data.maxProxyUsd === 'number' ? data.maxProxyUsd : undefined,
    timestamp: tsToIso(data.createdAt),
  };
}

function mapProductDoc(data: Record<string, unknown>): AgriProduct {
  return {
    id: String(data.id || ''),
    sku: String(data.sku || ''),
    name: String(data.name || ''),
    category: data.category as AgriProduct['category'],
    brand: String(data.brand || ''),
    priceUsd: Number(data.priceUsd ?? 10),
    unitLabel: String(data.unitLabel || ''),
    stockQty: Number(data.stockQty ?? 0),
    vetApproved: Boolean(data.vetApproved),
    subscriptionEligible: Boolean(data.subscriptionEligible),
    subscriptionDiscountPct:
      typeof data.subscriptionDiscountPct === 'number' ? data.subscriptionDiscountPct : undefined,
    countryAvailability: String(data.countryAvailability || ''),
    description: String(data.description || ''),
    image: String(data.image || ''),
  };
}

function mapProductOrderDoc(data: Record<string, unknown>): ProductOrder {
  return {
    id: String(data.id || ''),
    reference: String(data.reference || ''),
    buyerId: String(data.buyerId || ''),
    buyerName: String(data.buyerName || ''),
    country: String(data.country || 'Zimbabwe'),
    deliveryAddress: String(data.deliveryAddress || ''),
    items: Array.isArray(data.items) ? (data.items as ProductOrder['items']) : [],
    totalUsd: Number(data.totalUsd ?? 0),
    paymentMode: 'Simulated Demo Checkout (No Live Funds Charged)',
    status: (data.status as ProductOrder['status']) || 'Confirmed',
    createdAt: tsToIso(data.createdAt),
  };
}

function mapSubscriptionDoc(data: Record<string, unknown>): UserSubscription {
  return {
    id: String(data.id || ''),
    userId: String(data.userId || ''),
    userName: String(data.userName || ''),
    planId: String(data.planId || ''),
    planName: String(data.planName || ''),
    tier: (data.tier as UserSubscription['tier']) || 'buyer_pro',
    billingCycle: (data.billingCycle as 'monthly' | 'annual') || 'monthly',
    amountUsd: Number(data.amountUsd ?? 39),
    status: (data.status as UserSubscription['status']) || 'active',
    startedAt: tsToIso(data.startedAt),
    renewsAt: tsToIso(data.renewsAt),
    paymentMode: 'Simulated Demo Billing (No Live Card Charged)',
  };
}

// ============================================================================
// User Account Lookup & Provisioning
// ============================================================================

export async function fetchUserProfile(uid: string): Promise<UserProfileRecord | null> {
  const safeUid = sanitizeId(uid, 'usr');
  const path = `users/${safeUid}`;
  try {
    const snap = await getDoc(doc(db, 'users', safeUid));
    if (!snap.exists()) return null;
    return mapUserDoc(snap.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createOrSyncUserProfile(
  fbUser: FirebaseUser,
  input: {
    name: string;
    phone: string;
    role: UserRole;
    organization?: string;
    country: string;
    province: string;
    district: string;
    meta?: Record<string, string>;
  }
): Promise<UserProfileRecord> {
  const uid = sanitizeId(fbUser.uid, 'usr');
  const isBootAdmin = isBootstrapAdminEmail(fbUser.email) && fbUser.emailVerified;
  const effectiveRole: UserRole = isBootAdmin
    ? input.role
    : input.role === 'admin'
    ? 'buyer'
    : input.role;
  const verified = isBootAdmin ? true : effectiveRole === 'buyer';
  const joinedAt = new Date().toISOString();

  const userPayload = stripUndefined({
    id: uid,
    uid,
    name: clampStr(input.name || fbUser.displayName || 'MARIKETI User', 120, 'MARIKETI User'),
    email: clampStr(fbUser.email || '', 160),
    phone: clampStr(input.phone || '', 40),
    role: effectiveRole,
    organization: input.organization ? clampStr(input.organization, 160) : undefined,
    country: clampStr(input.country || 'Zimbabwe', 80, 'Zimbabwe'),
    province: clampStr(input.province || '', 80),
    district: clampStr(input.district || '', 80),
    verified,
    status: 'active' as const,
    rating: 5.0,
    reviewCount: 0,
    joinedAt,
    savedListingIds: [] as string[],
    recentlyViewedIds: [] as string[],
    compareListingIds: [] as string[],
    meta: input.meta,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const publicPayload = stripUndefined({
    id: uid,
    uid,
    name: userPayload.name,
    role: effectiveRole,
    organization: userPayload.organization,
    country: userPayload.country,
    province: userPayload.province,
    district: userPayload.district,
    verified,
    status: 'active' as const,
    rating: 5.0,
    reviewCount: 0,
    joinedAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid), userPayload);
    batch.set(doc(db, 'publicProfiles', uid), publicPayload);
    if (isBootAdmin) {
      batch.set(doc(db, 'admins', uid), {
        uid,
        email: clampStr(fbUser.email || BOOTSTRAP_ADMIN_EMAIL, 160),
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }

  return {
    account: {
      id: uid,
      name: userPayload.name,
      email: userPayload.email,
      phone: userPayload.phone,
      role: effectiveRole,
      organization: userPayload.organization,
      country: userPayload.country,
      province: userPayload.province,
      district: userPayload.district,
      verified,
      status: 'active',
      rating: 5.0,
      reviewCount: 0,
      joinedAt,
      meta: input.meta,
    },
    preferences: {
      savedListingIds: [],
      recentlyViewedIds: [],
      compareListingIds: [],
    },
  };
}

// ============================================================================
// Admin Seeding for Pan-African Starter Dataset (Idempotent, Admin-Only)
// ============================================================================

export async function seedAuctionsAndStoreIfEmpty(
  adminUser: FirebaseUser,
  force = false
): Promise<boolean> {
  if (!isBootstrapAdminEmail(adminUser.email) || !adminUser.emailVerified) {
    return false;
  }

  try {
    const [existingAuctions, existingProducts] = await Promise.all([
      force ? Promise.resolve({ empty: true }) : getDocs(collection(db, 'auctions')),
      force ? Promise.resolve({ empty: true }) : getDocs(collection(db, 'products')),
    ]);

    if (!existingAuctions.empty && !existingProducts.empty) {
      return false;
    }

    const batch = writeBatch(db);

    if (force || existingAuctions.empty) {
      for (const c of SEED_AUCTION_CENTERS) {
        const id = sanitizeId(c.id, 'ctr');
        batch.set(doc(db, 'auctionCenters', id), {
          id,
          code: sanitizeRef(c.code, 'MRK'),
          name: clampStr(c.name, 160),
          country: clampStr(c.country, 80),
          province: clampStr(c.province, 80),
          district: clampStr(c.district, 80),
          address: clampStr(c.address, 220),
          penCapacityHead: clampNum(c.penCapacityHead, 10, 50000, 500),
          weighbridgeCertified: Boolean(c.weighbridgeCertified),
          vetAuthority: clampStr(c.vetAuthority, 140),
          ringManager: clampStr(c.ringManager, 120),
          nextSaleDate: clampStr(c.nextSaleDate, 64),
          status: c.status,
          facilities: (c.facilities || []).slice(0, 20).map((f) => clampStr(f, 120)),
          image: clampStr(c.image, 1000),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const a of SEED_AUCTIONS) {
        const id = sanitizeId(a.id, 'auc');
        batch.set(doc(db, 'auctions', id), {
          id,
          reference: sanitizeRef(a.reference, 'AUC'),
          title: clampStr(a.title, 180),
          centerId: sanitizeId(a.centerId, 'ctr'),
          centerName: clampStr(a.centerName, 160),
          country: clampStr(a.country, 80),
          province: clampStr(a.province, 80),
          district: clampStr(a.district, 80),
          auctioneerName: clampStr(a.auctioneerName, 140),
          mode: a.mode,
          status: a.status,
          startsAt: clampStr(a.startsAt, 64),
          endsAt: clampStr(a.endsAt, 64),
          totalLots: clampNum(a.totalLots, 0, 5000, 0),
          registeredBidders: clampNum(a.registeredBidders, 0, 100000, 0),
          catalogNotes: clampStr(a.catalogNotes, 1200),
          coverImage: clampStr(a.coverImage, 1000),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const lot of SEED_AUCTION_LOTS) {
        const id = sanitizeId(lot.id, 'lot');
        batch.set(
          doc(db, 'auctionLots', id),
          stripUndefined({
            id,
            auctionId: sanitizeId(lot.auctionId, 'auc'),
            lotNumber: clampStr(lot.lotNumber, 32),
            title: clampStr(lot.title, 180),
            category: lot.category,
            breed: clampStr(lot.breed, 100),
            quantity: clampNum(lot.quantity, 1, 100000, 1),
            avgWeightKg: clampNum(lot.avgWeightKg, 1, 5000, 300),
            ageLabel: clampStr(lot.ageLabel, 60),
            gender: lot.gender,
            reservePriceUsd: clampNum(lot.reservePriceUsd, 1, 100000000, 500),
            openingBidUsd: clampNum(lot.openingBidUsd, 1, 100000000, 400),
            currentBidUsd: clampNum(lot.currentBidUsd, 1, 100000000, 400),
            bidIncrementUsd: clampNum(lot.bidIncrementUsd, 5, 100000, 50),
            bidCount: clampNum(lot.bidCount, 0, 100000, 0),
            highestBidderId: lot.highestBidderId ? sanitizeId(lot.highestBidderId, 'usr') : undefined,
            highestBidderName: lot.highestBidderName ? clampStr(lot.highestBidderName, 120) : undefined,
            highestBidderPaddle: lot.highestBidderPaddle ? clampStr(lot.highestBidderPaddle, 32) : undefined,
            highestBidChannel: lot.highestBidChannel,
            status: lot.status,
            vetCertRef: clampStr(lot.vetCertRef, 60),
            farmOrigin: clampStr(lot.farmOrigin, 160),
            country: clampStr(lot.country, 80),
            images: (lot.images || []).slice(0, 10).map((img) => clampStr(img, 1000)),
            notes: clampStr(lot.notes, 1200),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
      }
    }

    if (force || existingProducts.empty) {
      for (const p of SEED_PRODUCTS) {
        const id = sanitizeId(p.id, 'prd');
        batch.set(
          doc(db, 'products', id),
          stripUndefined({
            id,
            sku: sanitizeRef(p.sku, 'MRK'),
            name: clampStr(p.name, 160),
            category: p.category,
            brand: clampStr(p.brand, 100),
            priceUsd: clampNum(p.priceUsd, 1, 1000000, 10),
            unitLabel: clampStr(p.unitLabel, 60),
            stockQty: clampNum(p.stockQty, 0, 1000000, 10),
            vetApproved: Boolean(p.vetApproved),
            subscriptionEligible: Boolean(p.subscriptionEligible),
            subscriptionDiscountPct:
              typeof p.subscriptionDiscountPct === 'number'
                ? clampNum(p.subscriptionDiscountPct, 0, 50, 10)
                : undefined,
            countryAvailability: clampStr(p.countryAvailability, 120),
            description: clampStr(p.description, 1200),
            image: clampStr(p.image, 1000),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
      }
    }

    await batch.commit();

    // Seed initial floor & online bids after parent auctionLots exist (Master Gate!)
    if (force || existingAuctions.empty) {
      const bidBatch = writeBatch(db);
      for (const b of SEED_AUCTION_BIDS) {
        const lotId = sanitizeId(b.lotId, 'lot');
        const bidId = sanitizeId(b.id, 'bid');
        bidBatch.set(doc(db, 'auctionLots', lotId, 'bids', bidId), {
          id: bidId,
          lotId,
          auctionId: sanitizeId(b.auctionId, 'auc'),
          bidderId: sanitizeId(b.bidderId, 'usr'),
          bidderName: clampStr(b.bidderName, 120),
          paddleNumber: clampStr(b.paddleNumber, 32),
          channel: b.channel,
          amountUsd: clampNum(b.amountUsd, 1, 100000000, 100),
          createdAt: serverTimestamp(),
        });
      }
      await bidBatch.commit();
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedAuctionsAndStore');
  }
}

export async function seedMarketplaceIfEmpty(adminUser: FirebaseUser, force = false): Promise<boolean> {
  if (!isBootstrapAdminEmail(adminUser.email) || !adminUser.emailVerified) {
    return false;
  }

  try {
    // Independently ensure auctions & agri-vet store collections are populated
    await seedAuctionsAndStoreIfEmpty(adminUser, force);

    if (!force) {
      const existingListings = await getDocs(collection(db, 'listings'));
      if (!existingListings.empty) {
        return false;
      }
    }

    const batch = writeBatch(db);

    // 1. Seed Users & Public Profiles
    for (const u of SEED_USERS) {
      const uid = sanitizeId(u.id, 'usr');
      batch.set(
        doc(db, 'users', uid),
        stripUndefined({
          id: uid,
          uid,
          name: clampStr(u.name, 120),
          email: clampStr(u.email, 160),
          phone: clampStr(u.phone, 40),
          role: u.role,
          organization: u.organization ? clampStr(u.organization, 160) : undefined,
          country: clampStr(u.country, 80),
          province: clampStr(u.province, 80),
          district: clampStr(u.district, 80),
          verified: u.verified,
          status: u.status,
          rating: clampNum(u.rating, 0, 5, 4.8),
          reviewCount: clampNum(u.reviewCount, 0, 100000, 0),
          joinedAt: clampStr(u.joinedAt, 64),
          savedListingIds: ['lst-1', 'lst-10'],
          recentlyViewedIds: ['lst-1', 'lst-10'],
          compareListingIds: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
      batch.set(
        doc(db, 'publicProfiles', uid),
        stripUndefined({
          id: uid,
          uid,
          name: clampStr(u.name, 120),
          role: u.role,
          organization: u.organization ? clampStr(u.organization, 160) : undefined,
          country: clampStr(u.country, 80),
          province: clampStr(u.province, 80),
          district: clampStr(u.district, 80),
          verified: u.verified,
          status: u.status,
          rating: clampNum(u.rating, 0, 5, 4.8),
          reviewCount: clampNum(u.reviewCount, 0, 100000, 0),
          joinedAt: clampStr(u.joinedAt, 64),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    // 2. Listings
    for (const l of SEED_LISTINGS) {
      const id = sanitizeId(l.id, 'lst');
      batch.set(
        doc(db, 'listings', id),
        stripUndefined({
          id,
          reference: sanitizeRef(l.reference, 'MRK'),
          title: clampStr(l.title, 160),
          category: l.category,
          breed: clampStr(l.breed, 100),
          ageMonths: clampNum(l.ageMonths, 0, 360, 12),
          ageLabel: clampStr(l.ageLabel, 60),
          gender: l.gender,
          weightKg: clampNum(l.weightKg, 1, 5000, 300),
          quantity: clampNum(l.quantity, 1, 100000, 1),
          priceUsd: clampNum(l.priceUsd, 1, 10000000, 100),
          priceUnit: l.priceUnit,
          country: clampStr(l.country, 80),
          province: clampStr(l.province, 80),
          district: clampStr(l.district, 80),
          farmName: clampStr(l.farmName, 140),
          sellerId: sanitizeId(l.sellerId, 'usr'),
          sellerName: clampStr(l.sellerName, 120),
          sellerRating: clampNum(l.sellerRating, 0, 5, 4.8),
          sellerVerified: l.sellerVerified,
          verificationStatus: l.verificationStatus,
          verificationReport: l.verificationReport,
          status: l.status,
          listedAt: clampStr(l.listedAt, 64),
          images: (l.images || []).slice(0, 10).map((img) => clampStr(img, 1000)),
          description: clampStr(l.description, 2000),
          vaccinationSummary: clampStr(l.vaccinationSummary, 600),
          feedingRegime: clampStr(l.feedingRegime, 300),
          featured: Boolean(l.featured),
          views: clampNum(l.views, 0, 10000000, 0),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    // Commit first batch (users + publicProfiles + listings)
    await batch.commit();

    const batch2 = writeBatch(db);

    // 3. Offers
    for (const o of SEED_OFFERS) {
      const id = sanitizeId(o.id, 'off');
      batch2.set(
        doc(db, 'offers', id),
        stripUndefined({
          id,
          reference: sanitizeRef(o.reference, 'OFR'),
          listingId: sanitizeId(o.listingId, 'lst'),
          listingTitle: clampStr(o.listingTitle, 160),
          listingRef: clampStr(o.listingRef, 40),
          buyerId: sanitizeId(o.buyerId, 'usr'),
          buyerName: clampStr(o.buyerName, 120),
          sellerId: sanitizeId(o.sellerId, 'usr'),
          sellerName: clampStr(o.sellerName, 120),
          currentAmountUsd: clampNum(o.currentAmountUsd, 1, 100000000, 100),
          quantity: clampNum(o.quantity, 1, 100000, 1),
          status: o.status,
          lastActorRole: o.lastActorRole,
          expiresAt: clampStr(o.expiresAt, 64),
          history: (o.history || []).slice(0, 50),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    // 4. Transactions
    for (const t of SEED_TRANSACTIONS) {
      const id = sanitizeId(t.id, 'txn');
      batch2.set(
        doc(db, 'transactions', id),
        stripUndefined({
          id,
          reference: sanitizeRef(t.reference, 'TXN'),
          offerId: sanitizeId(t.offerId, 'off'),
          listingId: sanitizeId(t.listingId, 'lst'),
          listingTitle: clampStr(t.listingTitle, 160),
          listingCategory: t.listingCategory,
          quantity: clampNum(t.quantity, 1, 100000, 1),
          buyerId: sanitizeId(t.buyerId, 'usr'),
          buyerName: clampStr(t.buyerName, 120),
          sellerId: sanitizeId(t.sellerId, 'usr'),
          sellerName: clampStr(t.sellerName, 120),
          agreedAmountUsd: clampNum(t.agreedAmountUsd, 1, 100000000, 100),
          state: t.state,
          paymentMode: clampStr(t.paymentMode, 120),
          paymentStatus: t.paymentStatus,
          collectionCentreName: clampStr(t.collectionCentreName, 180),
          pickupLocation: clampStr(t.pickupLocation, 200),
          deliveryLocation: clampStr(t.deliveryLocation, 200),
          handoverCode: clampStr(t.handoverCode, 32),
          transportJobId: t.transportJobId ? sanitizeId(t.transportJobId, 'trp') : undefined,
          documents: (t.documents || []).slice(0, 20),
          timeline: (t.timeline || []).slice(0, 50),
          hasReview: Boolean(t.hasReview),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    // 5. Field Tasks
    const listingSellerMap = new Map(SEED_LISTINGS.map((l) => [l.id, l.sellerId]));
    for (const ft of SEED_FIELD_TASKS) {
      const id = sanitizeId(ft.id, 'tsk');
      batch2.set(
        doc(db, 'fieldTasks', id),
        stripUndefined({
          id,
          reference: sanitizeRef(ft.reference, 'INS'),
          listingId: sanitizeId(ft.listingId, 'lst'),
          listingTitle: clampStr(ft.listingTitle, 160),
          sellerId: sanitizeId(listingSellerMap.get(ft.listingId) || 'usr-seller-1', 'usr'),
          sellerName: clampStr(ft.sellerName, 120),
          sellerPhone: clampStr(ft.sellerPhone, 40),
          farmName: clampStr(ft.farmName, 140),
          country: clampStr(ft.country, 80),
          province: clampStr(ft.province, 80),
          district: clampStr(ft.district, 80),
          assignedAgentId: sanitizeId(ft.assignedAgentId, 'usr'),
          assignedAgentName: clampStr(ft.assignedAgentName, 120),
          scheduledDate: clampStr(ft.scheduledDate, 32),
          priority: ft.priority,
          status: ft.status,
          expectedCategory: ft.expectedCategory,
          expectedBreed: clampStr(ft.expectedBreed, 100),
          expectedQuantity: clampNum(ft.expectedQuantity, 1, 100000, 1),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    // 6. Centre Records
    const txnByRef = new Map(SEED_TRANSACTIONS.map((t) => [t.reference, t]));
    for (const cr of SEED_CENTRE_RECORDS) {
      const id = sanitizeId(cr.id, 'ccr');
      const relTxn = txnByRef.get(cr.transactionRef);
      batch2.set(
        doc(db, 'centreRecords', id),
        stripUndefined({
          id,
          reference: sanitizeRef(cr.reference, 'MCC'),
          centreName: clampStr(cr.centreName, 180),
          operatorId: 'usr-centre-1',
          buyerId: relTxn ? sanitizeId(relTxn.buyerId, 'usr') : undefined,
          sellerId: relTxn ? sanitizeId(relTxn.sellerId, 'usr') : undefined,
          country: cr.country ? clampStr(cr.country, 80) : undefined,
          transactionRef: clampStr(cr.transactionRef, 40),
          listingTitle: clampStr(cr.listingTitle, 160),
          category: cr.category,
          quantity: clampNum(cr.quantity, 1, 100000, 1),
          sellerName: clampStr(cr.sellerName, 120),
          buyerName: clampStr(cr.buyerName, 120),
          penNumber: clampStr(cr.penNumber, 60),
          checkedWeightAvgKg: clampNum(cr.checkedWeightAvgKg, 0, 5000, 0),
          status: cr.status,
          expectedAt: clampStr(cr.expectedAt, 64),
          checkedInAt: cr.checkedInAt ? clampStr(cr.checkedInAt, 64) : undefined,
          releasedAt: cr.releasedAt ? clampStr(cr.releasedAt, 64) : undefined,
          handoverPin: clampStr(cr.handoverPin, 32),
          notes: clampStr(cr.notes, 1000),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    // 7. Transport Jobs
    const txnById = new Map(SEED_TRANSACTIONS.map((t) => [t.id, t]));
    for (const tj of SEED_TRANSPORT_JOBS) {
      const id = sanitizeId(tj.id, 'trp');
      const relTxn = txnById.get(tj.transactionId);
      batch2.set(
        doc(db, 'transportJobs', id),
        stripUndefined({
          id,
          reference: sanitizeRef(tj.reference, 'TRP'),
          transactionId: sanitizeId(tj.transactionId, 'txn'),
          transactionRef: clampStr(tj.transactionRef, 40),
          listingTitle: clampStr(tj.listingTitle, 160),
          category: tj.category,
          quantity: clampNum(tj.quantity, 1, 100000, 1),
          buyerId: relTxn ? sanitizeId(relTxn.buyerId, 'usr') : undefined,
          sellerId: relTxn ? sanitizeId(relTxn.sellerId, 'usr') : undefined,
          pickupLocation: clampStr(tj.pickupLocation, 200),
          destination: clampStr(tj.destination, 200),
          country: tj.country ? clampStr(tj.country, 80) : undefined,
          distanceKm: clampNum(tj.distanceKm, 0, 20000, 0),
          requirements: clampStr(tj.requirements, 500),
          scheduledDate: clampStr(tj.scheduledDate, 32),
          feeUsd: clampNum(tj.feeUsd, 0, 1000000, 0),
          status: tj.status,
          assignedPartnerId: tj.assignedPartnerId ? sanitizeId(tj.assignedPartnerId, 'usr') : undefined,
          assignedDriver: tj.assignedDriver ? clampStr(tj.assignedDriver, 120) : undefined,
          assignedVehicle: tj.assignedVehicle ? clampStr(tj.assignedVehicle, 80) : undefined,
          podRecipient: tj.podRecipient ? clampStr(tj.podRecipient, 120) : undefined,
          podCode: tj.podCode ? clampStr(tj.podCode, 40) : undefined,
          podDeliveredAt: tj.podDeliveredAt ? clampStr(tj.podDeliveredAt, 64) : undefined,
          podConditionNotes: tj.podConditionNotes ? clampStr(tj.podConditionNotes, 1000) : undefined,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    // 8. Vehicles
    for (const v of SEED_VEHICLES) {
      const id = sanitizeId(v.id, 'veh');
      batch2.set(
        doc(db, 'vehicles', id),
        stripUndefined({
          id,
          partnerId: 'usr-transport-1',
          registration: clampStr(v.registration, 40),
          model: clampStr(v.model, 120),
          capacityHead: clampNum(v.capacityHead, 1, 2000, 10),
          suitableFor: clampStr(v.suitableFor, 160),
          driverName: clampStr(v.driverName, 120),
          driverPhone: clampStr(v.driverPhone, 40),
          status: v.status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    // 9. Conversations + Messages subcollection
    for (const c of SEED_CONVERSATIONS) {
      const id = sanitizeId(c.id, 'cnv');
      const participantIds = c.participants.map((p) => sanitizeId(p.id, 'usr')).slice(0, 4);
      batch2.set(doc(db, 'conversations', id), {
        id,
        subject: clampStr(c.subject, 180),
        contextType: c.contextType,
        contextRef: clampStr(c.contextRef, 60),
        participantIds,
        participants: c.participants.slice(0, 4),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      for (const m of c.messages) {
        const msgId = sanitizeId(m.id, 'msg');
        batch2.set(
          doc(db, 'conversations', id, 'messages', msgId),
          stripUndefined({
            id: msgId,
            senderId: sanitizeId(m.senderId, 'usr'),
            senderName: clampStr(m.senderName, 120),
            senderRole: m.senderRole,
            participantIds,
            text: clampStr(m.text, 2000),
            attachmentName: m.attachmentName ? clampStr(m.attachmentName, 180) : undefined,
            read: Boolean(m.read),
            createdAt: serverTimestamp(),
          })
        );
      }
    }

    // 10. Notifications
    for (const n of SEED_NOTIFICATIONS) {
      const id = sanitizeId(n.id, 'ntf');
      batch2.set(
        doc(db, 'notifications', id),
        stripUndefined({
          id,
          recipientRole: n.recipientRole,
          title: clampStr(n.title, 160),
          body: clampStr(n.body, 600),
          category: n.category,
          read: Boolean(n.read),
          linkView: n.linkView ? clampStr(n.linkView, 80) : undefined,
          createdAt: serverTimestamp(),
        })
      );
    }

    // 11. Reviews
    for (const r of SEED_REVIEWS) {
      const id = sanitizeId(r.id, 'rev');
      const relTxn = txnByRef.get(r.transactionRef) || SEED_TRANSACTIONS[0];
      batch2.set(doc(db, 'reviews', id), {
        id,
        sellerId: sanitizeId(r.sellerId, 'usr'),
        sellerName: clampStr(r.sellerName, 120),
        buyerId: sanitizeId(r.buyerId, 'usr'),
        buyerName: clampStr(r.buyerName, 120),
        transactionId: sanitizeId(relTxn?.id || 'txn-1', 'txn'),
        transactionRef: clampStr(r.transactionRef, 40),
        rating: clampNum(r.rating, 1, 5, 5),
        comment: clampStr(r.comment, 1200),
        createdAt: serverTimestamp(),
      });
    }

    // 12. Disputes
    for (const d of SEED_DISPUTES) {
      const id = sanitizeId(d.id, 'dsp');
      const relTxn = txnById.get(d.transactionId) || SEED_TRANSACTIONS[0];
      batch2.set(
        doc(db, 'disputes', id),
        stripUndefined({
          id,
          reference: sanitizeRef(d.reference, 'DSP'),
          transactionId: sanitizeId(d.transactionId, 'txn'),
          transactionRef: clampStr(d.transactionRef, 40),
          openedById: sanitizeId(relTxn?.buyerId || 'usr-buyer-1', 'usr'),
          openedBy: clampStr(d.openedBy, 140),
          buyerId: sanitizeId(relTxn?.buyerId || 'usr-buyer-1', 'usr'),
          sellerId: sanitizeId(relTxn?.sellerId || 'usr-seller-1', 'usr'),
          against: clampStr(d.against, 140),
          reason: clampStr(d.reason, 160),
          description: clampStr(d.description, 2000),
          status: d.status,
          resolution: d.resolution ? clampStr(d.resolution, 2000) : undefined,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    // 13. Audit Logs
    for (const a of SEED_AUDIT_LOGS) {
      const id = sanitizeId(a.id, 'aud');
      batch2.set(doc(db, 'auditLogs', id), {
        id,
        actorId: sanitizeId(adminUser.uid, 'usr'),
        actor: clampStr(a.actor, 120),
        role: a.role,
        action: clampStr(a.action, 200),
        target: clampStr(a.target, 160),
        createdAt: serverTimestamp(),
      });
    }

    await batch2.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedMarketplace');
  }
}

// ============================================================================
// Real-Time Subscriptions (Strictly Matched to Firestore Security Rules)
// ============================================================================

export function subscribePublicData(handlers: {
  onListings: (items: LivestockListing[]) => void;
  onReviews: (items: SellerReview[]) => void;
  onPublicProfiles: (items: UserAccount[]) => void;
  onAuctionCenters?: (items: AuctionCenter[]) => void;
  onAuctions?: (items: AuctionEvent[]) => void;
  onAuctionLots?: (items: AuctionLot[]) => void;
  onProducts?: (items: AgriProduct[]) => void;
}): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  const activeListingsQ = query(collection(db, 'listings'), where('status', '==', 'active'));
  unsubs.push(
    onSnapshot(
      activeListingsQ,
      (snap) => {
        const list = snap.docs.map((d) => mapListingDoc(d.data() as Record<string, unknown>));
        handlers.onListings(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'listings');
      }
    )
  );

  const reviewsQ = query(
    collection(db, 'reviews'),
    where('rating', '>=', 1),
    where('rating', '<=', 5)
  );
  unsubs.push(
    onSnapshot(
      reviewsQ,
      (snap) => {
        const list = snap.docs.map((d) => mapReviewDoc(d.data() as Record<string, unknown>));
        handlers.onReviews(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'reviews');
      }
    )
  );

  const profilesQ = query(collection(db, 'publicProfiles'), where('status', '==', 'active'));
  unsubs.push(
    onSnapshot(
      profilesQ,
      (snap) => {
        const list = snap.docs.map((d) => mapPublicProfile(d.data() as Record<string, unknown>));
        handlers.onPublicProfiles(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'publicProfiles');
      }
    )
  );

  if (handlers.onAuctionCenters) {
    const cb = handlers.onAuctionCenters;
    unsubs.push(
      onSnapshot(
        query(collection(db, 'auctionCenters'), where('status', 'in', ['Active', 'Upcoming Sale', 'Maintenance'])),
        (snap) => cb(snap.docs.map((d) => mapAuctionCenterDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'auctionCenters')
      )
    );
  }

  if (handlers.onAuctions) {
    const cb = handlers.onAuctions;
    unsubs.push(
      onSnapshot(
        query(collection(db, 'auctions'), where('status', 'in', ['Live Now', 'Upcoming', 'Completed'])),
        (snap) => cb(snap.docs.map((d) => mapAuctionEventDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'auctions')
      )
    );
  }

  if (handlers.onAuctionLots) {
    const cb = handlers.onAuctionLots;
    unsubs.push(
      onSnapshot(
        query(collection(db, 'auctionLots'), where('status', 'in', ['Live', 'Queued', 'Sold', 'Passed In'])),
        (snap) => cb(snap.docs.map((d) => mapAuctionLotDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'auctionLots')
      )
    );
  }

  if (handlers.onProducts) {
    const cb = handlers.onProducts;
    unsubs.push(
      onSnapshot(
        query(collection(db, 'products'), where('priceUsd', '>', 0)),
        (snap) => cb(snap.docs.map((d) => mapProductDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'products')
      )
    );
  }

  return () => {
    unsubs.forEach((u) => u());
  };
}

export function subscribeAuctionLotBids(
  lotId: string,
  onBids: (bids: AuctionBid[]) => void
): Unsubscribe {
  const safeId = sanitizeId(lotId, 'lot');
  const q = query(collection(db, 'auctionLots', safeId, 'bids'), where('amountUsd', '>', 0));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => mapAuctionBidDoc(d.data() as Record<string, unknown>))
        .sort((a, b) => b.amountUsd - a.amountUsd);
      onBids(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `auctionLots/${safeId}/bids`)
  );
}

export interface AuthSubscriptionsCallbacks {
  onUsers: (items: UserAccount[]) => void;
  onAllListings?: (items: LivestockListing[]) => void;
  onSellerListings?: (items: LivestockListing[]) => void;
  onOffers: (items: Offer[]) => void;
  onTransactions: (items: Transaction[]) => void;
  onFieldTasks: (items: FieldInspectionTask[]) => void;
  onCentreRecords: (items: CollectionCentreRecord[]) => void;
  onTransportJobs: (items: TransportJob[]) => void;
  onVehicles: (items: TransportVehicle[]) => void;
  onConversations: (items: Conversation[]) => void;
  onNotifications: (items: AppNotification[]) => void;
  onDisputes: (items: DisputeCase[]) => void;
  onAuditLogs: (items: AuditLogEntry[]) => void;
  onProductOrders?: (items: ProductOrder[]) => void;
  onSubscriptions?: (items: UserSubscription[]) => void;
}

export function subscribeAuthenticatedData(
  fbUser: FirebaseUser,
  callbacks: AuthSubscriptionsCallbacks
): Unsubscribe {
  const uid = sanitizeId(fbUser.uid, 'usr');
  const isBootAdmin = isBootstrapAdminEmail(fbUser.email) && fbUser.emailVerified;
  const unsubs: Unsubscribe[] = [];
  const msgUnsubs = new Map<string, Unsubscribe>();
  const convMap = new Map<string, Omit<Conversation, 'messages'>>();
  const msgMap = new Map<string, MessageItem[]>();

  const emitConversations = () => {
    const merged: Conversation[] = Array.from(convMap.values())
      .map((c) => ({
        ...c,
        messages: (msgMap.get(c.id) || []).sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    callbacks.onConversations(merged);
  };

  const syncMessageListeners = (convIds: string[]) => {
    const activeSet = new Set(convIds);
    for (const [cid, unsub] of msgUnsubs.entries()) {
      if (!activeSet.has(cid)) {
        unsub();
        msgUnsubs.delete(cid);
        msgMap.delete(cid);
      }
    }
    for (const cid of convIds) {
      if (msgUnsubs.has(cid)) continue;
      const msgQuery = isBootAdmin
        ? collection(db, 'conversations', cid, 'messages')
        : query(
            collection(db, 'conversations', cid, 'messages'),
            where('participantIds', 'array-contains', uid)
          );
      const unsub = onSnapshot(
        msgQuery,
        (snap) => {
          const items: MessageItem[] = snap.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: String(data.id || d.id),
              senderId: String(data.senderId || ''),
              senderName: String(data.senderName || ''),
              senderRole: (data.senderRole as UserRole) || 'buyer',
              text: String(data.text || ''),
              attachmentName: data.attachmentName ? String(data.attachmentName) : undefined,
              timestamp: tsToIso(data.createdAt),
              read: Boolean(data.read),
            };
          });
          msgMap.set(cid, items);
          emitConversations();
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, `conversations/${cid}/messages`);
        }
      );
      msgUnsubs.set(cid, unsub);
    }
  };

  if (isBootAdmin) {
    // Bootstrapped Admin can observe full operational collections cleanly
    unsubs.push(
      onSnapshot(
        collection(db, 'users'),
        (snap) => callbacks.onUsers(snap.docs.map((d) => mapUserDoc(d.data() as Record<string, unknown>).account)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'users')
      )
    );
    if (callbacks.onAllListings) {
      const onAll = callbacks.onAllListings;
      unsubs.push(
        onSnapshot(
          collection(db, 'listings'),
          (snap) => onAll(snap.docs.map((d) => mapListingDoc(d.data() as Record<string, unknown>))),
          (err) => handleFirestoreError(err, OperationType.LIST, 'listings')
        )
      );
    }
    unsubs.push(
      onSnapshot(
        collection(db, 'offers'),
        (snap) => callbacks.onOffers(snap.docs.map((d) => mapOfferDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'offers')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'transactions'),
        (snap) => callbacks.onTransactions(snap.docs.map((d) => mapTransactionDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'fieldTasks'),
        (snap) => callbacks.onFieldTasks(snap.docs.map((d) => mapFieldTaskDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'fieldTasks')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'centreRecords'),
        (snap) => callbacks.onCentreRecords(snap.docs.map((d) => mapCentreRecordDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'centreRecords')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'transportJobs'),
        (snap) => callbacks.onTransportJobs(snap.docs.map((d) => mapTransportJobDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'transportJobs')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'vehicles'),
        (snap) => callbacks.onVehicles(snap.docs.map((d) => mapVehicleDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'vehicles')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'conversations'),
        (snap) => {
          convMap.clear();
          const ids: string[] = [];
          snap.docs.forEach((d) => {
            const data = d.data() as Record<string, unknown>;
            const id = String(data.id || d.id);
            ids.push(id);
            convMap.set(id, {
              id,
              subject: String(data.subject || ''),
              contextType: (data.contextType as Conversation['contextType']) || 'Listing',
              contextRef: String(data.contextRef || ''),
              participants: Array.isArray(data.participants)
                ? (data.participants as Conversation['participants'])
                : [],
              updatedAt: tsToIso(data.updatedAt),
            });
          });
          syncMessageListeners(ids);
          emitConversations();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'conversations')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'notifications'),
        (snap) => callbacks.onNotifications(snap.docs.map((d) => mapNotificationDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'disputes'),
        (snap) => callbacks.onDisputes(snap.docs.map((d) => mapDisputeDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'disputes')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'auditLogs'),
        (snap) => callbacks.onAuditLogs(snap.docs.map((d) => mapAuditLogDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
      )
    );
    if (callbacks.onProductOrders) {
      const cb = callbacks.onProductOrders;
      unsubs.push(
        onSnapshot(
          collection(db, 'productOrders'),
          (snap) => cb(snap.docs.map((d) => mapProductOrderDoc(d.data() as Record<string, unknown>))),
          (err) => handleFirestoreError(err, OperationType.LIST, 'productOrders')
        )
      );
    }
    if (callbacks.onSubscriptions) {
      const cb = callbacks.onSubscriptions;
      unsubs.push(
        onSnapshot(
          collection(db, 'subscriptions'),
          (snap) => cb(snap.docs.map((d) => mapSubscriptionDoc(d.data() as Record<string, unknown>))),
          (err) => handleFirestoreError(err, OperationType.LIST, 'subscriptions')
        )
      );
    }
  } else {
    // Standard verified user: strictly query-scoped listeners matching firestore.rules allow list
    if (callbacks.onSellerListings) {
      const onSeller = callbacks.onSellerListings;
      unsubs.push(
        onSnapshot(
          query(collection(db, 'listings'), where('sellerId', '==', uid)),
          (snap) => onSeller(snap.docs.map((d) => mapListingDoc(d.data() as Record<string, unknown>))),
          (err) => handleFirestoreError(err, OperationType.LIST, 'listings')
        )
      );
    }

    // Offers (buyer + seller merged)
    const offerBuckets = { buyer: new Map<string, Offer>(), seller: new Map<string, Offer>() };
    const emitOffers = () => {
      const combined = new Map([...offerBuckets.buyer, ...offerBuckets.seller]);
      callbacks.onOffers(Array.from(combined.values()));
    };
    unsubs.push(
      onSnapshot(
        query(collection(db, 'offers'), where('buyerId', '==', uid)),
        (snap) => {
          offerBuckets.buyer.clear();
          snap.docs.forEach((d) => {
            const item = mapOfferDoc(d.data() as Record<string, unknown>);
            offerBuckets.buyer.set(item.id, item);
          });
          emitOffers();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'offers')
      ),
      onSnapshot(
        query(collection(db, 'offers'), where('sellerId', '==', uid)),
        (snap) => {
          offerBuckets.seller.clear();
          snap.docs.forEach((d) => {
            const item = mapOfferDoc(d.data() as Record<string, unknown>);
            offerBuckets.seller.set(item.id, item);
          });
          emitOffers();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'offers')
      )
    );

    // Transactions (buyer + seller merged)
    const txnBuckets = { buyer: new Map<string, Transaction>(), seller: new Map<string, Transaction>() };
    const emitTxns = () => {
      const combined = new Map([...txnBuckets.buyer, ...txnBuckets.seller]);
      callbacks.onTransactions(Array.from(combined.values()));
    };
    unsubs.push(
      onSnapshot(
        query(collection(db, 'transactions'), where('buyerId', '==', uid)),
        (snap) => {
          txnBuckets.buyer.clear();
          snap.docs.forEach((d) => {
            const item = mapTransactionDoc(d.data() as Record<string, unknown>);
            txnBuckets.buyer.set(item.id, item);
          });
          emitTxns();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
      ),
      onSnapshot(
        query(collection(db, 'transactions'), where('sellerId', '==', uid)),
        (snap) => {
          txnBuckets.seller.clear();
          snap.docs.forEach((d) => {
            const item = mapTransactionDoc(d.data() as Record<string, unknown>);
            txnBuckets.seller.set(item.id, item);
          });
          emitTxns();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
      )
    );

    // Field Tasks (assigned agent + seller merged)
    const taskBuckets = { agent: new Map<string, FieldInspectionTask>(), seller: new Map<string, FieldInspectionTask>() };
    const emitTasks = () => {
      const combined = new Map([...taskBuckets.agent, ...taskBuckets.seller]);
      callbacks.onFieldTasks(Array.from(combined.values()));
    };
    unsubs.push(
      onSnapshot(
        query(collection(db, 'fieldTasks'), where('assignedAgentId', '==', uid)),
        (snap) => {
          taskBuckets.agent.clear();
          snap.docs.forEach((d) => {
            const item = mapFieldTaskDoc(d.data() as Record<string, unknown>);
            taskBuckets.agent.set(item.id, item);
          });
          emitTasks();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'fieldTasks')
      ),
      onSnapshot(
        query(collection(db, 'fieldTasks'), where('sellerId', '==', uid)),
        (snap) => {
          taskBuckets.seller.clear();
          snap.docs.forEach((d) => {
            const item = mapFieldTaskDoc(d.data() as Record<string, unknown>);
            taskBuckets.seller.set(item.id, item);
          });
          emitTasks();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'fieldTasks')
      )
    );

    // Collection Centre Records (operator + buyer + seller merged)
    const centreBuckets = {
      op: new Map<string, CollectionCentreRecord>(),
      buyer: new Map<string, CollectionCentreRecord>(),
      seller: new Map<string, CollectionCentreRecord>(),
    };
    const emitCentre = () => {
      const combined = new Map([...centreBuckets.op, ...centreBuckets.buyer, ...centreBuckets.seller]);
      callbacks.onCentreRecords(Array.from(combined.values()));
    };
    unsubs.push(
      onSnapshot(
        query(collection(db, 'centreRecords'), where('operatorId', '==', uid)),
        (snap) => {
          centreBuckets.op.clear();
          snap.docs.forEach((d) => {
            const item = mapCentreRecordDoc(d.data() as Record<string, unknown>);
            centreBuckets.op.set(item.id, item);
          });
          emitCentre();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'centreRecords')
      ),
      onSnapshot(
        query(collection(db, 'centreRecords'), where('buyerId', '==', uid)),
        (snap) => {
          centreBuckets.buyer.clear();
          snap.docs.forEach((d) => {
            const item = mapCentreRecordDoc(d.data() as Record<string, unknown>);
            centreBuckets.buyer.set(item.id, item);
          });
          emitCentre();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'centreRecords')
      ),
      onSnapshot(
        query(collection(db, 'centreRecords'), where('sellerId', '==', uid)),
        (snap) => {
          centreBuckets.seller.clear();
          snap.docs.forEach((d) => {
            const item = mapCentreRecordDoc(d.data() as Record<string, unknown>);
            centreBuckets.seller.set(item.id, item);
          });
          emitCentre();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'centreRecords')
      )
    );

    // Transport Jobs (Available + assigned partner + buyer + seller)
    const jobBuckets = {
      avail: new Map<string, TransportJob>(),
      partner: new Map<string, TransportJob>(),
      buyer: new Map<string, TransportJob>(),
      seller: new Map<string, TransportJob>(),
    };
    const emitJobs = () => {
      const combined = new Map([
        ...jobBuckets.avail,
        ...jobBuckets.partner,
        ...jobBuckets.buyer,
        ...jobBuckets.seller,
      ]);
      callbacks.onTransportJobs(Array.from(combined.values()));
    };
    unsubs.push(
      onSnapshot(
        query(collection(db, 'transportJobs'), where('status', '==', 'Available')),
        (snap) => {
          jobBuckets.avail.clear();
          snap.docs.forEach((d) => {
            const item = mapTransportJobDoc(d.data() as Record<string, unknown>);
            jobBuckets.avail.set(item.id, item);
          });
          emitJobs();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'transportJobs')
      ),
      onSnapshot(
        query(collection(db, 'transportJobs'), where('assignedPartnerId', '==', uid)),
        (snap) => {
          jobBuckets.partner.clear();
          snap.docs.forEach((d) => {
            const item = mapTransportJobDoc(d.data() as Record<string, unknown>);
            jobBuckets.partner.set(item.id, item);
          });
          emitJobs();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'transportJobs')
      ),
      onSnapshot(
        query(collection(db, 'transportJobs'), where('buyerId', '==', uid)),
        (snap) => {
          jobBuckets.buyer.clear();
          snap.docs.forEach((d) => {
            const item = mapTransportJobDoc(d.data() as Record<string, unknown>);
            jobBuckets.buyer.set(item.id, item);
          });
          emitJobs();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'transportJobs')
      ),
      onSnapshot(
        query(collection(db, 'transportJobs'), where('sellerId', '==', uid)),
        (snap) => {
          jobBuckets.seller.clear();
          snap.docs.forEach((d) => {
            const item = mapTransportJobDoc(d.data() as Record<string, unknown>);
            jobBuckets.seller.set(item.id, item);
          });
          emitJobs();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'transportJobs')
      )
    );

    // Vehicles (own partner fleet)
    unsubs.push(
      onSnapshot(
        query(collection(db, 'vehicles'), where('partnerId', '==', uid)),
        (snap) => callbacks.onVehicles(snap.docs.map((d) => mapVehicleDoc(d.data() as Record<string, unknown>))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'vehicles')
      )
    );

    // Conversations (participantIds array-contains uid)
    unsubs.push(
      onSnapshot(
        query(collection(db, 'conversations'), where('participantIds', 'array-contains', uid)),
        (snap) => {
          convMap.clear();
          const ids: string[] = [];
          snap.docs.forEach((d) => {
            const data = d.data() as Record<string, unknown>;
            const id = String(data.id || d.id);
            ids.push(id);
            convMap.set(id, {
              id,
              subject: String(data.subject || ''),
              contextType: (data.contextType as Conversation['contextType']) || 'Listing',
              contextRef: String(data.contextRef || ''),
              participants: Array.isArray(data.participants)
                ? (data.participants as Conversation['participants'])
                : [],
              updatedAt: tsToIso(data.updatedAt),
            });
          });
          syncMessageListeners(ids);
          emitConversations();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'conversations')
      )
    );

    // Notifications (user-targeted + role 'all')
    const notifBuckets = { user: new Map<string, AppNotification>(), all: new Map<string, AppNotification>() };
    const emitNotifs = () => {
      const combined = new Map([...notifBuckets.user, ...notifBuckets.all]);
      callbacks.onNotifications(
        Array.from(combined.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      );
    };
    unsubs.push(
      onSnapshot(
        query(collection(db, 'notifications'), where('recipientUserId', '==', uid)),
        (snap) => {
          notifBuckets.user.clear();
          snap.docs.forEach((d) => {
            const item = mapNotificationDoc(d.data() as Record<string, unknown>);
            notifBuckets.user.set(item.id, item);
          });
          emitNotifs();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      ),
      onSnapshot(
        query(collection(db, 'notifications'), where('recipientRole', '==', 'all')),
        (snap) => {
          notifBuckets.all.clear();
          snap.docs.forEach((d) => {
            const item = mapNotificationDoc(d.data() as Record<string, unknown>);
            notifBuckets.all.set(item.id, item);
          });
          emitNotifs();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );

    // Disputes (openedBy + buyer + seller)
    const dispBuckets = {
      open: new Map<string, DisputeCase>(),
      buyer: new Map<string, DisputeCase>(),
      seller: new Map<string, DisputeCase>(),
    };
    const emitDisputes = () => {
      const combined = new Map([...dispBuckets.open, ...dispBuckets.buyer, ...dispBuckets.seller]);
      callbacks.onDisputes(Array.from(combined.values()));
    };
    unsubs.push(
      onSnapshot(
        query(collection(db, 'disputes'), where('openedById', '==', uid)),
        (snap) => {
          dispBuckets.open.clear();
          snap.docs.forEach((d) => {
            const item = mapDisputeDoc(d.data() as Record<string, unknown>);
            dispBuckets.open.set(item.id, item);
          });
          emitDisputes();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'disputes')
      ),
      onSnapshot(
        query(collection(db, 'disputes'), where('buyerId', '==', uid)),
        (snap) => {
          dispBuckets.buyer.clear();
          snap.docs.forEach((d) => {
            const item = mapDisputeDoc(d.data() as Record<string, unknown>);
            dispBuckets.buyer.set(item.id, item);
          });
          emitDisputes();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'disputes')
      ),
      onSnapshot(
        query(collection(db, 'disputes'), where('sellerId', '==', uid)),
        (snap) => {
          dispBuckets.seller.clear();
          snap.docs.forEach((d) => {
            const item = mapDisputeDoc(d.data() as Record<string, unknown>);
            dispBuckets.seller.set(item.id, item);
          });
          emitDisputes();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'disputes')
      )
    );

    if (callbacks.onProductOrders) {
      const cb = callbacks.onProductOrders;
      unsubs.push(
        onSnapshot(
          query(collection(db, 'productOrders'), where('buyerId', '==', uid)),
          (snap) => cb(snap.docs.map((d) => mapProductOrderDoc(d.data() as Record<string, unknown>))),
          (err) => handleFirestoreError(err, OperationType.LIST, 'productOrders')
        )
      );
    }

    if (callbacks.onSubscriptions) {
      const cb = callbacks.onSubscriptions;
      unsubs.push(
        onSnapshot(
          query(collection(db, 'subscriptions'), where('userId', '==', uid)),
          (snap) => cb(snap.docs.map((d) => mapSubscriptionDoc(d.data() as Record<string, unknown>))),
          (err) => handleFirestoreError(err, OperationType.LIST, 'subscriptions')
        )
      );
    }
  }

  return () => {
    unsubs.forEach((u) => u());
    msgUnsubs.forEach((u) => u());
    msgUnsubs.clear();
  };
}

// ============================================================================
// Domain Write Operations (Strictly Schema-Validated & Timestamp-Synced)
// ============================================================================

export async function fsCreateListing(listing: LivestockListing): Promise<void> {
  const id = sanitizeId(listing.id, 'lst');
  const path = `listings/${id}`;
  try {
    await setDoc(
      doc(db, 'listings', id),
      stripUndefined({
        id,
        reference: sanitizeRef(listing.reference, 'MRK'),
        title: clampStr(listing.title, 160),
        category: listing.category,
        breed: clampStr(listing.breed, 100),
        ageMonths: clampNum(listing.ageMonths, 0, 360, 12),
        ageLabel: clampStr(listing.ageLabel, 60),
        gender: listing.gender,
        weightKg: clampNum(listing.weightKg, 1, 5000, 300),
        quantity: clampNum(listing.quantity, 1, 100000, 1),
        priceUsd: clampNum(listing.priceUsd, 1, 10000000, 100),
        priceUnit: listing.priceUnit,
        country: clampStr(listing.country, 80),
        province: clampStr(listing.province, 80),
        district: clampStr(listing.district, 80),
        farmName: clampStr(listing.farmName, 140),
        sellerId: sanitizeId(listing.sellerId, 'usr'),
        sellerName: clampStr(listing.sellerName, 120),
        sellerRating: clampNum(listing.sellerRating, 0, 5, 4.8),
        sellerVerified: Boolean(listing.sellerVerified),
        verificationStatus: listing.verificationStatus,
        status: listing.status,
        listedAt: clampStr(listing.listedAt, 64),
        images: (listing.images || []).slice(0, 10).map((img) => clampStr(img, 1000)),
        description: clampStr(listing.description, 2000),
        vaccinationSummary: clampStr(listing.vaccinationSummary, 600),
        feedingRegime: clampStr(listing.feedingRegime, 300),
        featured: Boolean(listing.featured),
        views: clampNum(listing.views, 0, 10000000, 1),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fsUpdateListing(
  listingId: string,
  updates: Partial<
    Pick<
      LivestockListing,
      | 'title'
      | 'breed'
      | 'priceUsd'
      | 'quantity'
      | 'weightKg'
      | 'description'
      | 'vaccinationSummary'
      | 'status'
      | 'verificationStatus'
      | 'verificationReport'
    >
  >
): Promise<void> {
  const id = sanitizeId(listingId, 'lst');
  const path = `listings/${id}`;
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.title !== undefined) payload.title = clampStr(updates.title, 160);
  if (updates.breed !== undefined) payload.breed = clampStr(updates.breed, 100);
  if (updates.priceUsd !== undefined) payload.priceUsd = clampNum(updates.priceUsd, 1, 10000000, 100);
  if (updates.quantity !== undefined) payload.quantity = clampNum(updates.quantity, 1, 100000, 1);
  if (updates.weightKg !== undefined) payload.weightKg = clampNum(updates.weightKg, 1, 5000, 100);
  if (updates.description !== undefined) payload.description = clampStr(updates.description, 2000);
  if (updates.vaccinationSummary !== undefined) payload.vaccinationSummary = clampStr(updates.vaccinationSummary, 600);
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.verificationStatus !== undefined) payload.verificationStatus = updates.verificationStatus;
  if (updates.verificationReport !== undefined) payload.verificationReport = updates.verificationReport;

  try {
    await updateDoc(doc(db, 'listings', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fsCreateFieldTask(task: FieldInspectionTask, sellerId: string): Promise<void> {
  const id = sanitizeId(task.id, 'tsk');
  const path = `fieldTasks/${id}`;
  try {
    await setDoc(
      doc(db, 'fieldTasks', id),
      stripUndefined({
        id,
        reference: sanitizeRef(task.reference, 'INS'),
        listingId: sanitizeId(task.listingId, 'lst'),
        listingTitle: clampStr(task.listingTitle, 160),
        sellerId: sanitizeId(sellerId, 'usr'),
        sellerName: clampStr(task.sellerName, 120),
        sellerPhone: clampStr(task.sellerPhone, 40),
        farmName: clampStr(task.farmName, 140),
        country: clampStr(task.country, 80),
        province: clampStr(task.province, 80),
        district: clampStr(task.district, 80),
        assignedAgentId: sanitizeId(task.assignedAgentId, 'usr'),
        assignedAgentName: clampStr(task.assignedAgentName, 120),
        scheduledDate: clampStr(task.scheduledDate, 32),
        priority: task.priority,
        status: task.status,
        expectedCategory: task.expectedCategory,
        expectedBreed: clampStr(task.expectedBreed, 100),
        expectedQuantity: clampNum(task.expectedQuantity, 1, 100000, 1),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fsUpdateFieldTaskStatus(
  taskId: string,
  status: FieldInspectionTask['status']
): Promise<void> {
  const id = sanitizeId(taskId, 'tsk');
  try {
    await updateDoc(doc(db, 'fieldTasks', id), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `fieldTasks/${id}`);
  }
}

export async function fsCreateOffer(offer: Offer): Promise<void> {
  const id = sanitizeId(offer.id, 'off');
  const path = `offers/${id}`;
  try {
    await setDoc(doc(db, 'offers', id), {
      id,
      reference: sanitizeRef(offer.reference, 'OFR'),
      listingId: sanitizeId(offer.listingId, 'lst'),
      listingTitle: clampStr(offer.listingTitle, 160),
      listingRef: clampStr(offer.listingRef, 40),
      buyerId: sanitizeId(offer.buyerId, 'usr'),
      buyerName: clampStr(offer.buyerName, 120),
      sellerId: sanitizeId(offer.sellerId, 'usr'),
      sellerName: clampStr(offer.sellerName, 120),
      currentAmountUsd: clampNum(offer.currentAmountUsd, 1, 100000000, 100),
      quantity: clampNum(offer.quantity, 1, 100000, 1),
      status: offer.status,
      lastActorRole: offer.lastActorRole,
      expiresAt: clampStr(offer.expiresAt, 64),
      history: (offer.history || []).slice(0, 50),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fsUpdateOffer(
  offerId: string,
  updates: Pick<Offer, 'currentAmountUsd' | 'quantity' | 'status' | 'lastActorRole' | 'history'>
): Promise<void> {
  const id = sanitizeId(offerId, 'off');
  try {
    await updateDoc(doc(db, 'offers', id), {
      currentAmountUsd: clampNum(updates.currentAmountUsd, 1, 100000000, 100),
      quantity: clampNum(updates.quantity, 1, 100000, 1),
      status: updates.status,
      lastActorRole: updates.lastActorRole,
      history: (updates.history || []).slice(0, 50),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `offers/${id}`);
  }
}

export async function fsCreateTransactionBundle(
  txn: Transaction,
  centreRec: CollectionCentreRecord,
  transportJob: TransportJob,
  operatorId: string
): Promise<void> {
  const txnId = sanitizeId(txn.id, 'txn');
  const offerId = sanitizeId(txn.offerId, 'off');
  const ccrId = sanitizeId(centreRec.id, 'ccr');
  const trpId = sanitizeId(transportJob.id, 'trp');

  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'transactions', txnId),
      stripUndefined({
        id: txnId,
        reference: sanitizeRef(txn.reference, 'TXN'),
        offerId,
        listingId: sanitizeId(txn.listingId, 'lst'),
        listingTitle: clampStr(txn.listingTitle, 160),
        listingCategory: txn.listingCategory,
        quantity: clampNum(txn.quantity, 1, 100000, 1),
        buyerId: sanitizeId(txn.buyerId, 'usr'),
        buyerName: clampStr(txn.buyerName, 120),
        sellerId: sanitizeId(txn.sellerId, 'usr'),
        sellerName: clampStr(txn.sellerName, 120),
        agreedAmountUsd: clampNum(txn.agreedAmountUsd, 1, 100000000, 100),
        state: txn.state,
        paymentMode: clampStr(txn.paymentMode, 120),
        paymentStatus: txn.paymentStatus,
        collectionCentreName: clampStr(txn.collectionCentreName, 180),
        pickupLocation: clampStr(txn.pickupLocation, 200),
        deliveryLocation: clampStr(txn.deliveryLocation, 200),
        handoverCode: clampStr(txn.handoverCode, 32),
        transportJobId: trpId,
        documents: (txn.documents || []).slice(0, 20),
        timeline: (txn.timeline || []).slice(0, 50),
        hasReview: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    batch.update(doc(db, 'offers', offerId), {
      status: 'converted',
      updatedAt: serverTimestamp(),
    });
    batch.set(
      doc(db, 'centreRecords', ccrId),
      stripUndefined({
        id: ccrId,
        reference: sanitizeRef(centreRec.reference, 'MCC'),
        centreName: clampStr(centreRec.centreName, 180),
        operatorId: sanitizeId(operatorId, 'usr'),
        buyerId: sanitizeId(txn.buyerId, 'usr'),
        sellerId: sanitizeId(txn.sellerId, 'usr'),
        country: centreRec.country ? clampStr(centreRec.country, 80) : undefined,
        transactionRef: clampStr(centreRec.transactionRef, 40),
        listingTitle: clampStr(centreRec.listingTitle, 160),
        category: centreRec.category,
        quantity: clampNum(centreRec.quantity, 1, 100000, 1),
        sellerName: clampStr(centreRec.sellerName, 120),
        buyerName: clampStr(centreRec.buyerName, 120),
        penNumber: clampStr(centreRec.penNumber, 60),
        checkedWeightAvgKg: clampNum(centreRec.checkedWeightAvgKg, 0, 5000, 0),
        status: centreRec.status,
        expectedAt: clampStr(centreRec.expectedAt, 64),
        handoverPin: clampStr(centreRec.handoverPin, 32),
        notes: clampStr(centreRec.notes, 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    batch.set(
      doc(db, 'transportJobs', trpId),
      stripUndefined({
        id: trpId,
        reference: sanitizeRef(transportJob.reference, 'TRP'),
        transactionId: txnId,
        transactionRef: clampStr(transportJob.transactionRef, 40),
        listingTitle: clampStr(transportJob.listingTitle, 160),
        category: transportJob.category,
        quantity: clampNum(transportJob.quantity, 1, 100000, 1),
        buyerId: sanitizeId(txn.buyerId, 'usr'),
        sellerId: sanitizeId(txn.sellerId, 'usr'),
        pickupLocation: clampStr(transportJob.pickupLocation, 200),
        destination: clampStr(transportJob.destination, 200),
        country: transportJob.country ? clampStr(transportJob.country, 80) : undefined,
        distanceKm: clampNum(transportJob.distanceKm, 0, 20000, 0),
        requirements: clampStr(transportJob.requirements, 500),
        scheduledDate: clampStr(transportJob.scheduledDate, 32),
        feeUsd: clampNum(transportJob.feeUsd, 0, 1000000, 0),
        status: transportJob.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `transactions/${txnId}`);
  }
}

export async function fsUpdateTransaction(
  transactionId: string,
  updates: Partial<Pick<Transaction, 'state' | 'paymentStatus' | 'timeline' | 'hasReview'>>
): Promise<void> {
  const id = sanitizeId(transactionId, 'txn');
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.state !== undefined) payload.state = updates.state;
  if (updates.paymentStatus !== undefined) payload.paymentStatus = updates.paymentStatus;
  if (updates.timeline !== undefined) payload.timeline = updates.timeline.slice(0, 50);
  if (updates.hasReview !== undefined) payload.hasReview = Boolean(updates.hasReview);

  try {
    await updateDoc(doc(db, 'transactions', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `transactions/${id}`);
  }
}

export async function fsCreateDispute(
  dispute: DisputeCase,
  openedById: string,
  buyerId: string,
  sellerId: string
): Promise<void> {
  const id = sanitizeId(dispute.id, 'dsp');
  try {
    await setDoc(doc(db, 'disputes', id), {
      id,
      reference: sanitizeRef(dispute.reference, 'DSP'),
      transactionId: sanitizeId(dispute.transactionId, 'txn'),
      transactionRef: clampStr(dispute.transactionRef, 40),
      openedById: sanitizeId(openedById, 'usr'),
      openedBy: clampStr(dispute.openedBy, 140),
      buyerId: sanitizeId(buyerId, 'usr'),
      sellerId: sanitizeId(sellerId, 'usr'),
      against: clampStr(dispute.against, 140),
      reason: clampStr(dispute.reason, 160),
      description: clampStr(dispute.description, 2000),
      status: dispute.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `disputes/${id}`);
  }
}

export async function fsResolveDispute(disputeId: string, resolution: string): Promise<void> {
  const id = sanitizeId(disputeId, 'dsp');
  try {
    await updateDoc(doc(db, 'disputes', id), {
      status: 'Resolved',
      resolution: clampStr(resolution, 2000),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `disputes/${id}`);
  }
}

export async function fsCreateReview(review: SellerReview, transactionId: string): Promise<void> {
  const id = sanitizeId(review.id, 'rev');
  const txnId = sanitizeId(transactionId, 'txn');
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'reviews', id), {
      id,
      sellerId: sanitizeId(review.sellerId, 'usr'),
      sellerName: clampStr(review.sellerName, 120),
      buyerId: sanitizeId(review.buyerId, 'usr'),
      buyerName: clampStr(review.buyerName, 120),
      transactionId: txnId,
      transactionRef: clampStr(review.transactionRef, 40),
      rating: clampNum(review.rating, 1, 5, 5),
      comment: clampStr(review.comment, 1200),
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'transactions', txnId), {
      hasReview: true,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reviews/${id}`);
  }
}

export async function fsCreateCentreRecord(
  record: CollectionCentreRecord,
  operatorId: string
): Promise<void> {
  const id = sanitizeId(record.id, 'ccr');
  try {
    await setDoc(
      doc(db, 'centreRecords', id),
      stripUndefined({
        id,
        reference: sanitizeRef(record.reference, 'MCC'),
        centreName: clampStr(record.centreName, 180),
        operatorId: sanitizeId(operatorId, 'usr'),
        country: record.country ? clampStr(record.country, 80) : undefined,
        transactionRef: clampStr(record.transactionRef, 40),
        listingTitle: clampStr(record.listingTitle, 160),
        category: record.category,
        quantity: clampNum(record.quantity, 1, 100000, 1),
        sellerName: clampStr(record.sellerName, 120),
        buyerName: clampStr(record.buyerName, 120),
        penNumber: clampStr(record.penNumber, 60),
        checkedWeightAvgKg: clampNum(record.checkedWeightAvgKg, 0, 5000, 0),
        status: record.status,
        expectedAt: clampStr(record.expectedAt, 64),
        checkedInAt: record.checkedInAt ? clampStr(record.checkedInAt, 64) : undefined,
        releasedAt: record.releasedAt ? clampStr(record.releasedAt, 64) : undefined,
        handoverPin: clampStr(record.handoverPin, 32),
        notes: clampStr(record.notes, 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `centreRecords/${id}`);
  }
}

export async function fsUpdateCentreRecord(
  recordId: string,
  updates: Partial<CollectionCentreRecord>
): Promise<void> {
  const id = sanitizeId(recordId, 'ccr');
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.penNumber !== undefined) payload.penNumber = clampStr(updates.penNumber, 60);
  if (updates.checkedWeightAvgKg !== undefined)
    payload.checkedWeightAvgKg = clampNum(updates.checkedWeightAvgKg, 0, 5000, 0);
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.checkedInAt !== undefined) payload.checkedInAt = clampStr(updates.checkedInAt, 64);
  if (updates.releasedAt !== undefined) payload.releasedAt = clampStr(updates.releasedAt, 64);
  if (updates.notes !== undefined) payload.notes = clampStr(updates.notes, 1000);

  try {
    await updateDoc(doc(db, 'centreRecords', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `centreRecords/${id}`);
  }
}

export async function fsUpdateTransportJob(
  jobId: string,
  updates: Partial<TransportJob>
): Promise<void> {
  const id = sanitizeId(jobId, 'trp');
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.assignedPartnerId !== undefined)
    payload.assignedPartnerId = sanitizeId(updates.assignedPartnerId, 'usr');
  if (updates.assignedDriver !== undefined) payload.assignedDriver = clampStr(updates.assignedDriver, 120);
  if (updates.assignedVehicle !== undefined) payload.assignedVehicle = clampStr(updates.assignedVehicle, 80);
  if (updates.podRecipient !== undefined) payload.podRecipient = clampStr(updates.podRecipient, 120);
  if (updates.podCode !== undefined) payload.podCode = clampStr(updates.podCode, 40);
  if (updates.podDeliveredAt !== undefined) payload.podDeliveredAt = clampStr(updates.podDeliveredAt, 64);
  if (updates.podConditionNotes !== undefined)
    payload.podConditionNotes = clampStr(updates.podConditionNotes, 1000);

  try {
    await updateDoc(doc(db, 'transportJobs', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `transportJobs/${id}`);
  }
}

export async function fsCreateVehicle(vehicle: TransportVehicle, partnerId: string): Promise<void> {
  const id = sanitizeId(vehicle.id, 'veh');
  try {
    await setDoc(doc(db, 'vehicles', id), {
      id,
      partnerId: sanitizeId(partnerId, 'usr'),
      registration: clampStr(vehicle.registration, 40),
      model: clampStr(vehicle.model, 120),
      capacityHead: clampNum(vehicle.capacityHead, 1, 2000, 10),
      suitableFor: clampStr(vehicle.suitableFor, 160),
      driverName: clampStr(vehicle.driverName, 120),
      driverPhone: clampStr(vehicle.driverPhone, 40),
      status: vehicle.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `vehicles/${id}`);
  }
}

export async function fsCreateConversation(
  conv: Conversation,
  firstMsg: MessageItem
): Promise<void> {
  const id = sanitizeId(conv.id, 'cnv');
  const msgId = sanitizeId(firstMsg.id, 'msg');
  const participantIds = conv.participants.map((p) => sanitizeId(p.id, 'usr')).slice(0, 4);
  try {
    await setDoc(doc(db, 'conversations', id), {
      id,
      subject: clampStr(conv.subject, 180),
      contextType: conv.contextType,
      contextRef: clampStr(conv.contextRef, 60),
      participantIds,
      participants: conv.participants.slice(0, 4),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, 'conversations', id, 'messages', msgId),
      stripUndefined({
        id: msgId,
        senderId: sanitizeId(firstMsg.senderId, 'usr'),
        senderName: clampStr(firstMsg.senderName, 120),
        senderRole: firstMsg.senderRole,
        participantIds,
        text: clampStr(firstMsg.text, 2000),
        attachmentName: firstMsg.attachmentName ? clampStr(firstMsg.attachmentName, 180) : undefined,
        read: Boolean(firstMsg.read),
        createdAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `conversations/${id}`);
  }
}

export async function fsSendMessage(
  conversationId: string,
  participantIds: string[],
  msg: MessageItem
): Promise<void> {
  const cid = sanitizeId(conversationId, 'cnv');
  const mid = sanitizeId(msg.id, 'msg');
  const safeParticipants = participantIds.map((p) => sanitizeId(p, 'usr')).slice(0, 4);
  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'conversations', cid, 'messages', mid),
      stripUndefined({
        id: mid,
        senderId: sanitizeId(msg.senderId, 'usr'),
        senderName: clampStr(msg.senderName, 120),
        senderRole: msg.senderRole,
        participantIds: safeParticipants,
        text: clampStr(msg.text, 2000),
        attachmentName: msg.attachmentName ? clampStr(msg.attachmentName, 180) : undefined,
        read: Boolean(msg.read),
        createdAt: serverTimestamp(),
      })
    );
    batch.update(doc(db, 'conversations', cid), {
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `conversations/${cid}/messages/${mid}`);
  }
}

export async function fsMarkMessagesRead(
  conversationId: string,
  unreadMessageIds: string[]
): Promise<void> {
  if (unreadMessageIds.length === 0) return;
  const cid = sanitizeId(conversationId, 'cnv');
  try {
    const batch = writeBatch(db);
    for (const mid of unreadMessageIds.slice(0, 50)) {
      batch.update(doc(db, 'conversations', cid, 'messages', sanitizeId(mid, 'msg')), {
        read: true,
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `conversations/${cid}/messages`);
  }
}

export async function fsCreateNotification(
  notif: AppNotification,
  recipientUserId?: string
): Promise<void> {
  const id = sanitizeId(notif.id, 'ntf');
  try {
    await setDoc(
      doc(db, 'notifications', id),
      stripUndefined({
        id,
        recipientUserId: recipientUserId ? sanitizeId(recipientUserId, 'usr') : undefined,
        recipientRole: notif.recipientRole,
        title: clampStr(notif.title, 160),
        body: clampStr(notif.body, 600),
        category: notif.category,
        read: Boolean(notif.read),
        linkView: notif.linkView ? clampStr(notif.linkView, 80) : undefined,
        createdAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `notifications/${id}`);
  }
}

export async function fsMarkNotificationRead(id: string): Promise<void> {
  const safeId = sanitizeId(id, 'ntf');
  try {
    await updateDoc(doc(db, 'notifications', safeId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${safeId}`);
  }
}

export async function fsUpdateUserProfile(
  uid: string,
  updates: Partial<
    Pick<UserAccount, 'name' | 'organization' | 'phone' | 'country' | 'province' | 'district' | 'meta'>
  >
): Promise<void> {
  const safeUid = sanitizeId(uid, 'usr');
  const privateUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  const publicUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (updates.name !== undefined) {
    const v = clampStr(updates.name, 120);
    privateUpdates.name = v;
    publicUpdates.name = v;
  }
  if (updates.organization !== undefined) {
    const v = clampStr(updates.organization, 160);
    privateUpdates.organization = v;
    publicUpdates.organization = v;
  }
  if (updates.phone !== undefined) privateUpdates.phone = clampStr(updates.phone, 40);
  if (updates.country !== undefined) {
    const v = clampStr(updates.country, 80);
    privateUpdates.country = v;
    publicUpdates.country = v;
  }
  if (updates.province !== undefined) {
    const v = clampStr(updates.province, 80);
    privateUpdates.province = v;
    publicUpdates.province = v;
  }
  if (updates.district !== undefined) {
    const v = clampStr(updates.district, 80);
    privateUpdates.district = v;
    publicUpdates.district = v;
  }
  if (updates.meta !== undefined) privateUpdates.meta = updates.meta;

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', safeUid), privateUpdates);
    if (Object.keys(publicUpdates).length > 1) {
      batch.update(doc(db, 'publicProfiles', safeUid), publicUpdates);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${safeUid}`);
  }
}

export async function fsUpdateUserPreferences(
  uid: string,
  prefs: Partial<StoredUserPreferences>
): Promise<void> {
  const safeUid = sanitizeId(uid, 'usr');
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (prefs.savedListingIds !== undefined) payload.savedListingIds = prefs.savedListingIds.slice(0, 200);
  if (prefs.recentlyViewedIds !== undefined) payload.recentlyViewedIds = prefs.recentlyViewedIds.slice(0, 20);
  if (prefs.compareListingIds !== undefined) payload.compareListingIds = prefs.compareListingIds.slice(0, 5);

  try {
    await updateDoc(doc(db, 'users', safeUid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${safeUid}`);
  }
}

export async function fsAdminUpdateUserStatus(
  userId: string,
  status: UserAccount['status'],
  verified?: boolean
): Promise<void> {
  const safeUid = sanitizeId(userId, 'usr');
  const payload: Record<string, unknown> = { status, updatedAt: serverTimestamp() };
  if (verified !== undefined) payload.verified = verified;

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', safeUid), payload);
    batch.update(doc(db, 'publicProfiles', safeUid), payload);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${safeUid}`);
  }
}

export async function fsCreateAuditLog(entry: AuditLogEntry, actorId: string): Promise<void> {
  const id = sanitizeId(entry.id, 'aud');
  try {
    await setDoc(doc(db, 'auditLogs', id), {
      id,
      actorId: sanitizeId(actorId, 'usr'),
      actor: clampStr(entry.actor, 120),
      role: entry.role,
      action: clampStr(entry.action, 200),
      target: clampStr(entry.target, 160),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `auditLogs/${id}`);
  }
}

export async function fsDeleteListing(listingId: string): Promise<void> {
  const id = sanitizeId(listingId, 'lst');
  try {
    await deleteDoc(doc(db, 'listings', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `listings/${id}`);
  }
}

// ============================================================================
// Hybrid Auction, Agri-Vet Store & Subscription Persistence Operations
// ============================================================================

export async function fsPlaceAuctionBid(
  lot: AuctionLot,
  bid: AuctionBid
): Promise<void> {
  const lotId = sanitizeId(lot.id, 'lot');
  const bidId = sanitizeId(bid.id, 'bid');
  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'auctionLots', lotId, 'bids', bidId),
      stripUndefined({
        id: bidId,
        lotId,
        auctionId: sanitizeId(bid.auctionId, 'auc'),
        bidderId: sanitizeId(bid.bidderId, 'usr'),
        bidderName: clampStr(bid.bidderName, 120),
        paddleNumber: clampStr(bid.paddleNumber, 32),
        channel: bid.channel,
        amountUsd: clampNum(bid.amountUsd, 1, 100000000, 100),
        maxProxyUsd:
          typeof bid.maxProxyUsd === 'number' && bid.maxProxyUsd >= bid.amountUsd
            ? clampNum(bid.maxProxyUsd, bid.amountUsd, 100000000, bid.amountUsd)
            : undefined,
        createdAt: serverTimestamp(),
      })
    );
    batch.update(doc(db, 'auctionLots', lotId), {
      currentBidUsd: clampNum(bid.amountUsd, 1, 100000000, 100),
      bidCount: clampNum(lot.bidCount + 1, 1, 100000, 1),
      highestBidderId: sanitizeId(bid.bidderId, 'usr'),
      highestBidderName: clampStr(bid.bidderName, 120),
      highestBidderPaddle: clampStr(bid.paddleNumber, 32),
      highestBidChannel: bid.channel,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `auctionLots/${lotId}/bids/${bidId}`);
  }
}

export async function fsUpdateAuctionLotStatus(
  lotId: string,
  status: AuctionLot['status']
): Promise<void> {
  const id = sanitizeId(lotId, 'lot');
  try {
    await updateDoc(doc(db, 'auctionLots', id), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `auctionLots/${id}`);
  }
}

export async function fsIncrementAuctionBidders(
  auctionId: string,
  nextCount: number
): Promise<void> {
  const id = sanitizeId(auctionId, 'auc');
  try {
    await updateDoc(doc(db, 'auctions', id), {
      registeredBidders: clampNum(nextCount, 1, 100000, 1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `auctions/${id}`);
  }
}

export async function fsCreateProductOrder(order: ProductOrder): Promise<void> {
  const id = sanitizeId(order.id, 'ord');
  try {
    await setDoc(doc(db, 'productOrders', id), {
      id,
      reference: sanitizeRef(order.reference, 'ORD'),
      buyerId: sanitizeId(order.buyerId, 'usr'),
      buyerName: clampStr(order.buyerName, 120),
      country: clampStr(order.country, 80),
      deliveryAddress: clampStr(order.deliveryAddress, 260),
      items: (order.items || []).slice(0, 30),
      totalUsd: clampNum(order.totalUsd, 1, 10000000, 10),
      paymentMode: clampStr(order.paymentMode, 120),
      status: order.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `productOrders/${id}`);
  }
}

export async function fsCancelProductOrder(orderId: string): Promise<void> {
  const id = sanitizeId(orderId, 'ord');
  try {
    await updateDoc(doc(db, 'productOrders', id), {
      status: 'Cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `productOrders/${id}`);
  }
}

export async function fsUpsertSubscription(
  sub: UserSubscription,
  alreadyExists: boolean
): Promise<void> {
  const id = sanitizeId(sub.id, 'sub');
  try {
    if (alreadyExists) {
      await updateDoc(doc(db, 'subscriptions', id), {
        planId: clampStr(sub.planId, 80),
        planName: clampStr(sub.planName, 140),
        tier: sub.tier,
        billingCycle: sub.billingCycle,
        amountUsd: clampNum(sub.amountUsd, 1, 100000, 39),
        status: sub.status,
        startedAt: clampStr(sub.startedAt, 64),
        renewsAt: clampStr(sub.renewsAt, 64),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'subscriptions', id), {
        id,
        userId: sanitizeId(sub.userId, 'usr'),
        userName: clampStr(sub.userName, 120),
        planId: clampStr(sub.planId, 80),
        planName: clampStr(sub.planName, 140),
        tier: sub.tier,
        billingCycle: sub.billingCycle,
        amountUsd: clampNum(sub.amountUsd, 1, 100000, 39),
        status: sub.status,
        startedAt: clampStr(sub.startedAt, 64),
        renewsAt: clampStr(sub.renewsAt, 64),
        paymentMode: clampStr(sub.paymentMode, 120),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `subscriptions/${id}`);
  }
}
