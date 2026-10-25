// Временное превью компонентов на фоне экрана в light и dark (если в продукте есть dark) для скриншота.
// 1) PAGE_ID + ITEMS → вернёт id фрейма → get_screenshot.  2) CLEANUP: true — удалить «TMP preview» на странице.
// ITEMS: [{ id }, { id, props: { Label: 'Длинный текст для проверки переноса' } }] — компонент / вариант / набор.
const { PAGE_ID, ITEMS = [], CLEANUP = false } = PARAMS;
const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
if (CLEANUP) { let n = 0; for (const c of [...page.children]) if (c.name === 'TMP preview') { c.remove(); n++; } return 'removed ' + n; }
await T.fonts();
const hasDark = T.cfg.dark && T.cfg.dark.strategy && T.cfg.dark.strategy !== 'none';
const wrap = T.frame('TMP preview', 'HORIZONTAL'); page.appendChild(wrap); wrap.x = -3000; wrap.y = 0;
for (const isDark of hasDark ? [false, true] : [false]) {
  const f = T.frame(isDark ? 'Dark' : 'Light', 'VERTICAL'); wrap.appendChild(f);
  f.itemSpacing = 16; f.paddingLeft = f.paddingRight = f.paddingTop = f.paddingBottom = 24; f.clipsContent = false;
  await T.fill(f, T.C('screenBg'));
  for (const it of ITEMS) {
    const c = await figma.getNodeByIdAsync(it.id);
    const src = c.type === 'COMPONENT_SET' ? (c.defaultVariant || c.children[0]) : c;
    const i = src.createInstance(); f.appendChild(i);
    if (it.props) { const map = {}; for (const [k, v] of Object.entries(it.props)) { const key = Object.keys(i.componentProperties).find(x => x.split('#')[0] === k); if (key) map[key] = v; } i.setProperties(map); }
  }
  if (isDark) await T.dark(f);
}
return { id: wrap.id, dark: hasDark, ...T.report() };
