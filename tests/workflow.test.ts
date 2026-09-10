import test from 'node:test'
import assert from 'node:assert/strict'
import {validate,fallback,assessment,isAssessment,notificationStatus,openaiBody,openrouterBody,providerConfig,qualificationSchema} from '../infra/n8n/logic.mjs'
import {sampleLead} from '../src/types/lead.ts'
import {leadService} from '../src/services/leadService.ts'
import worker from '../worker/index.ts'
import type {Env} from '../worker/index.ts'

test('backend rejects hostile shapes and canonicalizes only allowlisted lead fields',()=>{
  for(const body of [null,{}, {lead:[]},{lead:{...sampleLead,email:42}},{lead:{...sampleLead,message:'x'.repeat(2001)}},{lead:{...sampleLead,budget:'free'}},{lead:{...sampleLead,fullName:'\u0000bad'}}])assert.equal(validate(body).valid,false)
  const r=validate({lead:{...sampleLead,email:' ALEX@EXAMPLE.COM ',admin:true},callbackUrl:'https://evil.example'})
  assert.equal(r.valid,true);assert.equal(r.lead.email,'alex@example.com');assert.equal(r.lead.admin,undefined)
})
test('provider errors, refusals, truncated output and invalid scores use honest fallback',()=>{
  for(const r of [{error:'quota'},{status:'incomplete',output:[]},{status:'completed',output:[{content:[{type:'refusal',refusal:'no'}]}]},{status:'completed',output:[{content:[{type:'output_text',text:'{"score":999}'}]}]}])assert.equal(assessment(sampleLead,r).mode,'rules')
  const f=fallback(sampleLead)
  const good={priority:f.priority,category:f.category,score:f.score,summary:f.summary,next_action:f.next_action}
  const r=assessment(sampleLead,{status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(good)}]}]})
  assert.equal(r.mode,'openai');assert.equal(isAssessment({...good,score:NaN}),false)
  const body=openaiBody(sampleLead)
  assert.equal(body.store,false);assert.ok(!body.input.includes(sampleLead.email));assert.ok(!body.input.includes(sampleLead.phone))
  assert.equal(notificationStatus({ok:true,result:{message_id:1}}),'sent')
  assert.equal(notificationStatus({error:'timeout'}),'unknown')
})
test('OpenRouter accepts only complete schema-valid responses and records the actual model',()=>{
  const value={priority:'High',category:'Sales automation',score:85,summary:'The studio needs a lead qualification and CRM workflow this month.',next_action:'Schedule a discovery call to confirm integrations and timeline.'}
  const response=(content:unknown,reason='stop')=>({model:'test/free-model:free',choices:[{finish_reason:reason,message:{content:typeof content==='string'?content:JSON.stringify(content)}}]})
  const good=assessment(sampleLead,response(value),'openrouter')
  assert.equal(good.mode,'openrouter');assert.equal(good.model,'test/free-model:free');assert.equal(good.next_action,value.next_action);assert.equal(good.recommendation,value.next_action)
  for(const bad of [response('```json\n'+JSON.stringify(value)+'\n```'),response({...value,score:1000}),response({...value,priority:'Low'}),response({...value,next_action:''}),response({...value,next_action:' '.repeat(12)}),response({...value,admin:true}),response({...value,score:85.5}),response(value,'length'),{error:{code:429}},response(null)]) {
    assert.equal(assessment(sampleLead,bad,'openrouter').mode,'rules')
  }
})
test('OpenRouter request prevents paid routing and omits direct contact fields',()=>{
  const body=openrouterBody(sampleLead)
  assert.equal(body.model,'openrouter/free');assert.equal(body.provider.require_parameters,true)
  assert.deepEqual(body.provider.max_price,{prompt:0,completion:0,request:0})
  assert.equal(body.provider.data_collection,'deny')
  assert.equal(body.models,undefined);assert.equal(body.plugins,undefined)
  assert.deepEqual(body.response_format.json_schema.schema.required,['priority','category','score','summary','next_action'])
  assert.deepEqual(openaiBody(sampleLead).text.format.schema,qualificationSchema())
  const sent=body.messages[1].content
  for(const personal of [sampleLead.fullName,sampleLead.email,sampleLead.phone])assert.ok(!sent.includes(personal))
  for(const model of ['openrouter/auto','openai/gpt-4.1-mini','vendor/model:free,paid','https://evil.example',''])assert.throws(()=>openrouterBody(sampleLead,model),/Only free/)
  assert.equal(openrouterBody(sampleLead,'vendor/model:free').model,'vendor/model:free')
})
test('provider environment fails closed and requires explicit paid OpenAI opt-in',()=>{
  assert.equal(providerConfig({}).provider,'rules')
  assert.equal(providerConfig({AI_PROVIDER:'openrouter'}).model,'openrouter/free')
  assert.equal(providerConfig({AI_PROVIDER:'openrouter',OPENROUTER_MODEL:'paid/model'}).provider,'rules')
  assert.equal(providerConfig({AI_PROVIDER:'openai'}).provider,'rules')
  assert.equal(providerConfig({AI_PROVIDER:'openai',ALLOW_PAID_AI:'false'}).provider,'rules')
  assert.equal(providerConfig({AI_PROVIDER:'openai',ALLOW_PAID_AI:'true'}).provider,'openai')
})
test('network failure produces a local assessment without claiming delivery',async()=>{
  const old=globalThis.fetch
  try{
    globalThis.fetch=async()=>{throw new Error('offline')}
    const r=await leadService.submit(sampleLead,{turnstileToken:'test'})
    assert.equal(r.mode,'demo');assert.equal(r.stored,false);assert.match(r.deliveryNote!,/unconfirmed/)
    globalThis.fetch=async()=>Response.json({error:'offline'},{status:503})
    assert.equal((await leadService.submit(sampleLead,{turnstileToken:'test'})).stored,false)
  }finally{globalThis.fetch=old}
})
test('edge rejects wrong origins, malformed/oversized input and failed proof before n8n',async()=>{
  let calls=0
  const env={N8N:{fetch:async()=>{calls++;return Response.json({})}},LEAD_RATE:{limit:async()=>({success:true})},TURNSTILE_SITE_KEY:'site',TURNSTILE_SECRET_KEY:'secret',LEAD_WEBHOOK_SECRET:'webhook'} as Env
  const request=(body:unknown,origin='https://ai-lead-automation-demo.pages.dev')=>new Request('https://internal/api/leads',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
  assert.equal((await worker.fetch(request({lead:sampleLead},'https://evil.example'),env)).status,403)
  assert.equal((await worker.fetch(request({lead:{}}),env)).status,400)
  assert.equal((await worker.fetch(request({lead:sampleLead,extra:'x'.repeat(17000)}),env)).status,400)
  const old=globalThis.fetch
  try{globalThis.fetch=async()=>Response.json({success:false});assert.equal((await worker.fetch(request({lead:sampleLead,turnstileToken:'invalid'}),env)).status,403)}finally{globalThis.fetch=old}
  assert.equal(calls,0)
})
test('edge removes provider details and distinguishes unconfirmed storage',async()=>{
  const old=globalThis.fetch
  const env={AI_PROVIDER:'openrouter',OPENROUTER_MODEL:'openrouter/free',ALLOW_PAID_AI:'false',LEAD_RATE:{limit:async()=>({success:true})},TURNSTILE_SECRET_KEY:'secret',LEAD_WEBHOOK_SECRET:'webhook',N8N:{fetch:async(r:Request)=>{
    assert.equal(r.url,'http://172.30.240.10:5678/webhook/lead');assert.equal(r.headers.get('X-Lead-Secret'),'webhook')
    assert.deepEqual((await r.json()).ai,{provider:'openrouter',model:'openrouter/free',allowPaid:false})
    return Response.json({...fallback(sampleLead),stored:true,notification:'sent',internalSecret:'DO_NOT_FORWARD'})
  }}} as Env
  const request=()=>new Request('https://internal/api/leads',{method:'POST',headers:{Origin:'https://ai-lead-automation-demo.pages.dev','Content-Type':'application/json'},body:JSON.stringify({lead:sampleLead,turnstileToken:'proof',ai:{provider:'openai',allowPaid:true,model:'paid'}})})
  try{
    globalThis.fetch=async()=>Response.json({success:true,hostname:'ai-lead-automation-demo.pages.dev',action:'lead'})
    const response=await worker.fetch(request(),env)
    assert.equal(response.status,200);assert.equal((await response.json()).internalSecret,undefined)
    env.N8N.fetch=async()=>Response.json({error:'provider-secret',url:'private'}, {status:500})
    const fail=await worker.fetch(request(),env);assert.equal(fail.status,503);assert.deepEqual(await fail.json(),{error:'workflow_unavailable'})
  }finally{globalThis.fetch=old}
})
