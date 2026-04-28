"use client";

import React, { useEffect, useState } from "react";
import CaregiverSidebar from "@/app/components/caregiverSidebar";
import { getPatients } from "@/app/dashboard/patients/actions";
import Neo4jGraph from "@/app/components/neo4j";
import { Users } from "lucide-react";

type Patient = { id: string; patientName: string | null; email: string | null };

export default function CaregiverMemoriesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatients()
      .then((p) => {
        const list = p as Patient[];
        setPatients(list);
        if (list.length > 0) setSelected(list[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-screen h-[100dvh] flex flex-row bg-white relative overflow-hidden">
      <CaregiverSidebar selected={2} />

      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Top bar: title + patient tabs */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-8 pt-6 pb-0">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Memory Graph</h1>

          {loading ? (
            <div className="flex gap-2 pb-0">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-9 w-28 bg-gray-100 rounded-t-xl animate-pulse" />
              ))}
            </div>
          ) : patients.length === 0 ? null : (
            <div className="flex gap-1 overflow-x-auto pb-0">
              {patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-xl whitespace-nowrap transition-colors border-b-2 ${
                    selected?.id === p.id
                      ? "bg-gray-50 border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {p.patientName ?? "Patient"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Graph canvas */}
        <div className="flex-1 bg-gray-50 overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              Loading…
            </div>
          ) : patients.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Users className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No patients yet</p>
              <p className="text-sm text-gray-400 max-w-xs">
                Create patient accounts from the Manage Patients page to view their memory graphs here.
              </p>
            </div>
          ) : selected ? (
            // Key on patient ID so the graph fully remounts when switching patients
            <Neo4jGraph
              key={selected.id}
              userId={selected.id}
              graphUrl={`/api/graph?patientId=${selected.id}`}
            />
          ) : null}
        </div>

      </div>
    </div>
  );
}
