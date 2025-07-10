"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/backend/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/backend/firebaseConfig";

const Onboarding = () => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, "users", user.uid), {
        username: username.trim(),
        createdAt: new Date(),
      });
      router.push("/");
    } catch (err) {
      setError("Failed to save username. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 w-full items-center flex flex-col max-w-md">
        <h1 className="text-xl flex font-normal mb-4">
          What would you like to be called?
        </h1>
        <div className="flex flex-col items-baseline w-full">
          <input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (e.target.value.length > 20 || e.target.value.length < 3) {
                setError("Nicknames must be between 3 and 20 characters long.");
              } else {
                setError("");
              }
            }}
            placeholder=""
            className={`w-full p-2 border border-gray-300 bg-gray-100 rounded-md ${
              error ? "border-red-500" : ""
            } ${error ? "mb-1" : "mb-4"}`}
          />
          {error && (
            <p className="text-red-500 text-sm text-left mb-4">{error}</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-zinc-950 text-white py-2 rounded-md hover:bg-zinc-800 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
