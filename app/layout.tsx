import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Report IQ - Advanced Client-Side Excel Analytics Suite",
  description:
    "An interactive browser-only analytical workspace for parsing, merging, splitting, cleaning, querying, and visualizing large Excel and CSV spreadsheets. 100% private, 100% offline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full overflow-hidden bg-background text-foreground antialiased select-none font-sans">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
