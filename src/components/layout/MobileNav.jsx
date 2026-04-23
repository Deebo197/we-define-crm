import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building2, Handshake, Globe, Users, Users2,
  MessageSquare, CheckSquare, Megaphone, FileText, Menu, X
} from "lucide-react";

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

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-white/[0.06] flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7F5BFF] to-[#3A1DFF] flex items-center justify-center">
            <span className="text-white font-bold text-xs">W</span>
          </div>
          <span className="text-white font-semibold text-sm">WDT</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-white p-1">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 top-14 bg-background z-40 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                    isActive
                      ? "bg-[#7F5BFF]/20 text-white"
                      : "text-[#A1A1B5]"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Spacer */}
      <div className="h-14" />
    </>
  );
}