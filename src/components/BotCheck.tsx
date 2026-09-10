import { useEffect, useRef } from 'react'
interface Turnstile {render(container:HTMLElement,options:Record<string,unknown>):string;remove(id:string):void}
declare global { interface Window {turnstile?:Turnstile} }
let scriptReady:Promise<void>|undefined
function loadScript() {
  if(window.turnstile)return Promise.resolve()
  return scriptReady ||= new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script')
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async=true;script.onload=()=>resolve();script.onerror=()=>{script.remove();scriptReady=undefined;reject(new Error('Verification unavailable'))}
    document.head.append(script)
  })
}
export default function BotCheck({reset,onToken,onError}:{reset:number;onToken:(token:string)=>void;onError:(message:string)=>void}) {
  const host=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    let disposed=false;let widget:string|undefined
    onToken('');onError('')
    async function start(){
      try{
        const response=await fetch('/api/config',{signal:AbortSignal.timeout(10000)})
        if(!response.ok)throw new Error('config')
        const {siteKey}=await response.json()
        if(typeof siteKey!=='string' || !siteKey)throw new Error('config')
        await loadScript()
        if(disposed || !host.current)return
        widget=window.turnstile!.render(host.current,{sitekey:siteKey,action:'lead',theme:'light',size:'flexible',
          callback:(token:string)=>{onToken(token);onError('')},
          'expired-callback':()=>onToken(''),
          'error-callback':()=>{onToken('');onError('Verification is unavailable. You can still use Local preview.')}})
      }catch{if(!disposed)onError('Live verification is unavailable. You can still use Local preview.')}
    }
    void start()
    return ()=>{disposed=true;if(widget)window.turnstile?.remove(widget)}
  },[reset,onToken,onError])
  return <div className="bot-check" ref={host} />
}
