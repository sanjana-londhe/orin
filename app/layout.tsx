import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { NudgePoller } from "@/components/NudgePoller";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

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
      <body className={jakarta.variable} style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
        <QueryProvider>
          <NudgePoller />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
