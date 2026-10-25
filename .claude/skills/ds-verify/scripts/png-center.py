"""Пиксельная сверка: центр «чернил» (буква, иконка, подпись) против центра области.

Нужна, когда по данным Figma всё ровно, а на скриншоте съехало (клавиатура, центровка иконок).
Только стандартная библиотека (zlib, struct) — без pip.

Использование:
    python3 -I png-center.py shot.png x0 y0 x1 y1 [x0 y0 x1 y1 ...] [--thr 60] [--scale 2]

  shot.png   — PNG скриншота (get_screenshot → сохранить в scratchpad)
  x0..y1     — область в координатах ДИЗАЙНА (pt); --scale — во сколько раз PNG крупнее (обычно 1 или 2)
  --thr      — насколько пиксель должен отличаться от фона области, чтобы считаться «чернилами»

Фон области = самый частый цвет в ней. Вывод на область: центр области, центр чернил, сдвиг dx/dy в pt.
Сдвиг > 2 pt — баг, даже если данные узлов верные.
"""
import struct
import sys
import zlib
from collections import Counter


def load(path):
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        sys.exit("not a PNG: " + path)
    pos, idat = 8, b""
    w = h = ct = 0
    while pos < len(data):
        ln = struct.unpack(">I", data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            w, h, bd, ct = struct.unpack(">IIBB", chunk[:10])
            if bd != 8:
                sys.exit("only 8-bit PNG supported")
        elif typ == b"IDAT":
            idat += chunk
        pos += 12 + ln
    bpp = {2: 3, 6: 4, 0: 1, 4: 2}[ct]
    raw = zlib.decompress(idat)
    stride, rows, prev, i = w * bpp, [], bytearray(w * bpp), 0
    for _ in range(h):
        f = raw[i]
        i += 1
        cur = bytearray(raw[i:i + stride])
        i += stride
        for x in range(stride):
            a = cur[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if f == 1:
                cur[x] = (cur[x] + a) & 255
            elif f == 2:
                cur[x] = (cur[x] + b) & 255
            elif f == 3:
                cur[x] = (cur[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                cur[x] = (cur[x] + (a if pa <= pb and pa <= pc else (b if pb <= pc else c))) & 255
        rows.append(bytes(cur))
        prev = cur
    return w, h, bpp, rows


def px(rows, bpp, x, y):
    r = rows[y]
    if bpp >= 3:
        return r[x * bpp], r[x * bpp + 1], r[x * bpp + 2]
    return r[x * bpp], r[x * bpp], r[x * bpp]


def main():
    args = sys.argv[1:]
    thr, scale = 60, 1.0
    if "--thr" in args:
        k = args.index("--thr")
        thr = int(args[k + 1])
        del args[k:k + 2]
    if "--scale" in args:
        k = args.index("--scale")
        scale = float(args[k + 1])
        del args[k:k + 2]
    path, nums = args[0], [float(v) for v in args[1:]]
    if not nums or len(nums) % 4:
        sys.exit(__doc__)
    w, h, bpp, rows = load(path)
    for j in range(0, len(nums), 4):
        x0, y0, x1, y1 = [int(round(v * scale)) for v in nums[j:j + 4]]
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(w, x1), min(h, y1)
        cnt = Counter(px(rows, bpp, x, y) for y in range(y0, y1) for x in range(x0, x1))
        bg = cnt.most_common(1)[0][0]
        sx = sy = n = 0
        for y in range(y0, y1):
            for x in range(x0, x1):
                p = px(rows, bpp, x, y)
                if sum(abs(p[i] - bg[i]) for i in range(3)) > thr:
                    sx += x
                    sy += y
                    n += 1
        cx, cy = (x0 + x1 - 1) / 2, (y0 + y1 - 1) / 2
        box = " ".join(str(round(v, 1)) for v in nums[j:j + 4])
        if not n:
            print(f"[{box}] чернил не найдено (фон {bg}); уменьшите --thr")
            continue
        ix, iy = sx / n, sy / n
        print(f"[{box}] фон {bg} чернил {n}px  центр области {cx / scale:.1f},{cy / scale:.1f}  "
              f"центр чернил {ix / scale:.1f},{iy / scale:.1f}  dx {(ix - cx) / scale:+.1f} dy {(iy - cy) / scale:+.1f} pt")


if __name__ == "__main__":
    main()
