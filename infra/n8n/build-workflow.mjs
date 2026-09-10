import {writeFile} from 'node:fs/promises';
import * as logic from './logic.mjs';
const codePrelude=Object.values(logic).map(f=>f.toString()).join('\n');
const nodes=[],connections={};
function add(name,type,parameters,extra={}) { const n={name,id:name.toLowerCase().replace(/\W+/g,'-'),type:'n8n-nodes-base.'+type,typeVersion:({webhook:2,code:2,if:2.2,httpRequest:4.2,respondToWebhook:1.4})[type],position:[nodes.length*240,0],parameters,...extra};nodes.push(n);return name; }
function link(a,b,index=0){connections[a]||={main:[]};connections[a].main[index]||=[];connections[a].main[index].push({node:b,type:'main',index:0});}
function code(name,js){return add(name,'code',{jsCode:codePrelude+'\n'+js});}
function branch(name,expression){return add(name,'if',{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict'},conditions:[{id:name,leftValue:'={{ '+expression+' }}',rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}});}
function http(name,url,body,headers=[],retry=true){return add(name,'httpRequest',{method:'POST',url,sendHeaders:true,headerParameters:{parameters:headers},sendBody:true,specifyBody:'json',jsonBody:body,options:{timeout:12000}}, {onError:'continueRegularOutput',...(retry?{retryOnFail:true,maxTries:2,waitBetweenTries:1200}:{})});}
const dbHeaders=[{name:'apikey',value:'={{ $env.SUPABASE_SECRET_KEY }}'}];
function rpc(name,method,body){return http(name,'={{ $env.SUPABASE_URL + "/rest/v1/rpc/'+method+'" }}',body,dbHeaders);}
function respond(name,body,status='200'){return add(name,'respondToWebhook',{respondWith:'json',responseBody:body,options:{responseCode:Number(status)}});}
add('Lead webhook','webhook',{httpMethod:'POST',path:'lead',authentication:'headerAuth',responseMode:'responseNode',options:{}},{webhookId:'ai-lead-capture-v2',credentials:{httpHeaderAuth:{id:'__HEADER_CREDENTIAL_ID__',name:'Lead webhook environment secret'}}});
code('Validate lead','return [{json:validate($json.body)}];');
branch('Valid input','$json.valid === true');
respond('Invalid input','={{ {error:"invalid_lead"} }}','400');
rpc('Reserve lead','lead_demo_claim','={{ {p_lead:$("Validate lead").first().json.lead,p_attempt:String($execution.id)} }}');
branch('Reservation claimed','$json.state === "claimed"');
code('Existing or unavailable','const r=$json; return [{json:r.state==="duplicate" ? {...r.result,id:r.id,stored:true,duplicate:true,email:"not_configured"} : {error:r.state==="busy"?"processing":r.state==="limit"?"daily_limit":"storage_unavailable"}}];');
add('Reservation response','respondToWebhook',{respondWith:'json',responseBody:'={{ $json }}',options:{responseCode:'={{ $json.error ? ($json.error === "daily_limit" ? 429 : 503) : 200 }}'}});
branch('AI enabled','$env.OPENAI_ENABLED === "true" && !!$env.OPENAI_API_KEY');
code('Prepare AI input','return [{json:openaiBody($("Validate lead").first().json.lead)}];');
http('OpenAI classification','https://api.openai.com/v1/responses','={{ $json }}',[{name:'Authorization',value:'={{ "Bearer " + $env.OPENAI_API_KEY }}'}]);
code('Validate AI output','return [{json:assessment($("Validate lead").first().json.lead,$json)}];');
code('Rules fallback','return [{json:fallback($("Validate lead").first().json.lead)}];');
rpc('Save assessment','lead_demo_finish','={{ {p_id:$("Reserve lead").first().json.id,p_attempt:String($execution.id),p_result:$json} }}');
branch('Saved successfully','$json.state === "saved"');
respond('Storage failure','={{ {error:"storage_unavailable"} }}','503');
branch('Telegram configured','!!$env.TELEGRAM_BOT_TOKEN && !!$env.TELEGRAM_CHAT_ID');
code('Prepare notification','const s=$("Save assessment").first().json; const r=s.result; return [{json:{text:["AI Lead Automation · new demo lead","ID: "+s.id,"Priority: "+r.priority+" · Score: "+r.score+"/100","Category: "+r.category,"Source: "+r.mode,r.summary].join(String.fromCharCode(10))}}];');
http('Notify manager','={{ "https://api.telegram.org/bot" + $env.TELEGRAM_BOT_TOKEN + "/sendMessage" }}','={{ {chat_id:$env.TELEGRAM_CHAT_ID,text:$json.text,disable_notification:true} }}',[],false);
code('Notification result','return [{json:{notification:notificationStatus($json)}}];');
code('Notification skipped','return [{json:{notification:"not_configured"}}];');
code('Public result','const saved=$("Save assessment").first().json; return [{json:{...saved.result,id:saved.id,stored:true,duplicate:false,notification:$json.notification,email:"not_configured"}}];');
rpc('Record notification','lead_demo_notification','={{ {p_id:$json.id,p_status:$json.notification} }}');
respond('Lead response','={{ $("Public result").first().json }}');
for(const [a,b,i] of [
['Lead webhook','Validate lead'],['Validate lead','Valid input'],['Valid input','Reserve lead',0],['Valid input','Invalid input',1],
['Reserve lead','Reservation claimed'],['Reservation claimed','AI enabled',0],['Reservation claimed','Existing or unavailable',1],['Existing or unavailable','Reservation response'],
['AI enabled','Prepare AI input',0],['AI enabled','Rules fallback',1],['Prepare AI input','OpenAI classification'],['OpenAI classification','Validate AI output'],
['Validate AI output','Save assessment'],['Rules fallback','Save assessment'],['Save assessment','Saved successfully'],['Saved successfully','Telegram configured',0],['Saved successfully','Storage failure',1],
['Telegram configured','Prepare notification',0],['Prepare notification','Notify manager'],['Telegram configured','Notification skipped',1],['Notify manager','Notification result'],['Notification result','Public result'],['Notification skipped','Public result'],['Public result','Record notification'],['Record notification','Lead response']])link(a,b,i);
await writeFile(new URL('./workflow.json',import.meta.url),JSON.stringify({name:'AI Lead Automation · capture, qualify, store, notify',nodes,connections,settings:{executionOrder:'v1',saveDataErrorExecution:'none',saveDataSuccessExecution:'none',saveManualExecutions:false,executionTimeout:75}},null,2)+'\n');
console.log('Workflow generated without credentials.');
