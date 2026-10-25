// ===== Figma Feature Kit runtime =====
// kit/run.py вставляет этот файл перед каждым скриптом вместе с:
//   CFG    = figma.config.json → profile (всё, что зависит от продукта)
//   PARAMS = параметры запуска (--set / KEY=value)
// Скрипты НЕ знают, как устроена ДС продукта: токены, роли слоёв, тёмная тема — только через T.
// Всё ленивое: в read-only файле продукта runtime ничего не трогает, пока его не попросят.
const T = (() => {
  const P = (typeof CFG !== 'undefined' && CFG) || {};
  const cache = new Map();
  const once = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
  const rx = a => (a || []).map(s => new RegExp(s, 'i'));
  const keys = P.keys || {};
  const raw = [];                 // сырые значения, которые скрипт поставил (вернуть в отчёте → decisions)
  const missing = new Set();      // чего не нашли (токены, шрифты, стили)
  const base = n => String(n).replace(/ \((Dark|Light)\)$/, '');

  // ---------- переменные и стили: локальные, иначе из библиотеки по ключам profile.keys ----------
  const localVars = () => once('lv', () => figma.variables.getLocalVariablesAsync());
  const localCols = () => once('lc', () => figma.variables.getLocalVariableCollectionsAsync());
  const styleList = kind => once('sl' + kind, () => kind === 'TEXT' ? figma.getLocalTextStylesAsync() : kind === 'EFFECT' ? figma.getLocalEffectStylesAsync() : figma.getLocalPaintStylesAsync());

  async function variable(name, type) {
    return once('v|' + (type || '') + '|' + name, async () => {
      const prefer = (P.color && P.color.collections) || [];
      const cols = await localCols();
      const rank = v => { const c = cols.find(x => x.id === v.variableCollectionId); const i = c ? prefer.indexOf(c.name) : -1; return i < 0 ? 99 : i; };
      const found = (await localVars()).filter(v => v.name === name && (!type || v.resolvedType === type)).sort((a, b) => rank(a) - rank(b));
      if (found[0]) return found[0];
      const k = keys.variables && keys.variables[name];
      if (k) { try { return await figma.variables.importVariableByKeyAsync(k); } catch (e) { missing.add('import var ' + name); } }
      return null;
    });
  }
  async function style(name, kind) {          // kind: 'PAINT' | 'TEXT' | 'EFFECT'
    return once('s|' + kind + '|' + name, async () => {
      const s = (await styleList(kind)).find(x => x.name === name);
      if (s) return s;
      const k = keys.styles && keys.styles[name];
      if (k) { try { return await figma.importStyleByKeyAsync(k); } catch (e) { missing.add('import style ' + name); } }
      return null;
    });
  }

  // ---------- цвет: переменная → paint style → сырой '#hex' (только если профиль разрешает) ----------
  function hex(h) {
    let m = h.replace('#', ''); if (m.length <= 4) m = m.split('').map(c => c + c).join('');
    const n = i => parseInt(m.slice(i, i + 2), 16) / 255;
    return { r: n(0), g: n(2), b: n(4), a: m.length >= 8 ? n(6) : 1 };
  }
  async function paint(name, node) {
    if (typeof name === 'string' && name[0] === '#') {
      const c = hex(name); raw.push(name);
      return { paints: [{ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b }, opacity: c.a }] };
    }
    const v = await variable(name, 'COLOR');
    if (v) {
      let c = { r: 0, g: 0, b: 0 };      // базовый цвет = значение токена, иначе скриншоты иногда показывают заглушку
      try { const r = v.resolveForConsumer(node).value; if (r && 'r' in r) c = { r: r.r, g: r.g, b: r.b }; } catch (e) {}
      return { paints: [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: c }, 'color', v)] };
    }
    const s = await style(name, 'PAINT');
    if (s) return { style: s, paints: s.paints };
    throw new Error('Нет цвета «' + name + '»: ни переменной, ни paint style. Проверь имя в profile (или profile.keys для библиотеки).');
  }
  async function fill(node, name) { const r = await paint(name, node); if (r.style) await node.setFillStyleIdAsync(r.style.id); else node.fills = r.paints; return node; }
  async function stroke(node, name, weight) { const r = await paint(name, node); if (r.style) await node.setStrokeStyleIdAsync(r.style.id); else node.strokes = r.paints; if (weight != null) node.strokeWeight = weight; return node; }
  const C = key => { const v = P.colors && P.colors[key]; if (!v) throw new Error('В profile.colors нет роли цвета «' + key + '»'); return v; };  // роль → имя токена

  // ---------- текст и эффекты ----------
  async function textStyle(name) { const s = await style(name, 'TEXT'); if (!s) throw new Error('Нет text style «' + name + '»'); await figma.loadFontAsync(s.fontName); return s; }
  async function text(node, name) { const s = await textStyle(name); await node.setTextStyleIdAsync(s.id); return node; }
  async function mkText(chars, styleName, color) {
    const s = await textStyle(styleName);
    try { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); } catch (e) {}
    const t = figma.createText(); await t.setTextStyleIdAsync(s.id); t.characters = chars;
    if (color) await fill(t, color);
    return t;
  }
  const T_ = key => { const v = P.text && P.text[key]; if (!v) throw new Error('В profile.text нет роли текста «' + key + '»'); return v; };  // роль → имя text style
  async function effect(node, name) { const s = await style(name, 'EFFECT'); if (!s) throw new Error('Нет effect style «' + name + '»'); await node.setEffectStyleIdAsync(s.id); return node; }
  async function fonts() {
    for (const f of P.fonts || []) { try { await figma.loadFontAsync({ family: f[0], style: f[1] }); } catch (e) { missing.add('font ' + f.join(' ')); } }
  }

  // ---------- числа: profile.spacing.map / profile.radius.map = { "16": "имя переменной" } ----------
  async function bindNum(node, field, kind, value) {
    let val = value, name = null;
    const map = (P[kind] && P[kind].map) || {};
    if (value === 'full') { name = map.full; val = (P.radius && P.radius.fullValue) || 999; } else name = map[String(value)];
    node[field] = val;
    const v = name ? await variable(name, 'FLOAT') : null;
    if (v) node.setBoundVariable(field, v); else if (val) raw.push(node.name + '.' + field + '=' + val);
  }
  async function pad(n, t, r, b, l) {
    r = r == null ? t : r; b = b == null ? t : b; l = l == null ? r : l;
    for (const [f, v] of [['paddingTop', t], ['paddingRight', r], ['paddingBottom', b], ['paddingLeft', l]]) await bindNum(n, f, 'spacing', v);
  }
  const gap = (n, g) => bindNum(n, 'itemSpacing', 'spacing', g);
  async function radius(n, r) { for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) await bindNum(n, f, 'radius', r); }
  function frame(name, dir) {               // служебный фрейм без белой заливки по умолчанию
    const f = figma.createFrame(); f.name = name; f.fills = [];
    if (dir) { f.layoutMode = dir; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; }
    return f;
  }

  // ---------- роли слоёв (для констрейнтов, сканов). profile.roles важнее дефолтов ----------
  const DEFAULT_ROLES = {
    statusBar: ['^status ?bar'],
    homeIndicator: ['^home ?indicator', '^gesture ?(bar|nav)'],
    keyboard: ['keyboard'],
    pageSheet: ['^page ?sheet', '^full ?screen ?(modal|sheet)'],
    dimming: ['^(dimm?ing|scrim|backdrop)$', 'overlay$'],
    sheet: ['sheet$', '^bottom ?sheet', '^drawer', 'panel$', 'picker$'],
    modal: ['^(modal|alert|dialog|popup|pop-up)'],
    toast: ['^(toast|snackbar|banner)$'],
    menu: ['menu$', '^popover', '^dropdown'],
    navBar: ['^nav(igation)? ?bar', '^top ?bar', '^app ?bar', '^toolbar$', '^header$'],
    tabBar: ['^tab ?bar', '^bottom ?nav'],
    inputBar: ['^composer', '^input ?bar', '^chat ?input', '^search ?bar$'],
    cta: ['^(cta|button|buttons|primary button|actions?|bottom ?actions?|continue|footer)$'],
    fab: ['^(fab|floating.*|scroll to bottom)$'],
    feed: ['^(feed|messages|chat)$'],
    emptyState: ['^empty'],
    loader: ['^(loader|spinner|progress|skeleton)'],
    content: ['^(content|body|scroll ?view|list|document|form|page)$'],
  };
  const custom = P.roles || {};
  const order = [...Object.keys(custom), ...Object.keys(DEFAULT_ROLES).filter(k => !(k in custom))];
  const roleRx = Object.fromEntries(order.map(k => [k, rx(custom[k] || DEFAULT_ROLES[k])]));
  function role(name) { const n = base(name); for (const k of order) if (roleRx[k].some(r => r.test(n))) return k; return null; }

  // ---------- «внутрь не смотреть»: нативный кит, картинки-ассеты ----------
  const skipRx = rx(P.skipInside || ['^Native ', '^iOS ', '^Android ', '^Material ', '^Images?/', '^Illustrations?/']);
  async function mainName(inst) { return once('mn|' + inst.id, async () => { const m = await inst.getMainComponentAsync(); return m ? (m.parent && m.parent.type === 'COMPONENT_SET' ? m.parent.name : m.name) : ''; }); }
  async function skip(node) {
    let p = node.parent;
    while (p && p.type !== 'PAGE') {
      if (skipRx.some(r => r.test(p.name))) return true;
      if (p.type === 'INSTANCE') { const nm = await mainName(p); if (skipRx.some(r => r.test(nm))) return true; }
      p = p.parent;
    }
    return false;
  }

  // ---------- экраны ----------
  function isScreen(f) {
    if (!f || f.type !== 'FRAME' || (f.layoutMode && f.layoutMode !== 'NONE') || !('children' in f) || f.children.length < 2) return false;
    if (/^(Flow (Start|End)|TMP )/.test(f.name)) return false;
    const s = P.screen || {};
    const sizes = s.sizes || [[s.width || 390, s.height || 844]];
    return sizes.some(([w, h]) => Math.abs(f.width - w) <= (s.tolerance == null ? 60 : s.tolerance) && f.height >= h * 0.55);
  }

  // ---------- тёмная тема: profile.dark.strategy = variable-modes | style-swap | both | none ----------
  async function darkCollections() {
    const d = P.dark || {}; const res = [];
    for (const x of d.collections || []) {
      let col = (await localCols()).find(c => c.name === x.collection);
      if (!col && x.anchor) { const v = await variable(x.anchor); if (v) col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId); }
      if (!col) throw new Error('Нет коллекции для тёмной темы: ' + x.collection);
      const m = col.modes.find(mm => mm.name === x.mode); if (!m) throw new Error('В коллекции ' + col.name + ' нет режима ' + x.mode);
      res.push([col, m.modeId]);
    }
    return res;
  }
  async function dark(node) {
    const d = P.dark || { strategy: 'none' }; const st = d.strategy || 'none'; const log = [];
    if (st === 'none') throw new Error('В продукте нет тёмной темы (profile.dark.strategy = "none") — dark-копии не делаем.');
    if (st === 'variable-modes' || st === 'both') {
      for (const [col, modeId] of await darkCollections()) node.setExplicitVariableModeForCollection(col, modeId);
      log.push('modes');
    }
    if (st === 'style-swap' || st === 'both') {
      const swap = n => { for (const [a, b] of d.styleMap || []) if (n.includes(a)) return n.split(a).join(b); return null; };
      const all = [node].concat('findAll' in node ? node.findAll(() => true) : []);
      let n = 0;
      const target = async (id, kind) => { const s = await figma.getStyleByIdAsync(id); const tn = s && swap(s.name); if (!tn) return null; const t = await style(tn, kind); if (!t) missing.add(tn); return t; };
      for (const x of all) {
        if (x.type === 'TEXT' && x.fillStyleId === figma.mixed) {
          for (const sg of x.getStyledTextSegments(['fillStyleId'])) { if (!sg.fillStyleId) continue; const t = await target(sg.fillStyleId, 'PAINT'); if (t) { await x.setRangeFillStyleIdAsync(sg.start, sg.end, t.id); n++; } }
        } else if ('fillStyleId' in x && x.fillStyleId && x.fillStyleId !== figma.mixed) { const t = await target(x.fillStyleId, 'PAINT'); if (t) { await x.setFillStyleIdAsync(t.id); n++; } }
        if ('strokeStyleId' in x && x.strokeStyleId) { const t = await target(x.strokeStyleId, 'PAINT'); if (t) { await x.setStrokeStyleIdAsync(t.id); n++; } }
        if ('effectStyleId' in x && x.effectStyleId) { const t = await target(x.effectStyleId, 'EFFECT'); if (t) { await x.setEffectStyleIdAsync(t.id); n++; } }
      }
      log.push('styles ' + n);
    }
    return log.join(', ');
  }

  // ---------- токенизирован ли paint узла (для аудита) ----------
  function paintTokenized(node, prop) {
    const arr = node[prop];
    if (!arr || arr === figma.mixed || !arr.length) return true;
    const styleProp = prop === 'fills' ? 'fillStyleId' : 'strokeStyleId';
    if (node[styleProp] && node[styleProp] !== figma.mixed) return true;
    return !arr.some(f => f.visible !== false && f.type === 'SOLID' && !(f.boundVariables && f.boundVariables.color));
  }

  const report = () => ({ raw: [...new Set(raw)].slice(0, 40), missing: [...missing] });
  return { cfg: P, base, variable, style, paint, fill, stroke, C, T: T_, textStyle, text, mkText, effect, fonts,
    bindNum, pad, gap, radius, frame, role, roles: order, skip, mainName, isScreen, darkCollections, dark, paintTokenized, raw, missing, report };
})();
