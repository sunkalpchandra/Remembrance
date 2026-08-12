"use client";
import { useEffect, useState } from "react";
import { getPatientProfile } from "@/app/actions";

export type FamilyMember = { name: string; relation: string };

export type Profile = {
  patientName?: string;
  age?: number;
  family?: FamilyMember[];
  places?: string[];
  notes?: string;
};

const KEY = "remembrance:profile";

const DEFAULT_PROFILE: Profile = {};

function read(): Profile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(() => read());

  useEffect(() => {
    setProfile(read());

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
            localStorage.setItem(KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      })
      .catch(() => {});
  }, []);

  const update = (patch: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return { profile, update };
}

export function getProfileSync(): Profile {
  return read();
}
