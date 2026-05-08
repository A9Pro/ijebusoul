import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = { title: "ìjèbúsoul" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0a0a" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}