const SUPABASE_URL='https://fqisewatypluagngmgka.supabase.co',SUPABASE_KEY='sb_publishable_Etts25r3XRBdDHuUYuUajg_YjXTn_wb',TURNSTILE_SITE_KEY='0x4AAAAAAFVfC4-0L4pXMgnJ';

const stages=[
  ['contacts','Contatos'],
  ['negotiation','Em negociação'],
  ['development','Desenvolvimento'],
  ['closed','Fechados'],
  ['monthly','Mensalistas']
];

const state={
  clients:[],
  user:null,
  member:null,
  members:[],
  captchaToken:null,
  captchaWidget:null,
  flow:null,
  messages:[],
  chatDay:null,
  tiktok:null
};

let db=null;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  "'":'&#39;',
  '"':'&quot;'
}[c]));

const money=c=>(Number(c||0)/100).toLocaleString('pt-BR',{
  style:'currency',
  currency:'BRL'
});

const dayKey=d=>new Date(d).toLocaleDateString('en-CA',{
  timeZone:'America/Recife'
});

const dayLabel=d=>new Date(d+'T12:00:00')
  .toLocaleDateString('pt-BR',{
    day:'2-digit',
    month:'short',
    year:'numeric'
  })
  .replace('.','')
  .toUpperCase();


function toast(m){
  let t=$('#laToast');

  if(!t){
    t=document.createElement('div');
    t.id='laToast';

    Object.assign(t.style,{
      position:'fixed',
      right:'18px',
      bottom:'90px',
      zIndex:1000,
      padding:'12px 16px',
      borderRadius:'14px',
      background:'rgba(20,23,31,.94)',
      border:'1px solid rgba(255,255,255,.12)',
      color:'#fff'
    });

    document.body.appendChild(t);
  }

  t.textContent=m;
  t.hidden=false;

  clearTimeout(t._t);

  t._t=setTimeout(()=>{
    t.hidden=true;
  },3000);
}


function go(v){
  $$('.view').forEach(x=>{
    x.classList.toggle('active',x.id===v);
  });

  $$('[data-go],.nav-item').forEach(b=>{
    b.classList.toggle(
      'active',
      (b.dataset.go||b.dataset.view)===v
    );
  });

  $('#pageTitle').textContent={
    dashboard:'Dashboard',
    crm:'CRM & Clientes',
    projects:'Projetos',
    finance:'Financeiro',
    tiktok:'TikTok Intelligence',
    flowboost:'FlowBoost Intelligence',
    team:'Equipe'
  }[v]||'L&A';

  if(v==='flowboost') loadFlow();
  if(v==='tiktok') loadTikTok();

  if(v==='team'){
    loadMembers();
    loadMessages();
  }

  window.scrollTo({
    top:0,
    behavior:'smooth'
  });
}


function renderKanban(){
  const b=$('#kanban');

  b.innerHTML='';

  stages.forEach(([k,l])=>{

    const items=state.clients.filter(c=>c.stage===k);
    const col=document.createElement('section');

    col.className='kanban-column';

    col.innerHTML=`
      <div class="kanban-head">
        <h3>${l}</h3>
        <span class="count">${items.length}</span>
      </div>
      <div class="dropzone"></div>
    `;

    const z=col.querySelector('.dropzone');

    items.forEach(c=>{

      const card=document.createElement('article');

      card.className='client-card';
      card.draggable=true;
      card.dataset.id=c.id;

      card.innerHTML=`
        <p>${esc(c.service||'Cliente L&A')}</p>
        <h4>${esc(c.name)}</h4>
        <p>${esc(c.contact||'Contato não informado')}</p>
        ${c.notes?'<span class="tag">Com observações</span>':''}
      `;

      card.ondragstart=e=>{
        e.dataTransfer.setData('text/plain',c.id);
      };

      z.appendChild(card);
    });

    z.ondragover=e=>e.preventDefault();

    z.ondrop=async e=>{

      e.preventDefault();

      const id=e.dataTransfer.getData('text/plain');
      const c=state.clients.find(x=>x.id===id);

      if(!c||c.stage===k) return;

      const old=c.stage;

      c.stage=k;

      renderKanban();
      renderStats();

      const {error}=await db
        .from('la_team_clients')
        .update({
          stage:k,
          updated_at:new Date().toISOString()
        })
        .eq('id',id);

      if(error){
        c.stage=old;
        renderKanban();
        renderStats();
        toast('Não foi possível mover o cliente.');
      }
    };

    b.appendChild(col);
  });
}


