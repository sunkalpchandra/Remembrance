"use client";

import { useContext, useEffect } from "react";
import { UserContext } from "./usercontext";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

interface UserProfileProps {
  onClick?: () => void;
  className?: string;
}

function getInitals(name: string): string {
  name = name.trim();
  let num = name.split(" ");

  let first = name.substring(0, 1);
  if (num.length === 1) {
    return first.toUpperCase();
  } else {
    // Use a Unicode hair space between initials for an even smaller gap
    return (
      first +
      "\u200A" +
      name.substring(num[0].length + 1, num[0].length + 2).toUpperCase()
    );
  }
}

export function UserProfile({ onClick, className = "" }: UserProfileProps) {
  const contextUser = useContext(UserContext);
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!contextUser) {
      router.push("/login");
    }
  }, [contextUser, router]);

  if (!contextUser) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`bg-black rounded-full text-white flex items-center justify-center w-10 h-10 text-sm font-semibold hover:bg-gray-800 hover:scale-105 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 shadow-sm overflow-hidden ${className}`}
      aria-label="User profile"
    >
      {user?.imageUrl ? (
        <img
          src={user.imageUrl}
          alt="User profile"
          className="w-full h-full object-cover"
        />
      ) : (
        getInitals(contextUser.displayName ?? contextUser.email ?? "")
      )}
    </button>
  );
}
