import Link from "next/link";
import Image from "next/image";

const workflow = [
  { number: "01", title: "Brief", copy: "Your agent brings the verified copy, evidence, and creative intent." },
  { number: "02", title: "Draft", copy: "NoCanva applies the approved brand, composition, and exact format." },
  { number: "03", title: "Review", copy: "Every revision stays visible. Warnings stay visible too." },
  { number: "04", title: "Approve", copy: "A human makes the final call before immutable pixels leave the desk." },
];

const principles = [
  { label: "Brand stays pinned", detail: "Versioned templates and constrained compositions keep the work recognizably yours." },
  { label: "Humans stay in charge", detail: "Agents can draft and revise. Final approval is deliberately human-only." },
  { label: "Pixels stay exact", detail: "Every approved render keeps its dimensions, template version, and SHA-256." },
];

export default function Home() {
  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <Link className="landing-wordmark" href="/" aria-label="NoCanva home">
          <span>NoCanva</span><i aria-hidden="true" />
        </Link>
        <nav aria-label="Landing navigation">
          <a href="#workflow">How it works</a>
          <a href="#principles">Principles</a>
          <a href="#developers">For developers</a>
        </nav>
        <div className="landing-nav-actions">
          <a className="landing-text-link" href="https://github.com/nocanva/nocanva">GitHub</a>
          <Link className="landing-nav-cta" href="/create">Open workspace <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-kicker"><span /> Public beta · Human + agent</p>
          <h1 id="landing-title">Your agent can make the draft. <em>You make the call.</em></h1>
          <p className="landing-lede">NoCanva is a proper media desk for you and your agent—one calm place to turn verified briefs into on-brand, reviewable, exact-pixel work.</p>
          <div className="landing-actions">
            <Link className="landing-primary-cta" href="/sign-in?returnTo=/create">Start with Google <span aria-hidden="true">→</span></Link>
            <a className="landing-secondary-cta" href="#demo">Watch the desk work <span aria-hidden="true">↓</span></a>
          </div>
          <p className="landing-quiet-note">Personal workspace included. Connect Codex, Claude Code, or any OAuth MCP client.</p>
        </div>

        <div className="desk-scene" aria-label="A verified brief moving from an agent to a human-reviewed social post">
          <div className="desk-grid" aria-hidden="true" />
          <div className="desk-agent-tag"><b>A</b><span>AGENT<br /><small>Drafting</small></span></div>
          <article className="desk-brief">
            <header><span>VERIFIED BRIEF</span><b>01 / 04</b></header>
            <p><i>›</i> Turn the approved product notes into a four-slide launch story.</p>
            <footer><span>brand: nocanva</span><span>format: 1080 × 1350</span></footer>
          </article>
          <div className="desk-handoff"><span /><b>handoff</b><span /></div>
          <article className="desk-proof desk-proof-back" aria-hidden="true"><span>REV · 01</span></article>
          <article className="desk-proof">
            <header><strong>NOCANVA</strong><span>02 / 04</span></header>
            <div className="proof-copy">
              <small>SHARED MEDIA DESK</small>
              <h2>Good work<br />survives the<br /><em>handoff.</em></h2>
              <i />
              <p>Structured, versioned, and ready for a human decision.</p>
            </div>
            <footer><span>REVIEWED OUTPUT</span><strong>1080 × 1350</strong></footer>
          </article>
          <div className="desk-human-tag"><b>H</b><span>HUMAN<br /><small>Final call</small></span></div>
          <div className="desk-approved"><span>✓</span><b>APPROVED</b><small>REVISION 02</small></div>
        </div>
      </section>

      <section className="landing-thesis">
        <p className="landing-section-index">01 — POSITION</p>
        <div>
          <h2>Not another canvas.<br /><em>A way of working.</em></h2>
          <p>Prompt-to-image tools optimize for the first result. NoCanva is built for what happens after: brand constraints, revisions, review, approval, and a file you can reproduce exactly.</p>
        </div>
        <aside>
          <span>BRIEF</span><i>→</i><span>DRAFT</span><i>→</i><span>REVIEW</span><i>→</i><span>PIXELS</span>
        </aside>
      </section>

      <section className="landing-workflow" id="workflow">
        <div className="landing-section-heading">
          <p className="landing-section-index">02 — THE DESK</p>
          <h2>One workflow.<br />Two kinds of hands.</h2>
          <p>The agent handles repeatable production. You keep context, taste, and the right to say “not yet.”</p>
        </div>
        <div className="workflow-strip">
          {workflow.map((item, index) => (
            <article key={item.number}>
              <header><span>{item.number}</span>{index < workflow.length - 1 ? <i aria-hidden="true">→</i> : <i aria-hidden="true">✓</i>}</header>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-demo" id="demo">
        <div className="demo-copy">
          <p className="landing-section-index">03 — IN MOTION</p>
          <h2>Ask in your agent.<br />Review at your desk.</h2>
          <p>No tab full of magic buttons. The agent uses a small, explicit media lifecycle; the human gets a stable URL and the complete revision trail.</p>
          <dl>
            <div><dt>Agent</dt><dd>Drafts, checks, revises</dd></div>
            <div><dt>Human</dt><dd>Reviews, decides, approves</dd></div>
            <div><dt>NoCanva</dt><dd>Versions, pins, renders</dd></div>
          </dl>
        </div>
        <figure className="demo-frame">
          <div className="demo-frame-bar"><span /><span /><span /><b>nocanva / beta workflow</b></div>
          <Image
            src="/nocanva-beta-demo.gif"
            alt="NoCanva agent workflow moving from a verified brief to reviewed output"
            width={960}
            height={540}
            unoptimized
          />
          <figcaption><span>Real workflow capture</span><span>08 seconds</span></figcaption>
        </figure>
      </section>

      <section className="landing-principles" id="principles">
        <div className="landing-section-heading compact">
          <p className="landing-section-index">04 — WHAT STAYS TRUE</p>
          <h2>The boring parts are the trust.</h2>
        </div>
        <div className="principle-list">
          {principles.map((principle, index) => (
            <article key={principle.label}>
              <span>0{index + 1}</span><h3>{principle.label}</h3><p>{principle.detail}</p><i aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="landing-developers" id="developers">
        <div className="developer-copy">
          <p className="landing-section-index">05 — FOR DEVELOPERS</p>
          <h2>Your agent already knows where to work.</h2>
          <p>Connect the hosted MCP once. OAuth opens in the browser, binds the client to your personal workspace, and returns you to the terminal.</p>
          <div className="developer-links">
            <a href="https://github.com/nocanva/nocanva#quick-start">Read the quick start →</a>
            <a href="https://github.com/nocanva/nocanva/blob/main/docs/MCP_CLIENTS.md">Client setup →</a>
          </div>
        </div>
        <div className="developer-terminal" aria-label="Codex MCP setup command">
          <header><span /><span /><span /><b>terminal</b></header>
          <pre><code><i>$</i> codex mcp add nocanva --url{"\n"}  https://nocanva-mcp.sidsaini1196.workers.dev/mcp</code></pre>
          <footer><span>OAuth opens automatically</span><b>↵</b></footer>
        </div>
      </section>

      <section className="landing-final-cta">
        <p className="landing-section-index">THE PUBLIC BETA IS OPEN</p>
        <h2>Bring your agent.<br /><em>Keep your judgment.</em></h2>
        <p>Make something worth reviewing.</p>
        <div className="landing-actions centered">
          <Link className="landing-primary-cta" href="/sign-in?returnTo=/create">Open your media desk <span aria-hidden="true">→</span></Link>
          <a className="landing-secondary-cta" href="https://github.com/nocanva/nocanva">Star on GitHub <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <footer className="landing-footer">
        <Link className="landing-wordmark" href="/"><span>NoCanva</span><i /></Link>
        <p>The shared media desk for humans and agents.</p>
        <nav><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:rohitsainihere@gmail.com">Contact</a><a href="https://github.com/nocanva/nocanva">GitHub</a></nav>
        <span>Public beta · 2026</span>
      </footer>
    </main>
  );
}
