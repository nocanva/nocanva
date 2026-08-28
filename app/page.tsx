import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bot, CheckCircle2, Clock3, FileImage, GalleryHorizontalEnd, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listCarousels } from "@/lib/server/carousel-repository";
import { listBrands, listDrafts, listRenders } from "@/lib/server/media-repository";
import { requireNoCanvaViewer } from "@/lib/server/request-auth";
import { AppShell } from "./workspace-shell";

export default async function HomePage() {
  const principal = await requireNoCanvaViewer("/");
  const [drafts, carousels, renders, brands] = await Promise.all([
    listDrafts(6, false, principal.workspaceId),
    listCarousels(6, false, principal.workspaceId),
    listRenders(6, principal.workspaceId),
    listBrands(principal.workspaceId),
  ]);
  const activeDrafts = drafts.filter((draft) => draft.status !== "rendered");

  return (
    <AppShell>
      <section className="dashboard-page page-frame">
        <div className="dashboard-intro">
          <div><Badge variant="outline" className="workspace-badge"><span /> Human + agent workspace</Badge><h1>Your work, in one calm place.</h1><p>Pick up a draft, review a story, or start something new. Every decision stays attached to the exact revision.</p></div>
          <div className="dashboard-actions"><Button nativeButton={false} variant="outline" render={<Link href="/connections" />}>Connect agent <Bot /></Button><Button nativeButton={false} render={<Link href="/create" />}>New design <Plus /></Button></div>
        </div>

        <div className="workspace-stats" aria-label="Workspace overview">
          <Card size="sm"><CardContent><span>In progress</span><strong>{activeDrafts.length + carousels.filter((item) => item.status !== "rendered").length}</strong><small>drafts and stories</small></CardContent></Card>
          <Card size="sm"><CardContent><span>Ready to use</span><strong>{renders.length}</strong><small>recent exports</small></CardContent></Card>
          <Card size="sm"><CardContent><span>Brand systems</span><strong>{brands.length}</strong><small>pinned workspaces</small></CardContent></Card>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-section">
            <div className="section-heading-row"><div><span className="section-overline">Continue working</span><h2>Recent drafts</h2></div><Button nativeButton={false} variant="ghost" render={<Link href="/drafts" />}>View all <ArrowUpRight /></Button></div>
            {drafts.length === 0 ? <Card className="dashboard-empty"><CardContent><span className="empty-glyph"><Clock3 /></span><h3>No drafts yet</h3><p>Ask your connected agent to create a draft, or use the quick creator.</p><Button nativeButton={false} variant="outline" render={<Link href="/create" />}>Create your first design</Button></CardContent></Card> : <div className="recent-work-list">{drafts.slice(0, 5).map((draft) => <Link className="recent-work-row" href={`/drafts/${draft.id}`} key={draft.id}><span className={`work-status status-${draft.status}`}><FileImage /></span><span><strong>{draft.payload.content.headline}</strong><small>{draft.brandName} · {draft.templateName}</small></span><span className="work-row-meta"><Badge variant="outline">{draft.status.replace("_", " ")}</Badge><small>v{draft.currentRevision}</small></span><ArrowUpRight /></Link>)}</div>}
          </section>

          <aside className="dashboard-side">
            <Card className="agent-card">
              <CardHeader><span className="agent-card-icon"><Bot /></span><CardTitle>Your agent works here too.</CardTitle><CardDescription>Create and revise from Codex or Claude Code, then return here for the human decision.</CardDescription></CardHeader>
              <CardContent><ol><li><span>1</span><p><strong>Connect once</strong><small>Google binds the client to this workspace.</small></p></li><li><span>2</span><p><strong>Ask for media</strong><small>Your agent creates a stable draft URL.</small></p></li><li><span>3</span><p><strong>Make the call</strong><small>Only you can approve the final revision.</small></p></li></ol><Button nativeButton={false} className="w-full" variant="secondary" render={<Link href="/connections" />}>Set up an agent <ArrowUpRight /></Button></CardContent>
            </Card>
          </aside>
        </div>

        <section className="dashboard-section export-strip-section">
          <div className="section-heading-row"><div><span className="section-overline">Recently approved</span><h2>Latest exports</h2></div><Button nativeButton={false} variant="ghost" render={<Link href="/renders" />}>Open exports <ArrowUpRight /></Button></div>
          {renders.length === 0 ? <div className="quiet-empty"><CheckCircle2 /><span><strong>Nothing exported yet.</strong><small>Approved PNGs will collect here.</small></span></div> : <div className="export-strip">{renders.slice(0, 4).map((render) => <Link href={`/renders/${render.id}`} key={render.id}><span className={`export-strip-art ${render.payload.format}`}><Image src={render.assetUrl} alt="" width={render.width} height={render.height} unoptimized /></span><span><strong>{render.payload.content.headline}</strong><small>{render.brandName} · {new Date(render.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</small></span></Link>)}{carousels[0] && <Link className="carousel-shortcut" href={`/carousels/${carousels[0].id}`}><GalleryHorizontalEnd /><span><strong>Latest carousel</strong><small>{carousels[0].slides.length} slides · revision {carousels[0].currentRevision}</small></span><ArrowUpRight /></Link>}</div>}
        </section>
      </section>
    </AppShell>
  );
}
