import type { Metadata } from "next";
import { Caveat, Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-notioninter",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-lyon-text",
  subsets: ["latin"],
  weight: "400",
});

const caveat = Caveat({
  variable: "--font-handwritten",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Cover letters from the job posting, not a template",
  description:
    "Paste a job link and a resume. We scrape the posting and the company site, then draft a cover letter that reads human, free, no account needed.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
