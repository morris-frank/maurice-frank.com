# %%
from bs4 import BeautifulSoup
from pathlib import Path
import requests
import json

api_key = "API_TOKEN"

data_path = Path(__file__).parent / "data.json"
if data_path.exists():
    data = json.loads(data_path.read_text())
else:
    data = {}

nMovies = 0
nMoviesFound = 0
nMoviesGlobal = 0
nMoviesFoundGlobal = 0
movieSet = set()


def get_movie(api_key, movie_title):
    base_url = "https://api.themoviedb.org/3"
    search_endpoint = f"{base_url}/search/movie"
    params = {"api_key": api_key, "query": movie_title}

    response = requests.get(search_endpoint, params=params)
    data = response.json()

    if "results" not in data:
        print(data)
        return None

    # Assuming the first result is the correct movie
    if data["results"]:
        metadata = data["results"][0]
        metadata["poster_url"] = f"https://image.tmdb.org/t/p/w500{metadata['poster_path']}"
        return metadata
    else:
        return None


def process_wikipage(key, data):
    global nMovies, nMoviesFound
    url = f"https://en.wikipedia.org/wiki/Category:Films_set_in_the_{key.replace(' ', '_')}"
    if key not in data:
        data[key] = []

    wikipage = BeautifulSoup(requests.get(url).text, "html.parser")
    for group in wikipage.find_all("div", class_="mw-category-group"):
        for movie_link in group.find_all("a"):
            if "title" not in movie_link.attrs or movie_link.attrs["title"].startswith("Category:"):
                continue
            if movie_link.text in movieSet:
                continue
            movieSet.add(movie_link.text)
            nMovies += 1
            meta = get_movie(api_key, movie_link.text)
            if meta:
                nMoviesFound += 1
                data[key].append(meta)
    return data


# %%
keys = (
    [f"{i}th century BC" for i in reversed(range(4, 15))]
    + [
        "3rd century BC",
        "2nd century BC",
        "1st century BC",
    ]
    + [
        "1st century",
        "2nd century",
        "3rd century",
    ]
    + [f"{i}th century" for i in range(4, 15)]
    + [f"{i}s" for i in range(1410, 1900, 10)]
)
for key in keys:
    if key not in data or len(data[key]) == 0:
        data = process_wikipage(key, data)
        data_path.write_text(json.dumps(data, indent=4))
        if nMovies > 0:
            print(f"[{key}] Processed {nMoviesFound/nMovies:%} out of {nMovies} movies")
        else:
            print(f"[{key}] No movies found")
    nMoviesGlobal += nMovies
    nMoviesFoundGlobal += nMoviesFound
    nMovies = 0
    nMoviesFound = 0
print(f"Processed {nMoviesFoundGlobal/nMoviesGlobal:%} out of {nMoviesGlobal} movies")

# %%
