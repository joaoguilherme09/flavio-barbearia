/* =========================================================
   FLAVIO BARBEARIA — front-end puro (sem banco ainda)
   Os dados ficam no localStorage do navegador.
   Quando for plugar um back-end, basta trocar as funções
   do "DB" abaixo por chamadas fetch() para sua API.
========================================================= */

// ---------------- "BANCO" (localStorage) ----------------
const DB = {
  get(chave, padrao) {
    try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; }
    catch { return padrao; }
  },
  set(chave, valor) { localStorage.setItem(chave, JSON.stringify(valor)); }
};

// dados iniciais (só na primeira visita)
function seed() {
  if (!DB.get('servicos', null)) {
    DB.set('servicos', [
      { id: 1, nome: 'Corte de cabelo', preco: 40 },
      { id: 2, nome: 'Barba', preco: 25 },
      { id: 3, nome: 'Sobrancelha', preco: 5 },
      { id: 4, nome: 'Corte + Barba', preco: 60 },
      { id: 5, nome: 'Pigmentação', preco: 30 },
    ]);
  }
  if (!DB.get('usuarios', null)) {
    DB.set('usuarios', [
      { id: 1, nome: 'João Silva', email: 'joao@email.com', tel: '(12) 99111-1111', senha: '1234', assinante: true },
      { id: 2, nome: 'Pedro Santos', email: 'pedro@email.com', tel: '(12) 99222-2222', senha: '1234', assinante: false },
      { id: 3, nome: 'Lucas Oliveira', email: 'lucas@email.com', tel: '(12) 99333-3333', senha: '1234', assinante: false },
    ]);
  }
  if (!DB.get('agendamentos', null)) {
    const hoje = hojeISO();
    DB.set('agendamentos', [
      { id: 1, usuarioId: 1, servicoId: 1, data: hoje, hora: '09:00' },
      { id: 2, usuarioId: 2, servicoId: 4, data: hoje, hora: '10:30' },
      { id: 3, usuarioId: 3, servicoId: 2, data: hoje, hora: '14:00' },
    ]);
  }
}

// ---------------- helpers ----------------
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const HORARIOS = ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function hojeISO() { return new Date().toISOString().slice(0, 10); }
function dinheiro(v) { return 'R$ ' + v.toFixed(2).replace('.', ','); }
function dataBonita(iso) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}
function proximosDias(n = 7) {
  const dias = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}
function usuarios() { return DB.get('usuarios', []); }
function servicos() { return DB.get('servicos', []); }
function agendamentos() { return DB.get('agendamentos', []); }
function usuarioPorId(id) { return usuarios().find(u => u.id === id); }
function servicoPorId(id) { return servicos().find(s => s.id === id); }

// ---------------- estado da sessão ----------------
let sessao = DB.get('sessao', null); // {tipo:'cliente'|'admin', usuarioId}

// estado do agendamento em curso
let sel = { servicoId: null, data: hojeISO(), hora: null };
let dataAdmin = hojeISO();

// ---------------- navegação de telas ----------------
function mostrarTela(id) {
  $$('.tela').forEach(t => t.classList.remove('ativa'));
  $(id).classList.add('ativa');
}

function iniciar() {
  seed();
  if (sessao?.tipo === 'admin') abrirAdmin();
  else if (sessao?.tipo === 'cliente' && usuarioPorId(sessao.usuarioId)) abrirCliente();
  else mostrarTela('#tela-login');
}

// ---------------- LOGIN / CADASTRO ----------------
$$('.tab').forEach(tab => tab.addEventListener('click', () => {
  $$('.tab').forEach(t => t.classList.remove('ativa'));
  tab.classList.add('ativa');
  const cadastro = tab.dataset.tab === 'cadastrar';
  $('#form-login').classList.toggle('escondido', cadastro);
  $('#form-cadastro').classList.toggle('escondido', !cadastro);
}));

