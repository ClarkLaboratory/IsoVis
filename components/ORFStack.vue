/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render ORF stacks, where each ORF is a row of rectangles.

<template>
<div id="orfStackDiv" ref="parentDiv" style="position: relative">
    <p>ORF stack</p>
</div>
</template>

<script>
import * as d3 from 'd3';
import {put_in_svg, rect, line} from "~/assets/svg_utils";

export default {
    props: ["baseAxis", "ORFOrder", "ORFInfo", "ORFToTranscripts"],

    data: () => {
        return {
            // dimensions
            width: 0,
            padding: 16,
            orfHeight: 30,
            orfGap: 1,

            is_compact: false,

            is_set_highlight: false,
            highlighted_orf: "",

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
            let crosshair_canvas = document.getElementById("orfStackCrosshairCanvas");
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
            this.$root.$emit("set_zoom", [this.start_drag, this.end_drag, true, "ORFStack"]);
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
                console.log("Error copying ORF stack text!", error);
                this.set_tooltip_copied(false);
            }
        },

        set_tooltip_copied(is_copy_successful)
        {
            let tooltip = d3.select("#orfstack_tooltip");
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

            let crosshair_canvas = document.getElementById("orfStackCrosshairCanvas");
            if (!crosshair_canvas)
                return;

            let crosshair_canvas_ctx = crosshair_canvas.getContext("2d");
            crosshair_canvas_ctx.clearRect(0, 0, crosshair_canvas.width, crosshair_canvas.height);
        },

        draw_crosshair(client_x)
        {
            let crosshair_canvas = document.getElementById("orfStackCrosshairCanvas");
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

            if (!this.baseAxis || !this.ORFOrder || (this.ORFOrder.length === 0) || !this.ORFInfo || (Object.keys(this.ORFInfo).length === 0) || !this.ORFToTranscripts || Object.keys(this.baseAxis).length === 0)
                return;

            this.width = document.getElementById("stackDiv").getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(this.width);

            let svgHeight = this.groupScale(this.is_compact ? 1 : this.ORFOrder.length, this.orfHeight, this.orfGap) - this.orfGap;
            let blockHeight = this.orfHeight / 2;
            blockHeight += blockHeight % 2;

            let self = this;  // avoid conflict with 'this' referring to a different object within some functions.

            // Clear the target element of any content
            d3.select("#orfStackDiv").selectAll("*").remove();

            let canvas_width = Math.ceil(self.width);
            let canvas_height = Math.ceil(svgHeight);

            d3.select("#orfStackDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("id", "orfStackCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");
            let canvas = document.getElementById("orfStackCanvas");
            let ctx = canvas.getContext("2d");

            let transformation = (i) => self.groupScale(i, self.orfHeight, self.orfGap);

            let is_forward_strand = (self.baseAxis.genomeCoords().strand === '+');

            // Add the intron line to each ORF
            ctx.beginPath();
            for (let i = 0; i < self.ORFOrder.length; ++i)
            {
                let orf = self.ORFOrder[i];
                let orf_blocks = self.ORFInfo[orf];
                if (orf_blocks.length === 1)
                    continue;

                let start = is_forward_strand ? orf_blocks[0][0] : orf_blocks[orf_blocks.length - 1][0];
                let end = is_forward_strand ? orf_blocks[orf_blocks.length - 1][1] : orf_blocks[0][1];
                if (start > end)
                    start = end;

                let x0 = self.baseAxis.scale(start);
                let x1 = self.baseAxis.scale(end);
                let y0 = (self.orfHeight) / 2 + (this.is_compact ? 0 : transformation(i)) + blockHeight / 8;
                let y1 = y0;

                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
            }
            ctx.stroke();

            ctx.fillStyle = "rgb(83,83,83)";
            let block_info = [];

            // Draw the ORF blocks
            for (let i = 0; i < self.ORFOrder.length; ++i)
            {
                let orf = self.ORFOrder[i];
                let orf_blocks = self.ORFInfo[orf];
                let y = (this.is_compact ? 0 : transformation(i)) + (self.orfHeight - blockHeight * 3 / 4) / 2;

                for (let j = 0; j < orf_blocks.length; ++j)
                {
                    let [x0, x1] = orf_blocks[j];
                    let x = self.baseAxis.isAscending() ? self.baseAxis.scale(x0) : self.baseAxis.scale(x1);
                    let width = Math.abs(self.baseAxis.scale(x1) - self.baseAxis.scale(x0));
                    let actual_x0 = Math.round(x);
                    let actual_x1 = Math.round(width + x);
                    let actual_width = Math.max(actual_x1 - actual_x0, 1);                      // we want to show every block, so ensure they're each at least 1 pixel wide
                    let height = blockHeight;
                    let actual_y0 = (y - Math.floor(y) <= 0.5) ? Math.floor(y) : Math.round(y); // emulating the SVG pixel coordinate rounding behaviour
                    let actual_y1 = Math.round(height + y);
                    let actual_height = actual_y1 - Math.round(y);

                    // Don't draw the block if it's outside of the canvas
                    if (!(((actual_x0 < 0) && (actual_x0 + actual_width < 0)) || ((actual_x0 >= canvas_width) && (actual_x0 + actual_width >= canvas_width))))
                        ctx.fillRect(actual_x0, actual_y0, actual_width, actual_height);
                    else
                        continue;

                    if (!(this.is_compact))
                        block_info.push([actual_x0, actual_x0 + actual_width, actual_y0, actual_y0 + actual_height, orf, x0, x1, j + 1, orf_blocks.length, this.ORFToTranscripts[orf]]);
                }
            }

            let tooltip = d3.select("#orfStackDiv")
                            .append("div")
                            .attr("class", "tooltip")
                            .attr("id", "orfstack_tooltip")
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

            let tooltip_end_text_highlight_mode_on = "<br>(Click on the ORF to highlight it in all transcripts it is encoded in)<br>";
            let tooltip_end_text_highlight_mode_off = "<br>(Click on the ORF block to copy the text in this tooltip)<br>";
            let tooltip_end_text = (this.is_set_highlight) ? tooltip_end_text_highlight_mode_on : tooltip_end_text_highlight_mode_off;

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

                let shown_orf_id = null;
                let shown_block_start = null;
                let shown_block_end = null;
                let shown_block_number = null;
                let shown_total_blocks = null;
                let shown_transcripts = null;
                for (let [x0, x1, y0, y1, orf_id, block_start, block_end, block_number, total_blocks, transcripts] of block_info)
                {
                    if ((x0 <= x_diff) && (x_diff <= x1) && (y0 <= y_diff) && (y_diff <= y1))
                    {
                        shown_orf_id = orf_id;
                        shown_block_start = block_start;
                        shown_block_end = block_end;
                        shown_block_number = block_number;
                        shown_total_blocks = total_blocks;
                        shown_transcripts = transcripts;
                        break;
                    }
                }

                if (!shown_orf_id)
                {
                    d3.select("#orfStackCrosshairCanvas").style("cursor", "crosshair");
                    hide_tooltip();
                    let event = new CustomEvent("set_orfstack_tooltip_text", {detail: ""});
                    document.dispatchEvent(event);
                    return;
                }

                let stack_div = document.getElementById("stackDiv");
                let orf_stack_div = document.getElementById("orfStackDiv");
                let stack_boundary = stack_div.getBoundingClientRect();
                let orf_stack_boundary = orf_stack_div.getBoundingClientRect();
                let leftVal = (calculateLeftVal(clientX) - stack_boundary.left + padding + 7);
                let topVal = (clientY - orf_stack_boundary.top + padding + 5);

                let num_cutoff = 5;
                let is_ellipsis_used = false;

                let transcripts_text = shown_transcripts.slice(0, num_cutoff).join(", ");
                if (shown_transcripts.length > num_cutoff)
                {
                    transcripts_text += "...";
                    is_ellipsis_used = true;
                }

                let shown_transcripts_text = `Encoded in transcripts ${transcripts_text}\r\n`;
                transcripts_text = `Encoded in transcripts ${shown_transcripts.join(", ")}\r\n`;

                let shown_tooltip_text = `ORF: ${shown_orf_id}\r\n${shown_transcripts_text}ORF block #${shown_block_number} / ${shown_total_blocks}\r\nGenomic range: ${shown_block_start} - ${shown_block_end}`;
                let tooltip_text = `ORF: ${shown_orf_id}\r\n${transcripts_text}ORF block #${shown_block_number} / ${shown_total_blocks}\r\nGenomic range: ${shown_block_start} - ${shown_block_end}`;
                let event = new CustomEvent("set_orfstack_tooltip_text", {detail: tooltip_text});
                document.dispatchEvent(event);

                let end_text = tooltip_end_text;
                if (end_text !== tooltip_end_text_highlight_mode_off)
                {
                    if (self.highlighted_orf === shown_orf_id)
                        end_text = "<br>(Click on this ORF again to remove the highlights)<br>";
                }

                let tooltip_html = shown_tooltip_text.replaceAll("\r\n", "<br>") + end_text;
                tooltip.html(tooltip_html)
                    .style("visibility", "visible")
                    .style("left", leftVal + "px").style("top", topVal + "px");

                d3.select("#orfStackCrosshairCanvas").style("cursor", "pointer");
            }

            d3.select("#orfStackDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("id", "orfStackCrosshairCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");

            d3.select("#orfStackCrosshairCanvas")
                .on("mouseover", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX); display_tooltip(evt);})
                .on("mousemove", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX); display_tooltip(evt);})
                .on("mouseleave", function() {self.$root.$emit("remove_crosshair"); hide_tooltip();})
                .on("contextmenu", function (evt) {evt.preventDefault();})
                .on("mousedown", function (evt) {if ((evt.buttons & 0b10) !== 0) {self.$root.$emit("reset_zoom"); return;} self.$root.$emit("set_start_drag", self.mouse_to_genome(evt.clientX));})
                .on("mouseup", function (evt) {self.set_end_drag(self.mouse_to_genome(evt.clientX)); self.$root.$emit("remove_crosshair");});
        },

        buildStackSvg(symbol = false)
        {
            if (!this.baseAxis || !this.ORFOrder || (this.ORFOrder.length === 0) || !this.ORFInfo || (Object.keys(this.ORFInfo).length === 0) || !this.ORFToTranscripts || Object.keys(this.baseAxis).length === 0)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            this.width = document.getElementById("stackDiv").getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(this.width);

            let svgHeight = this.groupScale(this.is_compact ? 1 : this.ORFOrder.length, this.orfHeight, this.orfGap) - this.orfGap;
            let blockHeight = this.orfHeight / 2;
            blockHeight += blockHeight % 2;

            let canvas_width = Math.ceil(this.width);
            let canvas_height = Math.ceil(svgHeight);

            let transformation = (i) => this.groupScale(i, this.orfHeight, this.orfGap);

            let svg = "";

            let is_forward_strand = (this.baseAxis.genomeCoords().strand === '+');

            // Add the intron line to each ORF
            for (let i = 0; i < this.ORFOrder.length; ++i)
            {
                let orf = this.ORFOrder[i];
                let orf_blocks = this.ORFInfo[orf];
                if (orf_blocks.length === 1)
                    continue;

                let start = is_forward_strand ? orf_blocks[0][0] : orf_blocks[orf_blocks.length - 1][0];
                let end = is_forward_strand ? orf_blocks[orf_blocks.length - 1][1] : orf_blocks[0][1];
                if (start > end)
                    start = end;

                let x0 = this.baseAxis.scale(start);
                let x1 = this.baseAxis.scale(end);
                let y0 = (this.orfHeight) / 2 + (this.is_compact ? 0 : transformation(i)) + blockHeight / 8;
                let y1 = y0;

                if (((x0 <= 0) && (x1 <= 0)) || ((x0 >= canvas_width) && (x1 >= canvas_width)))
                    continue;

                if (x0 > x1)
                {
                    let temp = x1;
                    x1 = x0;
                    x0 = temp;
                }

                if (x0 < 0)
                    x0 = 0;

                if (x1 >= canvas_width)
                    x1 = canvas_width;

                svg += line(x0, y0, x1, y1, "black", 1);
            }

            // Draw the ORF blocks
            for (let i = 0; i < this.ORFOrder.length; ++i)
            {
                let orf = this.ORFOrder[i];
                let orf_blocks = this.ORFInfo[orf];
                let y = (this.is_compact ? 0 : transformation(i)) + (this.orfHeight - blockHeight * 3 / 4) / 2;

                for (let j = 0; j < orf_blocks.length; ++j)
                {
                    let [x0, x1] = orf_blocks[j];
                    let x = this.baseAxis.isAscending() ? this.baseAxis.scale(x0) : this.baseAxis.scale(x1);
                    let width = Math.abs(this.baseAxis.scale(x1) - this.baseAxis.scale(x0));
                    let actual_x0 = Math.round(x);
                    let actual_x1 = Math.round(width + x);
                    let actual_width = Math.max(actual_x1 - actual_x0, 1);                      // we want to show every block, so ensure they're each at least 1 pixel wide
                    actual_x1 = actual_x0 + actual_width;
                    let height = blockHeight;
                    let actual_y0 = (y - Math.floor(y) <= 0.5) ? Math.floor(y) : Math.round(y); // emulating the SVG pixel coordinate rounding behaviour
                    let actual_y1 = Math.round(height + y);
                    let actual_height = actual_y1 - Math.round(y);

                    // Don't draw the block if it's outside of the canvas
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
                        actual_width -= (actual_x1 - canvas_width);

                    svg += rect(actual_x0, actual_y0, actual_width, actual_height, "#535353");
                }
            }

            if (symbol)
                return [canvas_width, canvas_height, svg];

            svg = put_in_svg(canvas_width, canvas_height, svg);
            return svg;
        },
    },

    watch: {
        baseAxis: function()
        {
            this.buildStack();
        },
        ORFOrder: function()
        {
            this.buildStack();
        }
    },

    mounted()
    {
        document.addEventListener("set_orfstack_tooltip_text", (e) => {
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

        this.$root.$on("single_orfstack_click", () =>
        {
            if (this.is_set_highlight)
            {
                let tooltip_text = this.tooltip_text;
                if (!tooltip_text)
                    return;

                let orf_start_index = tooltip_text.indexOf("ORF: ");
                if (orf_start_index === -1)
                    return;

                orf_start_index += "ORF: ".length;
                let orf_end_index = tooltip_text.indexOf("\r\n", orf_start_index);
                if (orf_end_index === -1)
                    return;

                let orf = tooltip_text.substring(orf_start_index, orf_end_index);
                if (orf === this.highlighted_orf)
                {
                    d3.select("#orfstack_tooltip").html("Highlights removed!");
                    this.$root.$emit("set_orf_highlight", "");
                    this.highlighted_orf = "";
                    this.buildStack();
                    return;
                }

                let new_tooltip_text = `ORF ${orf} highlighted!<br>`;
                d3.select("#orfstack_tooltip").html(new_tooltip_text);

                // Emit an event for the isoform stack to receive so that it knows which ORF to highlight
                this.$root.$emit("set_orf_highlight", orf);
                this.highlighted_orf = orf;
                this.buildStack();
            }
            else
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