"""Draws the Evan Archive icon (an archive box on an ink tile) into brand/.

Run once after changing the design: python3 scripts/make-icons.py
"""

import base64
from pathlib import Path

from PIL import Image, ImageDraw

INK = (22, 24, 29)
PAPER = (244, 241, 234)
ACCENT = (123, 197, 228)

S = 4  # supersample factor for smooth edges
N = 512 * S
out = Path(__file__).resolve().parent.parent / "brand"

img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

d.rounded_rectangle([0, 0, N - 1, N - 1], radius=112 * S, fill=INK)

stroke = 30 * S
# Box body: open at the top, tucked under the lid
d.rounded_rectangle(
    [136 * S, 196 * S, 376 * S, 388 * S],
    radius=26 * S,
    outline=PAPER,
    width=stroke,
    corners=(False, False, True, True),
)
d.rectangle([136 * S + stroke, 196 * S, 376 * S - stroke, 196 * S + stroke], fill=INK)
# Lid, drawn last so it sits over the body's top edge
d.rounded_rectangle([108 * S, 132 * S, 404 * S, 210 * S], radius=18 * S, outline=PAPER, width=stroke)
# Handle slot
d.rounded_rectangle([216 * S, 262 * S, 296 * S, 262 * S + stroke], radius=stroke // 2, fill=ACCENT)

icon = img.resize((512, 512), Image.LANCZOS)
icon.save(out / "icon-512.png", optimize=True)
icon.save(out / "icon-512.webp", lossless=True)
icon.save(out / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

# Some upstream logo slots are .svg files, so wrap the PNG for those.
png = base64.b64encode((out / "icon-512.png").read_bytes()).decode()
(out / "logo.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">'
    f'<image width="512" height="512" href="data:image/png;base64,{png}"/></svg>\n'
)
print("wrote icon-512.png, icon-512.webp, favicon.ico and logo.svg to", out)
