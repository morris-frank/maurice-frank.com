# %%
from bs4 import BeautifulSoup
from pathlib import Path
import yaml
import requests

api_key = "----------"

data_path = Path(__file__).parent / "data.yaml"
nMovies = 0
nMoviesFound = 0
data = yaml.safe_load(data_path.read_text())
if data is None:
    data = {}


def get_movie(api_key, movie_title):
    base_url = "https://api.themoviedb.org/3"
    search_endpoint = f"{base_url}/search/movie"
    params = {"api_key": api_key, "query": movie_title}

    response = requests.get(search_endpoint, params=params)
    data = response.json()

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
    print(url)
    if key not in data:
        data[key] = []

    wikipage = BeautifulSoup(requests.get(url).text, "html.parser")
    for group in wikipage.find_all("div", class_="mw-category-group"):
        for movie_link in group.find_all("a"):
            if "title" not in movie_link or movie_link["title"].startswith("Category:"):
                continue
            nMovies += 1
            meta = get_movie(api_key, movie_link.text)
            if meta:
                nMoviesFound += 1
                data[key].append(meta)
    print(f"Processed {key}")
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
        data_path.write_text(yaml.dump(data))
print(f"Processed {nMoviesFound/nMovies:%} out of {nMovies} movies")

# %%
