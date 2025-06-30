"use client";

import { createContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/backend/firebaseConfig";

export const UserContext = createContext<User | null>(null);

export default function UserContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthChecked(true); // ✅ auth check complete
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthChecked) return; // Wait until Firebase finishes
    const publicRoutes = ["/login", "/onboarding"];
    const currentPath = window.location.pathname;

    if (!user && !publicRoutes.includes(currentPath)) {
      router.push("/login");
    }
  }, [user, isAuthChecked, router]);

  if (!isAuthChecked) {
    return <div className="p-10 text-center">Checking authentication...</div>;
  }

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
