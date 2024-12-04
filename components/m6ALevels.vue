/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render an m6A modification levels plot, based on m6aLevelData which must be supplied as input.

<template>
<div id="m6ALevelsDiv">
    <p class="text-center">m6A modification levels</p>
</div>
</template>
        
<script>
import * as d3 from 'd3';
// import {put_in_svg, rect} from "~/assets/svg_utils";

export default {
    props: ["siteOrder", "m6aLevelData"],
    data: () => {
        return {
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
            d3.select('#m6ALevelsDiv').selectAll('*').remove();

            // Don't draw the heatmap if compact mode is enabled
            if (this.is_compact)
                return;

            // make copy of data and compute plot width
            let el = document.getElementById("heatmapDiv");
            if (!(el && this.siteOrder && (this.siteOrder.length > 0) && this.m6aLevelData))
                return;

            let boundary = el.getBoundingClientRect();
            let width = boundary.width - 2 * padding;

            // Labels of row and columns
            let sites = JSON.parse(JSON.stringify(this.siteOrder));
            let samples = JSON.parse(JSON.stringify(this.m6aLevelData.samples));
            samples.splice(this.m6aLevelData.location_colnum, 1);

            for (let i = 0; i < samples.length; ++i)
            {
                let sample = samples[i].toLowerCase();
                if (sample === "gene_id")
                {
                    samples.splice(i, 1);
                    break;
                }
            }

            let rowCount = sites.length;
            let height = rowCount * (cellDim + cellPad) - cellPad;

            d3.select("#m6ALevelsDiv").append("canvas")
                .attr("width", Math.ceil(width))
                .attr("height", Math.ceil(height))
                .attr("id", "m6aLevelsCanvas");
            let canvas = document.getElementById("m6aLevelsCanvas");
            let ctx = canvas.getContext("2d");

            // Add background colour
            ctx.fillStyle = colour.invalid;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let minVal = this.m6aLevelData.minValue;
            let average = this.m6aLevelData.average;
            let maxVal = this.m6aLevelData.maxValue;
            let myColor = d3.scaleLinear()
                .range([colour.heatmapLow, colour.heatmapMid, colour.heatmapHigh])
                .domain([minVal, average, maxVal]);

            let rows = rowCount;
            let cols = samples.length;
            let values = new Array(rows).fill(undefined).map(() => new Array(cols).fill(undefined));

            let cell_values = this.m6aLevelData.export;
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
                    if (value == undefined)
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
            let tooltip = d3.select("#m6ALevelsDiv")
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

                let div = document.getElementById("m6ALevelsDiv");
                let boundary = div.getBoundingClientRect();
                let leftVal = (calculateLeftVal(clientX) - boundary.left + padding + 7);
                let topVal = (clientY - boundary.top + padding + 5);

                tooltip.html(`Sample: ${sample}<br>Site location: ${site}<br>m6A modification level: ${value}<br>`)
                    .style("visibility", "visible")
                    .style("left", leftVal + "px").style("top", topVal + "px");
            }

            // Add tooltip event listeners to the entire heatmap
            d3.select("#m6ALevelsDiv").select("canvas")
                .on("mouseover", function (evt) {display_tooltip(evt);})
                .on("mousemove", function (evt) {display_tooltip(evt);})
                .on("mouseleave", hide_tooltip);
        },

        // buildHeatmapSvg(symbol = false)
        // {
        //     // dimensions
        //     let padding = 16,
        //     cellDim = 50,
        //     cellPad = 1;
        //     let colour = {
        //         heatmapLow: '#1170aa', // '#962705',
        //         heatmapMid: '#fff8e6', // 'white',
        //         heatmapHigh: '#fc7d0b',
        //         invalid: '#c2c2c2'
        //     };

        //     // make copy of data and compute plot width
        //     let el = document.getElementById("m6ALevelsDiv");
        //     if (!(el && this.heatmapData))
        //     {
        //         if (symbol)
        //             return [-1, -1, null];
        //         return "";
        //     }
        //     let boundary = el.getBoundingClientRect();
        //     let width = boundary.width - 2 * padding;

        //     // Labels of row and columns
        //     let samples = JSON.parse(JSON.stringify(this.heatmapData.samples));

        //     for (let i = 0; i < samples.length; ++i)
        //     {
        //         let sample = samples[i].toLowerCase();
        //         if (sample === "transcript_id")
        //         {
        //             samples.splice(i, 1);
        //             break;
        //         }
        //     }

        //     let transcripts = this.heatmapData.transcriptOrder.slice();
        //     let rowCount = transcripts.length;
        //     let height = rowCount * (cellDim + cellPad) - cellPad;

        //     // Create an array of uppercase transcripts so that case-insensitive comparison can be performed later
        //     let uppercase_transcripts = [...transcripts];
        //     for (let i = 0; i < rowCount; ++i)
        //         uppercase_transcripts[i] = uppercase_transcripts[i].toUpperCase();

        //     width = Math.ceil(width);
        //     height = Math.ceil(height);

        //     // Add background colour
        //     let svg = rect(0, 0, width, height, colour.invalid);

        //     let minVal = this.logTransform ? this.heatmapData.logMin : this.heatmapData.minValue;
        //     let average = this.logTransform ? this.heatmapData.logAverage : this.heatmapData.average;
        //     let maxVal = this.logTransform ? this.heatmapData.logMax : this.heatmapData.maxValue;
        //     let myColor = d3.scaleLinear()
        //         .range([colour.heatmapLow, colour.heatmapMid, colour.heatmapHigh])
        //         .domain([minVal, average, maxVal]);

        //     let rows = uppercase_transcripts.length;
        //     let cols = samples.length;
        //     let values = new Array(rows).fill(undefined).map(() => new Array(cols).fill(undefined));

        //     let cell_values = this.logTransform ? this.heatmapData.logExport : this.heatmapData.export;
        //     for (let cell_value of cell_values)
        //     {
        //         let transcript = cell_value.transcript;
        //         let sample = cell_value.sample;
        //         let value = cell_value.value;

        //         let transcript_index = uppercase_transcripts.indexOf(transcript.toUpperCase());
        //         let sample_index = samples.indexOf(sample);

        //         if (transcript_index === -1 || sample_index === -1)
        //             continue;

        //         values[transcript_index][sample_index] = value;
        //     }

        //     let cell_width = width / cols;
        //     let cell_height = height / rows;

        //     // Fill each cell with the correct colour
        //     for (let i = 0; i < rows; ++i)
        //     {
        //         let row = values[i];
        //         for (let j = 0; j < cols; ++j)
        //         {
        //             let value = row[j];
        //             if (value == undefined)
        //                 continue;

        //             let x = Math.round(cell_width * j);
        //             let y = Math.round(cell_height * i);
        //             let cell_colour = d3.color(myColor(value)).formatHex();

        //             svg += rect(x, y, Math.ceil(cell_width), Math.ceil(cell_height), cell_colour);
        //         }
        //     }

        //     if (symbol)
        //         return [width, height, svg];

        //     svg = put_in_svg(width, height, svg);
        //     return svg;
        // }
    },

    watch: {
        siteOrder: function() {
            this.buildHeatmap();
        }
    }
}
</script>