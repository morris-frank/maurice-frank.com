var viewport_width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
var mobile = viewport_width < 600;

var positionElByRowHeightFn = function (svg_id, el_id, row, globals, opt_under_row) {
    var svg_el = document.getElementById(svg_id);
    var height_adjustment = parseInt(svg_el.style.top);
    var el = document.getElementById(el_id);

    var yPos = ((row - 1) * (globals.box_height + globals.row_space));
    if (opt_under_row) {
        yPos += globals.box_height + 5;
    }
    yPos += height_adjustment;
    el.style.top = yPos + "px";
};

var renderRowFn = function (el, row, width, offset, fill, globals) {
    var htmlStr = '';

    var xPos = offset * globals.box_width;
    var yPos = (row - 1) * (globals.box_height + globals.row_space);

    var fill_c = 'rgb(247, 247, 247)';
    if (fill) {
        fill_c = 'rgba(243, 222, 138, 0.3)';
    }

    for (var i = 0; i < width; i++) {
        htmlStr += '<rect data-id="feature_' + row + '_' + (offset + i) + '" class="feature feature_' + row + '_' + (offset + i) + '" x="' + xPos + '" y="' + yPos + '" width="' + globals.box_width + '" height="' + globals.box_height + '" data-fill="' + fill_c + '" style="fill:' + fill_c + ';stroke-width:' + globals.stroke_width + ';stroke:rgb(51,51,51)" />';
        xPos += globals.box_width;
    }

    el.innerHTML += htmlStr;
};

var renderFlowFn = function (el, row, width1, width2, offset1, offset2, globals, opt_row_height, opt_render_dotted_lines) {
    if (opt_row_height === undefined) {
        opt_row_height = 1;
    }

    var htmlStr = '';

    var xPos1_1 = offset1 * globals.box_width;
    var xPos1_2 = xPos1_1 + (globals.box_width * width1);
    var xPos2_1 = offset2 * globals.box_width;
    var xPos2_2 = xPos2_1 + (globals.box_width * width2);
    var yPos1 = ((row - 1) * (globals.box_height + globals.row_space)) + globals.box_height;
    var yPos2 = ((row + (opt_row_height - 1)) * (globals.box_height + globals.row_space));

    var dashed_str = opt_render_dotted_lines ? ' stroke-dasharray="4"' : '';

    var init_curve = 20;

    htmlStr += '<path data-id="flow_' + (row + opt_row_height) + '_' + offset2 + '" class="flow flow_' + (row + opt_row_height) + '_' + offset2 + '" data-offset1="' + offset1 + '" data-width1="' + width1 + '" data-rowheight="' + opt_row_height + '" stroke="#8a9fec" d="M' + xPos1_1 + ' ' + yPos1 + ' C ' + xPos1_1 + ' ' + (yPos1 + init_curve) + ', ' + xPos2_1 + ' ' + (yPos2 - init_curve) + ', ' + xPos2_1 + ' ' + yPos2 + ' L' + xPos2_2 + ' ' + yPos2 + ' C ' + xPos2_2 + ' ' + (yPos2 - init_curve) + ', ' + xPos1_2 + ' ' + (yPos1 + init_curve) + ', ' + xPos1_2 + ' ' + yPos1 + ' Z" opacity="0.5" fill-opacity="null" stroke-opacity="null" stroke-width="' + globals.stroke_width + '"' + dashed_str + '" fill="rgba(104,157,106,0.5)"/>';

    el.innerHTML += htmlStr;
};

