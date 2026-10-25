// Раскладка компонентов страницы по SECTION-категориям с подписями над компонентами.
// PAGE_NAME — страница; TEMPLATE_LABEL_ID — существующая подпись (её шрифт и стиль для новых подписей);
// GROUPS — порядок секций и компонентов; EXTRA_LABEL — для фреймов-примеров: имя узла → начало текста подписи.
// Запускать, когда компоненты ещё НЕ в секциях (для повторной раскладки сначала вынуть их из секций).
// PARAMS: PAGE_NAME, TEMPLATE_LABEL_ID, GROUPS — [{ name: 'Cards', ids: ['12:34'] }], EXTRA_LABEL — { 'Examples': 'Examples' }
const { PAGE_NAME, TEMPLATE_LABEL_ID, GROUPS = [], EXTRA_LABEL = {}, START_Y = 140, MAXW = 2600, GAP = 80, LABEL_GAP = 44 } = PARAMS;
const page = figma.root.children.find(p => p.name === PAGE_NAME); await figma.setCurrentPageAsync(page);
const tpl = await figma.getNodeByIdAsync(TEMPLATE_LABEL_ID); await figma.loadFontAsync(tpl.fontName);
const texts = page.children.filter(n => n.type === 'TEXT'); for (const t of texts) if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName);
const used = new Set(), rep = [];
const labelFor = c => {
  const nm = c.name;
  let t = texts.find(x => !used.has(x.id) && (x.characters.trim() === nm || x.characters.trim() === nm + ' (internal)' || (EXTRA_LABEL[nm] && x.characters.startsWith(EXTRA_LABEL[nm]))));
  if (!t) { t = tpl.clone(); t.characters = nm.startsWith('_') ? nm + ' (internal)' : nm; }
  else if (t.fontSize !== tpl.fontSize || t.fontName.style !== tpl.fontName.style) { const n2 = tpl.clone(); n2.characters = t.characters; used.add(t.id); t.remove(); t = n2; }
  used.add(t.id); return t;
};
let y = START_Y;
for (const g of GROUPS) {
  const sec = figma.createSection(); sec.name = g.name; page.appendChild(sec);
  let cx = GAP, cy = 100, rowH = 0, maxR = 0;
  for (const id of g.ids) {
    const c = await figma.getNodeByIdAsync(id); if (!c) { rep.push('missing ' + id); continue; }
    const lab = labelFor(c);
    const w = Math.max(c.width, lab.width);
    if (cx > GAP && cx + w > MAXW) { cx = GAP; cy += rowH + GAP; rowH = 0; }
    sec.appendChild(lab); lab.x = cx; lab.y = cy;
    sec.appendChild(c); c.x = cx; c.y = cy + LABEL_GAP;
    cx += w + GAP; rowH = Math.max(rowH, c.height + LABEL_GAP); maxR = Math.max(maxR, cx);
  }
  sec.resizeWithoutConstraints(Math.max(maxR, 600), cy + rowH + 100);
  sec.x = 0; sec.y = y; y += sec.height + 120;
  rep.push(g.name + ' ' + sec.id + ' ' + Math.round(sec.width) + 'x' + Math.round(sec.height));
}
const left = page.children.filter(n => n.type !== 'SECTION' && !used.has(n.id));
rep.push('вне секций: ' + left.map(n => n.id + ' ' + n.type + ':' + (n.type === 'TEXT' ? n.characters.slice(0, 30) : n.name)).join(' | '));
return rep;
