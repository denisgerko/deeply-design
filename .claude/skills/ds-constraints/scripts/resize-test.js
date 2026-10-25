// Тест растяжения: копия экрана +DW×+DH слева от страницы.
// PARAMS: SCREEN_IDS → вернёт id копий → get_screenshot каждой; CLEANUP: true — удалить «TMP resize test — …».
const { SCREEN_IDS = [], CLEANUP = false, DW = 40, DH = 120 } = PARAMS;
const pageOf = n => { let p = n; while (p.type !== 'PAGE') p = p.parent; return p; };
if (CLEANUP) {
  let n = 0; const seen = new Set();
  for (const id of SCREEN_IDS) { const s = await figma.getNodeByIdAsync(id); if (!s) continue; const p = pageOf(s); if (seen.has(p.id)) continue; seen.add(p.id); for (const c of [...p.children]) if (c.name.startsWith('TMP resize test — ')) { c.remove(); n++; } }
  return 'removed ' + n;
}
await T.fonts();
const out = []; let x = -800;
for (const id of SCREEN_IDS) {
  const s = await figma.getNodeByIdAsync(id); const page = pageOf(s);
  await figma.setCurrentPageAsync(page);
  const c = s.clone(); page.appendChild(c);
  c.name = 'TMP resize test — ' + s.name; c.x = x - s.width - DW; c.y = 0; c.resize(s.width + DW, s.height + DH);
  x = c.x - 100; out.push(c.id);
}
return out;
