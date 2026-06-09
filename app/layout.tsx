import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { FilterProvider } from "@/contexts/FilterContext";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/contexts/LanguageContext";

export const metadata: Metadata = {
  title: "ARIES — Business Intelligence",
  description:
    "ARIES Business Intelligence untuk PT Lemorax — monitoring kondisi bisnis secara real-time",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning className={GeistSans.variable}>
      <body
        className={`${GeistSans.className} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LanguageProvider>
            <FilterProvider>{children}</FilterProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
