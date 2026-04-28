"use client";

import React, { useEffect, useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import CaregiverSidebar from "@/app/components/caregiverSidebar";
import { getDashboardStats } from "./actions";
import { getPatients, createNote } from "@/app/dashboard/patients/actions";
import { X, UserPlus, MessageSquarePlus, FileSearch, Users, BookOpen, AlertTriangle } from "lucide-react";

type ActivityEvent = {
  id: string;
  event: string;
  patientId: string | null;
  actorId: string | null;
  metadata: any;
  createdAt: Date;
  patientName: string | null;
};

type Stats = {
  interactions: { thisWeek: number; delta: number };
  memories: { thisWeek: number; delta: number };
  activePatients: { thisWeek: number; total: number };
  recentActivity: ActivityEvent[];
};

type Patient = { id: string; patientName: string | null; email: string | null; createdAt: Date };

type ActionDef = {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: { border: string; bg: string; text: string; arrow: string };
  onClick: () => void;
};

const EVENT_CONFIG: Record<string, { label: (e: ActivityEvent) => string; color: string; dot: string }> = {
  conversation_created: {
    label: (e) => e.patientName ? `${e.patientName} started a conversation` : "New conversation started",
    color: "bg-blue-50", dot: "bg-blue-500",
  },
  memory_created: {
    label: (e) => {
      const name = (e.metadata as any)?.name;
      return e.patientName
        ? `${e.patientName} formed a new memory${name ? `: "${name}"` : ""}`
        : "New memory formed";
    },
    color: "bg-green-50", dot: "bg-green-500",
  },
  note_added: {
    label: (e) => e.patientName ? `You added a note for ${e.patientName}` : "Note added",
    color: "bg-purple-50", dot: "bg-purple-500",
  },
  memory_updated: {
    label: (e) => e.patientName ? `You updated a memory for ${e.patientName}` : "Memory updated",
    color: "bg-yellow-50", dot: "bg-yellow-500",
  },
  memory_deleted: {
    label: (e) => e.patientName ? `You removed a memory for ${e.patientName}` : "Memory removed",
    color: "bg-red-50", dot: "bg-red-400",
  },
  patient_created: {
    label: (e) => e.patientName ? `Account created for ${e.patientName}` : "New patient account created",
    color: "bg-gray-50", dot: "bg-gray-400",
  },
  patient_updated: {
    label: (e) => e.patientName ? `Updated account for ${e.patientName}` : "Patient account updated",
    color: "bg-gray-50", dot: "bg-gray-400",
  },
  patient_deleted: {
    label: () => "Patient account deleted",
    color: "bg-red-50", dot: "bg-red-400",
  },
};

function relativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <p className="text-sm text-gray-400 mt-4 font-medium">Same as last week</p>;
  const up = delta > 0;
  return (
    <p className={`text-sm mt-4 flex items-center font-medium ${up ? "text-green-600" : "text-red-500"}`}>
      <span className="mr-1">{up ? "↑" : "↓"}</span>{Math.abs(delta)} from last week
    </p>
  );
}

