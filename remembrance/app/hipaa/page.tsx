"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { acceptHipaaAgreement } from "./actions";
import { ShieldCheck, AlertTriangle } from "lucide-react";

const AGREEMENT_DATE = "April 2026";
const AGREEMENT_VERSION = "1.0";

export default function HipaaAgreementPage() {
  const router = useRouter();
  const { user } = useUser();
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const name = user?.fullName || user?.firstName || "Caregiver";

  const handleAccept = () => {
    if (!checked) return;
    setError("");
    startTransition(async () => {
      try {
        await acceptHipaaAgreement();
        await user?.reload();
        router.push("/dashboard");
        router.refresh();
      } catch (e: any) {
        setError(e.message || "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Remembrance Access Caregiver Agreement
            </h1>
            <p className="text-sm text-gray-500">
              Version {AGREEMENT_VERSION} · {AGREEMENT_DATE}
            </p>
          </div>
        </div>

        {/* Agreement document */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="px-8 py-6 border-b border-gray-100">
            <p className="text-sm text-gray-500">
              Before creating patient accounts and accessing their data through
              Remembrance, you must read and accept this agreement. It is
              retained on file and cannot be revoked.
            </p>
          </div>

          <div className="px-8 py-6 max-h-[55vh] overflow-y-auto space-y-6 text-sm text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">
                1. Purpose
              </h2>
              <p>
                This agreement governs your use of Remembrance as a caregiver,
                including your ability to provision patient accounts, access
                Protected Health Information (PHI), and manage cognitive care
                data on behalf of individuals under your care. By accepting, you
                are entering into a relationship with Remembrance in which we
                provide you access to our platform and its patient management
                tools. This agreement is entered into pursuant to the Health
                Insurance Portability and Accountability Act of 1996 (HIPAA),
                the Health Information Technology for Economic and Clinical
                Health Act (HITECH), and all applicable implementing
                regulations.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">
                2. Definitions
              </h2>
              <p className="mb-2">
                <span className="font-medium">
                  "Protected Health Information" (PHI)
                </span>{" "}
                means individually identifiable health information — including
                cognitive assessments, memory records, conversation transcripts,
                and any other data collected through Remembrance — that relates
                to the past, present, or future physical or mental health of an
                individual.
              </p>
              <p>
                <span className="font-medium">
                  "Minimum Necessary Standard"
                </span>{" "}
                means that you may only access and use the minimum amount of PHI
                necessary to accomplish the intended care purpose, as required
                by 45 CFR § 164.502(b).
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">
                3. Caregiver Access & Account Provisioning
              </h2>
              <p className="mb-2">
                As a caregiver on Remembrance, you are granted the ability to
                create and manage patient accounts on behalf of individuals in
                your care. By doing so, you represent and warrant that:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>
                  You have obtained valid authorization or consent from each
                  patient (or their legal guardian) prior to creating their
                  account
                </li>
                <li>
                  You are a licensed or otherwise qualified caregiver with a
                  legitimate care relationship to each patient you enroll
                </li>
                <li>
                  You will not create accounts for individuals outside your
                  direct care
                </li>
                <li>
                  You understand that Remembrance is providing this access in
                  reliance on your representations
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">
                4. Permitted Uses
              </h2>
              <p>
                You are authorized to access patient data solely for the
                following purposes:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-gray-600">
                <li>
                  Monitoring the cognitive health and wellbeing of patients
                  under your direct care
                </li>
                <li>
                  Reviewing memory records and conversation transcripts to
                  inform care decisions
                </li>
                <li>
                  Adding clinical notes, memory prompts, and care observations
                </li>
                <li>
                  Coordinating care with other authorized healthcare
                  professionals
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">
                5. Prohibited Uses
              </h2>
              <p>
                You expressly agree <span className="font-medium">not</span> to:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-gray-600">
                <li>
                  Disclose PHI to any unauthorized third party for any purpose
                </li>
                <li>
                  Use PHI for marketing, research, or any commercial purpose
                  without explicit written consent
                </li>
                <li>Access records of patients not assigned to your care</li>
                <li>
                  Screenshot, export, or copy PHI outside of authorized care
                  workflows
                </li>
                <li>Share your login credentials with any other person</li>
                <li>
                  Create patient accounts without proper consent or
                  authorization from the patient
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">
                6. Security Obligations
              </h2>
              <p>
                You agree to implement reasonable administrative, physical, and
                technical safeguards to protect the confidentiality, integrity,
                and availability of all PHI you access. You must immediately
                report any suspected or actual breach of PHI to us at{" "}
                <a
                  href="mailto:mesuclub@gmail.com"
                  className="text-blue-600 hover:underline"
                >
                  mesuclub@gmail.com
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">
                7. Patient Rights
              </h2>
              <p>
                You acknowledge that patients retain all rights afforded to them
                under HIPAA, including the right to access their own records,
                request corrections, and receive an accounting of disclosures.
                You will not impede the exercise of any patient right.
                Remembrance retains the ability to delete or restrict access to
                patient data at the patient's request.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">
                8. Term and Termination
              </h2>
              <p>
                This agreement is effective upon your acceptance and remains in
                force for the duration of your access to Remembrance.
                Obligations regarding PHI confidentiality survive termination
                indefinitely. Violations may result in immediate access
                revocation and civil or criminal liability under 45 CFR Parts
                160 and 164. To request changes to your access or to report a
                concern, contact us at{" "}
                <a
                  href="mailto:mesuclub@gmail.com"
                  className="text-blue-600 hover:underline"
                >
                  mesuclub@gmail.com
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-2">
                9. Acknowledgment
              </h2>
              <p>
                By accepting this agreement, you confirm that you have read,
                understood, and agree to be legally bound by these terms. Your
                acceptance is time-stamped and retained as part of our HIPAA
                compliance records.
              </p>
            </section>
          </div>
        </div>

        {/* Signature area */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-5 h-5 mt-0.5 flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-sm text-gray-600">
              This is a legally binding agreement. Your name, timestamp, and IP
              address are recorded upon acceptance.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded border-2 transition-all ${checked ? "bg-gray-900 border-gray-900" : "border-gray-300 group-hover:border-gray-400"} flex items-center justify-center`}
              >
                {checked && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-gray-700 leading-relaxed">
              I, <span className="font-medium text-gray-900">{name}</span>, have
              read and fully understand this HIPAA Caregiver Agreement. I agree
              to be bound by its terms and acknowledge my responsibility to
              safeguard all patient health information I access through
              Remembrance.
            </span>
          </label>
        </div>

        {error && <p className="text-sm text-red-500 mb-4 px-1">{error}</p>}

        <button
          onClick={handleAccept}
          disabled={!checked || isPending}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3.5 rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          {isPending
            ? "Recording agreement…"
            : "I Accept. Continue to Dashboard"}
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">
          By clicking accept, your agreement is recorded with a timestamp under
          your account.
        </p>
      </div>
    </div>
  );
}
