"use client"

import { useContext, useEffect } from "react"
import { UserContext } from "./usercontext"
import { useRouter } from "next/navigation"

function getInitals(name : string) : string{
    name = name.trim()
    let num = name.split(" ");

    let first = name.substring(0,1)
    if(num.length == 1){
        return first.toUpperCase();
    }
    else {
        // Use a Unicode hair space between initials for an even smaller gap
        return first + "\u200A" + name.substring(num[0].length + 1, num[0].length + 2)
    }

}
export function UserProfile(){
    const user = useContext(UserContext);
    const router = useRouter();

    useEffect(() => {
        if (!user) {
            router.push("/login")
        }
    }, [user, router]);

    if (!user) {
        return null;
    }

    return (
      <div className="bg-black rounded-full text-white flex items-center justify-center w-10 h-10 text-lg font-semibold">
        {getInitals(user.displayName ?? user.email ?? "")}
      </div>
    );
}