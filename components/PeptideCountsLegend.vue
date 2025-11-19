/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render a peptide counts legend plot, based on peptideCountsData which must be supplied as input.

<template>
<div>
    <div id="peptideCountsLegendDiv">
        <p>Peptide counts legend</p>
    </div>
</div>
</template>
        
<script>
import * as d3 from 'd3';
import {put_in_svg, rect, line, heatmap_legend_text, linear_gradient, text, text_centered, text_right_aligned} from "~/assets/svg_utils";

export default {
    props: ["peptideCountsData"],
    data: () => {
        return {
            show_peptide_heatmap: true,
            hide_peptide_heatmap_labels: false
            // logTransform: false
        };
    },

    methods: {
        buildHeatmapLegend() {
            // Clear the space of any content
            d3.select('#peptideCountsLegendDiv').selectAll('*').remove();

            if (!this.show_peptide_heatmap)
                return;

            let el = document.getElementById("heatmapDiv");
            if (!(el && this.peptideCountsData)) return;

            let samples = this.peptideCountsData.labels;

            let padding = 16;
            let boundary = el.getBoundingClientRect();
            let width = boundary.width - 2 * padding;
            let colour = {
                heatmapLow: '#440154',
                heatmapMid: '#21918c',
                heatmapHigh: '#fde725',
                invalid: '#c2c2c2'
            };

            let height = 0;
            let font_size = 16.0;
            let canvas_width = Math.ceil(width);
            let num_samples = samples.length;
            let cell_width = canvas_width / num_samples;

            if (!this.hide_peptide_heatmap_labels)
            {
                d3.select("#peptideCountsLegendDiv").append("canvas").attr("id", "fontSizeCalcCanvas");
                let fontSizeCalcCanvas = document.getElementById("fontSizeCalcCanvas");
                let fontSizeCalcCanvas_ctx = fontSizeCalcCanvas.getContext("2d");

                fontSizeCalcCanvas_ctx.textBaseline = "bottom";
                while (font_size > 2.0)
                {
                    fontSizeCalcCanvas_ctx.font = `${font_size}px sans-serif`;
                    let spans = [];
                    for (let i = 0; i < num_samples; ++i)
                    {
                        let sample = samples[i];
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

                d3.select('#peptideCountsLegendDiv').selectAll('*').remove();

                d3.select("#peptideCountsLegendDiv").append("canvas").attr("id", "heightCalcCanvas");
                let heightCalcCanvas = document.getElementById("heightCalcCanvas");
                let heightCalcCanvas_ctx = heightCalcCanvas.getContext("2d");
                heightCalcCanvas_ctx.font = `${font_size}px sans-serif`;

                for (let i = 0; i < num_samples; ++i)
                {
                    let sample = samples[i];
                    let sample_text_height = heightCalcCanvas_ctx.measureText(sample).width;
                    if (height < sample_text_height)
                        height = sample_text_height;
                }

                height += 30;
            }

            height += 15 + 25;
            d3.select('#peptideCountsLegendDiv').selectAll('*').remove();

            d3.select("#peptideCountsLegendDiv").append("canvas")
                .attr("width", Math.ceil(width))
                .attr("height", Math.ceil(height))
                .attr("id", "peptideCountsLegendCanvas");
            let canvas = document.getElementById("peptideCountsLegendCanvas");
            let ctx = canvas.getContext("2d");
            ctx.font = `${font_size}px sans-serif`;
            ctx.textBaseline = "bottom";

            ctx.beginPath();

            if (!this.hide_peptide_heatmap_labels)
            {
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
                    let sample = samples[i];
                    let sample_text_metrics = ctx.measureText(sample);
                    let sample_text_height = sample_text_metrics.actualBoundingBoxAscent + sample_text_metrics.actualBoundingBoxDescent;
                    let x_coord = -Math.round(cell_width * (i + 0.5)) + Math.round(sample_text_height / 2);
                    ctx.fillText(sample, 9, x_coord);
                }

                ctx.restore();
            }

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
            let min = this.peptideCountsData.minValue;
            let mid = this.peptideCountsData.average;
            let max = this.peptideCountsData.maxValue;

            let min_label = getLabel(min);
            let mid_label = getLabel(mid);
            let max_label = getLabel(max);

            font_size = 16.0;
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

            d3.select("#peptideCountsLegendCanvas")
                .on("contextmenu", function (evt) {evt.preventDefault();});
        },

        buildHeatmapLegendSvg(symbol = false)
        {
            if (!this.show_peptide_heatmap)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            let el = document.getElementById("heatmapDiv");
            if (!(el && this.peptideCountsData))
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            let samples = this.peptideCountsData.labels;

            let padding = 16;
            let boundary = el.getBoundingClientRect();
            let width = boundary.width - 2 * padding;
            let colour = {
                heatmapLow: '#440154',
                heatmapMid: '#21918c',
                heatmapHigh: '#fde725',
                invalid: '#c2c2c2'
            };

            let height = 0;
            let font_size = 16.0;
            let canvas_width = Math.ceil(width);
            let num_samples = samples.length;
            let cell_width = canvas_width / num_samples;

            d3.select("#peptideCountsLegendDiv").append("canvas").attr("id", "fontSizeCalcCanvas");
            let fontSizeCalcCanvas = document.getElementById("fontSizeCalcCanvas");
            let fontSizeCalcCanvas_ctx = fontSizeCalcCanvas.getContext("2d");

            if (!this.hide_peptide_heatmap_labels)
            {
                fontSizeCalcCanvas_ctx.textBaseline = "bottom";
                while (font_size > 2.0)
                {
                    fontSizeCalcCanvas_ctx.font = `${font_size}px sans-serif`;
                    let spans = [];
                    for (let i = 0; i < num_samples; ++i)
                    {
                        let sample = samples[i];
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
            let min = this.peptideCountsData.minValue;
            let mid = this.peptideCountsData.average;
            let max = this.peptideCountsData.maxValue;

            let min_label = getLabel(min);
            let mid_label = getLabel(mid);
            let max_label = getLabel(max);

            let text_font_size = 16.0;
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

            document.querySelector('#fontSizeCalcCanvas').remove();

            d3.select("#peptideCountsLegendDiv").append("canvas").attr("id", "heightCalcCanvas");
            let heightCalcCanvas = document.getElementById("heightCalcCanvas");
            let heightCalcCanvas_ctx = heightCalcCanvas.getContext("2d");

            if (!this.hide_peptide_heatmap_labels)
            {
                heightCalcCanvas_ctx.font = `${font_size}px sans-serif`;

                for (let i = 0; i < num_samples; ++i)
                {
                    let sample = samples[i];
                    let sample_text_height = heightCalcCanvas_ctx.measureText(sample).width;
                    if (height < sample_text_height)
                        height = sample_text_height;
                }

                height += 30;
            }

            height += 15 + 25;
            let svg_height = Math.ceil(height);

            let svg = "";

            if (!this.hide_peptide_heatmap_labels)
            {
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
                    let sample = samples[i];
                    let x_coord = Math.round(cell_width * (i + 0.5));
                    svg += heatmap_legend_text(sample, x_coord, 9, font_size, "sans-serif");
                }
            }

            // Draw the colour gradient
            svg = linear_gradient("peptide_counts_legend_gradient", [["0%", colour.heatmapLow], ["50%", colour.heatmapMid], ["100%", colour.heatmapHigh]]) + svg;
            svg += rect((svg_width - legendWidth) / 2, svg_height - 15 - 25, legendWidth, 15, "url(#peptide_counts_legend_gradient)");

            // Draw the min/mid/max value labels
            svg += text(min_label, (svg_width - legendWidth) / 2, svg_height, text_font_size, "sans-serif");
            svg += text_centered(mid_label, svg_width / 2, svg_height, text_font_size, "sans-serif");
            svg += text_right_aligned(max_label, (svg_width + legendWidth) / 2, svg_height, text_font_size, "sans-serif");

            document.querySelector('#heightCalcCanvas').remove();

            if (symbol)
                return [svg_width, svg_height, svg];

            svg = put_in_svg(svg_width, svg_height, svg);
            return svg;
        }
    },

    watch: {
        show_peptide_heatmap: function() {
            this.buildHeatmapLegend();
        },
        hide_peptide_heatmap_labels: function() {
            this.buildHeatmapLegend();
        }
    }
}
</script>