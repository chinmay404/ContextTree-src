import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/enhanced-ui.css";
import { initializeDatabase } from "@/lib/init-db"; // Import initializeDatabase
import { Providers } from "@/components/providers"; // Import the new Providers component

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ContextTree - Visualize Your Ideas",
  description: "A collaborative canvas for brainstorming and context mapping.",
  generator: "v0.dev",
};

// Call initializeDatabase once when the server starts
// This is a common pattern, but for Next.js App Router,
// this top-level await will ensure it runs before rendering.
// However, this runs on *every* request in dev, and on build in prod.
// For a true "once per server start", you might need a different strategy
// or make initializeDatabase idempotent (safe to run multiple times).
// For now, this ensures it's called.
const dbInitializationPromise = initializeDatabase()
  .then((result) => {
    if (result.success) {
      console.log(
        "APP/LAYOUT.TSX: Database initialization successful (called from layout)."
      );
    } else {
      console.error(
        "APP/LAYOUT.TSX: Database initialization failed (called from layout):",
        result.error
      );
    }
  })
  .catch((error) => {
    console.error(
      "APP/LAYOUT.TSX: Critical error during database initialization (called from layout):",
      error
    );
  });

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // You can await the promise here if you need to ensure it's done before rendering,
  // but be mindful of increasing server response time.
  // For now, we've initiated it above.
  // await dbInitializationPromise; // Uncomment if critical for first render

  console.log("APP/LAYOUT.TSX: RootLayout rendering...");

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
