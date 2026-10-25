// Подогнать секции страниц компонентов под содержимое и сложить вертикально (зазор 120) без наложений.
// Запускать после добавления/изменения компонентов. Страницы экранов этим скриптом НЕ трогать (там своя раскладка флоу).
const PAGES = (PARAMS.PAGES && PARAMS.PAGES.length) ? PARAMS.PAGES : ((T.cfg.pages && T.cfg.pages.components) || []);   // имена страниц компонентов
const { PAD_R = 80, PAD_B = 100, GAP = 120, MIN_W = 600 } = PARAMS;
const rep = [];
for (const name of PAGES) {
  const p = figma.root.children.find(x => x.name === name); if (!p) { rep.push('нет страницы ' + name); continue; }
  await p.loadAsync();
  const secs = p.children.filter(n => n.type === 'SECTION').sort((a, b) => a.y - b.y);
  let y = secs.length ? secs[0].y : 140;
  for (const s of secs) {
    if (!s.children.length) continue;
    const R = Math.max(...s.children.map(c => c.x + c.width)), B = Math.max(...s.children.map(c => c.y + c.height));
    s.resizeWithoutConstraints(Math.max(R + PAD_R, MIN_W), B + PAD_B);
    s.x = 0; s.y = y; y += s.height + GAP;
  }
  rep.push(p.name + ': ' + secs.map(s => s.name + ' ' + Math.round(s.width) + 'x' + Math.round(s.height)).join(', '));
}
return rep;
