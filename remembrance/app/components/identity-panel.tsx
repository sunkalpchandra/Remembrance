"use client";
import { Profile } from "@/app/hooks/useProfile";

const todayStr = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export function IdentityPanel({ profile }: { profile: Profile }) {
  const hasAnything =
    profile.patientName ||
    (profile.family && profile.family.length > 0) ||
    (profile.places && profile.places.length > 0);
  if (!hasAnything) return null;

  return (
    <div className="w-full max-w-3xl mx-auto px-5 py-3 border-b border-gray-100 bg-white/60 backdrop-blur-sm">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-base">
        {profile.patientName && (
          <span className="text-gray-900 font-medium">
            Hello, {profile.patientName}
          </span>
        )}
        <span className="text-gray-500">{todayStr()}</span>
      </div>
      {profile.family && profile.family.length > 0 && (
        <div className="mt-1 text-sm text-gray-600">
          Family:&nbsp;
          {profile.family
            .map((f) => `${f.name} (${f.relation})`)
            .join(" · ")}
        </div>
      )}
      {profile.places && profile.places.length > 0 && (
        <div className="mt-0.5 text-sm text-gray-500">
          Places:&nbsp;{profile.places.join(" · ")}
        </div>
      )}
    </div>
  );
}
