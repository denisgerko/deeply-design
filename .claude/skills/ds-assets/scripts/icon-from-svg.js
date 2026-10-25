// Импортированные SVG-фреймы (upload_assets) → компоненты иконок по конвенции ДС продукта (profile.icons).
// PARAMS: ICONS — [[frameId (placedOnNodeId), 'Имя/компонента', двухцветная?], …]; TARGET_ID — куда класть (секция/фрейм).
const { ICONS = [], TARGET_ID = null } = PARAMS;
const I = T.cfg.icons || {};
const size = I.size || 24, color = I.color || T.C('icon'), accent = I.accent || (T.cfg.colors && T.cfg.colors.iconAccent) || T.C('accent');
const page = I.page ? figma.root.children.find(p => p.name === I.page) : figma.currentPage;
await figma.setCurrentPageAsync(page);
const target = TARGET_ID ? await figma.getNodeByIdAsync(TARGET_ID) : page;
// «цветной» слой двухцветной иконки — насыщенный цвет
const isAccent = p => { const f = p.fills && p.fills !== figma.mixed && p.fills[0]; return f && f.type === 'SOLID' && (Math.max(f.color.r, f.color.g, f.color.b) - Math.min(f.color.r, f.color.g, f.color.b)) > 0.3; };
const res = [];
for (const [frameId, name, duo] of ICONS) {
  const f = await figma.getNodeByIdAsync(frameId);
  if (Math.abs(f.width - size) > 0.01) f.rescale(size / f.width);             // обводка масштабируется пропорционально
  const parts = [];
  for (const v of f.findAll(n => ['VECTOR', 'ELLIPSE', 'RECTANGLE', 'LINE', 'POLYGON', 'STAR', 'BOOLEAN_OPERATION'].includes(n.type))) {
    if (v.strokes && v.strokes.length && v.strokeWeight > 0) {
      const o = v.outlineStroke();                                              // кладёт результат в корень страницы
      if (o) { f.appendChild(o); o.relativeTransform = v.relativeTransform; parts.push(o); }
      if (v.fills && v.fills !== figma.mixed && v.fills.length) { v.strokes = []; parts.push(v); } else v.remove();
    } else parts.push(v);
  }
  const comp = figma.createComponent(); comp.name = name; comp.resize(size, size); comp.fills = []; comp.clipsContent = false;
  target.appendChild(comp); comp.x = f.x; comp.y = f.y;
  const place = n => { const x = n.x, y = n.y; comp.appendChild(n); n.x = x; n.y = y; n.constraints = { horizontal: 'SCALE', vertical: 'SCALE' }; };
  const groups = duo ? [['Base', parts.filter(p => !isAccent(p)), color], ['Accent', parts.filter(isAccent), accent]] : [['Vector', parts, color]];
  for (const [layer, list, col] of groups) {
    if (!list.length) continue;
    const g = list.length > 1 ? figma.flatten(list, f) : list[0];
    g.name = layer; g.strokes = []; await T.fill(g, col); place(g);
  }
  f.remove();
  res.push(comp.name + ' ' + comp.id + ' ' + comp.children.map(c => c.name + ' ' + Math.round(c.width * 10) / 10 + 'x' + Math.round(c.height * 10) / 10).join('|'));
}
return { icons: res, ...T.report() };
