import type { ReactNode } from "react";
import "./globals.css";

/**
 * Root layout passes through to the locale layout, which owns <html> and <body>.
 * Avoid nested html/body elements.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
