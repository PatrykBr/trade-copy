import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { SubscriptionProvider } from "@/contexts/subscription-context";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "TradeCopy Pro - Professional Trade Copying Platform",
  description: "Mirror trades across multiple trading accounts with low latency. Professional trade copying platform with advanced analytics and risk management.",
  keywords: "trade copying, forex, copy trading, trading platform, algorithmic trading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {/* SubscriptionProvider relies on authenticated user; keep inside AuthProvider */}
          <SubscriptionProvider>
            <SiteHeader />
            {children}
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
