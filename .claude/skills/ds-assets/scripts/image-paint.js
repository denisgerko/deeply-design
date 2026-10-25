// После upload_assets: вернуть точные параметры IMAGE-заливки как в продукте (upload ставит FILL).
// Хэш берётся из уже загруженной заливки (он равен продуктовому — SHA-1 файла).
// PARAMS: TARGETS — [{ id, scaleMode, imageTransform?, filters? }] из read-only дампа продукта.
const { TARGETS = [] } = PARAMS;
const F0 = { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 };
const out = [];
for (const t of TARGETS) {
  const n = await figma.getNodeByIdAsync(t.id);
  const img = n.fills.find(f => f.type === 'IMAGE');
  if (!img) { out.push(t.id + ': нет IMAGE-заливки'); continue; }
  const p = { type: 'IMAGE', imageHash: img.imageHash, visible: true, opacity: 1, blendMode: 'NORMAL', scaleMode: t.scaleMode || 'FILL', filters: Object.assign({}, F0, t.filters || {}) };
  if (t.imageTransform) p.imageTransform = t.imageTransform;
  n.fills = [p];
  out.push(n.name + ' ' + img.imageHash.slice(0, 8) + ' ' + p.scaleMode);
}
return out;
