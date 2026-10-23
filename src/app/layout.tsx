import type { Metadata } from "next";
import { Inter, Schibsted_Grotesk } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Schibsted_Grotesk({
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col px-5 pt-6 pb-28">{children}</main>
        <SiteFooter />
        <Toaster theme="light" position="top-center" />
      </body>
    </html>
  );
}
