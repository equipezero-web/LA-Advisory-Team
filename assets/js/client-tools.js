(()=>{
function hint(t){toast(t)}
async function del(id){
 const c=state.clients.find(x=>x.id===id); if(!c)return;
 const {error}=await db.from('la_team_clients').delete().eq('id',id);
 if(error){toast('Não foi possível excluir o cliente.');return}
 state.clients=state.clients.filter(x=>x.id!==id);renderKanban();renderStats();hint('Cliente excluído.');
}
function buttons(){
 document.querySelectorAll('.client-card').forEach(card=>{
  if(card.querySelector('.client-delete'))return;
  const b=document.createElement('button');b.type='button';b.className='client-delete';b.textContent='Excluir';
  Object.assign(b.style,{marginTop:'8px',border:'0',background:'transparent',color:'#c99',fontSize:'11px',cursor:'pointer',padding:'3px 0'});
  b.onclick=e=>{e.preventDefault();e.stopPropagation();del(card.dataset.id)};card.appendChild(b);
 });
}
const observer=new MutationObserver(buttons);const k=document.querySelector('#kanban');if(k)observer.observe(k,{childList:true,subtree:true});buttons();
const f=document.querySelector('#clientForm');if(!f)return;
[['name','text','Digite o nome ou empresa'],['contact','text','Digite o contato'],['service','text','Digite o serviço']].forEach(([n,t,p])=>{const x=f.querySelector(`[name="${n}"]`);if(x){x.type=t;x.placeholder=p}});
const v=f.querySelector('[name="value"]');if(v){v.type='number';v.inputMode='decimal';v.placeholder='0,00'}
const n=f.querySelector('[name="notes"]');if(n)n.placeholder='Digite as observações';
const old=f.onsubmit;f.onsubmit=async e=>{e.preventDefault();await old.call(f,e);if(!document.querySelector('#clientDialog')?.open){hint('Cliente adicionado.')}};
})();