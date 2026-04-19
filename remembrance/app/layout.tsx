import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import UserContextProvider from "./components/usercontext";

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
