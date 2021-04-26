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
    content += f"""<video class="motion_still" width="720" height="540" controls><source src="{url}{link}" type="video/mp4"></video>\n"""

with open(outputf, "w") as fp:
    fp.write(content)