function renderStats(){

  const n=s=>state.clients.filter(c=>c.stage===s).length;

  $('#leadCount').textContent=
    n('contacts')+n('negotiation');

  $('#devCount').textContent=
    n('development');

  $('#monthlyCount').textContent=
    n('monthly');
}


async function loadClients(){

  const {data,error}=await db
    .from('la_team_clients')
    .select('*')
    .order('created_at',{
      ascending:false
    });

  if(error){
    return toast('Falha ao carregar CRM.');
  }

  state.clients=data||[];

  renderKanban();
  renderStats();
}


async function loadFlow(){

  if(!state.user) return;

  const {data,error}=await db.rpc(
    'la_team_flowboost_analytics'
  );

  if(error){
    $('#flowReport').textContent=
      'Não foi possível carregar os dados protegidos do FlowBoost.';
    return;
  }

  state.flow=data;

  const s=data.summary||{};

  $('#fbOrders').textContent=
    Number(s.orders||0).toLocaleString('pt-BR');

  $('#fbFollowers').textContent=
    Number(s.followers||0).toLocaleString('pt-BR');

  $('#fbRevenue').textContent=
    money(s.revenue_cents);

  $('#fbPending').textContent=
    Number(s.pending||0).toLocaleString('pt-BR');

  $('#fbPackages').innerHTML=
    (data.packages||[])
      .map((p,i)=>`
        <div class="data-row">
          <b>
            #${i+1} •
            ${Number(p.quantity).toLocaleString('pt-BR')}
            seguidores
          </b>
          <span>
            ${p.orders} pedidos •
            ${money(p.revenue_cents)}
          </span>
        </div>
      `)
      .join('')
      ||
      '<div class="empty">Ainda não há pedidos.</div>';

  $('#fbRecent').innerHTML=
    (data.recent||[])
      .slice(0,8)
      .map(o=>`
        <div class="data-row">
          <b>${esc(o.code||'Pedido')}</b>
          <span>
            ${Number(o.quantity||0).toLocaleString('pt-BR')}
            •
            ${money(o.total_cents)}
          </span>
        </div>
      `)
      .join('')
      ||
      '<div class="empty">Sem registros.</div>';
}


async function runAI(button){

  if(!state.user) return;

  const area=button.dataset.area;
  const agent=button.dataset.ai;

  const target=
    area==='flowboost'
      ? $('#flowReport')
      : $('#tiktokReport');

  const old=button.textContent;

  button.disabled=true;
  button.textContent='Analisando...';

  target.textContent=
    'A inteligência está analisando os dados reais e preparando o relatório...';

  try{

    const {data,error}=await db.functions.invoke(
      'la-team-ai',
      {
        body:{
          area,
          agent
        }
      }
    );

    if(error) throw error;

    if(!data?.ok){
      throw new Error(
        data?.error||'Falha na análise'
      );
    }

    target.textContent=
      data.report||'Relatório concluído.';

    toast(
      'Relatório IA salvo no histórico.'
    );

  }catch(e){

    console.error(e);

    target.textContent=
      'Não foi possível gerar o relatório agora. Verifique a configuração do provedor de IA ou tente novamente.';

    toast(
      'Falha ao gerar relatório IA.'
    );

  }finally{

    button.disabled=false;
    button.textContent=old;
  }
}


/* ======================================================
   AUTENTICAÇÃO SEGURA
====================================================== */

async function teamAuth(action,payload={}){

  const {
    data:{session}
  }=await db.auth.getSession();

  const headers={
    'content-type':'application/json',
    'apikey':SUPABASE_KEY
  };

  if(session?.access_token){
    headers.authorization=
      `Bearer ${session.access_token}`;
  }

  const response=await fetch(
    `${SUPABASE_URL}/functions/v1/la-team-auth`,
    {
      method:'POST',
      headers,
      body:JSON.stringify({
        action,
        ...payload
      })
    }
  );

  const data=
    await response.json().catch(()=>({}));

  if(!response.ok){
    throw new Error(
      data.error||
      'Operação não autorizada.'
    );
  }

  return data;
}


/* ======================================================
   MEMBROS
====================================================== */

