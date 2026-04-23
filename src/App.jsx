import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import TradeAccounts from '@/pages/TradeAccounts';
import OtherPartners from '@/pages/OtherPartners';
import Contacts from '@/pages/Contacts';
import Interactions from '@/pages/Interactions';
import InteractionDetail from '@/pages/InteractionDetail';
import Actions from '@/pages/Actions';
import Campaigns from '@/pages/Campaigns';
import Reports from '@/pages/Reports';
import TeamMembers from '@/pages/TeamMembers';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0B0B0F]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7F5BFF] to-[#3A1DFF] flex items-center justify-center">
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <div className="w-6 h-6 border-2 border-[#7F5BFF]/30 border-t-[#7F5BFF] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/trade-accounts" element={<TradeAccounts />} />
        <Route path="/other-partners" element={<OtherPartners />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/interactions" element={<Interactions />} />
        <Route path="/interactions/:id" element={<InteractionDetail />} />
        <Route path="/actions" element={<Actions />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/team" element={<TeamMembers />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App