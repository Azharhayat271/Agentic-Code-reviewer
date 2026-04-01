import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PR Code Reviewer",
  description: "Analyze GitHub PRs with Gemini AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
