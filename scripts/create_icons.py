from PIL import Image, ImageDraw


def scale_points(points, scale):
    return [(round(x * scale), round(y * scale)) for x, y in points]


def create(size: int, path: str) -> None:
    s = size / 512
    image = Image.new("RGB", (size, size), "#07101f")
    draw = ImageDraw.Draw(image)
    shield = [(256,62),(420,122),(420,248),(410,299),(389,346),(356,387),(312,422),(256,453),(200,422),(156,387),(123,346),(102,299),(92,248),(92,122)]
    draw.polygon(scale_points(shield,s), fill="#22b873", outline="#4fa3ff", width=max(2,round(14*s)))
    # Dezente deutsche Farblinie als Hinweis auf deutschen Fußball.
    for x1,x2,color in ((108,207,"#151515"),(207,306,"#dd1834"),(306,404,"#f5c542")):
        draw.line(scale_points([(x1,146),(x2,146)],s), fill=color, width=max(2,round(13*s)))
    white="#f8fbff"; navy="#07101f"
    draw.line(scale_points([(256,160),(256,418)],s),fill=white,width=max(1,round(8*s)))
    draw.line(scale_points([(105,270),(407,270)],s),fill=white,width=max(1,round(8*s)))
    draw.ellipse(tuple(round(v*s) for v in (181,195,331,345)),fill=white,outline=navy,width=max(2,round(11*s)))
    ball=[(256,220),(290,245),(277,285),(235,285),(222,245)]
    draw.polygon(scale_points(ball,s),fill=navy)
    width=max(2,round(9*s))
    for points in [[(222,245),(188,233)],[(290,245),(324,233)],[(235,285),(220,323)],[(277,285),(292,323)]]:
        draw.line(scale_points(points,s),fill=navy,width=width)
    draw.arc(tuple(round(v*s) for v in (203,270,309,345)),0,180,fill=navy,width=width)
    image.save(path,"PNG",optimize=True)


create(512,"icon-512.png")
create(512,"icon-maskable-512.png")
create(192,"icon-192.png")
create(180,"apple-touch-icon.png")
