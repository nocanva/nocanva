import Link from "next/link";

export function WorkspaceHeader({ active }: { active: "create" | "brands" | "templates" | "renders" }) {
  return (
    <header className="topbar">
      <Link className="wordmark" href="/" aria-label="Framewise home">
        <span className="wordmark-mark">F</span><span>Framewise</span><span className="alpha-tag">ALPHA</span>
      </Link>
      <nav className="primary-nav" aria-label="Primary navigation">
        <Link className={`nav-item ${active === "create" ? "active" : ""}`} href="/">Create</Link>
        <Link className={`nav-item ${active === "brands" ? "active" : ""}`} href="/brands">Brands</Link>
        <Link className={`nav-item ${active === "templates" ? "active" : ""}`} href="/templates">Templates</Link>
        <Link className={`nav-item ${active === "renders" ? "active" : ""}`} href="/renders">Renders</Link>
      </nav>
      <div className="topbar-actions"><span className="status-dot"><i />Durable workspace</span><span className="avatar">RB</span></div>
    </header>
  );
}