var renderInvFlowFn = function (el, row, width1, width2, offset1, offset2, globals, opt_row_height, opt_render_dotted_lines) {
    if (opt_row_height === undefined) {
        opt_row_height = 1;
    }

    var htmlStr = '';

    var xPos1_1 = offset1 * globals.box_width;
    var xPos1_2 = xPos1_1 + (globals.box_width * width1);
    var xPos2_1 = offset2 * globals.box_width;
    var xPos2_2 = xPos2_1 + (globals.box_width * width2);
    var yPos2 = ((row - 1) * (globals.box_height + globals.row_space)) + globals.box_height;
    var yPos1 = ((row + (opt_row_height - 1)) * (globals.box_height + globals.row_space));

    var dashed_str = opt_render_dotted_lines ? ' stroke-dasharray="4"' : '';

    var init_curve = 20;

    htmlStr += '<path data-id="flow_' + row + '_' + offset1 + '" class="flow flow_' + row + '_' + offset1 + '" data-offset2="' + offset2 + '" data-width2="' + width2 + '" data-rowheight="' + opt_row_height + '" stroke="#8a9fec" d="M' + xPos1_1 + ' ' + yPos2 + ' C ' + xPos1_1 + ' ' + (yPos2 + init_curve) + ', ' + xPos2_1 + ' ' + (yPos1 - init_curve) + ', ' + xPos2_1 + ' ' + yPos1 + ' L' + xPos2_2 + ' ' + yPos1 + ' C ' + xPos2_2 + ' ' + (yPos1 - init_curve) + ', ' + xPos1_2 + ' ' + (yPos2 + init_curve) + ', ' + xPos1_2 + ' ' + yPos2 + ' Z" opacity="0.5" fill-opacity="null" stroke-opacity="null" stroke-width="' + globals.stroke_width + '"' + dashed_str + '" fill="rgba(104,157,106,0.5)"/>';

    el.innerHTML += htmlStr;
};


var renderAnnotationFn = function (el, row, width, offset, direction, margin, color, globals) {
    var htmlStr = '';

    var annotation_height = 10;

    var xPos1 = offset * globals.box_width;
    var xPos2 = xPos1 + (globals.box_width * width);
    var yPos1 = ((row - 1) * (globals.box_height + globals.row_space)) + globals.box_height;
    var yPos2 = ((row - 0) * (globals.box_height + globals.row_space)) - (globals.row_space / 2);
    if (direction != 0) {
        yPos1 += globals.box_height + globals.perspective_shift + 2;
        yPos2 += globals.box_height + globals.perspective_shift + 2;

        yPos2 = yPos2 - margin;
        yPos1 = yPos2 - annotation_height;
    } else {
        yPos1 = yPos1 + margin;
        yPos2 = yPos1 + annotation_height;
    }

    htmlStr += '<path stroke="' + color + '" d="M' + xPos1 + ' ' + yPos1 + ' L ' + xPos1 + ' ' + yPos2 + ' L ' + xPos1 + ' ' + (yPos1 + yPos2) / 2 + ' L ' + xPos2 + ' ' + (yPos1 + yPos2) / 2 + ' L ' + xPos2 + ' ' + yPos1 + ' L ' + xPos2 + ' ' + yPos2 + '" opacity="1.0" fill-opacity="0.0" stroke-opacity="null" stroke-width="' + globals.stroke_width + '" fill="' + color + '"/>';

    el.innerHTML += htmlStr;
};

var renderFlowAnnotationFn = function (el, row, width1, width2, offset1, offset2, direction, color, globals) {
    var htmlStr = '';

    var xPos1_1 = offset1 * globals.box_width;
    var xPos1_2 = xPos1_1 + (globals.box_width * width1);
    var xPos2_1 = offset2 * globals.box_width;
    var xPos2_2 = xPos2_1 + (globals.box_width * width2);
    var yPos1 = ((row - 1) * (globals.box_height + globals.row_space)) + globals.box_height;
    var yPos2 = ((row - 0) * (globals.box_height + globals.row_space)) - (globals.row_space / 2);
    if (direction != 0) {
        yPos1 += globals.box_height + globals.perspective_shift + 2;
        yPos2 += globals.box_height + globals.perspective_shift + 2;
    }

    htmlStr += '<path stroke="' + color + '" d="M' + xPos1_1 + ' ' + yPos1 + ' C ' + xPos1_1 + ' ' + (yPos1 + 50) + ', ' + xPos2_1 + ' ' + (yPos2 - 50) + ', ' + xPos2_1 + ' ' + yPos2 + ' L' + xPos2_2 + ' ' + yPos2 + ' C ' + xPos2_2 + ' ' + (yPos2 - 50) + ', ' + xPos1_2 + ' ' + (yPos1 + 50) + ', ' + xPos1_2 + ' ' + yPos1 + ' Z" opacity="1.0" fill-opacity="0.0" stroke-opacity="null" stroke-width="' + globals.stroke_width + '" fill="' + color + '"/>';

    el.innerHTML += htmlStr;
};

