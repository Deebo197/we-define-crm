import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Building2,
  Handshake,
  Globe,
  Users,
  Users2,
  MessageSquare,
  CheckSquare,
  Megaphone,
  FileText,
  Gauge,
  Receipt,
  FolderOpen,
  PlusCircle,
  Inbox,
  MapPin,
  CreditCard,
  List,
  Landmark,
  PieChart,
  HelpCircle,
  BarChart3,
  PoundSterling,
  Settings,
  ListTodo,
} from "lucide-react";

export const navGroups = [
  {
    label: "CRM",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "Clients", icon: Building2, path: "/clients" },
      { label: "Trade Accounts", icon: Handshake, path: "/trade-accounts" },
      { label: "Other Partners", icon: Globe, path: "/other-partners" },
      { label: "Contacts", icon: Users, path: "/contacts" },
      { label: "Interactions", icon: MessageSquare, path: "/interactions" },
      { label: "Actions", icon: CheckSquare, path: "/actions" },
      { label: "Campaigns", icon: Megaphone, path: "/campaigns" },
      { label: "Team", icon: Users2, path: "/team" },
      { label: "To-dos", icon: ListTodo, path: "/todos" },
    ],
  },
  {
    label: "Reporting",
    items: [{ label: "Reports", icon: FileText, path: "/reports" }],
  },
  {
    label: "Competitor Analysis",
    items: [
      { label: "Overview", icon: Gauge, path: "/competitor-analysis" },
      { label: "New Scenario", icon: PlusCircle, path: "/competitor-analysis/new-scenario" },
      { label: "Price Entry", icon: PoundSterling, path: "/competitor-analysis/price-entry" },
      { label: "Analysis", icon: BarChart3, path: "/competitor-analysis/analysis" },
      { label: "Admin", icon: Settings, path: "/competitor-analysis/admin", adminOnly: true },
    ],
  },
  {
    label: "Expenses",
    items: [
      { label: "Overview", icon: PieChart, path: "/expenses" },
      { label: "Submit Expense", icon: PlusCircle, path: "/expenses/submit" },
      { label: "My Expenses", icon: Receipt, path: "/expenses/mine" },
      { label: "Receipt Inbox", icon: Inbox, path: "/expenses/inbox" },
      { label: "Mileage", icon: MapPin, path: "/expenses/mileage" },
      { label: "Reimbursements", icon: CreditCard, path: "/expenses/reimbursements" },
      { label: "All Expenses", icon: List, path: "/expenses/all", adminOnly: true },
      { label: "Accounts", icon: Landmark, path: "/expenses/accounts", adminOnly: true },
      { label: "Client Report", icon: FileText, path: "/expenses/client-report", adminOnly: true },
      { label: "Help & Guide", icon: HelpCircle, path: "/expenses/help" },
    ],
  },
  {
    label: "Documents",
    items: [{ label: "Client Library", icon: FolderOpen, path: "/documents" }],
  },
];

export function isItemActive(item, pathname) {
  return (
    pathname === item.path ||
    (item.path !== "/" &&
      item.path !== "/expenses" &&
      item.path !== "/competitor-analysis" &&
      pathname.startsWith(item.path))
  );
}

const STORAGE_KEY = "repevo.sidebar.groups";

function readStoredGroups() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistGroups(groups) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {
    /* ignore */
  }
}

/**
 * Collapsed/expanded state per nav group, persisted in localStorage.
 * Default: all expanded. Auto-expands the group containing the active route.
 */
export function useCollapsedGroups(pathname) {
  const [collapsedGroups, setCollapsedGroups] = useState(readStoredGroups);

  const toggleGroup = useCallback((label) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      persistGroups(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const activeGroup = navGroups.find((g) =>
      g.items.some((item) => isItemActive(item, pathname))
    );
    if (!activeGroup) return;
    setCollapsedGroups((prev) => {
      if (!prev[activeGroup.label]) return prev;
      const next = { ...prev, [activeGroup.label]: false };
      persistGroups(next);
      return next;
    });
  }, [pathname]);

  return { collapsedGroups, toggleGroup };
}
