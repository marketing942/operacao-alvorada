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

# A logo aparece com 172px no rodapé e 132px na navbar. 700px cobre telas 2x
# com folga; o original de 1362px eram 400 KB para mostrar um oitavo disso.
# Continua PNG, e não WebP, porque este arquivo também é a máscara CSS que
# recorta o brilho — não vale arriscar suporte a mask-image com WebP.
LARGURA_WEB = 700


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

    # O leão sai ANTES do downscale: ele vira marca d'água de 620px de altura,
    # e recortá-lo da versão já reduzida entregaria um emblema borrado.
    #
    # O corte procura o VÃO real entre o leão e o "C" de CPPEM — a primeira
    # coluna totalmente transparente depois do emblema. Cortar numa fração fixa
    # da largura (era 33%) deixava passar uma lasca do "C", que aparecia como um
    # risco vertical no favicon.
    alfa_col = np.asarray(out)[:, :, 3].max(axis=0)
    vazias = np.flatnonzero(alfa_col == 0)
    limite = int(out.width * 0.40)          # o leão nunca passa disso
    corte = next((int(x) for x in vazias if x < limite), limite)

    leao = out.crop((0, 0, corte, out.height))
    caixa_leao = leao.getbbox()
    if caixa_leao:
        leao = leao.crop(caixa_leao)
    leao.save(EMBLEMA)
    print(f"{EMBLEMA.name}: {leao.width}x{leao.height}")

    if out.width > LARGURA_WEB:
        altura = round(out.height * LARGURA_WEB / out.width)
        out = out.resize((LARGURA_WEB, altura), Image.LANCZOS)

    out.save(DESTINO)
    print(f"{DESTINO.name}: {out.width}x{out.height}")


if __name__ == "__main__":
    main()
