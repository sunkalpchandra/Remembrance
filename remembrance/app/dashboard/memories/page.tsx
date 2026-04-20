"use client";

import React, { useContext } from "react";
import CaregiverSidebar from "@/app/components/caregiverSidebar";
import { UserContext } from "@/app/components/usercontext";

export default function CaregiverMemoriesPage() {
  const user = useContext(UserContext);

  return (
    <div className="w-screen h-[100dvh] flex flex-row bg-white relative overflow-hidden">
      <CaregiverSidebar selected={2} />

      <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-y-auto">
        <div className="max-w-6xl w-full mx-auto p-8 md:p-12">
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">
              Patient Memories
            </h1>
            <p className="text-gray-500 text-lg">
              View and manage the longitudinal memory graph and cognitive context.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[500px] flex items-center justify-center transition-all hover:shadow-md">
            <div className="text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Memory Graph Visualization</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                The caregiver-specific memory view is being prepared. Here you will be able to search, filter, and review the patient's recollected memories.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
