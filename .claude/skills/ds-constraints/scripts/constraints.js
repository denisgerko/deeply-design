// Констрейнты по РОЛЯМ слоёв (T.role: встроенные регулярки + profile.roles). Имена слоёв продукта скрипт не знает.
// PARAMS: APPLY (false — dry run: план + слои без роли); SECTION_IDS — только экраны в этих секциях (одна фича);
//         PAGE_NAMES — страницы экранов (по умолчанию все после profile.pages.divider); COLUMNS — имена вложенных
//         фреймов-колонок без auto-layout (split view), внутри которых правило применяется ещё раз.
const { APPLY = false, SECTION_IDS = [], PAGE_NAMES = [], COLUMNS = [] } = PARAMS;
const divider = (T.cfg.pages && T.cfg.pages.divider) || '---';
const pages = figma.root.children;
const PAGES = PAGE_NAMES.length ? pages.filter(p => PAGE_NAMES.includes(p.name)) : pages.slice(pages.findIndex(p => p.name === divider) + 1);
// роль → [горизонталь, вертикаль]; null = по геометрии
const RULE = {
  statusBar: ['STRETCH', 'MIN'], navBar: ['STRETCH', 'MIN'], content: ['STRETCH', 'MIN'], toast: ['CENTER', 'MIN'], menu: [null, 'MIN'],
  tabBar: ['STRETCH', 'MAX'], homeIndicator: ['STRETCH', 'MAX'], keyboard: ['STRETCH', 'MAX'], inputBar: ['STRETCH', 'MAX'], cta: ['STRETCH', 'MAX'], sheet: ['STRETCH', 'MAX'],
  dimming: ['STRETCH', 'STRETCH'], pageSheet: ['STRETCH', 'STRETCH'],
  modal: ['CENTER', 'CENTER'], loader: ['CENTER', 'CENTER'], emptyState: ['STRETCH', 'CENTER'],
  fab: ['MAX', 'MAX'], feed: ['STRETCH', null],
};
const BOTTOM_BARS = new Set(['tabBar', 'keyboard', 'inputBar', 'cta', 'sheet']);
function rule(c, parent, W, H) {
  const role = T.role(c.name);
  const l = c.x, r = W - c.x - c.width, t = c.y, b = H - c.y - c.height;
  let [h, v] = RULE[role] || [null, null];
  if (!h) h = c.width >= 0.6 * W ? 'STRETCH' : (Math.abs(l - r) <= 2 ? 'CENTER' : (l < r ? 'MIN' : 'MAX'));
  if (role === 'content' && t < -0.5) v = 'MAX';                               // прокручен до конца — прилипает к низу
  if (role === 'feed') {                                                         // лента над полем ввода
    const bots = parent.children.filter(s => s !== c && BOTTOM_BARS.has(T.role(s.name)));
    const edge = bots.length ? Math.min(...bots.map(s => s.y)) : H;
    v = edge - (c.y + c.height) > 40 ? 'MIN' : 'MAX';
  }
  if (!v) {
    if (c.height > H + 0.5 && t <= 0.5) v = 'MIN';
    else if (t <= 0.5 && b <= 0.5) v = 'STRETCH';
    else if (t <= 0.5) v = 'MIN'; else if (b <= 0.5) v = 'MAX';
    else v = Math.abs(t - b) <= 4 ? 'CENTER' : (t < b ? 'MIN' : 'MAX');
  }
  return { h, v, role };
}
const plan = {}, unknown = {}; let changed = 0, total = 0, screens = 0;
function apply(parent, W, H) {
  for (const c of parent.children) {
    if (!c.constraints) continue;
    const { h, v, role } = rule(c, parent, W, H); total++;
    const nm = T.base(c.name);
    if (!role) unknown[nm + ' → ' + h + '/' + v] = (unknown[nm + ' → ' + h + '/' + v] || 0) + 1;
    const k = (role || '?') + ' (' + nm + ') → ' + h + '/' + v; plan[k] = (plan[k] || 0) + 1;
    if (c.constraints.horizontal !== h || c.constraints.vertical !== v) { changed++; if (APPLY) c.constraints = { horizontal: h, vertical: v }; }
    if (c.type === 'FRAME' && (!c.layoutMode || c.layoutMode === 'NONE') && COLUMNS.includes(nm)) apply(c, c.width, c.height);
  }
}
const roots = [];
if (SECTION_IDS.length) for (const id of SECTION_IDS) roots.push(await figma.getNodeByIdAsync(id));
else for (const p of PAGES) { await p.loadAsync(); roots.push(...p.children); }
for (const s of roots) { const fr = s.type === 'SECTION' ? s.children : [s]; for (const f of fr) if (T.isScreen(f)) { screens++; apply(f, f.width, f.height); } }
return { APPLY, screens, total, changed,
  noRole: Object.entries(unknown).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, n]) => k + ' ×' + n),
  plan: Object.entries(plan).sort().map(([k, n]) => k + ' ×' + n).slice(0, 120) };
// noRole — слои без роли, констрейнт по геометрии. Если это бар/шит/контент — дописать регулярку в profile.roles.
