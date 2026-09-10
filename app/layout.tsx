import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoNoder — Workflow Automation",
  description: "Build, automate, and observe AI-powered workflows.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
