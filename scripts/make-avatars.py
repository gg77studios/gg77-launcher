#!/usr/bin/env python3
"""Gera os avatares prontos da loja (256x256) a partir da arte dos jogos.

    python3 scripts/make-avatars.py <idle-dir> <tribos-art-dir> <corre-chars-dir> [launcher-sheet]

- idle-dir: ícones de client/src/assets do Legendforge, baixados com o nome
  "<pasta>_<sub>_<arquivo>" (enemies_icons_kitsune.png, heroes_icons_warrior_icon.png).
- tribos-art-dir: art/gemini do Clanfall (folhas clans_units_a_v3.jpg e _b_v3.jpg, fundo magenta).
- corre-chars-dir: client/src/assets/chars do No Corre (player.png e cliente.png, 9x3 quadros de 40 px).

- launcher-sheet (opcional): folha do Gemini com os 12 retratos do launcher, grade 4x3 sobre magenta,
  na ordem de LAUNCHER_NAMES.

Saída em public/games/<jogo>/avatars/. Precisa de Pillow.
"""
import math
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "games")
SIZE = 256


def backdrop(inner, outer):
    """Fundo com degradê radial: o retrato não fica num quadrado chapado."""
    bg = Image.new("RGB", (SIZE, SIZE), outer)
    draw = ImageDraw.Draw(bg)
    steps = 48
    for i in range(steps, 0, -1):
        t = i / steps
        r = int(SIZE * 0.75 * t)
        c = tuple(int(inner[k] * (1 - t) + outer[k] * t) for k in range(3))
        draw.ellipse((SIZE / 2 - r, SIZE * 0.42 - r, SIZE / 2 + r, SIZE * 0.42 + r), fill=c)
    return bg


