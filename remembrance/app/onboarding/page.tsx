"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "./actions";
import { useUser } from "@clerk/nextjs";
import { FaHandHoldingHeart, FaPerson, FaPersonSkating } from "react-icons/fa6";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<"individual" | "caregiver" | null>(null);
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!role || !user) return;

    startTransition(async () => {
      setError("");

      const email =
        user.primaryEmailAddress?.emailAddress || "unknown@example.com";
      const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

      const result = await completeOnboarding({
        role,
        name,
        email,
      });

      if (result.success) {
        await user.reload();
        router.push(role === "caregiver" ? "/dashboard" : "/");
        router.refresh();
      } else {
        setError(result.error || "Failed to complete setup.");
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="max-w-xl w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Welcome to Remembrance
          </h1>
          <p className="text-muted-foreground text-lg">
            Let's get your account set up. How will you be using the app?
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => setRole("individual")}
            className={`flex flex-col items-center p-6 rounded-2xl border-2 transition-all ${
              role === "individual"
                ? "border-primary bg-card shadow-sm"
                : "border-border bg-card/50 hover:border-border/80 hover:bg-card"
            }`}
          >
            <div className="w-12 h-12 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <FaPersonSkating size={24} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Individual</h2>
            <p className="text-sm text-muted-foreground">
              I want to use Remembrance to log memories, chat, and remember my
              daily life.
            </p>
          </button>

          <button
            onClick={() => setRole("caregiver")}
            className={`flex flex-col items-center p-6 rounded-2xl border-2 transition-all ${
              role === "caregiver"
                ? "border-primary bg-card shadow-sm"
                : "border-border bg-card/50 hover:border-border/80 hover:bg-card"
            }`}
          >
            <div className="w-12 h-12 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <FaHandHoldingHeart size={24} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Caregiver</h2>
            <p className="text-sm text-muted-foreground">
              I am managing care for a loved one and want to monitor their
              memories and health.
            </p>
          </button>
        </div>

        <button
          onClick={handleNext}
          disabled={!role || isPending}
          className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-md"
        >
          {isPending ? "Setting up..." : "Complete Setup"}
        </button>
      </div>
    </div>
  );
}
