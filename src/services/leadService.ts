import type { LeadInput, QualificationResult } from '../types/lead.ts'
import { qualifyLead } from './qualification.ts'
import { isAssessment } from '../../infra/n8n/logic.mjs'

export interface SubmitOptions { simulateError?: boolean; localPreview?: boolean; turnstileToken?: string }
export interface LeadService {
  submit(lead: LeadInput, options?: SubmitOptions): Promise<QualificationResult>
}
// Only this same-origin endpoint is public. All provider credentials stay on the server.
export const leadService: LeadService = {
  async submit(lead, options = {}) {
    const result = qualifyLead(lead)
    if (options.simulateError) throw new Error('Simulated error. No request was sent. Turn off the error simulation to retry.')
    if (options.localPreview) return {...result,stored:false,deliveryNote:'Local preview. Nothing was sent or saved.'}
    if (!options.turnstileToken) throw new Error('Verification is not ready. Wait a moment or choose Local preview.')
    let response: Response
    try {
      response = await fetch('/api/leads', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lead,turnstileToken:options.turnstileToken}),signal:AbortSignal.timeout(80000)})
    } catch {
      return {...result,stored:false,notification:'unknown',deliveryNote:'Connection interrupted. This is a local assessment; server delivery is unconfirmed. Retrying the same details is protected against duplicate records.'}
    }
    if (response.status>=500) return {...result,stored:false,notification:'unknown',deliveryNote:'The workflow is temporarily unavailable or still processing. This local assessment does not confirm delivery. Retry the same details later to check the saved result.'}
    if (response.status===429) throw new Error('The demo has reached its request limit. Try later or choose Local preview; no new delivery is confirmed.')
    if (response.status===403) throw new Error('Verification expired or failed. Wait for a fresh verification and submit again.')
    if (!response.ok) throw new Error('The server could not accept these details. Check the form and try again.')
    const data=await response.json()
    if (!isAssessment(data) || data.stored!==true || !['rules','openai'].includes(data.mode)) throw new Error('The server returned an unexpected response. Delivery is unconfirmed; you can retry the same details.')
    return data as QualificationResult
  },
}
