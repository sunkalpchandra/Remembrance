import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import UserContextProvider from "./components/usercontext";
import { TEXT_SCALE_BOOT_SCRIPT } from "./lib/comfort";

export const metadata: Metadata = {
  title: "Remembrance",
  description: "Your longitudinal cognitive care platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved comfort text scale before first paint */}
        <script dangerouslySetInnerHTML={{ __html: TEXT_SCALE_BOOT_SCRIPT }} />
      </head>
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <ClerkProvider>
          <UserContextProvider>{children}</UserContextProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
