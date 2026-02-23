import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrossChain Compliance Gateway",
  description: "Privacy-Preserving Cross-Chain Compliance for Tokenized Assets — Chainlink CCIP + CRE",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
