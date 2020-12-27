+++
title = "Maps"
+++


<div class="osm">
    <div class="map" id="map_topo"></div>
    <div class="map" id="map_avk"></div>
</div>
<script>
    let tileserver = "https://tiles.morris-frank.dev/file/osm-tiles/";
    let map_topo = L.map('map_topo').setView([47.05,12.2], 11);
    L.tileLayer(tileserver + 'topo/{z}/{x}/{y}.png',{maxZoom:16}).addTo(map_topo);
    let map_avk = L.map('map_avk').setView([47.05,12.2], 11);
    L.tileLayer(tileserver + 'avk/{z}/{x}/{y}.png',{maxZoom:16}).addTo(map_avk);
    map_topo.sync(map_avk);
    map_avk.sync(map_topo);
    // var map_oac = L.map('map_oac').setView([47.05, 12.2], 11);
    // L.vectorGrid.protobuf("osm/oac/{z}/{x}/{y}.pbf", {maxNativeZoom: 14}).addTo(map_oac);
</script>