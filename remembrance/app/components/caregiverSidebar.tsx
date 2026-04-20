"use client";

import type React from "react";
import { useContext, useState } from "react";
import { UserContext } from "@/app/components/usercontext";
import { useRouter } from "next/navigation";
import { BiChevronRight, BiGridAlt, BiHistory, BiGroup } from "react-icons/bi";
import { TfiLayersAlt } from "react-icons/tfi";
import { UserProfile } from "./userprofile";
import SettingsModal from "./SettingsModal";

interface CaregiverSidebarProps {
  selected: number;
}

export default function CaregiverSidebar(props: CaregiverSidebarProps) {
  const router = useRouter();
  const user = useContext(UserContext);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("caregiver-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("caregiver-sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <>
      {collapsed && (
        <button
          onClick={toggleCollapsed}
          className="md:hidden absolute top-4 left-4 z-50 p-2 bg-white/60 backdrop-blur-md rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50"
        >
          <BiChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {!collapsed && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-[55]"
          onClick={() => setCollapsed(true)}
        />
      )}

      <div
        suppressHydrationWarning
        className={`transition-all duration-150 h-[100dvh] fixed md:relative z-[60] ${
          collapsed
            ? "-translate-x-full md:translate-x-0 md:w-16 w-64"
            : "translate-x-0 w-64"
        } bg-gray-50 border-r border-gray-200 flex flex-col shrink-0`}
      >
        {/* Header */}
        <div
          className={`border-b border-gray-200 ${collapsed ? "p-2" : "px-3 py-2"}`}
        >
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}
          >
            {!collapsed && (
              <div className="flex items-center gap-2 flex-1 px-2">
                <span className="text-gray-900 text-sm font-medium">
                  Remembrance <strong>Access</strong>
                </span>
              </div>
            )}
            <button
              onClick={toggleCollapsed}
              className={`hover:bg-gray-200 rounded-md transition-colors duration-75 ${collapsed ? "p-2" : "p-1.5"}`}
            >
              <BiChevronRight
                className={`w-4 h-4 text-gray-500 transition-transform duration-150 ${collapsed ? "" : "rotate-180"}`}
              />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto">
          <div className={`space-y-1 ${collapsed ? "p-2" : "px-3 py-4"}`}>
            {/* Dashboard */}
            <button
              onClick={() => router.push("/dashboard")}
              className={`flex items-center w-full rounded-md transition-colors duration-75 cursor-pointer ${
                collapsed ? "justify-center p-2" : "gap-3 px-2 py-2"
              } ${
                props.selected === 0
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              title={collapsed ? "Dashboard" : ""}
            >
              <BiGridAlt className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">Dashboard</span>
              )}
            </button>

            {/* Activity/Transcripts */}
            <button
              onClick={() => router.push("/dashboard/activity")}
              className={`flex items-center w-full rounded-md cursor-pointer transition-colors duration-75 ${
                collapsed ? "justify-center p-2" : "gap-3 px-2 py-2"
              } ${
                props.selected === 1
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              title={collapsed ? "Activity Log" : ""}
            >
              <BiHistory className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">Activity Log</span>
              )}
            </button>

            {/* Memory Graph */}
            <button
              onClick={() => router.push("/dashboard/memories")}
              className={`flex items-center w-full rounded-md cursor-pointer transition-colors duration-75 ${
                collapsed ? "justify-center p-2" : "gap-3 px-2 py-2"
              } ${
                props.selected === 2
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              title={collapsed ? "Memory Graph" : ""}
            >
              <TfiLayersAlt className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">Memory Graph</span>
              )}
            </button>

            {/* Manage Patients */}
            <button
              onClick={() => router.push("/dashboard/patients")}
              className={`flex items-center w-full rounded-md cursor-pointer transition-colors duration-75 ${
                collapsed ? "justify-center p-2" : "gap-3 px-2 py-2"
              } ${
                props.selected === 3
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              title={collapsed ? "Manage Patients" : ""}
            >
              <BiGroup className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">Manage Patients</span>
              )}
            </button>
          </div>
        </div>

        {/* Account footer */}
        <div
          className={`border-t border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors ${collapsed ? "p-2 flex justify-center" : "px-3 py-3"}`}
          onClick={() => setIsSettingsOpen(true)}
        >
          <div className={`flex items-center ${collapsed ? "" : "gap-2"}`}>
            <UserProfile className="w-8 h-8 pointer-events-none" />
            {!collapsed && (
              <span className="text-sm text-gray-700 truncate font-medium">
                {user?.displayName || "Caregiver Account"}
              </span>
            )}
          </div>
        </div>
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
