import type { CSSProperties } from 'react'
import { ArrowUpRight, Check, CircleCheck, LoaderCircle, ScanLine, Sparkles } from 'lucide-react'
import type { QualificationResult } from '../types/lead'

export default function QualificationPanel({ result, loading }: { result: QualificationResult | null; loading: boolean }) {
  const isAI=result?.mode==='openai'||result?.mode==='openrouter'
  const provider=result?.mode==='openrouter'?'OpenRouter':'OpenAI'
  return <section className={`result-panel ${result ? 'has-result' : ''}`} aria-labelledby="result-title" aria-busy={loading}>
    <div className="panel-heading"><span className="eyebrow"><Sparkles size={15} /> QUALIFICATION</span><span className="dark-tag">{isAI?provider:result?.mode==='rules'?'Rules fallback':'Portfolio demo'}</span></div>
    <div role="status" aria-live="polite">
      <h2 id="result-title">{loading ? 'Reading the signals…' : result ? 'A clearer next step.' : 'Good leads deserve a head start.'}</h2>
      <p className="result-intro">{loading ? 'Checking the inquiry, qualification and delivery status.' : result ? isAI?`Assessment generated through ${provider}.`:result.mode==='rules'?'Saved in Supabase. AI was disabled, unavailable or returned an invalid response, so server rules provided this assessment.':result.deliveryNote||'Local rule-based assessment. Server delivery is not confirmed.' : 'Turn an inquiry into a useful sales brief. Submit a lead to see its score, priority, and recommended next step.'}</p>
    </div>
    {result && !loading ? <>
      <div className="score-row"><div className="score-dial" style={{ '--score': `${result.score}%` } as CSSProperties}><div><strong>{result.score}</strong><span>/ 100</span></div></div><div><span className="small-label">LEAD SCORE</span><div className={`priority priority-${result.priority.toLowerCase()}`}><CircleCheck size={15} /> {result.priority} priority</div><p className="category">{result.category}</p></div></div>
      <div className="ai-summary"><span className="small-label"><Sparkles size={14} /> {isAI?'AI SUMMARY':'RULE-BASED SUMMARY'}</span><p>{result.summary}</p></div>
      <div className="signals">{result.signals.map(signal => <span key={signal}><Check size={14} />{signal}</span>)}</div>
      <div className="next-step"><ArrowUpRight size={20} /><div><strong>Next action</strong><p>{result.next_action}</p></div></div>
      {isAI && result.model && <p className="lead-id">Model: {result.model}</p>}
      <div className="delivery-status"><p><strong>Storage:</strong> {result.stored ? result.duplicate?'Existing record · duplicate prevented':'Saved in Supabase':'Not confirmed'}</p><p><strong>Telegram:</strong> {result.notification==='sent'?'Delivered':result.notification==='failed'?'Failed · lead remains saved':result.notification==='not_configured'?'Not configured':result.notification==='pending'?'Pending · check manager inbox':result.notification==='unknown'?'Delivery unconfirmed':'No notification requested'}</p><p><strong>Email:</strong> Not configured · nothing sent</p>{result.id && <p className="lead-id">Lead reference: {result.id}</p>}</div>
    </> : <div className="empty-result">
      <div className="scan-symbol">{loading ? <LoaderCircle size={37} className="spin" /> : <ScanLine size={37} />}</div>
      <strong>{loading ? 'Qualifying your lead' : 'Your next opportunity starts here'}</strong>
      <p>{loading ? 'Preparing your assessment…' : 'No lead submitted yet'}</p>
      <div className="preview-fields"><span>Priority <b>—</b></span><span>Category <b>—</b></span><span>Lead score <b>— / 100</b></span></div>
    </div>}
    <div className="result-footer"><span className="tiny-dot" /> {isAI?`${provider} assessment · human review recommended`:result?.mode==='rules'?'Rules assessment · human review recommended':'Local rules available if integrations are offline'}</div>
  </section>
}
