export const budgets = [
  { value: 'under-1000', label: 'Under $1,000', points: 5 },
  { value: '1000-5000', label: '$1,000 – $5,000', points: 15 },
  { value: '5000-10000', label: '$5,000 – $10,000', points: 25 },
  { value: '10000-plus', label: '$10,000+', points: 35 },
  { value: 'undecided', label: 'Not sure yet', points: 0 },
] as const

export interface LeadInput {
  fullName: string
  email: string
  company: string
  phone: string
  budget: string
  message: string
}
export type LeadErrors = Partial<Record<keyof LeadInput, string>>
export interface QualificationResult {
  score: number
  priority: 'High' | 'Medium' | 'Low'
  category: 'Sales automation' | 'CRM integration' | 'AI assistant' | 'General inquiry'
  summary: string
  next_action: string
  recommendation: string
  signals: string[]
  mode: 'demo' | 'rules' | 'openai' | 'openrouter'
  model?: string
  stored?: boolean
  duplicate?: boolean
  id?: string
  notification?: 'sent' | 'failed' | 'unknown' | 'pending' | 'not_configured'
  email?: 'not_configured'
  deliveryNote?: string
}
export const emptyLead: LeadInput = { fullName: '', email: '', company: '', phone: '', budget: '', message: '' }
export const sampleLead: LeadInput = {
  fullName: 'Alex Morgan', email: 'alex@example.com', company: 'Northstar Studio',
  phone: '+1 202 555 0147', budget: '5000-10000',
  message: 'We receive around 80 inbound leads a week. We need to qualify leads, sync them to our CRM, and automate follow-up emails. We would like to launch this month.',
}
