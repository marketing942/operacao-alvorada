"""
Gera os derivados web das imagens da landing.

Por que existe: as fotos das edições anteriores são originais de câmera —
6000x3368, 6 a 8 MB cada. Na página elas aparecem, no maior caso, com 1180 CSS
px de largura. Subir os originais significaria 45 MB de download para mostrar
o equivalente a ~1 MB de pixels, com o LCP no chão em conexão móvel.

Os originais continuam no repositório como fonte; quem vai para produção é o
derivado `.webp` ao lado (e o `.vercelignore` mantém o original fora do deploy).

Larguras conferidas com emulação de dispositivo (320/360/390/414/768/1440 px,
dpr 1 a 3). O caso que manda não é o desktop: é o tablet em 768 px com dpr 2,
onde a grade cai para 2 colunas e o destaque passa a ocupar a largura toda.

    faixa larga (span 4)   1180 css px @2x  ->  2200
    destaque   (span 2x2)   724 css px @2x  ->  1500
    células    (span 1)     362 css px @2x  ->   800
    retrato do mentor       328 css px @3x  ->  1000

Uso:  python scripts/otimizar-imagens.py
"""

from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
PUBLIC = RAIZ / "public"

QUALIDADE = 80

# (arquivo de origem, largura máxima do derivado)
TRABALHOS = [
    ("IMG_5428.JPG", 1500),            # destaque do grid, 2x2
    ("20170508-IMG_5551.jpg", 800),
    ("20170508-IMG_5694.jpg", 800),
    ("20170508-IMG_5746.jpg", 800),
    ("20170508-IMG_5770.jpg", 800),
    ("20170508-IMG_5972.jpg", 2200),   # faixa larga, ocupa as 4 colunas
    ("everton-mentor.jpg", 1000),
    # Camisa do VIP: ocupa até 560 css px na faixa dentro de #ingressos, e em
    # tela 2x isso pede 1120 — 1200 dá folga.
    ("blusaspremium.jpeg", 1200),
    # Brasão da Operação já recortado por scripts/brasao-alpha.py. Aparece na
    # hero com até 210 css px, e em telas 3x isso pede 630 — 700 dá folga.
    ("brasao-alvorada.png", 700),
    # PNGs com alfa: o WebP preserva a transparência e corta ~85% do peso
    ("intermediario.png", 700),
    ("emblema-leao.png", 700),
]


def humano(n: int) -> str:
    return f"{n / 1024:.0f} KB" if n < 1048576 else f"{n / 1048576:.1f} MB"


def main() -> None:
    antes = depois = 0

    for nome, largura in TRABALHOS:
        origem = PUBLIC / nome
        if not origem.exists():
            print(f"  ! {nome} não encontrado, pulando")
            continue

        destino = PUBLIC / (origem.stem + ".webp")
        img = Image.open(origem)

        # Preserva o alfa dos emblemas; o resto vai em RGB.
        img = img.convert("RGBA" if "A" in img.getbands() else "RGB")

        if img.width > largura:
            altura = round(img.height * largura / img.width)
            img = img.resize((largura, altura), Image.LANCZOS)

        img.save(destino, "WEBP", quality=QUALIDADE, method=6)

        o, d = origem.stat().st_size, destino.stat().st_size
        antes += o
        depois += d
        print(f"  {nome:<26} {humano(o):>9} -> {humano(d):>9}  ({img.width}px)")

    corte = (1 - depois / antes) * 100 if antes else 0
    print(f"\n  total: {humano(antes)} -> {humano(depois)}  (-{corte:.1f}%)")


if __name__ == "__main__":
    main()