async function loadMembers(){

  if(!state.user) return;

  const {data,error}=await db.rpc(
    'la_team_member_summary'
  );

  if(error){
    console.error(error);
    return;
  }

  state.members=data||[];

  renderMemberAdmin();
}


function memberName(id){

  const member=
    state.members.find(
      x=>x.user_id===id
    );

  return (
    member?.display_name||
    member?.username||
    'Equipe L&A'
  );
}


/* ======================================================
   MENSAGENS
====================================================== */

async function loadMessages(){

  if(!state.user) return;

  if(!state.members.length){
    await loadMembers();
  }

  const {data,error}=await db
    .from('la_team_messages')
    .select(
      'id,channel,author_id,body,created_at'
    )
    .eq('channel','general')
    .order(
      'created_at',
      {ascending:true}
    )
    .limit(1000);

  if(error){
    return toast(
      'Não foi possível carregar as conversas.'
    );
  }

  state.messages=data||[];

  const days=[
    ...new Set(
      state.messages.map(
        m=>dayKey(m.created_at)
      )
    )
  ]
  .sort()
  .reverse();

  if(!state.chatDay){
    state.chatDay=
      days[0]||
      dayKey(new Date());
  }

  $('#conversationDates').innerHTML=
    days.map(d=>`
      <button
        class="conversation-date ${
          d===state.chatDay
            ? 'active'
            : ''
        }"
        data-day="${d}"
      >
        <b>${dayLabel(d)}</b>
        <span>
          ${
            state.messages.filter(
              m=>dayKey(m.created_at)===d
            ).length
          }
          mensagens
        </span>
      </button>
    `)
    .join('')
    ||
    '<div class="empty">Nenhuma conversa.</div>';

  $$('.conversation-date')
    .forEach(b=>{

      b.onclick=()=>{

        state.chatDay=
          b.dataset.day;

        renderMessages();
      };
    });

  renderMessages();
}


function renderMessages(){

  const day=
    state.chatDay||
    dayKey(new Date());

  const rows=
    state.messages.filter(
      m=>dayKey(m.created_at)===day
    );

  $('#chatDateTitle').textContent=
    dayLabel(day);

  $('#teamMessages').innerHTML=
    rows.map(m=>`

      <div class="message ${
        m.author_id===state.user?.id
          ? 'mine'
          : ''
      }">

        <b>
          ${
            m.author_id===state.user?.id
              ? 'Você'
              : esc(memberName(m.author_id))
          }
        </b>

        <p>${esc(m.body)}</p>

        <span>
          ${
            new Date(
              m.created_at
            ).toLocaleTimeString(
              'pt-BR',
              {
                hour:'2-digit',
                minute:'2-digit'
              }
            )
          }
        </span>

      </div>

    `)
    .join('')
    ||
    '<div class="empty">Nenhuma mensagem neste dia.</div>';

  $('#teamMessages').scrollTop=
    $('#teamMessages').scrollHeight;
}


/* ======================================================
   TURNSTILE
====================================================== */

function loadTurnstile(){

  return new Promise(
    (resolve,reject)=>{

      if(window.turnstile){
        return resolve(
          window.turnstile
        );
      }

      const script=
        document.createElement(
          'script'
        );

      script.src=
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

      script.async=true;
      script.defer=true;

      script.onload=()=>{
        resolve(
          window.turnstile
        );
      };

      script.onerror=reject;

      document.head.appendChild(
        script
      );
    }
  );
}


async function renderCaptcha(){

  try{

    const turnstile=
      await loadTurnstile();

    const holder=
      $('#turnstileBox');

    if(!holder) return;

    state.captchaToken=null;

    state.captchaWidget=
      turnstile.render(
        holder,
        {
          sitekey:TURNSTILE_SITE_KEY,
          theme:'dark',

          callback:token=>{
            state.captchaToken=token;
          },

          'expired-callback':()=>{
            state.captchaToken=null;
          }
        }
      );

  }catch(e){

    console.error(e);

    const status=
      $('#loginStatus');

    if(status){
      status.textContent=
        'Falha ao carregar a verificação de segurança.';
    }
  }
}


function resetCaptcha(){

  state.captchaToken=null;

  if(
    window.turnstile &&
    state.captchaWidget!=null
  ){

    try{
      window.turnstile.reset(
        state.captchaWidget
      );
    }catch(e){
      console.error(e);
    }
  }
}


/* ======================================================
   LOGIN
====================================================== */

