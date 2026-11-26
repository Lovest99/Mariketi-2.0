# MARIKETI 2.0 Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Identity & Role Integrity:**
   - Every private `/users/{userId}` document is keyed by Firebase Auth `uid`, strictly readable only by `request.auth.uid == userId` or a verified Admin.
   - Standard users may NEVER self-assign `role == 'admin'`, `verified == true` (for non-buyers), or mutate `role`, `status`, or `verified` after account creation.
   - Admin privileges require BOTH `request.auth.token.email_verified == true` AND either the bootstrapped owner email (`brightcheteni1@gmail.com`) or an existing `/admins/{uid}` record.
2. **PII Isolation:**
   - `/users/{userId}` holds `email`, `phone`, and personal preferences. Non-owners (except admins) are blocked from `get` and `list`.
   - `/publicProfiles/{userId}` contains zero PII (no `email`, no `phone`).
3. **Referential & Temporal Integrity:**
   - Offers require an existing parent `/listings/{listingId}` document on create.
   - Reviews require an existing `/transactions/{transactionId}` where the reviewer is the `buyerId`.
   - Disputes require an existing `/transactions/{transactionId}` where the opener is either `buyerId` or `sellerId`.
   - All `createdAt` fields must equal `request.time` on create and remain immutable (`incoming().createdAt == existing().createdAt`) on update; all `updatedAt` fields must equal `request.time`.
4. **Master Gate (Subcollection Sync):**
   - `/conversations/{conversationId}/messages/{messageId}` fetches the parent `/conversations/{conversationId}` via `get()` and requires `request.auth.uid in parent.data.participantIds`.
5. **Terminal State Locking:**
   - Offers in `['rejected', 'expired', 'converted']`, Transactions in `['Completed', 'Cancelled']` (except buyer `hasReview` flag), Field Tasks in `['Completed']`, Collection Centre Records in `['Released']`, Transport Jobs in `['Delivered']`, and Disputes in `['Resolved']` cannot be mutated by non-admins.
6. **Zero-Trust List Queries (No Client Delegation & No `get()`/`exists()` in `list`):**
   - Every `allow list` explicitly filters `resource.data` against `request.auth.uid` or public status (`active`/`Available`), with zero `get()`/`exists()` lookups inside `allow list`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Path | Adversarial Payload / Action | Expected Result |
|---|---------------|-------------|------------------------------|-----------------|
| 1 | **Self-Assigned Admin Privilege Escalation** | `CREATE /users/attackerUid` | `{ id: "attackerUid", uid: "attackerUid", role: "admin", verified: true, ... }` | `PERMISSION_DENIED` |
| 2 | **Shadow Field Injection ("Ghost Field")** | `CREATE /listings/lst-evil` | Valid listing + `{ isFeaturedBySystem: true, bypassVerification: true }` | `PERMISSION_DENIED` |
| 3 | **Email Spoofing (Unverified Admin Email)** | `GET /users/victimUid` | `auth.token = { email: "brightcheteni1@gmail.com", email_verified: false }` | `PERMISSION_DENIED` |
| 4 | **PII Blanket Read Attack** | `GET /users/victimUid` | Authenticated user `attackerUid` reading `victimUid`'s phone/email | `PERMISSION_DENIED` |
| 5 | **Identity Spoofing on Listing Creation** | `CREATE /listings/lst-spoof` | Authenticated as `attackerUid` setting `sellerId: "legitSellerUid"` | `PERMISSION_DENIED` |
| 6 | **ID Poisoning (Resource Exhaustion)** | `CREATE /listings/!!bad..id..1500chars` | Path ID violating `^[a-zA-Z0-9_\-]+$` or > 128 chars | `PERMISSION_DENIED` |
| 7 | **Value Poisoning on Whitelisted Update Key** | `UPDATE /listings/lst-1` | Seller updating `title` to `12345` (number) or 5000-char string | `PERMISSION_DENIED` |
| 8 | **Terminal State Bypass** | `UPDATE /offers/off-done` | Buyer modifying `currentAmountUsd` on an offer with `status == 'converted'` | `PERMISSION_DENIED` |
| 9 | **Timestamp Forgery** | `CREATE /offers/off-backdate` | Valid offer with client-supplied `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` | `PERMISSION_DENIED` |
| 10 | **Orphaned Record Injection** | `CREATE /offers/off-orphan` | Offer referencing non-existent `listingId: "lst-does-not-exist"` | `PERMISSION_DENIED` |
| 11 | **Master Gate Subcollection Bypass** | `CREATE /conversations/cnv-1/messages/msg-x` | Authenticated outsider not in parent `cnv-1.participantIds` posting message | `PERMISSION_DENIED` |
| 12 | **Audit Log Tampering & Blanket Query Scraping** | `UPDATE /auditLogs/aud-1` / `LIST /offers` | Non-admin attempting to edit an audit log or list all offers without buyer/seller ownership | `PERMISSION_DENIED` |
