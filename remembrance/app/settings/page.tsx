"use client";

import { useState, useTransition } from "react";
import {
  UserPlus,
  Settings,
  Bell,
  Shield,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { deleteAccount } from "./actions";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const [isDeleting, startTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

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

  const handleDeleteAccount = () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone and all data will be permanently erased.",
      )
    )
      return;

    startTransition(async () => {
      const result = await deleteAccount();
      if (result.success) {
        try {
          await signOut();
        } catch (e) {
          // Ignore if sign out fails because session is already destroyed
        }
        window.location.href = "/sign-in";
      } else {
        alert(result.error || "Failed to delete account");
      }
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="w-8 h-8 text-neutral-400" />
            Settings
          </h1>
          <p className="text-neutral-400 mt-2">
            Manage your account preferences and caregiver access.
          </p>
        </div>

        {/* Caregiver Invite Section */}
        <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Invite a Caregiver</h2>
              <p className="text-sm text-neutral-400 mt-1">
                Invite a family member or doctor to securely access your
                profile, monitor your memories, and help manage your account.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleInviteCaregiver}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="email"
                placeholder="caregiver@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={inviteStatus === "loading" || !inviteEmail}
              className="bg-white text-black font-medium py-3 px-6 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {inviteStatus === "loading" ? "Sending..." : "Send Invite"}
            </button>
          </form>

          {inviteStatus === "success" && (
            <p className="text-emerald-400 text-sm mt-3">
              Invite sent successfully! They will receive an email shortly.
            </p>
          )}
          {inviteStatus === "error" && (
            <p className="text-red-400 text-sm mt-3">
              Failed to send invite. Please try again.
            </p>
          )}
        </section>

        {/* Other Settings Placeholder */}
        <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Preferences</h2>

          <div className="flex items-center justify-between py-3 border-b border-neutral-800/50">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-neutral-400" />
              <div>
                <p className="font-medium">Notifications</p>
                <p className="text-sm text-neutral-500">
                  Manage email and push alerts
                </p>
              </div>
            </div>
            <button className="text-sm bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors">
              Configure
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-neutral-400" />
              <div>
                <p className="font-medium">Privacy & Security</p>
                <p className="text-sm text-neutral-500">
                  Data sharing and HIPAA compliance
                </p>
              </div>
            </div>
            <button className="text-sm bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors">
              Manage
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-950/20 border border-red-900/50 rounded-2xl p-6 mt-8">
          <h2 className="text-xl font-semibold text-red-500 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h2>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-red-200">Delete Account</p>
              <p className="text-sm text-red-400/80">
                Permanently remove your account and all associated data.
              </p>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
