import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "@/components/common/toaster";
import "./globals.css";

/* Two cuts of one superfamily. Plex Sans carries prose; Plex Mono
   carries every number, date, reference and micro-label — the way a
   printed statement sets them. Neither is a default UI font. */
const uiSans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
});

const uiMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ledger — SBI Expense Manager",
    template: "%s · Ledger",
  },
  description:
    "A personal ledger for State Bank of India statements: import, review, and reconcile every transaction.",
  applicationName: "Ledger",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${uiSans.variable} ${uiMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-fg">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-[2px] focus:border focus:border-fg focus:bg-bg focus:px-3 focus:py-2 focus:text-[12px] focus:text-fg"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
