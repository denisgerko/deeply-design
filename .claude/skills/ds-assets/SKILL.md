---
name: ds-assets
description: Перенести картинки и иконки из Figma-файла продукта в рабочий файл — без фона, в исходном качестве, по конвенциям ДС (Images/*, Icons/*). Использовать, когда фиче нужна картинка или иконка, которой нет в рабочем файле / ДС.
---

# Перенос ассетов

Работать в scratchpad-папке сессии, каждая загрузка — в своей пустой подпапке. Python — с `-I`.
В режиме A (дубликат продукта) ассеты уже в файле — сначала искать там.

## Сначала проверить, есть ли уже

- Иконки: страница иконок, `figma.config.json` → `icons`; `search_design_system` по смыслу (не только по имени).
- Картинки: страница картинок, `figma.config.json` → `images`.
- Сомнение — временный фрейм с инстансами → скриншот → удалить. Сравнивать визуально.

## Картинки (raster)

**Не использовать export узла:** `download_assets` с export рендерит узел вместе с фоном родителя.

1. Снять структуру слоёв картинки в продукте (read-only, `ds-reference-screen/product-dump` +
   `relativeTransform`, `imageTransform`, `scaleMode`, `filters`, маски, `cornerSmoothing`).
2. `download_assets` (nodeId слоя) → `rawImages`. Скачать в scratchpad и сопоставить по хэшу:
   **imageHash Figma = SHA-1 байтов файла** (`shasum -a 1 файл`).
3. В рабочем файле — компонент `Images/<Раздел>/<имя>` с той же структурой слоёв (трансформации, радиусы, маски).
   Тени — effect style продукта; белые/цветные элементы — токены (`T.fill`). На слоях-картинках временная заливка.
4. `upload_assets` с `nodeIds` (порядок = порядок файлов) → POST каждого файла в `submitUrl`:
   ```bash
   curl -s -X POST -H "Content-Type: image/png" --data-binary @"/абсолютный/путь/file.png" "<submitUrl>"
   ```
   Пути только абсолютные (`cd … &&` действует лишь на первую команду цепочки).
5. Upload ставит `FILL` — вернуть точные параметры заливки: `ds-assets/image-paint TARGETS='[…]'`. Хэш тот же.
6. Превью ×2 на светлом и тёмном фоне (`ds-verify/preview`), сравнить со скриншотом продукта.

## Иконки (vector)

1. `download_assets` на инстанс иконки, `defaultFormat: "svg"`. SVG тоже содержит фон контекста —
   вырезать группу иконки: `python3 -I .claude/skills/ds-assets/scripts/extract_svg_group.py in.svg "<id группы>" <размер> out.svg`
   (размер viewBox = размер инстанса в продукте; `<foreignObject>` скрипт удаляет сам).
2. `upload_assets` (count N, `currentPageId` = страница иконок) → POST multipart:
   `curl -s -X POST -F "file=@/абс/путь/out.svg;type=image/svg+xml" "<submitUrl>"`.
   Каждый SVG становится фреймом; id — `placedOnNodeId` в ответе.
3. `ds-assets/icon-from-svg ICONS='[["id","Icons/…/name",false]]' TARGET_ID=…`: размер сетки, цвет и страница —
   `profile.icons`; обводки → контур, один слой `Vector` с цветом-токеном и constraints SCALE; двухцветные —
   `Base` + `Accent`. **Сначала посмотреть, как устроены иконки продукта** (product-dump одной иконки): если у
   продукта другая конвенция (обводки не контурятся, другое имя слоя) — повторить её, а не нашу.
4. Превью ×4 рядом с продуктовой иконкой.

## Регистрация

`figma.config.json` → `images.<Раздел>` (id компонентов + хэши) и `icons` (имя → id, дата).
