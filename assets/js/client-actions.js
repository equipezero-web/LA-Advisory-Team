/* L&A Advisory Team — ações visíveis do CRM */
(()=>{
  function enhance(){
    if(typeof state==='undefined'||typeof db==='undefined'||!db||typeof renderKanban!=='function') return false;

    const original=renderKanban;
    renderKanban=function(){
      original();
      document.querySelectorAll('.client-card').forEach(card=>{
        const id=card.dataset.id;
        if(!id||card.querySelector('.client-delete-btn')) return;
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='client-delete-btn';
        btn.textContent='Excluir cliente';
        Object.assign(btn.style,{marginTop:'10px',padding:'7px 10px',borderRadius:'9px',border:'1px solid rgba(239,68,68,.28)',background:'rgba(239,68,68,.08)',color:'#fca5a5',fontSize:'11px',cursor:'pointer',width:'100%'});
        btn.onclick=async e=>{
          e.preventDefault();e.stopPropagation();
          const client=state.clients.find(c=>String(c.id)===String(id));
          if(!confirm(`Excluir ${client?.name||'este cliente'}?`)) return;
          btn.disabled=true;btn.textContent='Excluindo...';
          const {error}=await db.from('la_team_clients').delete().eq('id',id);
          if(error){btn.disabled=false;btn.textContent='Excluir cliente';toast('Não foi possível excluir o cliente.');return;}
          state.clients=state.clients.filter(c=>String(c.id)!==String(id));
          renderKanban();renderStats();toast('Cliente excluído.');
        };
        card.appendChild(btn);
      });
    };
    renderKanban();
    return true;
  }
  const timer=setInterval(()=>{if(enhance()) clearInterval(timer);},100);
  setTimeout(()=>clearInterval(timer),15000);
})();
