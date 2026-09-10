import { budgets } from '../types/lead.ts'
import type { LeadErrors, LeadInput } from '../types/lead.ts'

export function normalizeLead(lead: LeadInput): LeadInput {
  return { fullName: lead.fullName.trim(), email: lead.email.trim(), company: lead.company.trim(), phone: lead.phone.trim(), budget: lead.budget.trim(), message: lead.message.trim() }
}
export function validateLead(input: LeadInput): LeadErrors {
  const lead = normalizeLead(input)
  const errors: LeadErrors = {}
  if (lead.fullName.length < 2 || lead.fullName.length > 100) errors.fullName = 'Enter a name between 2 and 100 characters.'
  if (lead.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.email = 'Enter a valid email address.'
  if (lead.company.length < 2 || lead.company.length > 120) errors.company = 'Enter a company name between 2 and 120 characters.'
  if (lead.phone && (!/^\+?[\d\s().-]+$/.test(lead.phone) || lead.phone.replace(/\D/g, '').length < 7 || lead.phone.replace(/\D/g, '').length > 15 || lead.phone.length > 30)) errors.phone = 'Use 7–15 digits, with an optional country code.'
  if (!budgets.some(b => b.value === lead.budget)) errors.budget = 'Choose an estimated budget.'
  if (lead.message.length < 20 || lead.message.length > 2000) errors.message = 'Describe your project in 20–2,000 characters.'
  return errors
}
