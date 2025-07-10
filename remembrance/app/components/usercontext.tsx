"use client";

import { createContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/backend/firebaseConfig";

export const UserContext = createContext<User | null>(null);

export default function UserContextProvider({
  children,
}: {
  children: ReactNode;
}) {
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
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white text-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 border-4 border-gray-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Firing up the neurons...
          </p>
        </div>
      </div>
    );
  }

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
