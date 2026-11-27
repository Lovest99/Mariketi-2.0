import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useMariketi } from '../../context/MariketiContext';
import { SUBSCRIPTION_PLANS } from '../../data/seedData';
import {
  ASSET_IMAGES,
  cn,
  formatDate,
  formatDateTime,
  formatUSD,
  getCountryFlag,
} from '../../lib/utils';
import type { AgriProductCategory, ProductOrder } from '../../types/mariketi';
import { CountrySelect } from '../../components/shared/CountrySelect';
import { ProductDetailView } from '../../components/store/ProductDetailView';
import {
  Button,
  Card,
  Drawer,
  EmptyState,
  Input,
  SafeImage,
  StatusLabel,
} from '../../components/ui/DesignSystem';

type StoreTab = 'store' | 'plans' | 'orders';

const PRODUCT_CATEGORIES: { value: 'All' | AgriProductCategory; short: string }[] = [
  { value: 'All', short: 'All' },
  { value: 'Veterinary & Vaccines', short: 'Vaccines' },
  { value: 'Traceability & Ear Tags', short: 'Ear Tags' },
  { value: 'Nutrition & Minerals', short: 'Minerals' },
  { value: 'Ranch Equipment', short: 'Equipment' },
];

const ORDER_STATUS_TONE: Record<
  ProductOrder['status'],
  'success' | 'warning' | 'info' | 'danger' | 'neutral'
> = {
  Pending: 'warning',
  Confirmed: 'info',
  Dispatched: 'info',
  Delivered: 'success',
  Cancelled: 'danger',
};

