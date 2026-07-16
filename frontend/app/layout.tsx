import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  applicationName: "PowerGuard",
  title: {
    default: "PowerGuard Smart Energy Meter",
    template: "%s · PowerGuard",
  },
  description: "Monitor and analyze your energy consumption with AI guidance.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PowerGuard",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-slate-50 text-slate-900`}>
        <ServiceWorkerRegistration />
        <div className="flex min-h-screen">
          <Navbar />
          <main className="flex-1 md:ml-64 p-4 md:p-8 min-h-screen [padding-top:calc(5rem+env(safe-area-inset-top))] md:[padding-top:2rem] [padding-bottom:calc(1rem+env(safe-area-inset-bottom))] md:[padding-bottom:2rem]">

            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

