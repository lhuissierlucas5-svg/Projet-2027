import LiveRefresh from "./live-refresh";
import type { Metadata } from "next";
import "./globals.css";
import "./france.css";

export const metadata: Metadata = {
  title: "Élections 2027",
  description: "Une plateforme de référence pour suivre la politique française dans le temps.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}<div className="management-links"><a href="/suivi">Suivi des actualisations</a><a href="/admin">Administration</a></div><LiveRefresh /></body>
    </html>
  );
}
