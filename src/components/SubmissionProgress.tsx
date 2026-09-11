import { useEffect, useRef, useState } from 'react'
import { Clock3, LoaderCircle, ShieldCheck } from 'lucide-react'

// Mounted only while a request is pending. Elapsed time is not server progress.
export default function SubmissionProgress() {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const started = performance.now()
    const modal = dialog.current
    modal?.showModal()
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((performance.now() - started) / 1000))
    }, 1000)
    return () => {
      window.clearInterval(timer)
      modal?.close()
    }
  }, [])

  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  const message = seconds >= 60
    ? 'This is taking longer than usual. If no response arrives, we will show a local assessment with delivery unconfirmed so you can retry.'
    : seconds >= 20
      ? 'Still waiting for the workflow. A busy AI service or a retry can take longer. You do not need to submit again.'
      : 'Waiting for your assessment and delivery status. Some requests take longer when the free AI service is busy.'

  return <div className="submission-progress">
    <div className="progress-inline">
      <LoaderCircle size={18} className="spin" aria-hidden="true" />
      <span>Processing your lead <span className="progress-inline-time">· {elapsed} elapsed</span></span>
      <button ref={trigger} type="button" onClick={() => dialog.current?.showModal()}>View progress</button>
    </div>
    <dialog ref={dialog} className="progress-dialog" aria-labelledby="progress-title" aria-describedby="progress-message progress-help" onClose={() => trigger.current?.focus()}>
      <div className="progress-symbol"><LoaderCircle size={34} className="spin" aria-hidden="true" /></div>
      <span className="eyebrow">REQUEST IN PROGRESS</span>
      <h2 id="progress-title">Qualifying your lead…</h2>
      <p id="progress-message" className="progress-message" role="status">{message}</p>
      <div className="progress-clock" aria-live="off"><Clock3 size={17} aria-hidden="true" /><span>Time elapsed</span><strong>{elapsed}</strong></div>
      <p id="progress-help" className="progress-help">Keep this page open. Your result will appear automatically when the request finishes.</p>
      <div className="progress-reassurance"><ShieldCheck size={16} aria-hidden="true" /><span>One submission is enough. Repeated details are protected against duplicates.</span></div>
      <button type="button" className="progress-hide" onClick={() => dialog.current?.close()}>Hide progress</button>
      <p className="progress-hide-note">Hiding this window does not cancel your request.</p>
    </dialog>
  </div>
}
