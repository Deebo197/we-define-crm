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
import ClientDetail from '@/pages/ClientDetail';
import TradeAccounts from '@/pages/TradeAccounts';
import OtherPartners from '@/pages/OtherPartners';
import Contacts from '@/pages/Contacts';
import Interactions from '@/pages/Interactions';
import InteractionDetail from '@/pages/InteractionDetail';
import Actions from '@/pages/Actions';
import Campaigns from '@/pages/Campaigns';
import Reports from '@/pages/Reports';
import TeamMembers from '@/pages/TeamMembers';
import ImportTradeAccounts from '@/pages/ImportTradeAccounts';
import ImportContacts from '@/pages/ImportContacts';

// Expenses module
import AdminRoute from '@/components/expenses/AdminRoute';
import ExpensesOverview from '@/pages/expenses/ExpensesOverview';
import SubmitExpense from '@/pages/expenses/SubmitExpense';
import MyExpenses from '@/pages/expenses/MyExpenses';
import AllExpenses from '@/pages/expenses/AllExpenses';
import ReceiptInbox from '@/pages/expenses/ReceiptInbox';
import MileageLog from '@/pages/expenses/MileageLog';
import Reimbursements from '@/pages/expenses/Reimbursements';
import Accounts from '@/pages/expenses/Accounts';
import ClientReport from '@/pages/expenses/ClientReport';
import ExpensesHelp from '@/pages/expenses/Help';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <img src="/brand/repevo-favicon.svg" alt="Repevo" className="w-10 h-10 rounded-xl" />
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
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
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/trade-accounts" element={<TradeAccounts />} />
        <Route path="/other-partners" element={<OtherPartners />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/interactions" element={<Interactions />} />
        <Route path="/interactions/:id" element={<InteractionDetail />} />
        <Route path="/interactions/:id/:mode" element={<InteractionDetail />} />
        <Route path="/actions" element={<Actions />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/team" element={<TeamMembers />} />
        <Route path="/import-trade-accounts" element={<ImportTradeAccounts />} />
        <Route path="/import-contacts" element={<ImportContacts />} />
        {/* Expenses module */}
        <Route path="/expenses" element={<ExpensesOverview />} />
        <Route path="/expenses/submit" element={<SubmitExpense />} />
        <Route path="/expenses/mine" element={<MyExpenses />} />
        <Route path="/expenses/all" element={<AdminRoute><AllExpenses /></AdminRoute>} />
        <Route path="/expenses/inbox" element={<ReceiptInbox />} />
        <Route path="/expenses/mileage" element={<MileageLog />} />
        <Route path="/expenses/reimbursements" element={<Reimbursements />} />
        <Route path="/expenses/accounts" element={<AdminRoute><Accounts /></AdminRoute>} />
        <Route path="/expenses/client-report" element={<AdminRoute><ClientReport /></AdminRoute>} />
        <Route path="/expenses/help" element={<ExpensesHelp />} />
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
