import type { CSSProperties } from 'react'
import { ArrowUpRight, Check, CircleCheck, LoaderCircle, ScanLine, Sparkles } from 'lucide-react'
import type { QualificationResult } from '../types/lead'

export default function QualificationPanel({ result, loading }: { result: QualificationResult | null; loading: boolean }) {
  return <section className={`result-panel ${result ? 'has-result' : ''}`} aria-labelledby="result-title" aria-busy={loading}>
    <div className="panel-heading"><span className="eyebrow"><Sparkles size={15} /> QUALIFICATION</span><span className="dark-tag">Demo output</span></div>
    <div role="status" aria-live="polite">
      <h2 id="result-title">{loading ? 'Reading the signals…' : result ? 'A clearer next step.' : 'Good leads deserve a head start.'}</h2>
      <p className="result-intro">{loading ? 'Evaluating the project brief, budget, and timing.' : result ? 'Qualification complete. Here is your simulated lead assessment.' : 'Turn an inquiry into a useful sales brief. Submit a lead to see its score, priority, and recommended next step.'}</p>
    </div>
    {result && !loading ? <>
      <div className="score-row"><div className="score-dial" style={{ '--score': `${result.score}%` } as CSSProperties}><div><strong>{result.score}</strong><span>/ 100</span></div></div><div><span className="small-label">LEAD SCORE</span><div className={`priority priority-${result.priority.toLowerCase()}`}><CircleCheck size={15} /> {result.priority} priority</div><p className="category">{result.category}</p></div></div>
      <div className="ai-summary"><span className="small-label"><Sparkles size={14} /> AI SUMMARY <span>· simulated</span></span><p>{result.summary}</p></div>
      <div className="signals">{result.signals.map(signal => <span key={signal}><Check size={14} />{signal}</span>)}</div>
      <div className="next-step"><ArrowUpRight size={20} /><div><strong>Recommended next step</strong><p>{result.recommendation}</p></div></div>
    </> : <div className="empty-result">
      <div className="scan-symbol">{loading ? <LoaderCircle size={37} className="spin" /> : <ScanLine size={37} />}</div>
      <strong>{loading ? 'Qualifying your lead' : 'Your next opportunity starts here'}</strong>
      <p>{loading ? 'Preparing your demo assessment…' : 'No lead submitted yet'}</p>
      <div className="preview-fields"><span>Priority <b>—</b></span><span>Category <b>—</b></span><span>Lead score <b>— / 100</b></span></div>
    </div>}
    <div className="result-footer"><span className="tiny-dot" /> Rule-based demo · no external AI calls</div>
  </section>
}
