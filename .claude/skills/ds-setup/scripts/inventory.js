// READ-ONLY. Инвентаризация ДС файла: страницы, коллекции переменных и режимы, стили, компоненты (+ использование).
// Запускать на файле продукта: python3 -I kit/run.py ds-setup/inventory COUNT_USAGE=false PAGE_FILTER='["Components"]'
// PARAMS: PAGE_FILTER (имена страниц, пусто — все), COUNT_USAGE (считать инстансы; медленно), MAX_COMPONENTS
const { PAGE_FILTER = [], COUNT_USAGE = true, MAX_COMPONENTS = 400 } = PARAMS;
figma.skipInvisibleInstanceChildren = true;
const out = { pages: [], collections: [], textStyles: [], effectStyles: [], paintStyles: [], components: [] };
for (const p of figma.root.children) out.pages.push(p.name + ' ' + p.id);
// переменные
for (const c of await figma.variables.getLocalVariableCollectionsAsync()) {
  const vars = await Promise.all(c.variableIds.map(id => figma.variables.getVariableByIdAsync(id)));
  const groups = {};
  for (const v of vars) { const g = v.name.includes('/') ? v.name.split('/')[0] : '(root)'; groups[g] = (groups[g] || 0) + 1; }
  out.collections.push({ name: c.name, id: c.id, modes: c.modes.map(m => m.name + ' ' + m.modeId), count: vars.length,
    types: [...new Set(vars.map(v => v.resolvedType))], groups, sample: vars.slice(0, 12).map(v => v.name + ' ' + v.id) });
}
// стили
out.textStyles = (await figma.getLocalTextStylesAsync()).map(s => s.name + ' | ' + s.fontName.family + ' ' + s.fontName.style + ' ' + s.fontSize + '/' + (s.lineHeight.value || 'auto') + ' ' + s.id);
out.effectStyles = (await figma.getLocalEffectStylesAsync()).map(s => s.name + ' | ' + s.effects.map(e => e.type + (e.radius ? ' r' + e.radius : '') + (e.offset ? ' o' + e.offset.x + ',' + e.offset.y : '')).join(';') + ' ' + s.id);
out.paintStyles = (await figma.getLocalPaintStylesAsync()).map(s => s.name + ' ' + s.id).slice(0, 80);
// компоненты
let n = 0;
for (const p of figma.root.children) {
  if (PAGE_FILTER.length && !PAGE_FILTER.includes(p.name)) continue;
  await p.loadAsync();
  const comps = p.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] }).filter(c => c.type === 'COMPONENT_SET' || c.parent.type !== 'COMPONENT_SET');
  for (const c of comps) {
    if (n++ >= MAX_COMPONENTS) break;
    const props = Object.entries(c.componentPropertyDefinitions || {}).map(([k, v]) => k.split('#')[0] + ':' + v.type[0] + (v.variantOptions ? '[' + v.variantOptions.slice(0, 6).join('|') + ']' : ''));
    const row = { page: p.name, name: c.name, id: c.id, key: c.key, variants: c.type === 'COMPONENT_SET' ? c.children.length : 1, props: props.join(', ').slice(0, 200), size: Math.round(c.width) + 'x' + Math.round(c.height) };
    if (COUNT_USAGE) { let u = 0; for (const v of (c.type === 'COMPONENT_SET' ? c.children : [c])) u += (await v.getInstancesAsync()).length; row.usage = u; }
    out.components.push(row);
  }
}
out.components.sort((a, b) => (b.usage || 0) - (a.usage || 0));
return out;
