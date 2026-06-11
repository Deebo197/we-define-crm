import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { navGroups, isItemActive, useCollapsedGroups } from "./navGroups";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, isLoadingAuth } = useAuth();
  const isAdmin = user?.role === "admin";
  const { collapsedGroups, toggleGroup } = useCollapsedGroups(location.pathname);

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

      {/* Spacer */}
      <div className="h-14" />
    </>
  );
}
