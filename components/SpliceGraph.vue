/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render the splice junctions graph.

<template>
<div id="spliceGraphDiv" ref="parentDiv" style="position: relative; min-height: 100px;">
    <p>Splice differences graph</p>
</div>
</template>

<script>
import * as d3 from 'd3';
import {arc, put_in_svg, rect} from "~/assets/svg_utils";

export default {
    props: ["baseAxis"],
    
    data: () => {
        return {
            // dimensions
            width: 0,
            padding: 16,
            padding_top: 10,
            isoformHeight: 15,

            is_draw_constitutive: false,

            start_drag: -1,
            end_drag: -1
        };
    },

    methods: {
        mouse_to_genome(client_x)
        {
            let crosshair_canvas = document.getElementById("spliceGraphCrosshairCanvas");
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

            let crosshair_canvas = document.getElementById("spliceGraphCrosshairCanvas");
            if (!crosshair_canvas)
                return;

            let crosshair_canvas_ctx = crosshair_canvas.getContext("2d");
            crosshair_canvas_ctx.clearRect(0, 0, crosshair_canvas.width, crosshair_canvas.height);
        },

        draw_crosshair(client_x)
        {
            if (!this.baseAxis || Object.keys(this.baseAxis).length == 0)
                return;

            let crosshair_canvas = document.getElementById("spliceGraphCrosshairCanvas");
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
            crosshair_canvas_ctx.moveTo(x, 0);
            crosshair_canvas_ctx.lineTo(x, crosshair_canvas.height);
            crosshair_canvas_ctx.stroke();

            if (this.start_drag !== -1)
            {
                let start_drag_x = this.genome_to_canvas(this.start_drag);
                if (start_drag_x === x)
                    return;

                crosshair_canvas_ctx.beginPath();
                crosshair_canvas_ctx.moveTo(start_drag_x, 0);
                crosshair_canvas_ctx.lineTo(start_drag_x, crosshair_canvas.height);
                crosshair_canvas_ctx.stroke();

                let old_fillstyle = crosshair_canvas_ctx.fillStyle;
                crosshair_canvas_ctx.fillStyle = "rgba(0, 0, 0, 0.15)";

                let begin_x = Math.min(start_drag_x, x);
                let end_x = Math.max(start_drag_x, x);
                let drag_width = end_x - begin_x;

                crosshair_canvas_ctx.fillRect(begin_x, 0, drag_width, crosshair_canvas.height);
                crosshair_canvas_ctx.fillStyle = old_fillstyle;
            }
        },

        // Method to build the graph
        buildGraph()
        {
            this.start_drag = -1;
            this.end_drag = -1;

            if (!this.baseAxis || Object.keys(this.baseAxis).length == 0)
                return;

            let el = document.getElementById('stackDiv');
            if (!el) return;

            this.width = el.getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(this.width);

            let self = this;  // avoid conflict with 'this' referring to a different object within some functions.

            // Clear the target element of any content
            d3.select("#spliceGraphDiv").selectAll("*").remove();

            let max_arc_height = self.isoformHeight * 5;
            let canvas_width = Math.ceil(self.width);
            let canvas_height = self.padding_top + self.isoformHeight * 6;

            d3.select("#spliceGraphDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("id", "spliceGraphCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");
            let canvas = document.getElementById("spliceGraphCanvas");
            let ctx = canvas.getContext("2d");

            let screen_ranges = self.baseAxis.screenRanges();

            // Draw the metagene
            ctx.fillStyle = "rgb(213,235,232)";
            for (let [x0, x1] of screen_ranges)
            {
                let width = Math.abs(x1 - x0);
                let actual_x0 = Math.round(x0);
                let actual_x1 = Math.round(width + x0);
                let actual_width = actual_x1 - actual_x0;

                // Don't draw the metagene background if it's outside of the canvas
                if (!(((actual_x0 < 0) && (actual_x0 + actual_width < 0)) || ((actual_x0 >= canvas_width) && (actual_x0 + actual_width >= canvas_width))))
                    ctx.fillRect(actual_x0, self.padding_top + max_arc_height, actual_width, self.isoformHeight);
            }

            let spliced_regions = self.baseAxis.spliced_regions;
            let relative_heights = (self.is_draw_constitutive) ? self.baseAxis.relative_heights_all : self.baseAxis.relative_heights;
            if (spliced_regions && relative_heights)
            {
                // Draw the junction arcs
                ctx.strokeStyle = "#000000";
                for (let i = 0; i < spliced_regions.length; ++i)
                {
                    let [spliced_region_start, spliced_region_end, is_constitutive] = spliced_regions[i];
                    if (is_constitutive && !self.is_draw_constitutive)
                        continue;

                    let relative_height = relative_heights[i];

                    let x0 = Math.round(self.baseAxis.scale(spliced_region_start));
                    let x2 = Math.round(self.baseAxis.scale(spliced_region_end));
                    let x1 = (x0 + x2) / 2;

                    if (is_constitutive)
                        ctx.setLineDash([2, 2]);

                    ctx.beginPath();
                    ctx.ellipse(x1, self.padding_top + max_arc_height, Math.abs(x2 - x0) / 2, (max_arc_height - 1) * relative_height, 0, 0, Math.PI, true);
                    ctx.stroke();

                    if (is_constitutive)
                        ctx.setLineDash([]);

                    ctx.strokeStyle = "#000000";
                }
            }

            d3.select("#spliceGraphDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("id", "spliceGraphCrosshairCanvas")
                .attr("style", "position: absolute; left: 1rem !important; cursor: crosshair;");

            d3.select("#spliceGraphCrosshairCanvas")
                .on("mouseover", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX);})
                .on("mousemove", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX);})
                .on("mouseleave", function() {self.$root.$emit("remove_crosshair");})
                .on("contextmenu", function (evt) {evt.preventDefault();})
                .on("mousedown", function (evt) {if ((evt.buttons & 0b10) !== 0) {self.$root.$emit("reset_zoom"); return;} self.$root.$emit("set_start_drag", self.mouse_to_genome(evt.clientX));})
                .on("mouseup", function (evt) {self.set_end_drag(self.mouse_to_genome(evt.clientX)); self.$root.$emit("remove_crosshair");});
        },

        buildGraphSvg(symbol = false)
        {
            let el = document.getElementById('stackDiv');
            if (!this.baseAxis || (Object.keys(this.baseAxis).length == 0) || !el)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            this.width = el.getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(this.width);

            let max_arc_height = this.isoformHeight * 5;
            let canvas_width = Math.ceil(this.width);
            let canvas_height = this.padding_top + this.isoformHeight * 6;

            let screen_ranges = this.baseAxis.screenRanges();

            let svg = "";

            // Draw the metagene
            for (let [x0, x1] of screen_ranges)
            {
                let width = Math.abs(x1 - x0);
                let actual_x0 = Math.round(x0);
                let actual_x1 = Math.round(width + x0);
                let actual_width = actual_x1 - actual_x0;
                
                // Don't draw the metagene background if it's outside of the canvas
                if (((actual_x0 < 0) && (actual_x1 < 0)) || ((actual_x0 >= canvas_width) && (actual_x1 >= canvas_width)))
                    continue;

                if ((actual_x0 < 0) && (actual_x1 >= canvas_width))
                {
                    actual_x0 = 0;
                    actual_width = canvas_width;
                }
                else if (actual_x0 < 0)
                {
                    actual_width += actual_x0;
                    actual_x0 = 0;
                }
                else if (actual_x1 >= canvas_width)
                {
                    actual_width -= (actual_x1 - canvas_width);
                }

                svg += rect(actual_x0, this.padding_top + max_arc_height, actual_width, this.isoformHeight, "#d5ebe8");
            }

            let spliced_regions = this.baseAxis.spliced_regions;
            let relative_heights = (this.is_draw_constitutive) ? this.baseAxis.relative_heights_all : this.baseAxis.relative_heights;
            if (spliced_regions && relative_heights)
            {
                // Draw the junction arcs
                let arc_colour = "#000000";
                for (let i = 0; i < spliced_regions.length; ++i)
                {
                    let [spliced_region_start, spliced_region_end, is_constitutive] = spliced_regions[i];
                    if (is_constitutive && !this.is_draw_constitutive)
                        continue;

                    let relative_height = relative_heights[i];

                    let x0 = Math.round(this.baseAxis.scale(spliced_region_start));
                    let x2 = Math.round(this.baseAxis.scale(spliced_region_end));
                    let x1 = (x0 + x2) / 2;

                    if (x0 > x2)
                    {
                        let temp = x0;
                        x0 = x2;
                        x2 = temp;
                    }

                    // Don't draw any arcs that are completely outside the canvas
                    if ((x0 <= 0 && x2 <= 0) || (x0 >= canvas_width && x2 >= canvas_width))
                        continue;

                    let x_start = x0;
                    let y_start = this.padding_top + max_arc_height;
                    let x_end = x2;
                    let y_end = y_start;
                    let x_radius = (x2 - x0) / 2;
                    let y_radius = (max_arc_height - 1) * relative_height;

                    let dasharray = null;
                    if (is_constitutive)
                        dasharray = "2 2";

                    // If the start / end of the arc is outside the canvas, correct the start / end coordinate of the arc

                    // Equation for ellipse of x_radius = a and y_radius = b centered at (X1, Y1): (x - X1)^2/a^2 + (y - Y1)^2/b^2 = 1
                    // (y - Y1)^2 = b^2 * (1 - (x - X1)^2 / a^2)
                    // y = Y1 +/- sqrt(b^2 * (1 - (x - X1)^2 / a^2))
                    // Since y cannot be below Y1, y = Y1 - sqrt(b^2 * (1 - (x - X1)^2 / a^2))

                    if (x_start < 0)
                    {
                        x_start = 0;
                        y_start = (this.padding_top + max_arc_height) - Math.sqrt((y_radius * y_radius) * (1 - (x1 * x1) / (x_radius * x_radius)));
                    }

                    if (x_end > canvas_width)
                    {
                        x_end = canvas_width;
                        y_end = (this.padding_top + max_arc_height) - Math.sqrt((y_radius * y_radius) * (1 - ((x_end - x1) * (x_end - x1)) / (x_radius * x_radius)));
                    }

                    svg += arc(x_start, y_start, x_end, y_end, x_radius, y_radius, arc_colour, dasharray);

                    arc_colour = "#000000";
                }
            }

            if (symbol)
                return [canvas_width, canvas_height, svg];

            svg = put_in_svg(canvas_width, canvas_height, svg);
            return svg;
        }
    },

    watch: {
        baseAxis: function()
        {
            this.buildGraph();
        },
        is_draw_constitutive: function()
        {
            this.buildGraph();
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