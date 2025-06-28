// 'use client'
 
// import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import { onAuthStateChanged } from 'firebase/auth';
// import { auth } from '@/backend/config';
// import { User } from 'firebase/auth';
// export const UserContext = createContext({
//           name: "John Test",
//           email: "JohnTest@gmail.com"
//         } as User);

// export default function UserCotextProvider({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   return <UserContext.Provider value= {{
//           name: "John Test",
//           email: "JohnTest@gmail.com"
//         }}>{children}</UserContext.Provider>
// }

"use client";

import { createContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/backend/firebaseConfig";

export const UserContext = createContext<User | null>(null);

export default function UserContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Redirect only if user is null and not already on /login
    if (user === null && pathname !== "/login") {
      router.push("/login");
    }
  }, [user, pathname, router]);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
