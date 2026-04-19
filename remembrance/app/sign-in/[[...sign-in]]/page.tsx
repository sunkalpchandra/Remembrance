"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <Link
        href="/"
        className="absolute top-6 left-6 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        ← Back
      </Link>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-normal text-gray-900 mb-2">
          Welcome back
        </h1>
        <p className="text-sm text-gray-500">
          Continue your journey through memory
        </p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full max-w-sm",
            card: "shadow-none border border-gray-200 rounded-2xl",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton:
              "border-gray-200 hover:bg-gray-50 text-gray-700",
            formButtonPrimary:
              "bg-black hover:bg-gray-800 text-sm normal-case",
            footerActionLink: "text-black hover:text-gray-700",
          },
        }}
        signUpUrl="/sign-up"
        forceRedirectUrl="/"
      />
    </div>
  );
}