$('#form-login').addEventListener('submit', e => {
  e.preventDefault();
  const user = $('#login-user').value.trim().toLowerCase();
  const senha = $('#login-senha').value;

  if (user === 'admin' && senha === 'admin') {
    sessao = { tipo: 'admin' };
    DB.set('sessao', sessao);
    return abrirAdmin();
  }
  const u = usuarios().find(u =>
    (u.email.toLowerCase() === user || u.tel.replace(/\D/g,'') === user.replace(/\D/g,'')) && u.senha === senha
  );
  if (!u) { $('#erro-login').textContent = 'Usuário ou senha incorretos.'; return; }
  $('#erro-login').textContent = '';
  sessao = { tipo: 'cliente', usuarioId: u.id };
  DB.set('sessao', sessao);
  abrirCliente();
});

$('#form-cadastro').addEventListener('submit', e => {
  e.preventDefault();
  const email = $('#cad-email').value.trim().toLowerCase();
  if (usuarios().some(u => u.email.toLowerCase() === email)) {
    $('#erro-cadastro').textContent = 'Esse e-mail já está cadastrado.';
    return;
  }
  const lista = usuarios();
  const novo = {
    id: Date.now(),
    nome: $('#cad-nome').value.trim(),
    email,
    tel: $('#cad-tel').value.trim(),
    senha: $('#cad-senha').value,
    assinante: $('#cad-assinatura').checked,
  };
  lista.push(novo);
  DB.set('usuarios', lista);
  sessao = { tipo: 'cliente', usuarioId: novo.id };
  DB.set('sessao', sessao);
  abrirCliente();
});

function sair() {
  sessao = null;
  DB.set('sessao', null);
  $('#form-login').reset();
  $('#form-cadastro').reset();
  mostrarTela('#tela-login');
}
$('#btn-sair-cliente').addEventListener('click', sair);
$('#btn-sair-admin').addEventListener('click', sair);

// ---------------- ÁREA CLIENTE ----------------
function abrirCliente() {
  mostrarTela('#tela-cliente');
  $('#cliente-agendar').classList.remove('escondido');
  $('#cliente-confirmado').classList.add('escondido');
  const u = usuarioPorId(sessao.usuarioId);
  $('#cliente-nome-topo').textContent = 'Olá, ' + u.nome.split(' ')[0] + (u.assinante ? ' ⭐' : '');
  sel = { servicoId: null, data: hojeISO(), hora: null };
  renderServicosCliente();
  function aoTrocarDia(d) {
    sel.data = d; sel.hora = null;
    renderDias('#dias-cliente', sel.data, aoTrocarDia);
    renderHorasCliente(); atualizarResumo();
  }
  renderDias('#dias-cliente', sel.data, aoTrocarDia);
  renderHorasCliente();
  renderMeusAgendamentos();
  atualizarResumo();
}

function renderServicosCliente() {
  $('#lista-servicos-cliente').innerHTML = servicos().map(s => `
    <button class="card-servico ${sel.servicoId === s.id ? 'selecionado' : ''}" data-id="${s.id}">
      <b>${s.nome}</b><span>${dinheiro(s.preco)}</span>
    </button>`).join('');
  $$('#lista-servicos-cliente .card-servico').forEach(c => c.addEventListener('click', () => {
    sel.servicoId = Number(c.dataset.id);
    renderServicosCliente();
    atualizarResumo();
  }));
}

function renderDias(container, selecionado, aoClicar) {
  $(container).innerHTML = proximosDias().map(iso => {
    const d = new Date(iso + 'T12:00:00');
    return `<button class="card-dia ${iso === selecionado ? 'selecionado' : ''}" data-iso="${iso}">
      <small>${DIAS_SEMANA[d.getDay()]}</small><b>${d.getDate()}</b><small>${MESES[d.getMonth()]}</small>
    </button>`;
  }).join('');
  $$(container + ' .card-dia').forEach(c => c.addEventListener('click', () => aoClicar(c.dataset.iso)));
}

function horaOcupada(data, hora) {
  return agendamentos().some(a => a.data === data && a.hora === hora);
}

function renderHorasCliente() {
  $('#horarios-cliente').innerHTML = HORARIOS.map(h => {
    const ocupado = horaOcupada(sel.data, h);
    return `<button class="card-hora ${ocupado ? 'ocupado' : ''} ${sel.hora === h ? 'selecionado' : ''}" data-h="${h}" ${ocupado ? 'disabled' : ''}>${h}</button>`;
  }).join('');
  $$('#horarios-cliente .card-hora:not(.ocupado)').forEach(c => c.addEventListener('click', () => {
    sel.hora = c.dataset.h;
    renderHorasCliente();
    atualizarResumo();
  }));
}

