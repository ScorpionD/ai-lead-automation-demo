import type { CSSProperties, Ref } from 'react'
import { ArrowUpRight, Check, CircleCheck, Clock3, Database, LoaderCircle, ScanLine, Send, Sparkles } from 'lucide-react'
import type { QualificationResult } from '../types/lead'

export default function QualificationPanel({ result, loading, headingRef, elapsedSeconds }: { result: QualificationResult | null; loading: boolean; headingRef?: Ref<HTMLHeadingElement>; elapsedSeconds?: number | null }) {
  const isAI = result?.mode === 'openai' || result?.mode === 'openrouter'
  const provider = result?.mode === 'openrouter' ? 'OpenRouter' : 'OpenAI'
  const localOnly = result?.mode === 'demo' && !result.notification
  const notifications = {
    sent: { title: 'Telegram delivered', detail: result?.duplicate ? 'Original alert · no resend' : 'Sales team notified', tone: 'success' },
    failed: { title: 'Delivery failed', detail: 'Lead remains saved', tone: 'attention' },
    pending: { title: 'Notification pending', detail: 'Check the manager inbox', tone: 'attention' },
    unknown: { title: 'Delivery unconfirmed', detail: 'Delivery status needs checking', tone: 'attention' },
    not_configured: { title: 'Not connected', detail: 'No notification sent', tone: 'neutral' },
    none: { title: 'Not sent', detail: 'Local preview only', tone: 'neutral' },
  }
  const notification = notifications[result?.notification || 'none']

  return <section className={`result-panel ${result ? 'has-result' : ''}`} aria-labelledby="result-title" aria-busy={loading}>
    <div className="panel-heading"><span className="eyebrow"><Sparkles size={15} /> 02 / QUALIFICATION</span><span className={`dark-tag ${isAI ? 'provider-live' : ''}`}>{isAI ? provider : result?.mode === 'rules' ? 'Rules fallback' : 'Portfolio demo'}</span></div>
    <div role="status" aria-live="polite">
      <h2 ref={headingRef} tabIndex={-1} id="result-title">{loading ? 'Reading the signals…' : result ? 'Your lead, qualified.' : 'See the opportunity clearly.'}</h2>
      <p className="result-intro">{loading ? 'Checking the inquiry, qualification and delivery status.' : result ? isAI ? `Assessment generated through ${provider}. Ready for a human review.` : result.mode === 'rules' ? 'AI was unavailable, disabled or returned an invalid response. Server rules provided this assessment.' : result.deliveryNote || 'Local assessment. Server delivery is not confirmed.' : 'A clear sales brief, with the next action and delivery status in one place.'}</p>
    </div>
    {result && !loading ? <>
      <div className="score-row">
        <div className="score-metric"><div className="score-dial" style={{ '--score': `${result.score}%` } as CSSProperties}><div><strong>{result.score}</strong><span>/ 100</span></div></div><span className="small-label">LEAD SCORE</span></div>
        <dl className="result-attributes">
          <div><dt>Priority</dt><dd><span className={`priority priority-${result.priority.toLowerCase()}`}><CircleCheck size={16} /> {result.priority}</span></dd></div>
          <div><dt>Category</dt><dd className="result-category">{result.category}</dd></div>
          {elapsedSeconds != null && <div className="processing-attribute"><dt><Clock3 size={13} /> Processing time</dt><dd><strong>{elapsedSeconds.toFixed(1)}<small>s</small></strong><span>This request</span></dd></div>}
        </dl>
      </div>
      <div className="delivery-grid" aria-label="Delivery status">
        <div className={`delivery-tile ${result.stored ? 'delivery-success' : localOnly ? 'delivery-neutral' : 'delivery-attention'}`}><Database size={19} /><span className="delivery-label">LEAD STORAGE</span><strong>{result.stored ? 'Saved in Supabase' : localOnly ? 'Not saved' : 'Storage unconfirmed'}</strong><small>{result.stored ? result.duplicate ? 'Duplicate prevented · existing record' : 'New lead recorded' : localOnly ? 'Local preview only' : 'Retry the same details to check'}</small></div>
        <div className={`delivery-tile delivery-${notification.tone}`}><Send size={19} /><span className="delivery-label">MANAGER ALERT</span><strong>{notification.title}</strong><small>{notification.detail}</small></div>
      </div>
      <div className="ai-summary"><span className="small-label"><Sparkles size={15} /> {isAI ? 'AI SUMMARY' : 'RULE-BASED SUMMARY'}</span><p>{result.summary}</p></div>
      {result.signals.length > 0 && <div className="signals">{result.signals.map(signal => <span key={signal}><Check size={14} />{signal}</span>)}</div>}
      <div className="next-step"><ArrowUpRight size={22} /><div><strong>Recommended next action</strong><p>{result.next_action}</p></div></div>
      <details className="result-details"><summary>Delivery details</summary>{isAI && result.model && <p>Model: {result.model}</p>}<p>Email follow-up: not configured · nothing sent.</p>{result.id && <p>Lead reference: {result.id}</p>}</details>
    </> : <div className="empty-result">
      <div className="scan-symbol">{loading ? <LoaderCircle size={37} className="spin" /> : <ScanLine size={37} />}</div>
      <strong>{loading ? 'Qualifying your lead' : 'Your next opportunity starts here'}</strong>
      <p>{loading ? 'Preparing your assessment…' : 'Try the sample lead to see the full result.'}</p>
      <div className="preview-fields"><span>Lead score <b>— / 100</b></span><span>Priority <b>—</b></span><span>Category <b>—</b></span></div>
    </div>}
    <div className="result-footer"><span className="tiny-dot" /> {isAI ? `${provider} assessment · human review recommended` : result?.mode === 'rules' ? 'Rules assessment · human review recommended' : 'Rules fallback available if AI is unavailable'}</div>
  </section>
}
