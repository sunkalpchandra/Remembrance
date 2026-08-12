"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getPatientProfile } from "@/app/actions";

export type FamilyMember = { name: string; relation: string };

export type Profile = {
  patientName?: string;
  age?: number;
  family?: FamilyMember[];
  places?: string[];
  notes?: string;
};

// Scoped per Clerk user so profiles never leak between accounts sharing
// a browser (common on family devices).
const keyFor = (uid: string | null | undefined) =>
  uid ? `remembrance:profile:${uid}` : null;

const DEFAULT_PROFILE: Profile = {};

function read(key: string | null): Profile {
  if (typeof window === "undefined" || !key) return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Profile) : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function useProfile() {
  const { user, isLoaded } = useUser();
  const key = keyFor(user?.id);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  useEffect(() => {
    if (!isLoaded || !key) return;
    setProfile(read(key));

    // Merge in the server-side profile (patients table) — this is where
    // caregiver-entered name/family/places live, and without it the chat
    // only ever saw this browser's localStorage.
    getPatientProfile()
      .then((res) => {
        if (!res.success || !res.data) return;
        const server: Profile = {
          patientName: res.data.patientName ?? undefined,
          age: res.data.age ?? undefined,
          family: (res.data.family as FamilyMember[] | null) ?? undefined,
          places: (res.data.places as string[] | null) ?? undefined,
          notes: res.data.notes ?? undefined,
        };
        const defined = Object.fromEntries(
          Object.entries(server).filter(([, v]) => v !== undefined),
        );
        if (Object.keys(defined).length === 0) return;
        setProfile((prev) => {
          const next = { ...prev, ...defined };
          try {
            localStorage.setItem(key, JSON.stringify(next));
          } catch {}
          return next;
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, key]);

  const update = (patch: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      if (key) {
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  return { profile, update };
}
