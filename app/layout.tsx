import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "bootstrap/dist/css/bootstrap.min.css";
import { Toaster } from "sonner";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Daily Brief",
  description: "All your statistics in one place!",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [messages, locale] = await Promise.all([
    getMessages(),
    getLocale(),
  ]);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
        >
          {children}
        </NextIntlClientProvider>

        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  );
}