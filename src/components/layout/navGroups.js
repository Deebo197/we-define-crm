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
  CalendarDays,
  PoundSterling,
  Settings,
  ListTodo,
  Crosshair,
  KanbanSquare,
  Grid3X3,
} from "lucide-react";

export const navGroups = [
  {
    label: "CRM",
    icon: Handshake,
    home: "/",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "Clients", icon: Building2, path: "/clients" },
      { label: "Companies", icon: Handshake, path: "/trade-accounts" },
      { label: "Other Partners", icon: Globe, path: "/other-partners" },
      { label: "People", icon: Users, path: "/contacts" },
      { label: "Targeting", icon: Crosshair, path: "/targeting" },
      { label: "Pipeline", icon: KanbanSquare, path: "/pipeline" },
      { label: "Gap Matrix", icon: Grid3X3, path: "/pipeline/matrix" },
      { label: "Interactions", icon: MessageSquare, path: "/interactions" },
      { label: "Actions", icon: CheckSquare, path: "/actions" },
      { label: "Campaigns", icon: Megaphone, path: "/campaigns" },
      { label: "Events", icon: CalendarDays, path: "/events" },
      { label: "Team", icon: Users2, path: "/team" },
      { label: "To-dos", icon: ListTodo, path: "/todos" },
      { label: "Reference Lists", icon: Settings, path: "/settings/lists", adminOnly: true },
    ],
  },
  {
    label: "Reporting",
    icon: FileText,
    home: "/reports",
    items: [{ label: "Reports", icon: FileText, path: "/reports" }],
  },
  {
    label: "Competitor Analysis",
    icon: Gauge,
    home: "/competitor-analysis",
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
    icon: Receipt,
    home: "/expenses",
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
    icon: FolderOpen,
    home: "/documents",
    items: [{ label: "Client Library", icon: FolderOpen, path: "/documents" }],
  },
];

export function isItemActive(item, pathname) {
  return (
    pathname === item.path ||
    (item.path !== "/" &&
      item.path !== "/expenses" &&
      item.path !== "/competitor-analysis" &&
      item.path !== "/pipeline" &&
      pathname.startsWith(item.path))
  );
}

/** The nav group (module) the current route belongs to. Defaults to CRM. */
export function getActiveGroup(pathname) {
  return (
    navGroups.find((g) => g.items.some((item) => isItemActive(item, pathname))) ||
    navGroups[0]
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
