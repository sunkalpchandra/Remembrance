"use client";

import React, { useContext, useEffect, useState, useTransition } from "react";
import CaregiverSidebar from "@/app/components/caregiverSidebar";
import { UserContext } from "@/app/components/usercontext";
import {
  getPatients,
  createPatientAccount,
  createNote,
  getNotes,
  deletePatientAccount,
  updatePatient,
  getPatientMemories,
  updatePatientMemory,
  deletePatientMemory,
} from "./actions";
import {
  X,
  UserPlus,
  Mail,
  Lock,
  User as UserIcon,
  FileText,
  Plus,
  Trash2,
  Pencil,
  BookOpen,
  Calendar,
} from "lucide-react";

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

type Memory = {
  id: string;
  name: string;
  summary: string | null;
  createdAt: Date;
};

// Deterministic avatar gradient from patient name
const AVATAR_GRADIENTS = [
  "from-blue-400 to-indigo-500",
  "from-violet-400 to-purple-500",
  "from-emerald-400 to-teal-500",
  "from-pink-400 to-rose-500",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-cyan-500",
];

function avatarGradient(name: string | null) {
  if (!name) return AVATAR_GRADIENTS[0];
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
}

function formatJoined(date: Date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function ManagePatientsPage() {
  const user = useContext(UserContext);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [createError, setCreateError] = useState("");

  // Notes
  const [notePatient, setNotePatient] = useState<Patient | null>(null);
  const [patientNotes, setPatientNotes] = useState<Note[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteError, setNoteError] = useState("");
  const [isNotePending, startNoteTransition] = useTransition();
  const [isNotesLoading, setIsNotesLoading] = useState(false);

  // Edit
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [editError, setEditError] = useState("");
  const [isEditPending, startEditTransition] = useTransition();

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState("");

  // Memories
  const [memoriesPatient, setMemoriesPatient] = useState<Patient | null>(null);
  const [patientMemories, setPatientMemories] = useState<Memory[]>([]);
  const [isMemoriesLoading, setIsMemoriesLoading] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [memoryEditForm, setMemoryEditForm] = useState({ name: "", summary: "" });
  const [isMemoryEditPending, startMemoryEditTransition] = useTransition();
  const [isMemoryDeletePending, startMemoryDeleteTransition] = useTransition();

  const fetchPatients = async () => {
    setIsLoading(true);
    try { setPatients((await getPatients()) as Patient[]); }
    catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchPatients(); }, []);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!formData.name || !formData.email || !formData.password) { setCreateError("Please fill in all fields."); return; }
    startTransition(async () => {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("email", formData.email);
      data.append("password", formData.password);
      const result = await createPatientAccount(data);
      if (result.error) { setCreateError(result.error); }
      else { setIsCreateModalOpen(false); setFormData({ name: "", email: "", password: "" }); await fetchPatients(); }
    });
  };

  const openNotesModal = async (patient: Patient) => {
    setNotePatient(patient); setNoteTitle(""); setNoteContent(""); setNoteError(""); setIsNotesLoading(true);
    try { setPatientNotes((await getNotes(patient.id)) as Note[]); }
    catch (err) { console.error(err); }
    finally { setIsNotesLoading(false); }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault(); setNoteError("");
    if (!noteContent.trim()) { setNoteError("Note content cannot be empty."); return; }
    if (!notePatient) return;
    startNoteTransition(async () => {
      const result = await createNote(notePatient.id, noteTitle, noteContent);
      if (result.error) { setNoteError(result.error); }
      else { setNoteTitle(""); setNoteContent(""); setPatientNotes((await getNotes(notePatient.id)) as Note[]); }
    });
  };

  const openEditModal = (patient: Patient) => {
    setEditPatient(patient);
    setEditForm({ name: patient.patientName ?? "", email: patient.email ?? "" });
    setEditError("");
  };

  const handleEditPatient = async (e: React.FormEvent) => {
    e.preventDefault(); setEditError("");
    if (!editPatient) return;
    startEditTransition(async () => {
      const result = await updatePatient(editPatient.id, {
        name: editForm.name || undefined,
        email: editForm.email || undefined,
      });
      if (result.error) { setEditError(result.error); }
      else { setEditPatient(null); await fetchPatients(); }
    });
  };

  const handleDeletePatient = () => {
    if (!deleteTarget) return;
    setDeleteError("");
    startDeleteTransition(async () => {
      const result = await deletePatientAccount(deleteTarget.id);
      if (result.error) { setDeleteError(result.error); }
      else { setDeleteTarget(null); await fetchPatients(); }
    });
  };

  const openMemoriesModal = async (patient: Patient) => {
    setMemoriesPatient(patient); setEditingMemory(null); setIsMemoriesLoading(true);
    try { setPatientMemories((await getPatientMemories(patient.id)) as Memory[]); }
    catch (err) { console.error(err); }
    finally { setIsMemoriesLoading(false); }
  };

  const handleUpdateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory || !memoriesPatient) return;
    startMemoryEditTransition(async () => {
      const result = await updatePatientMemory(editingMemory.id, memoriesPatient.id, {
        name: memoryEditForm.name, summary: memoryEditForm.summary,
      });
      if (result.success) { setEditingMemory(null); setPatientMemories((await getPatientMemories(memoriesPatient.id)) as Memory[]); }
    });
  };

  const handleDeleteMemory = (memoryId: string) => {
    if (!memoriesPatient) return;
    startMemoryDeleteTransition(async () => {
      await deletePatientMemory(memoryId, memoriesPatient.id);
      setPatientMemories((await getPatientMemories(memoriesPatient.id)) as Memory[]);
    });
  };

  return (
    <div className="w-screen h-[100dvh] flex flex-row bg-white relative overflow-hidden">
      <CaregiverSidebar selected={3} />

      <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-y-auto">
        <div className="max-w-5xl w-full mx-auto p-8 md:p-12">

          {/* Header */}
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-2">Manage Patients</h1>
              <p className="text-gray-500">Create accounts and manage access for the patients under your care.</p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-2.5 px-5 rounded-xl transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" /> New Patient
            </button>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 p-6 animate-pulse h-52" />
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-14 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <UserIcon className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No patients yet</h3>
              <p className="text-sm text-gray-400 max-w-xs mb-7">
                Create patient accounts to start monitoring their cognitive health.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-2.5 px-5 rounded-xl transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Create First Patient
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {patients.map((patient) => (
                <div key={patient.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
                  {/* Card top: gradient strip */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${avatarGradient(patient.patientName)}`} />

                  <div className="p-6">
                    {/* Avatar + delete button */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient(patient.patientName)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <span className="text-white font-semibold text-lg tracking-wide">
                          {initials(patient.patientName)}
                        </span>
                      </div>
                      <button
                        onClick={() => { setDeleteTarget(patient); setDeleteError(""); }}
                        className="p-1.5 text-gray-200 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete patient"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="mb-5">
                      <h3 className="text-base font-semibold text-gray-900 leading-tight truncate">
                        {patient.patientName ?? "Unnamed Patient"}
                      </h3>
                      <p className="text-sm text-gray-400 truncate mt-0.5">{patient.email}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-300">
                        <Calendar className="w-3 h-3" />
                        <span>Since {formatJoined(patient.createdAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => openNotesModal(patient)}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-500 transition-colors text-xs font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        Notes
                      </button>
                      <button
                        onClick={() => openMemoriesModal(patient)}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gray-50 hover:bg-purple-50 hover:text-purple-600 text-gray-500 transition-colors text-xs font-medium"
                      >
                        <BookOpen className="w-4 h-4" />
                        Memories
                      </button>
                      <button
                        onClick={() => openEditModal(patient)}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 hover:text-gray-900 text-gray-500 transition-colors text-xs font-medium"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Create Patient Modal ── */}
      {isCreateModalOpen && (
        <div onClick={() => setIsCreateModalOpen(false)} className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">New Patient Account</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              {createError && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{createError}</div>}
              <form onSubmit={handleCreatePatient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <div className="relative"><UserIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Robert Smith" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <div className="relative"><Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="robert@example.com" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Temporary Password</label>
                  <div className="relative"><Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm" required minLength={8} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 ml-1">At least 8 characters</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
                  <button type="submit" disabled={isPending} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50">{isPending ? "Creating…" : "Create Account"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Patient Modal ── */}
      {editPatient && (
        <div onClick={() => setEditPatient(null)} className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Edit {editPatient.patientName}</h2>
              <button onClick={() => setEditPatient(null)} className="text-gray-400 hover:text-gray-600 p-1 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              {editError && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{editError}</div>}
              <form onSubmit={handleEditPatient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <div className="relative"><UserIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <div className="relative"><Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditPatient(null)} className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
                  <button type="submit" disabled={isEditPending} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50">{isEditPending ? "Saving…" : "Save Changes"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div onClick={() => setDeleteTarget(null)} className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Delete patient?</h2>
              <p className="text-sm text-gray-500 mb-1">
                This permanently deletes <span className="font-medium text-gray-800">{deleteTarget.patientName}</span>'s account, all conversations, memories, and data.
              </p>
              <p className="text-sm text-red-500 font-medium mb-4">This cannot be undone.</p>
              {deleteError && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{deleteError}</div>}
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
                <button onClick={handleDeletePatient} disabled={isDeletePending} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50">{isDeletePending ? "Deleting…" : "Delete Account"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Notes Modal ── */}
      {notePatient && (
        <div onClick={() => setNotePatient(null)} className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Notes — {notePatient.patientName}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Synced to the patient's AI memory</p>
              </div>
              <button onClick={() => setNotePatient(null)} className="text-gray-400 hover:text-gray-600 p-1 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 border-b border-gray-50 flex-shrink-0">
              <form onSubmit={handleAddNote} className="space-y-2.5">
                <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Title (optional)" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all" />
                <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Write a note about this patient…" rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none" />
                {noteError && <p className="text-red-500 text-xs">{noteError}</p>}
                <button type="submit" disabled={isNotePending} className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  <Plus className="w-4 h-4" />{isNotePending ? "Saving…" : "Add Note"}
                </button>
              </form>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {isNotesLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" /></div>
              ) : patientNotes.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No notes yet. Add one above.</p>
              ) : (
                <div className="space-y-2.5">
                  {patientNotes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      {note.title && <p className="text-sm font-medium text-gray-900 mb-1">{note.title}</p>}
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-2">{new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Memories Modal ── */}
      {memoriesPatient && (
        <div onClick={() => { setMemoriesPatient(null); setEditingMemory(null); }} className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Memories — {memoriesPatient.patientName}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Edit or remove memories from the patient's repository</p>
              </div>
              <button onClick={() => { setMemoriesPatient(null); setEditingMemory(null); }} className="text-gray-400 hover:text-gray-600 p-1 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {isMemoriesLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" /></div>
              ) : patientMemories.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No memories found for this patient.</p>
              ) : (
                <div className="space-y-2.5">
                  {patientMemories.map((memory) => (
                    <div key={memory.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      {editingMemory?.id === memory.id ? (
                        <form onSubmit={handleUpdateMemory} className="space-y-2">
                          <input type="text" value={memoryEditForm.name} onChange={(e) => setMemoryEditForm({ ...memoryEditForm, name: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
                          <textarea value={memoryEditForm.summary} onChange={(e) => setMemoryEditForm({ ...memoryEditForm, summary: e.target.value })} placeholder="Summary (optional)" rows={2} className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setEditingMemory(null)} className="flex-1 text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 py-1.5 rounded-lg transition-colors">Cancel</button>
                            <button type="submit" disabled={isMemoryEditPending} className="flex-1 text-sm text-white bg-gray-900 hover:bg-gray-800 py-1.5 rounded-lg transition-colors disabled:opacity-50">{isMemoryEditPending ? "Saving…" : "Save"}</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 leading-snug">{memory.name}</p>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => { setEditingMemory(memory); setMemoryEditForm({ name: memory.name, summary: memory.summary ?? "" }); }} className="p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteMemory(memory.id)} disabled={isMemoryDeletePending} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                          {memory.summary && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{memory.summary}</p>}
                          <p className="text-xs text-gray-300 mt-2">{new Date(memory.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        </>
                      )}
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
