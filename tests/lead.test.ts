import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyLead, sampleLead } from '../src/types/lead.ts'
import { validateLead } from '../src/services/validation.ts'
import { qualifyLead } from '../src/services/qualification.ts'
import { leadService } from '../src/services/leadService.ts'

test('validates required fields, malformed email, budget, message, and optional phone', () => {
  assert.equal(Object.keys(validateLead(emptyLead)).length, 5)
  assert.deepEqual(validateLead(sampleLead), {})
  assert.deepEqual(validateLead({ ...sampleLead, phone: '' }), {})
  const errors = validateLead({ ...sampleLead, fullName: '  ', email: 'bad@', budget: 'other', phone: 'abc123', message: 'tiny' })
  for (const field of ['fullName', 'email', 'budget', 'phone', 'message']) assert.ok(errors[field])
  assert.ok(validateLead({ ...sampleLead, message: 'a'.repeat(2001) }).message)
})
test('qualified sample and early inquiry produce different assessments', () => {
  const strong = qualifyLead(sampleLead)
  assert.equal(strong.priority, 'High')
  assert.equal(strong.category, 'Sales automation')
  assert.ok(strong.score >= 75 && strong.score <= 100)
  assert.ok(strong.summary.includes(sampleLead.company))
  const early = qualifyLead({ ...sampleLead, budget: 'undecided', message: 'I would like to discuss a possible project.' })
  assert.equal(early.priority, 'Low')
  assert.equal(early.category, 'General inquiry')
  assert.ok(early.score < strong.score)
  const medium = qualifyLead({ ...sampleLead, budget: 'under-1000', message: 'We need a CRM integration for our team.' })
  assert.equal(medium.priority, 'Medium')
  assert.equal(medium.category, 'CRM integration')
})
test('scoring is deterministic and independent of identity or phone', () => {
  const changed = qualifyLead({ ...sampleLead, fullName: 'Other Name', email: 'other@example.com', company: 'Other Company', phone: '' })
  assert.equal(changed.score, qualifyLead(sampleLead).score)
  assert.deepEqual(qualifyLead(sampleLead), qualifyLead(sampleLead))
  assert.throws(() => qualifyLead(emptyLead))
})
test('service resolves, exposes a reproducible failure, and can retry', async () => {
  const result = await leadService.submit(sampleLead)
  assert.equal(result.mode, 'demo')
  await assert.rejects(leadService.submit(sampleLead, { simulateError: true }), /simulated failure/)
  assert.equal((await leadService.submit(sampleLead)).score, result.score)
})
