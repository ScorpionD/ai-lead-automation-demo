import test from 'node:test'
import assert from 'node:assert/strict'
import {validate,fallback,assessment,isAssessment,notificationStatus,openaiBody} from '../infra/n8n/logic.mjs'
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
  const good=fallback(sampleLead)
  const r=assessment(sampleLead,{status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(good)}]}]})
  assert.equal(r.mode,'openai');assert.equal(isAssessment({...good,score:NaN}),false)
  const body=openaiBody(sampleLead)
  assert.equal(body.store,false);assert.ok(!body.input.includes(sampleLead.email));assert.ok(!body.input.includes(sampleLead.phone))
  assert.equal(notificationStatus({ok:true,result:{message_id:1}}),'sent')
  assert.equal(notificationStatus({error:'timeout'}),'unknown')
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
  const env={LEAD_RATE:{limit:async()=>({success:true})},TURNSTILE_SECRET_KEY:'secret',LEAD_WEBHOOK_SECRET:'webhook',N8N:{fetch:async(r:Request)=>{
    assert.equal(r.url,'http://172.30.240.10:5678/webhook/lead');assert.equal(r.headers.get('X-Lead-Secret'),'webhook')
    return Response.json({...fallback(sampleLead),stored:true,notification:'sent',internalSecret:'DO_NOT_FORWARD'})
  }}} as Env
  const request=()=>new Request('https://internal/api/leads',{method:'POST',headers:{Origin:'https://ai-lead-automation-demo.pages.dev','Content-Type':'application/json'},body:JSON.stringify({lead:sampleLead,turnstileToken:'proof'})})
  try{
    globalThis.fetch=async()=>Response.json({success:true,hostname:'ai-lead-automation-demo.pages.dev',action:'lead'})
    const response=await worker.fetch(request(),env)
    assert.equal(response.status,200);assert.equal((await response.json()).internalSecret,undefined)
    env.N8N.fetch=async()=>Response.json({error:'provider-secret',url:'private'}, {status:500})
    const fail=await worker.fetch(request(),env);assert.equal(fail.status,503);assert.deepEqual(await fail.json(),{error:'workflow_unavailable'})
  }finally{globalThis.fetch=old}
})
