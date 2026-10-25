// Заметки флоу: «Flow Start» (вход + общие правила) слева от первого экрана, «Flow End — <Куда>» справа от последнего.
// Карточка на токенах продукта (profile.flow.note, иначе роли profile.colors / profile.text).
// Повторный запуск пересоздаёт заметку с тем же именем — стрелки к ней тогда переставить. Поэтому заметки — ДО стрелок.
// PARAMS: SECTION_ID; NOTES — [{ name, title, body, nextTo: id экрана, side: 'LEFT'|'RIGHT' }]
const { SECTION_ID, NOTES = [], OFFSET = 160 } = PARAMS;
const N = (T.cfg.flow && T.cfg.flow.note) || {};
await T.fonts();
const sec = await figma.getNodeByIdAsync(SECTION_ID);
let pg = sec; while (pg.type !== 'PAGE') pg = pg.parent; await figma.setCurrentPageAsync(pg);
const out = [];
for (const nt of NOTES) {
  const old = sec.children.find(c => c.name === nt.name && c.type === 'FRAME'); if (old) old.remove();
  const f = T.frame(nt.name, 'VERTICAL'); sec.appendChild(f);
  f.resize(N.width || 280, 100); f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'FIXED';
  await T.pad(f, N.pad || 20); await T.gap(f, 8); await T.radius(f, N.radius || 16);
  await T.fill(f, N.bg || T.C('surface')); await T.stroke(f, N.border || T.C('border'), 1);
  for (const [txt, st, col] of [[nt.title, N.titleStyle || T.T('headline'), N.title || T.C('textPrimary')], [nt.body, N.bodyStyle || T.T('body'), N.text || T.C('textSecondary')]]) {
    if (!txt) continue;
    const t = await T.mkText(txt, st, col); f.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT';
  }
  const ref = await figma.getNodeByIdAsync(nt.nextTo);
  f.y = ref.y + 40; f.x = nt.side === 'RIGHT' ? ref.x + ref.width + OFFSET : ref.x - OFFSET - f.width;
  out.push(f.name + ' ' + f.id);
}
return { notes: out, ...T.report() };
// Магниты: Flow Start RIGHT → первый экран LEFT; последний экран RIGHT → Flow End LEFT (connect.js).
// Заметка вышла за край секции — расширить секцию (sec.resizeWithoutConstraints) и сдвинуть её x.
