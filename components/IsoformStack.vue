/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render isoform stacks, where each isoform is a row of rectangles separated by introns.
Requires an instance of BaseAxis as input, as well as isoformList object
which must have 'transcriptID', 'exonRanges' and 'orf' properties.

<template>
<div id="stackDiv" class="req-crosshair" ref="parentDiv" style="position: relative">
    <p>Isoform stack</p>
</div>
</template>

<script>
import * as d3 from 'd3';
import {put_in_svg, rect, line} from "~/assets/svg_utils";

export default {
    props: ["baseAxis", "isoformList", "orfInfo"],
    
    data: () => {
        return {
            // dimensions
            width: 0,
            padding: 16,
            isoformHeight: 50,
            isoformGap: 1,

            show_orfs: false,
            show_user_orfs: false,
            start_drag: -1,
            end_drag: -1,

            ump_orfs_to_highlight: [],
            ump_transcripts_to_highlight: [],
            transcripts_to_highlight: [],

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
            let crosshair_canvas = document.getElementById("stackCrosshairCanvas");
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
            this.$root.$emit("set_zoom", [this.start_drag, this.end_drag, true, "Stack"]);
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
                console.log("Error copying isoform stack exon text!", error);
                this.set_tooltip_copied(false);
            }
        },

        set_tooltip_copied(is_copy_successful)
        {
            let tooltip = d3.select("#isoformstack_tooltip");
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

            let crosshair_canvas = document.getElementById("stackCrosshairCanvas");
            if (!crosshair_canvas)
                return;

            let crosshair_canvas_ctx = crosshair_canvas.getContext("2d");
            crosshair_canvas_ctx.clearRect(0, 0, crosshair_canvas.width, crosshair_canvas.height);
        },

        draw_crosshair(client_x)
        {
            let crosshair_canvas = document.getElementById("stackCrosshairCanvas");
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

            if (!this.baseAxis || !this.isoformList || Object.keys(this.baseAxis).length == 0)
                return;

            this.width = document.getElementById("stackDiv").getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(this.width);

            let svgHeight = this.groupScale(this.isoformList.length, this.isoformHeight, this.isoformGap) - this.isoformGap;
            let exonHeight = (this.show_orfs || this.show_user_orfs) ? this.isoformHeight / 3 : this.isoformHeight / 2;

            let self = this;  // avoid conflict with 'this' referring to a different object within some functions.

            // Clear the target element of any content
            d3.select("#stackDiv").selectAll("*").remove();

            let canvas_width = Math.ceil(self.width);
            let canvas_height = Math.ceil(svgHeight);

            d3.select("#stackDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("id", "stackCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");
            let canvas = document.getElementById("stackCanvas");
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
                    for (let i = 0; i < self.isoformList.length; ++i)
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
            let sort_sign = (is_reverse_needed) ? -1 : 1;

            ordered_screen_ranges.sort(function (a, b) {return sort_sign * (a[0] - b[0]);});

            // Add the intron line to each isoform
            ctx.beginPath();
            for (let i = 0; i < self.isoformList.length; ++i)
            {
                let isoform = self.isoformList[i];
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
            for (let i = 0; i < self.isoformList.length; ++i)
            {
                let isoform = self.isoformList[i];
                let exon_ranges = isoform.exonRanges;
                let y = transformation(i) + (self.isoformHeight - exonHeight) / 2;

                let transcript_id = isoform.transcriptID;
                if (this.ump_transcripts_to_highlight.indexOf(transcript_id) !== -1)
                    ctx.fillStyle = "rgb(0,208,255)";   // uniquely mapped transcript: cyan
                else if (this.transcripts_to_highlight.indexOf(transcript_id) !== -1)
                    ctx.fillStyle = "rgb(0,0,255)";     // gene-level UMP: blue
                else
                    ctx.fillStyle = (self.show_orfs || self.show_user_orfs) ? "rgb(112,112,112)" : "rgb(83,83,83)";

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

                    for (let k = 0; k < exon_ranges.length; ++k)
                    {
                        if ((exon_ranges[k][0] !== x0) || (exon_ranges[k][1] !== x1))
                            continue;

                        for (let l = 0; l < ordered_screen_ranges.length; ++l)
                        {
                            let [screen_x0, screen_x1] = ordered_screen_ranges[l];
                            if ((screen_x0 <= actual_x0) && (actual_x0 <= screen_x1) && (screen_x0 <= actual_x0 + actual_width) && (actual_x0 + actual_width <= screen_x1))
                            {
                                exon_info.push([actual_x0, actual_x0 + actual_width, actual_y0, actual_y0 + actual_height, transcript_id, x0, x1, k + 1, exon_ranges.length, l + 1, ordered_screen_ranges.length]);
                                break;
                            }
                        }

                        break;
                    }
                }
            }

            if (self.show_orfs || self.show_user_orfs)
            {
                let orf_exon_info = [];

                // Add ORFs to each isoform
                let orfHeight = self.isoformHeight / 2;
                for (let i = 0; i < self.isoformList.length; ++i)
                {
                    let isoform = self.isoformList[i];
                    let exon_ranges = isoform.exonRanges;
                    let orf_ranges = self.show_orfs ? isoform.orf : isoform.user_orf;
                    let y = transformation(i) + orfHeight / 2;

                    let transcript_id = isoform.transcriptID;
                    if (this.ump_transcripts_to_highlight.indexOf(transcript_id) !== -1)
                        ctx.fillStyle = "rgb(0,208,255)";   // uniquely mapped transcript: cyan
                    else if (this.transcripts_to_highlight.indexOf(transcript_id) !== -1)
                        ctx.fillStyle = "rgb(0,0,255)";     // gene-level UMP: blue
                    else
                        ctx.fillStyle = "rgb(83,83,83)";

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

                        for (let [exon_start, exon_end] of exon_ranges)
                        {
                            if (exon_start > exon_end)
                            {
                                let temp = exon_end;
                                exon_end = exon_start;
                                exon_start = temp;
                            }

                            if ((exon_start <= orf_start) && (orf_start <= exon_end) && (exon_start <= orf_end) && (orf_end <= exon_end))
                            {
                                for (let k = 0; k < exon_ranges.length; ++k)
                                {
                                    if ((exon_ranges[k][0] !== exon_start) || (exon_ranges[k][1] !== exon_end))
                                        continue;

                                    for (let l = 0; l < ordered_screen_ranges.length; ++l)
                                    {
                                        let [screen_x0, screen_x1] = ordered_screen_ranges[l];
                                        if ((screen_x0 <= actual_x0) && (actual_x0 <= screen_x1) && (screen_x0 <= actual_x0 + actual_width) && (actual_x0 + actual_width <= screen_x1))
                                        {
                                            orf_exon_info.push([actual_x0, actual_x0 + actual_width, actual_y0, actual_y0 + actual_height, transcript_id, exon_start, exon_end, k + 1, exon_ranges.length, l + 1, ordered_screen_ranges.length]);
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

            // Colour any highlighted ORFs
            if (self.show_user_orfs && this.orfInfo && (Object.keys(this.orfInfo).length !== 0))
            {
                ctx.fillStyle = "rgb(255,149,0)";
                let orf_ids = Object.keys(this.orfInfo);
                for (let orf_id of orf_ids)
                {
                    if (this.ump_orfs_to_highlight.indexOf(orf_id) === -1)
                        continue;

                    let orfHeight = self.isoformHeight / 2;
                    for (let i = 0; i < self.isoformList.length; ++i)
                    {
                        let isoform = self.isoformList[i];
                        let accessions = isoform.accessions;
                        if (accessions.indexOf(orf_id) === -1)
                            continue;

                        let orf_ranges = this.orfInfo[orf_id];
                        let y = transformation(i) + orfHeight / 2;

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
                        }
                    }
                }
            }

            let tooltip = d3.select("#stackDiv")
                            .append("div")
                            .attr("class", "tooltip")
                            .attr("id", "isoformstack_tooltip")
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
                    d3.select("#stackCrosshairCanvas").style("cursor", "crosshair");
                    hide_tooltip();
                    let event = new CustomEvent("set_isoformstack_tooltip_text", {detail: ""});
                    document.dispatchEvent(event);
                    return;
                }

                let div = document.getElementById("stackDiv");
                let boundary = div.getBoundingClientRect();
                let leftVal = (calculateLeftVal(clientX) - boundary.left + padding + 7);
                let topVal = (clientY - boundary.top + padding + 5);

                let encoded_orfs_text = "";
                for (let i = 0; i < self.isoformList.length; ++i)
                {
                    let isoform = self.isoformList[i];
                    if (isoform.transcriptID === shown_transcript_id)
                    {
                        if (isoform.accessions && isoform.accessions.length !== 0)
                        {
                            if (isoform.accessions.length > 1)
                                encoded_orfs_text = "ORFs encoded: " + isoform.accessions.join(", ") + "\r\n";
                            else
                                encoded_orfs_text = "ORF encoded: " + isoform.accessions[0] + "\r\n";
                        }
                        break;
                    }
                }

                let tooltip_text = `${encoded_orfs_text}Transcript: ${shown_transcript_id}\r\nExon #${shown_exon_number} / ${shown_total_exons}\r\nExonic region #${shown_exonic_region_number} / ${shown_total_exonic_regions}\r\nExon range: ${shown_exon_start} - ${shown_exon_end}`;
                let event = new CustomEvent("set_isoformstack_tooltip_text", {detail: tooltip_text});
                document.dispatchEvent(event);

                let tooltip_html = tooltip_text.replaceAll("\r\n", "<br>") + "<br>(Click on the exon to copy the text in this tooltip)<br>";
                tooltip.html(tooltip_html)
                    .style("visibility", "visible")
                    .style("left", leftVal + "px").style("top", topVal + "px");

                d3.select("#stackCrosshairCanvas").style("cursor", "pointer");
            }

            d3.select("#stackDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("id", "stackCrosshairCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");

            d3.select("#stackCrosshairCanvas")
                .on("mouseover", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX); display_tooltip(evt);})
                .on("mousemove", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX); display_tooltip(evt);})
                .on("mouseleave", function() {self.$root.$emit("remove_crosshair"); hide_tooltip();})
                .on("contextmenu", function (evt) {evt.preventDefault();})
                .on("mousedown", function (evt) {if ((evt.buttons & 0b10) !== 0) {self.$root.$emit("reset_zoom"); return;} self.$root.$emit("set_start_drag", self.mouse_to_genome(evt.clientX));})
                .on("mouseup", function (evt) {self.set_end_drag(self.mouse_to_genome(evt.clientX)); self.$root.$emit("remove_crosshair");});
        },

        buildStackSvg(symbol = false)
        {
            if (!this.baseAxis || !this.isoformList || Object.keys(this.baseAxis).length == 0)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            this.width = document.getElementById("stackDiv").getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(this.width);

            let svgHeight = this.groupScale(this.isoformList.length, this.isoformHeight, this.isoformGap) - this.isoformGap;
            let exonHeight = (this.show_orfs || this.show_user_orfs) ? this.isoformHeight / 3 : this.isoformHeight / 2;

            let canvas_width = Math.ceil(this.width);
            let canvas_height = Math.ceil(svgHeight);

            let transformation = (i) => this.groupScale(i, this.isoformHeight, this.isoformGap);
            let screen_ranges = this.baseAxis.screenRanges();

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
                    actual_width -= (actual_x1 - canvas_width);

                for (let i = 0; i < this.isoformList.length; ++i)
                {
                    let y0 = transformation(i);
                    svg += rect(actual_x0, y0, actual_width, this.isoformHeight, "#d5ebe8");
                }
            }

            // Add the intron line to each isoform
            for (let i = 0; i < this.isoformList.length; ++i)
            {
                let isoform = this.isoformList[i];
                let x0 = this.baseAxis.scale(isoform.start);
                let x1 = this.baseAxis.scale(isoform.end);
                let y0 = (this.isoformHeight) / 2 + transformation(i);
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
            for (let i = 0; i < this.isoformList.length; ++i)
            {
                let isoform = this.isoformList[i];
                let exon_ranges = isoform.exonRanges;
                let y = transformation(i) + (this.isoformHeight - exonHeight) / 2;

                let transcript_id = isoform.transcriptID;
                let exon_colour = (this.show_orfs || this.show_user_orfs) ? "#707070" : "#535353";
                if (this.ump_transcripts_to_highlight.indexOf(transcript_id) !== -1)
                    exon_colour = "#00d0ff";    // uniquely mapped transcript: cyan
                else if (this.transcripts_to_highlight.indexOf(transcript_id) !== -1)
                    exon_colour = "#0000ff";    // gene-level UMP: blue

                for (let [x0, x1] of exon_ranges)
                {
                    let x = this.baseAxis.isAscending() ? this.baseAxis.scale(x0) : this.baseAxis.scale(x1);
                    let width = Math.abs(this.baseAxis.scale(x1) - this.baseAxis.scale(x0));
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
                        actual_width -= (actual_x1 - canvas_width);

                    svg += rect(actual_x0, actual_y0, actual_width, actual_height, exon_colour);
                }
            }

            if (this.show_orfs || this.show_user_orfs)
            {
                // Add ORFs to each isoform
                let orfHeight = this.isoformHeight / 2;
                for (let i = 0; i < this.isoformList.length; ++i)
                {
                    let isoform = this.isoformList[i];
                    let orf_ranges = this.show_orfs ? isoform.orf : isoform.user_orf;
                    let y = transformation(i) + orfHeight / 2;

                    let transcript_id = isoform.transcriptID;
                    let exon_colour = "#535353";
                    if (this.ump_transcripts_to_highlight.indexOf(transcript_id) !== -1)
                        exon_colour = "#00d0ff";    // uniquely mapped transcript: cyan
                    else if (this.transcripts_to_highlight.indexOf(transcript_id) !== -1)
                        exon_colour = "#0000ff";    // gene-level UMP: blue

                    for (let [x0, x1] of orf_ranges)
                    {
                        let x = this.baseAxis.isAscending() ? this.baseAxis.scale(x0) : this.baseAxis.scale(x1);
                        let width = Math.abs(this.baseAxis.scale(x1) - this.baseAxis.scale(x0));
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
                            actual_width -= (actual_x1 - canvas_width);

                        svg += rect(actual_x0, actual_y0, actual_width, actual_height, exon_colour);
                    }
                }
            }

            // Colour any highlighted ORFs
            if (this.show_user_orfs && this.orfInfo && (Object.keys(this.orfInfo).length !== 0))
            {
                let exon_colour = "#ff9500"; 
                let orf_ids = Object.keys(this.orfInfo);
                for (let orf_id of orf_ids)
                {
                    if (this.ump_orfs_to_highlight.indexOf(orf_id) === -1)
                        continue;

                    let orfHeight = this.isoformHeight / 2;
                    for (let i = 0; i < this.isoformList.length; ++i)
                    {
                        let isoform = this.isoformList[i];
                        let accessions = isoform.accessions;
                        if (accessions.indexOf(orf_id) === -1)
                            continue;

                        let orf_ranges = this.orfInfo[orf_id];
                        let y = transformation(i) + orfHeight / 2;

                        for (let [x0, x1] of orf_ranges)
                        {
                            let x = this.baseAxis.isAscending() ? this.baseAxis.scale(x0) : this.baseAxis.scale(x1);
                            let width = Math.abs(this.baseAxis.scale(x1) - this.baseAxis.scale(x0));
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
                                actual_width -= (actual_x1 - canvas_width);

                            svg += rect(actual_x0, actual_y0, actual_width, actual_height, exon_colour);
                        }
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
            this.buildStack();
        }
    },

    mounted()
    {
        document.addEventListener("set_isoformstack_tooltip_text", (e) => {
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

        this.$root.$on("single_stack_click", () =>
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