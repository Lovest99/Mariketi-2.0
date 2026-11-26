export type AfricanRegion =
  | 'Southern Africa'
  | 'East Africa'
  | 'West Africa'
  | 'Central Africa'
  | 'North Africa';

export type UserRole =
  | 'buyer'
  | 'seller'
  | 'agent'
  | 'centre'
  | 'transport'
  | 'admin';

export type LivestockCategory =
  | 'Cattle'
  | 'Goats'
  | 'Sheep'
  | 'Pigs'
  | 'Poultry'
  | 'Other livestock';

export type VerificationStatus =
  | 'Verified'
  | 'Inspection Scheduled'
  | 'Pending Verification'
  | 'Unverified';

export type ListingStatus = 'active' | 'paused' | 'sold' | 'archived' | 'draft';

export type GenderType = 'Bull / Male' | 'Cow / Female' | 'Heifer' | 'Steer / Ox' | 'Mixed Herd';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  organization?: string;
  country: string;
  province: string;
  district: string;
  verified: boolean;
  status: 'active' | 'pending' | 'suspended';
  rating: number;
  reviewCount: number;
  joinedAt: string;
  meta?: Record<string, string>;
}

export interface VerificationReport {
  id: string;
  listingId: string;
  agentId: string;
  agentName: string;
  inspectedAt: string;
  gpsCoordinates: string;
  observedBreed: string;
  observedAgeMonths: number;
  observedGender: GenderType;
  observedWeightKg: number;
  observedQuantity: number;
  earTagRange: string;
  healthScore: 'Healthy & Cleared' | 'Minor Observation' | 'Requires Veterinary Review';
  vetClearanceRef: string;
  notes: string;
  photos: string[];
  outcome: 'Approved' | 'Flagged';
}

export interface LivestockListing {
  id: string;
  reference: string;
  title: string;
  category: LivestockCategory;
  breed: string;
  ageMonths: number;
  ageLabel: string;
  gender: GenderType;
  weightKg: number;
  quantity: number;
  priceUsd: number;
  priceUnit: 'per head' | 'total lot';
  country: string;
  province: string;
  district: string;
  farmName: string;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  sellerVerified: boolean;
  verificationStatus: VerificationStatus;
  verificationReport?: VerificationReport;
  status: ListingStatus;
  listedAt: string;
  images: string[];
  description: string;
  vaccinationSummary: string;
  feedingRegime: string;
  featured?: boolean;
  views: number;
}

export type OfferStatus =
  | 'pending'
  | 'countered'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted';

export interface OfferHistoryEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: 'buyer' | 'seller';
  action: 'initial_offer' | 'counter_offer' | 'accepted' | 'rejected' | 'expired';
  amountUsd: number;
  quantity: number;
  note: string;
  timestamp: string;
}

export interface Offer {
  id: string;
  reference: string;
  listingId: string;
  listingTitle: string;
  listingRef: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  currentAmountUsd: number;
  quantity: number;
  status: OfferStatus;
  lastActorRole: 'buyer' | 'seller';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  history: OfferHistoryEntry[];
}

export type TransactionState =
  | 'Offer accepted'
  | 'Initiated'
  | 'Awaiting payment'
  | 'Payment confirmed'
  | 'Collection scheduled'
  | 'Delivery scheduled'
  | 'Handover initiated'
  | 'Handover verified'
  | 'Completed'
  | 'Disputed'
  | 'Cancelled';

export interface TransactionEvent {
  id: string;
  state: TransactionState;
  actor: string;
  note: string;
  timestamp: string;
}

