import type { Metadata, Viewport } from "next";
import { Caveat, Inter, Source_Serif_4 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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

const SITE_DESCRIPTION =
  "Upload your CV, paste the jobs you want, and get a cover letter per posting " +
  "that cites real details from the job ad and your own experience. Free, no account needed.";

export const metadata: Metadata = {
  title: {
    default: "CV Cover — cover letters from the real job posting",
    template: "%s · CV Cover",
  },
  description: SITE_DESCRIPTION,
  applicationName: "CV Cover",
  keywords: ["cover letter", "job application", "CV", "resume", "LinkedIn", "Greenhouse", "join.com"],
  openGraph: {
    type: "website",
    siteName: "CV Cover",
    title: "CV Cover — cover letters from the real job posting",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "CV Cover — cover letters from the real job posting",
    description: SITE_DESCRIPTION,
  },
};

// themeColor moved out of metadata in Next.js 14; it belongs here now. The
// value matches the sunset canvas so mobile browser chrome blends with it.
export const viewport: Viewport = {
  themeColor: "#ff7847",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Both are inert outside Vercel, so local development is unaffected. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
