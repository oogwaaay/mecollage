#!/usr/bin/env python3
"""生成 Phase F-3 功能测试用图片（Python 3 + Pillow，零网络）。

输出目录默认：audit/evidence/phase-f/browser/fixtures/
同时写出 manifest.json（供 run-tests.mjs 读取尺寸/类型）。

用法：
  python3 scripts/functional-audit/make-fixtures.py [output_dir]
  python3 scripts/functional-audit/make-fixtures.py --force [output_dir]
"""

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def font(size: int):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # 老版本 Pillow
        return ImageFont.load_default()


def label(draw: ImageDraw.ImageDraw, xy, text, size=48, fill=(255, 255, 255, 255)):
    draw.text(xy, text, fill=fill, font=font(size), anchor="mm", stroke_width=3, stroke_fill=(0, 0, 0, 160))


def make_landscape(path: Path):
    """800x600：四象限不同色 + 定位标记（用于缩放/平移/裁剪的内容变化检测）。"""
    img = Image.new("RGB", (800, 600), (235, 235, 235))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, 400, 300], fill=(220, 50, 50))       # 左上 红
    draw.rectangle([400, 0, 800, 300], fill=(40, 160, 60))     # 右上 绿
    draw.rectangle([0, 300, 400, 600], fill=(40, 80, 200))     # 左下 蓝
    draw.rectangle([400, 300, 800, 600], fill=(235, 190, 40))  # 右下 黄
    draw.ellipse([180, 110, 240, 170], fill=(255, 255, 255))
    draw.ellipse([180, 110, 240, 170], outline=(0, 0, 0), width=5)
    draw.polygon([(600, 90), (660, 150), (600, 210), (540, 150)], fill=(0, 0, 0))
    label(draw, (200, 300), "LEFT", 64)
    label(draw, (600, 450), "RIGHT", 64)
    draw.line([(0, 0), (800, 600)], fill=(255, 255, 255), width=6)
    draw.line([(800, 0), (0, 600)], fill=(0, 0, 0), width=6)
    img.save(path)


def make_portrait(path: Path):
    """600x800：纵向渐变 + 顶部/底部标记。"""
    img = Image.new("RGB", (600, 800))
    draw = ImageDraw.Draw(img)
    for y in range(800):
        t = y / 799
        draw.line([(0, y), (600, y)], fill=(int(30 + 180 * t), int(160 - 120 * t), int(200 - 100 * t)))
    draw.rectangle([170, 40, 430, 120], fill=(255, 255, 255))
    label(draw, (300, 80), "TOP", 64, fill=(0, 0, 0))
    draw.ellipse([240, 340, 360, 460], fill=(255, 245, 60), outline=(0, 0, 0), width=6)
    label(draw, (300, 720), "BOTTOM", 56)
    img.save(path)


def make_wide(path: Path):
    """1920x1080：网格 + 四角标记（用于宽图的比例/模糊背景测试）。"""
    img = Image.new("RGB", (1920, 1080), (12, 18, 30))
    draw = ImageDraw.Draw(img)
    for x in range(0, 1920, 120):
        draw.line([(x, 0), (x, 1080)], fill=(45, 70, 110), width=2)
    for y in range(0, 1080, 120):
        draw.line([(0, y), (1920, y)], fill=(45, 70, 110), width=2)
    draw.rectangle([0, 0, 240, 180], fill=(230, 80, 60))
    draw.rectangle([1680, 0, 1920, 180], fill=(60, 200, 120))
    draw.rectangle([0, 900, 240, 1080], fill=(70, 130, 240))
    draw.rectangle([1680, 900, 1920, 1080], fill=(240, 210, 70))
    draw.ellipse([840, 420, 1080, 660], fill=(255, 255, 255))
    label(draw, (960, 540), "WIDE", 96, fill=(0, 0, 0))
    img.save(path)


