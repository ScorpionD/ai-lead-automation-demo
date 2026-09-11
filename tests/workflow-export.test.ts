import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { sampleLead } from '../src/types/lead.ts'
import { validate, assessment, openrouterBody } from '../infra/n8n/logic.mjs'

const workflow = JSON.parse(readFileSync(new URL('../infra/n8n/workflow.json', import.meta.url), 'utf8'))
function node(name: string) { return workflow.nodes.find((item: { name: string }) => item.name === name) }
function evaluate(name: string, input: unknown, previous: Record<string, unknown> = {}) {
  const expression = node(name).parameters.jsonOutput as string
  const result = runInNewContext(expression.slice(3, -2), {
    $json: input,
    $: (name: string) => ({ first: () => ({ json: previous[name] }) }),
  }, { timeout: 1000 })
  return JSON.parse(JSON.stringify(result))
}

test('generated transforms avoid runner startup and remain complete n8n expressions', () => {
  assert.equal(workflow.nodes.some((item: {type: string}) => item.type === 'n8n-nodes-base.code'), false)
  for (const transform of workflow.nodes.filter((item: {type: string}) => item.type === 'n8n-nodes-base.set')) {
    assert.equal(transform.typeVersion, 3.4)
    assert.equal(transform.parameters.includeOtherFields, false)
    // n8n's JSON-field parser stops at the first }}: nested syntax must not truncate it.
    assert.deepEqual(transform.parameters.jsonOutput.match(/{{[\s\S]*?}}/g), [transform.parameters.jsonOutput.slice(1)])
  }
})

test('native validation preserves hostile lead strings as data and strips untrusted fields', () => {
  const lead = {...sampleLead, email:' ALEX@EXAMPLE.COM ', message:'Please quote CRM automation. {{ $env.TELEGRAM_BOT_TOKEN }} "}}" is literal text.', admin:true}
  for (const body of [null, {}, {lead:[]}, {lead:{...lead,email:42}}, {lead,ai:{provider:'openrouter',model:'openrouter/free',allowPaid:false}}]) {
    const result = evaluate('Validate lead', {body, ignored:'Do not forward'})
    const expected = validate(body)
    assert.equal(result.valid, expected.valid)
    if (expected.valid) assert.deepEqual(result.lead, expected.lead)
    assert.equal(result.ignored, undefined)
  }
  assert.equal(evaluate('Validate lead', {body:{lead,ai:{provider:'openai',allowPaid:false}}}).ai.provider, 'rules')
})

test('native provider transforms keep the validated qualification and free-only request contract', () => {
  const previous = {'Validate lead':{lead:sampleLead,ai:{provider:'openrouter',model:'openrouter/free'}}}
  assert.deepEqual(evaluate('Prepare OpenRouter input', {}, previous), openrouterBody(sampleLead))
  const payload={priority:'High',score:90,category:'Sales automation',summary:'Automate lead qualification and CRM syncing this month.',next_action:'Confirm the CRM platform and qualification rules.'}
  const responses=[
    {model:'test/model:free',choices:[{finish_reason:'stop',message:{content:JSON.stringify(payload)}}]},
    {error:{code:429}},
    {choices:[{finish_reason:'length',message:{content:JSON.stringify(payload)}}]},
    {choices:[{finish_reason:'stop',message:{content:JSON.stringify({...payload,score:900})}}]},
  ]
  for (const response of responses) assert.deepEqual(evaluate('Validate OpenRouter output', response, previous), assessment(sampleLead, response, 'openrouter'))
  const openai={status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(payload)}]}]}
  assert.deepEqual(evaluate('Validate AI output', openai, previous), JSON.parse(JSON.stringify(assessment(sampleLead, openai))))
})

test('slow free AI is bounded without removing retries or honest fallback', () => {
  const request=node('OpenRouter classification')
  assert.equal(request.parameters.options.timeout, 5000)
  assert.equal(request.maxTries, 2)
  assert.equal(request.waitBetweenTries, 300)
  assert.equal(request.onError, 'continueRegularOutput')
  assert.equal(workflow.connections['OpenRouter classification'].main[0][0].node, 'Validate OpenRouter output')
  const body=openrouterBody(sampleLead)
  assert.equal(body.provider.sort, 'latency')
  assert.deepEqual(body.provider.max_price, {prompt:0,completion:0,request:0})
})
