+++
title = "Maps"
+++


<div id="map" class="map"></div>
<script>
window.addEventListener('load', function() {
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
    L.control.layers(layers,null,{collapsed:false}).addTo(map);
    var gpx = './abenteurer_hikr.gpx';
    new L.GPX(gpx, {
        async: true,
        marker_options: {
            startIconUrl: null,
            endIconUrl: null,
            shadowUrl: null
    }}).addTo(map);
  }, false);
</script>