export const StorePlansPage: React.FC = () => {
  const {
    products,
    cart,
    productOrders,
    currentUser,
    currentUserSubscription,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    checkoutCart,
    cancelProductOrder,
    activateSubscription,
    updateSubscriptionStatus,
    openAuth,
  } = useMariketi();

  const [activeTab, setActiveTab] = useState<StoreTab>('store');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'All' | AgriProductCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [cartOpen, setCartOpen] = useState(false);

  // Checkout form state
  const [deliveryCountry, setDeliveryCountry] = useState(currentUser?.country || 'Zimbabwe');
  const [deliveryAddress, setDeliveryAddress] = useState(
    currentUser ? `${currentUser.district}, ${currentUser.province}` : ''
  );

  const hasActiveSub = currentUserSubscription?.status === 'active';

  const selectedProduct = useMemo(
    () => (selectedProductId ? products.find((p) => p.id === selectedProductId) || null : null),
    [products, selectedProductId]
  );

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    const sameCat = products.filter(
      (p) => p.id !== selectedProduct.id && p.category === selectedProduct.category
    );
    const others = products.filter(
      (p) => p.id !== selectedProduct.id && p.category !== selectedProduct.category
    );
    return [...sameCat, ...others].slice(0, 3);
  }, [products, selectedProduct]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${p.name} ${p.sku} ${p.brand} ${p.category} ${p.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, categoryFilter, searchQuery]);

  const cartDetails = useMemo(() => {
    return cart
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const discountPct =
          hasActiveSub && product.subscriptionEligible
            ? product.subscriptionDiscountPct || 10
            : 0;
        const effectiveUnitPrice = Math.round(
          product.priceUsd * (1 - discountPct / 100)
        );
        return {
          ...item,
          product,
          discountPct,
          effectiveUnitPrice,
          lineSubtotal: effectiveUnitPrice * item.qty,
          lineRetail: product.priceUsd * item.qty,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [cart, products, hasActiveSub]);

  const cartItemCount = cartDetails.reduce((sum, i) => sum + i.qty, 0);
  const cartRetailTotal = cartDetails.reduce((sum, i) => sum + i.lineRetail, 0);
  const cartFinalTotal = cartDetails.reduce((sum, i) => sum + i.lineSubtotal, 0);
  const cartSavings = Math.max(0, cartRetailTotal - cartFinalTotal);

  const myOrders = useMemo(() => {
    if (!currentUser) return [];
    return productOrders.filter((o) => o.buyerId === currentUser.id);
  }, [productOrders, currentUser]);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuth('login');
      return;
    }
    if (!deliveryAddress.trim()) return;
    const order = checkoutCart(deliveryAddress.trim(), deliveryCountry);
    if (order) {
      setCartOpen(false);
      setSelectedProductId(null);
      setActiveTab('orders');
    }
  };

  const handleBuyNow = (productId: string, qty: number) => {
    addToCart(productId, qty);
    setCartOpen(true);
  };

  return (
    <div>
      {/* Compact Editorial Banner */}
      <section className="relative bg-[#071320] text-white overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <SafeImage
            src={ASSET_IMAGES.agriVetSupplies}
            alt="MARIKETI veterinary vaccines, RFID ear tags, mineral blocks and ranch supplies"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#071320]/96 via-[#0A1C30]/88 to-[#091827]/60" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-9">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-xs font-semibold text-[#F69B3D]">
                Agri-Vet Store &amp; Plans
              </p>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white">
                Vaccines, RFID tags &amp; rancher plans.
              </h1>
              <p className="mt-2 text-sm text-slate-200 leading-snug">
                Cold-chain vaccines, ear tags, mineral licks &amp; weighing gear dispatched to your farm or MARIKETI hub.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {hasActiveSub && currentUserSubscription && (
                <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs">
                  <p className="text-slate-300 leading-none">Active Plan</p>
                  <p className="font-semibold text-[#F69B3D] mt-1 whitespace-nowrap">
                    {currentUserSubscription.planName}
                  </p>
                </div>
              )}
              <Button
                variant="accent"
                size="md"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="w-4 h-4" />
                Cart ({cartItemCount}) · {formatUSD(cartFinalTotal)}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Zero-Scroll 3-Column Segmented Tab Bar */}
      <div className="bg-white border-b border-[#DCE4EC]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div
            role="tablist"
            aria-label="Store and subscription sections"
            className="grid grid-cols-3 sm:inline-flex rounded-lg bg-[#EEF3F8] p-1 border border-[#DCE4EC] w-full sm:w-auto"
          >
            {(
              [
                { id: 'store', label: 'Store' },
                { id: 'plans', label: 'Plans' },
                { id: 'orders', label: `Orders (${myOrders.length})` },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id !== 'store') setSelectedProductId(null);
                  }}
                  className={cn(
                    'inline-flex items-center justify-center px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#F28C28]',
                    active
                      ? 'bg-[#10243A] text-white'
                      : 'text-[#526071] hover:text-[#10243A]'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-[#526071] whitespace-nowrap truncate">
            Demo mode · Simulated checkout &amp; billing
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* ============================================================
            TAB 1: AGRI-VET PRODUCTS STORE (CATALOG OR FULL DETAIL VIEW)
            ============================================================ */}
        {activeTab === 'store' && (
          selectedProduct ? (
            <ProductDetailView
              product={selectedProduct}
              relatedProducts={relatedProducts}
              hasActiveSub={hasActiveSub}
              inCartQty={cart.find((c) => c.productId === selectedProduct.id)?.qty || 0}
              onBack={() => setSelectedProductId(null)}
              onAddToCart={addToCart}
              onBuyNow={handleBuyNow}
              onSelectProduct={(id) => setSelectedProductId(id)}
              onViewPlans={() => {
                setSelectedProductId(null);
                setActiveTab('plans');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ) : (
            <div className="space-y-5">
              {/* Compact Category Strip & Search */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategoryFilter(cat.value)}
                      className={cn(
                        'h-8 px-3 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap',
                        categoryFilter === cat.value
                          ? 'bg-[#10243A] text-white border-[#10243A]'
                          : 'bg-white text-[#526071] border-[#CFD9E3] hover:text-[#10243A]'
                      )}
                    >
                      {cat.short}
                    </button>
                  ))}
                </div>

                <div className="relative w-full lg:w-72">
                  <Search className="w-4 h-4 text-[#526071] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search vaccines, ear tags, SKU..."
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-[#CFD9E3] text-sm text-[#0F1B2A] placeholder:text-[#667587] focus:outline-none focus:border-[#10243A]"
                  />
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <EmptyState
                  title="No supplies match your filter"
                  description="Select All categories or clear your search keyword."
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setCategoryFilter('All');
                        setSearchQuery('');
                      }}
                    >
                      Reset Store Filters
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredProducts.map((product) => {
                    const inCartQty =
                      cart.find((c) => c.productId === product.id)?.qty || 0;
                    const discountPct =
                      product.subscriptionEligible && product.subscriptionDiscountPct
                        ? product.subscriptionDiscountPct
                        : 0;
                    const memberPrice = discountPct
                      ? Math.round(product.priceUsd * (1 - discountPct / 100))
                      : product.priceUsd;

                    return (
                      <Card key={product.id} className="overflow-hidden flex flex-col">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductId(product.id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="aspect-[4/3] bg-[#071320] overflow-hidden text-left block w-full group"
                        >
                          <SafeImage
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                          />
                        </button>

                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-semibold text-[#1A4D73] truncate">
                                {product.category}
                              </span>
                              <span className="font-mono text-[#526071] shrink-0 tabular-nums">
                                {product.sku}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductId(product.id);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="mt-1.5 text-left block w-full group"
                            >
                              <h3 className="text-sm font-bold text-[#10243A] group-hover:text-[#1A4D73] leading-snug line-clamp-2 transition-colors">
                                {product.name}
                              </h3>
                            </button>

                            <p className="text-xs text-[#526071] mt-1 truncate">
                              {product.brand} · {product.unitLabel}
                            </p>

                            <p className="mt-1.5 text-xs text-[#526071] leading-relaxed line-clamp-2">
                              {product.description}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-[#DCE4EC] space-y-2.5">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="font-mono text-lg font-extrabold text-[#10243A] tabular-nums whitespace-nowrap">
                                {formatUSD(hasActiveSub ? memberPrice : product.priceUsd)}
                              </p>
                              <span className="text-[11px] font-mono text-[#526071] tabular-nums whitespace-nowrap">
                                {product.stockQty} in stock
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-[#156B45] font-semibold truncate">
                                {discountPct > 0
                                  ? hasActiveSub
                                    ? `${discountPct}% off applied`
                                    : `Save ${discountPct}% w/ Plan`
                                  : product.vetApproved
                                  ? 'Vet Approved'
                                  : 'Commercial Grade'}
                              </span>
                              {product.vetApproved && discountPct > 0 && (
                                <span className="text-[#156B45] font-semibold shrink-0 whitespace-nowrap">
                                  Vet Approved
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-5 gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="col-span-2"
                                onClick={() => {
                                  setSelectedProductId(product.id);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                              >
                                Details
                              </Button>
                              <Button
                                variant={inCartQty > 0 ? 'accent' : 'primary'}
                                size="sm"
                                className="col-span-3"
                                onClick={() => addToCart(product.id, 1)}
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                {inCartQty > 0 ? `In Cart (${inCartQty})` : 'Add'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}

        {/* ============================================================
            TAB 2: MARIKETI SUBSCRIPTIONS
            ============================================================ */}
        {activeTab === 'plans' && (
          <div className="space-y-7">
            {/* Active Membership Management Card */}
            {currentUserSubscription && (
              <Card className="p-5 border-[#10243A]/25 bg-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <p className="text-xs font-semibold text-[#1A4D73]">
                        Your MARIKETI Membership
                      </p>
                      <StatusLabel
                        tone={
                          currentUserSubscription.status === 'active'
                            ? 'success'
                            : currentUserSubscription.status === 'paused'
                            ? 'warning'
                            : 'danger'
                        }
                        label={
                          currentUserSubscription.status.charAt(0).toUpperCase() +
                          currentUserSubscription.status.slice(1)
                        }
                      />
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-[#10243A]">
                      {currentUserSubscription.planName}
                    </h3>
                    <p className="mt-1 text-xs text-[#526071]">
                      <span className="font-mono font-semibold text-[#10243A] tabular-nums">
                        {formatUSD(currentUserSubscription.amountUsd)}
                      </span>{' '}
                      / {currentUserSubscription.billingCycle === 'annual' ? 'year' : 'month'} · Renews{' '}
                      {formatDate(currentUserSubscription.renewsAt)} · {currentUserSubscription.paymentMode}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {currentUserSubscription.status === 'active' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateSubscriptionStatus('paused')}
                      >
                        Pause Plan
                      </Button>
                    )}
                    {currentUserSubscription.status === 'paused' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => updateSubscriptionStatus('active')}
                      >
                        Resume Plan
                      </Button>
                    )}
                    {currentUserSubscription.status !== 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateSubscriptionStatus('cancelled')}
                      >
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Header + Monthly/Annual Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#1A4D73]">
                  Commercial Memberships
                </p>
                <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-[#10243A]">
                  Plans for buyers, ranchers &amp; auctioneers
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#526071] max-w-xl">
                  Priority auction paddles, monthly vet credits, and automatic Agri-Vet store discounts.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:inline-flex rounded-lg bg-white p-1 border border-[#DCE4EC] shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors',
                    billingCycle === 'monthly'
                      ? 'bg-[#10243A] text-white'
                      : 'text-[#526071] hover:text-[#10243A]'
                  )}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors',
                    billingCycle === 'annual'
                      ? 'bg-[#10243A] text-white'
                      : 'text-[#526071] hover:text-[#10243A]'
                  )}
                >
                  Annual (Save 17%)
                </button>
              </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isCurrentPlan =
                  currentUserSubscription?.planId === plan.id &&
                  currentUserSubscription?.status === 'active';
                const price =
                  billingCycle === 'annual' ? plan.annualUsd : plan.monthlyUsd;
                const monthlyEquivalent =
                  billingCycle === 'annual'
                    ? Math.round(plan.annualUsd / 12)
                    : plan.monthlyUsd;

                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      'p-5 flex flex-col justify-between gap-5',
                      plan.recommended && 'border-[#F28C28] ring-1 ring-[#F28C28]/40'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#1A4D73]">
                          {plan.audience}
                        </span>
                        {plan.recommended && (
                          <span className="text-[11px] font-bold text-[#B85E09]">
                            Recommended
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 text-lg font-bold text-[#10243A] leading-snug">
                        {plan.name}
                      </h3>

                      <div className="mt-3 pb-3.5 border-b border-[#DCE4EC]">
                        <div className="flex items-baseline gap-1">
                          <span className="font-mono text-3xl font-extrabold text-[#10243A] tabular-nums">
                            {formatUSD(price)}
                          </span>
                          <span className="text-xs text-[#526071]">
                            / {billingCycle === 'annual' ? 'year' : 'month'}
                          </span>
                        </div>
                        {billingCycle === 'annual' && (
                          <p className="text-[11px] text-[#156B45] font-medium mt-0.5 font-mono tabular-nums">
                            Effective {formatUSD(monthlyEquivalent)}/mo billed annually
                          </p>
                        )}
                        {plan.includesSuppliesCreditUsd && (
                          <p className="text-[11px] font-semibold text-[#B85E09] mt-1 font-mono tabular-nums">
                            Includes {formatUSD(plan.includesSuppliesCreditUsd)}/mo Agri-Vet credit
                          </p>
                        )}
                      </div>

                      <p className="mt-3 text-xs text-[#526071] leading-relaxed">
                        {plan.summary}
                      </p>

                      <ul className="mt-4 space-y-2 text-xs text-[#0F1B2A]">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-[#156B45] shrink-0 mt-0.5" />
                            <span className="text-[#526071] leading-snug">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-[#DCE4EC] space-y-2">
                      <Button
                        variant={
                          isCurrentPlan
                            ? 'secondary'
                            : plan.recommended
                            ? 'accent'
                            : 'primary'
                        }
                        size="md"
                        className="w-full"
                        disabled={isCurrentPlan}
                        onClick={() => {
                          if (!currentUser) {
                            openAuth('login');
                            return;
                          }
                          activateSubscription(plan.id, billingCycle);
                        }}
                      >
                        {isCurrentPlan ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-[#156B45]" />
                            Active Plan
                          </>
                        ) : currentUserSubscription ? (
                          'Switch to Plan'
                        ) : (
                          'Activate Plan'
                        )}
                      </Button>
                      <p className="text-[11px] text-center text-[#526071]">
                        Simulated demo billing · No live card charged
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 3: MY PRODUCT ORDERS
            ============================================================ */}
        {activeTab === 'orders' && (
          <div className="space-y-5">
            {!currentUser ? (
              <EmptyState
                title="Sign in to view your Agri-Vet orders"
                description="Your supply orders and collection-hub delivery confirmations are stored in your MARIKETI account."
                action={
                  <Button variant="primary" onClick={() => openAuth('login')}>
                    Sign In
                  </Button>
                }
              />
            ) : myOrders.length === 0 ? (
              <EmptyState
                title="No Agri-Vet orders placed yet"
                description="Add vaccines, ear tags, mineral licks, or weighing hardware to your cart to submit your first order."
                action={
                  <Button variant="primary" onClick={() => setActiveTab('store')}>
                    Browse Agri-Vet Store
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {myOrders.map((order) => (
                  <Card key={order.id} className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#DFE6EE]">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-sm font-bold text-[#10243A] tabular-nums">
                            {order.reference}
                          </span>
                          <StatusLabel
                            tone={ORDER_STATUS_TONE[order.status]}
                            label={order.status}
                          />
                        </div>
                        <p className="text-xs text-[#526071] mt-1">
                          Placed {formatDateTime(order.createdAt)} · {getCountryFlag(order.country)}{' '}
                          {order.country} · {order.deliveryAddress}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-[#526071]">Order Total</p>
                          <p className="font-mono text-lg font-extrabold text-[#10243A] tabular-nums">
                            {formatUSD(order.totalUsd)}
                          </p>
                        </div>
                        {(order.status === 'Pending' || order.status === 'Confirmed') && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => cancelProductOrder(order.id)}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3.5 divide-y divide-[#DFE6EE]">
                      {order.items.map((item) => (
                        <div
                          key={item.productId}
                          className="py-2 flex items-center justify-between gap-4 text-sm"
                        >
                          <span className="text-[#10243A] font-medium">
                            {item.name}{' '}
                            <span className="font-mono text-xs text-[#526071] tabular-nums">
                              × {item.qty}
                            </span>
                          </span>
                          <span className="font-mono font-semibold text-[#10243A] tabular-nums">
                            {formatUSD(item.unitPriceUsd * item.qty)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-[11px] text-[#526071]">
                      {order.paymentMode}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slide-Over Cart & Demo Checkout Drawer */}
      <Drawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title={`Agri-Vet Cart (${cartItemCount} ${cartItemCount === 1 ? 'item' : 'items'})`}
      >
        {cartDetails.length === 0 ? (
          <EmptyState
            title="Your supply cart is empty"
            description="Browse veterinary vaccines, RFID ear tags, mineral licks, and ranch equipment to start an order."
            action={
              <Button variant="primary" onClick={() => setCartOpen(false)}>
                Continue Shopping
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            <div className="divide-y divide-[#DFE6EE] border border-[#DFE6EE] rounded-xl overflow-hidden">
              {cartDetails.map((item) => (
                <div
                  key={item.productId}
                  className="p-3.5 bg-white flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#10243A] leading-snug">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-[#526071] mt-0.5">
                      {formatUSD(item.effectiveUnitPrice)} / {item.product.unitLabel}
                      {item.discountPct > 0 && (
                        <span className="text-[#1A7A50] font-semibold">
                          {' '}
                          · {item.discountPct}% member savings
                        </span>
                      )}
                    </p>
                    <div className="mt-2.5 inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => updateCartQty(item.productId, item.qty - 1)}
                        className="h-7 w-7 rounded border border-[#D4DDE6] flex items-center justify-center text-[#10243A] hover:bg-[#F3F6F9]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono text-xs font-bold tabular-nums">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => updateCartQty(item.productId, item.qty + 1)}
                        className="h-7 w-7 rounded border border-[#D4DDE6] flex items-center justify-center text-[#10243A] hover:bg-[#F3F6F9]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove item"
                        onClick={() => removeFromCart(item.productId)}
                        className="ml-2 text-xs text-[#C53939] hover:underline inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="font-mono text-sm font-bold text-[#10243A] tabular-nums shrink-0">
                    {formatUSD(item.lineSubtotal)}
                  </p>
                </div>
              ))}
            </div>

            {/* Order Totals */}
            <div className="rounded-xl bg-[#F7F9FC] border border-[#DFE6EE] p-4 space-y-2 text-sm">
              <div className="flex justify-between text-[#526071]">
                <span>Retail Subtotal</span>
                <span className="font-mono tabular-nums">{formatUSD(cartRetailTotal)}</span>
              </div>
              {cartSavings > 0 && (
                <div className="flex justify-between text-[#1A7A50] font-semibold">
                  <span>Active Subscription Discount</span>
                  <span className="font-mono tabular-nums">-{formatUSD(cartSavings)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#DFE6EE] flex justify-between font-bold text-[#10243A] text-base">
                <span>Total Due (Demo)</span>
                <span className="font-mono tabular-nums">{formatUSD(cartFinalTotal)}</span>
              </div>
            </div>

            {/* Checkout Form */}
            <form onSubmit={handleCheckout} className="space-y-4">
              <CountrySelect
                label="Delivery Country"
                value={deliveryCountry}
                onChange={setDeliveryCountry}
              />
              <Input
                label="Farm Delivery Address or MARIKETI Collection Hub"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="e.g. Gwanda Sale Yard Hub or Plot 14, Umzingwane"
                required
              />

              <div className="rounded-lg bg-[#FFF8EB] border border-[#F2C98A] p-3 text-xs text-[#7A4B06] leading-relaxed">
                <strong>Simulated Demo Checkout:</strong> Submitting this order persists it directly in MARIKETI’s database for operational review. No live card or mobile-money funds are charged.
              </div>

              <div className="flex items-center gap-2.5">
                <Button type="button" variant="secondary" onClick={clearCart}>
                  Clear Cart
                </Button>
                <Button type="submit" variant="accent" size="lg" className="flex-1">
                  {currentUser ? 'Confirm Demo Order' : 'Sign In to Checkout'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Drawer>
    </div>
  );
};
