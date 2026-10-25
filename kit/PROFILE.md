# Профиль продукта (`figma.config.json` → `profile`)

Единственное место, где описано, **как устроена ДС конкретного продукта**. Скрипты из `.claude/skills/*/scripts`
не содержат ни одного имени токена, компонента или слоя: всё берут отсюда через `kit/runtime.js` (`T.*`).
Заполняет скил `ds-setup` (черновик — `ds-setup/scripts/profile-detect.js`), правится по ходу работы.

Все имена — **точные имена** переменных / стилей как в Figma (с группами через `/`).

## Поля

| Поле | Что | Пример |
|------|-----|--------|
| `platform` | `ios` · `android` · `web` · `other`. Определяет файл правил `kit/platforms/<platform>.md` | `"ios"` |
| `screen.sizes` | Размеры экранов продукта `[w, h]` — по ним скрипты узнают экраны | `[[390, 844]]`, `[[360, 800]]`, `[[1440, 1024]]` |
| `screen.tolerance` | Допуск по ширине при поиске экранов | `60` |
| `fonts` | Все начертания, которые грузить перед работой с текстом | `[["Inter","Regular"],["Inter","Semi Bold"]]` |
| `color.system` | Как в продукте заданы цвета: `variables` · `styles` · `raw` (токенов нет) | `"variables"` |
| `color.collections` | Коллекции цветов по приоритету (если одно имя есть в двух коллекциях) | `["Semantic", "Primitives"]` |
| `colors` | **Роли цвета → имя токена.** Скрипты кита просят роль (`T.C('accent')`), а не имя | `{"screenBg":"bg/primary","accent":"brand/500"}` |
| `text` | Роли текста → имя text style | `{"body":"Body/Regular","title":"Heading/H2"}` |
| `spacing.map` | Значение → имя FLOAT-переменной отступа | `{"4":"space/xs","8":"space/s","16":"space/m"}` |
| `radius.map` | Значение → имя переменной радиуса; `full` — «пилюля» | `{"8":"radius/s","full":"radius/full"}` |
| `effects` | Роли эффектов → effect style | `{"card":"Shadow/Card","sheet":"Shadow/Sheet"}` |
| `dark.strategy` | Как делается тёмная тема (см. ниже) | `"variable-modes"` |
| `dark.collections` | Для `variable-modes`: `[{collection, mode, anchor}]`; `anchor` — любая переменная коллекции (нужна, если коллекция в библиотеке) | `[{"collection":"Semantic","mode":"Dark","anchor":"bg/primary"}]` |
| `dark.styleMap` | Для `style-swap`: замены в именах стилей | `[["Light/","Dark/"]]` |
| `roles` | Роли слоёв экрана → регулярки имён (дополняют/перекрывают встроенные) | `{"navBar":["^Шапка","^Header/"],"cta":["^Bottom CTA"]}` |
| `skipInside` | Регулярки имён слоёв/компонентов, внутрь которых аудит не смотрит (нативный кит, картинки) | `["^iOS/","^Illustrations/"]` |
| `materials` | Стекло/блюр-материал, если есть в ДС; иначе `null` | `{"names":["^Glass"],"innerLayers":["Glass Effect"],"variantProp":"Corner"}` |
| `icons` | Страница иконок, размер сетки, цвет и второй цвет | `{"page":"Icons","size":24,"color":"icon/primary","accent":"brand/500"}` |
| `pages.divider` | Страница-разделитель «компоненты \| экраны» в рабочем файле | `"---"` |
| `pages.components` | Страницы компонентов рабочего файла (для порядка и аудита) | `["Buttons","Inputs"]` |
| `flow` | Стрелки и заметки флоу: id шаблона-коннектора, цвета (имена токенов), стили заметок | — |
| `keys` | Только режим B (ДС — библиотека): `{variables:{имя:key}, styles:{имя:key}}`. Только нужные префиксы | — |

## Тёмная тема — `dark.strategy`

| Значение | Когда | Что делает `T.dark(узел)` |
|----------|-------|---------------------------|
| `variable-modes` | Цвета на переменных, у коллекции есть режим Dark | ставит режим Dark на узел (все дети наследуют) |
| `style-swap` | Цвета на paint styles парами `Light/…` ↔ `Dark/…` | проходит по дереву и меняет стили по `styleMap` |
| `both` | Переменные + часть на стилях (например тени) | оба действия |
| `none` | Тёмной темы в продукте нет | dark-копии не делаются, в отчётах «dark: нет в продукте» |

## Роли слоёв (встроенные)

`statusBar, homeIndicator, keyboard, pageSheet, dimming, sheet, modal, toast, menu, navBar, tabBar, inputBar, cta,
fab, feed, emptyState, loader, content`. Встроенные регулярки — английские имена (`Navigation Bar`, `Tab Bar`,
`Bottom Sheet`, `Content`…). Если в продукте слои называются иначе («Шапка», `Header/Main`) — добавить в `roles`.
Профиль проверяется первым, затем встроенные.

## Три типовых профиля

**Переменные + режимы (Figma 2023+):** `color.system = variables`, `dark.strategy = variable-modes`,
`spacing.map` / `radius.map` из FLOAT-переменных.

**Только стили (старые ДС):** `color.system = styles`, `colors` указывают на имена paint styles,
`dark.strategy = style-swap` с `styleMap`, `spacing.map = {}` (отступы сырые — норма, не нарушение).

**Без токенов:** `color.system = raw`, `colors` — hex (`"#1A1A1A"`). Аудит цвета отключается, все значения
пишутся в `decisions.rawValues`. Предложить пользователю завести палитру (вопрос структуры — спросить).
