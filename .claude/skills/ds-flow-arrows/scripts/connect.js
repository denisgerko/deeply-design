// Стрелки флоу: клон скрытого шаблона-коннектора (profile.flow.connectorTemplate). Цвета и шрифт — profile.flow.
// PARAMS: SECTION_ID — секция флоу; F — { ключ: id экрана/заметки };
//         LINKS — [[от, магнит|[x,y], к, магнит|[x,y], подпись], …]; магнит: TOP | BOTTOM | LEFT | RIGHT.
// Пример: F='{"start":"12:1","s1":"12:2"}' LINKS='[["start","RIGHT","s1","LEFT",""]]'
const { SECTION_ID, F = {}, LINKS = [] } = PARAMS;
const FL = T.cfg.flow || {};
const [fam = 'Inter', sty = 'Regular'] = FL.font || [];
const font = { family: fam, style: sty };
await figma.loadFontAsync(font);
const sec = await figma.getNodeByIdAsync(SECTION_ID);
let pg = sec; while (pg.type !== 'PAGE') pg = pg.parent; await figma.setCurrentPageAsync(pg);
const tpl = FL.connectorTemplate ? await figma.getNodeByIdAsync(FL.connectorTemplate) : null;
if (!tpl || tpl.type !== 'CONNECTOR') throw new Error('Нет шаблона-коннектора (profile.flow.connectorTemplate). Пользователь вставляет его вручную — см. README.');
const line = FL.line || T.C('accent'), label = FL.label || T.C('textSecondary'), labelBg = FL.labelBg || T.C('screenBg');
const ep = (k, m) => { if (!F[k]) throw new Error('Нет ключа ' + k + ' в F'); return typeof m === 'string' ? { endpointNodeId: F[k], magnet: m } : { endpointNodeId: F[k], position: { x: m[0], y: m[1] } }; };
const made = [];
for (const [a, am, b, bm, text] of LINKS) {
  const c = tpl.clone(); sec.appendChild(c); c.visible = true;
  c.connectorStart = ep(a, am); c.connectorEnd = ep(b, bm);
  c.connectorLineType = 'ELBOWED'; c.connectorStartStrokeCap = 'NONE'; c.connectorEndStrokeCap = 'ARROW_LINES';
  await T.stroke(c, line, 2);
  const t = c.text; t.fontName = font; t.characters = text || '';
  t.fontSize = FL.size || 13; t.lineHeight = { unit: 'PIXELS', value: FL.lineHeight || 18 };
  t.fills = (await T.paint(label, sec)).paints;                    // подпись коннектора: только paint (стиль не ставится — ограничение API)
  if (c.textBackground) c.textBackground.fills = (await T.paint(labelBg, sec)).paints;
  c.name = 'Flow — ' + (text || (a + ' → ' + b));
  made.push(c);
}
for (const c of made) sec.insertChild(0, c);            // стрелки за экранами
if (tpl.parent === sec) { tpl.visible = false; sec.insertChild(0, tpl); }
return { connectors: made.length, sample: made.slice(0, 8).map(c => c.name + ' ' + Math.round(c.width) + 'x' + Math.round(c.height)), ...T.report() };
