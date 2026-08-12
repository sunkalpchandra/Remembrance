import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import UserContextProvider from "./components/usercontext";
import { TEXT_SCALE_BOOT_SCRIPT } from "./lib/comfort";

export const metadata: Metadata = {
  title: {
    default: "Remembrance",
    template: "%s · Remembrance",
  },
  description:
    "A longitudinal cognitive care platform that turns everyday conversations into a living personal memory system.",
  applicationName: "Remembrance",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Remembrance",
    description:
      "Reminiscence therapy at scale — conversations that become a living memory graph.",
    siteName: "Remembrance",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
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
