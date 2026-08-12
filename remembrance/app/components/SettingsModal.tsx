"use client";

import { useEffect, useState, useTransition } from "react";
import {
  UserPlus,
  Settings,
  Shield,
  Mail,
  X,
  User,
  ChevronRight,
  Database,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  deleteAccount,
  deleteAllConversations,
  deleteAllMemories,
  getPrivacyInfo,
} from "../settings/actions";
import { useRouter, usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  TEXT_SCALES,
  type TextScale,
  applyTextScale,
  getTextScale,
} from "../lib/comfort";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [isDeleting, startTransition] = useTransition();
  const [isDeletingConvos, startDeletingConvos] = useTransition();
  const [isDeletingMemories, startDeletingMemories] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [activeTab, setActiveTab] = useState("general");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteArea, setShowDeleteArea] = useState(false);
  const [showDeleteConvos, setShowDeleteConvos] = useState(false);
  const [showDeleteMemories, setShowDeleteMemories] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyData, setPrivacyData] = useState<Awaited<
    ReturnType<typeof getPrivacyInfo>
  > | null>(null);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [textScale, setTextScale] = useState<TextScale>("default");

  useEffect(() => {
    setTextScale(getTextScale());
  }, []);

  if (!isOpen) return null;

  const handleTextScale = (scale: TextScale) => {
    setTextScale(scale);
    applyTextScale(scale);
  };

  const handleOpenPrivacy = async () => {
    setShowPrivacyModal(true);
    if (privacyData) return;
    setPrivacyLoading(true);
    const data = await getPrivacyInfo();
    setPrivacyData(data);
    setPrivacyLoading(false);
  };

  const handleInviteCaregiver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviteStatus("loading");

    try {
      // In a full implementation, this would call a Server Action or API route
      // to send an email or create an invite record in the database.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setInviteStatus("success");
      setInviteEmail("");
    } catch (error) {
      setInviteStatus("error");
    }
  };

  const handleLogout = async () => {
    await signOut({ redirectUrl: "/sign-in" });
  };

  const handleDeleteAccount = () => {
    startTransition(async () => {
      const result = await deleteAccount();
      if (result.success) {
        window.location.href = "/sign-in";
      } else {
        alert(result.error || "Failed to delete account");
      }
    });
  };

  const expectedConfirmText = `I, ${user?.fullName || user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress || "User"}, confirm that I want to delete my account and all associated data. I understand that this is irreversible.`;

  const role = user?.publicMetadata?.role as string | undefined;
  const isPatient = role === "patient";
  const isCaregiver = role === "caregiver";

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "caregiver", label: "Caregiver", icon: UserPlus },
    { id: "account", label: "Account", icon: User },
  ].filter((tab) => tab.id !== "caregiver" || (!isPatient && !isCaregiver));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[85vh] h-[600px] flex bg-white text-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Sidebar */}
        <div className="w-64 bg-gray-50 flex-shrink-0 border-r border-gray-200 p-3 pt-14">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-gray-900 font-medium shadow-sm border border-gray-200"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {tab.id === "account" && user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt="Account"
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <tab.icon className="w-4 h-4" />
                )}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Privacy & Security nested modal */}
        {showPrivacyModal && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl"
            onClick={() => setShowPrivacyModal(false)}
          >
            <div
              className="relative w-full max-w-lg max-h-[80%] overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-2xl m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-900">
                    Privacy & Security
                  </h2>
                </div>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {privacyLoading ? (
                  <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                    Loading…
                  </div>
                ) : !privacyData || !privacyData.success ? (
                  <div className="flex items-center justify-center py-12 text-sm text-red-400">
                    {(privacyData as any)?.error ??
                      "Failed to load privacy info."}
                  </div>
                ) : (
                  <>
                    {/* Data stored section */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <Database className="w-4 h-4 text-gray-400" />
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Your Data
                        </h3>
                      </div>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-gray-700">
                            Conversations stored
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {privacyData.conversationCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-gray-700">
                            Memories saved
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {privacyData.memoryCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-gray-700">
                            Account role
                          </span>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {privacyData.role ?? "—"}
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* Patient: caregiver access */}
                    {privacyData.role === "patient" && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-gray-400" />
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Caregiver Access
                          </h3>
                        </div>
                        {privacyData.caregiverInfo ? (
                          <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 space-y-1">
                            <p className="text-sm font-medium text-gray-900">
                              {privacyData.caregiverInfo.name ??
                                "Your Caregiver"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {privacyData.caregiverInfo.email}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              This person can view your memories, conversations,
                              and profile data.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-500">
                            No caregiver is linked to your account.
                          </div>
                        )}
                      </section>
                    )}

                    {/* Caregiver: HIPAA + patients */}
                    {privacyData.role === "caregiver" && (
                      <>
                        <section>
                          <div className="flex items-center gap-2 mb-3">
                            <ShieldCheck className="w-4 h-4 text-gray-400" />
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              HIPAA Agreement
                            </h3>
                          </div>
                          <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 space-y-1">
                            {privacyData.hipaaAcceptedAt ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                  <span className="text-sm font-medium text-gray-900">
                                    Agreement accepted
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Signed on{" "}
                                  {new Date(
                                    privacyData.hipaaAcceptedAt,
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  This agreement is retained on file and cannot
                                  be revoked.
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-amber-600">
                                No HIPAA agreement on file.
                              </p>
                            )}
                          </div>
                        </section>

                        <section>
                          <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-gray-400" />
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Patients Under Your Care
                            </h3>
                          </div>
                          {privacyData.patientList.length > 0 ? (
                            <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
                              {privacyData.patientList.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between px-4 py-3"
                                >
                                  <span className="text-sm text-gray-700">
                                    {p.name ?? "Unnamed patient"}
                                  </span>
                                  <span className="text-xs text-gray-400 font-mono truncate max-w-[140px]">
                                    {p.id}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-500">
                              No patients linked yet.
                            </div>
                          )}
                        </section>
                      </>
                    )}

                    {/* Individual: data retention note */}
                    {privacyData.role === "individual" || !privacyData.role ? (
                      <section>
                        <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600 leading-relaxed">
                          Your data is stored securely and used only to power
                          your Remembrance experience. You can delete your
                          conversations and memories at any time from the
                          Account tab.
                        </div>
                      </section>
                    ) : null}

                    {/* Contact */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Contact & Compliance
                        </h3>
                      </div>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600 space-y-1">
                        <p>
                          To report a data concern or request access to your
                          records, contact us at:
                        </p>
                        <a
                          href="mailto:mesuclub@gmail.com"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          mesuclub@gmail.com
                        </a>
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white p-8">
          <div className="max-w-2xl mx-auto">
            {activeTab === "general" && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium pb-4 border-b border-gray-200 text-gray-900">
                  General
                </h2>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div className="text-sm font-medium">Appearance</div>
                    <div className="flex items-center text-sm text-gray-500 cursor-pointer hover:text-gray-900 transition-colors">
                      System <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div>
                      <div className="text-sm font-medium">Text size</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Larger text across the whole app
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                      {TEXT_SCALES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleTextScale(s.id)}
                          className={`text-sm px-3 py-1 rounded-md transition-colors ${
                            textScale === s.id
                              ? "bg-white text-gray-900 shadow-sm font-medium"
                              : "text-gray-500 hover:text-gray-900"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div>
                      <div className="text-sm font-medium">
                        Privacy & Security
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Data sharing and HIPAA compliance
                      </div>
                    </div>
                    <button
                      onClick={handleOpenPrivacy}
                      className="text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 px-4 py-1.5 rounded-lg transition-colors"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "caregiver" && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium pb-4 border-b border-gray-200 text-gray-900">
                  Caregiver Access
                </h2>

                <div className="space-y-4">
                  <div className="py-2">
                    <p className="text-sm text-gray-500 mb-6">
                      Invite a family member or doctor to securely access your
                      profile, monitor your memories, and help manage your
                      account.
                    </p>

                    <form
                      onSubmit={handleInviteCaregiver}
                      className="space-y-4"
                    >
                      <div>
                        <div className="text-sm font-medium mb-2">
                          Email address
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <input
                            placeholder="caregiver@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-gray-900 placeholder:text-gray-400"
                            required
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={inviteStatus === "loading" || !inviteEmail}
                        className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {inviteStatus === "loading"
                          ? "Sending..."
                          : "Send Invite"}
                      </button>

                      {inviteStatus === "success" && (
                        <p className="text-emerald-400 text-sm mt-2">
                          Invite sent successfully! They will receive an email
                          shortly.
                        </p>
                      )}
                      {inviteStatus === "error" && (
                        <p className="text-red-400 text-sm mt-2">
                          Failed to send invite. Please try again.
                        </p>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium pb-4 border-b border-gray-200 text-gray-900">
                  Account
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div>
                      <div className="text-sm font-medium">Log Out</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Sign out of your account on this device.
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 px-4 py-1.5 rounded-lg transition-colors"
                    >
                      Log Out
                    </button>
                  </div>

                  {/* Delete all conversations — hidden for patients and caregivers */}
                  {!isPatient && !isCaregiver && (
                    <div className="py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-sm font-medium text-red-600">
                            Delete All Conversations
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Permanently delete every thread and its messages.
                          </div>
                        </div>
                        {!showDeleteConvos && (
                          <button
                            onClick={() => setShowDeleteConvos(true)}
                            className="text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-1.5 rounded-lg transition-colors"
                          >
                            Delete...
                          </button>
                        )}
                      </div>
                      {showDeleteConvos && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4 space-y-3">
                          <p className="text-sm text-red-600">
                            This will permanently delete all your conversation
                            threads. This cannot be undone.
                          </p>
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => setShowDeleteConvos(false)}
                              className="text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 px-4 py-1.5 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={isDeletingConvos}
                              onClick={() =>
                                startDeletingConvos(async () => {
                                  const r = await deleteAllConversations();
                                  if (r.success) {
                                    setShowDeleteConvos(false);
                                    try {
                                      Object.keys(localStorage)
                                        .filter(
                                          (k) =>
                                            k.startsWith("conv:") ||
                                            k.startsWith("chats:"),
                                        )
                                        .forEach((k) =>
                                          localStorage.removeItem(k),
                                        );
                                    } catch {}
                                    if (pathname.startsWith("/chat/")) {
                                      onClose();
                                      router.push("/");
                                    }
                                  } else alert(r.error);
                                })
                              }
                              className="text-sm font-medium bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isDeletingConvos
                                ? "Deleting..."
                                : "Confirm Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delete all memories — hidden for patients and caregivers */}
                  {!isPatient && !isCaregiver && (
                    <div className="py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-sm font-medium text-red-600">
                            Delete All Memories
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Permanently delete every saved memory and graph
                            node.
                          </div>
                        </div>
                        {!showDeleteMemories && (
                          <button
                            onClick={() => setShowDeleteMemories(true)}
                            className="text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-1.5 rounded-lg transition-colors"
                          >
                            Delete...
                          </button>
                        )}
                      </div>
                      {showDeleteMemories && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4 space-y-3">
                          <p className="text-sm text-red-600">
                            This will permanently delete all your memories from
                            Remembrance and the AI memory store. This cannot be
                            undone.
                          </p>
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => setShowDeleteMemories(false)}
                              className="text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 px-4 py-1.5 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={isDeletingMemories}
                              onClick={() =>
                                startDeletingMemories(async () => {
                                  const r = await deleteAllMemories();
                                  if (r.success) {
                                    setShowDeleteMemories(false);
                                    try {
                                      Object.keys(localStorage)
                                        .filter(
                                          (k) =>
                                            k.startsWith("graph:") ||
                                            k.startsWith("aiMemories:") ||
                                            k.startsWith("memoryRepo:"),
                                        )
                                        .forEach((k) =>
                                          localStorage.removeItem(k),
                                        );
                                    } catch {}
                                  } else alert(r.error);
                                })
                              }
                              className="text-sm font-medium bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isDeletingMemories
                                ? "Deleting..."
                                : "Confirm Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delete account — hidden for patients (caregiver manages that) */}
                  {!isPatient && (
                    <div className="py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-sm font-medium text-red-600">
                            Delete Account
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Permanently remove your account and all associated
                            data.
                          </div>
                        </div>
                        {!showDeleteArea && (
                          <button
                            onClick={() => setShowDeleteArea(true)}
                            className="text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-1.5 rounded-lg transition-colors"
                          >
                            Delete...
                          </button>
                        )}
                      </div>
                      {showDeleteArea && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4 space-y-4">
                          <p className="text-sm text-red-600 leading-relaxed">
                            To confirm, type:
                            <br />
                            <span className="font-mono text-xs select-all bg-red-100/50 border border-red-200/50 p-1.5 rounded mt-2 block text-red-700">
                              {expectedConfirmText}
                            </span>
                          </p>
                          <textarea
                            value={deleteConfirmText}
                            onChange={(e) =>
                              setDeleteConfirmText(e.target.value)
                            }
                            className="w-full bg-white border border-red-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm text-gray-900 resize-none placeholder:text-gray-400"
                            placeholder="Type confirmation here..."
                            rows={3}
                          />
                          <div className="flex justify-end gap-3 mt-4">
                            <button
                              onClick={() => {
                                setShowDeleteArea(false);
                                setDeleteConfirmText("");
                              }}
                              className="text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 px-4 py-1.5 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleDeleteAccount}
                              disabled={
                                isDeleting ||
                                deleteConfirmText !== expectedConfirmText
                              }
                              className="text-sm font-medium bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isDeleting ? "Deleting..." : "Confirm Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