function atualizarResumo() {
  const pronto = sel.servicoId && sel.hora;
  $('#resumo-agendamento').classList.toggle('escondido', !pronto);
  if (!pronto) return;
  const s = servicoPorId(sel.servicoId);
  const u = usuarioPorId(sessao.usuarioId);
  $('#resumo-servico').textContent = s.nome;
  $('#resumo-data-hora').textContent = dataBonita(sel.data) + ' às ' + sel.hora;
  $('#resumo-preco').textContent = u.assinante ? 'Assinante' : dinheiro(s.preco);
}

$('#btn-confirmar-agendamento').addEventListener('click', () => {
  const lista = agendamentos();
  if (horaOcupada(sel.data, sel.hora)) { renderHorasCliente(); return; }
  lista.push({ id: Date.now(), usuarioId: sessao.usuarioId, servicoId: sel.servicoId, data: sel.data, hora: sel.hora });
  DB.set('agendamentos', lista);

  const s = servicoPorId(sel.servicoId);
  const u = usuarioPorId(sessao.usuarioId);
  $('#conf-servico').textContent = s.nome;
  $('#conf-data').textContent = dataBonita(sel.data);
  $('#conf-hora').textContent = sel.hora;
  $('#conf-valor').textContent = u.assinante ? 'Incluso na assinatura' : dinheiro(s.preco);
  $('#cliente-agendar').classList.add('escondido');
  $('#cliente-confirmado').classList.remove('escondido');
  $('#resumo-agendamento').classList.add('escondido');
});

$('#btn-novo-agendamento').addEventListener('click', abrirCliente);

function renderMeusAgendamentos() {
  const meus = agendamentos()
    .filter(a => a.usuarioId === sessao.usuarioId && a.data >= hojeISO())
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  const u = usuarioPorId(sessao.usuarioId);
  $('#meus-agendamentos').innerHTML = meus.length ? meus.map(a => {
    const s = servicoPorId(a.servicoId);
    return `<div class="item-agend">
      <div class="info"><b>${s?.nome ?? 'Serviço'}</b><span>${dataBonita(a.data)} às ${a.hora}</span></div>
      <div class="preco">${u.assinante ? 'Assinante' : dinheiro(s?.preco ?? 0)}</div>
      <button class="btn-cancelar" data-id="${a.id}">Cancelar</button>
    </div>`;
  }).join('') : '<p class="vazio">Você ainda não tem horários marcados.</p>';
  $$('#meus-agendamentos .btn-cancelar').forEach(b => b.addEventListener('click', () => {
    DB.set('agendamentos', agendamentos().filter(a => a.id !== Number(b.dataset.id)));
    renderMeusAgendamentos();
    renderHorasCliente();
  }));
}

// ---------------- ÁREA ADMIN ----------------
function abrirAdmin() {
  mostrarTela('#tela-admin');
  irParaPagina('dashboard');
}

$$('.menu-item').forEach(m => m.addEventListener('click', () => irParaPagina(m.dataset.pagina)));

function irParaPagina(pag) {
  $$('.menu-item').forEach(m => m.classList.toggle('ativa', m.dataset.pagina === pag));
  $$('.pagina-admin').forEach(p => p.classList.add('escondido'));
  $('#pag-' + pag).classList.remove('escondido');
  if (pag === 'dashboard') renderDashboard();
  if (pag === 'agenda') renderAgenda();
  if (pag === 'servicos') renderServicosAdmin();
  if (pag === 'usuarios') renderUsuarios();
  if (pag === 'estatisticas') renderEstatisticas();
}

function valorAgendamento(a) {
  const u = usuarioPorId(a.usuarioId);
  if (u?.assinante) return 0; // assinante não paga por corte
  return servicoPorId(a.servicoId)?.preco ?? 0;
}

