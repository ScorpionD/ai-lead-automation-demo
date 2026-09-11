import { ArrowRight, Bell, Check, Database, GitBranch, Layers3, ShieldCheck, SlidersHorizontal, Sparkles, Zap } from 'lucide-react'

export function BusinessValue({ onTryDemo, disabled }: { onTryDemo: () => void; disabled: boolean }) {
  return <section className="business-value" aria-labelledby="business-title">
    <h2 id="business-title">What this demo solves</h2>
    <p>Qualifies incoming leads with AI, stores them automatically, prevents duplicates and alerts the sales team in real time.</p>
    <button type="button" className="business-cta" onClick={onTryDemo} disabled={disabled}>Try with sample data <ArrowRight size={17} /></button>
    <span className="business-cta-note">Explore the result in a few clicks.</span>
  </section>
}

export function PerformanceHighlight() {
  return <aside className="performance-card" aria-labelledby="performance-title">
    <span className="eyebrow"><Zap size={14} /> FASTER BY DESIGN</span>
    <h2 id="performance-title">Optimized processing time</h2>
    <div className="performance-values" aria-label="Optimized from approximately 26 seconds to approximately 3.6 seconds processing time">
      <div><span>Before</span><strong>~26<small>s</small></strong></div>
      <ArrowRight size={23} aria-hidden="true" />
      <div className="performance-after"><span>After</span><strong>~3.6<small>s</small></strong></div>
    </div>
    <p>Sample scenario comparison. Optimized run: 3.6s. Actual times vary with model and network load.</p>
  </aside>
}

const features = [
  { label: 'AI lead qualification', icon: Sparkles },
  { label: 'Duplicate prevention', icon: Layers3 },
  { label: 'Secure webhook/backend', icon: ShieldCheck },
  { label: 'PostgreSQL/Supabase storage', icon: Database },
  { label: 'Real-time Telegram alerts', icon: Bell },
  { label: 'LLM fallback processing', icon: GitBranch },
  { label: 'Rate limiting / request protection', icon: ShieldCheck },
]

export function ProductionFeatures() {
  return <section className="production-features" aria-labelledby="features-title">
    <div className="section-heading"><div><span className="eyebrow">CONFIDENCE BUILT IN</span><h2 id="features-title">Production-ready features</h2></div><span className="implemented-tag"><Check size={14} /> Implemented in this demo</span></div>
    <ul className="features-grid">{features.map(({label,icon:Icon}) => <li key={label}><Icon size={19} aria-hidden="true" /><span>{label}</span></li>)}</ul>
  </section>
}

const customizationOptions = ['HubSpot', 'Salesforce', 'Zoho', 'GoHighLevel', 'Slack', 'WhatsApp']

export function CustomizationSection() {
  return <section className="customization-section" id="customization" aria-labelledby="customization-title">
    <div className="customization-copy"><span className="eyebrow"><SlidersHorizontal size={15} /> YOUR TOOLS. YOUR PROCESS.</span><h2 id="customization-title">Built for customization</h2><p>Adapt this workflow to the way your team captures, qualifies and follows up with leads. Connect your existing website, forms or CRM, and route the right information to the right people.</p></div>
    <div className="customization-options"><p className="customization-label">Potential integrations for a custom implementation</p><ul>{customizationOptions.map(name => <li key={name}>{name}</li>)}</ul><div className="existing-tools"><Layers3 size={17} /> Existing websites / forms / CRMs</div><p className="customization-note">These options are not connected in this demo. Supabase and Telegram are the current live integrations.</p></div>
  </section>
}
