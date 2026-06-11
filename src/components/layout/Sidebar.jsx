import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";
import { base44 } from "@/api/base44Client";

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
    items: [{ label: "Expenses", icon: Receipt, soon: true }],
  },
  {
    label: "Documents",
    items: [{ label: "Document Library", icon: FolderOpen, soon: true }],
  },
];

function SoonPill() {
  return (
    <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-soft text-primary">
      Soon
    </span>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-surface border-r border-line flex flex-col z-50 transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-line">
        {!collapsed ? (
          <img src="/brand/repevo-wordmark.svg" alt="Repevo" className="h-6" />
        ) : (
          <img src="/brand/repevo-favicon.svg" alt="Repevo" className="w-8 rounded mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                if (item.soon) {
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-faint cursor-default select-none"
                      title={`${item.label} — coming soon`}
                    >
                      <item.icon className="w-[18px] h-[18px] flex-shrink-0 text-faint" />
                      {!collapsed && (
                        <>
                          <span>{item.label}</span>
                          <SoonPill />
                        </>
                      )}
                    </div>
                  );
                }
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                      isActive
                        ? "bg-primary-soft text-primary"
                        : "text-muted hover:text-ink hover:bg-black/[0.03]"
                    }`}
                  >
                    <item.icon
                      className={`w-[18px] h-[18px] flex-shrink-0 ${
                        isActive ? "text-primary" : "text-faint group-hover:text-muted"
                      }`}
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-line space-y-1">
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-ink hover:bg-black/[0.03] transition-all w-full"
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0 text-faint" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-faint hover:text-muted transition-all w-full"
        >
          {collapsed ? (
            <ChevronRight className="w-[18px] h-[18px] mx-auto" />
          ) : (
            <>
              <ChevronLeft className="w-[18px] h-[18px]" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