function showLogin(){

  $('#authGate')?.remove();

  const lastUsername=
    localStorage.getItem(
      'la_team_last_username'
    )||'';

  const gate=
    document.createElement('div');

  gate.id='authGate';

  gate.innerHTML=`

    <div
      class="glass"
      style="
        width:min(440px,calc(100% - 28px));
        padding:28px;
        border-radius:28px;
      "
    >

      <div class="brand">

        <div class="brand-mark">
          L&A
        </div>

        <div>
          <strong>
            Advisory Team
          </strong>

          <span>
            Acesso interno protegido
          </span>
        </div>

      </div>

      <form
        id="loginForm"
        style="
          display:grid;
          gap:12px;
          margin-top:22px;
        "
      >

        <input
          name="username"
          required
          minlength="4"
          maxlength="40"
          value="${esc(lastUsername)}"
          placeholder="Nome de usuário"
          autocomplete="username"
        >

        <input
          name="password"
          type="password"
          required
          minlength="12"
          placeholder="Senha"
          autocomplete="current-password"
        >

        <div
          id="turnstileBox"
          style="
            min-height:65px;
            display:grid;
            place-items:center;
          "
        ></div>

        <button
          class="primary"
          type="submit"
        >
          Entrar
        </button>

        <button
          type="button"
          class="ghost"
          id="createAccount"
        >
          Criar conta
        </button>

        <small id="loginStatus"></small>

      </form>

    </div>
  `;

  Object.assign(
    gate.style,
    {
      position:'fixed',
      inset:0,
      zIndex:999,
      display:'grid',
      placeItems:'center',
      background:'rgba(5,7,11,.82)',
      backdropFilter:'blur(28px)',
      overflow:'auto',
      padding:'20px 0'
    }
  );

  document.body.appendChild(
    gate
  );

  renderCaptcha();


  $('#loginForm').onsubmit=
    async event=>{

      event.preventDefault();

      const status=
        $('#loginStatus');

      const form=
        new FormData(
          event.currentTarget
        );

      const username=
        String(
          form.get('username')||''
        ).trim();

      const password=
        String(
          form.get('password')||''
        );

      if(!state.captchaToken){

        status.textContent=
          'Conclua a verificação de segurança.';

        return;
      }

      status.textContent=
        'Entrando...';

      try{

        const result=
          await teamAuth(
            'login',
            {
              username,
              password,
              captchatoken:
                state.captchaToken
            }
          );

        const session=
          result.session||
          result;

        if(
          !session.access_token ||
          !session.refresh_token
        ){

          throw new Error(
            'Não foi possível iniciar a sessão.'
          );
        }

        localStorage.setItem(
          'la_team_last_username',
          username
        );

        const {error}=
          await db.auth.setSession({
            access_token:
              session.access_token,

            refresh_token:
              session.refresh_token
          });

        if(error){
          throw error;
        }

      }catch(error){

        console.error(error);

        status.textContent=
          error.message||
          'Usuário ou senha inválidos.';

        resetCaptcha();
      }
    };


  $('#createAccount').onclick=()=>{
    showRegister();
  };
}


/* ======================================================
   CADASTRO
====================================================== */

