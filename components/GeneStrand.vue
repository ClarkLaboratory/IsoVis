/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render strand and axis information on the selected gene.
Triangles are rendered along the gene length to denote features.
Requires an instance of BaseAxis as input.

<template>
<div id="axisDiv" class="req-crosshair" ref="parentDiv" style="position: relative">
    <p>Strand and Axis visualization</p>
</div>
</template>

<script>
import * as d3 from 'd3';
import {put_in_svg, dashed_line, polygon, text, text_centered, text_right_aligned} from "~/assets/svg_utils";

export default {
    props: ["baseAxis", "chromosome", "isStrandUnknown"],
    
    data: () => {
        return {
            // dimensions
            margin: {top: 30, right: 0, bottom: 30, left: 0},
            padding: 16,
            height: 110,

            start_drag: -1,
            end_drag: -1
        };
    },

    methods: {
        mouse_to_genome(client_x)
        {
            let crosshair_canvas = document.getElementById("axisCrosshairCanvas");
            if (!crosshair_canvas)
                return -1;

            let canvas_rect = crosshair_canvas.getBoundingClientRect();
            let canvas_rect_left = canvas_rect.left;
            let x = Math.floor(client_x - canvas_rect_left);

            let genome_location = Math.floor(this.baseAxis.geneToAxisScale.invert(this.baseAxis.axisToScreenScale.invert(x)));
            return genome_location;
        },

        genome_to_canvas(genome_location)
        {
            return Math.ceil(this.baseAxis.axisToScreenScale(this.baseAxis.geneToAxisScale(genome_location)));
        },

        set_start_drag(genome_location)
        {
            this.start_drag = genome_location;
            this.end_drag = -1;
        },

        set_end_drag(genome_location)
        {
            if (this.start_drag === -1)
                return;

            this.end_drag = genome_location;
            this.$root.$emit("set_zoom", [this.start_drag, this.end_drag, true]);
            this.start_drag = -1;
        },

        remove_crosshair(is_single_click = false)
        {
            if (is_single_click)
            {
                this.start_drag = -1;
                this.end_drag = -1;
            }

            let crosshair_canvas = document.getElementById("axisCrosshairCanvas");
            if (!crosshair_canvas)
                return;

            let crosshair_canvas_ctx = crosshair_canvas.getContext("2d");
            crosshair_canvas_ctx.clearRect(0, 0, crosshair_canvas.width, crosshair_canvas.height);
        },

        draw_crosshair(client_x)
        {
            if (!this.baseAxis || Object.keys(this.baseAxis).length == 0)
                return;

            let crosshair_canvas = document.getElementById("axisCrosshairCanvas");
            if (!crosshair_canvas)
                return;

            this.remove_crosshair();

            let canvas_rect = crosshair_canvas.getBoundingClientRect();
            let canvas_rect_left = canvas_rect.left;
            let x = Math.floor(client_x - canvas_rect_left);
            
            let crosshair_canvas_ctx = crosshair_canvas.getContext("2d");
            crosshair_canvas_ctx.setLineDash([2, 2]);
            crosshair_canvas_ctx.strokeStyle = "rgb(83,83,83)";

            crosshair_canvas_ctx.beginPath();
            crosshair_canvas_ctx.moveTo(x, 30);
            crosshair_canvas_ctx.lineTo(x, 70 + this.margin.top - 20);
            crosshair_canvas_ctx.stroke();

            let chromosome = (this.chromosome) ? this.chromosome + ":" : "";

            let genomic_location = chromosome + Math.floor(this.baseAxis.geneToAxisScale.invert(this.baseAxis.axisToScreenScale.invert(x)));

            let font_size = 12.0;
            let label_x, label_width;

            while (font_size > 2.0)
            {
                crosshair_canvas_ctx.font = `${font_size}px sans-serif`;

                label_width = crosshair_canvas_ctx.measureText(genomic_location).width;
                if (label_width <= crosshair_canvas.width - 10)
                    break;

                font_size -= 0.1;
            }

            label_x = Math.min(x, Math.floor(crosshair_canvas.width - label_width));
            crosshair_canvas_ctx.fillText(genomic_location, label_x, 20);

            if (this.start_drag !== -1)
            {
                let start_drag_x = this.genome_to_canvas(this.start_drag);
                if (start_drag_x === x)
                    return;

                crosshair_canvas_ctx.beginPath();
                crosshair_canvas_ctx.moveTo(start_drag_x, 30);
                crosshair_canvas_ctx.lineTo(start_drag_x, 70 + this.margin.top - 20);
                crosshair_canvas_ctx.stroke();

                let old_fillstyle = crosshair_canvas_ctx.fillStyle;
                crosshair_canvas_ctx.fillStyle = "rgba(0, 0, 0, 0.15)";

                let begin_x = Math.min(start_drag_x, x);
                let end_x = Math.max(start_drag_x, x);
                let drag_width = end_x - begin_x;
                let drag_height = (70 + this.margin.top - 20) - 30;

                crosshair_canvas_ctx.fillRect(begin_x, 30, drag_width, drag_height);
                crosshair_canvas_ctx.fillStyle = old_fillstyle;
            }
        },

        buildStrand() {
            this.start_drag = -1;
            this.end_drag = -1;

            if (!this.baseAxis || Object.keys(this.baseAxis).length == 0)
                return;

            let chromosome = (this.chromosome) ? this.chromosome + ":" : "";

            let width = document.getElementById("axisDiv").getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(width);

            let self = this;  // avoid conflict with 'this' referring to a different object within some functions.
            let svgHeight = this.height - this.margin.top - this.margin.bottom;

            // Clear the target element of any content
            d3.select("#axisDiv").selectAll("*").remove();

            d3.select("#axisDiv").append("canvas")
                .attr("width", Math.ceil(width))
                .attr("height", Math.ceil(self.height))
                .attr("id", "geneStrandCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");
            let canvas = document.getElementById("geneStrandCanvas");
            let ctx = canvas.getContext("2d");

            // Add labels
            let left_label = chromosome + self.baseAxis.endpoints()[0];
            let center_label = ((self.baseAxis.genomeCoords().strand == '+') ? "Forward" : "Reverse") + " strand";
            let right_label = chromosome + self.baseAxis.endpoints()[1];

            if (this.isStrandUnknown)
                center_label = "Assumed " + center_label.toLowerCase();

            let font_size = 12.0;
            let left_label_end, center_label_start, center_label_end, center_label_width, right_label_start;

            while (font_size > 2.0)
            {
                ctx.font = `${font_size}px sans-serif`;

                left_label_end = ctx.measureText(left_label).width;
                right_label_start = width - ctx.measureText(right_label).width;

                center_label_width = ctx.measureText(center_label).width;
                center_label_start = (width - center_label_width) / 2;
                center_label_end = (width + center_label_width) / 2;

                if ((center_label_start - left_label_end >= 5) && (right_label_start - center_label_end >= 5))
                    break;

                font_size -= 0.1;
            }

            let y = 70 + this.margin.top;
            ctx.fillText(left_label, 0, y);
            ctx.fillText(center_label, center_label_start, y);
            ctx.fillText(right_label, right_label_start, y);

            const tickScale = d3.scaleLinear().domain([0, 100]).range([self.baseAxis.genomeCoords().start, self.baseAxis.genomeCoords().end]);
            let step = self.baseAxis.genomeCoords().width / 100;
            step *= (self.baseAxis.genomeCoords().strand == '+') ? 1 : -1;

            // function for building triangular ticks
            let coords = (d) =>
            {
                let pt1 = [self.baseAxis.scale(tickScale(d)), svgHeight / 3];
                let pt2 = [self.baseAxis.scale(tickScale(d)), svgHeight * 2 / 3];
                if (d !== 100)
                {
                    let pt3 = [self.baseAxis.scale(tickScale(d) + step), svgHeight / 2];
                    return [pt1, pt2, pt3];
                }
                return [pt1, pt2];
            }

            // Add axis ticks
            ctx.strokeStyle = "rgb(83,83,83)";
            ctx.fillStyle = "#d5ebe8";
            for (let i = 0; i <= 100; ++i)
            {
                let region = new Path2D();
                let points = coords(i);
                let start_point = points[0];
                region.moveTo(start_point[0], start_point[1] + this.margin.top);
                for (let j = 1; j < points.length; ++j)
                {
                    let next_point = points[j];
                    region.lineTo(next_point[0], next_point[1] + this.margin.top);
                }
                region.lineTo(start_point[0], start_point[1] + this.margin.top);
                region.closePath();

                ctx.fill(region);
                ctx.stroke(region);
            }

            // Add midline
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(0, svgHeight / 2 + this.margin.top);
            ctx.lineTo(width, svgHeight / 2 + this.margin.top);
            ctx.stroke();

            d3.select("#axisDiv").append("canvas")
                .attr("width", Math.ceil(width))
                .attr("height", Math.ceil(self.height))
                .attr("id", "axisCrosshairCanvas")
                .attr("style", "position: absolute; left: 1rem !important; cursor: crosshair;");

            d3.select("#axisCrosshairCanvas")
                .on("mouseover", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX);})
                .on("mousemove", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX);})
                .on("mouseleave", function() {self.$root.$emit("remove_crosshair");})
                .on("contextmenu", function (evt) {evt.preventDefault();})
                .on("mousedown", function (evt) {if ((evt.buttons & 0b10) !== 0) {self.$root.$emit("reset_zoom"); return;} self.$root.$emit("set_start_drag", self.mouse_to_genome(evt.clientX));})
                .on("mouseup", function (evt) {self.set_end_drag(self.mouse_to_genome(evt.clientX)); self.$root.$emit("remove_crosshair");});
        },

        buildStrandSvg(symbol = false)
        {
            if (!this.baseAxis || Object.keys(this.baseAxis).length == 0)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            let chromosome = (this.chromosome) ? this.chromosome + ":" : "";

            let width = document.getElementById("axisDiv").getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(width);

            let self = this;  // avoid conflict with 'this' referring to a different object within some functions.
            let svgHeight = this.height - this.margin.top - this.margin.bottom;

            let svg = "";
            width = Math.ceil(width);
            let height = Math.ceil(self.height);

            // Add labels
            let left_label = chromosome + self.baseAxis.endpoints()[0];
            let center_label = ((self.baseAxis.genomeCoords().strand == '+') ? "Forward" : "Reverse") + " strand";
            let right_label = chromosome + self.baseAxis.endpoints()[1];

            if (this.isStrandUnknown)
                center_label = "Assumed " + center_label.toLowerCase();

            let font_size = 12.0;
            let left_label_end, center_label_start, center_label_end, center_label_width, right_label_start;

            while (font_size >= 2.0)
            {
                let text_elem = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text_elem.setAttribute("x", "0");
                text_elem.setAttribute("y", "0");
                text_elem.setAttribute("font-size", `${font_size}px`);
                text_elem.setAttribute("font-family", "sans-serif");

                let svg_elem = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg_elem.setAttribute("xmlns", "http://www.w3.org/2000/svg");
                svg_elem.setAttribute("version", "1.1");
                svg_elem.setAttribute("width", `${width}`);
                svg_elem.setAttribute("height", `${height}`);
                svg_elem.setAttribute("viewBox", `0 0 ${width} ${height}`);
                svg_elem.setAttribute("id", "width_measurement");
                svg_elem.append(text_elem);

                document.querySelector("#axisDiv").append(svg_elem);

                text_elem.textContent = left_label;
                left_label_end = text_elem.getComputedTextLength();

                text_elem.textContent = right_label;
                right_label_start = width - text_elem.getComputedTextLength();

                text_elem.textContent = center_label;
                center_label_width = text_elem.getComputedTextLength();
                center_label_start = (width - center_label_width) / 2;
                center_label_end = (width + center_label_width) / 2;

                document.querySelector("#width_measurement").remove();

                if ((center_label_start - left_label_end >= 5) && (right_label_start - center_label_end >= 5))
                    break;

                font_size -= 0.1;
            }

            if (font_size < 2.0)
                font_size = 2.0;

            let y = 70 + this.margin.top;
            svg += text(left_label, 0, y, `${font_size}px`, "sans-serif");
            svg += text_centered(center_label, width / 2, y, `${font_size}px`, "sans-serif");
            svg += text_right_aligned(right_label, width, y, `${font_size}px`, "sans-serif");

            const tickScale = d3.scaleLinear().domain([0, 100]).range([self.baseAxis.genomeCoords().start, self.baseAxis.genomeCoords().end]);
            let step = self.baseAxis.genomeCoords().width / 100;
            step *= (self.baseAxis.genomeCoords().strand == '+') ? 1 : -1;

            // function for building triangular ticks
            let coords = (d) =>
            {
                let x0 = self.baseAxis.scale(tickScale(d));

                if (d !== 100)
                {
                    let x1 = self.baseAxis.scale(tickScale(d) + step);
                    if (((x0 <= 0) && (x1 <= 0)) || ((x0 >= width) && (x1 >= width)))
                        return "";

                    let y0 = svgHeight / 3 + this.margin.top;
                    let y1 = svgHeight * 2 / 3 + this.margin.top;
                    let y2 = svgHeight / 2 + this.margin.top;

                    if (step >= 0)
                    {
                        if ((x0 <= 0) && (x1 >= width)) // 4 points
                        {
                            let y0_x0_cut = y0 + ((y2 - y0) / (x1 - x0)) * (-x0);
                            let y1_x0_cut = y1 - ((y1 - y2) / (x1 - x0)) * (-x0);
                            let y0_x1_cut = y2 - ((y2 - y0) / (x1 - x0)) * (x1 - width);
                            let y1_x1_cut = y2 + ((y1 - y2) / (x1 - x0)) * (x1 - width);
                            x0 = 0;
                            x1 = width;

                            let pt1 = `${x0},${y0_x0_cut}`;
                            let pt2 = `${x0},${y1_x0_cut}`;
                            let pt3 = `${x1},${y1_x1_cut}`;
                            let pt4 = `${x1},${y0_x1_cut}`;

                            return `${pt1} ${pt2} ${pt3} ${pt4}`;
                        }
                        else if (x0 < 0) // 3 points
                        {
                            y0 = y2 - ((y2 - y0) / (x1 - x0)) * x1;
                            y1 = y2 + ((y1 - y2) / (x1 - x0)) * x1;
                            x0 = 0;
                        }
                        else if (x1 > width) // 4 points
                        {
                            let y0_cut = y0 + ((y2 - y0) / (x1 - x0)) * (width - x0);
                            let y1_cut = y1 - ((y1 - y2) / (x1 - x0)) * (width - x0);
                            x1 = width;

                            let pt1 = `${x0},${y0}`;
                            let pt2 = `${x0},${y1}`;
                            let pt3 = `${x1},${y1_cut}`;
                            let pt4 = `${x1},${y0_cut}`;

                            return `${pt1} ${pt2} ${pt3} ${pt4}`;
                        }

                        let pt1 = `${x0},${y0}`;
                        let pt2 = `${x0},${y1}`;
                        let pt3 = `${x1},${y2}`;
                        return `${pt1} ${pt2} ${pt3}`;
                    }

                    if ((x1 <= 0) && (x0 >= width)) // 4 points
                    {
                        let y0_x1_cut = y2 - ((y2 - y0) / (x0 - x1)) * (-x1);
                        let y1_x1_cut = y2 + ((y1 - y2) / (x0 - x1)) * (-x1);
                        let y0_x0_cut = y0 + ((y2 - y0) / (x0 - x1)) * (x0 - width);
                        let y1_x0_cut = y1 - ((y1 - y2) / (x0 - x1)) * (x0 - width);
                        x1 = 0;
                        x0 = width;

                        let pt1 = `${x0},${y0_x0_cut}`;
                        let pt2 = `${x0},${y1_x0_cut}`;
                        let pt3 = `${x1},${y1_x1_cut}`;
                        let pt4 = `${x1},${y0_x1_cut}`;

                        return `${pt1} ${pt2} ${pt3} ${pt4}`;
                    }
                    else if (x0 > width) // 3 points
                    {
                        y0 = y2 - ((y2 - y0) / (x0 - x1)) * (width - x1);
                        y1 = y2 + ((y1 - y2) / (x0 - x1)) * (width - x1);
                        x0 = width;
                    }
                    else if (x1 < 0) // 4 points
                    {
                        let y0_cut = y0 + ((y2 - y0) / (x0 - x1)) * x0;
                        let y1_cut = y1 - ((y1 - y2) / (x0 - x1)) * x0;
                        x1 = 0;

                        let pt1 = `${x0},${y0}`;
                        let pt2 = `${x0},${y1}`;
                        let pt3 = `${x1},${y1_cut}`;
                        let pt4 = `${x1},${y0_cut}`;

                        return `${pt1} ${pt2} ${pt3} ${pt4}`;
                    }

                    let pt1 = `${x0},${y0}`;
                    let pt2 = `${x0},${y1}`;
                    let pt3 = `${x1},${y2}`;
                    return `${pt1} ${pt2} ${pt3}`;
                }

                if ((x0 < 0) || (x0 > width))
                    return "";

                let pt1 = `${x0},${svgHeight / 3 + this.margin.top}`;
                let pt2 = `${x0},${svgHeight * 2 / 3 + this.margin.top}`;
                return `${pt1} ${pt2}`;
            }

            // Add axis ticks
            for (let i = 0; i <= 100; ++i)
            {
                let points = coords(i);
                if (points)
                    svg += polygon(points, "#d5ebe8", "#535353", 1);
            }

            // Add midline
            svg += dashed_line(0, svgHeight / 2 + this.margin.top, width, svgHeight / 2 + this.margin.top, "#535353", 1, "4 2");

            if (symbol)
                return [width, height, svg];

            svg = put_in_svg(width, height, svg);
            return svg;
        }
    },

    watch: {
        baseAxis: function()
        {
            this.buildStrand();
        }
    },

    mounted()
    {
        this.$root.$on("draw_crosshair", client_x =>
        {
            this.draw_crosshair(client_x);
        });

        this.$root.$on("remove_crosshair", () =>
        {
            this.remove_crosshair();
        });

        this.$root.$on("single_click", () =>
        {
            this.remove_crosshair(true);
        });

        this.$root.$on("set_start_drag", client_x =>
        {
            this.set_start_drag(client_x);
        });

        this.$root.$on("set_end_drag", client_x =>
        {
            this.set_end_drag(client_x);
        });
    }
}
</script>