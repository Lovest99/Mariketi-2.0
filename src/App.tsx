import React, { useState } from 'react';
import { MariketiProvider, useMariketi } from './context/MariketiContext';
import type { LivestockCategory } from './types/mariketi';
import { PublicLayout } from './components/layout/PublicLayout';
import { ToastStack } from './components/ui/DesignSystem';
import { HomePage } from './pages/public/HomePage';
import { MarketplacePage } from './pages/public/MarketplacePage';
import { ListingDetailPage } from './pages/public/ListingDetailPage';
import { StaticPages } from './pages/public/StaticPages';
import { AuthFlow } from './pages/auth/AuthFlow';
import { BuyerWorkspace } from './pages/workspaces/BuyerWorkspace';
import { SellerWorkspace } from './pages/workspaces/SellerWorkspace';
import { FieldAgentWorkspace } from './pages/workspaces/FieldAgentWorkspace';
import { CollectionCentreWorkspace } from './pages/workspaces/CollectionCentreWorkspace';
import { TransportWorkspace } from './pages/workspaces/TransportWorkspace';
import { AdminWorkspace } from './pages/workspaces/AdminWorkspace';

const MariketiRouter: React.FC = () => {
  const {
    activeView,
    publicPage,
    currentUser,
    navigatePublic,
    toasts,
    dismissToast,
  } = useMariketi();

  const [marketSearch, setMarketSearch] = useState<{
    query: string;
    category?: LivestockCategory;
    key: number;
  }>({ query: '', key: 0 });

  const handleHeroSearch = (query: string, category?: LivestockCategory) => {
    setMarketSearch({ query, category, key: Date.now() });
    navigatePublic('marketplace');
  };

  let content: React.ReactNode;

  if (activeView === 'workspace' && currentUser) {
    switch (currentUser.role) {
      case 'buyer':
        content = <BuyerWorkspace />;
        break;
      case 'seller':
        content = <SellerWorkspace />;
        break;
      case 'agent':
        content = <FieldAgentWorkspace />;
        break;
      case 'centre':
        content = <CollectionCentreWorkspace />;
        break;
      case 'transport':
        content = <TransportWorkspace />;
        break;
      case 'admin':
        content = <AdminWorkspace />;
        break;
    }
  } else {
    let pageNode: React.ReactNode;
    switch (publicPage) {
      case 'home':
        pageNode = <HomePage onSearchMarketplace={handleHeroSearch} />;
        break;
      case 'marketplace':
        pageNode = (
          <MarketplacePage
            key={marketSearch.key}
            initialQuery={marketSearch.query}
            initialCategory={marketSearch.category}
          />
        );
        break;
      case 'listing-detail':
        pageNode = <ListingDetailPage />;
        break;
      case 'auth':
        pageNode = <AuthFlow />;
        break;
      default:
        pageNode = <StaticPages page={publicPage} />;
        break;
    }
    content = <PublicLayout>{pageNode}</PublicLayout>;
  }

  return (
    <>
      {content}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export default function App() {
  return (
    <MariketiProvider>
      <MariketiRouter />
    </MariketiProvider>
  );
}
