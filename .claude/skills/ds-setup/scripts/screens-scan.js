// READ-ONLY. Кандидаты в эталонные экраны: экраны по страницам и их состав по ролям (T.role: встроенные + profile.roles).
// Запускать на файле продукта. До заполнения profile.screen — передать SIZE: [w, h] (из profile-detect → screenSizes).
const { PAGE_FILTER = [], SIZE = null, MAX = 600 } = PARAMS;
figma.skipInvisibleInstanceChildren = true;
const sizes = SIZE ? [SIZE] : ((T.cfg.screen && T.cfg.screen.sizes) || [[390, 844]]);
const isScreen = f => f.type === 'FRAME' && sizes.some(([w, h]) => Math.abs(f.width - w) <= 2 && f.height >= h * 0.55);
const out = [], unknown = {};
for (const p of figma.root.children) {
  if (PAGE_FILTER.length && !PAGE_FILTER.includes(p.name)) continue;
  await p.loadAsync();
  const tops = []; for (const n of p.children) { if (n.type === 'SECTION') tops.push(...n.children); else tops.push(n); }
  for (const f of tops.filter(isScreen)) {
    const roles = new Set();
    for (const c of f.children) { const r = T.role(c.name); if (r) roles.add(r); else unknown[c.name] = (unknown[c.name] || 0) + 1; }
    const sec = f.parent.type === 'SECTION' ? f.parent.name : '';
    out.push(p.name + ' / ' + sec + ' / ' + f.name + ' ' + f.id + ' ' + Math.round(f.width) + 'x' + Math.round(f.height) + ' [' + [...roles].join(',') + ']');
  }
}
const unk = Object.entries(unknown).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => k + ' ×' + v);
return { screens: out.slice(0, MAX), unknownLayerNames: unk };
// unknownLayerNames — частые слои без роли: если это бары/шиты/контент — дописать регулярки в profile.roles.
