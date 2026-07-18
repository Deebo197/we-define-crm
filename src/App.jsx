import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
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
import Events from '@/pages/Events';
import EventEditor from '@/pages/EventEditor';
import Reports from '@/pages/Reports';
import TeamMembers from '@/pages/TeamMembers';
import ImportTradeAccounts from '@/pages/ImportTradeAccounts';
import ImportContacts from '@/pages/ImportContacts';
import Todos from '@/pages/Todos';
import CompanyPage from '@/pages/CompanyPage';
import PersonPage from '@/pages/PersonPage';
import Targeting from '@/pages/Targeting';
import Pipeline from '@/pages/Pipeline';
import PipelineMatrix from '@/pages/PipelineMatrix';
import MyWeek from '@/pages/MyWeek';
import Trainings from '@/pages/Trainings';
import MonthlyPack from '@/pages/MonthlyPack';
import ReferenceLists from '@/pages/ReferenceLists';

// Document library
import Documents from '@/pages/Documents';
import ClientDocuments from '@/pages/ClientDocuments';

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

// Competitor Analysis module (MarketGauge)
import CompetitorAdminRoute from '@/components/competitor/AdminRoute';
import CompetitorOverview from '@/pages/competitor/CompetitorOverview';
import CreateScenario from '@/pages/competitor/CreateScenario';
import MarketPriceEntry from '@/pages/competitor/MarketPriceEntry';
import CompetitorAnalysis from '@/pages/competitor/Analysis';
import CompetitorAdmin from '@/pages/competitor/Admin';

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
        <Route path="/trade-accounts/:id" element={<CompanyPage />} />
        <Route path="/other-partners" element={<OtherPartners />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/contacts/:id" element={<PersonPage />} />
        <Route path="/targeting" element={<Targeting />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/pipeline/matrix" element={<PipelineMatrix />} />
        <Route path="/my-week" element={<MyWeek />} />
        <Route path="/trainings" element={<Trainings />} />
        <Route path="/settings/lists" element={<AdminRoute><ReferenceLists /></AdminRoute>} />
        <Route path="/interactions" element={<Interactions />} />
        <Route path="/interactions/:id" element={<InteractionDetail />} />
        <Route path="/interactions/:id/:mode" element={<InteractionDetail />} />
        <Route path="/actions" element={<Actions />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventEditor />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/pack" element={<MonthlyPack />} />
        <Route path="/team" element={<TeamMembers />} />
        <Route path="/todos" element={<Todos />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/documents/:clientId" element={<ClientDocuments />} />
        <Route path="/import-trade-accounts" element={<ImportTradeAccounts />} />
        <Route path="/import-contacts" element={<ImportContacts />} />
        {/* Expenses module */}
        <Route path="/expenses" element={<ExpensesOverview />} />
        <Route path="/expenses/submit" element={<SubmitExpense />} />
        <Route path="/expenses/mine" element={<MyExpenses />} />
        <Route path="/expenses/all" element={<AdminRoute><AllExpenses /></AdminRoute>} />
        <Route path="/expenses/inbox" element={<ReceiptInbox />} />
        <Route path="/expenses/mileage" element={<MileageLog />} />
        <Route path="/expenses/reimbursements" element={<AdminRoute><Reimbursements /></AdminRoute>} />
        <Route path="/expenses/accounts" element={<AdminRoute><Accounts /></AdminRoute>} />
        <Route path="/expenses/client-report" element={<AdminRoute><ClientReport /></AdminRoute>} />
        <Route path="/expenses/help" element={<ExpensesHelp />} />
        {/* Competitor Analysis module */}
        <Route path="/competitor-analysis" element={<CompetitorOverview />} />
        <Route path="/competitor-analysis/new-scenario" element={<CreateScenario />} />
        <Route path="/competitor-analysis/price-entry" element={<MarketPriceEntry />} />
        <Route path="/competitor-analysis/analysis" element={<CompetitorAnalysis />} />
        <Route path="/competitor-analysis/admin" element={<CompetitorAdminRoute><CompetitorAdmin /></CompetitorAdminRoute>} />
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
        <SonnerToaster theme="light" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
