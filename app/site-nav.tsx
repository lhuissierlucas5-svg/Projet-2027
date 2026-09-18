"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const homeSections = ["candidats", "propositions", "candidatures", "sondages", "agenda"];

const items = [
  { key: "accueil", label: "Accueil", href: "/" },
  { key: "candidats", label: "Candidats", href: "/#candidats" },
  { key: "comparer", label: "Comparer", href: "/comparer" },
  { key: "propositions", label: "Propositions", href: "/#propositions" },
  { key: "primaires", label: "Primaires", href: "/primaires" },
  { key: "candidatures", label: "Candidatures", href: "/#candidatures" },
  { key: "sondages", label: "Sondages", href: "/#sondages" },
  { key: "agenda", label: "Agenda", href: "/#agenda" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [homeActive, setHomeActive] = useState("accueil");

  useEffect(() => {
    if (pathname !== "/") return;

    const updateActiveSection = () => {
      if (window.scrollY < 300) {
        setHomeActive("accueil");
        return;
      }

      const probeY = 170;
      let current = "candidats";

      for (const id of homeSections) {
        const section = document.getElementById(id);
        if (!section) continue;

        const rect = section.getBoundingClientRect();
        if (rect.top <= probeY) current = id;
        if (rect.top > probeY) break;
      }

      setHomeActive(current);
    };

    const fromHash = window.location.hash.replace("#", "");
    if (homeSections.includes(fromHash)) setHomeActive(fromHash);

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [pathname]);

  function isActive(key: string) {
    if (pathname.startsWith("/candidats/")) return key === "candidats";
    if (pathname === "/primaires") return key === "primaires";
    if (pathname === "/comparer") return key === "comparer";
    if (pathname === "/") return homeActive === key;
    return false;
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
            const active = isActive(item.key);
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
