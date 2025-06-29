"use client"

import { useState } from "react"

export default function LoginButton() {
    return <><button onClick={() => {
        let username = (document.getElementById("username") as HTMLInputElement)?.value || ""
        let password = (document.getElementById("password") as HTMLInputElement)?.value || ""
        let error = document.getElementById("error");
        if (error != null) {
            if (username == "") {
                error.textContent = "Please Enter a username"
            }
            if (password == "") {
                error.textContent = "Please Enter a password"
            }
        }
        console.log("logging in with", username, password);
    }} className="rounded-md border border-black px-8 py-1 bg-[#D9D9D9] hover:bg-[#C9C9C9] grow-0 max-h-[100%] shadow-lg hover:shadow-neutral-400">Login</button>
    </>
}