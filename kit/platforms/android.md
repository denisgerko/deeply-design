# Платформа: Android

Дополняет `CLAUDE.md`, когда `profile.platform = "android"`.

## Экран и системные элементы

- Экран — по продукту (`profile.screen.sizes`); если не задан — 360×800 (compact) / 412×915.
- Status bar сверху, navigation bar (жестовая полоска или 3 кнопки) снизу — как продукт рисует на макетах.
- Системный кит — «Material 3 Design Kit» (Google, community), если продукт на Material; иначе компоненты продукта.
  Ключи — `nativeKit.keys`. Kit красится своими токенами M3 — перекрашивать через обёртку на токены продукта.
- Edge-to-edge: контент под системными барами с отступами insets, как в продукте.

## Паттерны

- **Ввод текста:** поле в фокусе, клавиатура Gboard у низа (тип по полю), CTA / поле над клавиатурой.
- **Bottom sheet** — modal / standard как в продукте; полноэкранный диалог — full-screen dialog M3.
- **Меню** — dropdown / exposed dropdown menu; **диалоги** — basic dialog M3 или компонент продукта.
- **Snackbar** вместо тоста, если так в продукте. FAB — если есть в продукте.
- Кнопка «Назад» — системный жест; в top app bar стрелка «назад» слева.

## Источники

`m3.material.io` (guidelines), `developer.android.com` (Compose / Views), официальный Material 3 Design Kit.
