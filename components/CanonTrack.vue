/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render isoform stacks, where each isoform is a row of rectangles separated by introns.
Requires an instance of BaseAxis as input, as well as isoformList object
which must have 'transcriptID', 'exonRanges' and 'orf' properties.

<template>
<div id="canonDiv" class="req-crosshair" ref="parentDiv" style="position: relative; min-height: 48px;">
    <p>Loading canonical transcript stack...</p>
</div>
</template>

<script>
import * as d3 from 'd3';
import {put_in_svg, rect, line} from "~/assets/svg_utils";

export default {
    props: ["baseAxis", "canonData"],
    
    data: () => {
        return {
            // dimensions
            width: 0,
            padding: 16,
            isoformHeight: 50 - 2,
            isoformGap: 1,

            show_orfs: false,
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
            let crosshair_canvas = document.getElementById("canonCrosshairCanvas");
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
            this.$root.$emit("set_zoom", [this.start_drag, this.end_drag, true, "Canon"]);
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
                console.log("Error copying canonical isoform exon text!", error);
                this.set_tooltip_copied(false);
            }
        },

        set_tooltip_copied(is_copy_successful)
        {
            let tooltip = d3.select("#canontrack_tooltip");
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

            let crosshair_canvas = document.getElementById("canonCrosshairCanvas");
            if (!crosshair_canvas)
                return;

            let crosshair_canvas_ctx = crosshair_canvas.getContext("2d");
            crosshair_canvas_ctx.clearRect(0, 0, crosshair_canvas.width, crosshair_canvas.height);
        },

        draw_crosshair(client_x)
        {
            let crosshair_canvas = document.getElementById("canonCrosshairCanvas");
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

        init()
        {
            document.getElementById("canonDiv").innerHTML = "<p>Loading canonical transcript stack...</p>";
        },

        // Method to build the stack
        buildStack() {
            this.start_drag = -1;
            this.end_drag = -1;
            this.tooltip_text = "";

            if (!this.baseAxis || !this.canonData || Object.keys(this.baseAxis).length == 0 || Object.keys(this.canonData).length == 0)
                return;

            this.width = document.getElementById("stackDiv").getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(this.width);

            //var data = (state.showCanon) ? state.canonData : state.primaryData;
            let svgHeight = this.groupScale(this.canonData.isoformList.length, this.isoformHeight, this.isoformGap) - this.isoformGap;
            let exonHeight = this.show_orfs ? this.isoformHeight / 3 : this.isoformHeight / 2;
            // let exonTranslation = this.show_orfs ? `translate(0, ${this.exonHeight})` : `translate(0, ${this.exonHeight / 2})`
            // let exonTranslation = `translate(0, ${(this.isoformHeight - exonHeight) / 2})`;

            let self = this;  // avoid conflict with 'this' referring to a different object within some functions.

            // Clear the target element of any content
            d3.select("#canonDiv").selectAll("*").remove();

            let canvas_width = Math.ceil(self.width);
            let canvas_height = Math.ceil(svgHeight);

            d3.select("#canonDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("style", "margin-bottom: -5.5px; position: absolute; left: 1rem !important;") // FIXME: When the canvas is added into the page, the element becomes 5.5 pixels taller than it should be
                .attr("id", "canonCanvas");
            let canvas = document.getElementById("canonCanvas");
            let ctx = canvas.getContext("2d");

            let transformation = (i) => self.groupScale(i, self.isoformHeight, self.isoformGap);
            let screen_ranges = self.baseAxis.screenRanges();

            let ordered_screen_ranges = [];

            // Add metagene background to each isoform
            ctx.fillStyle = "rgb(213,235,232)";
            for (let [x0, x1] of screen_ranges)
            {
                let width = Math.abs(x1 - x0);
                let actual_x0 = Math.round(x0);
                let actual_x1 = Math.round(width + x0);
                let actual_width = actual_x1 - actual_x0;

                // Don't draw the metagene background if it's outside of the canvas
                if (!(((actual_x0 < 0) && (actual_x0 + actual_width < 0)) || ((actual_x0 >= canvas_width) && (actual_x0 + actual_width >= canvas_width))))
                {
                    for (let i = 0; i < self.canonData.isoformList.length; ++i)
                    {
                        let y0 = transformation(i);
                        ctx.fillRect(actual_x0, y0, actual_width, self.isoformHeight);
                    }
                }

                ordered_screen_ranges.push([actual_x0, actual_x0 + actual_width]);
            }

            let is_ascending = self.baseAxis.isAscending();
            let is_forward_strand = (self.baseAxis.genomeCoords().strand === '+');
            let is_reverse_needed = (is_ascending !== is_forward_strand);

            ordered_screen_ranges.sort(function (a, b) {return a[0] - b[0];});
            if (is_reverse_needed)
                ordered_screen_ranges.reverse();

            // Add the intron line to each isoform
            ctx.beginPath();
            for (let i = 0; i < self.canonData.isoformList.length; ++i)
            {
                let isoform = self.canonData.isoformList[i];
                let x0 = self.baseAxis.scale(isoform.start);
                let x1 = self.baseAxis.scale(isoform.end);
                let y0 = (self.isoformHeight) / 2 + transformation(i);
                let y1 = y0;

                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
            }
            ctx.stroke();

            let exon_info = [];

            // Add exons to each isoform
            ctx.fillStyle = self.show_orfs ? "rgb(112,112,112)" : "rgb(83,83,83)";
            for (let i = 0; i < self.canonData.isoformList.length; ++i)
            {
                let isoform = self.canonData.isoformList[i];
                let exon_ranges = isoform.exonRanges;
                let y = transformation(i) + (self.isoformHeight - exonHeight) / 2;

                let ordered_exon_ranges = JSON.parse(JSON.stringify(exon_ranges));
                for (let j = 0; j < ordered_exon_ranges.length; ++j)
                {
                    let [x0, x1] = ordered_exon_ranges[j];
                    if (x0 > x1)
                    {
                        ordered_exon_ranges[j][0] = x1;
                        ordered_exon_ranges[j][1] = x0;
                    }
                }

                ordered_exon_ranges.sort(function (a, b) {return a[0] - b[0];});
                if (!is_forward_strand)
                    ordered_exon_ranges.reverse();

                for (let j = 0; j < exon_ranges.length; ++j)
                {
                    let [x0, x1] = exon_ranges[j];
                    let x = self.baseAxis.isAscending() ? self.baseAxis.scale(x0) : self.baseAxis.scale(x1);
                    let width = Math.abs(self.baseAxis.scale(x1) - self.baseAxis.scale(x0));
                    let actual_x0 = Math.round(x);
                    let actual_x1 = Math.round(width + x);
                    let actual_width = Math.max(actual_x1 - actual_x0, 1);                      // we want to show every exon, so ensure they're each at least 1 pixel wide
                    let height = exonHeight;
                    let actual_y0 = (y - Math.floor(y) <= 0.5) ? Math.floor(y) : Math.round(y); // emulating the SVG pixel coordinate rounding behaviour
                    let actual_y1 = Math.round(height + y);
                    let actual_height = actual_y1 - Math.round(y);

                    // Don't draw the exon if it's outside of the canvas
                    if (!(((actual_x0 < 0) && (actual_x0 + actual_width < 0)) || ((actual_x0 >= canvas_width) && (actual_x0 + actual_width >= canvas_width))))
                        ctx.fillRect(actual_x0, actual_y0, actual_width, actual_height);
                    else
                        continue;

                    if (x0 > x1)
                    {
                        let temp = x1;
                        x1 = x0;
                        x0 = temp;
                    }

                    for (let k = 0; k < ordered_exon_ranges.length; ++k)
                    {
                        if ((ordered_exon_ranges[k][0] !== x0) || (ordered_exon_ranges[k][1] !== x1))
                            continue;

                        for (let l = 0; l < ordered_screen_ranges.length; ++l)
                        {
                            let [screen_x0, screen_x1] = ordered_screen_ranges[l];
                            if ((screen_x0 <= actual_x0) && (actual_x0 <= screen_x1) && (screen_x0 <= actual_x0 + actual_width) && (actual_x0 + actual_width <= screen_x1))
                            {
                                exon_info.push([actual_x0, actual_x0 + actual_width, actual_y0, actual_y0 + actual_height, isoform.transcriptID, x0, x1, k + 1, ordered_exon_ranges.length, l + 1, ordered_screen_ranges.length]);
                                break;
                            }
                        }

                        break;
                    }
                }
            }

            if (self.show_orfs)
            {
                let orf_exon_info = [];

                // Add ORFs to each isoform
                ctx.fillStyle = "rgb(83,83,83)";
                let orfHeight = self.isoformHeight / 2;
                for (let i = 0; i < self.canonData.isoformList.length; ++i)
                {
                    let isoform = self.canonData.isoformList[i];
                    let orf_ranges = isoform.orf;
                    let y = transformation(i) + orfHeight / 2;

                    let ordered_exon_ranges = JSON.parse(JSON.stringify(isoform.exonRanges));
                    for (let j = 0; j < ordered_exon_ranges.length; ++j)
                    {
                        let [x0, x1] = ordered_exon_ranges[j];
                        if (x0 > x1)
                        {
                            ordered_exon_ranges[j][0] = x1;
                            ordered_exon_ranges[j][1] = x0;
                        }
                    }

                    ordered_exon_ranges.sort(function (a, b) {return a[0] - b[0];});
                    if (!is_forward_strand)
                        ordered_exon_ranges.reverse();

                    for (let [x0, x1] of orf_ranges)
                    {
                        let x = self.baseAxis.isAscending() ? self.baseAxis.scale(x0) : self.baseAxis.scale(x1);
                        let width = Math.abs(self.baseAxis.scale(x1) - self.baseAxis.scale(x0));
                        let actual_x0 = Math.round(x);
                        let actual_x1 = Math.round(width + x);
                        let actual_width = Math.max(actual_x1 - actual_x0, 1);                      // we want to show every ORF, so ensure they're each at least 1 pixel wide
                        let height = Math.ceil(orfHeight);
                        let actual_y0 = (y - Math.floor(y) <= 0.5) ? Math.floor(y) : Math.round(y); // emulating the SVG pixel coordinate rounding behaviour
                        let actual_y1 = Math.round(height + y);
                        let actual_height = actual_y1 - Math.round(y);

                        // Don't draw the exon if it's outside of the canvas
                        if (!(((actual_x0 < 0) && (actual_x0 + actual_width < 0)) || ((actual_x0 >= canvas_width) && (actual_x0 + actual_width >= canvas_width))))
                            ctx.fillRect(actual_x0, actual_y0, actual_width, actual_height);
                        else
                            continue;

                        let orf_start = x0;
                        let orf_end = x1;
                        if (orf_start > orf_end)
                        {
                            let temp = orf_end;
                            orf_end = orf_start;
                            orf_start = temp;
                        }

                        for (let [exon_start, exon_end] of isoform.exonRanges)
                        {
                            if (exon_start > exon_end)
                            {
                                let temp = exon_end;
                                exon_end = exon_start;
                                exon_start = temp;
                            }

                            if (((orf_start <= exon_start) && (exon_start <= orf_end)) || ((orf_start <= exon_end) && (exon_end <= orf_end)))
                            {
                                for (let k = 0; k < ordered_exon_ranges.length; ++k)
                                {
                                    if ((ordered_exon_ranges[k][0] !== exon_start) || (ordered_exon_ranges[k][1] !== exon_end))
                                        continue;

                                    for (let l = 0; l < ordered_screen_ranges.length; ++l)
                                    {
                                        let [screen_x0, screen_x1] = ordered_screen_ranges[l];
                                        if ((screen_x0 <= actual_x0) && (actual_x0 <= screen_x1) && (screen_x0 <= actual_x0 + actual_width) && (actual_x0 + actual_width <= screen_x1))
                                        {
                                            orf_exon_info.push([actual_x0, actual_x0 + actual_width, actual_y0, actual_y0 + actual_height, isoform.transcriptID, exon_start, exon_end, k + 1, ordered_exon_ranges.length, l + 1, ordered_screen_ranges.length]);
                                            break;
                                        }
                                    }

                                    break;
                                }
                                break;
                            }
                        }
                    }
                }

                exon_info = orf_exon_info.concat(exon_info);
            }

            let tooltip = d3.select("#canonDiv")
                            .append("div")
                            .attr("class", "tooltip")
                            .attr("id", "canontrack_tooltip")
                            .style("visibility", "hidden")
                            .style("opacity", 1)
                            .style("background-color", "white")
                            .style("border", "solid")
                            .style("border-width", "2px")
                            .style("border-radius", "5px")
                            .style("padding", "5px")
                            .style("user-select", "none");

            let boundary = document.getElementById("canonDiv").getBoundingClientRect();
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

                let shown_transcript_id = null;
                let shown_exon_start = null;
                let shown_exon_end = null;
                let shown_exon_number = null;
                let shown_total_exons = null;
                let shown_exonic_region_number = null;
                let shown_total_exonic_regions = null;
                for (let [x0, x1, y0, y1, transcript_id, exon_start, exon_end, exon_number, total_exons, exonic_region_number, total_exonic_regions] of exon_info)
                {
                    if ((x0 <= x_diff) && (x_diff <= x1) && (y0 <= y_diff) && (y_diff <= y1))
                    {
                        shown_transcript_id = transcript_id;
                        shown_exon_start = exon_start;
                        shown_exon_end = exon_end;
                        shown_exon_number = exon_number;
                        shown_total_exons = total_exons;
                        shown_exonic_region_number = exonic_region_number;
                        shown_total_exonic_regions = total_exonic_regions;
                        break;
                    }
                }

                if (!shown_transcript_id)
                {
                    d3.select("#canonCrosshairCanvas").style("cursor", "crosshair");
                    hide_tooltip();
                    let event = new CustomEvent("set_canontrack_tooltip_text", {detail: ""});
                    document.dispatchEvent(event);
                    return;
                }

                let div = document.getElementById("canonDiv");
                let boundary = div.getBoundingClientRect();
                let leftVal = (calculateLeftVal(clientX) - boundary.left + padding + 7);
                let topVal = (clientY - boundary.top + padding + 5);

                let tooltip_text = `Canonical transcript: ${shown_transcript_id}\r\nExon #${shown_exon_number} / ${shown_total_exons}\r\nExonic region #${shown_exonic_region_number} / ${shown_total_exonic_regions}\r\nExon range: ${shown_exon_start} - ${shown_exon_end}`;
                let event = new CustomEvent("set_canontrack_tooltip_text", {detail: tooltip_text});
                document.dispatchEvent(event);

                tooltip.html(`Canonical transcript: ${shown_transcript_id}<br>Exon #${shown_exon_number} / ${shown_total_exons}<br>Exonic region #${shown_exonic_region_number} / ${shown_total_exonic_regions}<br>Exon range: ${shown_exon_start} - ${shown_exon_end}<br>(Click on the exon to copy the text in this tooltip)<br>`)
                    .style("visibility", "visible")
                    .style("left", leftVal + "px").style("top", topVal + "px");

                d3.select("#canonCrosshairCanvas").style("cursor", "pointer");
            }

            d3.select("#canonDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("id", "canonCrosshairCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");

            d3.select("#canonCrosshairCanvas")
                .on("mouseover", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX); display_tooltip(evt);})
                .on("mousemove", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX); display_tooltip(evt);})
                .on("mouseleave", function() {self.$root.$emit("remove_crosshair"); hide_tooltip();})
                .on("contextmenu", function (evt) {evt.preventDefault();})
                .on("mousedown", function (evt) {if ((evt.buttons & 0b10) !== 0) {self.$root.$emit("reset_zoom"); return;} self.$root.$emit("set_start_drag", self.mouse_to_genome(evt.clientX));})
                .on("mouseup", function (evt) {self.set_end_drag(self.mouse_to_genome(evt.clientX)); self.$root.$emit("remove_crosshair");});
        },

        buildStackSvg(symbol = false)
        {
            if (!this.baseAxis || !this.canonData || Object.keys(this.baseAxis).length == 0 || Object.keys(this.canonData).length == 0)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            this.width = document.getElementById("stackDiv").getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(this.width);

            // var data = (state.showCanon) ? state.canonData : state.primaryData;
            let svgHeight = this.groupScale(this.canonData.isoformList.length, this.isoformHeight, this.isoformGap) - this.isoformGap;
            let exonHeight = this.show_orfs ? this.isoformHeight / 3 : this.isoformHeight / 2;
            // let exonTranslation = `translate(0, ${(this.isoformHeight - exonHeight) / 2})`;

            let self = this;  // avoid conflict with 'this' referring to a different object within some functions.

            let canvas_width = Math.ceil(self.width);
            let canvas_height = Math.ceil(svgHeight);

            let transformation = (i) => self.groupScale(i, self.isoformHeight, self.isoformGap);
            let screen_ranges = self.baseAxis.screenRanges();

            let svg = "";

            // Add metagene background to each isoform
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

                for (let i = 0; i < self.canonData.isoformList.length; ++i)
                {
                    let y0 = transformation(i);
                    svg += rect(actual_x0, y0, actual_width, self.isoformHeight, "#d5ebe8");
                }
            }

            // Add the intron line to each isoform
            for (let i = 0; i < self.canonData.isoformList.length; ++i)
            {
                let isoform = self.canonData.isoformList[i];
                let x0 = self.baseAxis.scale(isoform.start);
                let x1 = self.baseAxis.scale(isoform.end);
                let y0 = (self.isoformHeight) / 2 + transformation(i);
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

            // Add exons to each isoform
            let exon_colour = self.show_orfs ? "#707070" : "#535353";
            for (let i = 0; i < self.canonData.isoformList.length; ++i)
            {
                let isoform = self.canonData.isoformList[i];
                let exon_ranges = isoform.exonRanges;
                let y = transformation(i) + (self.isoformHeight - exonHeight) / 2;

                for (let [x0, x1] of exon_ranges)
                {
                    let x = self.baseAxis.isAscending() ? self.baseAxis.scale(x0) : self.baseAxis.scale(x1);
                    let width = Math.abs(self.baseAxis.scale(x1) - self.baseAxis.scale(x0));
                    let actual_x0 = Math.round(x);
                    let actual_x1 = Math.round(width + x);
                    let actual_width = Math.max(actual_x1 - actual_x0, 1);                      // we want to show every exon, so ensure they're each at least 1 pixel wide
                    actual_x1 = actual_x0 + actual_width;
                    let height = exonHeight;
                    let actual_y0 = (y - Math.floor(y) <= 0.5) ? Math.floor(y) : Math.round(y); // emulating the SVG pixel coordinate rounding behaviour
                    let actual_y1 = Math.round(height + y);
                    let actual_height = actual_y1 - Math.round(y);

                    // Don't draw the exon if it's outside of the canvas
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

                    svg += rect(actual_x0, actual_y0, actual_width, actual_height, exon_colour);
                }
            }

            if (self.show_orfs)
            {
                // Add ORFs to each isoform
                let orfHeight = self.isoformHeight / 2;
                for (let i = 0; i < self.canonData.isoformList.length; ++i)
                {
                    let isoform = self.canonData.isoformList[i];
                    let orf_ranges = isoform.orf;

                    let y = transformation(i) + orfHeight / 2;

                    for (let [x0, x1] of orf_ranges)
                    {
                        let x = self.baseAxis.isAscending() ? self.baseAxis.scale(x0) : self.baseAxis.scale(x1);
                        let width = Math.abs(self.baseAxis.scale(x1) - self.baseAxis.scale(x0));
                        let actual_x0 = Math.round(x);
                        let actual_x1 = Math.round(width + x);
                        let actual_width = Math.max(actual_x1 - actual_x0, 1);                      // we want to show every ORF, so ensure they're each at least 1 pixel wide
                        actual_x1 = actual_x0 + actual_width;
                        let height = Math.ceil(orfHeight);
                        let actual_y0 = (y - Math.floor(y) <= 0.5) ? Math.floor(y) : Math.round(y); // emulating the SVG pixel coordinate rounding behaviour
                        let actual_y1 = Math.round(height + y);
                        let actual_height = actual_y1 - Math.round(y);

                        // Don't draw the exon if it's outside of the canvas
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

                        svg += rect(actual_x0, actual_y0, actual_width, actual_height, "#535353");
                    }
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
            this.init();
            this.buildStack();
        }
    },

    mounted()
    {
        document.addEventListener("set_canontrack_tooltip_text", (e) => {
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

        this.$root.$on("single_canon_click", () =>
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