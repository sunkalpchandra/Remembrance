"use client";

import LoginButton from "../components/loginbutton";
import { poppins } from "../lib/fonts";
import { auth } from "@/backend/firebaseConfig";
import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { FaGoogle } from "react-icons/fa";

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === "Enter") {
      handleEmailLogin();
    }
  };

  return (
    <div className="min-h-screen w-screen flex overflowx-hidden max-w-full">
      <div className="flex-1 max-w-[70%] flex flex-col relative">
        <div
          className="absolute top-5 left-5 cursor-pointer z-10 transition-transform hover:scale-105"
          onClick={() => router.push("/")}
        >
          <img src="/r-logo.svg" alt="R" className="w-12 h-12" />
        </div>

        <div className="flex-1 flex items-center justify-center px-10">
          <div className="w-full max-w-md flex flex-col gap-6">
            <div className="space-y-2">
              <h1 className={`text-4xl font-semibold text-gray-900 ${poppins.className}`}>
                Welcome to Remembrance
              </h1>
              <p className={`text-2xl text-[#c0bebd] leading-relaxed ${poppins.className}`}>
                Ultimate tool to preserve dignity and <br />
                identity for those facing cognitive decline
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className={`text-red-500 text-sm ${poppins.className}`}>
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleEmailLogin}
                  disabled={loading}
                  className="w-full rounded-md border border-black px-8 py-2 bg-[#D9D9D9] hover:bg-[#C9C9C9] disabled:bg-gray-200 disabled:cursor-not-allowed shadow-lg hover:shadow-neutral-400 transition-all font-medium"
                >
                  {loading ? "Signing in..." : "Login"}
                </button>

                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white p-2 shadow-md flex items-center justify-center gap-2 border border-gray-200 rounded-md hover:bg-gray-50 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                >
                  <FaGoogle className="text-red-500" />
                  Sign in with Google
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-4">
                <span className="text-gray-600">Don't have an account?</span>
                <button className="text-blue-600 hover:text-blue-800 underline text-left transition-colors">
                  Sign Up Now
                </button>
                <span className="text-gray-600">Forgot your password?</span>
                <button className="text-blue-600 hover:text-blue-800 underline text-left transition-colors">
                  Reset
                </button>
              </div>

              {/* <p className="text-sm text-gray-400 pt-2">
                Google sign in coming soon
              </p> */}
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 left-10 text-[#a8a7a6] text-sm">
          © Reteena 2025. All Rights Reserved.
        </div>
      </div>

      <div className="flex-1 max-w-[30%] min-h-screen flex items-center justify-center p-10 bg-gradient-to-br from-gray-50 to-gray-100">
        <img 
          src="/login.png" 
          alt="Login" 
          className="max-h-full max-w-full object-contain" 
        />
      </div>
    </div>
  );
};

export default Login;