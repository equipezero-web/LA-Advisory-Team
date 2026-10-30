/* L&A Advisory Team — correção do envio de mensagens */
(()=>{
  let installed=false;

  function install(){
    if(installed) return true;

    const form=document.querySelector('#teamMessageForm');
    if(!form || typeof db==='undefined' || !db || typeof state==='undefined' || !state || !form.onsubmit){
      return false;
    }

    installed=true;

    form.onsubmit=async event=>{
      event.preventDefault();

      if(form.dataset.sending==='1') return;
      if(!state.user?.id){
        toast('Sua sessão não está disponível. Entre novamente.');
        return;
      }

      const textarea=form.querySelector('textarea[name="body"]');
      const button=form.querySelector('button[type="submit"]');
      const body=String(textarea?.value||'').trim();
      if(!body) return;

      form.dataset.sending='1';
      if(button){
        button.disabled=true;
        button.dataset.label=button.textContent;
        button.textContent='Enviando...';
      }

      try{
        const {data,error}=await db
          .from('la_team_messages')
          .insert({
            channel:'general',
            author_id:state.user.id,
            body
          })
          .select('id,channel,author_id,body,created_at')
          .single();

        if(error) throw error;

        if(!state.messages.some(message=>message.id===data.id)){
          state.messages.push(data);
          state.messages.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
        }

        state.chatDay=dayKey(data.created_at);
        form.reset();

        // Recarrega do banco para manter histórico/datas sincronizados.
        await loadMessages();
        state.chatDay=dayKey(data.created_at);
        renderMessages();

        toast('Mensagem enviada.');
      }catch(error){
        console.error('team_message_send_failed',error);
        toast('Não foi possível enviar a mensagem. Tente novamente.');
      }finally{
        delete form.dataset.sending;
        if(button){
          button.disabled=false;
          button.textContent=button.dataset.label||'Enviar';
          delete button.dataset.label;
        }
        textarea?.focus();
      }
    };

    return true;
  }

  const timer=setInterval(()=>{
    if(install()) clearInterval(timer);
  },100);

  setTimeout(()=>clearInterval(timer),15000);
})();