export interface Transaction {
  id: string;
  reference: string;
  offerId: string;
  listingId: string;
  listingTitle: string;
  listingCategory: LivestockCategory;
  quantity: number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  agreedAmountUsd: number;
  state: TransactionState;
  paymentMode: 'Simulated Demo Settlement (No Live Funds Held)';
  paymentStatus: 'Unpaid' | 'Demo Payment Confirmed' | 'Refunded (Demo)';
  collectionCentreName: string;
  pickupLocation: string;
  deliveryLocation: string;
  handoverCode: string;
  transportJobId?: string;
  documents: { name: string; ref: string; verified: boolean }[];
  timeline: TransactionEvent[];
  createdAt: string;
  updatedAt: string;
  hasReview?: boolean;
}

export interface FieldInspectionTask {
  id: string;
  reference: string;
  listingId: string;
  listingTitle: string;
  sellerName: string;
  sellerPhone: string;
  farmName: string;
  country: string;
  province: string;
  district: string;
  assignedAgentId: string;
  assignedAgentName: string;
  scheduledDate: string;
  priority: 'Standard' | 'Urgent';
  status: 'Assigned' | 'In Progress' | 'Queued Offline' | 'Completed';
  expectedCategory: LivestockCategory;
  expectedBreed: string;
  expectedQuantity: number;
}

export interface OfflineInspectionDraft {
  taskId: string;
  listingId: string;
  observedBreed: string;
  observedAgeMonths: number;
  observedGender: GenderType;
  observedWeightKg: number;
  observedQuantity: number;
  earTagRange: string;
  healthScore: 'Healthy & Cleared' | 'Minor Observation' | 'Requires Veterinary Review';
  vetClearanceRef: string;
  gpsCoordinates: string;
  notes: string;
  photos: string[];
  savedAt: string;
  syncStatus: 'draft' | 'queued' | 'syncing' | 'conflict' | 'synced';
  retryCount: number;
  conflictReason?: string;
}

export interface CollectionCentreRecord {
  id: string;
  reference: string;
  centreName: string;
  country?: string;
  transactionRef: string;
  listingTitle: string;
  category: LivestockCategory;
  quantity: number;
  sellerName: string;
  buyerName: string;
  penNumber: string;
  checkedWeightAvgKg: number;
  status: 'Expected' | 'Checked In' | 'Inspected' | 'Ready for Handover' | 'Released';
  expectedAt: string;
  checkedInAt?: string;
  releasedAt?: string;
  handoverPin: string;
  notes: string;
}

export interface TransportJob {
  id: string;
  reference: string;
  transactionId: string;
  transactionRef: string;
  listingTitle: string;
  category: LivestockCategory;
  quantity: number;
  pickupLocation: string;
  destination: string;
  country?: string;
  distanceKm: number;
  requirements: string;
  scheduledDate: string;
  feeUsd: number;
  status:
    | 'Available'
    | 'Accepted'
    | 'En Route to Pickup'
    | 'Loaded & In Transit'
    | 'Delivered';
  assignedPartnerId?: string;
  assignedDriver?: string;
  assignedVehicle?: string;
  podRecipient?: string;
  podCode?: string;
  podDeliveredAt?: string;
  podConditionNotes?: string;
}

export interface TransportVehicle {
  id: string;
  registration: string;
  model: string;
  capacityHead: number;
  suitableFor: string;
  driverName: string;
  driverPhone: string;
  status: 'Available' | 'On Route' | 'Maintenance';
}

export interface MessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  attachmentName?: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  subject: string;
  contextType: 'Listing' | 'Offer' | 'Transaction' | 'Verification';
  contextRef: string;
  participants: { id: string; name: string; role: UserRole }[];
  messages: MessageItem[];
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  recipientRole: UserRole | 'all';
  title: string;
  body: string;
  category:
    | 'offer'
    | 'verification'
    | 'transaction'
    | 'logistics'
    | 'dispute'
    | 'review';
  timestamp: string;
  read: boolean;
  linkView?: string;
}

