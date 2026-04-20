"use client";

import { useState, useTransition } from "react";
import {
  UserPlus,
  Settings,
  Bell,
  Shield,
  Mail,
  AlertTriangle,
  X,
  User,
  ChevronRight,
} from "lucide-react";
import { deleteAccount } from "../settings/actions";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [isDeleting, startTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [activeTab, setActiveTab] = useState("general");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteArea, setShowDeleteArea] = useState(false);

  if (!isOpen) return null;

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

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "caregiver", label: "Caregiver", icon: UserPlus },
    { id: "account", label: "Account", icon: User },
  ].filter(
    (tab) =>
      tab.id !== "caregiver" || user?.publicMetadata?.role !== "caregiver",
  );

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
                    <div className="text-sm font-medium">Notifications</div>
                    <button className="text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 px-4 py-1.5 rounded-lg transition-colors">
                      Configure
                    </button>
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
                    <button className="text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 px-4 py-1.5 rounded-lg transition-colors">
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
                          To confirm, type: <br />
                          <span className="font-mono text-xs select-all bg-red-100/50 border border-red-200/50 p-1.5 rounded mt-2 block text-red-700">
                            {expectedConfirmText}
                          </span>
                        </p>
                        <textarea
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
