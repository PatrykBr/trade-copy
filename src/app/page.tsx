import Link from 'next/link';
import { BackgroundGrid } from '@/components/ui/background-grid';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Activity, BarChart3, Cpu, ShieldCheck, Zap, Network, Layers, LineChart, Lock } from 'lucide-react';
import { PricingSection } from '@/components/marketing/pricing-section';
import { Spotlight, Noise, ConicRings } from '@/components/ui/visual-effects';
import { ExecutionStream } from '@/components/ui/execution-stream';
import { Tilt } from '@/components/ui/tilt';

export default function HomePage() {
  return (
    <main className="relative min-h-screen w-full flex flex-col bg-neutral-950 selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Hero */}
  <section className="relative pt-28 pb-36 bg-[radial-gradient(circle_at_40%_30%,rgba(56,189,248,0.12),transparent_60%)]">
        <BackgroundGrid className="absolute inset-0" />
        <ConicRings />
        <Spotlight />
        <Noise />
        <div className="relative z-10 container-page">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-4 py-1 text-xs text-neutral-300 mb-6">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" /> Multi‑account trade copying
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-neutral-50 via-white to-neutral-200 bg-clip-text text-transparent">Instant trade copying</span>
              <br className="hidden sm:block" />
              <span className="copy-accent">for cTrader & MetaTrader</span>
            </h1>
            <p className="mt-6 text-lg text-neutral-300 max-w-xl mx-auto">
              Sub‑30ms replication with built‑in risk controls & performance analytics.
            </p>
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm max-w-2xl mx-auto text-neutral-300">
              {[ 'Sub‑30ms latency', 'Adaptive risk rules', 'Deep P&L analytics' ].map(item => (
                <li key={item} className="flex items-center justify-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/60 py-2 px-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" variant="gradient" className="w-full sm:w-auto px-8">
                <Link href="/signup">Start Free</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto bg-neutral-900/70 backdrop-blur">
                <Link href="/#pricing">Pricing</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-neutral-500">Free tier • No card needed • Upgrade anytime</p>
          </div>
          {/* Platform Ticker */}
          <div className="mt-16">
            <div className="marquee-fade overflow-hidden relative py-4 border-y border-neutral-800/60">
              <div className="flex whitespace-nowrap gap-12 animate-marquee will-change-transform">
                {[ 'cTrader', 'MetaTrader 4', 'MetaTrader 5', 'FIX API', 'REST Bridge', 'WebSocket Core', 'Risk Engine', 'Analytics' ].concat([ 'cTrader', 'MetaTrader 4', 'MetaTrader 5', 'FIX API', 'REST Bridge', 'WebSocket Core', 'Risk Engine', 'Analytics' ])
                  .map((item, i) => (
                    <span key={i} className="text-sm tracking-wide text-neutral-400 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/70" /> {item}
                    </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
  <section id="features" className="relative py-28 bg-neutral-950/40 after:absolute after:inset-0 after:pointer-events-none after:bg-[linear-gradient(to_bottom,rgba(15,23,42,0.6),transparent),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.08),transparent_70%)]">
        <div className="container-page">
          <div className="max-w-xl mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Engineered for <span className="copy-accent">precision</span> & scale</h2>
            <p className="text-neutral-300 text-lg">Operate and evolve complex multi-account strategies with institutional reliability and transparent control.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'Low Latency Engine', desc: 'Event-driven architecture targeting sub-30ms replication across connected platforms.' },
              { icon: ShieldCheck, title: 'Adaptive Risk Layer', desc: 'Per mapping lot scaling, filters, drawdown guards & trading halts when protection triggers.' },
              { icon: BarChart3, title: 'Deep Performance Analytics', desc: 'Historical snapshots, P&L metrics, win rate, drawdown & profit factor in one unified view.' },
              { icon: Network, title: 'Multi-Platform Bridge', desc: 'cTrader, MT4/5 & expanding—abstracted connectivity with secure encrypted credentials.' },
              { icon: Cpu, title: 'Resilient Architecture', desc: 'Isolated execution lanes prevent single-account slowdowns from impacting replication.' },
              { icon: Activity, title: 'Real-Time Monitoring', desc: 'Live status streams & execution traces keep you ahead of slippage & broker anomalies.' },
            ].map(({ icon: Icon, title, desc }) => (
              <Tilt key={title}>
                <Card variant="glow" interactive className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-300">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-100 leading-tight">{title}</h3>
                      <p className="text-sm text-neutral-400 mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </Card>
              </Tilt>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Highlight */}
  <section className="relative py-24 bg-neutral-900/40 border-y border-neutral-800/60 overflow-hidden">
    <div className="pointer-events-none absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="container-page">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-6">Deterministic execution pipeline</h2>
              <p className="text-neutral-400 mb-6">Master orders pass through validation, scaling & risk enforcement before atomic dispatch to slave accounts. All stages are observable & versioned for audit.</p>
              <ul className="space-y-3 text-sm text-neutral-300">
                <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" /> Multi-stage validation & symbol filtering</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" /> Dynamic lot scaling: fixed • percent • balance ratio</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" /> Protection triggers halt mappings instantly</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" /> Execution metadata & error traces stored</li>
              </ul>
              <div className="mt-8 flex gap-4">
                <Button asChild variant="primary">
                  <Link href="/signup">Launch Console</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/#pricing">Compare Plans</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-tr from-cyan-500/10 via-blue-500/5 to-transparent rounded-2xl blur-xl" />
              <ExecutionStream className="relative" />
            </div>
          </div>
        </div>
      </section>

      {/* Security / Reliability */}
  <section className="relative py-24 bg-[linear-gradient(to_bottom,rgba(8,12,20,0.6),rgba(8,12,20,0.2))]">
        <div className="container-page">
          <div className="max-w-3xl mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Security & reliability <span className="copy-accent">by default</span></h2>
            <p className="text-neutral-300 text-lg">Encrypted credentials, isolation boundaries and continuous integrity audits protect capital and proprietary edge.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[{icon:Lock,title:'Encrypted Credentials',desc:'Account API secrets stored securely with field-level isolation.'},{icon:Layers,title:'Isolated Pipelines',desc:'Each mapping executes in a separate lane preventing cascade failures.'},{icon:LineChart,title:'Integrity Monitoring',desc:'Latency, fill quality & deviation metrics continuously audited.'}].map(({icon:Icon,title,desc}) => (
              <Card key={title} interactive className="p-6">
                <Icon className="text-cyan-400 mb-3" size={22} />
                <CardTitle className="text-neutral-100 text-base mb-1">{title}</CardTitle>
                <CardDescription className="text-neutral-400 leading-relaxed">{desc}</CardDescription>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

  {/* Call To Action */}
  <section className="relative py-32">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-2xl border border-neutral-600/60 bg-[linear-gradient(145deg,#0f1822,#111c26_40%,#0c1117)] p-12 md:p-16 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_4px_40px_-10px_rgba(14,165,233,0.25)]">
            <div className="absolute inset-0 opacity-80 mix-blend-overlay bg-[radial-gradient(circle_at_25%_20%,rgba(56,189,248,0.18),transparent_62%),radial-gradient(circle_at_75%_70%,rgba(14,165,233,0.18),transparent_65%)]" />
            <div className="absolute -inset-px rounded-2xl pointer-events-none border border-cyan-400/10" />
            <div className="relative max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Own your execution layer</h2>
              <p className="text-neutral-300 mb-8 text-lg">Deploy transparent scaling logic and protective risk envelopes—iterate without broker friction or opaque middleware.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" variant="gradient" className="px-8">
                  <Link href="/signup">Start Free</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="px-8">
                  <Link href="/#pricing">See Plans</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-neutral-500">Scales from single strategy to allocator desk operations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-800/60 py-12 text-sm text-neutral-400">
        <div className="container-page grid md:grid-cols-3 gap-10">
          <div className="space-y-3">
            <div className="text-neutral-200 font-semibold text-lg">TradeCopy Pro</div>
            <p className="text-neutral-500 text-sm">Multi-account trade replication & analytics platform.</p>
          </div>
          <div>
            <div className="font-medium text-neutral-300 mb-3">Product</div>
            <ul className="space-y-2">
              <li><Link href="/#pricing" className="hover:text-neutral-200">Pricing</Link></li>
              <li><a href="#features" className="hover:text-neutral-200">Features</a></li>
              <li><a href="#" className="hover:text-neutral-200">Docs</a></li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-neutral-300 mb-3">Legal</div>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-neutral-200">Terms</a></li>
              <li><a href="#" className="hover:text-neutral-200">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="container-page mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
          <div>© {new Date().getFullYear()} TradeCopy Pro. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-neutral-400">Status</a>
            <a href="#" className="hover:text-neutral-400">Security</a>
            <a href="#" className="hover:text-neutral-400">Changelog</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
