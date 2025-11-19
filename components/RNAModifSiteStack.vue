/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render RNA modification site stacks, where each site corresponds to one nucleotide and is shown as a thin rectangle.

<template>
<div id="RNAModifStackDiv" class="req-crosshair" ref="parentDiv" style="position: relative">
    <p>RNA modification site stack</p>
</div>
</template>

<script>
import * as d3 from 'd3';
import {put_in_svg, rect} from "~/assets/svg_utils";

export default {
    props: ["baseAxis", "siteOrder"],
    
    data: () => {
        return {
            // dimensions
            width: 0,
            padding: 16,
            siteHeight: 30, // 50
            siteGap: 1,

            is_compact: false,

            start_drag: -1,
            end_drag: -1,

            tooltip_text: ""
        };
    },

    methods: {
        // compute overall height
        groupScale(x, height, gap) {
            return x * (height + gap);
        },

        mouse_to_genome(client_x)
        {
            let crosshair_canvas = document.getElementById("RNAModifStackCrosshairCanvas");
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
            this.$root.$emit("set_zoom", [this.start_drag, this.end_drag, true, "RNAModifStack"]);
            this.start_drag = -1;
        },

        async copy_tooltip_text()
        {
            if (!this.tooltip_text)
                return;

            try
            {
                // Are we copying the tooltip text within the IsoVis website?
                if (navigator && navigator.clipboard)
                {
                    await navigator.clipboard.writeText(this.tooltip_text);
                    this.set_tooltip_copied(true);
                }
                // Are we copying the tooltip text from an iframe showing IsoVis? 
                else if (window.parent !== window)
                {
                    window.parent.postMessage(`To copy: ${this.tooltip_text}`, document.referrer);
                    this.set_tooltip_copied(true);
                }
                else
                    this.set_tooltip_copied(false);
            }
            catch (error)
            {
                console.log("Error copying RNA modification site stack text!", error);
                this.set_tooltip_copied(false);
            }
        },

        set_tooltip_copied(is_copy_successful)
        {
            let tooltip = d3.select("#rnamodifstack_tooltip");
            if (!tooltip)
                return;

            if (is_copy_successful)
                tooltip.html("Copied!<br>");
            else
                tooltip.html("Error copying text!<br>");
        },

        remove_crosshair(is_single_click = false)
        {
            if (is_single_click)
            {
                this.start_drag = -1;
                this.end_drag = -1;
            }

            let crosshair_canvas = document.getElementById("RNAModifStackCrosshairCanvas");
            if (!crosshair_canvas)
                return;

            let crosshair_canvas_ctx = crosshair_canvas.getContext("2d");
            crosshair_canvas_ctx.clearRect(0, 0, crosshair_canvas.width, crosshair_canvas.height);
        },

        draw_crosshair(client_x)
        {
            let crosshair_canvas = document.getElementById("RNAModifStackCrosshairCanvas");
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
        
        // Method to build the stack
        buildStack() {
            this.start_drag = -1;
            this.end_drag = -1;
            this.tooltip_text = "";

            if (!this.baseAxis || !this.siteOrder || (this.siteOrderlength === 0) || Object.keys(this.baseAxis).length == 0)
                return;

            this.width = document.getElementById("stackDiv").getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(this.width);

            let svgHeight = this.groupScale(this.is_compact ? 1 : this.siteOrder.length, this.siteHeight, this.siteGap) - this.siteGap;
            let blockHeight = this.siteHeight / 2;

            let self = this;  // avoid conflict with 'this' referring to a different object within some functions.

            // Clear the target element of any content
            d3.select("#RNAModifStackDiv").selectAll("*").remove();

            let canvas_width = Math.ceil(self.width);
            let canvas_height = Math.ceil(svgHeight);

            d3.select("#RNAModifStackDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("id", "RNAModifStackCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");
            let canvas = document.getElementById("RNAModifStackCanvas");
            let ctx = canvas.getContext("2d");

            let transformation = (i) => self.groupScale(i, self.siteHeight, self.siteGap);

            let site_info = [];

            // Draw the RNA modification sites
            for (let i = 0; i < self.siteOrder.length; ++i)
            {
                let site = self.siteOrder[i];
                let y = (this.is_compact ? 0 : transformation(i)) + (self.siteHeight - blockHeight) / 2;

                ctx.fillStyle = "rgb(83,83,83)";

                let x0 = site;
                let x1 = x0 + 1;
                let x = self.baseAxis.isAscending() ? self.baseAxis.scale(x0) : self.baseAxis.scale(x1);
                let width = Math.abs(self.baseAxis.scale(x1) - self.baseAxis.scale(x0));
                let actual_x0 = Math.round(x);
                let actual_x1 = Math.round(width + x);
                let actual_width = Math.max(actual_x1 - actual_x0, 5);                      // we want to show every site clearly, so ensure they're each at least 5 pixels wide
                let height = blockHeight;
                let actual_y0 = (y - Math.floor(y) <= 0.5) ? Math.floor(y) : Math.round(y); // emulating the SVG pixel coordinate rounding behaviour
                let actual_y1 = Math.round(height + y);
                let actual_height = actual_y1 - Math.round(y);

                // Don't draw the site if it's outside of the canvas
                if (!(((actual_x0 < 0) && (actual_x0 + actual_width < 0)) || ((actual_x0 >= canvas_width) && (actual_x0 + actual_width >= canvas_width))))
                    ctx.fillRect(actual_x0, actual_y0, actual_width, actual_height);
                else
                    continue;

                if (!this.is_compact)
                    site_info.push([actual_x0, actual_x0 + actual_width, actual_y0, actual_y0 + actual_height, x0]);
            }

            let tooltip = d3.select("#RNAModifStackDiv")
                            .append("div")
                            .attr("class", "tooltip")
                            .attr("id", "rnamodifstack_tooltip")
                            .style("visibility", "hidden")
                            .style("opacity", 1)
                            .style("background-color", "white")
                            .style("border", "solid")
                            .style("border-width", "2px")
                            .style("border-radius", "5px")
                            .style("padding", "5px")
                            .style("user-select", "none");

            let boundary = document.getElementById("stackDiv").getBoundingClientRect();
            let padding = this.padding;

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

                let shown_site = null;
                for (let [x0, x1, y0, y1, site] of site_info)
                {
                    if ((x0 <= x_diff) && (x_diff <= x1) && (y0 <= y_diff) && (y_diff <= y1))
                    {
                        shown_site = site;
                        break;
                    }
                }

                if (shown_site === null)
                {
                    d3.select("#RNAModifStackCrosshairCanvas").style("cursor", "crosshair");
                    hide_tooltip();
                    let event = new CustomEvent("set_rnamodifstack_tooltip_text", {detail: ""});
                    document.dispatchEvent(event);
                    return;
                }

                let stack_div = document.getElementById("stackDiv");
                let rna_modif_stack_div = document.getElementById("RNAModifStackDiv");
                let stack_boundary = stack_div.getBoundingClientRect();
                let rna_modif_stack_boundary = rna_modif_stack_div.getBoundingClientRect();
                let leftVal = (calculateLeftVal(clientX) - stack_boundary.left + padding + 7);
                let topVal = (clientY - rna_modif_stack_boundary.top + padding + 5);

                let tooltip_text = `Site location: ${shown_site}`;
                let event = new CustomEvent("set_rnamodifstack_tooltip_text", {detail: tooltip_text});
                document.dispatchEvent(event);

                let tooltip_html = tooltip_text.replaceAll("\r\n", "<br>") + "<br>(Click on the RNA modification site to copy the text in this tooltip)<br>";
                tooltip.html(tooltip_html)
                    .style("visibility", "visible")
                    .style("left", leftVal + "px").style("top", topVal + "px");

                d3.select("#RNAModifStackCrosshairCanvas").style("cursor", "pointer");
            }

            d3.select("#RNAModifStackDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("id", "RNAModifStackCrosshairCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");

            d3.select("#RNAModifStackCrosshairCanvas")
                .on("mouseover", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX); display_tooltip(evt);})
                .on("mousemove", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX); display_tooltip(evt);})
                .on("mouseleave", function() {self.$root.$emit("remove_crosshair"); hide_tooltip();})
                .on("contextmenu", function (evt) {evt.preventDefault();})
                .on("mousedown", function (evt) {if ((evt.buttons & 0b10) !== 0) {self.$root.$emit("reset_zoom"); return;} self.$root.$emit("set_start_drag", self.mouse_to_genome(evt.clientX));})
                .on("mouseup", function (evt) {self.set_end_drag(self.mouse_to_genome(evt.clientX)); self.$root.$emit("remove_crosshair");});
        },

        buildStackSvg(symbol = false)
        {
            if (!this.baseAxis || !this.siteOrder || (this.siteOrderlength === 0) || Object.keys(this.baseAxis).length == 0)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            this.width = document.getElementById("stackDiv").getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(this.width);

            let svgHeight = this.groupScale(this.is_compact ? 1 : this.siteOrder.length, this.siteHeight, this.siteGap) - this.siteGap;
            let blockHeight = this.siteHeight / 2;

            let canvas_width = Math.ceil(this.width);
            let canvas_height = Math.ceil(svgHeight);

            let transformation = (i) => this.groupScale(i, this.siteHeight, this.siteGap);

            let svg = "";

            // Draw the RNA modification sites
            let site_colour = "#535353";
            for (let i = 0; i < this.siteOrder.length; ++i)
            {
                let site = this.siteOrder[i];
                let y = (this.is_compact ? 0 : transformation(i)) + (this.siteHeight - blockHeight) / 2;

                let x0 = site;
                let x1 = x0 + 1;
                let x = this.baseAxis.isAscending() ? this.baseAxis.scale(x0) : this.baseAxis.scale(x1);
                let width = Math.abs(this.baseAxis.scale(x1) - this.baseAxis.scale(x0));
                let actual_x0 = Math.round(x);
                let actual_x1 = Math.round(width + x);
                let height = blockHeight;
                let actual_y0 = (y - Math.floor(y) <= 0.5) ? Math.floor(y) : Math.round(y); // emulating the SVG pixel coordinate rounding behaviour
                let actual_y1 = Math.round(height + y);
                let actual_height = actual_y1 - Math.round(y);

                // Don't draw the site if it's outside of the canvas
                if ((actual_x0 <= 0 && actual_x1 <= 0) || (actual_x0 >= canvas_width && actual_x1 >= canvas_width))
                    continue;

                if (actual_x0 < 0)
                    actual_x0 = 0;

                if (actual_x1 > canvas_width)
                    actual_x1 = canvas_width;

                let actual_width = Math.max(actual_x1 - actual_x0, 5);
                svg += rect(actual_x0, actual_y0, actual_width, actual_height, site_colour);
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
            this.buildStack();
        },
        siteOrder: function()
        {
            this.buildStack();
        }
    },

    mounted()
    {
        document.addEventListener("set_rnamodifstack_tooltip_text", (e) => {
            let tooltip_text = e.detail;
            this.tooltip_text = tooltip_text;
        });

        this.$root.$on("draw_crosshair", client_x =>
        {
            this.draw_crosshair(client_x);
        });

        this.$root.$on("remove_crosshair", () =>
        {
            this.remove_crosshair();
        });

        this.$root.$on("single_rnamodifstack_click", () =>
        {
            this.copy_tooltip_text();
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