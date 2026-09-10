import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ArrowDown, ArrowRight, Bell, Braces, Check, ChevronRight, CircleAlert, ClipboardList, Database, FlaskConical, GitBranch, Github, Layers3, LoaderCircle, Mail, ShieldCheck, Sparkles, WandSparkles, Zap } from 'lucide-react'
import QualificationPanel from './components/QualificationPanel'
import BotCheck from './components/BotCheck'
import { leadService } from './services/leadService'
import { normalizeLead, validateLead } from './services/validation'
import { budgets, emptyLead, sampleLead } from './types/lead'
import type { LeadErrors, LeadInput, QualificationResult } from './types/lead'

const workflow = [
  { title: 'Lead Capture', detail: 'One form. A structured inquiry.', icon: ClipboardList },
  { title: 'AI Qualification', detail: 'Score, categorize, summarize.', icon: Sparkles },
  { title: 'CRM', detail: 'Keep every opportunity organized.', icon: Layers3 },
  { title: 'Email Follow-up', detail: 'Start the right conversation.', icon: Mail },
  { title: 'Manager Notification', detail: 'Bring your team into the loop.', icon: Bell },
]
const technologies = [
  { name: 'React', note: 'Frontend · live', icon: Braces },
  { name: 'API/Webhooks', note: 'Cloudflare · protected endpoint', icon: GitBranch },
  { name: 'n8n', note: 'Orchestration · live', icon: Zap },
  { name: 'OpenAI', note: 'Adapter ready · awaiting credits', icon: Sparkles },
  { name: 'CRM', note: 'Test lead pipeline · Supabase', icon: Layers3 },
  { name: 'PostgreSQL', note: 'Storage + deduplication · live', icon: Database },
]

