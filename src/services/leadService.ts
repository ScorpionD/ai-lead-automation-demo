import type { LeadInput, QualificationResult } from '../types/lead.ts'
import { qualifyLead } from './qualification.ts'

export interface SubmitOptions { simulateError?: boolean }
export interface LeadService {
  submit(lead: LeadInput, options?: SubmitOptions): Promise<QualificationResult>
}
// Replace this adapter with an HTTP request later. Keep provider credentials on the server.
// This MVP never sends form data or persists it.
export const leadService: LeadService = {
  async submit(lead, options = {}) {
    const result = qualifyLead(lead)
    await new Promise(resolve => setTimeout(resolve, 1500))
    if (options.simulateError) throw new Error('This is a simulated failure. Your details are still here. Turn off the error simulation and try again.')
    return result
  },
}
