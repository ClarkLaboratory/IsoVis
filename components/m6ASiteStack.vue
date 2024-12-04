/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render m6A site stacks, where each m6A site corresponds to one nucleotide and is shown as a thin rectangle.

<template>
<div id="m6AStackDiv" class="req-crosshair" ref="parentDiv" style="position: relative">
    <p>m6A site stack</p>
</div>
</template>

<script>
import * as d3 from 'd3';
// import {put_in_svg, rect, line} from "~/assets/svg_utils";

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
            let crosshair_canvas = document.getElementById("m6AStackCrosshairCanvas");
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
            this.$root.$emit("set_zoom", [this.start_drag, this.end_drag, true, "m6AStack"]);
            this.start_drag = -1;
        },

        async copy_tooltip_text()
        {
            if (!this.tooltip_text)
                return;

            try
            {
                await navigator.clipboard.writeText(this.tooltip_text);
                this.set_tooltip_copied(true);
            }
            catch (error)
            {
                console.log("Error copying m6A site stack text!", error);
                this.set_tooltip_copied(false);
            }
        },

        set_tooltip_copied(is_copy_successful)
        {
            let tooltip = d3.select("#m6astack_tooltip");
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

            let crosshair_canvas = document.getElementById("m6AStackCrosshairCanvas");
            if (!crosshair_canvas)
                return;

            let crosshair_canvas_ctx = crosshair_canvas.getContext("2d");
            crosshair_canvas_ctx.clearRect(0, 0, crosshair_canvas.width, crosshair_canvas.height);
        },

        draw_crosshair(client_x)
        {
            let crosshair_canvas = document.getElementById("m6AStackCrosshairCanvas");
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
            d3.select("#m6AStackDiv").selectAll("*").remove();

            let canvas_width = Math.ceil(self.width);
            let canvas_height = Math.ceil(svgHeight);

            d3.select("#m6AStackDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("id", "m6AStackCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");
            let canvas = document.getElementById("m6AStackCanvas");
            let ctx = canvas.getContext("2d");

            let transformation = (i) => self.groupScale(i, self.siteHeight, self.siteGap);

            /* Don't draw a metagene background for now... it's probably cleaner that way */
            // let screen_ranges = self.baseAxis.screenRanges();

            // // Add metagene background to each m6A site
            // ctx.fillStyle = "rgb(213,235,232)";
            // for (let [x0, x1] of screen_ranges)
            // {
            //     let width = Math.abs(x1 - x0);
            //     let actual_x0 = Math.round(x0);
            //     let actual_x1 = Math.round(width + x0);
            //     let actual_width = actual_x1 - actual_x0;

            //     // Don't draw the metagene background if it's outside of the canvas
            //     if (!(((actual_x0 < 0) && (actual_x0 + actual_width < 0)) || ((actual_x0 >= canvas_width) && (actual_x0 + actual_width >= canvas_width))))
            //     {
            //         for (let i = 0; i < self.siteOrder.length; ++i)
            //         {
            //             let y0 = transformation(i);
            //             ctx.fillRect(actual_x0, y0, actual_width, self.siteHeight);
            //         }
            //     }
            // }

            let site_info = [];

            // Draw the m6A sites
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

                // Don't draw the block if it's outside of the canvas
                if (!(((actual_x0 < 0) && (actual_x0 + actual_width < 0)) || ((actual_x0 >= canvas_width) && (actual_x0 + actual_width >= canvas_width))))
                    ctx.fillRect(actual_x0, actual_y0, actual_width, actual_height);
                else
                    continue;

                if (!this.is_compact)
                    site_info.push([actual_x0, actual_x0 + actual_width, actual_y0, actual_y0 + actual_height, x0]);
            }

            let tooltip = d3.select("#m6AStackDiv")
                            .append("div")
                            .attr("class", "tooltip")
                            .attr("id", "m6astack_tooltip")
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
                    d3.select("#m6AStackCrosshairCanvas").style("cursor", "crosshair");
                    hide_tooltip();
                    let event = new CustomEvent("set_m6astack_tooltip_text", {detail: ""});
                    document.dispatchEvent(event);
                    return;
                }

                let stack_div = document.getElementById("stackDiv");
                let m6a_stack_div = document.getElementById("m6AStackDiv");
                let stack_boundary = stack_div.getBoundingClientRect();
                let m6a_stack_boundary = m6a_stack_div.getBoundingClientRect();
                let leftVal = (calculateLeftVal(clientX) - stack_boundary.left + padding + 7);
                let topVal = (clientY - m6a_stack_boundary.top + padding + 5);

                let tooltip_text = `Site location: ${shown_site}`;
                let event = new CustomEvent("set_m6astack_tooltip_text", {detail: tooltip_text});
                document.dispatchEvent(event);

                tooltip.html(`Site location: ${shown_site}<br>(Click on the m6A site to copy the text in this tooltip)<br>`)
                    .style("visibility", "visible")
                    .style("left", leftVal + "px").style("top", topVal + "px");

                d3.select("#m6AStackCrosshairCanvas").style("cursor", "pointer");
            }

            d3.select("#m6AStackDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("id", "m6AStackCrosshairCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");

            d3.select("#m6AStackCrosshairCanvas")
                .on("mouseover", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX); display_tooltip(evt);})
                .on("mousemove", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX); display_tooltip(evt);})
                .on("mouseleave", function() {self.$root.$emit("remove_crosshair"); hide_tooltip();})
                .on("contextmenu", function (evt) {evt.preventDefault();})
                .on("mousedown", function (evt) {if ((evt.buttons & 0b10) !== 0) {self.$root.$emit("reset_zoom"); return;} self.$root.$emit("set_start_drag", self.mouse_to_genome(evt.clientX));})
                .on("mouseup", function (evt) {self.set_end_drag(self.mouse_to_genome(evt.clientX)); self.$root.$emit("remove_crosshair");});
        },

        // buildStackSvg(symbol = false)
        // {
        //     if (!this.baseAxis || !this.isoformList || Object.keys(this.baseAxis).length == 0)
        //     {
        //         if (symbol)
        //             return [-1, -1, null];
        //         return "";
        //     }

        //     this.width = document.getElementById("stackDiv").getBoundingClientRect().width - 2 * this.padding;
        //     this.baseAxis.setPlotWidth(this.width);

        //     // var data = (state.showCanon) ? state.canonData : state.primaryData;
        //     let svgHeight = this.groupScale(this.isoformList.length, this.siteHeight, this.siteGap) - this.siteGap;
        //     let blockHeight = (this.show_orfs || this.show_user_orfs) ? this.siteHeight / 3 : this.siteHeight / 2;
        //     // let exonTranslation = `translate(0, ${(this.siteHeight - blockHeight) / 2})`;

        //     let self = this;  // avoid conflict with 'this' referring to a different object within some functions.

        //     let canvas_width = Math.ceil(self.width);
        //     let canvas_height = Math.ceil(svgHeight);

        //     let transformation = (i) => self.groupScale(i, self.siteHeight, self.siteGap);
        //     let screen_ranges = self.baseAxis.screenRanges();

        //     let svg = "";

        //     // Add metagene background to each isoform
        //     for (let [x0, x1] of screen_ranges)
        //     {
        //         let width = Math.abs(x1 - x0);
        //         let actual_x0 = Math.round(x0);
        //         let actual_x1 = Math.round(width + x0);
        //         let actual_width = actual_x1 - actual_x0;

        //         // Don't draw the metagene background if it's outside of the canvas
        //         if (((actual_x0 < 0) && (actual_x1 < 0)) || ((actual_x0 >= canvas_width) && (actual_x1 >= canvas_width)))
        //             continue;

        //         if ((actual_x0 < 0) && (actual_x1 >= canvas_width))
        //         {
        //             actual_x0 = 0;
        //             actual_width = canvas_width;
        //         }
        //         else if (actual_x0 < 0)
        //         {
        //             actual_width += actual_x0;
        //             actual_x0 = 0;
        //         }
        //         else if (actual_x1 >= canvas_width)
        //         {
        //             actual_width -= (actual_x1 - canvas_width);
        //         }

        //         for (let i = 0; i < self.isoformList.length; ++i)
        //         {
        //             let y0 = transformation(i);
        //             svg += rect(actual_x0, y0, actual_width, self.siteHeight, "#d5ebe8");
        //         }
        //     }

        //     // Add the intron line to each isoform
        //     for (let i = 0; i < self.isoformList.length; ++i)
        //     {
        //         let isoform = self.isoformList[i];
        //         let x0 = self.baseAxis.scale(isoform.start);
        //         let x1 = self.baseAxis.scale(isoform.end);
        //         let y0 = (self.siteHeight) / 2 + transformation(i);
        //         let y1 = y0;

        //         if (((x0 <= 0) && (x1 <= 0)) || ((x0 >= canvas_width) && (x1 >= canvas_width)))
        //             continue;

        //         if (x0 > x1)
        //         {
        //             let temp = x1;
        //             x1 = x0;
        //             x0 = temp;
        //         }

        //         if (x0 < 0)
        //             x0 = 0;

        //         if (x1 >= canvas_width)
        //             x1 = canvas_width;

        //         svg += line(x0, y0, x1, y1, "black", 1);
        //     }

        //     // Add exons to each isoform
        //     let exon_colour = (self.show_orfs || self.show_user_orfs) ? "#707070" : "#535353";
        //     for (let i = 0; i < self.isoformList.length; ++i)
        //     {
        //         let isoform = self.isoformList[i];
        //         let exon_ranges = isoform.exonRanges;
        //         let y = transformation(i) + (self.siteHeight - blockHeight) / 2;

        //         for (let [x0, x1] of exon_ranges)
        //         {
        //             let x = self.baseAxis.isAscending() ? self.baseAxis.scale(x0) : self.baseAxis.scale(x1);
        //             let width = Math.abs(self.baseAxis.scale(x1) - self.baseAxis.scale(x0));
        //             let actual_x0 = Math.round(x);
        //             let actual_x1 = Math.round(width + x);
        //             let actual_width = Math.max(actual_x1 - actual_x0, 1);                      // we want to show every exon, so ensure they're each at least 1 pixel wide
        //             actual_x1 = actual_x0 + actual_width;
        //             let height = blockHeight;
        //             let actual_y0 = (y - Math.floor(y) <= 0.5) ? Math.floor(y) : Math.round(y); // emulating the SVG pixel coordinate rounding behaviour
        //             let actual_y1 = Math.round(height + y);
        //             let actual_height = actual_y1 - Math.round(y);

        //             // Don't draw the exon if it's outside of the canvas
        //             if (((actual_x0 < 0) && (actual_x1 < 0)) || ((actual_x0 >= canvas_width) && (actual_x1 >= canvas_width)))
        //                 continue;

        //             if ((actual_x0 < 0) && (actual_x1 >= canvas_width))
        //             {
        //                 actual_x0 = 0;
        //                 actual_width = canvas_width;
        //             }
        //             else if (actual_x0 < 0)
        //             {
        //                 actual_width += actual_x0;
        //                 actual_x0 = 0;
        //             }
        //             else if (actual_x1 >= canvas_width)
        //             {
        //                 actual_width -= (actual_x1 - canvas_width);
        //             }

        //             svg += rect(actual_x0, actual_y0, actual_width, actual_height, exon_colour);
        //         }
        //     }

        //     if (self.show_orfs || self.show_user_orfs)
        //     {
        //         // Add ORFs to each isoform
        //         let orfHeight = self.siteHeight / 2;
        //         for (let i = 0; i < self.isoformList.length; ++i)
        //         {
        //             let isoform = self.isoformList[i];
        //             let orf_ranges = self.show_orfs ? isoform.orf : isoform.user_orf;

        //             let y = transformation(i) + orfHeight / 2;

        //             for (let [x0, x1] of orf_ranges)
        //             {
        //                 let x = self.baseAxis.isAscending() ? self.baseAxis.scale(x0) : self.baseAxis.scale(x1);
        //                 let width = Math.abs(self.baseAxis.scale(x1) - self.baseAxis.scale(x0));
        //                 let actual_x0 = Math.round(x);
        //                 let actual_x1 = Math.round(width + x);
        //                 let actual_width = Math.max(actual_x1 - actual_x0, 1);                      // we want to show every ORF, so ensure they're each at least 1 pixel wide
        //                 actual_x1 = actual_x0 + actual_width;
        //                 let height = Math.ceil(orfHeight);
        //                 let actual_y0 = (y - Math.floor(y) <= 0.5) ? Math.floor(y) : Math.round(y); // emulating the SVG pixel coordinate rounding behaviour
        //                 let actual_y1 = Math.round(height + y);
        //                 let actual_height = actual_y1 - Math.round(y);

        //                 // Don't draw the exon if it's outside of the canvas
        //                 if (((actual_x0 < 0) && (actual_x1 < 0)) || ((actual_x0 >= canvas_width) && (actual_x1 >= canvas_width)))
        //                     continue;

        //                 if ((actual_x0 < 0) && (actual_x1 >= canvas_width))
        //                 {
        //                     actual_x0 = 0;
        //                     actual_width = canvas_width;
        //                 }
        //                 else if (actual_x0 < 0)
        //                 {
        //                     actual_width += actual_x0;
        //                     actual_x0 = 0;
        //                 }
        //                 else if (actual_x1 >= canvas_width)
        //                 {
        //                     actual_width -= (actual_x1 - canvas_width);
        //                 }

        //                 svg += rect(actual_x0, actual_y0, actual_width, actual_height, "#535353");
        //             }
        //         }
        //     }

        //     if (symbol)
        //         return [canvas_width, canvas_height, svg];

        //     svg = put_in_svg(canvas_width, canvas_height, svg);
        //     return svg;
        // }
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
        // is_compact: function()
        // {
        //     this.buildStack();
        // }
    },

    mounted()
    {
        document.addEventListener("set_m6astack_tooltip_text", (e) => {
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

        this.$root.$on("single_m6astack_click", () =>
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