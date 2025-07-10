"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/backend/firebaseConfig";
import { Button } from "@/app/components/loginbutton";
import { FaArrowRight } from "react-icons/fa6";

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await checkIfNewUser(user);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const checkIfNewUser = async (user: any) => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists() || !userSnap.data()?.username) {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      const user = auth.currentUser;
      await checkIfNewUser(user);
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
      const user = auth.currentUser;
      await checkIfNewUser(user);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      alert("Please enter your email to reset your password");
    }
    else {
      try {
      sendPasswordResetEmail(auth, email.trim(), {
        url: "localhost:3000/", // next navigation not supported here because firebase is an external email from server side
        handleCodeInApp: false,
      })
        .then(() => {
          alert("Check your email!");
        })
        .catch((error) => {
          console.log("Error: ", error);
          alert(error);
        })
    } catch (error: any) {
      console.log("Error sending password reset email: ", error);
      alert(error.message);
    }
  }
}
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleEmailLogin();
    }
  };

  return (
    <div className="min-h-screen w-screen flex overflow-x-hidden max-w-full">
      <div className="flex-1 max-w-[70%] flex flex-col relative">
        <div className="flex-1 flex items-center justify-start px-10">
          <div className="w-full max-w-md flex flex-col gap-6">
            <div className="space-y-2">
              <h1 className="text-[30px] font-normal text-gray-900">
                Welcome to Remembrance
              </h1>
              <p className="text-[20px] font-medium text-[#c0bebd] leading-relaxed">
                Ultimate tool to preserve dignity and identity for those facing
                cognitive decline
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>

              <div className={"space-y-2"}>
                <div className="flex flex-col">
                  <div className="flex justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Password
                    </label>
                    {mode == "login" ? (
                      <div className="flex items-center gap-x-2 text-gray-600">
                        <button  onClick={resetPassword} className=" transition-colors text-[12.5px]">
                          Forgot your password?
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full gap-5 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={loading}
                  />
                </div>
                {mode == "signup" ? (
                  <div className="flex flex-col">
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      disabled={loading}
                    />
                  </div>
                ) : null}
              </div>

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="space-y-3">
                <div className="flex flex-col">
                  <div className="flex flex-row items-center gap-4 text-sm">
                    <Button
                      onClick={handleEmailLogin}
                      disabled={loading}
                      variant="tiltingShadow"
                      size="minimal"
                      className="w-full"
                    >
                      {loading
                        ? mode === "login"
                          ? "Signing in..."
                          : "Creating account..."
                        : mode === "login"
                          ? "Continue"
                          : "Sign Up"}
                      {!loading && <FaArrowRight className="size-4" />}
                    </Button>
                  </div>
                </div>
                <div className="or font-bold"> OR </div>
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white p-2 shadow-md flex items-center justify-center gap-2 border border-gray-200 rounded-md hover:bg-gray-50 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                >
                  <Image
                    src="/google.png"
                    alt="Google Logo"
                    width={17.5}
                    height={17.5}
                  />
                  Sign in with Google
                </button>
              </div>
              <div className="flex items-center flex-col gap-y-2 text-sm">
                <div className="flex items-center gap-x-2">
                  <span className="text-gray-600">
                    {mode === "login"
                      ? "Don't have an account?"
                      : "Already have an account?"}
                  </span>
                  <button
                    onClick={() =>
                      setMode(mode === "login" ? "signup" : "login")
                    }
                    className=" underline transition-colors"
                  >
                    {mode === "login" ? "Sign Up Now" : "Login Instead"}
                  </button>
                </div>
              </div>
            </div>
            <div className="absolute bottom-5 left-10 font-medium text-[15px] text-[#a8a7a6]">
              © Reteena 2025. All Rights Reserved.
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-10 max-w-[40%] rounded-lg h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <img
          src="/login.png"
          alt="Login"
          className="rounded-xl h-[calc(100vh-80px)] w-full object-cover transform scale-95"
        />
      </div>
    </div>
  );
};

export default Login;
