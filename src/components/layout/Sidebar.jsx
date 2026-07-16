import React, { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import ProfileCodePicker from "@/components/expenses/ProfileCodePicker";
import { GlobalSearchTrigger } from "@/components/crm/GlobalSearch";
import { navGroups, isItemActive, getActiveGroup } from "./navGroups";

const RAIL_ITEM_SIZE = 44;
const RAIL_ITEM_MAGNIFIED = 58;
const RAIL_SPRING = { mass: 0.1, stiffness: 180, damping: 14 };

/**
 * Module icon with a macOS-dock magnify: swells as the pointer nears,
 * driven by the rail's shared mouse-Y motion value.
 */
function RailItem({ group, isActive, mouseY, staticSize }) {
  const ref = useRef(null);

  const distance = useTransform(mouseY, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { y: 0, height: RAIL_ITEM_SIZE };
    return val - rect.y - rect.height / 2;
  });
  const targetSize = useTransform(
    distance,
    [-110, 0, 110],
    [RAIL_ITEM_SIZE, RAIL_ITEM_MAGNIFIED, RAIL_ITEM_SIZE]
  );
  const size = useSpring(targetSize, RAIL_SPRING);
  const iconScale = useTransform(size, (s) => s / RAIL_ITEM_SIZE);

  return (
    <motion.div
      ref={ref}
      style={staticSize ? { width: RAIL_ITEM_SIZE, height: RAIL_ITEM_SIZE } : { width: size, height: size }}
      className="flex-shrink-0"
    >
      <Link
        to={group.home}
        title={group.label}
        className={`w-full h-full rounded-xl flex items-center justify-center transition-colors duration-200 ${
          isActive
            ? "bg-primary-soft text-primary"
            : "text-faint hover:text-ink hover:bg-black/[0.04]"
        }`}
      >
        <motion.span style={staticSize ? {} : { scale: iconScale }} className="flex">
          <group.icon className="w-5 h-5" />
        </motion.span>
      </Link>
    </motion.div>
  );
}

function SoonPill() {
  return (
    <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-soft text-primary">
      Soon
    </span>
  );
}

/**
 * Desktop navigation: a slim module rail (one icon per module) next to a
 * panel listing only the active module's pages. Clicking a module icon
 * jumps to that module's home page.
 */
export default function Sidebar() {
  const location = useLocation();
  const { user, isLoadingAuth } = useAuth();
  const isAdmin = user?.role === "admin";
  const activeGroup = getActiveGroup(location.pathname);
  const mouseY = useMotionValue(Infinity);
  const reducedMotion = useReducedMotion();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-surface border-r border-line flex z-50">
      {/* Module rail */}
      <div
        className="w-[64px] h-full border-r border-line flex flex-col items-center py-3 gap-1 flex-shrink-0"
        onMouseMove={(e) => mouseY.set(e.clientY)}
        onMouseLeave={() => mouseY.set(Infinity)}
      >
        <Link to="/" className="mb-2" title="Repevo">
          <img src="/brand/repevo-favicon.svg" alt="Repevo" className="w-9 rounded-xl" />
        </Link>
        {navGroups.map((group) => (
          <RailItem
            key={group.label}
            group={group}
            isActive={group.label === activeGroup.label}
            mouseY={mouseY}
            staticSize={reducedMotion}
          />
        ))}
      </div>

      {/* Module panel */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-line">
          <span className="text-sm font-semibold text-ink truncate">{activeGroup.label}</span>
        </div>

        <div className="px-3 pt-3">
          <GlobalSearchTrigger />
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <div className="space-y-0.5">
            {activeGroup.items
              .filter((item) => !item.adminOnly || isAdmin || isLoadingAuth)
              .map((item) => {
                if (item.soon) {
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-faint cursor-default select-none"
                      title={`${item.label} — coming soon`}
                    >
                      <item.icon className="w-[18px] h-[18px] flex-shrink-0 text-faint" />
                      <span>{item.label}</span>
                      <SoonPill />
                    </div>
                  );
                }
                const isActive = isItemActive(item, location.pathname);
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
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-line space-y-1">
          <ProfileCodePicker
            currentCode={user?.paid_by_code}
            currentPersonalCode={user?.paid_by_code_personal}
          />
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-ink hover:bg-black/[0.03] transition-all w-full"
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0 text-faint" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
