'use client'
 
import { createContext } from 'react'
import { User } from '../lib/types';
export const UserContext = createContext({
          name: "John Test",
          email: "JohnTest@gmail.com"
        } as User);

export default function UserCotextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <UserContext.Provider value= {{
          name: "John Test",
          email: "JohnTest@gmail.com"
        }}>{children}</UserContext.Provider>
}