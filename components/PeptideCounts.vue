/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render a peptide counts plot, based on peptideCountsData which must be supplied as input.

<template>
<div id="peptideCountsDiv">
    <p class="text-center">Peptide counts</p>
</div>
</template>
        
<script>
import * as d3 from 'd3';
import {put_in_svg, rect} from "~/assets/svg_utils";

export default {
    props: ["peptideOrder", "peptideCountsData"],
    data: () => {
        return {
            show_peptide_heatmap: true,
            logTransform: false,
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
            d3.select('#peptideCountsDiv').selectAll('*').remove();

            if (!this.show_peptide_heatmap)
                return;

            // Don't draw the heatmap if compact mode is enabled
            if (this.is_compact)
                return;

            // make copy of data and compute plot width
            let el = document.getElementById("heatmapDiv");
            if (!(el && this.peptideOrder && (this.peptideOrder.length > 0) && this.peptideCountsData)) return;
            let boundary = el.getBoundingClientRect();
            let width = boundary.width - 2 * padding;

            // Labels of row and columns
            let peptides = JSON.parse(JSON.stringify(this.peptideOrder));
            let samples = this.peptideCountsData.labels;

            let rowCount = peptides.length;
            let height = rowCount * (cellDim + cellPad) - cellPad;

            d3.select("#peptideCountsDiv").append("canvas")
                .attr("width", Math.ceil(width))
                .attr("height", Math.ceil(height))
                .attr("id", "peptideCountsCanvas");
            let canvas = document.getElementById("peptideCountsCanvas");
            let ctx = canvas.getContext("2d");

            // Add background colour
            ctx.fillStyle = colour.invalid;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let minVal = this.peptideCountsData.minValue;
            let average = this.peptideCountsData.average;
            let maxVal = this.peptideCountsData.maxValue;
            let myColor = d3.scaleLinear()
                .range([colour.heatmapLow, colour.heatmapMid, colour.heatmapHigh])
                .domain([minVal, average, maxVal]);

            let rows = rowCount;
            let cols = samples.length;
            let values = new Array(rows).fill(undefined).map(() => new Array(cols).fill(undefined));

            let cell_values = this.peptideCountsData.export;
            for (let i = 0; i < rows; ++i)
            {
                let peptide = peptides[i];
                for (let j = 0; j < cols; ++j)
                {
                    let sample = samples[j];
                    if (cell_values[peptide] && !isNaN(cell_values[peptide][sample]))
                        values[i][j] = cell_values[peptide][sample];
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
            // let self = this;
            let tooltip = d3.select("#peptideCountsDiv")
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

                let row = Math.floor((y_diff * peptides.length) / canvas.height);
                let col = Math.floor((x_diff * samples.length) / canvas.width);
                let peptide = peptides[row];
                let sample = samples[col];
                let value = values[row][col];

                let div = document.getElementById("peptideCountsDiv");
                let boundary = div.getBoundingClientRect();
                let leftVal = (calculateLeftVal(clientX) - boundary.left + padding + 7);
                let topVal = (clientY - boundary.top + padding + 5);

                tooltip.html(`Sample: ${sample}<br>Peptide: ${peptide}<br>Value: ${value}<br>`)
                    .style("visibility", "visible")
                    .style("left", leftVal + "px").style("top", topVal + "px");
            }

            // Add tooltip event listeners to the entire heatmap
            d3.select("#peptideCountsDiv").select("canvas")
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
            let el = document.getElementById("heatmapDiv");
            // if (!(el && this.peptideOrder && (this.peptideOrder.length > 0) && this.peptideCountsData))
            if (!el || !this.peptideCountsData || !this.peptideOrder || (this.peptideOrder.length === 0) || !this.show_peptide_heatmap || this.is_compact)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }
            let boundary = el.getBoundingClientRect();
            let width = boundary.width - 2 * padding;

            // Labels of row and columns
            let peptides = JSON.parse(JSON.stringify(this.peptideOrder));
            let samples = this.peptideCountsData.labels;

            let rowCount = peptides.length;
            let height = rowCount * (cellDim + cellPad) - cellPad;

            width = Math.ceil(width);
            height = Math.ceil(height);

            // Add background colour
            let svg = rect(0, 0, width, height, colour.invalid);

            let minVal = this.peptideCountsData.minValue;
            let average = this.peptideCountsData.average;
            let maxVal = this.peptideCountsData.maxValue;
            let myColor = d3.scaleLinear()
                .range([colour.heatmapLow, colour.heatmapMid, colour.heatmapHigh])
                .domain([minVal, average, maxVal]);

            let rows = rowCount;
            let cols = samples.length;
            let values = new Array(rows).fill(undefined).map(() => new Array(cols).fill(undefined));

            let cell_values = this.peptideCountsData.export;
            for (let i = 0; i < rows; ++i)
            {
                let peptide = peptides[i];
                for (let j = 0; j < cols; ++j)
                {
                    let sample = samples[j];
                    if (cell_values[peptide] && !isNaN(cell_values[peptide][sample]))
                        values[i][j] = cell_values[peptide][sample];
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
        show_peptide_heatmap: function() {
            this.buildHeatmap();
        },
        peptideOrder: function() {
            this.buildHeatmap();
        }
    }
}
</script>