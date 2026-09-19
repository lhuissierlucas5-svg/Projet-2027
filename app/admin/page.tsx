import AdminPanel from "./panel";
import SiteNav from "../site-nav";
export const metadata = { title: "Administration · Élections 2027", robots: {index:false,follow:false} };
export default function AdminPage() { return <><SiteNav /><AdminPanel /></>; }
