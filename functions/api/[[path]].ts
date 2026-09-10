interface Context {request:Request;env:{LEAD_API:{fetch(request:Request):Promise<Response>}}}
export async function onRequest({request,env}:Context):Promise<Response> {
  try {return await env.LEAD_API.fetch(request)}
  catch {return Response.json({error:'workflow_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