// ---- dashboard
function renderDashboard() {
  const hoje = hojeISO();
  const doDia = agendamentos().filter(a => a.data === hoje);
  const mes = hoje.slice(0, 7);
  const doMes = agendamentos().filter(a => a.data.startsWith(mes));

  const d = new Date();
  $('#dash-data').textContent = `${d.getDate()} de ${MESES[d.getMonth()]}`;
  $('#dash-cortes').textContent = doDia.length;
  $('#dash-livres').textContent = HORARIOS.length - doDia.length;
  $('#dash-dia').textContent = dinheiro(doDia.reduce((t, a) => t + valorAgendamento(a), 0));
  $('#dash-mes').textContent = dinheiro(doMes.reduce((t, a) => t + valorAgendamento(a), 0));

  const proximos = doDia.sort((a, b) => a.hora.localeCompare(b.hora));
  $('#dash-proximos').innerHTML = proximos.length ? proximos.map(a => {
    const u = usuarioPorId(a.usuarioId), s = servicoPorId(a.servicoId);
    return `<div class="item-agend">
      <div class="info"><b>${a.hora} — ${u?.nome ?? '?'}</b><span>${s?.nome ?? '?'}</span></div>
      <div class="preco">${u?.assinante ? '<span class="selo assinante">Assinante</span>' : dinheiro(s?.preco ?? 0)}</div>
    </div>`;
  }).join('') : '<p class="vazio">Nenhum corte marcado para hoje.</p>';
}

// ---- agenda
function renderAgenda() {
  renderDias('#dias-admin', dataAdmin, d => { dataAdmin = d; renderAgenda(); });
  $('#detalhe-horario').classList.add('escondido');
  $('#grade-agenda').innerHTML = HORARIOS.map(h => {
    const ag = agendamentos().find(a => a.data === dataAdmin && a.hora === h);
    return `<button class="card-hora ${ag ? 'marcado' : ''}" data-h="${h}">${h}</button>`;
  }).join('') + `<div class="legenda" style="grid-column:1/-1">
    <span>🟧 laranja = marcado (clique para ver)</span><span>⬛ apagado = livre</span>
  </div>`;
  $$('#grade-agenda .card-hora').forEach(c => c.addEventListener('click', () => mostrarDetalhe(c.dataset.h)));
}

function mostrarDetalhe(hora) {
  const ag = agendamentos().find(a => a.data === dataAdmin && a.hora === hora);
  const box = $('#detalhe-horario');
  box.classList.remove('escondido');
  if (!ag) {
    box.innerHTML = `<h4>${hora} — livre</h4><p><span>Este horário ainda está disponível.</span></p>`;
    return;
  }
  const u = usuarioPorId(ag.usuarioId), s = servicoPorId(ag.servicoId);
  const assin = u?.assinante;
  box.innerHTML = `
    <h4>${hora} — ${dataBonita(dataAdmin)}</h4>
    <p><span>Cliente</span><b>${u?.nome ?? '?'} ${assin ? '<span class="selo assinante">Assinante</span>' : '<span class="selo avulso">Avulso</span>'}</b></p>
    <p><span>Telefone</span><b>${u?.tel ?? '-'}</b></p>
    <p><span>Serviço</span><b>${s?.nome ?? '?'}</b></p>
    <p><span>Horário marcado</span><b>${ag.hora}</b></p>
    <p><span>Total a pagar</span><b>${assin ? 'Incluso na assinatura' : dinheiro(s?.preco ?? 0)}</b></p>
    <br><button class="btn-mini perigo" id="btn-remover-agend">Cancelar agendamento</button>`;
  $('#btn-remover-agend').addEventListener('click', () => {
    DB.set('agendamentos', agendamentos().filter(a => a.id !== ag.id));
    renderAgenda();
  });
}

// ---- serviços
$('#form-servico').addEventListener('submit', e => {
  e.preventDefault();
  const lista = servicos();
  lista.push({ id: Date.now(), nome: $('#serv-nome').value.trim(), preco: Number($('#serv-preco').value) });
  DB.set('servicos', lista);
  e.target.reset();
  renderServicosAdmin();
});