// Modal for seeding a memory prompt into a patient's AI context
function MemoryPromptModal({
  patients,
  onClose,
}: {
  patients: Patient[];
  onClose: () => void;
}) {
  const [selectedPatient, setSelectedPatient] = useState<string>(patients[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [detail, setDetail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !selectedPatient) return;
    setError("");
    startTransition(async () => {
      const content = detail.trim()
        ? `Proactive memory prompt — ${topic.trim()}: ${detail.trim()}`
        : `Proactive memory prompt — ${topic.trim()}`;
      const result = await createNote(selectedPatient, "Memory Prompt", content);
      if (result.error) {
        setError(result.error);
      } else {
        setDone(true);
        setTimeout(onClose, 1200);
      }
    });
  };

  const patientName = patients.find((p) => p.id === selectedPatient)?.patientName;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add Memory Prompt</h2>
            <p className="text-xs text-gray-400 mt-0.5">Seeds a topic into the patient's AI companion</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium">Prompt seeded for {patientName}!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {patients.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Patient</label>
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.patientName}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Topic to bring up</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. childhood home, grandchildren's names…"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Details <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Any context that helps the AI guide the conversation…"
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !topic.trim()}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Seeding…" : "Seed Prompt"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPromptModal, setShowPromptModal] = useState(false);

  useEffect(() => {
    Promise.all([getDashboardStats(), getPatients()])
      .then(([s, p]) => {
        setStats(s);
        setPatients(p as Patient[]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Smart actions: derive from live stats, pop in/out automatically
  const smartActions = useMemo<ActionDef[]>(() => {
    if (!stats) return [];

    const actions: ActionDef[] = [];
    const { interactions, memories, activePatients } = stats;

    if (activePatients.total === 0) {
      actions.push({
        id: "create_patient",
        icon: <UserPlus className="w-5 h-5" />,
        title: "Create your first patient",
        subtitle: "Provision an account to get started",
        accent: { border: "hover:border-blue-100", bg: "hover:bg-blue-50", text: "group-hover:text-blue-900", arrow: "group-hover:text-blue-500" },
        onClick: () => router.push("/dashboard/patients"),
      });
      return actions;
    }

    // Always available when patients exist
    actions.push({
      id: "memory_prompt",
      icon: <MessageSquarePlus className="w-5 h-5" />,
      title: "Add Memory Prompt",
      subtitle: "Seed a topic for the AI companion to bring up",
      accent: { border: "hover:border-blue-100", bg: "hover:bg-blue-50", text: "group-hover:text-blue-900", arrow: "group-hover:text-blue-500" },
      onClick: () => setShowPromptModal(true),
    });

    // Show only when there are recent conversations to read
    if (interactions.thisWeek > 0) {
      actions.push({
        id: "review_transcripts",
        icon: <FileSearch className="w-5 h-5" />,
        title: "Review Recent Transcripts",
        subtitle: `${interactions.thisWeek} conversation${interactions.thisWeek !== 1 ? "s" : ""} this week`,
        accent: { border: "hover:border-green-100", bg: "hover:bg-green-50", text: "group-hover:text-green-900", arrow: "group-hover:text-green-500" },
        onClick: () => router.push("/dashboard/patients"),
      });
    }

    // Show when some patients haven't been active
    if (activePatients.thisWeek < activePatients.total) {
      const inactive = activePatients.total - activePatients.thisWeek;
      actions.push({
        id: "inactive_patients",
        icon: <AlertTriangle className="w-5 h-5" />,
        title: "Check In on Patients",
        subtitle: `${inactive} patient${inactive !== 1 ? "s" : ""} inactive this week`,
        accent: { border: "hover:border-yellow-100", bg: "hover:bg-yellow-50", text: "group-hover:text-yellow-900", arrow: "group-hover:text-yellow-600" },
        onClick: () => router.push("/dashboard/patients"),
      });
    }

    // Show when new memories formed this week
    if (memories.thisWeek > 0) {
      actions.push({
        id: "review_memories",
        icon: <BookOpen className="w-5 h-5" />,
        title: "Review New Memories",
        subtitle: `${memories.thisWeek} new memor${memories.thisWeek !== 1 ? "ies" : "y"} formed this week`,
        accent: { border: "hover:border-purple-100", bg: "hover:bg-purple-50", text: "group-hover:text-purple-900", arrow: "group-hover:text-purple-500" },
        onClick: () => router.push("/dashboard/memories"),
      });
    }

    // Fallback: always have at least "Manage Patients" if nothing else triggered
    if (actions.length < 2) {
      actions.push({
        id: "manage_patients",
        icon: <Users className="w-5 h-5" />,
        title: "Manage Patients",
        subtitle: `${activePatients.total} patient${activePatients.total !== 1 ? "s" : ""} under your care`,
        accent: { border: "hover:border-purple-100", bg: "hover:bg-purple-50", text: "group-hover:text-purple-900", arrow: "group-hover:text-purple-500" },
        onClick: () => router.push("/dashboard/patients"),
      });
    }

    return actions.slice(0, 4);
  }, [stats, router]);

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
              Welcome back. Here's an overview of your patients' cognitive health and recent activity.
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-7 flex flex-col transition-all hover:shadow-md">
              <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Recent Interactions</h3>
              {loading ? (
                <div className="h-10 w-16 bg-gray-100 rounded-xl animate-pulse mt-1" />
              ) : (
                <p className="text-4xl font-semibold text-gray-900 mt-1">{stats?.interactions.thisWeek ?? 0}</p>
              )}
              {!loading && <DeltaBadge delta={stats?.interactions.delta ?? 0} />}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-7 flex flex-col transition-all hover:shadow-md">
              <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">New Memories Formed</h3>
              {loading ? (
                <div className="h-10 w-16 bg-gray-100 rounded-xl animate-pulse mt-1" />
              ) : (
                <p className="text-4xl font-semibold text-gray-900 mt-1">{stats?.memories.thisWeek ?? 0}</p>
              )}
              {!loading && <DeltaBadge delta={stats?.memories.delta ?? 0} />}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-7 flex flex-col transition-all hover:shadow-md">
              <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Active Patients</h3>
              {loading ? (
                <div className="h-10 w-24 bg-gray-100 rounded-xl animate-pulse mt-1" />
              ) : (
                <p className="text-4xl font-semibold text-gray-900 mt-1">
                  {stats?.activePatients.thisWeek ?? 0}
                  <span className="text-2xl text-gray-300 font-normal">/{stats?.activePatients.total ?? 0}</span>
                </p>
              )}
              {!loading && <p className="text-sm text-gray-400 mt-4 font-medium">Active this week</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                <button
                  onClick={() => router.push("/dashboard/patients")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All
                </button>
              </div>

              {loading ? (
                <div className="space-y-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-5">
                      <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                      <div className="flex-1 pt-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !stats?.recentActivity.length ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No activity yet. Events will appear here as patients interact with the app.
                </p>
              ) : (
                <div className="space-y-6">
                  {stats.recentActivity.map((event) => {
                    const cfg = EVENT_CONFIG[event.event] ?? { label: () => event.event, color: "bg-gray-50", dot: "bg-gray-400" };
                    return (
                      <div key={event.id} className="flex items-start gap-5">
                        <div className={`w-12 h-12 rounded-full ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                          <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                        </div>
                        <div className="pt-1">
                          <p className="text-base font-medium text-gray-900">{cfg.label(event)}</p>
                          <p className="text-xs text-gray-400 mt-1.5">{relativeTime(event.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Smart Quick Actions */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 transition-all hover:shadow-md">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>

              {loading ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {smartActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      className={`w-full text-left px-5 py-4 rounded-2xl border border-gray-100 ${action.accent.border} ${action.accent.bg} transition-all duration-200 flex items-center justify-between group`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`text-gray-400 group-hover:text-current transition-colors ${action.accent.text}`}>
                          {action.icon}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium text-gray-900 ${action.accent.text} transition-colors`}>
                            {action.title}
                          </span>
                          <span className="text-xs text-gray-500 mt-0.5">{action.subtitle}</span>
                        </div>
                      </div>
                      <span className={`text-gray-300 ${action.accent.arrow} text-lg transform group-hover:translate-x-1 transition-all`}>
                        →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPromptModal && patients.length > 0 && (
        <MemoryPromptModal
          patients={patients}
          onClose={() => setShowPromptModal(false)}
        />
      )}
    </div>
  );
}