function showRegister(){

  $('#authGate')?.remove();

  const gate=
    document.createElement('div');

  gate.id='authGate';

  gate.innerHTML=`

    <div
      class="glass"
      style="
        width:min(440px,calc(100% - 28px));
        padding:28px;
        border-radius:28px;
      "
    >

      <div class="brand">

        <div class="brand-mark">
          L&A
        </div>

        <div>
          <strong>
            Criar conta
          </strong>

          <span>
            Solicitação de acesso interno
          </span>
        </div>

      </div>

      <form
        id="registerForm"
        style="
          display:grid;
          gap:12px;
          margin-top:22px;
        "
      >

        <input
          name="display_name"
          required
          maxlength="80"
          placeholder="Seu nome"
          autocomplete="name"
        >

        <input
          name="username"
          required
          minlength="4"
          maxlength="40"
          pattern="[A-Za-z0-9@._-]{4,40}"
          placeholder="Nome de usuário"
          autocomplete="username"
        >

        <input
          name="password"
          type="password"
          required
          minlength="12"
          maxlength="128"
          placeholder="Senha forte"
          autocomplete="new-password"
        >

        <input
          name="confirm"
          type="password"
          required
          minlength="12"
          maxlength="128"
          placeholder="Confirmar senha"
          autocomplete="new-password"
        >

        <small>
          A senha precisa ter pelo menos
          12 caracteres, com letra maiúscula,
          minúscula, número e símbolo.
        </small>

        <small>
          Sua conta ficará aguardando
          aprovação do administrador.
        </small>

        <div
          id="turnstileBox"
          style="
            min-height:65px;
            display:grid;
            place-items:center;
          "
        ></div>

        <button
          class="primary"
          type="submit"
        >
          Solicitar acesso
        </button>

        <button
          type="button"
          class="ghost"
          id="backLogin"
        >
          Voltar para entrar
        </button>

        <small id="loginStatus"></small>

      </form>

    </div>
  `;

  Object.assign(
    gate.style,
    {
      position:'fixed',
      inset:0,
      zIndex:999,
      display:'grid',
      placeItems:'center',
      background:'rgba(5,7,11,.82)',
      backdropFilter:'blur(28px)',
      overflow:'auto',
      padding:'20px 0'
    }
  );

  document.body.appendChild(
    gate
  );

  state.captchaWidget=null;
  state.captchaToken=null;

  renderCaptcha();


  $('#backLogin').onclick=()=>{

    gate.remove();

    showLogin();
  };


  $('#registerForm').onsubmit=
    async event=>{

      event.preventDefault();

      const status=
        $('#loginStatus');

      const form=
        new FormData(
          event.currentTarget
        );

      const displayName=
        String(
          form.get('display_name')||''
        ).trim();

      const username=
        String(
          form.get('username')||''
        ).trim();

      const password=
        String(
          form.get('password')||''
        );

      const confirm=
        String(
          form.get('confirm')||''
        );

      if(password!==confirm){

        status.textContent=
          'As senhas não coincidem.';

        return;
      }

      const strongPassword=
        /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}/;

      if(!strongPassword.test(password)){

        status.textContent=
          'Use pelo menos 12 caracteres com maiúscula, minúscula, número e símbolo.';

        return;
      }

      if(!state.captchaToken){

        status.textContent=
          'Conclua a verificação de segurança.';

        return;
      }

      status.textContent=
        'Enviando solicitação...';

      try{

        await teamAuth(
          'register',
          {
            display_name:
              displayName,

            username,

            password,

            captchatoken:
              state.captchaToken
          }
        );

        status.textContent=
          'Conta criada. Aguarde a aprovação do ADM para entrar.';

        event.currentTarget
          .querySelectorAll('input')
          .forEach(input=>{
            input.value='';
          });

      }catch(error){

        console.error(error);

        status.textContent=
          error.message||
          'Não foi possível criar a conta.';
      }

      resetCaptcha();
    };
}


/* ======================================================
   AUTORIZAÇÃO
====================================================== */

async function authorize(session){

  state.user=
    session?.user||null;

  if(!state.user){

    showLogin();

    return false;
  }

  const {data,error}=
    await db
      .from('la_team_members')
      .select(
        'user_id,display_name,username,role,active,approved_at'
      )
      .eq(
        'user_id',
        state.user.id
      )
      .maybeSingle();

  if(
    error ||
    !data?.active ||
    !data?.approved_at
  ){

    await db.auth.signOut();

    showLogin();

    return false;
  }

  state.member=data;

  $('#authGate')?.remove();

  $$('.profile strong')
    .forEach(element=>{

      element.textContent=
        data.display_name||
        data.username||
        'Equipe L&A';
    });


  const profileInfo=
    $('.profile span');

  if(profileInfo){

    profileInfo.textContent=
      `${data.username||''} • ${
        data.role==='admin'
          ? 'Administrador'
          : 'Operador'
      }`;
  }

  try{
    await db.rpc(
      'la_team_touch_last_seen'
    );
  }catch(error){
    console.error(error);
  }

  ensureAccountUI();

  return true;
}


/* ======================================================
   BOTÃO SAIR
====================================================== */

function ensureAccountUI(){

  const top=
    $('.top-actions');

  if(
    !top ||
    $('#logoutBtn')
  ){
    return;
  }

  const button=
    document.createElement(
      'button'
    );

  button.id='logoutBtn';
  button.className='ghost';
  button.textContent='Sair';

  button.onclick=
    async ()=>{

      if(state.member?.username){

        localStorage.setItem(
          'la_team_last_username',
          state.member.username
        );
      }

      await db.auth.signOut();

      state.user=null;
      state.member=null;
      state.members=[];

      showLogin();
    };

  top.insertBefore(
    button,
    top.lastElementChild
  );
}


