import './style.css';
import { cloudConfigured, supabase } from './supabase.js';

const categories = [
  { id: 'all', label: 'Todos os itens', icon: '▦', tint: 'bg-stone-100 text-stone-600' },
  { id: 'Café da manhã', label: 'Café da manhã', icon: '☕', tint: 'bg-amber-100 text-amber-700' },
  { id: 'Almoço', label: 'Almoço', icon: '🍲', tint: 'bg-orange-100 text-orange-700' },
  { id: 'Material de limpeza', label: 'Material de limpeza', icon: '🧽', tint: 'bg-sky-100 text-sky-700' },
  { id: 'Hortifruti', label: 'Hortifruti', icon: '🥑', tint: 'bg-lime-100 text-lime-700' },
  { id: 'Outros', label: 'Outros', icon: '✳', tint: 'bg-violet-100 text-violet-700' },
];
const seed = [
  { id: crypto.randomUUID(), name: 'Café especial', category: 'Café da manhã', quantity: 1, unit: 'pacote', price: 18.9, place: 'Mercado', done: false },
  { id: crypto.randomUUID(), name: 'Leite integral', category: 'Café da manhã', quantity: 2, unit: 'un.', price: 5.49, place: 'Mercado', done: false },
  { id: crypto.randomUUID(), name: 'Pão de forma', category: 'Café da manhã', quantity: 1, unit: 'un.', price: 8.5, place: 'Padaria', done: true },
  { id: crypto.randomUUID(), name: 'Arroz tipo 1', category: 'Almoço', quantity: 2, unit: 'kg', price: 7.99, place: 'Mercado', done: false },
  { id: crypto.randomUUID(), name: 'Detergente neutro', category: 'Material de limpeza', quantity: 3, unit: 'un.', price: 2.79, place: 'Mercado', done: false },
  { id: crypto.randomUUID(), name: 'Tomate italiano', category: 'Hortifruti', quantity: 1, unit: 'kg', price: 8.9, place: 'Feira', done: false },
];
const stored = localStorage.getItem('grana-shopping-items');
let items = stored ? JSON.parse(stored) : seed;
let cloudUser = null;
let cloudChannel = null;
let cloudSaveTimer = null;
let connectingUserId = null;
let applyingCloudData = false;
let syncState = cloudConfigured ? 'disconnected' : 'not-configured';
let authMode = 'login';
let selectedCategory = 'all';
let searchQuery = '';
let modalItemId = null;
let toastTimer;
let isDark = document.documentElement.classList.contains('dark');
const app = document.querySelector('#app');
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = (name, size = 18) => {
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>', edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>', trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', basket: '<path d="m5 10 2 10h10l2-10M3 10h18M9 10l3-7 3 7"/>', cloud: '<path d="M20 16.2A4.8 4.8 0 0 0 18 7h-1.3A7 7 0 1 0 4 16.2"/><path d="M12 12v9m-4-4 4 4 4-4"/>', close: '<path d="m18 6-12 12M6 6l12 12"/>', pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>', chevron: '<path d="m9 18 6-6-6-6"/>', check: '<path d="m5 12 4 4L19 6"/>', spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/>', moon: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};
function saveLocal() { localStorage.setItem('grana-shopping-items', JSON.stringify(items)); }
function save() {
  saveLocal();
  if (cloudUser && !applyingCloudData) queueCloudSave();
}
function queueCloudSave() {
  clearTimeout(cloudSaveTimer);
  syncState = 'saving';
  cloudSaveTimer = setTimeout(async () => {
    if (!cloudUser) return;
    const snapshot = structuredClone(items);
    const { error } = await supabase.from('shopping_lists').upsert({
      user_id: cloudUser.id,
      items: snapshot,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) {
      syncState = 'error';
      render();
      showToast('Salva neste aparelho; não foi possível sincronizar agora.');
      return;
    }
    syncState = 'synced';
    render();
  }, 350);
}
function applyCloudItems(nextItems) {
  applyingCloudData = true;
  items = Array.isArray(nextItems) ? nextItems : [];
  saveLocal();
  applyingCloudData = false;
  syncState = 'synced';
  render();
}
function subscribeToCloud() {
  if (cloudChannel) supabase.removeChannel(cloudChannel);
  cloudChannel = supabase.channel(`shopping-list-${cloudUser.id}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'shopping_lists',
      filter: `user_id=eq.${cloudUser.id}`,
    }, payload => {
      const incoming = payload.new?.items;
      if (Array.isArray(incoming) && JSON.stringify(incoming) !== JSON.stringify(items)) {
        applyCloudItems(incoming);
        showToast('Lista atualizada pelo outro aparelho.');
      }
    })
    .subscribe();
}
async function writeCloudItems(nextItems) {
  const { error } = await supabase.from('shopping_lists').upsert({
    user_id: cloudUser.id,
    items: nextItems,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
  syncState = 'synced';
  subscribeToCloud();
  render();
}
function mergeLists(cloudItems, localItems) {
  const merged = [...cloudItems];
  const signatures = new Set(cloudItems.map(item => `${item.name.trim().toLocaleLowerCase('pt-BR')}|${item.category}|${item.unit}`));
  localItems.forEach(item => {
    const signature = `${item.name.trim().toLocaleLowerCase('pt-BR')}|${item.category}|${item.unit}`;
    if (!signatures.has(signature)) {
      merged.push(item);
      signatures.add(signature);
    }
  });
  return merged;
}
async function connectCloudUser(user) {
  if (!user || cloudUser?.id === user.id && (cloudChannel || connectingUserId === user.id)) return;
  cloudUser = user;
  connectingUserId = user.id;
  syncState = 'loading';
  render();
  const { data: remote, error } = await supabase.from('shopping_lists')
    .select('items').eq('user_id', user.id).maybeSingle();
  if (error) {
    connectingUserId = null;
    syncState = 'error';
    render();
    showToast('Não consegui abrir a lista na nuvem.');
    return;
  }
  if (!remote) {
    connectingUserId = null;
    try {
      await writeCloudItems(items);
      showToast('Esta lista agora está sincronizada.');
    } catch {
      syncState = 'error';
      render();
      showToast('Não consegui salvar a lista na nuvem.');
    }
    return;
  }
  const currentLocal = localStorage.getItem('grana-shopping-items');
  const localItems = currentLocal ? JSON.parse(currentLocal) : null;
  if (localItems && JSON.stringify(localItems) !== JSON.stringify(remote.items)) {
    connectingUserId = null;
    showSyncConflict(remote.items, localItems);
    return;
  }
  connectingUserId = null;
  applyCloudItems(remote.items);
  subscribeToCloud();
  showToast('Lista sincronizada.');
}
function initializeCloudAuth() {
  if (!cloudConfigured) return;
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) connectCloudUser(data.session.user);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      setTimeout(() => connectCloudUser(session.user), 0);
    } else if (cloudUser) {
      if (cloudChannel) supabase.removeChannel(cloudChannel);
      cloudUser = null;
      cloudChannel = null;
      syncState = 'disconnected';
      render();
    }
  });
}
function getTotals() {
  const pending = items.filter(item => !item.done);
  return { total: items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0), pendingValue: pending.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0), done: items.length - pending.length, count: items.length };
}
function visibleItems() {
  return items.filter(item => (selectedCategory === 'all' || item.category === selectedCategory) && item.name.toLowerCase().includes(searchQuery.toLowerCase()));
}
function render() {
  const totals = getTotals();
  const visible = visibleItems();
  const categoryCount = category => category === 'all' ? items.length : items.filter(item => item.category === category).length;
  const syncLabel = !cloudConfigured ? 'Configurar nuvem' : cloudUser ? (syncState === 'saving' ? 'Salvando...' : syncState === 'error' ? 'Falha ao sincronizar' : 'Conta conectada') : 'Sincronizar';
  const syncDescription = cloudUser
    ? syncState === 'error' ? 'Sem conexão com a nuvem; suas alterações continuam salvas neste aparelho.' : 'Sua lista está vinculada à sua conta e sincroniza com outros aparelhos.'
    : 'Sua lista fica salva neste aparelho até conectar uma conta.';
  app.innerHTML = `
    <div class="app-shell bg-paper text-ink transition-colors duration-200">
      <header class="topbar dark:bg-[#111813]/90 dark:border-[#29352d]">
        <div class="topbar-inner mx-auto flex max-w-[1240px] items-center justify-between px-7 py-3.5">
          <a href="#" class="flex items-center gap-3 text-ink no-underline" aria-label="Grana, início">
            <span class="grid h-10 w-10 place-items-center rounded-[14px] bg-leaf text-white shadow-sm">${icon('basket', 21)}</span>
            <span><span class="block text-[17px] font-extrabold tracking-[-.04em]">grana<span class="text-leaf">.</span></span><span class="block -mt-0.5 text-[10px] font-semibold uppercase tracking-[.14em] text-stone-400">lista inteligente</span></span>
          </a>
          <div class="flex items-center gap-2.5 sm:gap-4">
            <button id="theme-toggle" type="button" class="grid h-10 w-10 place-items-center rounded-xl border border-[#e4e9e2] bg-white text-stone-600 transition hover:bg-stone-100 dark:border-[#354138] dark:bg-[#1b241e] dark:text-[#dce6de] dark:hover:bg-[#263229]" aria-label="${isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}" title="${isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}">${icon(isDark ? 'sun' : 'moon', 18)}</button>
            <div class="hidden text-right sm:block"><span class="block text-[10px] font-bold uppercase tracking-[.12em] text-stone-400">Total estimado</span><span class="text-[18px] font-extrabold tracking-[-.04em] text-ink">${money(totals.total)}</span></div>
            <div class="flex items-center gap-2 rounded-full bg-leaf px-3.5 py-2 text-white shadow-sm sm:px-4"><span class="text-citrus">${icon('basket', 17)}</span><span class="text-[11px] font-bold uppercase tracking-[.1em] max-[440px]:hidden sm:hidden">Total</span><strong class="text-[15px] font-extrabold tracking-[-.03em]">${money(totals.total)}</strong></div>
          </div>
        </div>
      </header>
      <main class="layout">
        <aside class="sidebar">
          <div class="mb-7 hidden md:block"><p class="mb-1 text-[11px] font-bold uppercase tracking-[.15em] text-stone-400">Seu espaço</p><h1 class="text-[21px] font-extrabold tracking-[-.05em]">Minha lista</h1></div>
          <p class="mb-3 hidden text-[10px] font-bold uppercase tracking-[.14em] text-stone-400 md:block">Categorias</p>
          <nav class="category-scroll flex flex-col gap-1.5" aria-label="Filtrar por categoria">
            ${categories.map(cat => `<button data-category="${escapeHtml(cat.id)}" class="category-button flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold ${selectedCategory === cat.id ? 'bg-leaf text-white shadow-sm' : 'text-stone-600 hover:bg-white dark:text-stone-200 dark:hover:bg-[#202a23]'}"><span class="grid h-7 w-7 place-items-center rounded-lg ${selectedCategory === cat.id ? 'bg-white/15' : cat.tint}">${cat.icon}</span><span>${cat.label}</span><span class="ml-auto text-[11px] ${selectedCategory === cat.id ? 'text-white/65' : 'text-stone-400'}">${categoryCount(cat.id)}</span></button>`).join('')}
          </nav>
          <div class="mt-7 hidden overflow-hidden rounded-2xl bg-[#eaf2e9] p-4 md:block dark:bg-[#203126]">
            <div class="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-white text-leaf dark:bg-[#2a3b30] dark:text-[#a8d1b2]">${icon('spark', 18)}</div>
            <p class="text-[13px] font-bold text-[#214a31] dark:text-[#d5e8d8]">De olho no orçamento</p>
            <p class="mt-1 text-[11px] leading-relaxed text-[#66806d] dark:text-[#a9bdaa]">Marque o que já colocou no carrinho e acompanhe o que falta.</p>
            <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white"><div class="h-full rounded-full bg-leaf transition-all dark:bg-[#4d9a65]" style="width:${totals.count ? (totals.done / totals.count) * 100 : 0}%"></div></div>
            <p class="mt-2 text-[10px] font-semibold text-[#66806d] dark:text-[#a9bdaa]">${totals.done} de ${totals.count} itens concluídos</p>
          </div>
        </aside>
        <section class="min-w-0">
          <div class="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p class="mb-1 text-[11px] font-bold uppercase tracking-[.14em] text-leaf">Organize sem complicação</p><h2 class="text-[28px] font-extrabold tracking-[-.055em] sm:text-[34px]">Sua próxima compra<span class="text-leaf">.</span></h2><p class="mt-1 text-[13px] text-stone-500">Tudo o que você precisa, em um só lugar.</p></div>
            <div class="flex w-full gap-2 sm:w-auto">
              <button id="account-action" type="button" class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#dce5dc] bg-white px-3 py-3 text-[12px] font-bold text-leaf transition hover:bg-[#f0f5f0] sm:flex-none dark:border-[#354138] dark:bg-[#1b241e] dark:text-[#dce6de] dark:hover:bg-[#263229]">${icon('cloud', 16)} <span>${syncLabel}</span></button>
              <button id="add-item" class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-citrus px-4 py-3 text-[13px] font-extrabold text-[#42350f] shadow-[0_5px_14px_rgba(182,144,35,.16)] transition hover:-translate-y-0.5 hover:bg-[#f7d568] active:translate-y-0 sm:flex-none">${icon('plus', 17)} Adicionar item</button>
            </div>
          </div>
          <div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-[#e9ece6] bg-white p-4 dark:border-[#2c3830] dark:bg-[#1b241e]"><p class="text-[10px] font-bold uppercase tracking-[.12em] text-stone-400">Itens na lista</p><div class="mt-2 flex items-end justify-between"><strong class="text-[25px] font-extrabold tracking-[-.06em]">${totals.count}</strong><span class="mb-1 rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-500 dark:bg-[#2a352d] dark:text-stone-200">${totals.done} feitos</span></div></div>
            <div class="rounded-2xl border border-[#e9ece6] bg-white p-4 dark:border-[#2c3830] dark:bg-[#1b241e]"><p class="text-[10px] font-bold uppercase tracking-[.12em] text-stone-400">Ainda falta</p><div class="mt-2 flex items-end justify-between"><strong class="text-[25px] font-extrabold tracking-[-.06em]">${items.filter(item => !item.done).length}</strong><span class="mb-1 text-[11px] font-semibold text-stone-400">para comprar</span></div></div>
            <div class="col-span-2 rounded-2xl border border-[#e9ece6] bg-white p-4 sm:col-span-1 dark:border-[#2c3830] dark:bg-[#1b241e]"><p class="text-[10px] font-bold uppercase tracking-[.12em] text-stone-400">Valor pendente</p><div class="mt-2"><strong class="text-[25px] font-extrabold tracking-[-.06em]">${money(totals.pendingValue)}</strong></div></div>
          </div>
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 class="text-[16px] font-extrabold tracking-[-.03em]">${selectedCategory === 'all' ? 'Lista de compras' : escapeHtml(selectedCategory)}</h3><p class="mt-0.5 text-[11px] text-stone-400">${visible.length} ${visible.length === 1 ? 'produto' : 'produtos'}</p></div>
            <label class="relative block w-full sm:w-[230px]"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">${icon('search', 16)}</span><input id="search" value="${escapeHtml(searchQuery)}" class="input-field !rounded-xl !py-2.5 !pl-9 !text-[12px]" placeholder="Buscar produto..." aria-label="Buscar produto" /></label>
          </div>
          <div class="overflow-hidden rounded-2xl border border-[#e8ece5] bg-white shadow-[0_5px_24px_rgba(28,48,33,.035)] dark:border-[#2c3830] dark:bg-[#1b241e]">
            ${visible.length ? `<div class="divide-y divide-[#f0f2ee]">${visible.map(item => `<article class="item-row ${item.done ? 'item-done' : ''} flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5"><input class="check-control" type="checkbox" data-toggle="${item.id}" ${item.done ? 'checked' : ''} aria-label="Marcar ${escapeHtml(item.name)} como comprado" /><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><h4 class="item-name min-w-0 flex-1 truncate text-[13px] font-bold text-ink" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</h4><span class="hidden rounded-md px-1.5 py-0.5 text-[9px] font-bold sm:inline ${categories.find(c => c.id === item.category)?.tint || 'bg-stone-100 text-stone-600'}">${escapeHtml(item.category)}</span></div><div class="mt-1 flex items-center gap-2 text-[10px] text-stone-400"><span>${Number(item.quantity)} ${escapeHtml(item.unit)}</span><span>·</span><span class="item-detail inline-flex items-center gap-1">${icon('pin', 11)} ${escapeHtml(item.place || 'Sem local')}</span></div></div><div class="flex shrink-0 items-center gap-0.5"><button class="grid h-9 w-9 place-items-center rounded-lg text-stone-400 transition hover:bg-[#edf4ee] hover:text-leaf dark:hover:bg-[#29382e] dark:hover:text-[#b9dfc2]" data-edit="${item.id}" title="Editar ${escapeHtml(item.name)}" aria-label="Editar ${escapeHtml(item.name)}">${icon('edit', 16)}</button><button class="grid h-9 w-9 place-items-center rounded-lg text-stone-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300" data-delete="${item.id}" title="Excluir ${escapeHtml(item.name)}" aria-label="Excluir ${escapeHtml(item.name)}">${icon('trash', 16)}</button></div></article>`).join('')}</div>` : `<div class="px-5 py-14 text-center"><span class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#edf4ee] text-leaf dark:bg-[#263a2e] dark:text-[#a8d1b2]">${icon('basket', 21)}</span><p class="text-[14px] font-bold">${searchQuery ? 'Nenhum item encontrado' : 'Sua lista está vazia por aqui'}</p><p class="mt-1 text-[12px] text-stone-400">${searchQuery ? 'Tente buscar por outro nome.' : 'Adicione um produto para começar.'}</p></div>`}
            <div class="flex items-center justify-between border-t border-[#f0f2ee] bg-[#fcfdfb] px-4 py-3.5 sm:px-5 dark:border-[#303b33] dark:bg-[#161e18]"><span class="text-[11px] font-semibold text-stone-400">Total estimado da lista</span><strong class="text-[16px] font-extrabold tracking-[-.03em]">${money(totals.total)}</strong></div>
          </div>
          <p class="mt-4 text-center text-[10px] text-stone-400">${escapeHtml(syncDescription)}</p>
        </section>
      </main>
      <div id="modal-root"></div><div id="toast-root"></div>
    </div>`;
  bindEvents();
}
function showAccountModal() {
  const root = document.querySelector('#modal-root');
  if (!cloudConfigured) {
    root.innerHTML = `<div class="modal-backdrop" data-account-backdrop><section class="modal-card rounded-[22px] bg-white p-5 shadow-2xl sm:p-6 dark:bg-[#1b241e]" role="dialog" aria-modal="true" aria-labelledby="account-title"><div class="mb-4 flex items-start justify-between"><div><span class="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf2e9] text-leaf dark:bg-[#263a2e] dark:text-[#a8d1b2]">${icon('cloud', 18)}</span><h2 id="account-title" class="text-[20px] font-extrabold">Sincronização na nuvem</h2></div><button data-account-close class="grid h-9 w-9 place-items-center rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-[#2a352d]" aria-label="Fechar">${icon('close', 18)}</button></div><p class="text-[13px] leading-relaxed text-stone-500">Para ativar, crie um projeto Supabase, execute o SQL e configure a URL e a chave pública nas variáveis do GitHub Actions. Até concluir essa configuração, a lista continua salva neste aparelho.</p><a class="mt-5 inline-flex rounded-xl bg-leaf px-4 py-3 text-[12px] font-bold text-white no-underline" href="https://github.com/leandroSJ/Papel-de-poposao/blob/main/SETUP-SYNC.md" target="_blank" rel="noreferrer">Ver instruções</a></section></div>`;
    bindAccountModalClose(root);
    return;
  }
  if (cloudUser) {
    root.innerHTML = `<div class="modal-backdrop" data-account-backdrop><section class="modal-card rounded-[22px] bg-white p-5 shadow-2xl sm:p-6 dark:bg-[#1b241e]" role="dialog" aria-modal="true" aria-labelledby="account-title"><div class="mb-4 flex items-start justify-between"><div><span class="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf2e9] text-leaf dark:bg-[#263a2e] dark:text-[#a8d1b2]">${icon('cloud', 18)}</span><h2 id="account-title" class="text-[20px] font-extrabold">Conta conectada</h2></div><button data-account-close class="grid h-9 w-9 place-items-center rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-[#2a352d]" aria-label="Fechar">${icon('close', 18)}</button></div><p class="text-[13px] text-stone-500">${escapeHtml(cloudUser.email || '')}</p><p class="mt-1 text-[11px] text-stone-400">${syncState === 'error' ? 'A nuvem não respondeu. A lista continua salva neste aparelho.' : 'Use esta conta no computador e no celular para acessar a mesma lista.'}</p><div class="mt-5 flex gap-2"><button id="sync-retry" class="flex-1 rounded-xl bg-leaf px-3 py-3 text-[11px] font-bold text-white">Sincronizar agora</button><button id="sign-out" class="flex-1 rounded-xl border border-[#dce5dc] px-3 py-3 text-[11px] font-bold text-ink dark:border-[#38453c]">Sair neste aparelho</button></div></section></div>`;
    bindAccountModalClose(root);
    root.querySelector('#sync-retry').addEventListener('click', () => {
      root.innerHTML = '';
      if (cloudChannel) supabase.removeChannel(cloudChannel);
      cloudChannel = null;
      connectingUserId = null;
      connectCloudUser(cloudUser);
    });
    root.querySelector('#sign-out').addEventListener('click', async () => {
      const { error } = await supabase.auth.signOut();
      if (error) { showToast('Não consegui sair da conta.'); return; }
      root.innerHTML = '';
      showToast('Conta desconectada neste aparelho.');
    });
    return;
  }
  authMode = 'login';
  renderAuthModal();
}
function bindAccountModalClose(root) {
  root.querySelectorAll('[data-account-close], [data-account-backdrop]').forEach(element => element.addEventListener('click', event => {
    if (event.target === element) root.innerHTML = '';
  }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') root.innerHTML = ''; }, { once: true });
}
function renderAuthModal(message = '') {
  const root = document.querySelector('#modal-root');
  const isLogin = authMode === 'login';
  root.innerHTML = `<div class="modal-backdrop" data-account-backdrop><section class="modal-card rounded-[22px] bg-white p-5 shadow-2xl sm:p-6 dark:bg-[#1b241e]" role="dialog" aria-modal="true" aria-labelledby="account-title"><div class="mb-4 flex items-start justify-between"><div><span class="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf2e9] text-leaf dark:bg-[#263a2e] dark:text-[#a8d1b2]">${icon('cloud', 18)}</span><h2 id="account-title" class="text-[20px] font-extrabold">${isLogin ? 'Entrar para sincronizar' : 'Criar conta'}</h2><p class="mt-1 text-[12px] text-stone-400">Use a mesma conta no computador e no celular.</p></div><button data-account-close class="grid h-9 w-9 place-items-center rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-[#2a352d]" aria-label="Fechar">${icon('close', 18)}</button></div><form id="auth-form" class="space-y-3"><label class="block"><span class="mb-1.5 block text-[11px] font-bold text-stone-600">E-mail</span><input class="input-field" type="email" name="email" autocomplete="email" required placeholder="voce@exemplo.com" /></label><label class="block"><span class="mb-1.5 block text-[11px] font-bold text-stone-600">Senha</span><input class="input-field" type="password" name="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" minlength="6" required placeholder="Mínimo de 6 caracteres" /></label><p id="auth-message" class="min-h-4 text-[11px] text-stone-500">${escapeHtml(message)}</p><button class="w-full rounded-xl bg-leaf px-4 py-3 text-[12px] font-bold text-white">${isLogin ? 'Entrar' : 'Criar conta'}</button></form><button id="auth-mode-toggle" class="mt-4 w-full text-[11px] font-semibold text-leaf">${isLogin ? 'Ainda não tenho conta — criar agora' : 'Já tenho conta — entrar'}</button></section></div>`;
  bindAccountModalClose(root);
  root.querySelector('#auth-mode-toggle').addEventListener('click', () => {
    authMode = isLogin ? 'signup' : 'login';
    renderAuthModal();
  });
  root.querySelector('#auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('button[type="submit"], button:not([type])');
    submit.disabled = true;
    submit.textContent = 'Aguarde...';
    const form = new FormData(event.currentTarget);
    const email = form.get('email').trim();
    const password = form.get('password');
    const result = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` } });
    if (result.error) {
      const friendly = result.error.message.toLowerCase().includes('invalid login') ? 'E-mail ou senha não conferem.' : result.error.message;
      renderAuthModal(friendly);
      return;
    }
    if (isLogin) {
      root.innerHTML = '';
      if (result.data.user) connectCloudUser(result.data.user);
      return;
    }
    if (result.data.session?.user) {
      root.innerHTML = '';
      connectCloudUser(result.data.session.user);
    } else {
      renderAuthModal('Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre aqui.');
    }
  });
}
function showSyncConflict(remoteItems, localItems) {
  const root = document.querySelector('#modal-root');
  root.innerHTML = `<div class="modal-backdrop"><section class="modal-card rounded-[22px] bg-white p-5 shadow-2xl sm:p-6 dark:bg-[#1b241e]" role="dialog" aria-modal="true" aria-labelledby="sync-conflict-title"><span class="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf2e9] text-leaf dark:bg-[#263a2e] dark:text-[#a8d1b2]">${icon('cloud', 18)}</span><h2 id="sync-conflict-title" class="text-[20px] font-extrabold tracking-[-.04em]">Escolha qual lista usar</h2><p class="mt-2 text-[13px] leading-relaxed text-stone-500">Há uma lista salva neste aparelho e outra na nuvem. Você pode escolher uma ou mesclar os itens. Nenhuma será substituída sem sua escolha.</p><div class="mt-5 grid gap-2"><button data-sync-choice="cloud" class="rounded-xl bg-leaf px-4 py-3 text-left text-[12px] font-bold text-white">Usar a lista da nuvem</button><button data-sync-choice="device" class="rounded-xl border border-[#dce5dc] px-4 py-3 text-left text-[12px] font-bold text-ink dark:border-[#38453c]">Usar a lista deste aparelho</button><button data-sync-choice="merge" class="rounded-xl border border-[#dce5dc] px-4 py-3 text-left text-[12px] font-bold text-ink dark:border-[#38453c]">Mesclar as duas listas</button></div><p class="mt-3 text-[10px] leading-relaxed text-stone-400">Na mesclagem, itens com o mesmo nome, categoria e unidade aparecem uma vez; em caso de diferença, os dados da nuvem são mantidos.</p></section></div>`;
  root.querySelectorAll('[data-sync-choice]').forEach(button => button.addEventListener('click', async () => {
    const choice = button.dataset.syncChoice;
    localStorage.setItem(`grana-list-backup-${cloudUser.id}-${Date.now()}`, JSON.stringify(localItems));
    root.innerHTML = '';
    if (choice === 'cloud') {
      applyCloudItems(remoteItems);
      subscribeToCloud();
      showToast('Lista da nuvem carregada.');
      return;
    }
    const nextItems = choice === 'merge' ? mergeLists(remoteItems, localItems) : localItems;
    items = nextItems;
    saveLocal();
    syncState = 'saving';
    try {
      await writeCloudItems(nextItems);
      showToast(choice === 'merge' ? 'Listas mescladas e sincronizadas.' : 'Lista deste aparelho enviada à nuvem.');
    } catch {
      syncState = 'error';
      render();
      showToast('A lista continua salva neste aparelho; não consegui atualizar a nuvem.');
    }
  }));
}
function showModal(item = null) {
  modalItemId = item?.id || null;
  const edit = !!item;
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-backdrop><section class="modal-card rounded-[22px] bg-white p-5 shadow-2xl sm:p-6 dark:bg-[#1b241e]" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="mb-5 flex items-start justify-between"><div><span class="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf2e9] text-leaf dark:bg-[#263a2e] dark:text-[#a8d1b2]">${icon(edit ? 'edit' : 'plus', 18)}</span><h2 id="modal-title" class="text-[20px] font-extrabold tracking-[-.04em]">${edit ? 'Editar produto' : 'Adicionar produto'}</h2><p class="mt-1 text-[12px] text-stone-400">Preencha os detalhes para organizar sua compra.</p></div><button data-close class="grid h-9 w-9 place-items-center rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-[#2a352d]" aria-label="Fechar">${icon('close', 18)}</button></div><form id="item-form" class="space-y-3.5"><label class="block"><span class="mb-1.5 block text-[11px] font-bold text-stone-600">Nome do produto</span><input class="input-field" name="name" required maxlength="70" placeholder="Ex.: Café especial" value="${escapeHtml(item?.name || '')}" autofocus /></label><label class="block"><span class="mb-1.5 block text-[11px] font-bold text-stone-600">Categoria</span><select class="input-field" name="category">${categories.filter(c => c.id !== 'all').map(c => `<option ${item?.category === c.id ? 'selected' : ''} value="${escapeHtml(c.id)}">${c.icon} &nbsp; ${escapeHtml(c.label)}</option>`).join('')}</select></label><div class="grid grid-cols-[1fr_1fr] gap-3"><label><span class="mb-1.5 block text-[11px] font-bold text-stone-600">Quantidade</span><input class="input-field" name="quantity" type="number" min="0.01" step="0.01" required value="${item?.quantity ?? 1}" /></label><label><span class="mb-1.5 block text-[11px] font-bold text-stone-600">Unidade</span><select class="input-field" name="unit">${['un.', 'kg', 'g', 'L', 'ml', 'pacote', 'caixa', 'dúzia'].map(u => `<option ${item?.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label></div><div class="grid grid-cols-2 gap-3"><label><span class="mb-1.5 block text-[11px] font-bold text-stone-600">Preço unitário (R$)</span><input class="input-field" name="price" type="number" min="0" step="0.01" value="${item?.price ?? ''}" placeholder="0,00" /></label><label><span class="mb-1.5 block text-[11px] font-bold text-stone-600">Local de compra</span><input class="input-field" name="place" maxlength="40" value="${escapeHtml(item?.place || '')}" placeholder="Ex.: Mercado" /></label></div><div class="mt-5 flex gap-2.5 pt-1"><button type="button" data-close class="flex-1 rounded-xl border border-[#e3e8e1] px-4 py-3 text-[12px] font-bold text-stone-600 transition hover:bg-stone-50 dark:border-[#38453c] dark:hover:bg-[#263229]">Cancelar</button><button class="flex-1 rounded-xl bg-leaf px-4 py-3 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#194b31]">${edit ? 'Salvar alterações' : 'Adicionar à lista'}</button></div></form></section></div>`;
  const nameInput = document.querySelector('[name="name"]'); nameInput?.focus();
  document.querySelector('#item-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const saved = { name: data.get('name').trim(), category: data.get('category'), quantity: Number(data.get('quantity')), unit: data.get('unit'), price: Number(data.get('price') || 0), place: data.get('place').trim(), done: item?.done || false };
    if (!saved.name || saved.quantity <= 0) return;
    if (modalItemId) items = items.map(current => current.id === modalItemId ? { ...current, ...saved } : current);
    else items.unshift({ id: crypto.randomUUID(), ...saved });
    save(); document.querySelector('#modal-root').innerHTML = ''; render(); showToast(edit ? 'Produto atualizado' : 'Produto adicionado à lista');
  });
  document.querySelectorAll('[data-close], [data-backdrop]').forEach(el => el.addEventListener('click', event => { if (event.target === el) document.querySelector('#modal-root').innerHTML = ''; }));
  document.addEventListener('keydown', escapeModal, { once: true });
}
function escapeModal(event) { if (event.key === 'Escape') document.querySelector('#modal-root').innerHTML = ''; }
function showToast(message) { const root = document.querySelector('#toast-root'); root.innerHTML = `<div class="toast">${icon('check', 15)} <span>${escapeHtml(message)}</span></div>`; root.firstElementChild.classList.add('inline-flex', 'items-center', 'gap-2'); clearTimeout(toastTimer); toastTimer = setTimeout(() => root.innerHTML = '', 2200); }
function bindEvents() {
  document.querySelector('#theme-toggle').addEventListener('click', () => {
    isDark = !isDark;
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('grana-theme', isDark ? 'dark' : 'light');
    render();
  });
  document.querySelector('#add-item').addEventListener('click', () => showModal());
  document.querySelector('#account-action').addEventListener('click', showAccountModal);
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => { selectedCategory = button.dataset.category; render(); }));
  document.querySelector('#search').addEventListener('input', event => { searchQuery = event.target.value; const pos = event.target.selectionStart; render(); const input = document.querySelector('#search'); input.focus(); input.setSelectionRange(pos, pos); });
  document.querySelectorAll('[data-toggle]').forEach(input => input.addEventListener('change', () => { items = items.map(item => item.id === input.dataset.toggle ? { ...item, done: input.checked } : item); save(); render(); }));
  document.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => showModal(items.find(item => item.id === button.dataset.edit))));
  document.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => { const item = items.find(current => current.id === button.dataset.delete); items = items.filter(current => current.id !== button.dataset.delete); save(); render(); showToast(`${item.name} removido`); }));
}
render();
initializeCloudAuth();
window.addEventListener('online', () => {
  if (!cloudUser) return;
  if (cloudChannel) supabase.removeChannel(cloudChannel);
  cloudChannel = null;
  connectingUserId = null;
  connectCloudUser(cloudUser);
});
