"""
Gera public/brasao-alvorada.png: o brasão da Operação Alvorada com o fundo
preto virando transparência.

POR QUE NÃO DEU PARA USAR O TRUQUE DA LOGO DO CPPEM
    Em logo-alpha.py o alfa sai direto da luminância, porque lá o desenho é
    todo dourado sobre preto. Aqui não dá: as coronhas dos fuzis e as bordas do
    escudo são cinza-escuro, quase da cor do fundo. Um corte por luminância
    comeria metade da arte junto com o fundo.

COMO ESTE FUNCIONA
    O fundo é uma região escura CONECTADA à borda da imagem; a arte é um bloco
    no meio. Então o critério não é "é escuro?", e sim "é escuro E dá para
    chegar nele a partir da borda?". Um flood fill a partir dos quatro cantos
    marca exatamente o fundo e deixa intactas as partes escuras que estão
    cercadas por arte.

    A máscara ganha um desfoque de 1px no fim para a borda não ficar serrilhada.

Uso:  python scripts/brasao-alpha.py
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
PUBLIC = RAIZ / "public"
ORIGEM = PUBLIC / "operacaoalvoradalogo.jpeg"
DESTINO = PUBLIC / "brasao-alvorada.png"

# Abaixo disto o pixel é candidato a fundo. O fundo do arquivo vive por volta
# de 8–14; a arte mais escura (coronha) fica acima de 30.
LIMIAR = 26
LARGURA_WEB = 700


def main() -> None:
    img = Image.open(ORIGEM).convert("RGB")
    arr = np.asarray(img).astype(np.int16)
    lum = arr.max(axis=2)
    h, w = lum.shape

    escuro = lum <= LIMIAR
    fundo = np.zeros_like(escuro, dtype=bool)

    # Flood fill iterativo a partir de toda a moldura da imagem.
    fila = deque()
    for x in range(w):
        for y in (0, h - 1):
            if escuro[y, x] and not fundo[y, x]:
                fundo[y, x] = True
                fila.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if escuro[y, x] and not fundo[y, x]:
                fundo[y, x] = True
                fila.append((y, x))

    while fila:
        y, x = fila.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and escuro[ny, nx] and not fundo[ny, nx]:
                fundo[ny, nx] = True
                fila.append((ny, nx))

    alfa = np.where(fundo, 0, 255).astype(np.uint8)
    mascara = Image.fromarray(alfa, mode="L").filter(ImageFilter.GaussianBlur(1.0))

    out = img.convert("RGBA")
    out.putalpha(mascara)

    caixa = out.getbbox()
    if caixa:
        out = out.crop(caixa)

    if out.width > LARGURA_WEB:
        altura = round(out.height * LARGURA_WEB / out.width)
        out = out.resize((LARGURA_WEB, altura), Image.LANCZOS)

    out.save(DESTINO)
    cobertura = 100 * (1 - fundo.mean())
    print(f"  {DESTINO.name}: {out.width}x{out.height} | arte ocupa {cobertura:.1f}% do quadrado")


if __name__ == "__main__":
    main()