/* ======================================================
   ADMINISTRAÇÃO DE USUÁRIOS
====================================================== */

function renderMemberAdmin(){

  const team=$('#team');

  if(!team) return;

  let box=$('#memberAdmin');

  if(
    state.member?.role!=='admin'
  ){

    box?.remove();

    return;
  }

  if(!box){

    box=
      document.createElement(
        'section'
      );

    box.id='memberAdmin';
    box.className='panel glass';
    box.style.marginBottom='18px';

    const workspace=
      team.querySelector(
        '.team-workspace'
      );

    workspace?.before(box);
  }


  const rows=
    state.members.filter(
      member=>
        member.user_id!==
        state.user?.id
    );


  box.innerHTML=`

    <div class="panel-head">

      <div>

        <p class="eyebrow">
          ACESSOS
        </p>

        <h3>
          Usuários da equipe
        </h3>

      </div>

    </div>


    <div class="activity-list">

      ${
        rows.map(member=>`

          <div class="data-row">

            <div>

              <b>
                ${
                  esc(
                    member.display_name||
                    member.username
                  )
                }
              </b>

              <span
                style="
                  display:block;
                  margin-top:4px;
                "
              >

                ${
                  esc(
                    member.username||''
                  )
                }

                •

                ${
                  member.role==='admin'
                    ? 'Administrador'
                    : 'Operador'
                }

                •

                ${
                  member.active
                    ? 'Ativo'
                    : 'Pendente / Inativo'
                }

              </span>

            </div>


            <div
              style="
                display:flex;
                gap:8px;
                flex-wrap:wrap;
              "
            >

              ${
                !member.active

                ? `

                  <button
                    class="primary member-action"
                    data-action="approve"
                    data-id="${member.user_id}"
                  >
                    Aprovar
                  </button>

                `

                : `

                  <button
                    class="ghost member-action"
                    data-action="disable"
                    data-id="${member.user_id}"
                  >
                    Desativar
                  </button>

                `
              }

            </div>

          </div>

        `)
        .join('')
        ||
        `
          <div class="empty">
            Nenhum outro usuário cadastrado.
          </div>
        `
      }

    </div>
  `;


  $$('.member-action')
    .forEach(button=>{

      button.onclick=
        async ()=>{

          button.disabled=true;

          const action=
            button.dataset.action;

          const userId=
            button.dataset.id;

          try{

            await teamAuth(
              action,
              {
                user_id:userId
              }
            );

            await loadMembers();

            toast(
              action==='approve'
                ? 'Usuário aprovado com sucesso.'
                : 'Usuário desativado.'
            );

          }catch(error){

            console.error(error);

            toast(
              error.message||
              'Não foi possível alterar o acesso.'
            );

            button.disabled=false;
          }
        };
    });
}


/* ======================================================
   INICIALIZAÇÃO
====================================================== */

