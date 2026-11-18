/* Histórico dos relatórios IA — TikTok e FlowBoost */
(()=>{
  const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const names={finance:'Financeira',performance:'Performance',market:'Mercado',growth:'Crescimento'};
  function panel(area){
    const target=document.getElementById(area==='tiktok'?'tiktokReport':'flowReport');
    if(!target||document.getElementById(area+'History'))return;
    const section=document.createElement('section');
    section.id=area+'History';
    section.className='glass';
    section.style.cssText='margin-top:14px;padding:16px;border-radius:20px;min-width:0';
    section.innerHTML='<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><h3 style="margin:0;font-size:16px">Histórico de relatórios IA</h3><button type="button" class="ghost" data-refresh-history>Atualizar histórico</button></div><div data-history-list style="margin-top:12px;display:grid;gap:8px"><p>Abra o histórico para consultar os relatórios salvos.</p></div>';
    target.insertAdjacentElement('afterend',section);
    section.querySelector('[data-refresh-history]').addEventListener('click',()=>load(area));
  }
  async function load(area){
    panel(area);
    const host=document.getElementById(area+'History');
    const list=host?.querySelector('[data-history-list]');
    if(!list)return;
    if(typeof db==='undefined'||!db||typeof state==='undefined'||!state.user){
      list.textContent='Entre na sua conta para consultar os relatórios.';return;
    }
    list.textContent='Carregando relatórios...';
    const {data,error}=await db.from('la_team_ai_reports')
      .select('id,title,area,agent,report,created_at')
      .eq('area',area).order('created_at',{ascending:false}).limit(30);
    if(error){list.textContent='Não foi possível carregar o histórico: '+error.message;return;}
    list.replaceChildren();
    if(!data?.length){list.textContent='Nenhum relatório salvo nesta área.';return;}
    for(const item of data){
      const details=document.createElement('details');
      details.style.cssText='border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px;min-width:0';
      const summary=document.createElement('summary');
      summary.style.cssText='cursor:pointer;overflow-wrap:anywhere';
      const date=item.created_at?new Date(item.created_at).toLocaleString('pt-BR'):'Data não disponível';
      summary.textContent=(names[item.agent]||item.title||'Relatório')+' • '+date;
      const body=document.createElement('div');
      body.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;margin-top:12px;font-size:13px;line-height:1.65';
      body.textContent=item.report||'Relatório sem conteúdo.';
      const copy=document.createElement('button');
      copy.type='button';copy.className='ghost';copy.style.marginTop='10px';copy.textContent='Copiar relatório';
      copy.addEventListener('click',()=>navigator.clipboard?.writeText(item.report||'').then(()=>{copy.textContent='Copiado';}).catch(()=>{copy.textContent='Não foi possível copiar';}));
      details.append(summary,body,copy);list.append(details);
    }
  }
  function init(){
    for(const area of ['tiktok','flowboost'])panel(area);
    document.querySelectorAll('[data-view="tiktok"],[data-view="flowboost"],[data-go="tiktok"],[data-go="flowboost"]').forEach(btn=>{
      btn.addEventListener('click',()=>{const area=btn.dataset.view||btn.dataset.go;setTimeout(()=>load(area),120);});
    });
    document.querySelectorAll('.ai-action').forEach(btn=>btn.addEventListener('click',()=>{
      const area=btn.dataset.area;
      if(area==='tiktok'||area==='flowboost')setTimeout(()=>load(area),9000);
    }));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
  window.laTeamLoadReportHistory=load;
})();