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
      <div className="p-6 bg-white shadow-md rounded-md w-full max-w-md">
        <h1 className="text-xl font-semibold mb-4">Set your username</h1>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. alex"
          className="w-full p-2 border border-gray-300 rounded-md mb-4"
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
