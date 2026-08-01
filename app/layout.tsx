import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { NudgePoller } from "@/components/NudgePoller";
import "./globals.css";

// Inter is the closest open-source stand-in for SF Pro (documents/DESIGN.md,
// "Note on Font Substitutes"). It only ever renders off-Apple — the stack below
// resolves to the real SF Pro first on macOS/iOS.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", var(--font-sans), system-ui, sans-serif';

export const metadata: Metadata = {
  title: "Orin",
  description: "Emotional task management",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Prevent iOS Safari from auto-zooming when an input/textarea has
  // fontSize < 16px. Trade-off: users can't pinch-zoom the page.
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable} style={{ fontFamily: FONT_STACK }}>
        <QueryProvider>
          <NudgePoller />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
