from PIL import Image, ImageDraw


def create(size: int, path: str) -> None:
    scale = size / 512
    image = Image.new("RGB", (size, size), "#07101f")
    draw = ImageDraw.Draw(image)

    # Grün-blauer Verlauf des bestehenden LigaKompakt-Symbols.
    for radius in range(185, 0, -1):
        progress = (185 - radius) / 185
        red = round(57 + (79 - 57) * progress)
        green = round(219 + (163 - 219) * progress)
        blue = round(134 + (255 - 134) * progress)
        box = tuple(round(value * scale) for value in (256-radius, 256-radius, 256+radius, 256+radius))
        draw.ellipse(box, fill=(red, green, blue))

    star = [(256,133),(309,172),(374,171),(394,233),(433,285),(381,324),(361,386),(296,385),(243,424),(190,385),(125,386),(105,324),(53,285),(92,233),(112,171),(177,172)]
    draw.polygon([(round(x*scale), round(y*scale)) for x,y in star], fill="#07101f")
    ball = [(256,198),(311,238),(290,303),(222,303),(201,238)]
    draw.polygon([(round(x*scale), round(y*scale)) for x,y in ball], fill="#f8fbff")
    width = max(1, round(20*scale))
    for points in [[(201,238),(147,218)],[(311,238),(365,218)],[(222,303),(198,362)],[(290,303),(314,362)]]:
        draw.line([(round(x*scale),round(y*scale)) for x,y in points], fill="#f8fbff", width=width)

    image.save(path, "PNG", optimize=True)


create(512, "icon-512.png")
create(512, "icon-maskable-512.png")
create(192, "icon-192.png")
create(180, "apple-touch-icon.png")
