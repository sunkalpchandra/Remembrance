"use client";

import { createContext, ReactNode } from "react";
import { useUser } from "@clerk/nextjs";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
}

const anonymousUser: AppUser = {
  uid: "anonymous",
  email: "",
  displayName: "Guest",
};

export const UserContext = createContext<AppUser>(anonymousUser);

export default function UserContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isLoaded } = useUser();

  const appUser: AppUser = isLoaded && user
    ? {
        uid: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        displayName:
          user.fullName ||
          user.firstName ||
          user.primaryEmailAddress?.emailAddress ||
          "Friend",
      }
    : anonymousUser;

  return <UserContext.Provider value={appUser}>{children}</UserContext.Provider>;
}
