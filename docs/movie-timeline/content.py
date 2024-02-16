def generate():
    import yaml
    from pathlib import Path

    data = yaml.safe_load(Path( "data.yaml").read_text())

    c = """<style style="text/css">
.movieRow {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1em;
    margin-bottom: 2em;
}

.movie {
    text-decoration: none;
    color: black;
    transition: filter 0.3s ease;
}

.movie:hover {
      filter: hue-rotate(90deg);
}
</style>

<h2>Movie Timeline</h2>

<p>
    This page contains a list of movies set in different centuries. The movies are sorted by popularity.
    The data was collected from Wikipedia and The Movie Database (TMDb).
</p>
"""

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
        if key not in data or not data[key]:
            continue
        movies  = data[key]

        c += f'<h3 id="{key}">{key}</h3>'

        # get 5 most popular movies
        sorted_movies = sorted(movies, key=lambda x: x["popularity"], reverse=True)[:5]
        c += '<div class="movieRow">'
        for movie in sorted_movies:
            c += f"""
<a class="movie" href="https://www.themoviedb.org/movie/{movie['id']}" target="_blank">
    <img src="{movie['poster_url']}" alt="{movie['title']}" style="width:100%">
    <p>{movie['title']}</p>
</a>
"""
        c += "</div>"

    return c
