/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render a heatmap legend plot, based on heatmapData which must be supplied as input.
See 'secondaryData' key in demo_data.json for example data.

<template>
<div>
    <div id="heatmapLegendDiv">
        <p>Heatmap legend</p>
    </div>
</div>
</template>
        
<script>
import * as d3 from 'd3';
import {put_in_svg, rect, line, heatmap_legend_text, linear_gradient, text, text_centered, text_right_aligned} from "~/assets/svg_utils";

export default {
    props: ["heatmapData"],
    data: () => {
        return {
            logTransform: false
        };
    },

    methods: {
        buildHeatmapLegend() {
            // Clear the space of any content
            d3.select('#heatmapLegendDiv').selectAll('*').remove();

            let el = document.getElementById("heatmapDiv");
            if (!(el && this.heatmapData)) return;

            let data = JSON.parse(JSON.stringify(this.heatmapData.samples));
            data.splice(this.heatmapData.gene_id_colnum, 1);

            for (let i = 0; i < data.length; ++i)
            {
                let sample = data[i].toLowerCase();
                if (sample === "transcript_id")
                {
                    data.splice(i, 1);
                    break;
                }
            }

            let padding = 16;
            let boundary = el.getBoundingClientRect();
            let width = boundary.width - 2 * padding;
            let colour = {
                heatmapLow: '#1170aa', // '#962705',
                heatmapMid: '#fff8e6', // 'white',
                heatmapHigh: '#fc7d0b',
                invalid: '#c2c2c2'
            };

            let height = 0;
            let font_size = 14.0;

            d3.select("#heatmapLegendDiv").append("canvas").attr("id", "fontSizeCalcCanvas");
            let fontSizeCalcCanvas = document.getElementById("fontSizeCalcCanvas");
            let fontSizeCalcCanvas_ctx = fontSizeCalcCanvas.getContext("2d");
            let canvas_width = Math.ceil(width);
            let num_samples = data.length;
            let cell_width = canvas_width / num_samples;

            fontSizeCalcCanvas_ctx.textBaseline = "bottom";
            while (font_size > 2.0)
            {
                fontSizeCalcCanvas_ctx.font = `${font_size}px sans-serif`;
                let spans = [];
                for (let i = 0; i < num_samples; ++i)
                {
                    let sample = data[i];
                    let x_coord = -Math.round(cell_width * (i + 0.5));
                    let sample_text_metrics = fontSizeCalcCanvas_ctx.measureText(sample);
                    let sample_text_height = sample_text_metrics.actualBoundingBoxAscent + sample_text_metrics.actualBoundingBoxDescent;
                    spans.push([x_coord + Math.round(sample_text_height / 2), x_coord - sample_text_height / 2]);
                }

                let not_overlapping = true;
                for (let i = 0; i < spans.length - 1; ++i)
                {
                    if (spans[i][1] - spans[i + 1][0] < 1)
                    {
                        not_overlapping = false;
                        break;
                    }
                }

                if (not_overlapping && (spans[0][0] < 0) && (spans[spans.length - 1][1] >= -(canvas_width - 1)))
                    break;

                font_size -= 0.1;
            }

            d3.select('#heatmapLegendDiv').selectAll('*').remove();

            d3.select("#heatmapLegendDiv").append("canvas").attr("id", "heightCalcCanvas");
            let heightCalcCanvas = document.getElementById("heightCalcCanvas");
            let heightCalcCanvas_ctx = heightCalcCanvas.getContext("2d");
            heightCalcCanvas_ctx.font = `${font_size}px sans-serif`;

            for (let i = 0; i < num_samples; ++i)
            {
                let sample = data[i];
                let sample_text_height = heightCalcCanvas_ctx.measureText(sample).width;
                if (height < sample_text_height)
                    height = sample_text_height;
            }

            height += 30 + 15 + 25;
            d3.select('#heatmapLegendDiv').selectAll('*').remove();

            d3.select("#heatmapLegendDiv").append("canvas")
                .attr("width", Math.ceil(width))
                .attr("height", Math.ceil(height))
                .attr("id", "heatmapLegendCanvas");
            let canvas = document.getElementById("heatmapLegendCanvas");
            let ctx = canvas.getContext("2d");
            ctx.font = `${font_size}px sans-serif`;
            ctx.textBaseline = "bottom";

            ctx.beginPath();

            // Draw the horizontal axis line
            ctx.moveTo(0, 0);
            ctx.lineTo(canvas.width - 1, 0);

            // Draw the vertical ticks
            for (let i = 0; i < num_samples; ++i)
            {
                let x_coord = Math.round(cell_width * (i + 0.5));

                ctx.moveTo(x_coord, 0);
                ctx.lineTo(x_coord, 5);
            }

            ctx.stroke();

            // Draw the sample names below the ticks
            ctx.save();
            ctx.rotate(Math.PI / 2);

            for (let i = 0; i < num_samples; ++i)
            {
                let sample = data[i];
                let sample_text_metrics = ctx.measureText(sample);
                let sample_text_height = sample_text_metrics.actualBoundingBoxAscent + sample_text_metrics.actualBoundingBoxDescent;
                let x_coord = -Math.round(cell_width * (i + 0.5)) + Math.round(sample_text_height / 2);
                ctx.fillText(sample, 9, x_coord);
            }

            ctx.restore();

            // Draw the colour gradient
            let legendWidth = canvas.width / 1.5;
            let gradient = ctx.createLinearGradient((canvas.width - legendWidth) / 2, 0, (canvas.width + legendWidth) / 2, 0);
            gradient.addColorStop(0, colour.heatmapLow);
            gradient.addColorStop(0.5, colour.heatmapMid);
            gradient.addColorStop(1, colour.heatmapHigh);

            ctx.save();
            ctx.fillStyle = gradient;
            ctx.fillRect((canvas.width - legendWidth) / 2, height - 15 - 25, legendWidth, 15);
            ctx.restore();

            // Draw the min/mid/max value labels

            // text formatting for min/max/avg value labels
            let getLabel = (val) => {
                if (val === undefined)
                    return "NaN";
                val = Number.isInteger(val) ? val.toFixed() : val.toFixed(2);
                if (val.length > 1 && val.split('.')[1] == '00')
                    val = val.split('.')[0];
                return val;
            }

            // add and position labels to legend
            let min = this.logTransform ? this.heatmapData.logMin : this.heatmapData.minValue;
            let mid = this.logTransform ? this.heatmapData.logAverage : this.heatmapData.average;
            let max = this.logTransform ? this.heatmapData.logMax : this.heatmapData.maxValue;

            let min_label = getLabel(min);
            let mid_label = getLabel(mid);
            let max_label = getLabel(max);

            font_size = 12.0;
            let min_label_end, mid_label_start, mid_label_end, mid_label_width, max_label_start;

            while (font_size > 2.0)
            {
                ctx.font = `${font_size}px sans-serif`;

                min_label_end = ((canvas.width - legendWidth) / 2) + ctx.measureText(min_label).width;
                max_label_start = ((canvas.width + legendWidth) / 2) - ctx.measureText(max_label).width;

                mid_label_width = ctx.measureText(mid_label).width;
                mid_label_start = (canvas.width - mid_label_width) / 2;
                mid_label_end = (canvas.width + mid_label_width) / 2;

                if ((mid_label_start - min_label_end >= 5) && (max_label_start - mid_label_end >= 5))
                    break;

                font_size -= 0.1;
            }

            ctx.fillText(min_label, (canvas.width - legendWidth) / 2, height);
            ctx.fillText(mid_label, mid_label_start, height);
            ctx.fillText(max_label, max_label_start, height);
        },

        buildHeatmapLegendSvg(symbol = false)
        {
            let el = document.getElementById("heatmapDiv");
            if (!(el && this.heatmapData))
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            let data = JSON.parse(JSON.stringify(this.heatmapData.samples));
            data.splice(this.heatmapData.gene_id_colnum, 1);

            for (let i = 0; i < data.length; ++i)
            {
                let sample = data[i].toLowerCase();
                if (sample === "transcript_id")
                {
                    data.splice(i, 1);
                    break;
                }
            }

            let padding = 16;
            let boundary = el.getBoundingClientRect();
            let width = boundary.width - 2 * padding;
            let colour = {
                heatmapLow: '#1170aa', // '#962705',
                heatmapMid: '#fff8e6', // 'white',
                heatmapHigh: '#fc7d0b',
                invalid: '#c2c2c2'
            };

            let height = 0;
            let font_size = 14.0;

            d3.select("#heatmapLegendDiv").append("canvas").attr("id", "fontSizeCalcCanvas");
            let fontSizeCalcCanvas = document.getElementById("fontSizeCalcCanvas");
            let fontSizeCalcCanvas_ctx = fontSizeCalcCanvas.getContext("2d");
            let canvas_width = Math.ceil(width);
            let num_samples = data.length;
            let cell_width = canvas_width / num_samples;

            fontSizeCalcCanvas_ctx.textBaseline = "bottom";
            while (font_size > 2.0)
            {
                fontSizeCalcCanvas_ctx.font = `${font_size}px sans-serif`;
                let spans = [];
                for (let i = 0; i < num_samples; ++i)
                {
                    let sample = data[i];
                    let x_coord = -Math.round(cell_width * (i + 0.5));
                    let sample_text_metrics = fontSizeCalcCanvas_ctx.measureText(sample);
                    let sample_text_height = sample_text_metrics.actualBoundingBoxAscent + sample_text_metrics.actualBoundingBoxDescent;
                    spans.push([x_coord + Math.round(sample_text_height / 2), x_coord - sample_text_height / 2]);
                }

                let not_overlapping = true;
                for (let i = 0; i < spans.length - 1; ++i)
                {
                    if (spans[i][1] - spans[i + 1][0] < 1)
                    {
                        not_overlapping = false;
                        break;
                    }
                }

                if (not_overlapping && (spans[0][0] < 0) && (spans[spans.length - 1][1] >= -(canvas_width - 1)))
                    break;

                font_size -= 0.1;
            }

            // text formatting for min/max/avg value labels
            let getLabel = (val) => {
                if (val === undefined)
                    return "NaN";
                val = Number.isInteger(val) ? val.toFixed() : val.toFixed(2);
                if (val.length > 1 && val.split('.')[1] == '00')
                    val = val.split('.')[0];
                return val;
            }

            // add and position labels to legend
            let min = this.logTransform ? this.heatmapData.logMin : this.heatmapData.minValue;
            let mid = this.logTransform ? this.heatmapData.logAverage : this.heatmapData.average;
            let max = this.logTransform ? this.heatmapData.logMax : this.heatmapData.maxValue;

            let min_label = getLabel(min);
            let mid_label = getLabel(mid);
            let max_label = getLabel(max);

            let text_font_size = 12.0;
            let min_label_end, mid_label_start, mid_label_end, mid_label_width, max_label_start;

            let svg_width = Math.ceil(width);
            let legendWidth = svg_width / 1.5;

            while (text_font_size > 2.0)
            {
                fontSizeCalcCanvas_ctx.font = `${text_font_size}px sans-serif`;

                min_label_end = ((svg_width - legendWidth) / 2) + fontSizeCalcCanvas_ctx.measureText(min_label).width;
                max_label_start = ((svg_width + legendWidth) / 2) - fontSizeCalcCanvas_ctx.measureText(max_label).width;

                mid_label_width = fontSizeCalcCanvas_ctx.measureText(mid_label).width;
                mid_label_start = (svg_width - mid_label_width) / 2;
                mid_label_end = (svg_width + mid_label_width) / 2;

                if ((mid_label_start - min_label_end >= 5) && (max_label_start - mid_label_end >= 5))
                    break;

                text_font_size -= 0.1;
            }

            let log_transform_enabled_font_size = 12.0;
            if (this.logTransform)
            {
                while (log_transform_enabled_font_size > 2.0)
                {
                    fontSizeCalcCanvas_ctx.font = `${log_transform_enabled_font_size}px sans-serif`;

                    let text_width = fontSizeCalcCanvas_ctx.measureText("(Log-transformed)").width;
                    if (svg_width - text_width >= 2)
                        break;

                    log_transform_enabled_font_size -= 0.1;
                }
            }

            document.querySelector('#fontSizeCalcCanvas').remove();

            d3.select("#heatmapLegendDiv").append("canvas").attr("id", "heightCalcCanvas");
            let heightCalcCanvas = document.getElementById("heightCalcCanvas");
            let heightCalcCanvas_ctx = heightCalcCanvas.getContext("2d");
            heightCalcCanvas_ctx.font = `${font_size}px sans-serif`;

            for (let i = 0; i < num_samples; ++i)
            {
                let sample = data[i];
                let sample_text_height = heightCalcCanvas_ctx.measureText(sample).width;
                if (height < sample_text_height)
                    height = sample_text_height;
            }

            height += 30 + 15 + 25;
            document.querySelector('#heightCalcCanvas').remove();

            let svg_height = Math.ceil(height);

            let svg = "";

            svg += line(0, 0, svg_width - 1, 0, "black", 1);

            // Draw the vertical ticks
            for (let i = 0; i < num_samples; ++i)
            {
                let x_coord = Math.round(cell_width * (i + 0.5));
                svg += line(x_coord, 0, x_coord, 5, "black", 1);
            }

            // Draw the sample names below the ticks
            for (let i = 0; i < num_samples; ++i)
            {
                let sample = data[i];
                let x_coord = Math.round(cell_width * (i + 0.5));
                svg += heatmap_legend_text(sample, x_coord, 9, font_size, "sans-serif");
            }

            // Draw the colour gradient
            svg = linear_gradient("gradient", [["0%", colour.heatmapLow], ["50%", colour.heatmapMid], ["100%", colour.heatmapHigh]]) + svg;
            svg += rect((svg_width - legendWidth) / 2, svg_height - 15 - 25, legendWidth, 15, "url(#gradient)");

            // Draw the min/mid/max value labels
            svg += text(min_label, (svg_width - legendWidth) / 2, svg_height, text_font_size, "sans-serif");
            svg += text_centered(mid_label, svg_width / 2, svg_height, text_font_size, "sans-serif");
            svg += text_right_aligned(max_label, (svg_width + legendWidth) / 2, svg_height, text_font_size, "sans-serif");

            if (this.logTransform)
            {
                svg_height += 60;
                svg += text_centered("(Log-transformed)", svg_width / 2, svg_height - 20, log_transform_enabled_font_size, "sans-serif");
            }

            if (symbol)
                return [svg_width, svg_height, svg];

            svg = put_in_svg(svg_width, svg_height, svg);
            return svg;
        }
    },

    watch: {
        heatmapData: function() {
            this.buildHeatmapLegend();
        },
        logTransform: function() {
            this.buildHeatmapLegend();
        }
    }
}
</script>