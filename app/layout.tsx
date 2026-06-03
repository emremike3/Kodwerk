import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kodwerk – Roblox Spiele ohne Code erstellen",
  description: "Das erste KI-Tool für die deutsche Roblox-Community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="de">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}