function renderServicosAdmin() {
  $('#lista-servicos-admin').innerHTML = servicos().map(s => `
    <div class="item-servico" data-id="${s.id}">
      <b>${s.nome}</b>
      <input type="number" value="${s.preco}" min="0" step="0.01" aria-label="Preço de ${s.nome}">
      <button class="btn-mini salvar">Salvar</button>
      <button class="btn-mini perigo excluir">Excluir</button>
    </div>`).join('') || '<p class="vazio">Nenhum serviço cadastrado.</p>';

  $$('#lista-servicos-admin .item-servico').forEach(item => {
    const id = Number(item.dataset.id);
    item.querySelector('.salvar').addEventListener('click', () => {
      const lista = servicos();
      const s = lista.find(x => x.id === id);
      s.preco = Number(item.querySelector('input').value);
      DB.set('servicos', lista);
      renderServicosAdmin();
    });
    item.querySelector('.excluir').addEventListener('click', () => {
      DB.set('servicos', servicos().filter(x => x.id !== id));
      renderServicosAdmin();
    });
  });
}

// ---- usuários
$('#busca-usuario').addEventListener('input', renderUsuarios);
function renderUsuarios() {
  const termo = $('#busca-usuario').value.trim().toLowerCase();
  const lista = usuarios().filter(u =>
    !termo || u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo) || u.tel.includes(termo)
  );
  $('#lista-usuarios').innerHTML = lista.length ? lista.map(u => {
    const qtd = agendamentos().filter(a => a.usuarioId === u.id).length;
    return `<div class="item-usuario">
      <div class="dados">
        <b>${u.nome} ${u.assinante ? '<span class="selo assinante">Assinante</span>' : ''}</b>
        <span>${u.email}</span><span>${u.tel}</span>
      </div>
      <div class="meta"><b>${qtd}</b>agendamentos</div>
    </div>`;
  }).join('') : '<p class="vazio">Nenhum cliente encontrado.</p>';
}

// ---- estatísticas
function renderEstatisticas() {
  const ags = agendamentos();
  const usrs = usuarios();
  const faturamento = ags.reduce((t, a) => t + valorAgendamento(a), 0);
  const pagantes = ags.filter(a => valorAgendamento(a) > 0);

  $('#est-total-agend').textContent = ags.length;
  $('#est-total-clientes').textContent = usrs.length;
  $('#est-assinantes').textContent = usrs.filter(u => u.assinante).length;
  $('#est-faturamento').textContent = dinheiro(faturamento);
  $('#est-ticket').textContent = dinheiro(pagantes.length ? faturamento / pagantes.length : 0);

  const dias7 = proximosDias(7);
  const ocupados = ags.filter(a => dias7.includes(a.data)).length;
  $('#est-ocupacao').textContent = Math.round(100 * ocupados / (HORARIOS.length * 7)) + '%';

  // serviço mais pedido
  const porServico = {};
  ags.forEach(a => { const n = servicoPorId(a.servicoId)?.nome ?? '?'; porServico[n] = (porServico[n] || 0) + 1; });
  renderBarras('#est-servicos', porServico);

  // horários mais procurados
  const porHora = {};
  ags.forEach(a => { porHora[a.hora] = (porHora[a.hora] || 0) + 1; });
  renderBarras('#est-horarios', porHora);

  // top clientes
  const porCliente = {};
  ags.forEach(a => { porCliente[a.usuarioId] = (porCliente[a.usuarioId] || 0) + 1; });
  const top = Object.entries(porCliente).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $('#est-clientes').innerHTML = top.length ? top.map(([id, qtd]) => {
    const u = usuarioPorId(Number(id));
    return `<div class="item-agend">
      <div class="info"><b>${u?.nome ?? '?'}</b><span>${u?.assinante ? 'Assinante' : 'Avulso'}</span></div>
      <div class="preco">${qtd} visita${qtd > 1 ? 's' : ''}</div>
    </div>`;
  }).join('') : '<p class="vazio">Sem dados ainda.</p>';
}

function renderBarras(container, mapa) {
  const entradas = Object.entries(mapa).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = entradas[0]?.[1] || 1;
  $(container).innerHTML = entradas.length ? entradas.map(([rotulo, qtd]) => `
    <div class="barra-linha">
      <span class="rotulo">${rotulo}</span>
      <div class="barra-track"><div class="barra-fill" style="width:${Math.round(100 * qtd / max)}%">${qtd}</div></div>
    </div>`).join('') : '<p class="vazio">Sem dados ainda.</p>';
}

// ---------------- start ----------------
iniciar();
