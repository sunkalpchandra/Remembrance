"use client";
import { useEffect, useState } from "react";

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
