import json

inputf = "./matched.json"
outputf = "../../content/motionstills.html"
url = "https://motionstill.morris-frank.dev/file/motionstills/"

content = """+++
title = "Still in motion"
slug = "motionstills"
+++\n\n"""

matched = json.load(open(inputf))
for link in sorted(matched, reverse=True):
    content += f"""<video class="motion_still" width="720" height="540" preload="metadata" loop onmouseenter="this.play()" onmouseleave="this.pause()"><source src="{url}{link}#t=0.01" type="video/mp4"></video>\n"""

with open(outputf, "w") as fp:
    fp.write(content)