var renderArrowFn = function (el, row, offset, globals) {
    var htmlStr = '';

    var xPos1 = (offset - 0.5) * globals.box_width;
    var xPos2 = (offset) * globals.box_width;
    var xPos3 = (offset + 0.5) * globals.box_width;
    var yPos1 = ((row - 1) * (globals.box_height + globals.row_space)) - (globals.box_height * 1.5) - 10;
    var yPos2 = ((row - 1) * (globals.box_height + globals.row_space)) - (globals.box_height / 2) - 10;
    var yPos3 = ((row - 1) * (globals.box_height + globals.row_space)) - 10;

    htmlStr += '<path stroke="rgb(89,89,89)" d="M' + (xPos2 - 1) + ' ' + yPos1 + ' L ' + (xPos2 - 1) + ' ' + yPos2 + ' L' + (xPos1 + 10) + ' ' + yPos2 + ' L ' + xPos2 + ' ' + (yPos3 - 3) + ' L ' + (xPos3 - 10) + ' ' + yPos2 + ' L ' + (xPos2 + 1) + ' ' + yPos2 + ' L ' + (xPos2 + 1) + ' ' + yPos1 + ' Z" opacity="1.0" fill-opacity="1.0" stroke-opacity="null" stroke-width="' + globals.stroke_width + '" fill="rgb(89,89,89)"/>';

    el.innerHTML += htmlStr;
};

var recursiveFlowUnhide = function (row, offset, parentNode) {
    // Re-color the front and the two side-faces of that node!
    // all queries should only return one element
    var featureEls = parentNode.querySelectorAll(".feature_" + row + "_" + offset);
    for (var i = 0; i < featureEls.length; i++) {
        featureEls[i].style.fill = "rgba(104,157,106,0.5)";
    }

    var flowEls = parentNode.querySelectorAll(".flow_" + row + "_" + offset);
    for (var j = 0; j < flowEls.length; j++) {
        flowEls[j].style.display = "block";

        var offset, width, nrow;
        if ('offset1' in flowEls[j].dataset) {
            offset = parseInt(flowEls[j].dataset.offset1);
            width = parseInt(flowEls[j].dataset.width1);
            nrow = row - parseInt(flowEls[j].dataset.rowheight);
        } else {
            offset = parseInt(flowEls[j].dataset.offset2);
            width = parseInt(flowEls[j].dataset.width2);
            nrow = parseInt(row) + parseInt(flowEls[j].dataset.rowheight);
        }
        for (var i = offset; i < offset + width; i++) {
            recursiveFlowUnhide(nrow, i, parentNode);
        }
    }
};

var renderSingleFlowStack = function (event) {
    var featureNodes = this.parentNode.querySelectorAll(".feature");
    for (var i = 0; i < featureNodes.length; i++) {
        featureNodes[i].style.fill = featureNodes[i].dataset.fill;
    }
    var flowNodes = this.parentNode.querySelectorAll(".flow");
    for (var i = 0; i < flowNodes.length; i++) {
        flowNodes[i].style.display = "none";
    }
    var data = this.dataset.id.split("_");
    recursiveFlowUnhide(data[1], data[2], this.parentNode);
};
