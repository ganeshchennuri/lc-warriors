import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { UserProvider } from "@/components/UserProvider";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LC Warriors",
  description: "LeetCode 75 tracker for Raj, Ganesh and Arbaaz",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${plexSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg font-sans text-fg">
        <UserProvider>
          <Suspense fallback={<header className="h-[57px] border-b border-line bg-card/80" />}>
            <Nav />
          </Suspense>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
