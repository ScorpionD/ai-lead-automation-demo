import { isAssessment, validate, providerConfig } from '../infra/n8n/logic.mjs'
interface Binding { fetch(request: Request): Promise<Response> }
interface Limiter { limit(options: {key:string}): Promise<{success:boolean}> }
export interface Env {
  N8N: Binding
  LEAD_RATE: Limiter
  TURNSTILE_SECRET_KEY: string
  TURNSTILE_SITE_KEY: string
  LEAD_WEBHOOK_SECRET: string
  AI_PROVIDER?: string
  OPENROUTER_MODEL?: string
  OPENAI_MODEL?: string
  ALLOW_PAID_AI?: string
}
const origin = 'https://ai-lead-automation-demo.pages.dev'
function reply(body: unknown, status=200) {
  return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})
}
async function boundedBody(request: Request) {
  if (!request.body || Number(request.headers.get('Content-Length') || 0)>16384) throw new Error('body')
  const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw new Error('body')}chunks.push(value)}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
  return JSON.parse(new TextDecoder().decode(bytes))
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path=new URL(request.url).pathname
    if(path==='/api/config' && request.method==='GET') return reply({siteKey:env.TURNSTILE_SITE_KEY,aiProvider:providerConfig(env).provider})
    if(path!=='/api/leads') return reply({error:'not_found'},404)
    if(request.method!=='POST') return reply({error:'method_not_allowed'},405)
    if(request.headers.get('Origin')!==origin) return reply({error:'origin_rejected'},403)
    if(!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({error:'json_required'},415)
    const requestId=crypto.randomUUID()
    try {
      const ip=request.headers.get('CF-Connecting-IP') || 'unknown'
      if(!(await env.LEAD_RATE.limit({key:ip})).success) return reply({error:'rate_limited'},429)
      let body
      try {body=await boundedBody(request)}catch{return reply({error:'invalid_body'},400)}
      const normalized=validate(body)
      if(!normalized.valid || typeof body.turnstileToken!=='string' || body.turnstileToken.length>2048) return reply({error:'invalid_lead'},400)
      const challenge=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:body.turnstileToken,remoteip:ip,idempotency_key:requestId}),signal:AbortSignal.timeout(8000)
      })
      const proof=await challenge.json() as {success?:boolean;hostname?:string;action?:string}
      if(!challenge.ok || proof.success!==true || proof.hostname!=='ai-lead-automation-demo.pages.dev' || proof.action!=='lead')return reply({error:'verification_failed'},403)
      const response=await env.N8N.fetch(new Request('http://172.30.240.10:5678/webhook/lead',{
        method:'POST',headers:{'Content-Type':'application/json','X-Lead-Secret':env.LEAD_WEBHOOK_SECRET},
        body:JSON.stringify({lead:normalized.lead,ai:providerConfig(env)}),signal:AbortSignal.timeout(75000)
      }))
      // Never relay arbitrary provider bodies, errors or n8n execution details to the browser.
      const data=await response.json() as Record<string,unknown>
      if(!response.ok || !isAssessment(data) || data.stored!==true || !['rules','openai','openrouter'].includes(String(data.mode))) {
        const error=data.error==='daily_limit'?'daily_limit':data.error==='processing'?'processing':'workflow_unavailable'
        console.warn(JSON.stringify({event:error,requestId,status:response.status}))
        return reply({error},error==='daily_limit'?429:503)
      }
      console.info(JSON.stringify({event:'lead_processed',requestId,duplicate:data.duplicate===true,mode:data.mode}))
      return reply({score:data.score,priority:data.priority,category:data.category,summary:data.summary,next_action:data.next_action??data.recommendation,recommendation:data.next_action??data.recommendation,signals:data.signals,mode:data.mode,
        model:typeof data.model==='string' && data.model.length<=160?data.model:undefined,
        stored:true,duplicate:data.duplicate===true,id:typeof data.id==='string'?data.id:undefined,
        notification:['sent','failed','unknown','not_configured','pending'].includes(String(data.notification))?data.notification:'unknown',email:'not_configured'})
    }catch{
      console.warn(JSON.stringify({event:'workflow_unavailable',requestId}))
      return reply({error:'workflow_unavailable'},503)
    }
  }
}
