window.addEventListener('load', function() {setTimeout(drawCausal, 1000)});

var drawCausal = function () {
    var figcausal_globals = {
        "box_width": 28,
        "box_height": 28,
        "box_inner_padding": 5,
        "row_space": 40,
        "perspective_shift": 18,
        "perspective_spacing": 10,
        "stroke_width": 1
    };

    if (mobile) {
        var figcausal_globals = globals;
        figcausal_globals = mobile_globals;
        document.getElementById("figcausal_svg").style.left = "50px";
    }

    var svgEl = document.getElementById("figcausal_svg");

    var width = 20;
    renderRowFn(svgEl, 1, width, 0, true, figcausal_globals);
    renderRowFn(svgEl, 2, width, 0, false, figcausal_globals);
    renderRowFn(svgEl, 3, width, 0, false, figcausal_globals);
    renderRowFn(svgEl, 4, width, 0, false, figcausal_globals);
    renderRowFn(svgEl, 5, width, 0, true, figcausal_globals);

    for (let i = 0; i < width; i++) {
        renderInvFlowFn(svgEl, 4, 1, 1, i, i, figcausal_globals);
        renderInvFlowFn(svgEl, 4, 1, 1, i, i-1, figcausal_globals);
        // renderInvFlowFn(svgEl, 4, 1, 1, i, i-2, figcausal_globals);

        renderInvFlowFn(svgEl, 3, 1, 1, i, i, figcausal_globals);
        renderInvFlowFn(svgEl, 3, 1, 1, i, i-1, figcausal_globals);
        // renderInvFlowFn(svgEl, 3, 1, 1, i, i-2, figcausal_globals);

        renderInvFlowFn(svgEl, 2, 1, 1, i, i, figcausal_globals);
        renderInvFlowFn(svgEl, 2, 1, 1, i, i-1, figcausal_globals);
        // renderInvFlowFn(svgEl, 2, 1, 1, i, i-2, figcausal_globals);

        renderInvFlowFn(svgEl, 1, 1, 1, i, i, figcausal_globals);
        renderInvFlowFn(svgEl, 1, 1, 1, i, i-1, figcausal_globals);
        // renderInvFlowFn(svgEl, 1, 1, 1, i, i-2, figcausal_globals);
    }

    var featureNodes = svgEl.querySelectorAll(".feature");
    for (var i=0; i < featureNodes.length; i++) {
        featureNodes[i].addEventListener("mouseenter", renderSingleFlowStack);
    }

    renderSingleFlowStack.call(svgEl.querySelector("#figcausal_svg > rect.feature.feature_4_8"));
};