def make_square(path: Path):
    """1024x1024：棋盘 + 中心十字（用于圆角/尺寸缩放测试）。"""
    img = Image.new("RGB", (1024, 1024), (245, 245, 245))
    draw = ImageDraw.Draw(img)
    cell = 128
    for row in range(8):
        for col in range(8):
            if (row + col) % 2 == 0:
                draw.rectangle([col * cell, row * cell, (col + 1) * cell, (row + 1) * cell], fill=(140, 170, 210))
    draw.line([(512, 0), (512, 1024)], fill=(220, 40, 40), width=16)
    draw.line([(0, 512), (1024, 512)], fill=(220, 40, 40), width=16)
    draw.ellipse([412, 412, 612, 612], fill=(255, 240, 80), outline=(20, 20, 20), width=8)
    img.save(path)


def make_transparent(path: Path):
    """800x600 RGBA：透明背景 + 不透明方块/圆（用于 PNG 透明/去除背景测试）。"""
    img = Image.new("RGBA", (800, 600), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([160, 120, 640, 480], radius=60, fill=(230, 60, 90, 255))
    draw.ellipse([340, 220, 460, 340], fill=(255, 255, 255, 255))
    draw.rectangle([0, 0, 80, 80], fill=(30, 200, 90, 255))  # 左上角：用于检查 alpha 边界
    draw.text((400, 300), "RGBA", fill=(255, 255, 255, 255), font=font(72), anchor="mm")
    img.save(path)


def make_photo(path: Path):
    """1200x900 JPEG：模拟照片渐变 + 形状（用于 JPG 上传与滤镜）。"""
    img = Image.new("RGB", (1200, 900))
    draw = ImageDraw.Draw(img)
    for y in range(900):
        t = y / 899
        draw.line([(0, y), (1200, y)], fill=(int(250 - 120 * t), int(140 + 70 * t), int(60 + 150 * t)))
    for i in range(14):
        cx = 120 + i * 80
        cy = 450 + int(220 * math.sin(i / 2))
        r = 40 + (i % 5) * 12
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255) if i % 2 else (20, 20, 20))
    draw.rectangle([60, 60, 240, 160], fill=(255, 255, 0))
    draw.text((1100, 820), "JPG", fill=(255, 255, 255), font=font(72), anchor="rm")
    img.save(path, quality=90)


def make_multi(dir_path: Path, count: int = 21):
    """320x240 小图，用于 1/3/5/20/21 张上传测试；每张颜色/编号不同。"""
    for index in range(1, count + 1):
        hue = (index * 37) % 360
        r, g, b = hue_to_rgb(hue)
        img = Image.new("RGB", (320, 240), (r, g, b))
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 0, 319, 239], outline=(255, 255, 255), width=8)
        draw.text((160, 120), f"{index:02d}", fill=(255, 255, 255), font=font(96), anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0))
        img.save(dir_path / f"multi-{index:02d}.png")


def hue_to_rgb(hue: float):
    h = hue / 60.0
    c = 0.8
    x = c * (1 - abs(h % 2 - 1))
    if h < 1:
        r, g, b = c, x, 0
    elif h < 2:
        r, g, b = x, c, 0
    elif h < 3:
        r, g, b = 0, c, x
    elif h < 4:
        r, g, b = 0, x, c
    elif h < 5:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x
    return tuple(int(255 * (v + 0.15) / 1.15) for v in (r, g, b))


def main():
    args = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    force = "--force" in sys.argv
    out_dir = Path(args[0]) if args else Path("audit/evidence/phase-f/browser/fixtures")
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = out_dir / "manifest.json"
    if manifest_path.exists() and not force:
        print(f"fixtures 已存在，跳过：{out_dir}（--force 可强制重建）")
        return

    make_landscape(out_dir / "landscape-800x600.png")
    make_portrait(out_dir / "portrait-600x800.png")
    make_wide(out_dir / "wide-1920x1080.png")
    make_square(out_dir / "square-1024x1024.png")
    make_transparent(out_dir / "transparent-800x600.png")
    make_photo(out_dir / "photo-1200x900.jpg")
    make_multi(out_dir, 21)

    files = []
    for path in sorted(out_dir.glob("*")):
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
            continue
        with Image.open(path) as image:
            files.append(
                {
                    "file": path.name,
                    "width": image.width,
                    "height": image.height,
                    "mode": image.mode,
                    "bytes": path.stat().st_size,
                }
            )
    manifest = {
        "generator": "Pillow",
        "directory": str(out_dir),
        "files": files,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f"已生成 {len(files)} 张测试图 → {out_dir}")


if __name__ == "__main__":
    main()
