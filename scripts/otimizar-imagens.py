"""
Gera os derivados web das imagens da landing.

Por que existe: as fotos das edições anteriores são originais de câmera —
6000x3368, 6 a 8 MB cada. Na página elas aparecem, no maior caso, com 1180 CSS
px de largura. Subir os originais significaria 45 MB de download para mostrar
o equivalente a ~1 MB de pixels, com o LCP no chão em conexão móvel.

Os originais continuam no repositório como fonte; quem vai para produção é o
derivado `.webp` ao lado (e o `.vercelignore` mantém o original fora do deploy).

Larguras escolhidas a partir do tamanho de exibição real no grid de 1180px,
com folga para telas 2x:

    faixa larga (span 4)   1180 css px  ->  1800
    destaque   (span 2x2)   586 css px  ->  1200
    células    (span 1)     283 css px  ->   700
    retrato do mentor       370 css px  ->   900

Uso:  python scripts/otimizar-imagens.py
"""

from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
PUBLIC = RAIZ / "public"

QUALIDADE = 80

# (arquivo de origem, largura máxima do derivado)
TRABALHOS = [
    ("IMG_5428.JPG", 1200),            # destaque do grid, 2x2
    ("20170508-IMG_5551.jpg", 700),
    ("20170508-IMG_5694.jpg", 700),
    ("20170508-IMG_5746.jpg", 700),
    ("20170508-IMG_5770.jpg", 700),
    ("20170508-IMG_5972.jpg", 1800),   # faixa larga, ocupa as 4 colunas
    ("everton-mentor.jpg", 900),
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
