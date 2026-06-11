import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building2, Handshake, Globe, Users, Users2,
  MessageSquare, CheckSquare, Megaphone, FileText, Gauge, Receipt,
  FolderOpen, Menu, X, PieChart, PlusCircle, Inbox, MapPin,
  CreditCard, List, Landmark, HelpCircle
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const navGroups = [
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
      { label: "Team Members", icon: Users2, path: "/team" },
    ],
  },
  {
    label: "Reporting",
    items: [{ label: "Reports", icon: FileText, path: "/reports" }],
  },
  {
    label: "Competitor Analysis",
    items: [{ label: "MarketGauge", icon: Gauge, soon: true }],
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
    items: [{ label: "Document Library", icon: FolderOpen, soon: true }],
  },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, isLoadingAuth } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-line flex items-center justify-between px-4 z-50">
        <img src="/brand/repevo-wordmark.svg" alt="Repevo" className="h-5" />
        <button onClick={() => setOpen(!open)} className="text-ink p-1">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 top-14 bg-surface z-40 overflow-y-auto">
          <nav className="p-4">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="px-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items
                    .filter((item) => !item.adminOnly || isAdmin || isLoadingAuth)
                    .map((item) => {
                    if (item.soon) {
                      return (
                        <div
                          key={item.label}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-faint"
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                          <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-soft text-primary">
                            Soon
                          </span>
                        </div>
                      );
                    }
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                          isActive
                            ? "bg-primary-soft text-primary"
                            : "text-muted"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* Spacer */}
      <div className="h-14" />
    </>
  );
}
