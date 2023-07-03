def generate():
    import json
    from pathlib import Path

    c = f"""
    <p>
    I am really in love with an app made @ Google Research called <a href="https://ai.googleblog.com/2016/06/motion-stills-create-beautiful-gifs.html">MotionStills</a>. It takes little videos that can be stabilized with some quite involved CV algorithm it seems… And the app is super slim… I assume Google will kill it in the future but until then it is super fun to use.</p>
    </p>
    <div class="motion_still_container">
    """

    bU = "https://motionstill.morris-frank.com/file/motionstills/"
    stills = json.loads(Path("motionstills.json").read_text())

    for year in stills:
        c += f"<h3 id=\"{year['year']}\">{year['year']}</h3>"
        for still in year["stills"]:
            path = bU + still
            c += f"""
            <video class="lazy motion_still" preload="none" loop onmouseenter="this.play()" onmouseleave="this.pause()" data-poster="{path}.jpg" data-src="{path}.webm">
            <source data-src="{path}.webm" type="video/webm">
            <source data-src="{path}.mp4" type="video/mp4">
            </video>
            """
    c += "</div><script> window.addEventListener('load', function () { var lazyLoadInstance = new LazyLoad({}); }, false);</script>"
    return c
