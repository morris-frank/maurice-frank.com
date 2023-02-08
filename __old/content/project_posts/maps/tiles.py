#!/bin/env python
from tqdm import tqdm
import math
from itertools import product
import os
import requests
from multiprocessing.pool import ThreadPool
from argparse import ArgumentParser
from PIL import Image


path_local = "/home/morris/var/data/osm/{}/{}/{}"
url = {
        'topo': "https://w1.oastatic.com/map/v1/topo/pro_ign_os_swisstopo/{}/{}/{}/t.png",
        'avk': "https://w1.oastatic.com/map/v1/topo/avk_osm/{}/{}/{}/t.png",
    #    'oac': "https://w1.oastatic.com/map/v1/pbf/ign_oac_osm_swisstopo/{}/{}/{}/t.pbf",
      }


def fetch_url(x):
    where, to = x
    if not os.path.exists(to):
        r = requests.get(where, stream=True)
        if r.status_code == 200:
            with open(to, 'wb') as f:
                for chunk in r:
                    f.write(chunk)
    return to


def deg2num(lat_deg, lon_deg, zoom):
  lat_rad = math.radians(lat_deg)
  n = 2.0 ** zoom
  xtile = int((lon_deg + 180.0) / 360.0 * n)
  ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
  return (xtile, ytile)


def iter_rect(rect, zoom, style):
    topx, topy = deg2num(*rect[0], zoom)
    botx, boty = deg2num(*rect[1], zoom)
    for x,y in product(range(topx, botx+1), range(topy, boty+1)):
        where = url[style].format(zoom, x, y)
        to_dir = path_local.format(style, zoom, x)
        os.makedirs(to_dir, exist_ok=True)
        to = to_dir + f'/{y}.{where[-3:]}'
        yield where, to


def rect_shape(rect, zoom):
    topx, topy = deg2num(*rect[0], zoom)
    botx, boty = deg2num(*rect[1], zoom)
    return (botx - topx + 1), (boty - topy + 1)


def fetch_rect(rect, zoom, style, prefix=''):
    results = ThreadPool(16).imap_unordered(fetch_url, iter_rect(rect, zoom, style))
    for path in tqdm(results, desc=f'{prefix:>5} {style:>5} @ level {zoom:02}', total=math.prod(rect_shape(rect, zoom))):
        pass


def stitch_image(rect, zoom, style):
    shape = rect_shape(rect, zoom)
    patch_size = (256, 256)

    map_size = (shape[0] * patch_size[0], shape[1] * patch_size[1])
    c_map = Image.new('RGB', map_size, color='#fff')
    bw_map = Image.new('L', map_size, color='#fff')

    for i, (_, fp) in enumerate(tqdm(iter_rect(rect, zoom, style), desc=f"Stitch {style}", total=math.prod(shape))):
        x, y = patch_size[1] * (i // shape[1]), patch_size[0] * (i % shape[1])
        patch = Image.open(fp)
        c_map.paste(patch, (x, y))
        bw_map.paste(patch, (x, y))

    c_map.save(f'{style}_{zoom}_map.jpg')
    bw_map.save(f'{style}_{zoom}_map_bw.jpg')



def run_download():
    rects = [
                ((46.6,9.8),
                 (46.1,11.14)),
                ((47.575,9.431),
                 (46.650,13.828)),
                ((46.9463,6.4483),
                 (45.7631,9.4730)),
                ((42.613007, 79.771492), #East Tien Shan
                 (41.994283, 80.473095)),
            ]
    zooms = (1, 17)
    for (rid, rect), style, zoom in product(enumerate(rects), url.keys(), range(*zooms)):
        fetch_rect(rect, zoom, style, prefix=rid)


def run_stitch():
    rects = [
                ((47.121968, 12.184602),
                 (46.991599, 12.446207)),
                ((46.946397, 6.448338),
                 (45.7631127,9.4730333)),
            ]

    for rect in rects:
        stitch_image(rect, 15, 'topo')
        stitch_image(rect, 15, 'avk')


if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('mode', choices=('download', 'stitch'))
    args = parser.parse_args()

    if args.mode == 'download':
        run_download()
    else:
        run_stitch()