def key_magenta(im):
    """Fundo magenta da folha do Gemini vira transparente, com a borda suavizada e sem respingo rosa."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            d = math.sqrt((r - 255) ** 2 + g**2 + (b - 255) ** 2)
            a = max(0.0, min(1.0, (d - 70) / 90))
            if a < 1 and r > g and b > g:
                # tira o rosa da borda: puxa vermelho e azul para perto do verde
                r = g + (r - g) * 0.35
                b = g + (b - g) * 0.35
            px[x, y] = (int(r), g, int(b), int(a * 255))
    return im


def save(img, game, name, fmt="png"):
    os.makedirs(os.path.join(OUT, game, "avatars"), exist_ok=True)
    path = os.path.join(OUT, game, "avatars", f"{name}.{fmt}")
    if fmt == "jpg":
        img.convert("RGB").save(path, quality=88, optimize=True)
    else:
        img.save(path, optimize=True)
    print(path)


def tribos(art):
    # (folha, centro x da cabeça, y da cabeça, nome) em pixels da folha 2752x1536
    heads = [
        ("clans_units_a_v3.jpg", 353, 268, "lobo"),
        ("clans_units_a_v3.jpg", 931, 289, "lanceiro"),
        ("clans_units_a_v3.jpg", 1402, 289, "sacerdote"),
        ("clans_units_a_v3.jpg", 1915, 289, "sombra"),
        ("clans_units_a_v3.jpg", 2450, 268, "musgo"),
        ("clans_units_b_v3.jpg", 385, 342, "sentinela"),
        ("clans_units_b_v3.jpg", 1049, 321, "corvo"),
        ("clans_units_b_v3.jpg", 1723, 310, "geada"),
        ("clans_units_b_v3.jpg", 2408, 321, "saqueador"),
    ]
    sheets = {}
    for sheet, cx, cy, name in heads:
        if sheet not in sheets:
            sheets[sheet] = Image.open(os.path.join(art, sheet))
        side = 440
        top = cy - 150
        crop = key_magenta(sheets[sheet].crop((cx - side // 2, top, cx + side // 2, top + side))).resize((SIZE, SIZE), Image.LANCZOS)
        bg = backdrop((92, 74, 52), (24, 20, 16))
        bg.paste(crop, (0, 0), crop)
        save(bg, "tribos", name, "jpg")


def idle(src):
    heroes = [("heroes_icons_warrior_icon.png", "guerreiro"), ("heroes_icons_rogue_icon.png", "ladina")]
    for f, name in heroes:
        im = Image.open(os.path.join(src, f)).convert("RGBA")
        w, h = im.size
        # o retrato do herói tem uma moldura de madeira própria: corta 9% de cada lado
        s = int(min(w, h) * 0.82)
        x0, y0 = (w - s) // 2, (h - s) // 2
        im = im.crop((x0, y0, x0 + s, y0 + s)).resize((SIZE, SIZE), Image.NEAREST)
        save(im, "idle-legends", name)
    # os ícones de inimigo vêm num medalhão: corta o miolo para a moldura da loja não brigar com a do jogo
    enemies = [
        "goblin",
        "lobo_das_neves",
        "kitsune",
        "yurei",
        "apparition",
        "jarl_de_gelo",
        "valquiria_caida",
        "oni_shogun",
        "lich_lord",
        "ember_dragon",
    ]
    for e in enemies:
        im = Image.open(os.path.join(src, f"enemies_icons_{e}.png")).convert("RGBA")
        w, h = im.size
        m = int(w * 0.215)
        im = im.crop((m, m, w - m, h - m)).resize((SIZE, SIZE), Image.NEAREST)
        save(im, "idle-legends", e.replace("_", "-"))


def corre(src):
    looks = [("player.png", "cozinheiro", (255, 176, 32)), ("cliente.png", "cliente", (110, 190, 90))]
    for f, name, tone in looks:
        sheet = Image.open(os.path.join(src, f)).convert("RGBA")
        head = sheet.crop((10, 4, 30, 24)).resize((240, 240), Image.NEAREST)
        bg = Image.new("RGB", (SIZE, SIZE), tuple(int(c * 0.55) for c in tone))
        ImageDraw.Draw(bg).ellipse((28, 20, 228, 220), fill=tone)
        bg.paste(head, (8, 16), head)
        save(bg, "corre", name)


LAUNCHER_NAMES = ["cavaleira", "mago", "bardo", "ferreira", "arqueira", "taverneiro", "ladino", "cleriga", "orc", "gato", "golem", "dragao"]


def runs(values, threshold=0.25, min_len=30):
    out, start = [], None
    for i, v in enumerate(values):
        if v > threshold and start is None:
            start = i
        if v <= threshold and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(values)))
    return [r for r in out if r[1] - r[0] > min_len]


def launcher(sheet_path):
    """Acha a grade pelos vãos magenta e corta cada retrato no quadrado central."""
    im = Image.open(sheet_path).convert("RGB")
    w, h = im.size
    px = im.load()

    def mag(p):
        return p[0] > 180 and p[2] > 180 and p[1] < 90

    cols = runs([sum(not mag(px[x, y]) for y in range(0, h, 4)) / (h / 4) for x in range(w)])
    rows = runs([sum(not mag(px[x, y]) for x in range(0, w, 4)) / (w / 4) for y in range(h)])
    tiles = [(c, r) for r in rows for c in cols]
    if len(tiles) != len(LAUNCHER_NAMES):
        sys.exit(f"esperava {len(LAUNCHER_NAMES)} retratos, achei {len(tiles)}")
    for (c, r), name in zip(tiles, LAUNCHER_NAMES):
        side = int(min(c[1] - c[0], r[1] - r[0]) * 0.94)
        cx, cy = (c[0] + c[1]) // 2, (r[0] + r[1]) // 2
        crop = im.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)).resize((SIZE, SIZE), Image.LANCZOS)
        save(crop, "launcher", name, "jpg")


if __name__ == "__main__":
    if len(sys.argv) not in (4, 5):
        sys.exit(__doc__)
    idle(sys.argv[1])
    tribos(sys.argv[2])
    corre(sys.argv[3])
    if len(sys.argv) == 5:
        launcher(sys.argv[4])
