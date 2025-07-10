import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 w-full items-center justify-center text-center flex flex-col max-w-md">
        <h1 className="flex font-normal text-2xl mb-4">
          This memory could not be found!
        </h1>

        {/* Half transparency */}
        <p className="text-[17px] mb-4 opacity-50 w-[75%]">
          Either this page doesn’t exist or you don’t have permission to access
          it
        </p>
        <div className="flex flex-col items-baseline w-full"></div>

        <Link
          href={"/"}
          className=" bg-zinc-950 text-white py-2 rounded-md hover:bg-zinc-800 transition-colors pl-10 pr-10"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