async function init(){

  const mod=
    await import(
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm'
    );


  db=mod.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true
      }
    }
  );


  $$('.nav-item')
    .forEach(button=>{

      button.onclick=()=>{
        go(
          button.dataset.view
        );
      };
    });


  $$('[data-go]')
    .forEach(button=>{

      button.onclick=()=>{
        go(
          button.dataset.go
        );
      };
    });


  $('#newClientBtn').onclick=()=>{

    $('#clientDialog')
      .showModal();
  };


  $('#closeDialog').onclick=()=>{

    $('#clientDialog')
      .close();
  };


  $('#clientForm').onsubmit=
    async event=>{

      event.preventDefault();

      const form=
        new FormData(
          event.currentTarget
        );


      const payload={

        name:
          form.get('name'),

        contact:
          form.get('contact'),

        service:
          form.get('service'),

        estimated_value:
          Number(
            form.get('value')||0
          ),

        notes:
          form.get('notes'),

        stage:'contacts',

        created_by:
          state.user.id
      };


      const {data,error}=
        await db
          .from('la_team_clients')
          .insert(payload)
          .select()
          .single();


      if(error){

        return toast(
          'Não foi possível salvar.'
        );
      }


      state.clients.unshift(
        data
      );

      renderKanban();
      renderStats();

      event.currentTarget.reset();

      $('#clientDialog').close();
    };


  $('#refreshFlow').onclick=
    loadFlow;


  $$('.ai-action')
    .forEach(button=>{

      button.onclick=()=>{
        runAI(button);
      };
    });


  $('#teamMessageForm').onsubmit=
    async event=>{

      event.preventDefault();

      const form=
        new FormData(
          event.currentTarget
        );

      const body=
        String(
          form.get('body')||''
        ).trim();

      if(!body) return;


      const {error}=
        await db
          .from('la_team_messages')
          .insert({
            channel:'general',
            author_id:
              state.user.id,
            body
          });


      if(error){

        return toast(
          'Não foi possível enviar a mensagem.'
        );
      }


      event.currentTarget.reset();

      state.chatDay=
        dayKey(new Date());

      await loadMessages();
    };


  const {
    data:{session}
  }=
    await db.auth.getSession();


  if(
    await authorize(session)
  ){

    await loadMembers();

    await loadClients();

    await Promise.all([
      loadFlow(),
      loadMessages()
    ]);
  }


  db.auth.onAuthStateChange(
    async (
      event,
      session
    )=>{

      if(
        event==='SIGNED_IN'
      ){

        if(
          await authorize(session)
        ){

          await loadMembers();

          await loadClients();

          await Promise.all([
            loadFlow(),
            loadMessages()
          ]);

          await setupTikTok();
        }
      }


      if(
        event==='SIGNED_OUT'
      ){

        state.user=null;
        state.member=null;
        state.members=[];

        showLogin();
      }
    }
  );


  if(
    'serviceWorker'
    in navigator
  ){

    navigator.serviceWorker
      .register('./sw.js')
      .catch(
        error=>
          console.error(error)
      );
  }


  renderKanban();
  renderStats();
}


/* ======================================================
   TIKTOK
====================================================== */

function ensureTikTokUI(){

  const section=$('#tiktok');

  if(
    !section ||
    $('#connectTikTok')
  ){
    return;
  }


  const head=
    section.querySelector(
      '.section-head'
    );


  const chip=
    head?.querySelector(
      '.chip'
    );


  if(chip){

    chip.id='tiktokStatus';

    chip.textContent=
      'Verificando conexão...';
  }


  const actions=
    document.createElement(
      'div'
    );


  actions.style.cssText=
    'display:flex;gap:10px;flex-wrap:wrap;align-items:center';


  actions.innerHTML=`

    <button
      class="primary"
      id="connectTikTok"
    >
      Conectar TikTok
    </button>

    <button
      class="ghost"
      id="syncTikTok"
      hidden
    >
      Atualizar TikTok
    </button>
  `;


  head?.appendChild(
    actions
  );


  const ranking=
    document.createElement(
      'div'
    );


  ranking.className=
    'panel glass';


  ranking.style.marginTop=
    '18px';


  ranking.innerHTML=`

    <div class="panel-head">

      <div>

        <p class="eyebrow">
          VÍDEOS
        </p>

        <h3>
          Performance recente
        </h3>

      </div>

    </div>

    <div
      id="tiktokVideos"
      class="activity-list"
    >

      <div class="empty">
        Conecte o TikTok para carregar vídeos reais.
      </div>

    </div>
  `;


  section.insertBefore(
    ranking,
    $('#tiktokReport')
  );


  $('#connectTikTok').onclick=
    connectTikTok;


  $('#syncTikTok').onclick=
    loadTikTok;
}


async function callTikTok(action){

  const {
    data:{session}
  }=
    await db.auth.getSession();


  if(!session){

    throw new Error(
      'Sessão expirada.'
    );
  }


  const response=
    await fetch(
      `${SUPABASE_URL}/functions/v1/la-team-tiktok-oauth`,
      {
        method:'POST',

        headers:{
          'content-type':
            'application/json',

          'apikey':
            SUPABASE_KEY,

          'authorization':
            `Bearer ${session.access_token}`
        },

        body:JSON.stringify({
          action
        })
      }
    );


  const data=
    await response
      .json()
      .catch(()=>({}));


  if(!response.ok){

    throw new Error(
      data.sync_error||
      data.error||
      'Falha na integração TikTok.'
    );
  }


  return data;
}


