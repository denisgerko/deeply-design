"""Собирает готовый код для use_figma: CFG (figma.config.json → profile) + PARAMS + kit/runtime.js + скрипт.

Использование (из корня проекта):
    python3 -I kit/run.py <скрипт> [KEY=value ...] [-o out.js] [--no-keys]

  <скрипт>   путь к .js (можно коротко: ds-verify/token-audit или ds-verify/scripts/token-audit.js)
  KEY=value  параметры скрипта → PARAMS.KEY. value — JSON (["1:2","3:4"], true, 12, {"a":1}) или строка
  -o файл    записать в файл вместо stdout (удобно для длинных скриптов)
  --no-keys  не включать profile.keys (ключи библиотеки) — если скрипту они не нужны и код слишком длинный

Вывод передаётся в use_figma целиком как параметр code. Скрипты сами по себе (без run.py) не запускаются:
в них нет CFG, PARAMS и T.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def find_script(arg):
    cands = [arg, os.path.join(ROOT, arg), os.path.join(ROOT, ".claude", "skills", arg)]
    if "/" in arg and "scripts/" not in arg:
        skill, name = arg.split("/", 1)
        cands.append(os.path.join(ROOT, ".claude", "skills", skill, "scripts", name))
    for c in list(cands):
        if not c.endswith(".js"):
            cands.append(c + ".js")
    for c in cands:
        if os.path.isfile(c):
            return c
    sys.exit("скрипт не найден: " + arg)


def parse_value(v):
    try:
        return json.loads(v)
    except ValueError:
        return v


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        sys.exit(__doc__)
    out_path, no_keys, params, script = None, False, {}, None
    i = 0
    while i < len(args):
        a = args[i]
        if a == "-o":
            out_path = args[i + 1]
            i += 2
            continue
        if a == "--no-keys":
            no_keys = True
        elif script is None:
            script = find_script(a)
        elif "=" in a:
            k, v = a.split("=", 1)
            params[k] = parse_value(v)
        else:
            sys.exit("непонятный аргумент: " + a)
        i += 1

    cfg = json.load(open(os.path.join(ROOT, "figma.config.json"), encoding="utf-8"))
    profile = dict(cfg.get("profile", {}))
    if no_keys:
        profile.pop("keys", None)
    prof_json = json.dumps(profile, ensure_ascii=False)
    if "{{" in prof_json:
        print("ВНИМАНИЕ: в profile остались {{…}} — сначала скил ds-setup", file=sys.stderr)

    body = open(script, encoding="utf-8").read()
    runtime = open(os.path.join(ROOT, "kit", "runtime.js"), encoding="utf-8").read()

    used = set(re.findall(r"\bPARAMS\.([A-Z_][A-Z0-9_]*)", body))
    for m in re.finditer(r"const\s*\{([^}]*)\}\s*=\s*PARAMS", body):
        used |= {p.split("=")[0].strip() for p in m.group(1).split(",") if p.strip()}
    unknown = set(params) - used
    if unknown:
        print("ВНИМАНИЕ: скрипт не читает параметры: " + ", ".join(sorted(unknown)), file=sys.stderr)
    if "ЗАМЕНИТЬ" in json.dumps(params, ensure_ascii=False):
        print("ВНИМАНИЕ: в параметрах осталось ЗАМЕНИТЬ", file=sys.stderr)

    rel = os.path.relpath(script, ROOT)
    code = ("const CFG = " + prof_json + ";\n"
            "const PARAMS = " + json.dumps(params, ensure_ascii=False) + ";\n"
            + runtime + "\n// ===== " + rel + "\n" + body)
    if out_path:
        open(out_path, "w", encoding="utf-8").write(code)
        print(out_path, len(code), "chars", file=sys.stderr)
    else:
        sys.stdout.write(code)


if __name__ == "__main__":
    main()
