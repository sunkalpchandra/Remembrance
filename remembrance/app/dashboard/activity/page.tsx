"use client";

import React, { useEffect, useState, useCallback } from "react";
import CaregiverSidebar from "@/app/components/caregiverSidebar";
import { getActivityLog } from "@/app/dashboard/actions";
import { getPatients } from "@/app/dashboard/patients/actions";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

type ActivityEvent = {
  id: string;
  event: string;
  patientId: string | null;
  actorId: string | null;
  metadata: any;
  createdAt: Date;
  patientName: string | null;
};

type Patient = { id: string; patientName: string | null };

const EVENT_META: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  conversation_created: { label: "Conversation started",   color: "text-blue-700",   dot: "bg-blue-500",   bg: "bg-blue-50"   },
  memory_created:       { label: "Memory formed",          color: "text-green-700",  dot: "bg-green-500",  bg: "bg-green-50"  },
  note_added:           { label: "Note added",             color: "text-purple-700", dot: "bg-purple-500", bg: "bg-purple-50" },
  memory_updated:       { label: "Memory updated",         color: "text-yellow-700", dot: "bg-yellow-500", bg: "bg-yellow-50" },
  memory_deleted:       { label: "Memory deleted",         color: "text-red-700",    dot: "bg-red-400",    bg: "bg-red-50"    },
  patient_created:      { label: "Patient created",        color: "text-gray-700",   dot: "bg-gray-400",   bg: "bg-gray-50"   },
  patient_updated:      { label: "Patient updated",        color: "text-gray-700",   dot: "bg-gray-400",   bg: "bg-gray-50"   },
  patient_deleted:      { label: "Patient deleted",        color: "text-red-700",    dot: "bg-red-400",    bg: "bg-red-50"    },
};

const ALL_EVENT_TYPES = Object.keys(EVENT_META);

function formatEventLabel(event: ActivityEvent): string {
  const meta = EVENT_META[event.event];
  const patient = event.patientName;
  switch (event.event) {
    case "conversation_created":
      return patient ? `${patient} started a conversation` : "New conversation started";
    case "memory_created": {
      const name = (event.metadata as any)?.name;
      return patient
        ? `${patient} formed a new memory${name ? `: "${name}"` : ""}`
        : "New memory formed";
    }
    case "note_added":
      return patient ? `Note added for ${patient}` : "Note added";
    case "memory_updated":
      return patient ? `Memory updated for ${patient}` : "Memory updated";
    case "memory_deleted":
      return patient ? `Memory removed for ${patient}` : "Memory removed";
    case "patient_created":
      return patient ? `Account created for ${patient}` : "Patient account created";
    case "patient_updated":
      return patient ? `Account updated for ${patient}` : "Patient account updated";
    case "patient_deleted":
      return "Patient account deleted";
    default:
      return meta?.label ?? event.event;
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

const PAGE_SIZE = 50;

export default function ActivityLogPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      const { events: e, total: t } = await getActivityLog({
        patientId: patientFilter !== "all" ? patientFilter : undefined,
        eventTypes: typeFilter !== "all" ? [typeFilter] : undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setEvents(e as ActivityEvent[]);
      setTotal(t);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [patientFilter, typeFilter, page]);

  useEffect(() => {
    getPatients().then((p) => setPatients(p as Patient[])).catch(console.error);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [patientFilter, typeFilter]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Group events by date for the timeline
  const grouped = events.reduce<Record<string, ActivityEvent[]>>((acc, e) => {
    const key = new Date(e.createdAt).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <div className="w-screen h-[100dvh] flex flex-row bg-white relative overflow-hidden">
      <CaregiverSidebar selected={1} />

      <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-y-auto">
        <div className="max-w-4xl w-full mx-auto p-8 md:p-12">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">Activity Log</h1>
            <p className="text-gray-500 text-lg">
              A full timeline of all events across your patients.
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />

            <select
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="all">All patients</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.patientName}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="all">All event types</option>
              {ALL_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{EVENT_META[t].label}</option>
              ))}
            </select>

            <span className="ml-auto text-sm text-gray-400">
              {loading ? "Loading…" : `${total} event${total !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Timeline */}
          {loading ? (
            <div className="space-y-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center">
              <p className="text-gray-400 text-sm">No events match your filters.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([date, dayEvents]) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">
                    {date}
                  </p>
                  <div className="space-y-2">
                    {dayEvents.map((event) => {
                      const meta = EVENT_META[event.event] ?? {
                        label: event.event, color: "text-gray-700",
                        dot: "bg-gray-400", bg: "bg-gray-50",
                      };
                      return (
                        <div
                          key={event.id}
                          className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-start gap-4 hover:shadow-sm transition-shadow"
                        >
                          <div className={`w-9 h-9 rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 leading-snug">
                              {formatEventLabel(event)}
                            </p>
                            {event.patientName && (
                              <span className={`inline-block text-xs font-medium mt-1 ${meta.color}`}>
                                {meta.label}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                            <span className="text-xs text-gray-400">{relativeTime(event.createdAt)}</span>
                            <span className="text-xs text-gray-300">{formatDate(event.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
