// «Устаревший материал» (стекло/блюр): после смены размеров компонента внутренние слои вложенного материала
// в инстансах остаются старого размера (кнопки «слипаются», серые прямоугольники). resize не лечит —
// лечит переключение варианта материала туда и обратно. Нужен profile.materials; нет материалов — скрипт не нужен.
// PARAMS: FIX — переключить вариант и проверить снова; PAGES — имена страниц (пусто — все).
const { FIX = false, PAGES = [] } = PARAMS;
const M = T.cfg.materials;
if (!M) return 'В profile.materials ничего нет — в ДС продукта нет материалов, проверка не нужна.';
const names = (M.names || []).map(s => new RegExp(s, 'i')), inner = M.innerLayers || [], prop = M.variantProp;
figma.skipInvisibleInstanceChildren = false;
const bad = []; let checked = 0, fixed = 0;
const off = m => m.children.filter(c => inner.includes(c.name)).some(c => Math.abs(c.width - m.width) > 0.5 || Math.abs(c.height - m.height) > 0.5);
async function flip(m) {
  const key = Object.keys(m.componentProperties).find(k => k.split('#')[0] === prop); if (!key) return false;
  const cur = m.componentProperties[key].value;
  const main = await m.getMainComponentAsync(); const set = main && main.parent && main.parent.type === 'COMPONENT_SET' ? main.parent : null; if (!set) return false;
  const other = set.componentPropertyDefinitions[key.split('#')[0]].variantOptions.find(o => o !== cur); if (!other) return false;
  m.setProperties({ [key]: other }); m.setProperties({ [key]: cur }); return true;
}
for (const p of figma.root.children) {
  if (PAGES.length && !PAGES.includes(p.name)) continue;
  await p.loadAsync();
  for (const m of p.findAll(n => n.type === 'INSTANCE' && names.some(r => r.test(n.name)))) {
    if (m.removed) continue; checked++;
    if (!off(m)) continue;
    if (FIX && prop && await flip(m) && !off(m)) { fixed++; continue; }
    let host = m.parent; while (host && host.type !== 'PAGE' && !(host.parent && (host.parent.type === 'SECTION' || host.parent.type === 'PAGE'))) host = host.parent;
    bad.push(p.name + ' / ' + (host ? host.name : '?') + ' / ' + m.parent.name + ' ' + m.id);
  }
}
return { checked, fixed, stillBad: bad.length, list: bad.slice(0, 40) };
