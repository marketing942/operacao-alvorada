"""
Gera os ativos de compartilhamento e o favicon.

FAVICON — por que quadrado
    O favicon apontava para `logo-cppem.png`, que é 700x239 (proporção 2.9:1).
    O Google exige um favicon QUADRADO e com lado múltiplo de 48px; fora disso
    ele descarta e mostra o globo cinza genérico no resultado de busca. Era
    exatamente o que estava acontecendo.

    O leão sai sobre o preto da marca em vez de transparente: em resultado de
    busca com tema claro, ouro sobre branco quase some.

CARTÃO SOCIAL — por que via navegador
    O og:image é montado a partir de scripts/og-card.html, renderizado pelo
    Chrome, e não desenhado aqui com PIL. O motivo é a tipografia: o card usa
    Oxanium e Rajdhani, as fontes da marca, que o navegador busca do Google
    Fonts. Desenhar com PIL exigiria os arquivos .ttf e ainda assim erraria
    kerning e o degradê do ouro.

Uso:  python scripts/gerar-social.py
"""

import subprocess
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
PUBLIC = RAIZ / "public"

FUNDO = (10, 10, 11)          # --bg do site
TAMANHOS = [48, 96, 192, 512]  # múltiplos de 48, como o Google pede
MARGEM = 0.12                  # respiro em volta do leão, em fração do lado

CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")


def favicons() -> None:
    leao = Image.open(PUBLIC / "emblema-leao.png").convert("RGBA")

    for lado in TAMANHOS:
        util = round(lado * (1 - 2 * MARGEM))
        escala = min(util / leao.width, util / leao.height)
        arte = leao.resize(
            (max(1, round(leao.width * escala)), max(1, round(leao.height * escala))),
            Image.LANCZOS,
        )

        tela = Image.new("RGBA", (lado, lado), FUNDO + (255,))
        tela.alpha_composite(arte, ((lado - arte.width) // 2, (lado - arte.height) // 2))
        tela.convert("RGB").save(PUBLIC / f"favicon-{lado}.png")
        print(f"  favicon-{lado}.png")

    # .ico com as resoluções pequenas, para navegadores e abas antigas
    base = Image.open(PUBLIC / "favicon-512.png")
    base.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("  favicon.ico")


def cartao_social() -> None:
    origem = (RAIZ / "scripts" / "og-card.html").resolve()
    bruto = PUBLIC / "_og-bruto.png"
    destino = PUBLIC / "og-alvorada.jpg"

    if not CHROME.exists():
        print(f"  ! Chrome não encontrado em {CHROME}; og:image não regerado")
        return

    subprocess.run(
        [
            str(CHROME), "--headless=new", "--disable-gpu", "--hide-scrollbars",
            "--window-size=1200,630", "--virtual-time-budget=6000",
            f"--screenshot={bruto}", origem.as_uri(),
        ],
        check=True, capture_output=True,
    )

    # JPEG, e não o PNG do screenshot: a foto de fundo é degradê e ruído, onde o
    # PNG fica em ~420 KB. As redes buscam este arquivo a cada compartilhamento,
    # e todas aceitam JPEG — WebP nem todas.
    Image.open(bruto).convert("RGB").save(destino, "JPEG", quality=88, optimize=True, progressive=True)
    bruto.unlink()
    print(f"  og-alvorada.jpg ({destino.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    favicons()
    cartao_social()
