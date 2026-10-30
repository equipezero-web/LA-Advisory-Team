/* L&A Advisory Team — correção do envio de mensagens */
(()=>{
  let installed=false;

  function subtleSent(){
    let el=document.querySelector('#messageSentHint');
    if(!el){
      el=document.createElement('span');
      el.id='messageSentHint';
      Object.assign(el.style,{
        position:'fixed',right:'18px',bottom:'18px',zIndex:'1000',padding:'6px 10px',
        borderRadius:'9px',background:'rgba(20,23,31,.72)',border:'1px solid rgba(255,255,255,.08)',
        color:'rgba(255,255,255,.68)',fontSize:'11px',fontWeight:'500',lineHeight:'1',opacity:'0',
        transform:'translateY(4px)',transition:'opacity .18s ease, transform .18s ease',pointerEvents:'none',
        boxShadow:'0 4px 14px rgba(0,0,0,.12)'
      });
      document.body.appendChild(el);
    }
    el.textContent='Mensagem enviada';
    clearTimeout(el._hideTimer);
    requestAnimationFrame(()=>{el.style.opacity='.82';el.style.transform='translateY(0)';});
    el._hideTimer=setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(4px)';},1200);
  }

  function refreshDateList(){
    const holder=document.querySelector('#conversationDates');
    if(!holder) return;
    const days=[...new Set(state.messages.map(m=>dayKey(m.created_at)))].sort().reverse();
    holder.innerHTML=days.map(d=>`<button class="conversation-date ${d===state.chatDay?'active':''}" data-day="${d}"><b>${dayLabel(d)}</b><span>${state.messages.filter(m=>dayKey(m.created_at)===d).length} mensagens</span></button>`).join('')||'<div class="empty">Nenhuma conversa.</div>';
    holder.querySelectorAll('.conversation-date').forEach(b=>{b.onclick=()=>{state.chatDay=b.dataset.day;refreshDateList();renderMessages();};});
  }

  function install(){
    if(installed) return true;
    const form=document.querySelector('#teamMessageForm');
    if(!form || typeof db==='undefined' || !db || typeof state==='undefined' || !state || typeof renderMessages!=='function') return false;
    installed=true;
    form.onsubmit=async event=>{
      event.preventDefault();
      if(form.dataset.sending==='1') return;
      if(!state.user?.id){toast('Sua sessão não está disponível. Entre novamente.');return;}
      const textarea=form.querySelector('textarea[name="body"]');
      const button=form.querySelector('button[type="submit"]');
      const body=String(textarea?.value||'').trim();
      if(!body) return;
      form.dataset.sending='1';
      if(button){button.disabled=true;button.dataset.label=button.textContent;button.textContent='Enviando...';}
      try{
        const {data,error}=await db.from('la_team_messages').insert({channel:'general',author_id:state.user.id,body}).select('id,channel,author_id,body,created_at').single();
        if(error) throw error;
        state.messages=state.messages.filter(m=>m.id!==data.id);state.messages.push(data);state.messages.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
        state.chatDay=dayKey(data.created_at);form.reset();refreshDateList();renderMessages();subtleSent();
        Promise.resolve(loadMessages()).catch(error=>console.error('team_messages_sync_failed',error));
      }catch(error){console.error('team_message_send_failed',error);toast('Não foi possível enviar a mensagem. Tente novamente.');}
      finally{delete form.dataset.sending;if(button){button.disabled=false;button.textContent=button.dataset.label||'Enviar';delete button.dataset.label;}textarea?.focus();}
    };
    return true;
  }
  const timer=setInterval(()=>{if(install()) clearInterval(timer);},100);setTimeout(()=>clearInterval(timer),15000);
})();

(()=>{const s=document.createElement('script');s.src='assets/js/client-tools.js?v=2';s.defer=true;document.body.appendChild(s);})();
