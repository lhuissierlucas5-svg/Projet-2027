"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
export default function LiveRefresh() {
 const router = useRouter();
 const pathname = usePathname();
 useEffect(() => {
  if (pathname.startsWith("/admin")) return;
  const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
  const timer = window.setInterval(refresh, 60_000);
  document.addEventListener("visibilitychange", refresh);
  return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
 }, [router, pathname]);
 return null;
}
