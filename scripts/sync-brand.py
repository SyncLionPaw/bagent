#!/usr/bin/env python3
"""从根目录 image.png 生成 docs/public 下的 logo 与 favicon。"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "image.png"
OUT = ROOT / "docs" / "public"


def square_crop(img: Image.Image) -> Image.Image:
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def save_png(img: Image.Image, path: Path, size: int) -> None:
    out = img.copy()
    out.thumbnail((size, size), Image.Resampling.LANCZOS)
    out.save(path, "PNG", optimize=True)


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"缺少源图: {SRC}")

    OUT.mkdir(parents=True, exist_ok=True)
    base = square_crop(Image.open(SRC).convert("RGBA"))

    hero = base.copy()
    hero.thumbnail((512, 512), Image.Resampling.LANCZOS)
    hero.save(OUT / "logo.png", "PNG", optimize=True)

    save_png(base, OUT / "favicon-32.png", 32)
    save_png(base, OUT / "logo-icon.png", 128)
    save_png(base, OUT / "apple-touch-icon.png", 180)

    plugin_media = ROOT / "lessons" / "53-diff-preview" / "media"
    plugin_media.mkdir(parents=True, exist_ok=True)
    save_png(base, plugin_media / "icon.png", 128)
    save_png(base, plugin_media / "sidebar-icon.png", 24)

    ico_src = base.copy()
    ico_src.thumbnail((48, 48), Image.Resampling.LANCZOS)
    ico_src.save(OUT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

    print(f"brand assets → {OUT}")


if __name__ == "__main__":
    main()