async function connectTikTok(){

  const button=
    $('#connectTikTok');

  const old=
    button.textContent;

  button.disabled=true;

  button.textContent=
    'Abrindo TikTok...';


  try{

    const data=
      await callTikTok(
        'start'
      );


    if(!data.auth_url){

      throw new Error(
        'URL de autorização não recebida.'
      );
    }


    location.href=
      data.auth_url;


  }catch(error){

    console.error(error);

    toast(
      'Não foi possível iniciar a conexão com o TikTok.'
    );

    button.disabled=false;
    button.textContent=old;
  }
}


function renderTikTok(data){

  state.tiktok=data;

  const connected=
    !!data?.connected;

  const chip=
    $('#tiktokStatus');

  const connect=
    $('#connectTikTok');

  const sync=
    $('#syncTikTok');


  if(chip){

    chip.textContent=
      connected
        ? 'TikTok conectado'
        : 'TikTok não conectado';

    chip.classList.toggle(
      'connected',
      connected
    );
  }


  if(connect){

    connect.textContent=
      connected
        ? 'Reconectar TikTok'
        : 'Conectar TikTok';
  }


  if(sync){

    sync.hidden=
      !connected;
  }


  if(!connected){

    $('#ttFollowers').textContent='—';
    $('#ttViews').textContent='—';
    $('#ttEngagement').textContent='—';
    $('#ttRevenue').textContent='—';

    return;
  }


  const profile=
    data.profile||{};

  const summary=
    data.summary||{};


  $('#ttFollowers').textContent=
    Number(
      profile.follower_count||0
    ).toLocaleString('pt-BR');


  $('#ttViews').textContent=
    Number(
      summary.views||0
    ).toLocaleString('pt-BR');


  $('#ttEngagement').textContent=
    summary.engagement==null
      ? '—'
      : `${summary.engagement.toFixed(2)}%`;


  $('#ttRevenue').textContent=
    'Indisponível via API';


  const list=
    $('#tiktokVideos');


  if(list){

    list.innerHTML=
      (data.videos||[])
        .map((video,index)=>`

          <div class="data-row">

            <b>
              #${index+1} •
              ${esc(
                video.title||
                'Vídeo TikTok'
              )}
            </b>

            <span>

              ${
                Number(
                  video.view_count||0
                ).toLocaleString('pt-BR')
              }
              views

              •

              ${
                Number(
                  video.like_count||0
                ).toLocaleString('pt-BR')
              }
              curtidas

            </span>

          </div>

        `)
        .join('')
        ||
        `
          <div class="empty">
            Nenhum vídeo retornado pelo TikTok.
          </div>
        `;
  }


  $('#tiktokReport').textContent=

    `Conta conectada${
      profile.display_name
        ? ` como ${profile.display_name}`
        : ''
    }. Métricas e vídeos acima vêm da API oficial do TikTok. Monetização permanece indisponível enquanto a API autorizada não fornecer esse dado.`;
}


async function loadTikTok(){

  if(
    !state.user ||
    !db
  ){
    return;
  }


  const chip=
    $('#tiktokStatus');


  if(chip){

    chip.textContent=
      'Sincronizando TikTok...';
  }


  try{

    const data=
      await callTikTok(
        'status'
      );


    renderTikTok(
      data
    );


    if(data.sync_error){

      toast(
        'TikTok conectado, mas a sincronização encontrou um erro.'
      );
    }


  }catch(error){

    console.error(error);


    if(chip){

      chip.textContent=
        'Falha ao sincronizar';
    }


    toast(
      'Não foi possível atualizar o TikTok agora.'
    );
  }
}


async function setupTikTok(){

  ensureTikTokUI();


  const query=
    new URLSearchParams(
      location.search
    );


  const result=
    query.get('tiktok');


  if(result){

    history.replaceState(
      {},
      '',
      location.pathname+
      location.hash
    );


    if(result==='connected'){

      toast(
        'TikTok conectado com sucesso.'
      );

    }else{

      const reason=
        query.get('reason');

      toast(
        `TikTok não foi conectado${
          reason
            ? ': '+reason
            : '.'
        }`
      );
    }
  }


  if(state.user){

    await loadTikTok();
  }
}


/* ======================================================
   START
====================================================== */

init()
  .then(
    ()=>setupTikTok()
  )
  .catch(error=>{

    console.error(error);

    toast(
      'Não foi possível iniciar a conexão segura.'
    );
  });
