/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render an RNA modification levels plot, based on rnaModifLevelData which must be supplied as input.

<template>
<div id="RNALevelsDiv">
    <p class="text-center">RNA modification levels</p>
</div>
</template>
        
<script>
import * as d3 from 'd3';
import {put_in_svg, rect} from "~/assets/svg_utils";

export default {
    props: ["siteOrder", "rnaModifLevelData"],
    data: () => {
        return {
            show_rna_modif_heatmap: true,
            is_compact: false,
        };
    },

    methods: {
        buildHeatmap()
        {
            // dimensions
            let padding = 16,
            cellDim = 30,
            cellPad = 1;
            let colour = {
                heatmapLow: '#440154',
                heatmapMid: '#21918c',
                heatmapHigh: '#fde725',
                invalid: '#c2c2c2'
            };
            
            // Clear target element of content
            d3.select('#RNALevelsDiv').selectAll('*').remove();

            if (!this.show_rna_modif_heatmap)
                return;

            // Don't draw the heatmap if compact mode is enabled
            if (this.is_compact)
                return;

            // make copy of data and compute plot width
            let el = document.getElementById("heatmapDiv");
            if (!(el && this.siteOrder && (this.siteOrder.length > 0) && this.rnaModifLevelData))
                return;

            let boundary = el.getBoundingClientRect();
            let width = boundary.width - 2 * padding;

            // Labels of row and columns
            let sites = JSON.parse(JSON.stringify(this.siteOrder));
            let samples = this.rnaModifLevelData.labels;

            let rowCount = sites.length;
            let height = rowCount * (cellDim + cellPad) - cellPad;

            d3.select("#RNALevelsDiv").append("canvas")
                .attr("width", Math.ceil(width))
                .attr("height", Math.ceil(height))
                .attr("id", "RNALevelsCanvas");
            let canvas = document.getElementById("RNALevelsCanvas");
            let ctx = canvas.getContext("2d");

            // Add background colour
            ctx.fillStyle = colour.invalid;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let minVal = this.rnaModifLevelData.minValue;
            let average = this.rnaModifLevelData.average;
            let maxVal = this.rnaModifLevelData.maxValue;
            let myColor = d3.scaleLinear()
                .range([colour.heatmapLow, colour.heatmapMid, colour.heatmapHigh])
                .domain([minVal, average, maxVal]);

            let rows = rowCount;
            let cols = samples.length;
            let values = new Array(rows).fill(undefined).map(() => new Array(cols).fill(undefined));

            let cell_values = this.rnaModifLevelData.export;
            for (let i = 0; i < rows; ++i)
            {
                let site = sites[i];
                for (let j = 0; j < cols; ++j)
                {
                    let sample = samples[j];
                    if (cell_values[site] && !isNaN(cell_values[site][sample]))
                        values[i][j] = cell_values[site][sample];
                }
            }

            let cell_width = canvas.width / cols;
            let cell_height = canvas.height / rows;

            // Fill each cell with the correct colour
            for (let i = 0; i < rows; ++i)
            {
                let row = values[i];
                for (let j = 0; j < cols; ++j)
                {
                    let value = row[j];
                    if ((value == undefined) || Number.isNaN(value))
                        continue;

                    let x = Math.round(cell_width * j);
                    let y = Math.round(cell_height * i);
                    let cell_colour = myColor(value);

                    ctx.fillStyle = cell_colour;
                    ctx.fillRect(x, y, Math.ceil(cell_width), Math.ceil(cell_height));
                }
            }

            // add tooltip
            let tooltip = d3.select("#RNALevelsDiv")
                            .append("div")
                            .attr("class", "tooltip")
                            .style("visibility", "hidden")
                            .style("opacity", 1)
                            .style("background-color", "white")
                            .style("border", "solid")
                            .style("border-width", "2px")
                            .style("border-radius", "5px")
                            .style("padding", "5px");

            // function to stop tooltip extending past the edge of screen
            let calculateLeftVal = (x) => {
                return (boundary.right - x < 165) ? boundary.right - 165 : x;
            }

            // hide tooltip when mouse leaves heatmap
            let hide_tooltip = function()
            {
                tooltip.style("visibility", "hidden");
            }

            // make tooltip follow cursor
            let display_tooltip = function(evt)
            {
                let clientX = evt.clientX;
                let clientY = evt.clientY;

                let canvas_rect = canvas.getBoundingClientRect();
                let canvas_rect_left = canvas_rect.left;
                let canvas_rect_top = canvas_rect.top;

                let x_diff = clientX - canvas_rect_left;
                let y_diff = clientY - canvas_rect_top;

                let row = Math.floor((y_diff * sites.length) / canvas.height);
                let col = Math.floor((x_diff * samples.length) / canvas.width);
                let site = sites[row];
                let sample = samples[col];
                let value = values[row][col];

                let div = document.getElementById("RNALevelsDiv");
                let boundary = div.getBoundingClientRect();
                let leftVal = (calculateLeftVal(clientX) - boundary.left + padding + 7);
                let topVal = (clientY - boundary.top + padding + 5);

                tooltip.html(`Sample: ${sample}<br>Site location: ${site}<br>RNA modification level: ${value}<br>`)
                    .style("visibility", "visible")
                    .style("left", leftVal + "px").style("top", topVal + "px");
            }

            // Add tooltip event listeners to the entire heatmap
            d3.select("#RNALevelsDiv").select("canvas")
                .on("mouseover", function (evt) {display_tooltip(evt);})
                .on("mousemove", function (evt) {display_tooltip(evt);})
                .on("mouseleave", hide_tooltip)
                .on("contextmenu", function (evt) {evt.preventDefault();});
        },

        buildHeatmapSvg(symbol = false)
        {
            // dimensions
            let padding = 16,
            cellDim = 30,
            cellPad = 1;
            let colour = {
                heatmapLow: '#440154',
                heatmapMid: '#21918c',
                heatmapHigh: '#fde725',
                invalid: '#c2c2c2'
            };

            // make copy of data and compute plot width
            let el = document.getElementById("RNALevelsDiv");
            if (!el || !this.rnaModifLevelData || !this.siteOrder || (this.siteOrder.length === 0) || !this.show_rna_modif_heatmap || this.is_compact)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }
            let boundary = el.getBoundingClientRect();
            let width = boundary.width - 2 * padding;

            // Labels of row and columns
            let sites = JSON.parse(JSON.stringify(this.siteOrder));
            let samples = this.rnaModifLevelData.labels;

            let rowCount = sites.length;
            let height = rowCount * (cellDim + cellPad) - cellPad;

            width = Math.ceil(width);
            height = Math.ceil(height);

            // Add background colour
            let svg = rect(0, 0, width, height, colour.invalid);

            let minVal = this.rnaModifLevelData.minValue;
            let average = this.rnaModifLevelData.average;
            let maxVal = this.rnaModifLevelData.maxValue;
            let myColor = d3.scaleLinear()
                .range([colour.heatmapLow, colour.heatmapMid, colour.heatmapHigh])
                .domain([minVal, average, maxVal]);

            let rows = rowCount;
            let cols = samples.length;
            let values = new Array(rows).fill(undefined).map(() => new Array(cols).fill(undefined));

            let cell_values = this.rnaModifLevelData.export;
            for (let i = 0; i < rows; ++i)
            {
                let site = sites[i];
                for (let j = 0; j < cols; ++j)
                {
                    let sample = samples[j];
                    if (cell_values[site] && !isNaN(cell_values[site][sample]))
                        values[i][j] = cell_values[site][sample];
                }
            }

            let cell_width = width / cols;
            let cell_height = height / rows;

            // Fill each cell with the correct colour
            for (let i = 0; i < rows; ++i)
            {
                let row = values[i];
                for (let j = 0; j < cols; ++j)
                {
                    let value = row[j];
                    if ((value == undefined) || Number.isNaN(value))
                        continue;

                    let x = Math.round(cell_width * j);
                    let y = Math.round(cell_height * i);
                    let cell_colour = d3.color(myColor(value)).formatHex();

                    svg += rect(x, y, Math.ceil(cell_width), Math.ceil(cell_height), cell_colour);
                }
            }

            if (symbol)
                return [width, height, svg];

            svg = put_in_svg(width, height, svg);
            return svg;
        }
    },

    watch: {
        show_rna_modif_heatmap: function() {
            this.buildHeatmap();
        },
        siteOrder: function() {
            this.buildHeatmap();
        }
    }
}
</script>