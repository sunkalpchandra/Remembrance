"use client";

import React, { useContext, useEffect, useState, useTransition } from "react";
import CaregiverSidebar from "@/app/components/caregiverSidebar";
import { UserContext } from "@/app/components/usercontext";
import { getPatients, createPatientAccount, createNote, getNotes } from "./actions";
import { X, UserPlus, Mail, Lock, User as UserIcon, FileText, Plus } from "lucide-react";

type Patient = {
  id: string;
  patientName: string | null;
  email: string | null;
  createdAt: Date;
};

type Note = {
  id: string;
  title: string | null;
  content: string;
  createdAt: Date;
};

export default function ManagePatientsPage() {
  const user = useContext(UserContext);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [createError, setCreateError] = useState("");

  // Notes state
  const [notePatient, setNotePatient] = useState<Patient | null>(null);
  const [patientNotes, setPatientNotes] = useState<Note[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteError, setNoteError] = useState("");
  const [isNotePending, startNoteTransition] = useTransition();
  const [isNotesLoading, setIsNotesLoading] = useState(false);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const data = await getPatients();
      setPatients(data as Patient[]);
    } catch (err) {
      console.error("Error fetching patients:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!formData.name || !formData.email || !formData.password) {
      setCreateError("Please fill in all fields.");
      return;
    }

    startTransition(async () => {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("email", formData.email);
      data.append("password", formData.password);

      const result = await createPatientAccount(data);

      if (result.error) {
        setCreateError(result.error);
      } else {
        setIsCreateModalOpen(false);
        setFormData({ name: "", email: "", password: "" });
        await fetchPatients();
      }
    });
  };

  const openNotesModal = async (patient: Patient) => {
    setNotePatient(patient);
    setNoteTitle("");
    setNoteContent("");
    setNoteError("");
    setIsNotesLoading(true);
    try {
      const notes = await getNotes(patient.id);
      setPatientNotes(notes as Note[]);
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setIsNotesLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoteError("");
    if (!noteContent.trim()) {
      setNoteError("Note content cannot be empty.");
      return;
    }
    if (!notePatient) return;

    startNoteTransition(async () => {
      const result = await createNote(notePatient.id, noteTitle, noteContent);
      if (result.error) {
        setNoteError(result.error);
      } else {
        setNoteTitle("");
        setNoteContent("");
        const updated = await getNotes(notePatient.id);
        setPatientNotes(updated as Note[]);
      }
    });
  };

  return (
    <div className="w-screen h-[100dvh] flex flex-row bg-white relative overflow-hidden">
      <CaregiverSidebar selected={3} />

      <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-y-auto relative">
        <div className="max-w-5xl w-full mx-auto p-8 md:p-12">
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">
                Manage Patients
              </h1>
              <p className="text-gray-500 text-lg">
                Create accounts and manage access for the patients under your care.
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <UserPlus className="w-5 h-5" />
              New Patient
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : patients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-lg flex-shrink-0">
                      {patient.patientName
                        ? patient.patientName
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .substring(0, 2)
                        : "?"}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-gray-900 font-semibold truncate text-lg">
                        {patient.patientName}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{patient.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6 border-t border-gray-50 pt-4">
                    <button
                      onClick={() => openNotesModal(patient)}
                      className="flex-1 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      Notes
                    </button>
                    <button className="flex-1 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 py-2 rounded-lg transition-colors">
                      Settings
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4">
                <UserIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Patients Yet</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                You haven't added any patients to your care network yet. Create their accounts to get started.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 font-medium py-2.5 px-6 rounded-xl transition-colors"
              >
                Create First Patient
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Patient Modal */}
      {isCreateModalOpen && (
        <div
          onClick={() => setIsCreateModalOpen(false)}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Create Patient Account</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-500 mb-6">
                Fill in the details below to provision a new account for your patient.
              </p>

              {createError && (
                <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreatePatient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Robert Smith"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm text-gray-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="robert@example.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm text-gray-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Temporary Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm text-gray-900"
                      required
                      minLength={8}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 ml-1">Must be at least 8 characters.</p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-xl transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? "Creating..." : "Create Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notePatient && (
        <div
          onClick={() => setNotePatient(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Notes — {notePatient.patientName}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Notes are synced to the patient's AI memory
                </p>
              </div>
              <button
                onClick={() => setNotePatient(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Note Form */}
            <div className="p-6 border-b border-gray-50 flex-shrink-0">
              <form onSubmit={handleAddNote} className="space-y-3">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                />
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write a note about this patient..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none"
                />
                {noteError && (
                  <p className="text-red-500 text-xs">{noteError}</p>
                )}
                <button
                  type="submit"
                  disabled={isNotePending}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {isNotePending ? "Saving..." : "Add Note"}
                </button>
              </form>
            </div>

            {/* Notes List */}
            <div className="overflow-y-auto flex-1 p-6">
              {isNotesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : patientNotes.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No notes yet. Add one above.</p>
              ) : (
                <div className="space-y-3">
                  {patientNotes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      {note.title && (
                        <p className="text-sm font-medium text-gray-900 mb-1">{note.title}</p>
                      )}
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(note.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
