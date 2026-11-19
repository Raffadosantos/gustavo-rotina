// Roda a cada 5 min no GitHub Actions: envia as notificações dos compromissos.
function ocorre(e,d){if((e.x||[]).includes(d)||(e.f&&d>=e.f))return false;if(e.r==="dias")return d>=e.d&&(e.w||[]).includes(new Date(d+"T12:00").getDay());if(e.d===d)return true;if(!e.r||d<e.d)return false;const a=new Date(e.d+"T12:00"),b=new Date(d+"T12:00");if(e.r==="dia")return true;if(e.r==="sem")return a.getDay()===b.getDay();if(e.r==="mes")return a.getDate()===b.getDate();if(e.r==="mesd"){if(a.getDay()!==b.getDay())return false;const n=Math.ceil(a.getDate()/7);return n===5?b.getDate()+7>new Date(b.getFullYear(),b.getMonth()+1,0).getDate():Math.ceil(b.getDate()/7)===n}if(e.r==="ano")return a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();return false}
function naive(tz,date){
  const f=new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
  const o=Object.fromEntries(f.formatToParts(date).map(x=>[x.type,x.value]));
  return{d:o.year+"-"+o.month+"-"+o.day,ms:Date.UTC(+o.year,+o.month-1,+o.day,+o.hour,+o.minute,+o.second)};
}
export function due(S,tz,sent,now){
  const n=naive(tz,now),out=[],d1=new Date(n.ms+864e5).toISOString().slice(0,10);
  for(const d of [n.d,d1])for(const e of (S.ev||[])){
    if(!e.h||!(e.al>=0)||!ocorre(e,d))continue;
    const at=Date.parse(d+"T"+e.h+":00Z"),key=d+"|"+e.id;
    if(sent[key]||n.ms<at-e.al*60000||n.ms>=at+10*60000)continue;
    const m=Math.round((at-n.ms)/60000);
    out.push({key,title:"\u23f0 "+e.n,body:m>0?"Começa às "+e.h+" · faltam "+(m>=60?Math.floor(m/60)+"h"+(m%60?" "+(m%60)+"min":""):m+" min"):"Começa agora ("+e.h+")"});
  }
  return out;
}
async function main(){
  const{initializeApp,cert}=await import("firebase-admin/app");
  const{getFirestore,FieldPath,FieldValue}=await import("firebase-admin/firestore");
  const{getMessaging}=await import("firebase-admin/messaging");
  initializeApp({credential:cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))});
  const db=getFirestore(),fm=getMessaging();
  for(const u of await db.collection("users").listDocuments()){
    const c=u.collection("data");
    const[a,p,s]=await Promise.all([c.doc("app").get(),c.doc("push").get(),c.doc("sent").get()]);
    if(!a.exists||!p.exists)continue;
    const tokens=Object.keys(p.data().tokens||{});if(!tokens.length)continue;
    let S;try{S=JSON.parse(a.data().j)}catch(_){continue}
    const sent=(s.exists&&s.data().keys)||{};
    const items=due(S,p.data().tz||"America/Sao_Paulo",sent,new Date());
    for(const it of items){
      const r=await fm.sendEachForMulticast({tokens,data:{title:it.title,body:it.body,tag:it.key},webpush:{headers:{Urgency:"high",TTL:"3600"}}});
      for(let i=0;i<r.responses.length;i++){const x=r.responses[i],code=(x.error&&x.error.code)||"";
        if(!x.success&&/registration-token-not-registered|invalid-registration-token/.test(code))await p.ref.update(new FieldPath("tokens",tokens[i]),FieldValue.delete())}
      if(r.successCount>0)sent[it.key]=Date.now();
      console.log("Enviado:",it.title,"ok="+r.successCount,"falhas="+r.failureCount);
    }
    const lim=Date.now()-3*864e5;for(const k of Object.keys(sent))if(sent[k]<lim)delete sent[k];
    await c.doc("sent").set({keys:sent});
  }
  console.log("Fim da verificação.");
}
if(process.env.FIREBASE_SERVICE_ACCOUNT)main().catch(e=>{console.error(e);process.exit(1)});
