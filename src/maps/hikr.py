from pathlib import Path
from typing import Dict, List
from tqdm import trange
from bs4 import BeautifulSoup
import requests
from rich import print
import gpxpy
import gpxpy.gpx
import yaml
import re


# Settings ---------------------------------------------------------------------
pages = [
    ("bergrebell", "https://www.hikr.org/user/{user}/tour/?skip={skip}", 760),
    ("hikr", "https://www.hikr.org/filter.php?skip={skip}&act=filter&a=alp&ai=1&aa=4", 3000),
]

diff_titles = {
    "Wandern Schwierigkeit": "hiking",
    "Hochtouren Schwierigkeit": "mountaineering",
    "Klettern Schwierigkeit": "climbing",
    "Klettersteig Schwierigkeit": "via-ferrata",
    "Ski Schwierigkeit": "ski",
}
# ------------------------------------------------------------------------------


def dms2dec(dms_str: str) -> float:
    dms_str = re.sub(r'\s', '', dms_str)    
    sign = -1 if re.search('[swSW]', dms_str) else 1
    numbers = [*filter(len, re.split('\D+', dms_str, maxsplit=4))]
    degree = numbers[0]
    minute = numbers[1] if len(numbers) >= 2 else '0'
    second = numbers[2] if len(numbers) >= 3 else '0'
    frac_seconds = numbers[3] if len(numbers) >= 4 else '0'
    second += "." + frac_seconds
    return sign * (int(degree) + float(minute) / 60 + float(second) / 3600)

def get_coordinates(url: str) -> Dict[str, str]:
    soup = BeautifulSoup(requests.get(url).content, "html.parser")
    return {str(soup.find("h1").string).strip(): str(soup.find(id="sidebar_swiss").find("td", class_="div13", string="Koordinaten: ").next_sibling.string).strip()}

def cache_entry(url: str) -> List[Dict[str, str]]:
    print(url)
    soup = BeautifulSoup(requests.get(url).content, "html.parser")
    coords = []
    for link in soup.find("td", class_="fiche_rando_b", string="Wegpunkte:").next_sibling.find_all("a"):
        coords.append(get_coordinates(link["href"]))
    return coords

def download_entry_list(name: str, url: str, max_skip: int):
    cache_file: Path = Path(f"../../content/maps/{name}.yaml")
    def save(entries):
        with open(cache_file, "w") as fp:
            yaml.dump(entries, fp)

    if cache_file.exists():
        with open(cache_file, "r") as fp:
            return yaml.load(fp, Loader=yaml.SafeLoader)
            entries = yaml.load(fp, Loader=yaml.SafeLoader)
    else: 
        entries = []
        for skip in trange(0, max_skip + 20, 20):
            soup = BeautifulSoup(requests.get(url.format(skip=skip)).content, "html.parser")
            for result in soup.find_all("div", class_="content-list-intern"):
                entries.append({"url": result.find_next("a")["href"]})
                for k, v in diff_titles.items():
                    r = result.find_next("span", attrs={"title": k})
                    if r is not None:
                        entries[-1][v] = r.contents[0].strip()
        save(entries)

    for i in range(len(entries)):
        if "waypoints" not in entries[i]:
            try:
                entries[i]["waypoints"] = cache_entry(entries[i]["url"])
            except:
                continue
            save(entries)

    save(entries)
    return entries    
    
def get_tracks(entries: Dict[str, str], difficulty: str):
    gpx = gpxpy.gpx.GPX()
    for entry in entries:
        if entry.get("mountaineering", "") != difficulty or not "waypoints" in entry:
            continue
        gpx_track = gpxpy.gpx.GPXTrack()
        gpx_segment = gpxpy.gpx.GPXTrackSegment()
        for point in entry["waypoints"]:
            for name, coord in point.items():
                latitude, langitude = list(map(dms2dec, coord.split(",")))
                gpx_segment.points.append(gpxpy.gpx.GPXTrackPoint(latitude, langitude, name=name))
        gpx_track.segments.append(gpx_segment)
        gpx.tracks.append(gpx_track)
    return gpx


for name, url, max_skip in pages:
    entries = download_entry_list(name, url, max_skip)
    gpx_file: Path = f"../../content/maps/{name}_{{difficulty}}.gpx"
    
    for difficulty in ["L", "WS-", "WS", "WS+"]:
        gpx = get_tracks(entries, difficulty)
        with open(gpx_file.format(difficulty=difficulty), "w") as fp:
            fp.write(gpx.to_xml())