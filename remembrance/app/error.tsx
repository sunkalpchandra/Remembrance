"use client";

// Global error boundary — keeps failures inside the product's visual
// language instead of a white stack-trace screen.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">🌤️</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Don't worry — your memories are safe. Try again, and if it keeps
          happening, come back in a little while.
        </p>
        <div className="flex gap-3">
          <a
            href="/"
            className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-xl text-sm transition-colors"
          >
            Go home
          </a>
          <button
            onClick={reset}
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
          >
            Try again
          </button>
        </div>
        {error?.digest && (
          <p className="text-[11px] text-gray-300 mt-6">Ref: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
