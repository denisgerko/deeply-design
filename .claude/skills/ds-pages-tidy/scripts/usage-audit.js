// READ-ONLY. Где используются компоненты страниц PAGES (имена; по умолчанию profile.pages.components).
// Для каждого компонента/набора: варианты, инстансы по страницам, внутри каких компонентов, неиспользуемые варианты.
// Вывод ограничен 20 КБ — при необходимости запускать по 1–2 страницы.
const PAGES = (PARAMS.PAGES && PARAMS.PAGES.length) ? PARAMS.PAGES : ((T.cfg.pages && T.cfg.pages.components) || []);   // имена страниц компонентов
figma.skipInvisibleInstanceChildren = false;
const pageOf = n => { let p = n; while (p && p.type !== 'PAGE') p = p.parent; return p; };
const insideComp = n => { let p = n.parent; while (p && p.type !== 'PAGE') { if (p.type === 'COMPONENT' || p.type === 'COMPONENT_SET') return p.type === 'COMPONENT_SET' ? p.name : (p.parent && p.parent.type === 'COMPONENT_SET' ? p.parent.name : p.name); p = p.parent; } return null; };
const out = [];
for (const name of PAGES) {
  const page = figma.root.children.find(p => p.name === name); if (!page) { out.push('нет страницы ' + name); continue; }
  await page.loadAsync();
  out.push('### ' + page.name);
  const tops = [];
  for (const n of page.children) { if (n.type === 'SECTION') tops.push(...n.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).filter(c => c.type === 'COMPONENT_SET' || c.parent.type !== 'COMPONENT_SET')); else tops.push(n); }
  for (const n of tops) {
    if (n.type !== 'COMPONENT' && n.type !== 'COMPONENT_SET') continue;
    const vars = n.type === 'COMPONENT_SET' ? n.children : [n];
    const pages = {}, inComp = new Set(); let unusedV = 0;
    for (const v of vars) {
      const insts = await v.getInstancesAsync();
      if (!insts.length && vars.length > 1) unusedV++;
      for (const i of insts) { const ic = insideComp(i); if (ic) { inComp.add(ic); continue; } const q = pageOf(i); const k = q ? q.name : '(orphan)'; pages[k] = (pages[k] || 0) + 1; }
    }
    out.push(n.id + ' "' + n.name + '" v:' + vars.length + ' pages:' + JSON.stringify(pages) + ' in:' + [...inComp].slice(0, 4).join('/') + (unusedV ? ' unusedVariants:' + unusedV : ''));
  }
}
return out.join('\n').slice(0, 20000);
