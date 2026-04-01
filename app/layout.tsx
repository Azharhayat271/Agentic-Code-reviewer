import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agentic Code Reviewer",
  description: "AI-powered GitHub PR analysis with agentic code review system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="selection-red">{children}</body>
    </html>
  );
}
