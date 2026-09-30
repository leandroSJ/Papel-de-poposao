import './style.css';

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
let selectedCategory = 'all';
let searchQuery = '';
let modalItemId = null;
let toastTimer;
const app = document.querySelector('#app');
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = (name, size = 18) => {
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>', edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>', trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', basket: '<path d="m5 10 2 10h10l2-10M3 10h18M9 10l3-7 3 7"/>', close: '<path d="m18 6-12 12M6 6l12 12"/>', pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>', chevron: '<path d="m9 18 6-6-6-6"/>', check: '<path d="m5 12 4 4L19 6"/>', spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};
function save() { localStorage.setItem('grana-shopping-items', JSON.stringify(items)); }
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
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-inner mx-auto flex max-w-[1240px] items-center justify-between px-7 py-3.5">
          <a href="#" class="flex items-center gap-3 text-ink no-underline" aria-label="Grana, início">
            <span class="grid h-10 w-10 place-items-center rounded-[14px] bg-leaf text-white shadow-sm">${icon('basket', 21)}</span>
            <span><span class="block text-[17px] font-extrabold tracking-[-.04em]">grana<span class="text-leaf">.</span></span><span class="block -mt-0.5 text-[10px] font-semibold uppercase tracking-[.14em] text-stone-400">lista inteligente</span></span>
          </a>
          <div class="flex items-center gap-3 sm:gap-5">
            <div class="hidden text-right sm:block"><span class="block text-[10px] font-bold uppercase tracking-[.12em] text-stone-400">Total estimado</span><span class="text-[18px] font-extrabold tracking-[-.04em] text-ink">${money(totals.total)}</span></div>
            <div class="flex items-center gap-2 rounded-full bg-leaf px-3.5 py-2 text-white shadow-sm sm:px-4"><span class="text-citrus">${icon('basket', 17)}</span><span class="text-[11px] font-bold uppercase tracking-[.1em] sm:hidden">Total</span><strong class="text-[15px] font-extrabold tracking-[-.03em]">${money(totals.total)}</strong></div>
          </div>
        </div>
      </header>
      <main class="layout">
        <aside class="sidebar">
          <div class="mb-7 hidden md:block"><p class="mb-1 text-[11px] font-bold uppercase tracking-[.15em] text-stone-400">Seu espaço</p><h1 class="text-[21px] font-extrabold tracking-[-.05em]">Minha lista</h1></div>
          <p class="mb-3 hidden text-[10px] font-bold uppercase tracking-[.14em] text-stone-400 md:block">Categorias</p>
          <nav class="category-scroll flex flex-col gap-1.5" aria-label="Filtrar por categoria">
            ${categories.map(cat => `<button data-category="${escapeHtml(cat.id)}" class="category-button flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold ${selectedCategory === cat.id ? 'bg-leaf text-white shadow-sm' : 'text-stone-600 hover:bg-white'}"><span class="grid h-7 w-7 place-items-center rounded-lg ${selectedCategory === cat.id ? 'bg-white/15' : cat.tint}">${cat.icon}</span><span>${cat.label}</span><span class="ml-auto text-[11px] ${selectedCategory === cat.id ? 'text-white/65' : 'text-stone-400'}">${categoryCount(cat.id)}</span></button>`).join('')}
          </nav>
          <div class="mt-7 hidden overflow-hidden rounded-2xl bg-[#eaf2e9] p-4 md:block">
            <div class="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-white text-leaf">${icon('spark', 18)}</div>
            <p class="text-[13px] font-bold text-[#214a31]">De olho no orçamento</p>
            <p class="mt-1 text-[11px] leading-relaxed text-[#66806d]">Marque o que já colocou no carrinho e acompanhe o que falta.</p>
            <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white"><div class="h-full rounded-full bg-leaf transition-all" style="width:${totals.count ? (totals.done / totals.count) * 100 : 0}%"></div></div>
            <p class="mt-2 text-[10px] font-semibold text-[#66806d]">${totals.done} de ${totals.count} itens concluídos</p>
          </div>
        </aside>
        <section class="min-w-0">
          <div class="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p class="mb-1 text-[11px] font-bold uppercase tracking-[.14em] text-leaf">Organize sem complicação</p><h2 class="text-[28px] font-extrabold tracking-[-.055em] sm:text-[34px]">Sua próxima compra<span class="text-leaf">.</span></h2><p class="mt-1 text-[13px] text-stone-500">Tudo o que você precisa, em um só lugar.</p></div>
            <button id="add-item" class="inline-flex items-center justify-center gap-2 rounded-xl bg-citrus px-4 py-3 text-[13px] font-extrabold text-[#42350f] shadow-[0_5px_14px_rgba(182,144,35,.16)] transition hover:-translate-y-0.5 hover:bg-[#f7d568] active:translate-y-0">${icon('plus', 17)} Adicionar item</button>
          </div>
          <div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-[#e9ece6] bg-white p-4"><p class="text-[10px] font-bold uppercase tracking-[.12em] text-stone-400">Itens na lista</p><div class="mt-2 flex items-end justify-between"><strong class="text-[25px] font-extrabold tracking-[-.06em]">${totals.count}</strong><span class="mb-1 rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-500">${totals.done} feitos</span></div></div>
            <div class="rounded-2xl border border-[#e9ece6] bg-white p-4"><p class="text-[10px] font-bold uppercase tracking-[.12em] text-stone-400">Ainda falta</p><div class="mt-2 flex items-end justify-between"><strong class="text-[25px] font-extrabold tracking-[-.06em]">${items.filter(item => !item.done).length}</strong><span class="mb-1 text-[11px] font-semibold text-stone-400">para comprar</span></div></div>
            <div class="col-span-2 rounded-2xl border border-[#e9ece6] bg-white p-4 sm:col-span-1"><p class="text-[10px] font-bold uppercase tracking-[.12em] text-stone-400">Valor pendente</p><div class="mt-2"><strong class="text-[25px] font-extrabold tracking-[-.06em]">${money(totals.pendingValue)}</strong></div></div>
          </div>
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 class="text-[16px] font-extrabold tracking-[-.03em]">${selectedCategory === 'all' ? 'Lista de compras' : escapeHtml(selectedCategory)}</h3><p class="mt-0.5 text-[11px] text-stone-400">${visible.length} ${visible.length === 1 ? 'produto' : 'produtos'}</p></div>
            <label class="relative block w-full sm:w-[230px]"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">${icon('search', 16)}</span><input id="search" value="${escapeHtml(searchQuery)}" class="input-field !rounded-xl !py-2.5 !pl-9 !text-[12px]" placeholder="Buscar produto..." aria-label="Buscar produto" /></label>
          </div>
          <div class="overflow-hidden rounded-2xl border border-[#e8ece5] bg-white shadow-[0_5px_24px_rgba(28,48,33,.035)]">
            ${visible.length ? `<div class="divide-y divide-[#f0f2ee]">${visible.map(item => `<article class="item-row ${item.done ? 'item-done' : ''} flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5"><input class="check-control" type="checkbox" data-toggle="${item.id}" ${item.done ? 'checked' : ''} aria-label="Marcar ${escapeHtml(item.name)} como comprado" /><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><h4 class="item-name truncate text-[13px] font-bold text-ink">${escapeHtml(item.name)}</h4><span class="hidden rounded-md px-1.5 py-0.5 text-[9px] font-bold sm:inline ${categories.find(c => c.id === item.category)?.tint || 'bg-stone-100 text-stone-600'}">${escapeHtml(item.category)}</span></div><div class="mt-1 flex items-center gap-2 text-[10px] text-stone-400"><span>${Number(item.quantity)} ${escapeHtml(item.unit)}</span><span>·</span><span class="item-detail inline-flex items-center gap-1">${icon('pin', 11)} ${escapeHtml(item.place || 'Sem local')}</span></div></div><div class="w-[84px] shrink-0 text-right sm:w-[112px]"><strong class="block text-[13px] font-extrabold text-ink">${money(Number(item.quantity) * Number(item.price))}</strong><span class="text-[9px] text-stone-400">${money(item.price)} / un.</span></div><div class="flex shrink-0 items-center gap-0.5"><button class="grid h-9 w-9 place-items-center rounded-lg text-stone-400 transition hover:bg-[#edf4ee] hover:text-leaf" data-edit="${item.id}" title="Editar ${escapeHtml(item.name)}" aria-label="Editar ${escapeHtml(item.name)}">${icon('edit', 16)}</button><button class="grid h-9 w-9 place-items-center rounded-lg text-stone-400 transition hover:bg-rose-50 hover:text-rose-600" data-delete="${item.id}" title="Excluir ${escapeHtml(item.name)}" aria-label="Excluir ${escapeHtml(item.name)}">${icon('trash', 16)}</button></div></article>`).join('')}</div>` : `<div class="px-5 py-14 text-center"><span class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#edf4ee] text-leaf">${icon('basket', 21)}</span><p class="text-[14px] font-bold">${searchQuery ? 'Nenhum item encontrado' : 'Sua lista está vazia por aqui'}</p><p class="mt-1 text-[12px] text-stone-400">${searchQuery ? 'Tente buscar por outro nome.' : 'Adicione um produto para começar.'}</p></div>`}
            <div class="flex items-center justify-between border-t border-[#f0f2ee] bg-[#fcfdfb] px-4 py-3.5 sm:px-5"><span class="text-[11px] font-semibold text-stone-400">Total estimado da lista</span><strong class="text-[16px] font-extrabold tracking-[-.03em]">${money(totals.total)}</strong></div>
          </div>
          <p class="mt-4 text-center text-[10px] text-stone-400">Sua lista fica salva neste dispositivo automaticamente.</p>
        </section>
      </main>
      <div id="modal-root"></div><div id="toast-root"></div>
    </div>`;
  bindEvents();
}
function showModal(item = null) {
  modalItemId = item?.id || null;
  const edit = !!item;
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-backdrop><section class="modal-card rounded-[22px] bg-white p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="mb-5 flex items-start justify-between"><div><span class="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf2e9] text-leaf">${icon(edit ? 'edit' : 'plus', 18)}</span><h2 id="modal-title" class="text-[20px] font-extrabold tracking-[-.04em]">${edit ? 'Editar produto' : 'Adicionar produto'}</h2><p class="mt-1 text-[12px] text-stone-400">Preencha os detalhes para organizar sua compra.</p></div><button data-close class="grid h-9 w-9 place-items-center rounded-xl text-stone-400 hover:bg-stone-100" aria-label="Fechar">${icon('close', 18)}</button></div><form id="item-form" class="space-y-3.5"><label class="block"><span class="mb-1.5 block text-[11px] font-bold text-stone-600">Nome do produto</span><input class="input-field" name="name" required maxlength="70" placeholder="Ex.: Café especial" value="${escapeHtml(item?.name || '')}" autofocus /></label><label class="block"><span class="mb-1.5 block text-[11px] font-bold text-stone-600">Categoria</span><select class="input-field" name="category">${categories.filter(c => c.id !== 'all').map(c => `<option ${item?.category === c.id ? 'selected' : ''} value="${escapeHtml(c.id)}">${c.icon} &nbsp; ${escapeHtml(c.label)}</option>`).join('')}</select></label><div class="grid grid-cols-[1fr_1fr] gap-3"><label><span class="mb-1.5 block text-[11px] font-bold text-stone-600">Quantidade</span><input class="input-field" name="quantity" type="number" min="0.01" step="0.01" required value="${item?.quantity ?? 1}" /></label><label><span class="mb-1.5 block text-[11px] font-bold text-stone-600">Unidade</span><select class="input-field" name="unit">${['un.', 'kg', 'g', 'L', 'ml', 'pacote', 'caixa', 'dúzia'].map(u => `<option ${item?.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label></div><div class="grid grid-cols-2 gap-3"><label><span class="mb-1.5 block text-[11px] font-bold text-stone-600">Preço unitário (R$)</span><input class="input-field" name="price" type="number" min="0" step="0.01" value="${item?.price ?? ''}" placeholder="0,00" /></label><label><span class="mb-1.5 block text-[11px] font-bold text-stone-600">Local de compra</span><input class="input-field" name="place" maxlength="40" value="${escapeHtml(item?.place || '')}" placeholder="Ex.: Mercado" /></label></div><div class="mt-5 flex gap-2.5 pt-1"><button type="button" data-close class="flex-1 rounded-xl border border-[#e3e8e1] px-4 py-3 text-[12px] font-bold text-stone-600 transition hover:bg-stone-50">Cancelar</button><button class="flex-1 rounded-xl bg-leaf px-4 py-3 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#194b31]">${edit ? 'Salvar alterações' : 'Adicionar à lista'}</button></div></form></section></div>`;
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
  document.querySelector('#add-item').addEventListener('click', () => showModal());
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => { selectedCategory = button.dataset.category; render(); }));
  document.querySelector('#search').addEventListener('input', event => { searchQuery = event.target.value; const pos = event.target.selectionStart; render(); const input = document.querySelector('#search'); input.focus(); input.setSelectionRange(pos, pos); });
  document.querySelectorAll('[data-toggle]').forEach(input => input.addEventListener('change', () => { items = items.map(item => item.id === input.dataset.toggle ? { ...item, done: input.checked } : item); save(); render(); }));
  document.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => showModal(items.find(item => item.id === button.dataset.edit))));
  document.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => { const item = items.find(current => current.id === button.dataset.delete); items = items.filter(current => current.id !== button.dataset.delete); save(); render(); showToast(`${item.name} removido`); }));
}
render();
