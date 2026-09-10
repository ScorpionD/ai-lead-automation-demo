import { budgets } from '../types/lead.ts'
import type { LeadInput, QualificationResult } from '../types/lead.ts'
import { normalizeLead, validateLead } from './validation.ts'

// Deterministic demo rules, not an LLM. Identity and demographic attributes are not scored.
export function qualifyLead(input: LeadInput): QualificationResult {
  if (Object.keys(validateLead(input)).length) throw new Error('Please check the highlighted fields.')
  const lead = normalizeLead(input)
  const budget = budgets.find(b => b.value === lead.budget)!
  const message = lead.message.toLowerCase()
  const automation = /\b(automat\w*|leads?|follow[ -]?up)\b/.test(message)
  const crm = /\b(crm|hubspot|salesforce|pipedrive)\b/.test(message)
  const ai = /\b(ai|chatbot|assistant|openai)\b/.test(message)
  const timeline = /\b(this (month|week)|asap|urgent|within \d+ (days|weeks)|next month)\b/.test(message)
  const category = automation ? 'Sales automation' : crm ? 'CRM integration' : ai ? 'AI assistant' : 'General inquiry'
  const relevant = automation || crm || ai
  const detailed = lead.message.length >= 100
  const score = Math.min(100, 25 + budget.points + (relevant ? 20 : 0) + (detailed ? 10 : 0) + (timeline ? 10 : 0))
  const priority = score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low'
  return {
    score, priority, category, mode: 'demo',
    signals: [ `${budget.label} budget`, relevant ? 'Service match identified' : 'Scope needs clarification', detailed ? 'Detailed project brief' : 'Initial project brief', timeline ? 'Near-term timing mentioned' : 'Timeline to confirm' ],
    summary: `${lead.fullName} from ${lead.company} is exploring ${category.toLowerCase()} with an estimated budget of ${budget.label.toLowerCase()}. ${detailed ? 'The brief includes enough detail for an initial discovery conversation.' : 'More detail is needed to define the project scope.'} ${timeline ? 'The message mentions near-term timing; confirm the target date.' : 'A delivery timeline has not been confirmed.'}`,
    recommendation: priority === 'High' ? 'Schedule a discovery call and confirm scope, timeline, and budget.' : priority === 'Medium' ? 'Send a short discovery questionnaire to clarify requirements.' : 'Clarify the business need and budget before proposing a solution.',
    next_action: priority === 'High' ? 'Schedule a discovery call and confirm scope, timeline, and budget.' : priority === 'Medium' ? 'Send a short discovery questionnaire to clarify requirements.' : 'Clarify the business need and budget before proposing a solution.',
  }
}
