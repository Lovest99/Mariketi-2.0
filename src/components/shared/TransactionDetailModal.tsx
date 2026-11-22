import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Info,
  MapPin,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import { formatDateTime, formatUSD } from '../../lib/utils';
import type { Transaction, TransactionState } from '../../types/mariketi';
import { Button, Input, Modal, StatusLabel, Textarea } from '../ui/DesignSystem';

const LIFECYCLE_ORDER: TransactionState[] = [
  'Offer accepted',
  'Initiated',
  'Awaiting payment',
  'Payment confirmed',
  'Collection scheduled',
  'Delivery scheduled',
  'Handover initiated',
  'Handover verified',
  'Completed',
];

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  roleView: 'buyer' | 'seller' | 'admin';
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  roleView,
}) => {
  const { advanceTransactionState, openDispute, submitSellerReview } = useMariketi();
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');

  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  if (!transaction) return null;

  const currentIdx = LIFECYCLE_ORDER.indexOf(transaction.state);

  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim() || !disputeDesc.trim()) return;
    openDispute(transaction.id, disputeReason.trim(), disputeDesc.trim());
    setShowDispute(false);
    setDisputeReason('');
    setDisputeDesc('');
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    submitSellerReview(transaction.id, rating, reviewComment.trim());
    setShowReview(false);
    setReviewComment('');
  };

  return (
    <Modal
      open={!!transaction}
      onClose={onClose}
      title={`Transaction ${transaction.reference}`}
      subtitle={`${transaction.listingTitle} · ${transaction.quantity} head`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4 sm:space-y-5">
        {/* Visual Milestone Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <span className="font-semibold text-[#10243A]">
              Trade Lifecycle Progress
            </span>
            <span className="font-mono text-[#526071] tabular-nums">
              {currentIdx >= 0
                ? `Stage ${currentIdx + 1} of ${LIFECYCLE_ORDER.length} · ${transaction.state}`
                : transaction.state}
            </span>
          </div>
          <div className="grid grid-cols-9 gap-1">
            {LIFECYCLE_ORDER.map((stage, idx) => (
              <div
                key={stage}
                title={stage}
                className={`h-1.5 rounded-full transition-colors ${
                  transaction.state === 'Disputed' || transaction.state === 'Cancelled'
                    ? 'bg-[#C53939]/55'
                    : idx <= currentIdx
                    ? 'bg-[#1A7A50]'
                    : 'bg-[#DFE6EE]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Transparent Demo Payment Banner */}
        <div className="p-3 rounded-lg bg-[#F7F9FC] border border-[#DFE6EE] flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#1E547A] mt-0.5 shrink-0" />
          <div className="text-xs text-[#526071] leading-relaxed prose-justify">
            <span className="font-semibold text-[#10243A]">{transaction.paymentMode}: </span>
            Payment statuses in this build represent simulated workflow states for operational testing. Live escrow or payment settlement requires an accredited banking/mobile-money integration.
          </div>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 border-y border-[#DFE6EE] py-3.5">
          <div className="min-w-0">
            <p className="text-xs text-[#526071]">Agreed Amount</p>
            <p className="text-xl font-bold font-mono tabular-nums text-[#10243A] mt-0.5">
              {formatUSD(transaction.agreedAmountUsd)}
            </p>
            <p className="text-xs text-[#526071] mt-0.5">{transaction.paymentStatus}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#526071]">Parties</p>
            <p className="text-sm font-semibold text-[#10243A] mt-0.5 truncate">
              Buyer: {transaction.buyerName}
            </p>
            <p className="text-xs text-[#526071] truncate">Seller: {transaction.sellerName}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#526071]">Current State & Handover PIN</p>
            <div className="mt-1">
              <StatusLabel
                tone={
                  transaction.state === 'Completed'
                    ? 'success'
                    : transaction.state === 'Disputed' || transaction.state === 'Cancelled'
                    ? 'danger'
                    : 'info'
                }
                label={transaction.state}
              />
            </div>
            <p className="text-xs font-mono text-[#10243A] mt-1">
              Handover Code: <strong>{transaction.handoverCode}</strong>
            </p>
          </div>
        </div>

        {/* Logistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#F7F9FC] rounded-lg border border-[#DFE6EE]">
            <p className="font-semibold text-[#10243A] inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#E67E17] shrink-0" />
              Collection & Origin
            </p>
            <p className="text-[#526071] mt-1">{transaction.pickupLocation}</p>
            <p className="text-[#526071] mt-0.5">Hub: {transaction.collectionCentreName}</p>
          </div>
          <div className="p-3 bg-[#F7F9FC] rounded-lg border border-[#DFE6EE]">
            <p className="font-semibold text-[#10243A] inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#1E547A] shrink-0" />
              Delivery Destination
            </p>
            <p className="text-[#526071] mt-1">{transaction.deliveryLocation}</p>
            <p className="text-[#526071] mt-0.5">
              Transport Ref: {transaction.transportJobId || 'Pending partner assignment'}
            </p>
          </div>
        </div>

        {/* Workflow Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {transaction.state === 'Awaiting payment' && (roleView === 'buyer' || roleView === 'admin') && (
            <Button
              variant="accent"
              size="sm"
              onClick={() =>
                advanceTransactionState(
                  transaction.id,
                  'Payment confirmed',
                  'Demo payment recorded by buyer (simulated mode — no live charge).'
                )
              }
            >
              Record Demo Payment Confirmation
            </Button>
          )}
          {transaction.state === 'Payment confirmed' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                advanceTransactionState(
                  transaction.id,
                  'Collection scheduled',
                  'Livestock booked for check-in at collection centre.'
                )
              }
            >
              Schedule Collection Check-In
            </Button>
          )}
          {transaction.state === 'Collection scheduled' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                advanceTransactionState(
                  transaction.id,
                  'Delivery scheduled',
                  'Accredited livestock transport scheduled for dispatch.'
                )
              }
            >
              Mark Delivery Scheduled
            </Button>
          )}
          {transaction.state === 'Delivery scheduled' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                advanceTransactionState(
                  transaction.id,
                  'Handover initiated',
                  'Consignment arrived at destination. Awaiting buyer handover PIN confirmation.'
                )
              }
            >
              Initiate Handover
            </Button>
          )}
          {(transaction.state === 'Handover initiated' ||
            transaction.state === 'Handover verified') &&
            (roleView === 'buyer' || roleView === 'admin') && (
              <Button
                variant="accent"
                size="sm"
                onClick={() =>
                  advanceTransactionState(
                    transaction.id,
                    'Completed',
                    `Buyer verified handover code ${transaction.handoverCode} and finalized transaction.`
                  )
                }
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Handover & Complete
              </Button>
            )}

          {transaction.state === 'Completed' && roleView === 'buyer' && !transaction.hasReview && (
            <Button variant="primary" size="sm" onClick={() => setShowReview(true)}>
              <Star className="w-3.5 h-3.5" />
              Submit Seller Review
            </Button>
          )}

          {transaction.state !== 'Completed' &&
            transaction.state !== 'Cancelled' &&
            transaction.state !== 'Disputed' && (
              <Button variant="secondary" size="sm" onClick={() => setShowDispute(true)}>
                <AlertTriangle className="w-3.5 h-3.5 text-[#C53939]" />
                Report Issue / Dispute
              </Button>
            )}
        </div>

        {/* Supporting documents */}
        <div>
          <h4 className="text-xs font-semibold text-[#10243A] mb-2">Supporting Trade Documents</h4>
          <div className="divide-y divide-[#DFE6EE] border border-[#DFE6EE] rounded-lg overflow-hidden">
            {transaction.documents.map((doc) => (
              <div
                key={doc.ref}
                className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileCheck2 className="w-4 h-4 text-[#1E547A] shrink-0" />
                  <span className="font-medium text-[#10243A] truncate">{doc.name}</span>
                  <span className="font-mono text-[#526071] shrink-0">{doc.ref}</span>
                </div>
                <span
                  className={`shrink-0 font-semibold ${
                    doc.verified ? 'text-[#1A7A50]' : 'text-[#9A630A]'
                  }`}
                >
                  {doc.verified ? 'Verified' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Lifecycle progress strip */}
        <div>
          <h4 className="text-xs font-semibold text-[#10243A] mb-2">Event Timeline</h4>
          <ol className="space-y-2.5 border-l border-[#DFE6EE] ml-2 pl-4">
            {transaction.timeline.map((evt) => (
              <li key={evt.id} className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#10243A] border-2 border-white" />
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-xs font-semibold text-[#10243A]">{evt.state}</span>
                  <span className="text-[11px] font-mono text-[#526071] shrink-0">
                    {formatDateTime(evt.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-[#526071] mt-0.5 leading-relaxed prose-justify">
                  {evt.actor}: {evt.note}
                </p>
              </li>
            ))}
          </ol>
          {currentIdx >= 0 && currentIdx < LIFECYCLE_ORDER.length - 1 && (
            <p className="text-xs text-[#526071] mt-2.5 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1E547A] shrink-0" />
              Next milestone: {LIFECYCLE_ORDER[currentIdx + 1]}
            </p>
          )}
        </div>

        {/* Dispute Inline Form */}
        {showDispute && (
          <form
            onSubmit={handleDisputeSubmit}
            className="p-4 bg-[#F7F9FC] border border-[#C53939]/40 rounded-lg space-y-3"
          >
            <h4 className="text-sm font-bold text-[#10243A]">Open Trade Dispute</h4>
            <Input
              label="Dispute Category / Reason"
              placeholder="e.g., Headcount mismatch, veterinary paperwork delay, weight variance"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              required
            />
            <Textarea
              label="Detailed Description & Evidence"
              rows={3}
              value={disputeDesc}
              onChange={(e) => setDisputeDesc(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowDispute(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" size="sm">
                Submit Dispute to Operations
              </Button>
            </div>
          </form>
        )}

        {/* Review Inline Form */}
        {showReview && (
          <form
            onSubmit={handleReviewSubmit}
            className="p-4 bg-[#F7F9FC] border border-[#DFE6EE] rounded-lg space-y-3"
          >
            <h4 className="text-sm font-bold text-[#10243A]">
              Review Seller: {transaction.sellerName}
            </h4>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 rounded focus-visible:outline-2 focus-visible:outline-[#F28C28]"
                  aria-label={`Rate ${star} out of 5`}
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= rating ? 'fill-[#F28C28] text-[#F28C28]' : 'text-[#CBD5E1]'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-mono font-semibold text-[#10243A] ml-1">{rating}.0 / 5.0</span>
            </div>
            <Textarea
              label="Verification & Handover Experience"
              rows={3}
              placeholder="Share how accurately the livestock matched the field verification report..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowReview(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Publish Review
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
