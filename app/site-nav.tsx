"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const homeSections = ["candidats", "propositions", "candidatures", "sondages", "agenda"];

const items = [
  { key: "accueil", label: "Accueil", href: "/" },
  { key: "candidats", label: "Candidats", href: "/#candidats" },
  { key: "comparer", label: "Comparer", href: "/comparer" },
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

    const fromHash = window.location.hash.replace("#", "");
    if (homeSections.includes(fromHash)) setHomeActive(fromHash);

    const sections = homeSections
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setHomeActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -62% 0px", threshold: [0, 0.15, 0.35, 0.6] }
    );

    sections.forEach((section) => observer.observe(section));

    const onScroll = () => {
      if (window.scrollY < 360) setHomeActive("accueil");
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
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
