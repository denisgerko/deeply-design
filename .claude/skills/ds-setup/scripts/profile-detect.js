// READ-ONLY. Черновик профиля продукта (figma.config.json → profile): как заданы цвета, тёмная тема, шкалы,
// шрифты, размер экранов, как называются слои на экранах, что похоже на нативный кит и материалы.
// Запускать на файле продукта; если ДС в отдельном файле-библиотеке — ещё раз на нём (EXPORT_KEYS: true для режима B).
// Ничего не решает: выдаёт кандидатов. Claude выбирает, заполняет profile и показывает пользователю спорное.
const { PAGE_FILTER = [], MAX_SCREENS = 40, EXPORT_KEYS = false, KEY_PREFIXES = [] } = PARAMS;
figma.skipInvisibleInstanceChildren = true;
const out = {};
const DARK = /dark|night|тёмн|темн|black|dim/i, LIGHT = /light|day|светл|white|default|base/i;
const hex = c => '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

// 1. Переменные: коллекции, режимы, кандидаты dark, шкалы отступов и радиусов
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = Object.fromEntries(vars.map(v => [v.id, v]));
async function value(v, modeName, depth = 0) {
  const c = cols.find(x => x.id === v.variableCollectionId); if (!c || depth > 5) return null;
  const m = (modeName && c.modes.find(x => x.name === modeName)) || c.modes.find(x => x.modeId === c.defaultModeId);
  const x = v.valuesByMode[m.modeId];
  if (x && x.type === 'VARIABLE_ALIAS') { const t = byId[x.id] || await figma.variables.getVariableByIdAsync(x.id); return t ? value(t, null, depth + 1) : null; }
  return x;
}
out.collections = cols.map(c => {
  const vs = vars.filter(v => v.variableCollectionId === c.id); const types = {};
  for (const v of vs) types[v.resolvedType] = (types[v.resolvedType] || 0) + 1;
  return { name: c.name, modes: c.modes.map(m => m.name), types, groups: [...new Set(vs.map(v => v.name.split('/')[0]))].slice(0, 20),
    darkMode: (c.modes.find(m => DARK.test(m.name)) || {}).name || null };
});
out.darkVariableCandidates = out.collections.filter(c => c.darkMode && c.types.COLOR).map(c => {
  const col = cols.find(x => x.name === c.name);
  return { collection: c.name, mode: c.darkMode, anchor: (vars.find(v => v.variableCollectionId === col.id && v.resolvedType === 'COLOR') || {}).name };
});
const floats = vars.filter(v => v.resolvedType === 'FLOAT');
const isRadius = v => v.scopes.includes('CORNER_RADIUS') || /radius|round|corner|скругл/i.test(v.name);
const isSpacing = v => !isRadius(v) && (v.scopes.some(s => s === 'GAP') || /spac|gap|padding|margin|inset|step|offset|отступ/i.test(v.name));
const mapOf = async list => { const m = {}; for (const v of list) { const x = await value(v); if (typeof x === 'number' && (!(x in m) || v.name.length < m[x].length)) m[x] = v.name; } return m; };
out.spacingMap = await mapOf(floats.filter(isSpacing));
out.radiusMap = await mapOf(floats.filter(isRadius));
const fullR = floats.filter(isRadius).find(v => /full|pill|circle|round$/i.test(v.name));
if (fullR) { const fv = await value(fullR); out.radiusMap.full = fullR.name; out.radiusFullValue = fv; if (out.radiusMap[fv] === fullR.name) delete out.radiusMap[fv]; }
out.colorVariables = vars.filter(v => v.resolvedType === 'COLOR').length;
out.colorVariableSample = vars.filter(v => v.resolvedType === 'COLOR').slice(0, 60).map(v => v.name);

// 2. Стили: paint (пары light/dark), text (шрифты), effect
const ps = await figma.getLocalPaintStylesAsync(), ts = await figma.getLocalTextStylesAsync(), es = await figma.getLocalEffectStylesAsync();
out.paintStyles = { count: ps.length, sample: ps.slice(0, 40).map(s => s.name) };
const pnames = new Set(ps.map(s => s.name)); const pairs = {};
for (const s of ps) for (const [a, b] of [['Light', 'Dark'], ['light', 'dark'], ['Day', 'Night'], ['Светл', 'Тёмн']]) if (s.name.includes(a) && pnames.has(s.name.split(a).join(b))) pairs[a + '→' + b] = (pairs[a + '→' + b] || 0) + 1;
out.styleSwapCandidates = pairs;
out.textStyles = ts.map(s => s.name + ' | ' + s.fontName.family + ' ' + s.fontName.style + ' ' + s.fontSize).slice(0, 80);
out.effectStyles = es.map(s => s.name + ' | ' + s.effects.map(e => e.type).join('+'));
const fontSet = new Set(ts.map(s => s.fontName.family + '|' + s.fontName.style));

