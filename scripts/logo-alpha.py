"""
Gera public/logo-cppem.png: a logo do CPPEM com o fundo preto virando
transparência de verdade.

Por que existe: o logotipobepi.png é ouro chapado sobre um retângulo preto
opaco. Na página isso obrigava um `mix-blend-mode: lighten` para "sumir" com o
fundo — truque que funciona para a cor, mas não para a geometria: qualquer
camada por cima (o brilho que passa pela logo) continuava enxergando o
retângulo inteiro e aparecia como um quadrado fantasma.

Como: o fundo é preto puro, então a luminância serve de máscara de alfa
direta. Depois de extrair o alfa, a cor é des-premultiplicada (dividida pelo
alfa) para o ouro voltar à saturação cheia nas bordas antisserrilhadas — sem
isso as bordas ficariam com um halo escuro.
"""

from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "public" / "logotipobepi.png"
DESTINO = RAIZ / "public" / "logo-cppem.png"
EMBLEMA = RAIZ / "public" / "emblema-leao.png"

# Abaixo disso é fundo, não desenho: mata a sujeira de compressão do preto.
PISO = 0.06
# Acima disso o traço é considerado sólido, para o miolo da logo não ficar
# translúcido só porque o ouro não é branco.
TETO = 0.62


def main() -> None:
    img = Image.open(ORIGEM).convert("RGB")
    rgb = np.asarray(img).astype(np.float32) / 255.0

    # O fundo é preto puro: o canal mais forte de cada pixel já é a cobertura.
    alfa = rgb.max(axis=2)
    alfa = np.clip((alfa - PISO) / (TETO - PISO), 0.0, 1.0)

    # Des-premultiplica: sem isso a borda antisserrilhada carrega o preto junto.
    seguro = np.maximum(alfa, 1e-4)[..., None]
    cor = np.clip(rgb / seguro, 0.0, 1.0)
    cor = np.where(alfa[..., None] > 0, cor, 0.0)

    saida = np.concatenate([cor, alfa[..., None]], axis=2)
    out = Image.fromarray((saida * 255.0 + 0.5).astype(np.uint8), mode="RGBA")

    # Recorta a moldura vazia: a caixa passa a ser a logo, não a arte inteira.
    caixa = out.getbbox()
    if caixa:
        out = out.crop(caixa)

    out.save(DESTINO)
    print(f"{DESTINO.name}: {out.width}x{out.height}")

    # Só a cabeça do leão, para servir de marca d'água no fundo das seções.
    leao = out.crop((0, 0, int(out.width * 0.33), out.height))
    caixa_leao = leao.getbbox()
    if caixa_leao:
        leao = leao.crop(caixa_leao)
    leao.save(EMBLEMA)
    print(f"{EMBLEMA.name}: {leao.width}x{leao.height}")


if __name__ == "__main__":
    main()
