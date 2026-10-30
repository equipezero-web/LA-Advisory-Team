/* L&A Advisory Team — camada de acesso/UX
   Mantém dados internos protegidos: o modo usuário não autentica nem consulta CRM/equipe/financeiro. */
(() => {
  const PUBLIC_MODE_KEY = 'la_team_public_mode';
  const q = (s) => document.querySelector(s);

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
      <div class="glass la-public-card" style="width:min(520px,calc(100% - 28px));padding:28px;border-radius:28px">
        <div class="brand">
          <div class="brand-mark">L&A</div>
          <div><strong>L&A Advisory</strong><span>Área do usuário</span></div>
        </div>
        <div class="la-public-copy" style="margin:26px 0 22px">
          <p class="eyebrow">ACESSO DE USUÁRIO</p>
          <h2>Bem-vindo à L&A Advisory</h2>
          <p>Este acesso não libera dados internos da equipe, CRM, financeiro, mensagens ou integrações administrativas.</p>
        </div>
        <div class="la-public-actions" style="display:grid;gap:10px">
          <button class="primary" id="publicBackLogin" type="button">Entrar como equipe</button>
          <button class="ghost" id="publicRegister" type="button">Solicitar acesso de operador</button>
        </div>
        <small style="display:block;margin-top:16px">Ambiente público isolado do Command Center.</small>
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

  function enhanceMemberAdmin() {
    const box = q('#memberAdmin');
    if (!box || typeof state === 'undefined' || state.member?.role !== 'admin') return;

    box.querySelectorAll('.member-action[data-action="approve"]').forEach((approveButton) => {
      const userId = approveButton.dataset.id;
      const member = state.members?.find((item) => item.user_id === userId);
      const actions = approveButton.parentElement;
      const row = approveButton.closest('.data-row');
      const status = row?.querySelector('span');
      if (!member || !actions) return;

      if (member.rejected_at) {
        approveButton.remove();
        if (status) status.textContent = `${member.username || ''} • Operador • Recusado`;
        if (!actions.querySelector('.member-rejected-label')) {
          const label = document.createElement('span');
          label.className = 'member-rejected-label';
          label.textContent = 'Solicitação recusada';
          label.style.opacity = '.72';
          actions.appendChild(label);
        }
        return;
      }

      if (actions.querySelector('.member-reject-action')) return;
      const rejectButton = document.createElement('button');
      rejectButton.type = 'button';
      rejectButton.className = 'ghost member-reject-action';
      rejectButton.textContent = 'Recusar';
      rejectButton.dataset.id = userId;
      rejectButton.onclick = async () => {
        rejectButton.disabled = true;
        approveButton.disabled = true;
        try {
          const { data, error } = await db.rpc('la_team_reject_member', { p_user_id: userId });
          if (error) throw error;
          if (data?.ok === false) throw new Error(data.error || 'Não foi possível recusar a solicitação.');
          await loadMembers();
          toast('Solicitação recusada com sucesso.');
        } catch (error) {
          console.error(error);
          toast(error.message || 'Não foi possível recusar a solicitação.');
          rejectButton.disabled = false;
          approveButton.disabled = false;
        }
      };
      actions.appendChild(rejectButton);
    });
  }

  const observer = new MutationObserver(() => {
    addPublicButton();
    enhanceMemberAdmin();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('DOMContentLoaded', () => {
    addPublicButton();
    enhanceMemberAdmin();
    if (sessionStorage.getItem(PUBLIC_MODE_KEY) === '1') publicScreen();
  });
})();
