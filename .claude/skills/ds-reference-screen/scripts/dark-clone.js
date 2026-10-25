// Тёмная секция под светлой: «<Имя> (Dark)». Способ тёмной темы — из profile.dark (T.dark):
// режим переменных, замена стилей или оба. Если dark.strategy = none — скрипт остановится с объяснением.
// PARAMS: SECTION_ID — светлая секция; WHOLE_SECTION — клон секции целиком (для флоу со стрелками: коннекторы
//         ремапятся на клоны), иначе клонируются только экраны; GAP — зазор между секциями.
const { SECTION_ID, WHOLE_SECTION = true, GAP = 120 } = PARAMS;
await T.fonts();
const sec = await figma.getNodeByIdAsync(SECTION_ID);
let page = sec; while (page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
let dsec; const out = [];
if (WHOLE_SECTION) {
  dsec = sec.clone(); page.appendChild(dsec);
  for (const c of dsec.children.filter(T.isScreen)) { c.name += ' (Dark)'; out.push(c.id + ' ' + c.name + ' · ' + await T.dark(c)); }
} else {
  dsec = figma.createSection(); page.appendChild(dsec);
  for (const f of sec.children.filter(T.isScreen)) { const c = f.clone(); dsec.appendChild(c); c.name = f.name + ' (Dark)'; c.x = f.x; c.y = f.y; out.push(c.id + ' ' + c.name + ' · ' + await T.dark(c)); }
  dsec.resizeWithoutConstraints(sec.width, sec.height);
}
// Заметки Flow Start/End — не экраны: остаются светлыми, как и подписи стрелок.
dsec.name = sec.name.replace(/ \(Light\)$| — Light$/, '') + ' (Dark)'; dsec.x = sec.x; dsec.y = sec.y + sec.height + GAP;
return { darkSection: dsec.id, screens: out, ...T.report() };
