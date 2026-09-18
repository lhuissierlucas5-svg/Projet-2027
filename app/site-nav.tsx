"use client";

import { usePathname } from "next/navigation";

const items = [
  { key: "accueil", label: "Accueil", href: "/" },
  { key: "candidats", label: "Candidats", href: "/candidats" },
  { key: "comparer", label: "Comparer", href: "/comparer" },
  { key: "propositions", label: "Propositions", href: "/propositions" },
  { key: "primaires", label: "Primaires", href: "/primaires" },
  { key: "candidatures", label: "Candidatures", href: "/candidatures" },
  { key: "sondages", label: "Sondages", href: "/sondages" },
  { key: "agenda", label: "Agenda", href: "/agenda" },
];

export default function SiteNav() {
  const pathname = usePathname();

  function isActive(key: string, href: string) {
    if (key === "accueil") return pathname === "/";
    if (key === "candidats") return pathname === "/candidats" || pathname.startsWith("/candidats/");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="header site-header">
      <div className="container nav site-nav-shell">
        <a className="brand" href="/" aria-label="Élections 2027 — accueil">
          Élections <span>2027</span>
          <span className="brand-dot" aria-hidden="true" />
        </a>

        <nav className="site-nav-scroll" aria-label="Navigation principale">
          {items.map((item) => {
            const active = isActive(item.key, item.href);
            return (
              <a
                href={item.href}
                key={item.key}
                className={`site-nav-link nav-${item.key} ${active ? "is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="site-nav-indicator" aria-hidden="true" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
