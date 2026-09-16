import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PaceCheck",
  description: "iRacing lap times vs iRating, by series, season, and track.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <header className="border-b border-black/10 dark:border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight text-lg">
              PaceCheck
            </Link>
            <span className="text-xs text-gray-500">iRating vs lap time, by track</span>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        <footer className="border-t border-black/10 dark:border-white/10 text-center text-xs text-gray-500 py-4">
          Built on the iRacing Data API. Not affiliated with or endorsed by iRacing.
        </footer>
      </body>
    </html>
  );
}
