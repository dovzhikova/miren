import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Manrope({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: {
    default: "GlowCheck",
    template: "%s · GlowCheck",
  },
  description: "Check a product against your skin before you buy it, then see if it is actually working.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main id="main-content" tabIndex={-1} className="page-content mx-auto flex w-full max-w-[960px] flex-1 flex-col px-5 pt-6">{children}</main>
        <SiteFooter />
        <Toaster theme="light" position="top-center" />
      </body>
    </html>
  );
}
