import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, History, XCircle } from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import { formatDateTime, formatUSD } from '../../lib/utils';
import type { Offer } from '../../types/mariketi';
import { Button, EmptyState, Input, Modal, StatusLabel, Textarea } from '../ui/DesignSystem';

interface NegotiationPanelProps {
  roleView: 'buyer' | 'seller';
  onTransactionCreated?: () => void;
}

export const NegotiationPanel: React.FC<NegotiationPanelProps> = ({
  roleView,
  onTransactionCreated,
}) => {
  const {
    offers,
    counterOffer,
    acceptOffer,
    rejectOffer,
    initiateTransactionFromOffer,
  } = useMariketi();

  const [counterTarget, setCounterTarget] = useState<Offer | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterQty, setCounterQty] = useState('');
  const [counterNote, setCounterNote] = useState('');

  const [txnOffer, setTxnOffer] = useState<Offer | null>(null);
  const [deliveryDest, setDeliveryDest] = useState('Highveld Abattoir Depot, Harare');

  const openCounterModal = (offer: Offer) => {
    setCounterTarget(offer);
    setCounterAmount(String(offer.currentAmountUsd));
    setCounterQty(String(offer.quantity));
    setCounterNote('');
  };

  const handleSubmitCounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterTarget) return;
    const amt = Number(counterAmount);
    const qty = Number(counterQty);
    if (!amt || amt <= 0 || !qty || qty <= 0) return;
    counterOffer(counterTarget.id, amt, qty, counterNote);
    setCounterTarget(null);
  };

  const handleInitiateTxn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnOffer) return;
    initiateTransactionFromOffer(txnOffer.id, deliveryDest);
    setTxnOffer(null);
    onTransactionCreated?.();
  };

  if (offers.length === 0) {
    return (
      <EmptyState
        title="No active negotiations"
        description={
          roleView === 'buyer'
            ? 'Submit an offer on any verified listing to start a transparent negotiation trail.'
            : 'Incoming buyer offers and counter-offer histories will appear here.'
        }
      />
    );
  }

  return (
    <div className="space-y-3.5">
      {offers.map((offer) => {
        const canRespond =
          (offer.status === 'pending' || offer.status === 'countered') &&
          offer.lastActorRole !== roleView;

        const tone =
          offer.status === 'accepted' || offer.status === 'converted'
            ? 'success'
            : offer.status === 'rejected' || offer.status === 'expired'
            ? 'danger'
            : 'warning';

        return (
          <div
            key={offer.id}
            className="bg-white border border-[#E5E9ED] rounded-lg p-4 space-y-3.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#697784]">
                  <span className="font-mono font-semibold text-[#10243A]">{offer.reference}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{offer.listingRef}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {roleView === 'buyer' ? `Seller: ${offer.sellerName}` : `Buyer: ${offer.buyerName}`}
                  </span>
                </div>
                <h3 className="text-[15px] font-bold text-[#10243A] mt-1 leading-snug">
                  {offer.listingTitle}
                </h3>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#10243A]">
                  {formatUSD(offer.currentAmountUsd)}
                </p>
                <p className="text-xs text-[#697784] tabular-nums">
                  {offer.quantity} head · {formatUSD(Math.round(offer.currentAmountUsd / Math.max(1, offer.quantity)))}/head
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5E9ED]">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <StatusLabel tone={tone} label={offer.status.replace('_', ' ').toUpperCase()} />
                <span className="text-[#697784] inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Expires {formatDateTime(offer.expiresAt)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canRespond && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => acceptOffer(offer.id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Accept Offer
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openCounterModal(offer)}
                    >
                      Counter-Offer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => rejectOffer(offer.id)}
                    >
                      <XCircle className="w-3.5 h-3.5 text-[#D64B4B]" />
                      Decline
                    </Button>
                  </>
                )}

                {offer.status === 'accepted' && roleView === 'buyer' && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => setTxnOffer(offer)}
                  >
                    Initiate Transaction
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}

                {offer.status === 'converted' && (
                  <span className="text-xs font-medium text-[#21865B]">
                    Converted to active transaction
                  </span>
                )}
              </div>
            </div>

            {/* Immutable Offer History */}
            <div className="pt-3 border-t border-[#E5E9ED]">
              <p className="text-xs font-semibold text-[#10243A] inline-flex items-center gap-1.5 mb-2.5">
                <History className="w-3.5 h-3.5 text-[#697784]" />
                Immutable Negotiation History ({offer.history.length} entries)
              </p>
              <div className="space-y-2">
                {offer.history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 text-xs py-2 px-3 bg-[#FAFAF7] rounded border border-[#E5E9ED]"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <span className="font-semibold text-[#10243A]">
                        {entry.actorName} ({entry.actorRole})
                      </span>{' '}
                      <span className="text-[#697784]">
                        {entry.action.replace('_', ' ')} —{' '}
                      </span>
                      <span className="font-mono font-semibold text-[#10243A] tabular-nums">
                        {formatUSD(entry.amountUsd)} ({entry.quantity} head)
                      </span>
                      <p className="text-[#697784] prose-justify leading-relaxed">{entry.note}</p>
                    </div>
                    <span className="font-mono text-[11px] text-[#697784] whitespace-nowrap shrink-0">
                      {formatDateTime(entry.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Counter Offer Modal */}
      <Modal
        open={!!counterTarget}
        onClose={() => setCounterTarget(null)}
        title="Submit Counter-Offer"
        subtitle={counterTarget ? `${counterTarget.reference} · ${counterTarget.listingTitle}` : ''}
      >
        <form onSubmit={handleSubmitCounter} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Total Offer Amount (USD)"
              type="number"
              min={1}
              required
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
            />
            <Input
              label="Quantity (Head)"
              type="number"
              min={1}
              required
              value={counterQty}
              onChange={(e) => setCounterQty(e.target.value)}
            />
          </div>
          <Textarea
            label="Commercial Terms / Notes"
            rows={3}
            placeholder="Specify handover hub, weighing expectations, or transport timeline..."
            value={counterNote}
            onChange={(e) => setCounterNote(e.target.value)}
            required
          />
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCounterTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Send Counter-Offer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Initiate Transaction Modal */}
      <Modal
        open={!!txnOffer}
        onClose={() => setTxnOffer(null)}
        title="Initiate Livestock Transaction"
        subtitle={txnOffer ? `${txnOffer.reference} · Agreed ${formatUSD(txnOffer.currentAmountUsd)}` : ''}
      >
        <form onSubmit={handleInitiateTxn} className="space-y-4">
          <div className="p-3 bg-[#FAFAF7] border border-[#E5E9ED] rounded-md text-xs text-[#697784] leading-relaxed prose-justify">
            <strong className="text-[#10243A] block mb-1 text-left">Simulated Payment Environment Notice</strong>
            MARIKETI currently runs in a simulated settlement environment. No real bank transfer, card charge, or live escrow funds are collected during this workflow.
          </div>
          <Input
            label="Delivery Destination (Farm, Feedlot, or Abattoir)"
            value={deliveryDest}
            onChange={(e) => setDeliveryDest(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setTxnOffer(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent">
              Create Transaction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
