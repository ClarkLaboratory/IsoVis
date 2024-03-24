/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render a heatmap plot, based on heatmapData which must be supplied as input.
See 'secondaryData' key in demo_data.json for example data.

<template>
<div id="heatmapDiv">
    <p class="text-center">Heatmap plot</p>
</div>
</template>
        
<script>
import * as d3 from 'd3';
import {put_in_svg, rect} from "~/assets/svg_utils";

export default {
    props: ["heatmapData"],
    data: () => {
        return {
            logTransform: false
        };
    },

    methods: {
        buildHeatmap()
        {
            // dimensions
            let padding = 16,
            cellDim = 50,
            cellPad = 1;
            let colour = {
                heatmapLow: '#1170aa', // '#962705',
                heatmapMid: '#fff8e6', // 'white',
                heatmapHigh: '#fc7d0b',
                invalid: '#c2c2c2'
            };
            
            // Clear target element of content
            d3.select('#heatmapDiv').selectAll('*').remove();

            // make copy of data and compute plot width
            let el = document.getElementById("heatmapDiv");
            if (!(el && this.heatmapData)) return;
            let boundary = el.getBoundingClientRect();
            let width = boundary.width - 2 * padding;

            // Labels of row and columns
            let samples = JSON.parse(JSON.stringify(this.heatmapData.samples));
            samples.splice(this.heatmapData.gene_id_colnum, 1);

            for (let i = 0; i < samples.length; ++i)
            {
                let sample = samples[i].toLowerCase();
                if (sample === "transcript_id")
                {
                    samples.splice(i, 1);
                    break;
                }
            }

            let transcripts = this.heatmapData.transcriptOrder.slice();
            let rowCount = transcripts.length;
            let height = rowCount * (cellDim + cellPad) - cellPad;

            // Create an array of uppercase transcripts so that case-insensitive comparison can be performed later
            let uppercase_transcripts = [...transcripts];
            for (let i = 0; i < rowCount; ++i)
                uppercase_transcripts[i] = uppercase_transcripts[i].toUpperCase();

            d3.select("#heatmapDiv").append("canvas")
                .attr("width", Math.ceil(width))
                .attr("height", Math.ceil(height))
                .attr("id", "heatmapCanvas");
            let canvas = document.getElementById("heatmapCanvas");
            let ctx = canvas.getContext("2d");

            // Add background colour
            ctx.fillStyle = colour.invalid;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let minVal = this.logTransform ? this.heatmapData.logMin : this.heatmapData.minValue;
            let average = this.logTransform ? this.heatmapData.logAverage : this.heatmapData.average;
            let maxVal = this.logTransform ? this.heatmapData.logMax : this.heatmapData.maxValue;
            let myColor = d3.scaleLinear()
                .range([colour.heatmapLow, colour.heatmapMid, colour.heatmapHigh])
                .domain([minVal, average, maxVal]);

            let rows = uppercase_transcripts.length;
            let cols = samples.length;
            let values = new Array(rows).fill(undefined).map(() => new Array(cols).fill(undefined));

            let cell_values = this.logTransform ? this.heatmapData.logExport : this.heatmapData.export;
            for (let cell_value of cell_values)
            {
                let transcript = cell_value.transcript;
                let sample = cell_value.sample;
                let value = cell_value.value;

                let transcript_index = uppercase_transcripts.indexOf(transcript.toUpperCase());
                let sample_index = samples.indexOf(sample);

                if (transcript_index === -1 || sample_index === -1)
                    continue;

                values[transcript_index][sample_index] = value;
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
            let tooltip = d3.select("#heatmapDiv")
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

                let row = Math.floor((y_diff * transcripts.length) / canvas.height);
                let col = Math.floor((x_diff * samples.length) / canvas.width);
                let transcript = transcripts[row];
                let sample = samples[col];
                let value = values[row][col];

                let heatmap_div = document.getElementById("heatmapDiv");
                let boundary = heatmap_div.getBoundingClientRect();
                let leftVal = (calculateLeftVal(clientX) - boundary.left + padding + 7);
                let topVal = (clientY - boundary.top + padding + 5);

                tooltip.html(`Sample: ${sample}<br>Transcript: ${transcript}<br>Value: ${value}<br>`)
                    .style("visibility", "visible")
                    .style("left", leftVal + "px").style("top", topVal + "px");
            }

            // Add tooltip event listeners to the entire heatmap
            d3.select("#heatmapDiv").select("canvas")
                .on("mouseover", function (evt) {display_tooltip(evt);})
                .on("mousemove", function (evt) {display_tooltip(evt);})
                .on("mouseleave", hide_tooltip);
        },

        buildHeatmapSvg(symbol = false)
        {
            // dimensions
            let padding = 16,
            cellDim = 50,
            cellPad = 1;
            let colour = {
                heatmapLow: '#1170aa', // '#962705',
                heatmapMid: '#fff8e6', // 'white',
                heatmapHigh: '#fc7d0b',
                invalid: '#c2c2c2'
            };

            // make copy of data and compute plot width
            let el = document.getElementById("heatmapDiv");
            if (!(el && this.heatmapData))
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }
            let boundary = el.getBoundingClientRect();
            let width = boundary.width - 2 * padding;

            // Labels of row and columns
            let samples = JSON.parse(JSON.stringify(this.heatmapData.samples));
            samples.splice(this.heatmapData.gene_id_colnum, 1);

            for (let i = 0; i < samples.length; ++i)
            {
                let sample = samples[i].toLowerCase();
                if (sample === "transcript_id")
                {
                    samples.splice(i, 1);
                    break;
                }
            }

            let transcripts = this.heatmapData.transcriptOrder.slice();
            let rowCount = transcripts.length;
            let height = rowCount * (cellDim + cellPad) - cellPad;

            // Create an array of uppercase transcripts so that case-insensitive comparison can be performed later
            let uppercase_transcripts = [...transcripts];
            for (let i = 0; i < rowCount; ++i)
                uppercase_transcripts[i] = uppercase_transcripts[i].toUpperCase();

            width = Math.ceil(width);
            height = Math.ceil(height);

            // Add background colour
            let svg = rect(0, 0, width, height, colour.invalid);

            let minVal = this.logTransform ? this.heatmapData.logMin : this.heatmapData.minValue;
            let average = this.logTransform ? this.heatmapData.logAverage : this.heatmapData.average;
            let maxVal = this.logTransform ? this.heatmapData.logMax : this.heatmapData.maxValue;
            let myColor = d3.scaleLinear()
                .range([colour.heatmapLow, colour.heatmapMid, colour.heatmapHigh])
                .domain([minVal, average, maxVal]);

            let rows = uppercase_transcripts.length;
            let cols = samples.length;
            let values = new Array(rows).fill(undefined).map(() => new Array(cols).fill(undefined));

            let cell_values = this.logTransform ? this.heatmapData.logExport : this.heatmapData.export;
            for (let cell_value of cell_values)
            {
                let transcript = cell_value.transcript;
                let sample = cell_value.sample;
                let value = cell_value.value;

                let transcript_index = uppercase_transcripts.indexOf(transcript.toUpperCase());
                let sample_index = samples.indexOf(sample);

                if (transcript_index === -1 || sample_index === -1)
                    continue;

                values[transcript_index][sample_index] = value;
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
                    if (value == undefined)
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
        heatmapData: function() {
            this.buildHeatmap();
        },
        logTransform: function() {
            this.buildHeatmap();
        }
    }
}
</script>