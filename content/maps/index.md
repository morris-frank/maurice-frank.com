+++
title = "Maps"
+++


<div id="map" class="map"></div>
<script>
window.addEventListener('load', function() {
    let tileserver = "https://tiles.morris-frank.dev/file/osm-tiles/";
    let basemaps = {
        "Topology": L.tileLayer(tileserver + 'topo/{z}/{x}/{y}.png',{maxZoom:16}),
        "Alpine club": L.tileLayer(tileserver + 'avk/{z}/{x}/{y}.png',{maxZoom:16})
    };
    let difficulties = {"L": "green", "WS-": "orange", "WS": "red", "WS+": "black"}
    let overlays = {}
    for (var d in difficulties) {
        overlays[d] =  new L.GPX("./bergrebell_" + d + ".gpx", {
            async: true,
            marker_options: {startIconUrl: null, endIconUrl: null, shadowUrl: null},
            polyline_options: {color: difficulties[d], opacity: 0.75,},
        });
    }
    console.log(overlays);
    let map = L.map('map', {
        center: [47.05, 12.2],
        zoom: 11,
        layers: [basemaps["Topology"],]
    });
    L.control.layers(basemaps,overlays,{collapsed:false}).addTo(map);
  }, false);
</script>