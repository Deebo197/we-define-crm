import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, Search, Handshake, Receipt, Gauge, Plus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { openGlobalSearch } from "@/components/crm/GlobalSearch";
import { navGroups, isItemActive, getActiveGroup, useCollapsedGroups } from "./navGroups";

const TABS = [
  { label: "CRM", icon: Handshake, path: "/", group: "CRM" },
  { label: "Expenses", icon: Receipt, path: "/expenses", group: "Expenses" },
  { label: "Comp Analysis", icon: Gauge, path: "/competitor-analysis", group: "Competitor Analysis" },
];

const TAP_SPRING = { type: "spring", stiffness: 400, damping: 15 };

/** Tab content that pops with a small spring when pressed. */
function TapBounce({ children, className = "", disabled }) {
  return (
    <motion.span
      whileTap={disabled ? undefined : { scale: 0.82 }}
      transition={TAP_SPRING}
      className={className}
    >
      {children}
    </motion.span>
  );
}

function TabLink({ tab, isActive, onNavigate, reducedMotion }) {
  return (
    <Link
      to={tab.path}
      onClick={onNavigate}
      className={`flex flex-col items-center justify-center h-full ${
        isActive ? "text-primary" : "text-faint"
      }`}
    >
      <TapBounce disabled={reducedMotion} className="flex flex-col items-center gap-0.5">
        <tab.icon className="w-5 h-5" />
        <span className="text-[10px] font-medium">{tab.label}</span>
      </TapBounce>
    </Link>
  );
}

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, isLoadingAuth } = useAuth();
  const isAdmin = user?.role === "admin";
  const { collapsedGroups, toggleGroup } = useCollapsedGroups(location.pathname);
  const activeGroup = getActiveGroup(location.pathname);
  const reducedMotion = useReducedMotion();

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-line flex items-center justify-between px-4 z-50">
        <img src="/brand/repevo-wordmark.svg" alt="Repevo" className="h-5" />
        <div className="flex items-center gap-1">
          <button onClick={() => { setOpen(false); openGlobalSearch(); }} className="text-ink p-1" title="Search companies and people">
            <Search className="w-5 h-5" />
          </button>
          <button onClick={() => setOpen(!open)} className="text-ink p-1">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 top-14 bg-surface z-40 overflow-y-auto pb-24">
          <nav className="p-4">
            {navGroups.map((group) => {
              const isGroupCollapsed = !!collapsedGroups[group.label];
              return (
                <div key={group.label} className="mb-4">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={!isGroupCollapsed}
                    className="w-full flex items-center justify-between px-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-300 ${
                        isGroupCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ${
                      isGroupCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
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
                            const isActive = isItemActive(item, location.pathname);
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
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      )}

      {/* Bottom tab bar */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 h-16">
          {TABS.slice(0, 2).map((tab) => (
            <TabLink
              key={tab.group}
              tab={tab}
              isActive={!open && activeGroup.label === tab.group}
              onNavigate={() => setOpen(false)}
              reducedMotion={reducedMotion}
            />
          ))}

          {/* Centre quick action: submit an expense */}
          <Link
            to="/expenses/submit"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center h-full"
            title="Submit expense"
          >
            <TapBounce disabled={reducedMotion} className="w-12 h-12 -mt-4 rounded-full bg-primary text-white shadow-lg flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </TapBounce>
          </Link>

          {TABS.slice(2).map((tab) => (
            <TabLink
              key={tab.group}
              tab={tab}
              isActive={!open && activeGroup.label === tab.group}
              onNavigate={() => setOpen(false)}
              reducedMotion={reducedMotion}
            />
          ))}

          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={`flex flex-col items-center justify-center h-full ${
              open ? "text-primary" : "text-faint"
            }`}
          >
            <TapBounce disabled={reducedMotion} className="flex flex-col items-center gap-0.5">
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-medium">More</span>
            </TapBounce>
          </button>
        </div>
      </div>

      {/* Spacer for the fixed top bar */}
      <div className="h-14" />
    </>
  );
}