// 3. Экраны: размеры, имена слоёв верхнего уровня, источники цвета
const sizes = {}, frames = [];
for (const p of figma.root.children) {
  if (PAGE_FILTER.length && !PAGE_FILTER.includes(p.name)) continue;
  await p.loadAsync();
  const tops = []; for (const n of p.children) { if (n.type === 'SECTION') tops.push(...n.children); else tops.push(n); }
  for (const f of tops) if (f.type === 'FRAME' && f.width >= 300 && f.width <= 1920 && f.height >= 400) { const k = Math.round(f.width) + 'x' + Math.round(f.height); sizes[k] = (sizes[k] || 0) + 1; frames.push(f); }
}
out.screenSizes = top(sizes, 8);
const mainW = out.screenSizes.length ? +out.screenSizes[0][0].split('x')[0] : 0;
const sample = frames.filter(f => Math.abs(f.width - mainW) <= 2).slice(0, MAX_SCREENS);
const childNames = {}, instNames = {}, remoteNames = {}, src = { variable: 0, style: 0, raw: 0 }, rawColors = {}, txt = { styled: 0, unstyled: 0 };
const materials = {};
for (const f of sample) {
  for (const c of f.children) childNames[c.name] = (childNames[c.name] || 0) + 1;
  for (const n of f.findAll(() => true)) {
    if (n.type === 'INSTANCE') {
      const m = await n.getMainComponentAsync(); const nm = m ? (m.parent && m.parent.type === 'COMPONENT_SET' ? m.parent.name : m.name) : '?';
      if (n.parent === f) instNames[nm] = (instNames[nm] || 0) + 1;
      if (m && m.remote) remoteNames[nm] = (remoteNames[nm] || 0) + 1;
      if (/glass|material|blur|frost|acrylic|mica/i.test(nm)) materials[nm] = (materials[nm] || 0) + 1;
    }
    if (n.type === 'TEXT') { if (n.textStyleId && n.textStyleId !== figma.mixed) txt.styled++; else txt.unstyled++; if (n.fontName !== figma.mixed) fontSet.add(n.fontName.family + '|' + n.fontName.style); }
    if ('effects' in n && n.effects.some(e => e.type === 'BACKGROUND_BLUR' || e.type === 'GLASS')) materials['(эффект ' + n.effects.map(e => e.type).join('+') + ') ' + n.name] = 1;
    if (!('fills' in n) || n.fills === figma.mixed) continue;
    for (const p of n.fills) {
      if (p.visible === false || p.type !== 'SOLID') continue;
      if (p.boundVariables && p.boundVariables.color) src.variable++;
      else if (n.fillStyleId && n.fillStyleId !== figma.mixed) src.style++;
      else { src.raw++; const h = hex(p.color); rawColors[h] = (rawColors[h] || 0) + 1; }
    }
  }
}
out.screensSampled = sample.length;
out.colorSources = src;          // что преобладает → color.system
out.topRawColors = top(rawColors, 15);
out.textStyled = txt;
out.topLevelLayerNames = top(childNames, 50);        // → profile.roles (если имена не английские/не стандартные)
out.topLevelComponents = top(instNames, 40);
out.remoteComponents = top(remoteNames, 30);        // кандидаты: нативный кит / библиотека ДС
out.materialCandidates = top(materials, 15);
out.fonts = [...fontSet].map(x => x.split('|'));

// 4. Черновик решения
const sys = src.variable >= src.style && src.variable >= src.raw ? 'variables' : (src.style >= src.raw ? 'styles' : 'raw');
out.draft = {
  screen: out.screenSizes.length ? { sizes: [out.screenSizes[0][0].split('x').map(Number)] } : null,
  color: { system: sys, collections: out.collections.filter(c => c.types.COLOR).sort((x, y) => (y.darkMode ? 1 : 0) - (x.darkMode ? 1 : 0)).map(c => c.name) },  // семантическая (с dark) первой
  dark: out.darkVariableCandidates.length ? { strategy: 'variable-modes', collections: out.darkVariableCandidates }
    : (Object.keys(pairs).length ? { strategy: 'style-swap', styleMap: Object.keys(pairs).map(k => [k.split('→')[0], k.split('→')[1]]) } : { strategy: 'none' }),
  fonts: out.fonts,
  spacing: { map: out.spacingMap },
  radius: { map: out.radiusMap, fullValue: out.radiusFullValue || 999 },
};

// 5. Ключи для режима B (ДС — библиотека)
if (EXPORT_KEYS) {
  const ok = n => !KEY_PREFIXES.length || KEY_PREFIXES.some(p => n.startsWith(p));
  out.keys = { variables: {}, styles: {} };
  for (const v of vars) if (ok(v.name)) out.keys.variables[v.name] = v.key;
  for (const s of [...ps, ...ts, ...es]) if (ok(s.name)) out.keys.styles[s.name] = s.key;
}
return out;
