import Link from "next/link";
import type { Metadata } from "next";
import { RotatingPhotos } from "../components/rotating-photos";

export const metadata: Metadata = {
  title: "Welcome",
  description:
    "Remembrance turns everyday conversations into a living personal memory system — reminiscence therapy at scale.",
};

// Public marketing page for signed-out visitors; the middleware sends
// them here from the root instead of straight to the sign-in wall.
export default function WelcomePage() {
  return (
    <div className="relative w-screen h-[100dvh] bg-white overflow-hidden flex items-center justify-center">
      <RotatingPhotos />

      <main className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl animate-fade-in">
        <h1 className="text-6xl md:text-7xl font-normal text-gray-900 mb-6 select-none">
          Remembrance
        </h1>
        <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-3">
          A companion that listens, remembers, and gently helps the people
          you love hold on to who they are.
        </p>
        <p className="text-sm text-gray-400 mb-10 max-w-md">
          Everyday conversations become a living memory system — organized,
          searchable, and always there, even when recall isn't.
        </p>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-up"
            className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-7 rounded-full text-sm shadow-md transition-all hover:shadow-lg"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-3 px-7 rounded-full text-sm shadow-sm transition-all hover:shadow-md"
          >
            Sign in
          </Link>
        </div>

        <Link
          href="/docs"
          className="mt-8 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          How it works →
        </Link>
      </main>

      <footer className="absolute bottom-6 left-0 right-0 z-10 flex justify-center">
        <span className="text-xs text-gray-400">
          Built by Reteena — cognitive care, remembered.
        </span>
      </footer>
    </div>
  );
}
