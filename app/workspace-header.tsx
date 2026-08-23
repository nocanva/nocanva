import Link from "next/link";
import { AccountMenu } from "./account-menu";
import { ThemeToggle } from "./theme-toggle";

export function WorkspaceHeader({ active }: { active: "create" | "brands" | "templates" | "drafts" | "carousels" | "renders" | "connections" }) {
  return (
    <header className="topbar">
      <Link className="wordmark" href="/" aria-label="NoCanva home">
        <span className="wordmark-mark">N</span><span>NoCanva</span><span className="alpha-tag">ALPHA</span>
      </Link>
      <nav className="primary-nav" aria-label="Primary navigation">
        <Link className={`nav-item ${active === "create" ? "active" : ""}`} href="/">Create</Link>
        <Link className={`nav-item ${active === "brands" ? "active" : ""}`} href="/brands">Brands</Link>
        <Link className={`nav-item ${active === "templates" ? "active" : ""}`} href="/templates">Templates</Link>
        <Link className={`nav-item ${active === "drafts" ? "active" : ""}`} href="/drafts">Drafts</Link>
        <Link className={`nav-item ${active === "carousels" ? "active" : ""}`} href="/carousels">Carousels</Link>
        <Link className={`nav-item ${active === "renders" ? "active" : ""}`} href="/renders">Renders</Link>
        <Link className={`nav-item ${active === "connections" ? "active" : ""}`} href="/connections">Connect</Link>
      </nav>
      <div className="topbar-actions"><span className="status-dot"><i />Personal workspace</span><ThemeToggle /><AccountMenu /></div>
    </header>
  );
}
