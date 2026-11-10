(function(M){'use strict';
let contacts={},order=[],me=null,nodes={},chain=Promise.resolve();
try{localStorage.removeItem('mensagens:conversations:v1');localStorage.removeItem('mensagens:pessy:conversa4:mensagens-lidas:v2');localStorage.removeItem('mensagens:torajo:conversa4:mensagens-lidas:v1');}catch(e){}
    function relativeDate(value) {
        if (value === "Hoje") return "1 dia atrás";
        if (value === "Ontem") return "2 dias atrás";
        var match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || "");
        if (!match) return value || "";
        var year = Number(match[3]);
        var month = Number(match[2]) - 1;
        var day = Number(match[1]);
        var date = new Date(Date.UTC(year, month, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return value;
        var reference = new Date(Date.UTC(2026, 6, 1));
        var pastDate = date.getTime() <= reference.getTime() ? date : reference;
        var laterDate = date.getTime() <= reference.getTime() ? reference : date;
        var days = Math.abs(Math.floor((reference.getTime() - date.getTime()) / 864e5));
        if (days === 0) return "1 dia atrás";
        var months = (laterDate.getUTCFullYear() - pastDate.getUTCFullYear()) * 12 + laterDate.getUTCMonth() - pastDate.getUTCMonth();
        if (laterDate.getUTCDate() < pastDate.getUTCDate()) months -= 1;
        if (months === 0) return days + " dias atrás";
        if (months < 12) return months + (months === 1 ? " mês atrás" : " meses atrás");
        var years = Math.floor(months / 12);
        var remainder = months % 12;
        return years + (years === 1 ? " ano" : " anos") + (remainder ? " e " + remainder + (remainder === 1 ? " mês" : " meses") : "") + " atrás";
    }
function request(action,data){const next=chain.then(async()=>{const r=await fetch('/api/messages/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data||{})});if(!r.ok)throw Error('Conversa indisponível. Verifique o desbloqueio e o Wi-Fi.');return r.json()});chain=next.catch(()=>{});return next;}
function accept(contact){contacts[contact.id]=contact;if(!order.includes(contact.id))order.push(contact.id);nodes[contact.id]=contact.node||null;return contact;}
M.data={relativeDate,load:async function(){const data=await request('list');contacts={};order=[];me=data.me;data.contacts.forEach(accept);},
open:async function(id){const c=accept(await request('open',{id}));return c;},
setPhaseFourCaptureMode:()=>{},setPhaseFourMotherConversation:async function(){const data=await request('final');contacts={};order=[];data.contacts.forEach(accept);return true;},ready:()=>order.length>0,all:()=>order.map(id=>contacts[id]),get:id=>id==='me'?me:contacts[id]||null,
isContactHidden:id=>!contacts[id],unlockContact:async function(id,ticket){accept(await request('unlock',{id,ticket}));},myself:()=>me,
node:id=>nodes[id],nodes:()=>nodes,choose:async function(id,index){const result=await request('choose',{id,index});accept(result.contact);return result;},
markPessyMessageRead:m=>{m.read=true},markTorajoMessageRead:m=>{m.read=true},syncPessyConversationFourRead:()=>{},
addMessage:function(id,sender,text,creepy){const c=contacts[id];if(!c)return null;const m=typeof sender==='object'?Object.assign({},sender):{sender,text,creepy};m.time=m.time||M.time();c.messages.push(m);return m;},
persist:()=>{},bump:function(id){const at=order.indexOf(id);if(at>0){order.splice(at,1);order.unshift(id);}},last:function(id){const c=contacts[id];return c.messages.at(-1)||c.preview||null;},unreadTotal:()=>order.reduce((n,id)=>n+(contacts[id].unread||0),0)};
})(window.Msg=window.Msg||{});