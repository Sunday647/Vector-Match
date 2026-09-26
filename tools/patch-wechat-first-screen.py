import json
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build" / "wechatgame"


def font(size: int):
    for path in (
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default()


def text_center(draw, box, text, font_obj, fill):
    bbox = draw.textbbox((0, 0), text, font=font_obj)
    x = box[0] + (box[2] - box[0] - (bbox[2] - bbox[0])) / 2
    y = box[1] + (box[3] - box[1] - (bbox[3] - bbox[1])) / 2 - bbox[1]
    draw.text((x, y), text, font=font_obj, fill=fill)


def make_logo():
    im = Image.new("RGBA", (720, 620), (0, 0, 0, 0))
    logo = Image.open(ROOT / "assets" / "resources" / "ui" / "logo.png").convert("RGBA")
    cat = Image.open(ROOT / "assets" / "resources" / "ui" / "cat.png").convert("RGBA")
    logo.thumbnail((660, 260), Image.Resampling.LANCZOS)
    cat.thumbnail((470, 330), Image.Resampling.LANCZOS)
    im.alpha_composite(logo, ((720 - logo.width) // 2, 18))
    im.alpha_composite(cat, ((720 - cat.width) // 2, 260))
    im.quantize(colors=64, method=Image.Quantize.FASTOCTREE).save(BUILD / "logo.png", optimize=True)


def make_slogan():
    im = Image.new("RGBA", (640, 92), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    text_center(d, (0, 0, 640, 92), "加载中 · 正在铺开彩线", font(33), (147, 160, 137, 255))
    im.save(BUILD / "slogan.png", optimize=True)


def patch_first_screen():
    path = BUILD / "first-screen.js"
    text = path.read_text()
    replacements = {
        "let progressBarColor = [61 / 255, 197 / 255, 222 / 255, 1];": "let progressBarColor = [130 / 255, 152 / 255, 116 / 255, 1];",
        "let progressBackground = [100 / 255, 111 / 255, 118 / 255, 1];": "let progressBackground = [223 / 255, 227 / 255, 213 / 255, 1];",
        "let bgColor = [0.01568627450980392,0.03529411764705882,0.0392156862745098,0.00392156862745098];": "let bgColor = [1.0, 0.9882352941176471, 0.9607843137254902, 1.0];",
        "const heightOffset = -0.8;": "const heightOffset = -0.62;",
        "const heightOffset = -0.45;": "const heightOffset = -0.62;",
        "const widthRatio = 0.5;": "const widthRatio = 0.38;",
        "const heightRatio = 1.0 * 0.185 * displayRatio;": "const heightRatio = 1.0 * 0.31 * displayRatio;",
        "const heightRatio = 1.0 * 0.145 * displayRatio;": "const heightRatio = 1.0 * 0.31 * displayRatio;",
        "const heightOffset = (5/12 + logoHeightRatio * 1/2 + heightRatio * 3/2)  * (-2) + 1;": "const heightOffset = -0.22;",
        "const widthRatio = slogan.width / canvas.width * 0.75;": "const widthRatio = slogan.width / canvas.width * 0.62;",
        "const heightRatio = slogan.height / canvas.height * 0.75;": "const heightRatio = slogan.height / canvas.height * 0.62;",
    }
    for old, new in replacements.items():
        if old in text:
            text = text.replace(old, new)
        elif new not in text:
            raise SystemExit(f"missing first-screen pattern: {old}")
    path.write_text(text)


def patch_open_data_context():
    source = ROOT / "openDataContext"
    target = BUILD / "openDataContext"
    if source.exists():
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(source, target)
    game_json = BUILD / "game.json"
    data = json.loads(game_json.read_text())
    data["openDataContext"] = "openDataContext"
    data["__usePrivacyCheck__"] = True
    game_json.write_text(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    if not BUILD.exists():
        raise SystemExit(f"build output not found: {BUILD}")
    make_logo()
    make_slogan()
    patch_first_screen()
    patch_open_data_context()
    print("patched WeChat first screen")
