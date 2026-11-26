/**
 * MARIKETI 2.0 — Phase 0 Security Rules Verification Suite ("Dirty Dozen")
 *
 * Verifies that all 12 adversarial payloads defined in security_spec.md are
 * rejected with PERMISSION_DENIED by firestore.rules.
 *
 * Run against the Firebase Firestore Emulator with @firebase/rules-unit-testing.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  path: string;
  actor: {
    uid: string;
    email: string;
    email_verified: boolean;
  };
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
  enforcedByPillar: string;
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Self-Assigned Admin Privilege Escalation',
    operation: 'create',
    path: '/users/attackerUid',
    actor: { uid: 'attackerUid', email: 'attacker@example.com', email_verified: true },
    payload: {
      id: 'attackerUid',
      uid: 'attackerUid',
      name: 'Malicious Actor',
      email: 'attacker@example.com',
      phone: '+263771000000',
      role: 'admin',
      country: 'Zimbabwe',
      province: 'Harare',
      district: 'Harare',
      verified: true,
      status: 'active',
      rating: 5,
      reviewCount: 0,
      joinedAt: '2026-01-01T00:00:00.000Z',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 4 (Tiered Identity / No Self-Assigned Admin)',
  },
  {
    id: 2,
    name: 'Shadow Field Injection ("Ghost Field")',
    operation: 'create',
    path: '/listings/lst-shadow',
    actor: { uid: 'sellerUid', email: 'seller@example.com', email_verified: true },
    payload: {
      id: 'lst-shadow',
      reference: 'MRK-9999',
      title: 'Boran Bulls',
      sellerId: 'sellerUid',
      bypassVerification: true,
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 2 (Strict Keys hasAll + hasOnly)',
  },
  {
    id: 3,
    name: 'Email Spoofing (Unverified Admin Email)',
    operation: 'get',
    path: '/users/victimUid',
    actor: { uid: 'spoofUid', email: 'brightcheteni1@gmail.com', email_verified: false },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByPillar: 'Verified Email Gate (email_verified == true)',
  },
  {
    id: 4,
    name: 'PII Blanket Read Attack',
    operation: 'get',
    path: '/users/victimUid',
    actor: { uid: 'otherUserUid', email: 'other@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 6 (PII Isolation — Owner or Admin Only)',
  },
  {
    id: 5,
    name: 'Identity Spoofing on Listing Creation',
    operation: 'create',
    path: '/listings/lst-spoof',
    actor: { uid: 'attackerUid', email: 'attacker@example.com', email_verified: true },
    payload: {
      id: 'lst-spoof',
      sellerId: 'legitSellerUid',
      title: 'Spoofed Cattle Lot',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 2 (Identity Integrity sellerId == request.auth.uid)',
  },
  {
    id: 6,
    name: 'ID Poisoning (Invalid Characters / Oversized Doc ID)',
    operation: 'create',
    path: `/listings/${'bad!id.'.repeat(30)}`,
    actor: { uid: 'sellerUid', email: 'seller@example.com', email_verified: true },
    payload: { id: 'bad', sellerId: 'sellerUid' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 3 (Path Variable Hardening isValidId)',
  },
  {
    id: 7,
    name: 'Value Poisoning on Whitelisted Update Field',
    operation: 'update',
    path: '/listings/lst-1',
    actor: { uid: 'sellerUid', email: 'seller@example.com', email_verified: true },
    payload: { title: 'A'.repeat(2000) },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 2 (Validation Blueprint Mandatory Size Checks)',
  },
  {
    id: 8,
    name: 'Terminal State Bypass on Converted Offer',
    operation: 'update',
    path: '/offers/off-converted',
    actor: { uid: 'buyerUid', email: 'buyer@example.com', email_verified: true },
    payload: { currentAmountUsd: 1, status: 'pending' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByPillar: 'Terminal State Locking',
  },
  {
    id: 9,
    name: 'Timestamp Forgery (Backdated createdAt)',
    operation: 'create',
    path: '/offers/off-forged-time',
    actor: { uid: 'buyerUid', email: 'buyer@example.com', email_verified: true },
    payload: {
      id: 'off-forged-time',
      buyerId: 'buyerUid',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByPillar: 'Temporal Integrity (createdAt == request.time)',
  },
  {
    id: 10,
    name: 'Orphaned Offer Referencing Missing Listing',
    operation: 'create',
    path: '/offers/off-orphan',
    actor: { uid: 'buyerUid', email: 'buyer@example.com', email_verified: true },
    payload: {
      id: 'off-orphan',
      listingId: 'lst-nonexistent',
      buyerId: 'buyerUid',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByPillar: 'Global Consistency Invariant (exists parent listing)',
  },
  {
    id: 11,
    name: 'Master Gate Subcollection Bypass',
    operation: 'create',
    path: '/conversations/cnv-private/messages/msg-intruder',
    actor: { uid: 'outsiderUid', email: 'outsider@example.com', email_verified: true },
    payload: {
      id: 'msg-intruder',
      senderId: 'outsiderUid',
      text: 'Unauthorized injection',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 1 (Master Gate get() parent participantIds)',
  },
  {
    id: 12,
    name: 'Audit Log Tampering & Unauthorized Collection Scraping',
    operation: 'update',
    path: '/auditLogs/aud-1',
    actor: { uid: 'normalUserUid', email: 'user@example.com', email_verified: true },
    payload: { action: 'Erased history' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByPillar: 'Immutable Audit Trail & Pillar 8 Secure List Queries',
  },
];
