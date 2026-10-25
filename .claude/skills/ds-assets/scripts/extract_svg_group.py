"""Вырезает из SVG-экспорта Figma только группу иконки (без фона экрана/секции).

Использование:
    python3 -I extract_svg_group.py <in.svg> "<id группы>" <размер> <out.svg>
Пример:
    python3 -I extract_svg_group.py cart.svg "shopping-cart" 20 cart_clean.svg

id группы — имя слоя иконки в продукте, как оно записано в <g id="…"> экспорта (посмотреть: grep '<g id=' in.svg).

Пути внутри группы в экспорте Figma — в локальных координатах иконки (0..размер),
поэтому достаточно взять содержимое группы и обернуть новым <svg viewBox="0 0 N N">.
"""
import sys


def main() -> None:
    src, group_id, size, dst = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
    s = open(src, encoding="utf-8").read()
    marker = '<g id="' + group_id + '"'
    i = s.find(marker)
    if i < 0:
        sys.exit("group not found: " + group_id)
    rest = s[i:]
    body_start = rest.index(">") + 1
    # закрывающий тег группы: считаем вложенные <g>
    depth, pos = 1, body_start
    while depth:
        nxt_open = rest.find("<g", pos)
        nxt_close = rest.find("</g>", pos)
        if nxt_close < 0:
            sys.exit("unbalanced <g>")
        if 0 <= nxt_open < nxt_close:
            depth += 1
            pos = nxt_open + 2
        else:
            depth -= 1
            pos = nxt_close + 4
    body = rest[body_start:pos - 4]
    # <foreignObject> (фоновый блюр) Figma не импортирует — вырезать
    while "<foreignObject" in body:
        a = body.index("<foreignObject")
        b = body.index("</foreignObject>", a) + len("</foreignObject>")
        body = body[:a] + body[b:]
    out = (f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" fill="none" '
           f'xmlns="http://www.w3.org/2000/svg">{body}</svg>')
    open(dst, "w", encoding="utf-8").write(out)
    print(dst, len(out), "bytes,", body.count("<path"), "paths")


if __name__ == "__main__":
    main()
