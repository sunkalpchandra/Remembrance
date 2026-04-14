"use client";

import { createContext, ReactNode } from "react";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
}

const demoUser: AppUser = {
  uid: "demo-user",
  email: "demo@remembrance.local",
  displayName: "Demo User",
};

export const UserContext = createContext<AppUser>(demoUser);

export default function UserContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <UserContext.Provider value={demoUser}>{children}</UserContext.Provider>;
}