export default function App() {
  const [lead, setLead] = useState<LeadInput>({ ...emptyLead })
  const [errors, setErrors] = useState<LeadErrors>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QualificationResult | null>(null)
  const [error, setError] = useState('')
  const [simulateError, setSimulateError] = useState(false)
  const [localPreview, setLocalPreview] = useState(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const [consent, setConsent] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [verificationReset, setVerificationReset] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)
  const pending = useRef(false)

  function update(field: keyof LeadInput, value: string) {
    setLead(previous => ({ ...previous, [field]: value }))
    setErrors(previous => ({ ...previous, [field]: undefined }))
    setResult(null); setError('')
  }
  function loadExample() {
    setLead({ ...sampleLead, email: `alex.demo.${crypto.randomUUID().slice(0,8)}@example.com` }); setErrors({}); setError(''); setResult(null); setSimulateError(false)
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const validation = validateLead(lead)
    setErrors(validation); setError(''); setResult(null)
    if (Object.keys(validation).length) {
      const first = Object.keys(validation)[0]
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    if (!localPreview && !simulateError && !consent) {setError('Confirm that you are using test details and agree to send them to the demo workflow.');return}
    pending.current = true; setLoading(true)
    try { setResult(await leadService.submit(normalizeLead(lead), { simulateError, localPreview, turnstileToken })) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Something went wrong. Please try again.') }
    finally { pending.current = false; setLoading(false); setVerificationReset(n=>n+1) }
  }
  function inputProps(field: keyof LeadInput) {
    return { id: field, name: field, value: lead[field], 'aria-invalid': !!errors[field], 'aria-describedby': errors[field] ? `${field}-error` : undefined, onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => update(field, event.target.value) }
  }
  const fieldError = (field: keyof LeadInput) => errors[field] ? <span className="field-error" id={`${field}-error`}>{errors[field]}</span> : null

  return <>
    <a className="skip-link" href="#lead-form">Skip to lead form</a>
    <header className="site-header"><div className="header-inner">
      <a className="brand" href="#top"><span className="brand-mark"><Zap size={22} fill="currentColor" /></span><span>AI Lead Automation</span></a>
      <nav aria-label="Main navigation"><a href="#workflow">Workflow</a><a href="#technology">Technology</a><a className="source-link" href="https://github.com/ScorpionD/ai-lead-automation-demo" target="_blank" rel="noreferrer"><Github size={17} /><span>View source</span><ArrowRight size={16} /></a></nav>
    </div></header>
    <main id="top" className="page-shell">
      <section className="intro"><div><div className="eyebrow intro-eyebrow"><span className="tiny-dot" /> INTERACTIVE PORTFOLIO DEMO</div><h1>Less sorting.<br className="mobile-break" /> More <span>opportunity.</span></h1><p>Capture an inquiry. Understand its potential. See how AI-powered<br className="desktop-break" /> qualification can move your next lead forward.</p></div><div className="intro-note"><FlaskConical size={18} /><div><strong>Try the workflow</strong><span>Sample data. Real interaction.</span></div><ArrowDown size={18} /></div></section>
      <div className="demo-banner"><ShieldCheck size={19} /><p><strong>Connected portfolio demo.</strong> Use fictional details. Live submissions are saved in a private test database and trigger a manager notification. OpenAI awaits credits; rules provide the current assessment. No emails are sent.</p><span>USE TEST DATA</span></div>
      <div className="workspace">
        <section className="form-panel" aria-labelledby="form-title">
          <div className="form-heading"><div><span className="eyebrow">01 / CAPTURE</span><h2 id="form-title">Meet your next lead.</h2></div><button type="button" className="sample-button" onClick={loadExample} disabled={loading}><WandSparkles size={16} />Use sample lead</button></div>
          <p className="form-description">Add a few details to see qualification in action.</p>
          <form id="lead-form" ref={formRef} onSubmit={submit} noValidate>
            <fieldset disabled={loading}><legend className="sr-only">Lead details</legend>
              <div className="form-grid">
                <div className="field"><label htmlFor="fullName">Full name <span>*</span></label><input {...inputProps('fullName')} required autoComplete="name" maxLength={100} placeholder="Alex Morgan" />{fieldError('fullName')}</div>
                <div className="field"><label htmlFor="email">Email <span>*</span></label><input {...inputProps('email')} required type="email" autoComplete="email" maxLength={254} placeholder="alex@company.com" />{fieldError('email')}</div>
                <div className="field"><label htmlFor="company">Company <span>*</span></label><input {...inputProps('company')} required autoComplete="organization" maxLength={120} placeholder="Your company" />{fieldError('company')}</div>
                <div className="field"><label htmlFor="phone">Phone <small>Optional</small></label><input {...inputProps('phone')} type="tel" autoComplete="tel" maxLength={30} placeholder="+1 202 555 0147" />{fieldError('phone')}</div>
                <div className="field full-width"><label htmlFor="budget">Estimated budget <span>*</span></label><select {...inputProps('budget')} required><option value="">Select a budget range (USD)</option>{budgets.map(budget => <option key={budget.value} value={budget.value}>{budget.label}</option>)}</select>{fieldError('budget')}</div>
                <div className="field full-width"><label htmlFor="message">Message <span>*</span></label><textarea {...inputProps('message')} required minLength={20} maxLength={2000} rows={4} placeholder="What would you like to automate? Tell us about your goals and timeline." /><div className="message-meta">{fieldError('message') || <span>At least 20 characters</span>}<span>{lead.message.length.toLocaleString()} / 2,000</span></div></div>
              </div>
              {Object.values(errors).some(Boolean) && <p className="validation-note" role="alert">Please check the highlighted fields before submitting.</p>}
              {error && <div className="error-notice" role="alert"><CircleAlert size={19} /><p>{error}</p></div>}
              {result && <div className="success-notice" role="status"><Check size={17} />{result.stored ? result.duplicate ? 'Existing lead found. No duplicate record or notification was created.' : 'Lead saved. Your assessment is ready.' : result.deliveryNote}</div>}
              <label className="mode-choice"><input type="checkbox" checked={localPreview} onChange={event=>{setLocalPreview(event.target.checked);setResult(null);setError('')}} />Local preview · no data sent</label>
              {!localPreview && <>
                <label className="consent-choice"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} />I am using test details and agree to send them to the demo database and manager. Project text may be sent to OpenAI when enabled.</label>
                <BotCheck reset={verificationReset} onToken={setTurnstileToken} onError={setVerificationError} />
                {verificationError && <p className="verification-note" role="status">{verificationError}</p>}
              </>}
              <button className="submit-button" type="submit">{loading ? <><LoaderCircle size={18} className="spin" />Qualifying lead…</> : <>Submit Lead<ArrowRight size={18} /></>}</button>
              <div className="form-footnote"><span><ShieldCheck size={14} /> {localPreview?'Local preview · nothing sent':'Test workflow · private storage'}</span><span>* Required fields</span></div>
              <details className="demo-controls"><summary>Demo controls</summary><label><input type="checkbox" checked={simulateError} onChange={event => { setSimulateError(event.target.checked); setError('') }} />Simulate a submission error</label></details>
            </fieldset>
          </form>
        </section>
        <QualificationPanel result={result} loading={loading} />
      </div>
      <section className="workflow-section" id="workflow" aria-labelledby="workflow-title"><div className="section-heading"><div><span className="eyebrow">THE BIG PICTURE</span><h2 id="workflow-title">One lead. A connected workflow.</h2></div><span className="outline-tag">Live + clearly marked fallbacks</span></div><ol className="workflow-track">{workflow.map((step, index) => <li key={step.title} className={index === 1 ? 'highlight-step' : ''}><div className="step-top"><span className="workflow-icon"><step.icon size={21} /></span><span className="step-number">0{index + 1}</span></div><h3>{step.title}</h3><p>{step.detail}</p><span className="step-status">{['Protected form','Rules fallback active','Supabase · live','Not configured','Telegram · connected'][index]}</span>{index < 4 && <ChevronRight className="connector" size={18} />}</li>)}</ol><p className="workflow-note">n8n validates, checks duplicates, qualifies and stores each live lead. Delivery status appears with the result. OpenAI is configured but disabled until credits are available; email needs a sender account.</p></section>
      <section className="technology-section" id="technology" aria-labelledby="technology-title"><div className="section-heading"><div><span className="eyebrow">BUILT TO CONNECT</span><h2 id="technology-title">Technology behind the workflow.</h2></div></div><div className="technology-grid">{technologies.map(tech => <div className="technology" key={tech.name}><tech.icon size={24} /><div><h3>{tech.name}</h3><p>{tech.note}</p></div></div>)}</div></section>
    </main>
    <footer className="site-footer"><div><span className="footer-brand"><Zap size={16} />AI Lead Automation</span><span>A portfolio demo by ScorpionD</span><span>React + TypeScript + Vite</span></div></footer>
  </>
}
