import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">🔍</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          This memory could not be found
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Either this page doesn't exist or you don't have permission to
          access it.
        </p>
        <Link
          href="/"
          className="inline-block bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 px-8 rounded-xl text-sm transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
