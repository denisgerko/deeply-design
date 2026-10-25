// READ-ONLY. Запускать в use_figma с fileKey ПРОДУКТА.
// Дерево узла: размеры, заливки (с именами переменных), обводки, радиусы, auto-layout, эффекты,
// paint/effect styles, text styles (по сегментам — видно смешанные) и главные компоненты инстансов.
// Работает для любой ДС: цвет на переменной → {имя}, на стиле → «стиль», сырой → только hex.
// PARAMS: ROOT_IDS — один или несколько узлов; MAX_DEPTH; MAX_CHARS.
const { ROOT_IDS = [], MAX_DEPTH = 6, MAX_CHARS = 20000 } = PARAMS;
const SKIP = /^(Vector|Union|Ellipse \d+)$/;  // не раскрывать мелочь
const sname = async id => { if (!id || id === figma.mixed) return ''; try { const s = await figma.getStyleByIdAsync(id); return s ? s.name : ''; } catch (e) { return ''; } };
figma.skipInvisibleInstanceChildren = false;
const hex = c => '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
const vc = {}; const vname = async id => { if (vc[id]) return vc[id]; try { const v = await figma.variables.getVariableByIdAsync(id); return vc[id] = v ? v.name : id; } catch (e) { return id; } };
async function paint(p) {
  if (!p || p === figma.mixed) return '';
  const out = [];
  for (const f of p) {
    if (f.visible === false) continue;
    let s = f.type === 'SOLID' ? hex(f.color) + (f.opacity < 1 ? '@' + f.opacity.toFixed(2) : '') : f.type;
    if (f.boundVariables && f.boundVariables.color) s += '{' + await vname(f.boundVariables.color.id) + '}';
    if (f.type.startsWith('GRADIENT')) s += '[' + (await Promise.all(f.gradientStops.map(async g => hex(g.color) + '@' + g.color.a.toFixed(2) + (g.boundVariables && g.boundVariables.color ? '{' + await vname(g.boundVariables.color.id) + '}' : '')))).join(',') + ']';
    if (f.type === 'IMAGE') s += '(' + f.imageHash.slice(0, 10) + ' ' + f.scaleMode + ')';
    if (f.blendMode && f.blendMode !== 'NORMAL') s += ' ' + f.blendMode;
    out.push(s);
  }
  return out.join('+');
}
async function desc(n, d) {
  if (!n.visible) return [];
  let s = '  '.repeat(d) + n.name + ' [' + n.type + '] ' + Math.round(n.x) + ',' + Math.round(n.y) + ' ' + Math.round(n.width) + 'x' + Math.round(n.height);
  if (n.type === 'INSTANCE') { const m = await n.getMainComponentAsync(); s += ' <' + (m ? (m.parent && m.parent.type === 'COMPONENT_SET' ? m.parent.name + '/' + m.name : m.name) : '?') + '>'; }
  if ('fills' in n) { const p = await paint(n.fills); const st = await sname(n.fillStyleId); if (p) s += ' fill:' + p + (st ? '«' + st + '»' : ''); }
  if ('strokes' in n && n.strokes.length) { const st = await sname(n.strokeStyleId); s += ' stroke:' + await paint(n.strokes) + (st ? '«' + st + '»' : '') + ' w' + String(n.strokeWeight); }
  if ('cornerRadius' in n && n.cornerRadius) s += ' r' + (n.cornerRadius === figma.mixed ? [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius].join('/') : n.cornerRadius);
  if (n.boundVariables && Object.keys(n.boundVariables).some(k => /padding|itemSpacing|Radius/.test(k))) s += ' {num:' + (await Promise.all(Object.entries(n.boundVariables).filter(([k]) => /padding|itemSpacing|Radius/.test(k)).map(async ([k, b]) => k.replace('padding', 'p').replace('Radius', 'R') + '=' + await vname((Array.isArray(b) ? b[0] : b).id)))).join(',') + '}';
  if (n.layoutMode && n.layoutMode !== 'NONE') s += ' AL:' + n.layoutMode[0] + ' p' + [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].join(',') + ' g' + n.itemSpacing + ' ' + n.primaryAxisAlignItems + '/' + n.counterAxisAlignItems;
  if (n.effects && n.effects.length) s += ' fx' + (await sname(n.effectStyleId) ? '«' + await sname(n.effectStyleId) + '»' : '') + ':' + n.effects.filter(e => e.visible).map(e => e.type + (e.radius ? ' r' + e.radius : '') + (e.offset ? ' o' + e.offset.x + ',' + e.offset.y : '') + (e.color ? ' a' + e.color.a.toFixed(2) : '')).join(';');
  if (n.type === 'TEXT') {
    const segs = n.getStyledTextSegments(['textStyleId', 'fills']);
    const parts = [];
    for (const g of segs) { let st = null; try { st = g.textStyleId ? await figma.getStyleByIdAsync(g.textStyleId) : null; } catch (e) {} const f = g.fills[0]; parts.push((st ? st.name : 'NO STYLE') + (f && f.boundVariables && f.boundVariables.color ? '{' + await vname(f.boundVariables.color.id) + '}' : '')); }
    s += ' "' + n.characters.slice(0, 50) + '" ' + [...new Set(parts)].join(' + ') + ' ' + n.textAlignHorizontal;
  }
  if (n.opacity < 1) s += ' op' + n.opacity.toFixed(2);
  const lines = [s];
  if ('children' in n && d < MAX_DEPTH && !SKIP.test(n.name)) for (const c of n.children) lines.push(...await desc(c, d + 1));
  return lines;
}
const out = [];
for (const id of ROOT_IDS) { const r = await figma.getNodeByIdAsync(id); out.push(...await desc(r, 0)); }
return out.join('\n').slice(0, MAX_CHARS);
