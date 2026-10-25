// Лечение устаревшей отрисовки: данные узла верные, а превью/скриншот показывает старое
// (схлопнутые заголовки, съехавшие подписи, вылезшие подсказки клавиатуры).
// Способ 1 — свойства инстанса: другое значение и обратно (BOOLEAN, TEXT; VARIANT — с USE_VARIANTS).
// Способ 2 — раскладка: layoutSizingHorizontal FIXED → resize(+1) → обратно → исходный sizing.
// Только экземпляры на экранах. Внутри главных компонентов нативные kit-инстансы так не трогать.
// PARAMS: TARGET_IDS — инстансы или корни (экран, секция); NAME_FILTER — только инстансы с этим именем; USE_VARIANTS.
const { TARGET_IDS = [], NAME_FILTER = null, USE_VARIANTS = false } = PARAMS;
figma.skipInvisibleInstanceChildren = false;
await T.fonts();
const touched = [];
async function touch(inst) {
  const props = inst.componentProperties || {};
  let did = false;
  for (const [k, p] of Object.entries(props)) {
    if (p.type === 'BOOLEAN') { inst.setProperties({ [k]: !p.value }); inst.setProperties({ [k]: p.value }); did = true; }
    else if (p.type === 'TEXT') { inst.setProperties({ [k]: p.value + ' ' }); inst.setProperties({ [k]: p.value }); did = true; }
    else if (USE_VARIANTS && p.type === 'VARIANT') {
      const m = await inst.getMainComponentAsync(); const set = m && m.parent && m.parent.type === 'COMPONENT_SET' ? m.parent : null;
      const other = set ? set.componentPropertyDefinitions[k].variantOptions.find(o => o !== p.value) : null;
      if (other) { try { inst.setProperties({ [k]: other }); inst.setProperties({ [k]: p.value }); did = true; } catch (e) {} }
    }
  }
  if (!did && inst.parent && inst.parent.layoutMode && inst.parent.layoutMode !== 'NONE') {
    const hs = inst.layoutSizingHorizontal, w = inst.width, h = inst.height;
    inst.layoutSizingHorizontal = 'FIXED'; inst.resize(w + 1, h); inst.resize(w, h); inst.layoutSizingHorizontal = hs; did = true;
  }
  if (did) touched.push(inst.name + ' ' + inst.id);
}
for (const id of TARGET_IDS) {
  const n = await figma.getNodeByIdAsync(id);
  const ok = x => x.type === 'INSTANCE' && (!NAME_FILTER || x.name === NAME_FILTER);
  for (const i of ok(n) ? [n] : n.findAll(ok)) if (!i.removed) await touch(i);
}
return { touched: touched.length, sample: touched.slice(0, 30) };
