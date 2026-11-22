import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/400-italic.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/700-italic.css";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/500.css";
import "@fontsource/noto-sans-thai/600.css";
import "@fontsource/noto-sans-thai/700.css";
import "./globals.css";
import { AppDataProvider } from "@/context/AppDataContext";

export const metadata: Metadata = {
  title: "MUICT Dev Club — Your Career's Trial Run",
  description:
    "Official website and community portal of MUICT Dev Club, Faculty of Information and Communication Technology, Mahidol University.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-ink font-sans antialiased">
        <AppDataProvider>{children}</AppDataProvider>
      </body>
    </html>
  );
}
