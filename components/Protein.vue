/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

<template>
<div id="proteinParent" class="grid-item" style="margin-top: 0px; margin-bottom: 0px; padding-top: 0px; padding-bottom: 0px; padding-left: 1rem !important; padding-right: 1rem !important;" ref="parentDiv">
    <div id="proteinDiv">
        <p>Loading protein diagram...</p>
    </div>
    <div id="proteinDomainMapDiv">
        <p>Loading protein mapping...</p>
    </div>
</div>
</template>

<script>
import DomainGfx from 'domain-gfx';
import * as d3 from 'd3';
import {put_in_svg, line, polygon_strokeless_transparent} from "~/assets/svg_utils";

export default {
    props: ["proteinData", "baseAxis"],

    data: () => {
        return {
            show_domains: true,
            show_motifs: true
        };
    },

    methods: {
        // scale protein graphic
        updateProteinCoords(scale) {
            let original = this.proteinData.originalData;
            let reversed = this.proteinData.reversedData;
            this.proteinData.json = this.proteinData.reversed ?
                JSON.parse(JSON.stringify(reversed)) : JSON.parse(JSON.stringify(original));
            let data = this.proteinData.json;
            data.length *= scale;
            for (var region of data.regions) {
                if (region.start) region.start *= scale;
                if (region.end) region.end *= scale;
                if (region.aliStart) region.aliStart *= scale;
                if (region.aliEnd) region.aliEnd *= scale;
                if (region.modelStart) region.modelStart *= scale;
                if (region.modelEnd) region.modelEnd *= scale;
                if (region.modelLength) region.modelLength *= scale;
            }
            for (var motif of data.motifs) {
                if (motif.start) motif.start *= scale;
                if (motif.end) motif.end *= scale;
            }
        },

        // Build original/scaled coordinate pairs from protein data (orientation-specific)
        domainCoords(paired=false) {
            let coords = [];
            let data = this.proteinData;
            for (let i = 0; i < data.json.regions.length; ++i) {
                // use updated coords if necessary
                let start = data.originalData.regions[i].start;
                let end = data.originalData.regions[i].end;
                let coordPair = [{
                    original: start,
                    scaled: data.json.regions[i].start
                }, 
                {
                    original: end,
                    scaled: data.json.regions[i].end
                }]
                if (paired)
                    coords.push(coordPair)
                else
                    coords = coords.concat(coordPair)
            }
            return coords;
        },

        motifCoords(paired=false) {
            let coords = [];
            let data = this.proteinData;
            for (let i = 0; i < data.json.motifs.length; ++i) {
                // use updated coords if necessary
                let start = data.originalData.motifs[i].start;
                let end = data.originalData.motifs[i].end;
                let coordPair = [{
                    original: start,
                    scaled: data.json.motifs[i].start
                }, 
                {
                    original: end,
                    scaled: data.json.motifs[i].end
                }]
                if (paired)
                    coords.push(coordPair);
                else
                    coords = coords.concat(coordPair);
            }
            return coords;
        },

        init()
        {
            document.getElementById("proteinDiv").innerHTML = "<p>Loading protein diagram...</p>";
            document.getElementById("proteinDomainMapDiv").innerHTML = "<p>Loading protein mapping...</p>";
        },

        buildProtein() {
            // only proceed if there is protein data and the stack has been generated
            if (!this.proteinData) return;

            // Check if the InterPro entry for the protein accession does not exist
            if (this.proteinData.gone)
            {
                document.getElementById("proteinDiv").innerHTML = '<br>';
                document.getElementById("proteinDomainMapDiv").innerHTML = "<p>The InterPro entry for the canonical protein does not exist.</p>";
                return;
            }

            const el = document.getElementById('stackDiv');
            if (!el) return;

            // compute x scale and scale protein coordinates
            let xscale = (el.getBoundingClientRect().width - 32) / this.proteinData.originalData.length; 
            this.updateProteinCoords(xscale);
            const data = this.proteinData.json;

            // clear target element of content and insert graphic
            d3.select('#proteinDiv').selectAll('*').remove();
            const parent = document.getElementById('proteinDiv');
            const graphic = new DomainGfx({data, parent});

            d3.select("#proteinDiv")
                .on("contextmenu", function (evt) {evt.preventDefault();})
        },

        buildProteinSvg(symbol = false) {
            let protein_div = document.getElementById("proteinDiv");
            if (!protein_div)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            let inner_html = protein_div.innerHTML;
            if (inner_html === "<br>")
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            // FIXME: Temporary fix for PDF viewers that do not fully render the purple PFAM protein blobs when they are zoomed in
            let defs_begin_tag_index = inner_html.indexOf("<defs");
            if (defs_begin_tag_index !== -1)
            {
                let defs_after_end_tag_index = inner_html.indexOf("</defs>", defs_begin_tag_index) + "</defs>".length;
                inner_html = inner_html.substring(0, defs_begin_tag_index) + inner_html.substring(defs_after_end_tag_index);
            }

            // Edit the SVG a little so that it can be displayed both in the browser and in standalone SVG image editors
            let after_svg_tag_end_index = inner_html.indexOf('>') + 1;
            let svg_tag = inner_html.substring(0, after_svg_tag_end_index);

            if (symbol)
            {
                let width_start_index = svg_tag.indexOf("width: ") + "width: ".length;
                let width_end_index = svg_tag.indexOf("px;", width_start_index);
                let protein_width = parseInt(svg_tag.substring(width_start_index, width_end_index));

                let height_start_index = svg_tag.indexOf("height: ") + "height: ".length;
                let height_end_index = svg_tag.indexOf("px;", height_start_index);
                let protein_height = parseInt(svg_tag.substring(height_start_index, height_end_index));

                let svg_end_tag_index = inner_html.indexOf("</svg>");
                let protein_symbol = inner_html.substring(after_svg_tag_end_index, svg_end_tag_index);

                return [protein_width, protein_height, protein_symbol];
            }

            let modified_svg_tag = svg_tag.substring(0, 5) + 'xmlns="http://www.w3.org/2000/svg" version="1.1" ' + svg_tag.substring(5);
            inner_html = modified_svg_tag + inner_html.substring(after_svg_tag_end_index);
            return inner_html;
        },

        buildProteinMap() {
            if (!this.baseAxis) return;

            let padding = 16;
            let height = 30;
            let width = 300;

            // make a copy of data and update axis
            let data = this.proteinData;
            if (!data || !('json' in data)) return;
            this.baseAxis.setProteinDomain([0, data.json.length]);
            const axis = this.baseAxis;

            // compute width of component
            let stack = document.getElementById('stackDiv');
            if (stack)
                width = Math.ceil(stack.getBoundingClientRect().width - 2 * padding);
            else return;

            // clear target element of any content
            d3.select('#proteinDomainMapDiv').selectAll("*").remove();

            d3.select("#proteinDomainMapDiv").append("canvas")
                .attr("width", width)
                .attr("height", height)
                .attr("style", "margin-bottom: -5.5px") // FIXME: When the canvas is added into the page, the element becomes 5.5 pixels taller than it should be
                .attr("id", "proteinMapCanvas");
            let canvas = document.getElementById("proteinMapCanvas");
            let ctx = canvas.getContext("2d");
            ctx.strokeStyle = "rgb(83, 83, 83)";

            let need_flip = (this.baseAxis.isAscending() && (this.baseAxis.strand !== '+')) || (!this.baseAxis.isAscending() && !(this.baseAxis.strand !== '+'));

            if (this.show_domains)
            {
                // Add shading for mapped domain regions
                let a = 0.36; // opacity
                let coords = this.domainCoords(true);
                let regions = this.proteinData.originalData.regions;
                for (let region of regions)
                {
                    let start = region.start;
                    let end = region.end;
                    let region_key = `${region.metadata.database}_${start}_${end}`;
                    let points = [start, end].sort();

                    // Assume that colours are in the form '#rrggbb'
                    let colour = region.colour;
                    let r = parseInt(colour.substring(1, 3), 16);
                    let g = parseInt(colour.substring(3, 5), 16);
                    let b = parseInt(colour.substring(5, 7), 16);
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;

                    for (let coord of coords)
                    {
                        let pair = [coord[0].original, coord[1].original].sort()
                        if ((pair[0] == points[0]) && (pair[1] == points[1]))
                        {
                            let pt0 = [axis.proteinScale(coord[need_flip ? 1 : 0].scaled), 0];
                            let pt1 = [axis.scale(data.domainMap[region_key][coord[0].original]), height];
                            let pt2 = [axis.scale(data.domainMap[region_key][coord[1].original]), height];
                            let pt3 = [axis.proteinScale(coord[need_flip ? 0 : 1].scaled), 0];

                            let path = new Path2D();
                            path.moveTo(pt0[0], pt0[1]);
                            path.lineTo(pt1[0], pt1[1]);
                            path.lineTo(pt2[0], pt2[1]);
                            path.lineTo(pt3[0], pt3[1]);
                            path.lineTo(pt0[0], pt0[1]);
                            path.closePath();

                            ctx.fill(path);

                            // Add mapping lines

                            ctx.beginPath();

                            let y0 = 0;
                            let y1 = height;

                            let x0 = axis.proteinScale(coord[need_flip ? 1 : 0].scaled);
                            let x1 = axis.scale(data.domainMap[region_key][coord[0].original]);

                            ctx.moveTo(x0, y0);
                            ctx.lineTo(x1, y1);

                            x0 = axis.proteinScale(coord[need_flip ? 0 : 1].scaled);
                            x1 = axis.scale(data.domainMap[region_key][coord[1].original]);

                            ctx.moveTo(x0, y0);
                            ctx.lineTo(x1, y1);

                            ctx.stroke();
                        }
                    }
                }
            }

            if (this.show_motifs)
            {
                // Add shading for mapped motif regions
                let a = 0.36; // opacity
                let coords = this.motifCoords(true);
                let motifs = this.proteinData.originalData.motifs;
                for (let motif of motifs)
                {
                    let start = motif.start;
                    let end = motif.end;
                    let motif_key = `${motif.metadata.type}_${start}_${end}`;
                    let points = [start, end].sort();

                    // Assume that colours are in the form '#rrggbb'
                    let colour = motif.colour;
                    let r = parseInt(colour.substring(1, 3), 16);
                    let g = parseInt(colour.substring(3, 5), 16);
                    let b = parseInt(colour.substring(5, 7), 16);
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;

                    for (let coord of coords)
                    {
                        let pair = [coord[0].original, coord[1].original].sort()
                        if ((pair[0] == points[0]) && (pair[1] == points[1]))
                        {
                            let pt0 = [axis.proteinScale(coord[need_flip ? 1 : 0].scaled), 0];
                            let pt1 = [axis.scale(data.motifMap[motif_key][coord[0].original]), height];
                            let pt2 = [axis.scale(data.motifMap[motif_key][coord[1].original]), height];
                            let pt3 = [axis.proteinScale(coord[need_flip ? 0 : 1].scaled), 0];

                            let path = new Path2D();
                            path.moveTo(pt0[0], pt0[1]);
                            path.lineTo(pt1[0], pt1[1]);
                            path.lineTo(pt2[0], pt2[1]);
                            path.lineTo(pt3[0], pt3[1]);
                            path.lineTo(pt0[0], pt0[1]);
                            path.closePath();

                            ctx.fill(path);

                            // Add mapping lines

                            ctx.beginPath();

                            let y0 = 0;
                            let y1 = height;

                            let x0 = axis.proteinScale(coord[need_flip ? 1 : 0].scaled);
                            let x1 = axis.scale(data.motifMap[motif_key][coord[0].original]);

                            ctx.moveTo(x0, y0);
                            ctx.lineTo(x1, y1);

                            x0 = axis.proteinScale(coord[need_flip ? 0 : 1].scaled);
                            x1 = axis.scale(data.motifMap[motif_key][coord[1].original]);

                            ctx.moveTo(x0, y0);
                            ctx.lineTo(x1, y1);

                            ctx.stroke();
                        }
                    }
                }
            }

            d3.select("#proteinMapCanvas")
                .on("contextmenu", function (evt) {evt.preventDefault();})
        },

        buildProteinMapSvg(symbol = false) {
            if (!this.baseAxis)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            let protein_map_div = document.getElementById("proteinDomainMapDiv");
            if (!protein_map_div)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            let inner_html = protein_map_div.innerHTML;
            if (inner_html === "<p>The InterPro entry for the canonical protein does not exist.</p>")
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            let padding = 16;
            let svg_width = 300;
            let svg_height = 30;

            // make a copy of data and update axis
            let data = this.proteinData;
            if (!data || !('json' in data))
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            this.baseAxis.setProteinDomain([0, data.json.length]);
            const axis = this.baseAxis;

            // compute width of component
            let stack = document.getElementById('stackDiv');
            if (stack)
                svg_width = Math.ceil(stack.getBoundingClientRect().width - 2 * padding);
            else
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            let svg = "";

            let need_flip = (this.baseAxis.isAscending() && (this.baseAxis.strand !== '+')) || (!this.baseAxis.isAscending() && !(this.baseAxis.strand !== '+'));

            if (this.show_domains)
            {
                // Draw the mapped domain regions
                let coords = this.domainCoords(true);
                let regions = this.proteinData.originalData.regions;
                for (let region of regions)
                {
                    let start = region.start;
                    let end = region.end;
                    let region_key = `${region.metadata.database}_${start}_${end}`;
                    let points = [start, end].sort();

                    for (let coord of coords)
                    {
                        let pair = [coord[0].original, coord[1].original].sort()
                        if (!((pair[0] == points[0]) && (pair[1] == points[1])))
                            continue;

                        // Shade the region

                        let side_1 = [];
                        let side_2 = [];

                        let side_1_top_x = axis.proteinScale(coord[need_flip ? 1 : 0].scaled);
                        let side_1_bottom_x = axis.scale(data.domainMap[region_key][coord[0].original]);

                        let side_2_top_x = axis.proteinScale(coord[need_flip ? 0 : 1].scaled);
                        let side_2_bottom_x = axis.scale(data.domainMap[region_key][coord[1].original]);

                        // For easier processing: The top X coordinate for side 1 must be lower than side 2
                        if (side_1_top_x > side_2_top_x)
                        {
                            let temp = side_1_top_x;
                            side_1_top_x = side_2_top_x;
                            side_2_top_x = temp;

                            temp = side_1_bottom_x;
                            side_1_bottom_x = side_2_bottom_x;
                            side_2_bottom_x = temp;
                        }

                        // The bottom X coordinate might not be visible
                        let is_side_1_bottom_x_invisible = (side_1_bottom_x < 0) || (side_1_bottom_x > svg_width);
                        let is_side_2_bottom_x_invisible = (side_2_bottom_x < 0) || (side_2_bottom_x > svg_width);

                        // Side 1 should be drawn from top to bottom, while side 2 should be drawn from bottom to top

                        if (!is_side_1_bottom_x_invisible)
                            side_1 = [[side_1_top_x, 0], [side_1_bottom_x, svg_height]];

                        if (!is_side_2_bottom_x_invisible)
                            side_2 = [[side_2_bottom_x, svg_height], [side_2_top_x, 0]];

                        // If one of the bottom X coordinates is invisible, there are 2 cases
                        if (is_side_1_bottom_x_invisible != is_side_2_bottom_x_invisible)
                        {
                            // Case 1: If the bottom X coordinate for side 1 is invisible, it must be negative
                            if (is_side_1_bottom_x_invisible)
                            {
                                let actual_y = (svg_height / (side_1_top_x - side_1_bottom_x)) * side_1_top_x;
                                side_1 = [[side_1_top_x, 0], [0, actual_y], [0, svg_height]];
                            }
                            // Case 2: If the bottom X coordinate for side 2 is invisible, it must be beyond the SVG width
                            else
                            {
                                let actual_y = (svg_height / (side_2_bottom_x - side_2_top_x)) * (svg_width - side_2_top_x);
                                side_2 = [[svg_width, svg_height], [svg_width, actual_y], [side_2_top_x, 0]];
                            }
                        }

                        // If both bottom X coordinates are invisible, there are 3 cases
                        if (is_side_1_bottom_x_invisible && is_side_2_bottom_x_invisible)
                        {
                            // Case 1: Both X coordinates are negative
                            if ((side_1_bottom_x < 0) && (side_2_bottom_x < 0))
                            {
                                let actual_side_1_y = (svg_height / (side_1_top_x - side_1_bottom_x)) * side_1_top_x;
                                let actual_side_2_y = (svg_height / (side_2_top_x - side_2_bottom_x)) * side_2_top_x;

                                side_1 = [[side_1_top_x, 0], [0, actual_side_1_y]];
                                side_2 = [[0, actual_side_2_y], [side_2_top_x, 0]];
                            }
                            // Case 2: Both X coordinates are beyond the SVG width
                            else if ((side_1_bottom_x > svg_width) && (side_2_bottom_x > svg_width))
                            {
                                let actual_side_1_y = (svg_height / (side_1_bottom_x - side_1_top_x)) * (svg_width - side_1_top_x);
                                let actual_side_2_y = (svg_height / (side_2_bottom_x - side_2_top_x)) * (svg_width - side_2_top_x);

                                side_1 = [[side_1_top_x, 0], [svg_width, actual_side_1_y]];
                                side_2 = [[svg_width, actual_side_2_y], [side_2_top_x, 0]];
                            }
                            // Case 3: The X coordinate for side 1 is negative, while the X coordinate for side 2 is positive
                            else
                            {
                                let actual_side_1_y = (svg_height / (side_1_top_x - side_1_bottom_x)) * side_1_top_x;
                                let actual_side_2_y = (svg_height / (side_2_bottom_x - side_2_top_x)) * (svg_width - side_2_top_x);

                                side_1 = [[side_1_top_x, 0], [0, actual_side_1_y], [0, svg_height]];
                                side_2 = [[svg_width, svg_height], [svg_width, actual_side_2_y], [side_2_top_x, 0]];
                            }
                        }

                        let sides = side_1.concat(side_2);
                        let region_points = "";

                        for (let [point_x, point_y] of sides)
                        {
                            region_points += `${point_x},${point_y} `;
                        }

                        region_points = region_points.substring(0, region_points.length - 1);
                        svg += polygon_strokeless_transparent(region_points, region.colour, 0.36);

                        // Add mapping lines

                        let y0 = 0;
                        let y1 = svg_height;

                        let x0 = axis.proteinScale(coord[need_flip ? 1 : 0].scaled);
                        let x1 = axis.scale(data.domainMap[region_key][coord[0].original]);

                        // Bottom X might be invisible
                        if (x1 < 0)
                        {
                            y1 = (svg_height / (x0 - x1)) * x0;
                            x1 = 0;
                        }
                        else if (x1 > svg_width)
                        {
                            y1 = (svg_height / (x1 - x0)) * (svg_width - x0);
                            x1 = svg_width;
                        }

                        svg += line(x0, y0, x1, y1, "#535353", 1);

                        y1 = svg_height;

                        x0 = axis.proteinScale(coord[need_flip ? 0 : 1].scaled);
                        x1 = axis.scale(data.domainMap[region_key][coord[1].original]);

                        // Bottom X might be invisible
                        if (x1 < 0)
                        {
                            y1 = (svg_height / (x0 - x1)) * x0;
                            x1 = 0;
                        }
                        else if (x1 > svg_width)
                        {
                            y1 = (svg_height / (x1 - x0)) * (svg_width - x0);
                            x1 = svg_width;
                        }

                        svg += line(x0, y0, x1, y1, "#535353", 1);
                    }
                }
            }

            if (this.show_motifs)
            {
                // Add shading for mapped motif regions
                let coords = this.motifCoords(true);
                let motifs = this.proteinData.originalData.motifs;
                for (let motif of motifs)
                {
                    let start = motif.start;
                    let end = motif.end;
                    let motif_key = `${motif.metadata.type}_${start}_${end}`;
                    let points = [start, end].sort();

                    for (let coord of coords)
                    {
                        let pair = [coord[0].original, coord[1].original].sort()
                        if (!((pair[0] == points[0]) && (pair[1] == points[1])))
                            continue;

                        // Shade the region

                        let side_1 = [];
                        let side_2 = [];

                        let side_1_top_x = axis.proteinScale(coord[need_flip ? 1 : 0].scaled);
                        let side_1_bottom_x = axis.scale(data.motifMap[motif_key][coord[0].original]);

                        let side_2_top_x = axis.proteinScale(coord[need_flip ? 0 : 1].scaled);
                        let side_2_bottom_x = axis.scale(data.motifMap[motif_key][coord[1].original]);

                        // For easier processing: The top X coordinate for side 1 must be lower than side 2
                        if (side_1_top_x > side_2_top_x)
                        {
                            let temp = side_1_top_x;
                            side_1_top_x = side_2_top_x;
                            side_2_top_x = temp;

                            temp = side_1_bottom_x;
                            side_1_bottom_x = side_2_bottom_x;
                            side_2_bottom_x = temp;
                        }

                        // The bottom X coordinate might not be visible
                        let is_side_1_bottom_x_invisible = (side_1_bottom_x < 0) || (side_1_bottom_x > svg_width);
                        let is_side_2_bottom_x_invisible = (side_2_bottom_x < 0) || (side_2_bottom_x > svg_width);

                        // Side 1 should be drawn from top to bottom, while side 2 should be drawn from bottom to top

                        if (!is_side_1_bottom_x_invisible)
                            side_1 = [[side_1_top_x, 0], [side_1_bottom_x, svg_height]];

                        if (!is_side_2_bottom_x_invisible)
                            side_2 = [[side_2_bottom_x, svg_height], [side_2_top_x, 0]];

                        // If one of the bottom X coordinates is invisible, there are 2 cases
                        if (is_side_1_bottom_x_invisible != is_side_2_bottom_x_invisible)
                        {
                            // Case 1: If the bottom X coordinate for side 1 is invisible, it must be negative
                            if (is_side_1_bottom_x_invisible)
                            {
                                let actual_y = (svg_height / (side_1_top_x - side_1_bottom_x)) * side_1_top_x;
                                side_1 = [[side_1_top_x, 0], [0, actual_y], [0, svg_height]];
                            }
                            // Case 2: If the bottom X coordinate for side 2 is invisible, it must be beyond the SVG width
                            else
                            {
                                let actual_y = (svg_height / (side_2_bottom_x - side_2_top_x)) * (svg_width - side_2_top_x);
                                side_2 = [[svg_width, svg_height], [svg_width, actual_y], [side_2_top_x, 0]];
                            }
                        }

                        // If both bottom X coordinates are invisible, there are 3 cases
                        if (is_side_1_bottom_x_invisible && is_side_2_bottom_x_invisible)
                        {
                            // Case 1: Both X coordinates are negative
                            if ((side_1_bottom_x < 0) && (side_2_bottom_x < 0))
                            {
                                let actual_side_1_y = (svg_height / (side_1_top_x - side_1_bottom_x)) * side_1_top_x;
                                let actual_side_2_y = (svg_height / (side_2_top_x - side_2_bottom_x)) * side_2_top_x;

                                side_1 = [[side_1_top_x, 0], [0, actual_side_1_y]];
                                side_2 = [[0, actual_side_2_y], [side_2_top_x, 0]];
                            }
                            // Case 2: Both X coordinates are beyond the SVG width
                            else if ((side_1_bottom_x > svg_width) && (side_2_bottom_x > svg_width))
                            {
                                let actual_side_1_y = (svg_height / (side_1_bottom_x - side_1_top_x)) * (svg_width - side_1_top_x);
                                let actual_side_2_y = (svg_height / (side_2_bottom_x - side_2_top_x)) * (svg_width - side_2_top_x);

                                side_1 = [[side_1_top_x, 0], [svg_width, actual_side_1_y]];
                                side_2 = [[svg_width, actual_side_2_y], [side_2_top_x, 0]];
                            }
                            // Case 3: The X coordinate for side 1 is negative, while the X coordinate for side 2 is positive
                            else
                            {
                                let actual_side_1_y = (svg_height / (side_1_top_x - side_1_bottom_x)) * side_1_top_x;
                                let actual_side_2_y = (svg_height / (side_2_bottom_x - side_2_top_x)) * (svg_width - side_2_top_x);

                                side_1 = [[side_1_top_x, 0], [0, actual_side_1_y], [0, svg_height]];
                                side_2 = [[svg_width, svg_height], [svg_width, actual_side_2_y], [side_2_top_x, 0]];
                            }
                        }

                        let sides = side_1.concat(side_2);
                        let motif_points = "";

                        for (let [point_x, point_y] of sides)
                        {
                            motif_points += `${point_x},${point_y} `;
                        }

                        motif_points = motif_points.substring(0, motif_points.length - 1);
                        svg += polygon_strokeless_transparent(motif_points, motif.colour, 0.36);

                        // Add mapping lines

                        let y0 = 0;
                        let y1 = svg_height;

                        let x0 = axis.proteinScale(coord[need_flip ? 1 : 0].scaled);
                        let x1 = axis.scale(data.motifMap[motif_key][coord[0].original]);

                        // Bottom X might be invisible
                        if (x1 < 0)
                        {
                            y1 = (svg_height / (x0 - x1)) * x0;
                            x1 = 0;
                        }
                        else if (x1 > svg_width)
                        {
                            y1 = (svg_height / (x1 - x0)) * (svg_width - x0);
                            x1 = svg_width;
                        }

                        svg += line(x0, y0, x1, y1, "#535353", 1);

                        y1 = svg_height;

                        x0 = axis.proteinScale(coord[need_flip ? 0 : 1].scaled);
                        x1 = axis.scale(data.motifMap[motif_key][coord[1].original]);

                        // Bottom X might be invisible
                        if (x1 < 0)
                        {
                            y1 = (svg_height / (x0 - x1)) * x0;
                            x1 = 0;
                        }
                        else if (x1 > svg_width)
                        {
                            y1 = (svg_height / (x1 - x0)) * (svg_width - x0);
                            x1 = svg_width;
                        }

                        svg += line(x0, y0, x1, y1, "#535353", 1);
                    }
                }
            }

            if (symbol)
                return [svg_width, svg_height, svg];

            svg = put_in_svg(svg_width, svg_height, svg);
            return svg;
        },

        build()
        {
            this.init();
            this.buildProtein();
            this.buildProteinMap();
        }
    },

    watch: {
        proteinData: function()
        {
            this.build();
        },
        show_domains: function()
        {
            this.build();
        },
        show_motifs: function()
        {
            this.build();
        },
        baseAxis: function()
        {
            this.build();
        }
    }
}
</script>