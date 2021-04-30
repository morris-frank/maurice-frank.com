+++
title = "Maps"
+++


<div class="osm">
    <div id="map"></div>
</div>
<script>
    let tileserver = "https://tiles.morris-frank.dev/file/osm-tiles/";
    let layers = {
        "Topology": L.tileLayer(tileserver + 'topo/{z}/{x}/{y}.png',{maxZoom:16}),
        "Alpine club": L.tileLayer(tileserver + 'avk/{z}/{x}/{y}.png',{maxZoom:16})
    };
    let map = L.map('map', {
        center: [47.05, 12.2],
        zoom: 11,
        layers: [layers["Topology"],]
    });
    L.control.layers(layers).addTo(map);
</script>