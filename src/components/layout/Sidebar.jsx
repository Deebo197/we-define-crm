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
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Clients", icon: Building2, path: "/clients" },
  { label: "Trade Accounts", icon: Handshake, path: "/trade-accounts" },
  { label: "Other Partners", icon: Globe, path: "/other-partners" },
  { label: "Contacts", icon: Users, path: "/contacts" },
  { label: "Interactions", icon: MessageSquare, path: "/interactions" },
  { label: "Actions", icon: CheckSquare, path: "/actions" },
  { label: "Campaigns", icon: Megaphone, path: "/campaigns" },
  { label: "Reports", icon: FileText, path: "/reports" },
  { label: "Team Members", icon: Users2, path: "/team" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-surface border-r border-white/[0.06] flex flex-col z-50 transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/[0.06]">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7F5BFF] to-[#3A1DFF] flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">We Define Travel</span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7F5BFF] to-[#3A1DFF] flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">W</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-gradient-to-r from-[#7F5BFF]/20 to-transparent text-white"
                  : "text-[#A1A1B5] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${
                isActive ? "text-[#7F5BFF]" : "text-[#6C6C80] group-hover:text-[#A1A1B5]"
              }`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
        <button
          onClick={() => base44.auth.logout()}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#A1A1B5] hover:text-white hover:bg-white/[0.04] transition-all w-full`}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0 text-[#6C6C80]" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6C6C80] hover:text-[#A1A1B5] transition-all w-full"
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