// READ-ONLY. Аудит токенов под корнями ROOTS (экраны, секции, компоненты, страницы — id).
// Что считается «на токене» — по профилю: переменная ИЛИ стиль; при color.system = raw цвет не проверяется.
// Внутренности нативного кита и картинок (profile.skipInside) пропускаются.
// PARAMS: ROOTS — id; CHECK_SPACING — проверять отступы/радиусы, для которых в шкале есть токен (по умолчанию true).
const { ROOTS = [], CHECK_SPACING = true } = PARAMS;
figma.skipInvisibleInstanceChildren = true;
const sys = (T.cfg.color && T.cfg.color.system) || 'variables';
const spMap = (T.cfg.spacing && T.cfg.spacing.map) || {}, rdMap = (T.cfg.radius && T.cfg.radius.map) || {};
const issues = {}; const add = (k, n) => { (issues[k] = issues[k] || []).push(n.name); };
const PAD = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'itemSpacing'];
const RAD = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];
let checked = 0;
for (const id of ROOTS) {
  const r = await figma.getNodeByIdAsync(id); if (!r) { add('нет узла', { name: id }); continue; }
  if (r.type === 'PAGE') await r.loadAsync();
  for (const n of r.findAll(() => true)) {
    if (!n.visible) continue;
    if (await T.skip(n)) continue;
    checked++;
    if (n.type === 'TEXT') {
      const segs = n.getStyledTextSegments(['textStyleId']);
      if (segs.some(s => !s.textStyleId)) add('TEXT без text style', n);
      if (!n.characters.trim()) add('TEXT пустой', n);
      if (sys !== 'raw' && !T.paintTokenized(n, 'fills')) add('TEXT цвет не на токене', n);
      continue;
    }
    if (sys !== 'raw' && ['FRAME', 'RECTANGLE', 'ELLIPSE', 'VECTOR', 'COMPONENT', 'BOOLEAN_OPERATION', 'POLYGON', 'STAR', 'LINE'].includes(n.type)) {
      if ('fills' in n && !T.paintTokenized(n, 'fills')) add(n.type === 'FRAME' && n.fills.length === 1 && n.fills[0].type === 'SOLID' && n.fills[0].color.r === 1 && n.fills[0].color.g === 1 && n.fills[0].color.b === 1 ? 'FRAME белая заливка по умолчанию (fills = [] или токен)' : n.type + ' заливка не на токене', n);
      if ('strokes' in n && !T.paintTokenized(n, 'strokes')) add(n.type + ' обводка не на токене', n);
    }
    if ('effects' in n && n.effects.length && !n.effectStyleId && n.type !== 'INSTANCE' && !(n.boundVariables && n.boundVariables.effects)) add('эффект без effect style', n);
    if (CHECK_SPACING && (n.type === 'FRAME' || n.type === 'COMPONENT')) {
      const bv = n.boundVariables || {};
      if (n.layoutMode && n.layoutMode !== 'NONE') for (const f of PAD) { const v = n[f]; if (v && spMap[String(v)] && !bv[f]) { add('отступ ' + v + ' без токена', n); break; } }
      for (const f of RAD) { const v = n[f]; if (v && rdMap[String(v)] && !bv[f]) { add('радиус ' + v + ' без токена', n); break; } }
    }
  }
}
const list = Object.entries(issues).map(([k, v]) => k + ' ×' + v.length + ': ' + [...new Set(v)].slice(0, 6).join(', '));
return { colorSystem: sys, checked, issues: list.length ? list.slice(0, 60) : ['чисто'] };