export interface SellerReview {
  id: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  transactionRef: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface DisputeCase {
  id: string;
  reference: string;
  transactionId: string;
  transactionRef: string;
  openedBy: string;
  against: string;
  reason: string;
  description: string;
  status: 'Open' | 'Under Investigation' | 'Resolved';
  resolution?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  role: UserRole;
  action: string;
  target: string;
  timestamp: string;
}

// ============================================================================
// Hybrid Physical + Online Auction System & Physical Auction Centers
// ============================================================================

export interface AuctionCenter {
  id: string;
  code: string;
  name: string;
  country: string;
  province: string;
  district: string;
  address: string;
  penCapacityHead: number;
  weighbridgeCertified: boolean;
  vetAuthority: string;
  ringManager: string;
  nextSaleDate: string;
  status: 'Active' | 'Upcoming Sale' | 'Maintenance';
  facilities: string[];
  image: string;
}

export interface AuctionEvent {
  id: string;
  reference: string;
  title: string;
  centerId: string;
  centerName: string;
  country: string;
  province: string;
  district: string;
  auctioneerName: string;
  mode: 'Hybrid (Physical + Online)' | 'Online Timed';
  status: 'Live Now' | 'Upcoming' | 'Completed';
  startsAt: string;
  endsAt: string;
  totalLots: number;
  registeredBidders: number;
  catalogNotes: string;
  coverImage: string;
}

export interface AuctionLot {
  id: string;
  auctionId: string;
  lotNumber: string;
  title: string;
  category: LivestockCategory;
  breed: string;
  quantity: number;
  avgWeightKg: number;
  ageLabel: string;
  gender: GenderType;
  reservePriceUsd: number;
  openingBidUsd: number;
  currentBidUsd: number;
  bidIncrementUsd: number;
  bidCount: number;
  highestBidderId?: string;
  highestBidderName?: string;
  highestBidderPaddle?: string;
  highestBidChannel?: 'Online' | 'Floor';
  status: 'Live' | 'Queued' | 'Sold' | 'Passed In';
  vetCertRef: string;
  farmOrigin: string;
  country: string;
  images: string[];
  notes: string;
}

export interface AuctionBid {
  id: string;
  lotId: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  paddleNumber: string;
  channel: 'Online' | 'Floor';
  amountUsd: number;
  maxProxyUsd?: number;
  timestamp: string;
}

// ============================================================================
// Agri-Vet Products Store & MARIKETI Subscription System
// ============================================================================

export type AgriProductCategory =
  | 'Veterinary & Vaccines'
  | 'Traceability & Ear Tags'
  | 'Nutrition & Minerals'
  | 'Ranch Equipment';

export interface AgriProduct {
  id: string;
  sku: string;
  name: string;
  category: AgriProductCategory;
  brand: string;
  priceUsd: number;
  unitLabel: string;
  stockQty: number;
  vetApproved: boolean;
  subscriptionEligible: boolean;
  subscriptionDiscountPct?: number;
  countryAvailability: string;
  description: string;
  image: string;
}

export interface ProductOrderItem {
  productId: string;
  name: string;
  qty: number;
  unitPriceUsd: number;
}

export interface ProductOrder {
  id: string;
  reference: string;
  buyerId: string;
  buyerName: string;
  country: string;
  deliveryAddress: string;
  items: ProductOrderItem[];
  totalUsd: number;
  paymentMode: 'Simulated Demo Checkout (No Live Funds Charged)';
  status: 'Pending' | 'Confirmed' | 'Dispatched' | 'Delivered' | 'Cancelled';
  createdAt: string;
}

export type SubscriptionTier =
  | 'buyer_pro'
  | 'rancher_pro'
  | 'vet_supplies_box'
  | 'enterprise_auction';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  audience: string;
  monthlyUsd: number;
  annualUsd: number;
  summary: string;
  features: string[];
  includesSuppliesCreditUsd?: number;
  recommended?: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  userName: string;
  planId: string;
  planName: string;
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'annual';
  amountUsd: number;
  status: 'active' | 'paused' | 'cancelled';
  startedAt: string;
  renewsAt: string;
  paymentMode: 'Simulated Demo Billing (No Live Card Charged)';
}

