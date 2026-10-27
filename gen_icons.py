# -*- coding: utf-8 -*-
"""生成 tabBar 图标（8 张 PNG：4 图标 x 普通/选中）。
先在 4 倍画布上绘制再缩到 81px，保证抗锯齿平滑。"""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "tabbar")
os.makedirs(OUT, exist_ok=True)

S = 4            # 超采样倍数
SIZE = 81 * S    # 324
STROKE = 26      # 线宽（4x 坐标系）
GRAY = (168, 166, 159, 255)   # #A8A69F
GREEN = (47, 93, 80, 255)     # #2F5D50


def canvas():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def capsule(d, p1, p2, color, w=STROKE):
    """圆头粗线段"""
    d.line([p1, p2], fill=color, width=w)
    r = w / 2
    for (x, y) in (p1, p2):
        d.ellipse([x - r, y - r, x + r, y + r], fill=color)


def poly(d, pts, color, w=STROKE):
    for i in range(len(pts) - 1):
        capsule(d, pts[i], pts[i + 1], color, w)


def save(img, name):
    img = img.resize((81, 81), Image.LANCZOS)
    img.save(os.path.join(OUT, name))
    print("saved", name)


def render(fn, color, suffix):
    """在临时画布上绘制并按后缀命名保存"""
    global save
    img, d = canvas()
    fn(d, color)
    img = img.resize((81, 81), Image.LANCZOS)
    name = fn.__name__.replace("draw_", "") + suffix + ".png"
    img.save(os.path.join(OUT, name))
    print("saved", name)


def draw_home(d, color):
    # 屋顶
    poly(d, [(52, 158), (162, 66), (272, 158)], color)
    # 房身
    d.rounded_rectangle([86, 150, 238, 262], radius=18, outline=color, width=STROKE)


def draw_plaza(d, color):
    for bbox in [(58, 58, 146, 146), (178, 58, 266, 146), (58, 178, 146, 266), (178, 178, 266, 266)]:
        d.rounded_rectangle(bbox, radius=22, outline=color, width=STROKE)


def draw_post(d, color):
    d.ellipse([58, 58, 266, 266], outline=color, width=STROKE)
    capsule(d, (114, 162), (210, 162), color)
    capsule(d, (162, 114), (162, 210), color)


def draw_mine(d, color):
    d.ellipse([106, 62, 218, 174], outline=color, width=STROKE)
    d.arc([66, 196, 258, 388], start=180, end=360, fill=color, width=STROKE)


for fn in (draw_home, draw_plaza, draw_post, draw_mine):
    render(fn, GRAY, "")
    render(fn, GREEN, "-active")

