window.addEventListener('load', function() {setTimeout(drawDilated, 1000)});

var drawDilated = function () {
    var figdilated_globals = {
        "box_width": 28,
        "box_height": 28,
        "box_inner_padding": 5,
        "row_space": 40,
        "perspective_shift": 18,
        "perspective_spacing": 10,
        "stroke_width": 1
    };

    if (mobile) {
        var figdilated_globals = globals;
        figdilated_globals = mobile_globals;
        document.getElementById("figdilated_svg").style.left = "50px";
    }

    var svgEl = document.getElementById("figdilated_svg");

    var width = 20;
    renderRowFn(svgEl, 1, width, 0, true, figdilated_globals);
    renderRowFn(svgEl, 2, width, 0, false, figdilated_globals);
    renderRowFn(svgEl, 3, width, 0, false, figdilated_globals);
    renderRowFn(svgEl, 4, width, 0, false, figdilated_globals);
    renderRowFn(svgEl, 5, width, 0, true, figdilated_globals);

    for (let i = 0; i < width; i++) {
        renderInvFlowFn(svgEl, 4, 1, 1, i, i, figdilated_globals);
        renderInvFlowFn(svgEl, 4, 1, 1, i, i-1, figdilated_globals);

        renderInvFlowFn(svgEl, 3, 1, 1, i, i, figdilated_globals);
        renderInvFlowFn(svgEl, 3, 1, 1, i, i-2, figdilated_globals);

        renderInvFlowFn(svgEl, 2, 1, 1, i, i, figdilated_globals);
        renderInvFlowFn(svgEl, 2, 1, 1, i, i-4, figdilated_globals);

        renderInvFlowFn(svgEl, 1, 1, 1, i, i, figdilated_globals);
        renderInvFlowFn(svgEl, 1, 1, 1, i, i-8, figdilated_globals);
    }

    var featureNodes = svgEl.querySelectorAll(".feature");
    for (var i=0; i < featureNodes.length; i++) {
        featureNodes[i].addEventListener("mouseenter", renderSingleFlowStack);
    }

    renderSingleFlowStack.call(svgEl.querySelector("#figdilated_svg > rect.feature.feature_4_8"));
};
