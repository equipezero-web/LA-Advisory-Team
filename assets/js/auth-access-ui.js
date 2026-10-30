/* L&A Advisory Team — camada de acesso/UX
   Mantém dados internos protegidos: o modo usuário não autentica nem consulta CRM/equipe/financeiro. */
(() => {
  const PUBLIC_MODE_KEY = 'la_team_public_mode';

  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];

  function setPublicMode(enabled) {
    if (enabled) sessionStorage.setItem(PUBLIC_MODE_KEY, '1');
    else sessionStorage.removeItem(PUBLIC_MODE_KEY);
    document.body.classList.toggle('public-user-mode', enabled);
  }

  function publicScreen() {
    setPublicMode(true);
    q('#authGate')?.remove();

    const gate = document.createElement('div');
    gate.id = 'authGate';
    gate.innerHTML = `
      <div class="glass la-public-card">
        <div class="brand">
          <div class="brand-mark">L&A</div>
          <div><strong>L&A Advisory</strong><span>Área do usuário</span></div>
        </div>
        <div class="la-public-copy">
          <p class="eyebrow">ACESSO DE USUÁRIO</p>
          <h2>Bem-vindo à L&A Advisory</h2>
          <p>Este acesso não libera dados internos da equipe, CRM, financeiro, mensagens ou integrações administrativas.</p>
        </div>
        <div class="la-public-actions">
          <button class="primary" id="publicBackLogin" type="button">Entrar como equipe</button>
          <button class="ghost" id="publicRegister" type="button">Solicitar acesso de operador</button>
        </div>
        <small>Ambiente público isolado do Command Center.</small>
      </div>`;

    Object.assign(gate.style, {
      position: 'fixed', inset: '0', zIndex: '999', display: 'grid',
      placeItems: 'center', background: 'rgba(5,7,11,.88)',
      backdropFilter: 'blur(28px)', overflow: 'auto', padding: '20px 0'
    });
    document.body.appendChild(gate);

    q('#publicBackLogin').onclick = () => {
      setPublicMode(false);
      gate.remove();
      window.showLogin?.();
    };
    q('#publicRegister').onclick = () => {
      setPublicMode(false);
      gate.remove();
      window.showRegister?.();
    };
  }

  function addPublicButton() {
    const form = q('#loginForm');
    if (!form || q('#continueAsUser')) return;

    const status = q('#loginStatus');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghost';
    button.id = 'continueAsUser';
    button.textContent = 'Continuar como usuário';
    button.onclick = publicScreen;
    form.insertBefore(button, status);
  }

  function improveAdminRows() {
    if (typeof state === 'undefined' || state.member?.role !== 'admin') return;
    const box = q('#memberAdmin');
    if (!box) return;

    qa('.member-action[data-action="approve"]').forEach((approve) => {
      const wrap = approve.parentElement;
      if (!wrap || wrap.querySelector('[data-action="reject"]')) return;
      const reject = document.createElement('button');
      reject.className = 'ghost member-reject-action';
      reject.dataset.action = 'reject';
      reject.dataset.id = approve.dataset.id;
      reject.textContent = 'Recusar';
      reject.onclick = async () => {
        reject.disabled = true;
        approve.disabled = true;
        try {
          await teamAuth('reject', { user_id: reject.dataset.id });
          await loadMembers();
          toast('Solicitação recusada.');
        } catch (error) {
          console.error(error);
          toast(error.message || 'Não foi possível recusar a solicitação.');
          reject.disabled = false;
          approve.disabled = false;
        }
      };
      wrap.appendChild(reject);
    });
  }

  // Observa telas criadas dinamicamente pelo app.js sem alterar a lógica de autenticação existente.
  const observer = new MutationObserver(() => {
    addPublicButton();
    improveAdminRows();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('DOMContentLoaded', () => {
    addPublicButton();
    if (sessionStorage.getItem(PUBLIC_MODE_KEY) === '1') publicScreen();
  });
})();
