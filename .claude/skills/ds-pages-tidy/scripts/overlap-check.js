// READ-ONLY. Наложения: элементы внутри секций, секции между собой, варианты внутри наборов (без auto-layout)
// и варианты за рамкой набора. PARAMS.PAGES — имена страниц (по умолчанию profile.pages.components).
const PAGES = (PARAMS.PAGES && PARAMS.PAGES.length) ? PARAMS.PAGES : ((T.cfg.pages && T.cfg.pages.components) || []);   // имена страниц компонентов
const ov = (a, b) => a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;
const rep = [];
for (const name of PAGES) {
  const p = figma.root.children.find(x => x.name === name); if (!p) { rep.push('нет страницы ' + name); continue; }
  await p.loadAsync();
  const secs = p.children.filter(n => n.type === 'SECTION');
  for (let i = 0; i < secs.length; i++) for (let j = i + 1; j < secs.length; j++) if (ov(secs[i], secs[j])) rep.push(p.name + ' секции: ' + secs[i].name + ' × ' + secs[j].name);
  for (const s of secs) { const k = s.children.filter(c => c.visible); for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) if (ov(k[i], k[j])) rep.push(p.name + '/' + s.name + ': ' + k[i].name + ' × ' + k[j].name); }
  const loose = p.children.filter(n => n.type === 'COMPONENT' || n.type === 'COMPONENT_SET');
  if (loose.length) rep.push(p.name + ' компоненты вне секций: ' + loose.map(n => n.name).join(', '));
  for (const set of p.findAllWithCriteria({ types: ['COMPONENT_SET'] })) {
    if (set.layoutMode && set.layoutMode !== 'NONE') continue;
    const k = set.children;
    for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) if (ov(k[i], k[j])) rep.push(p.name + ' набор ' + set.name + ': ' + k[i].name + ' × ' + k[j].name);
    for (const c of k) if (c.x < 0 || c.y < 0 || c.x + c.width > set.width + 0.5 || c.y + c.height > set.height + 0.5) rep.push(p.name + ' набор ' + set.name + ' за рамкой: ' + c.name);
  }
}
return rep.length ? rep.slice(0, 80) : ['чисто'];
