"use client";

import React, { useContext } from "react";
import CaregiverSidebar from "@/app/components/caregiverSidebar";
import { UserContext } from "@/app/components/usercontext";

export default function DashboardPage() {
  const user = useContext(UserContext);

  return (
    <div className="w-screen h-[100dvh] flex flex-row bg-white relative overflow-hidden">
      <CaregiverSidebar selected={0} />

      <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-y-auto">
        <div className="max-w-6xl w-full mx-auto p-8 md:p-12">
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">
              Caregiver Dashboard
            </h1>
            <p className="text-gray-500 text-lg">
              Welcome back. Here's an overview of the patient's cognitive health
              and recent memories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Quick Stats Cards */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-7 flex flex-col transition-all hover:shadow-md">
              <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">
                Recent Interactions
              </h3>
              <p className="text-4xl font-semibold text-gray-900 mt-1">12</p>
              <p className="text-sm text-green-600 mt-4 flex items-center font-medium">
                <span className="mr-1">↑</span> 2 from last week
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-7 flex flex-col transition-all hover:shadow-md">
              <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">
                New Memories Formed
              </h3>
              <p className="text-4xl font-semibold text-gray-900 mt-1">5</p>
              <p className="text-sm text-green-600 mt-4 flex items-center font-medium">
                <span className="mr-1">↑</span> 1 from last week
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-7 flex flex-col transition-all hover:shadow-md">
              <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">
                Cognitive Score
              </h3>
              <p className="text-4xl font-semibold text-gray-900 mt-1">
                85/100
              </p>
              <p className="text-sm text-gray-500 mt-4 flex items-center font-medium">
                Stable over last month
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Recent Activity
                </h2>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View All
                </button>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  </div>
                  <div className="pt-1">
                    <p className="text-base font-medium text-gray-900">
                      Talked about childhood home
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Discussed memories from 1960s with 95% clarity.
                    </p>
                    <p className="text-xs text-gray-400 mt-2">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="pt-1">
                    <p className="text-base font-medium text-gray-900">
                      Remembered daughter's visit
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Recalled the flowers brought by Sarah.
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Yesterday</p>
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  </div>
                  <div className="pt-1">
                    <p className="text-base font-medium text-gray-900">
                      Completed daily check-in
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Routine morning check-in completed successfully.
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Yesterday</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions / Settings */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 transition-all hover:shadow-md">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Quick Actions
              </h2>
              <div className="space-y-4">
                <button className="w-full text-left px-6 py-5 rounded-2xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50 transition-all flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="text-base font-medium text-gray-900 group-hover:text-blue-900">
                      Add Proactive Memory Prompt
                    </span>
                    <span className="text-sm text-gray-500 mt-1 group-hover:text-blue-700">
                      Seed a topic for the AI to bring up
                    </span>
                  </div>
                  <span className="text-gray-300 group-hover:text-blue-500 text-xl transform group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </button>
                <button className="w-full text-left px-6 py-5 rounded-2xl border border-gray-100 hover:border-green-100 hover:bg-green-50 transition-all flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="text-base font-medium text-gray-900 group-hover:text-green-900">
                      Review Recent Transcripts
                    </span>
                    <span className="text-sm text-gray-500 mt-1 group-hover:text-green-700">
                      Read through the latest conversations
                    </span>
                  </div>
                  <span className="text-gray-300 group-hover:text-green-500 text-xl transform group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </button>
                <button className="w-full text-left px-6 py-5 rounded-2xl border border-gray-100 hover:border-purple-100 hover:bg-purple-50 transition-all flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="text-base font-medium text-gray-900 group-hover:text-purple-900">
                      Manage Patient Settings
                    </span>
                    <span className="text-sm text-gray-500 mt-1 group-hover:text-purple-700">
                      Update system prompts and basic info
                    </span>
                  </div>
                  <span className="text-gray-300 group-hover:text-purple-500 text-xl transform group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
