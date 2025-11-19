/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render peptide stacks, where each peptide is a row of rectangles.

<template>
<div id="peptideGenomeProtStackDiv" class="req-crosshair" ref="parentDiv" style="position: relative">
    <p>Peptide GenomeProt stack</p>
</div>
</template>

<script>
import * as d3 from 'd3';
import {put_in_svg, rect, line} from "~/assets/svg_utils";

export default {
    props: ["baseAxis", "peptideOrder", "peptideInfo", "isGenomeProt", "currentGene"],
    
    data: () => {
        return {
            // dimensions
            width: 0,
            padding: 16,
            peptideHeight: 30,
            peptideGap: 1,

            is_compact: false,

            is_set_highlight: false,
            highlighted_peptide: "",

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
            let crosshair_canvas = document.getElementById("peptideGenomeProtStackCrosshairCanvas");
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
            this.$root.$emit("set_zoom", [this.start_drag, this.end_drag, true, "PeptideGenomeProtStack"]);
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
                console.log("Error copying peptide GenomeProt stack text!", error);
                this.set_tooltip_copied(false);
            }
        },

        set_tooltip_copied(is_copy_successful)
        {
            let tooltip = d3.select("#peptidegenomeprotstack_tooltip");
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

            let crosshair_canvas = document.getElementById("peptideGenomeProtStackCrosshairCanvas");
            if (!crosshair_canvas)
                return;

            let crosshair_canvas_ctx = crosshair_canvas.getContext("2d");
            crosshair_canvas_ctx.clearRect(0, 0, crosshair_canvas.width, crosshair_canvas.height);
        },

        draw_crosshair(client_x)
        {
            let crosshair_canvas = document.getElementById("peptideGenomeProtStackCrosshairCanvas");
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

            if (!this.isGenomeProt || !this.baseAxis || !this.peptideOrder || (this.peptideOrder.length === 0) || !this.peptideInfo || (Object.keys(this.peptideInfo).length === 0) || Object.keys(this.baseAxis).length == 0)
                return;

            this.width = document.getElementById("stackDiv").getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(this.width);

            let svgHeight = this.groupScale(this.is_compact ? 1 : this.peptideOrder.length, this.peptideHeight, this.peptideGap) - this.peptideGap;
            let blockHeight = this.peptideHeight / 2;

            let self = this;  // avoid conflict with 'this' referring to a different object within some functions.

            // Clear the target element of any content
            d3.select("#peptideGenomeProtStackDiv").selectAll("*").remove();

            let canvas_width = Math.ceil(self.width);
            let canvas_height = Math.ceil(svgHeight);

            d3.select("#peptideGenomeProtStackDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("id", "peptideGenomeProtStackCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");
            let canvas = document.getElementById("peptideGenomeProtStackCanvas");
            let ctx = canvas.getContext("2d");

            let transformation = (i) => self.groupScale(i, self.peptideHeight, self.peptideGap);

            let is_forward_strand = (self.baseAxis.genomeCoords().strand === '+');

            let peptide_order = (this.is_compact) ? [] : self.peptideOrder;
            if (peptide_order.length === 0)
            {
                let score_and_peptide = [];
                for (let peptide of self.peptideOrder)
                {
                    let peptide_info = self.peptideInfo[peptide];
                    let peptide_ids_gene = peptide_info.peptide_ids_gene;
                    let peptide_ids_transcript = (peptide_info.transcripts_identified.length !== 0);
                    let peptide_ids_orf = (peptide_info.orfs_identified.length !== 0);

                    let score = (peptide_ids_orf) ? 3 :
                                    (peptide_ids_transcript ? 2 :
                                        (peptide_ids_gene ? 1 : 0)
                                    );

                    score_and_peptide.push([score, peptide]);
                }

                // In compact mode, order and draw the peptides by increasing score (no unique mapping -> gene UMP -> transcript UMP -> ORF UMP)
                score_and_peptide.sort((a, b) => (a[0] - b[0]));

                for (let [score, peptide] of score_and_peptide)
                    peptide_order.push(peptide);
            }

            // Add the intron line to each peptide
            ctx.beginPath();
            for (let i = 0; i < peptide_order.length; ++i)
            {
                let peptide = peptide_order[i];
                let peptide_info = self.peptideInfo[peptide];
                let peptide_blocks = peptide_info.ranges;

                if (peptide_blocks.length === 1)
                    continue;

                let start = is_forward_strand ? peptide_blocks[0][0] : peptide_blocks[peptide_blocks.length - 1][0];
                let end = is_forward_strand ? peptide_blocks[peptide_blocks.length - 1][1] : peptide_blocks[0][1];
                if (start > end)
                    start = end;
                
                let x0 = self.baseAxis.scale(start);
                let x1 = self.baseAxis.scale(end);
                let y0 = (self.peptideHeight) / 2 + (this.is_compact ? 0 : transformation(i)) + blockHeight / 8;
                let y1 = y0;

                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
            }
            ctx.stroke();

            let block_info = [];

            // Draw the peptide blocks
            for (let i = 0; i < peptide_order.length; ++i)
            {
                let peptide = peptide_order[i];
                let peptide_info = self.peptideInfo[peptide];

                let peptide_blocks = peptide_info.ranges;
                let peptide_ids_gene = peptide_info.peptide_ids_gene;
                let peptide_ids_transcript = (peptide_info.transcripts_identified.length !== 0);
                let peptide_ids_orf = (peptide_info.orfs_identified.length !== 0);
                let transcripts_identified = JSON.parse(JSON.stringify(peptide_info.transcripts_identified));
                let orfs_identified = JSON.parse(JSON.stringify(peptide_info.orfs_identified));

                let y = (this.is_compact ? 0 : transformation(i)) + (self.peptideHeight - blockHeight * 3 / 4) / 2;

                ctx.fillStyle = "rgb(83,83,83)";
                if (peptide_ids_orf)
                    ctx.fillStyle = "rgb(255,149,0)";   // Peptide is uniquely mapped to an ORF: Yellow
                else if (peptide_ids_transcript)
                    ctx.fillStyle = "rgb(0,208,255)";   // Peptide is uniquely mapped to a transcript: Light blue
                else if (peptide_ids_gene)
                    ctx.fillStyle = "rgb(0,0,255)";     // Peptide is uniquely mapped to a gene: Blue

                for (let j = 0; j < peptide_blocks.length; ++j)
                {
                    let [x0, x1] = peptide_blocks[j];
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
                        block_info.push([actual_x0, actual_x0 + actual_width, actual_y0, actual_y0 + actual_height, peptide, x0, x1, j + 1, peptide_blocks.length, peptide_ids_gene, peptide_ids_transcript, peptide_ids_orf, transcripts_identified, orfs_identified, this.currentGene]);
                }
            }

            let tooltip = d3.select("#peptideGenomeProtStackDiv")
                            .append("div")
                            .attr("class", "tooltip")
                            .attr("id", "peptidegenomeprotstack_tooltip")
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

            let tooltip_end_text_orf_transcript_mapping = "<br>(Click on the peptide block to highlight any ORF and transcript it uniquely maps to)<br>";
            let tooltip_end_text_copy = "<br>(Click on the peptide block to copy the text in this tooltip)<br>";
            let tooltip_end_text_ump_gene = "<br>(Click on the peptide block to highlight all transcripts it maps to)<br>";
            let tooltip_end_text = (this.is_set_highlight) ? tooltip_end_text_orf_transcript_mapping : tooltip_end_text_copy;

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

                let shown_peptide_seq = null;
                let shown_block_start = null;
                let shown_block_end = null;
                let shown_block_number = null;
                let shown_total_blocks = null;
                let shown_peptide_id_gene = null;
                let shown_peptide_id_transcript = null;
                let shown_peptide_id_orf = null;
                let shown_transcripts_identified = null;
                let shown_orfs_identified = null;
                let shown_current_gene = null;
                for (let [x0, x1, y0, y1, peptide_seq, block_start, block_end, block_number, total_blocks, peptide_ids_gene, peptide_ids_transcript, peptide_ids_orf, transcripts_identified, orfs_identified, current_gene] of block_info)
                {
                    if ((x0 <= x_diff) && (x_diff <= x1) && (y0 <= y_diff) && (y_diff <= y1))
                    {
                        shown_peptide_seq = peptide_seq;
                        shown_block_start = block_start;
                        shown_block_end = block_end;
                        shown_block_number = block_number;
                        shown_total_blocks = total_blocks;
                        shown_peptide_id_gene = peptide_ids_gene;
                        shown_peptide_id_transcript = peptide_ids_transcript;
                        shown_peptide_id_orf = peptide_ids_orf;
                        shown_transcripts_identified = transcripts_identified;
                        shown_orfs_identified = orfs_identified;
                        shown_current_gene = current_gene;

                        shown_transcripts_identified.sort((a, b) => a.localeCompare(b, "en", {numeric: true, sensitivity: "case"}));
                        shown_orfs_identified.sort((a, b) => a.localeCompare(b, "en", {numeric: true, sensitivity: "case"}));
                        break;
                    }
                }

                if (!shown_peptide_seq)
                {
                    d3.select("#peptideGenomeProtStackCrosshairCanvas").style("cursor", "crosshair");
                    hide_tooltip();
                    let event = new CustomEvent("set_peptidegenomeprotstack_tooltip_text", {detail: ""});
                    document.dispatchEvent(event);
                    return;
                }

                let stack_div = document.getElementById("stackDiv");
                let peptide_stack_div = document.getElementById("peptideGenomeProtStackDiv");
                let stack_boundary = stack_div.getBoundingClientRect();
                let peptide_stack_boundary = peptide_stack_div.getBoundingClientRect();
                let leftVal = (calculateLeftVal(clientX) - stack_boundary.left + padding + 7);
                let topVal = (clientY - peptide_stack_boundary.top + padding + 5);

                let peptide_mapping_info_text = "";

                if (shown_peptide_id_orf)
                {
                    if (shown_orfs_identified.length > 1)           // This shouldn't happen...
                        peptide_mapping_info_text += `Uniquely mapped to ORFs ${shown_orfs_identified.join(", ")}\r\n`;
                    else
                        peptide_mapping_info_text += `Uniquely mapped to ORF ${shown_orfs_identified[0]}\r\n`;
                }

                if (shown_peptide_id_transcript)
                {
                    if (shown_transcripts_identified.length > 1)    // This shouldn't happen...
                        peptide_mapping_info_text += `Uniquely mapped to transcripts ${shown_transcripts_identified.join(", ")}\r\n`;
                    else
                        peptide_mapping_info_text += `Uniquely mapped to transcript ${shown_transcripts_identified[0]}\r\n`;
                }

                if (shown_peptide_id_gene)
                    peptide_mapping_info_text += `Uniquely mapped to gene ${shown_current_gene}\r\n`;

                let tooltip_text = `Peptide: ${shown_peptide_seq}\r\n${peptide_mapping_info_text}Peptide block #${shown_block_number} / ${shown_total_blocks}\r\nGenomic range: ${shown_block_start} - ${shown_block_end}`;
                let event = new CustomEvent("set_peptidegenomeprotstack_tooltip_text", {detail: tooltip_text});
                document.dispatchEvent(event);

                let end_text = tooltip_end_text;
                if (end_text !== tooltip_end_text_copy)
                {
                    if (self.highlighted_peptide === shown_peptide_seq)
                        end_text = "<br>(Click on this peptide again to remove the highlights)<br>";
                    else if (!shown_peptide_id_orf && !shown_peptide_id_transcript && tooltip_end_text_ump_gene)
                        end_text = tooltip_end_text_ump_gene;
                    else if (!shown_peptide_id_orf && !shown_peptide_id_transcript && !tooltip_end_text_ump_gene)
                        end_text = "";
                }

                let tooltip_html = tooltip_text.replaceAll("\r\n", "<br>") + end_text;
                tooltip.html(tooltip_html)
                    .style("visibility", "visible")
                    .style("left", leftVal + "px").style("top", topVal + "px");

                d3.select("#peptideGenomeProtStackCrosshairCanvas").style("cursor", "pointer");
            }

            d3.select("#peptideGenomeProtStackDiv").append("canvas")
                .attr("width", canvas_width)
                .attr("height", canvas_height)
                .attr("id", "peptideGenomeProtStackCrosshairCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");

            d3.select("#peptideGenomeProtStackCrosshairCanvas")
                .on("mouseover", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX); display_tooltip(evt);})
                .on("mousemove", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX); display_tooltip(evt);})
                .on("mouseleave", function() {self.$root.$emit("remove_crosshair"); hide_tooltip();})
                .on("contextmenu", function (evt) {evt.preventDefault();})
                .on("mousedown", function (evt) {if ((evt.buttons & 0b10) !== 0) {self.$root.$emit("reset_zoom"); return;} self.$root.$emit("set_start_drag", self.mouse_to_genome(evt.clientX));})
                .on("mouseup", function (evt) {self.set_end_drag(self.mouse_to_genome(evt.clientX)); self.$root.$emit("remove_crosshair");});
        },

        buildStackSvg(symbol = false)
        {
            if (!this.isGenomeProt || !this.baseAxis || !this.peptideOrder || (this.peptideOrder.length === 0) || !this.peptideInfo || (Object.keys(this.peptideInfo).length === 0) || Object.keys(this.baseAxis).length == 0)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            this.width = document.getElementById("stackDiv").getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(this.width);

            let svgHeight = this.groupScale(this.is_compact ? 1 : this.peptideOrder.length, this.peptideHeight, this.peptideGap) - this.peptideGap;
            let blockHeight = this.peptideHeight / 2;

            let canvas_width = Math.ceil(this.width);
            let canvas_height = Math.ceil(svgHeight);

            let transformation = (i) => this.groupScale(i, this.peptideHeight, this.peptideGap);

            let svg = "";

            let is_forward_strand = (this.baseAxis.genomeCoords().strand === '+');

            let peptide_order = (this.is_compact) ? [] : this.peptideOrder;
            if (peptide_order.length === 0)
            {
                let score_and_peptide = [];
                for (let peptide of this.peptideOrder)
                {
                    let peptide_info = this.peptideInfo[peptide];
                    let peptide_ids_gene = peptide_info.peptide_ids_gene;
                    let peptide_ids_transcript = (peptide_info.transcripts_identified.length !== 0);
                    let peptide_ids_orf = (peptide_info.orfs_identified.length !== 0);

                    let score = (peptide_ids_orf) ? 3 :
                                    (peptide_ids_transcript ? 2 :
                                        (peptide_ids_gene ? 1 : 0)
                                    );

                    score_and_peptide.push([score, peptide]);
                }

                // In compact mode, order and draw the peptides by increasing score (no unique mapping -> gene UMP -> transcript UMP -> ORF UMP)
                score_and_peptide.sort((a, b) => (a[0] - b[0]));

                for (let [score, peptide] of score_and_peptide)
                    peptide_order.push(peptide);
            }

            // Add the intron line to each peptide
            for (let i = 0; i < peptide_order.length; ++i)
            {
                let peptide = peptide_order[i];
                let peptide_info = this.peptideInfo[peptide];
                let peptide_blocks = peptide_info.ranges;

                if (peptide_blocks.length === 1)
                    continue;

                let start = is_forward_strand ? peptide_blocks[0][0] : peptide_blocks[peptide_blocks.length - 1][0];
                let end = is_forward_strand ? peptide_blocks[peptide_blocks.length - 1][1] : peptide_blocks[0][1];
                if (start > end)
                    start = end;
                
                let x0 = this.baseAxis.scale(start);
                let x1 = this.baseAxis.scale(end);
                let y0 = (this.peptideHeight) / 2 + (this.is_compact ? 0 : transformation(i)) + blockHeight / 8;
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

            // Draw the peptide blocks
            for (let i = 0; i < peptide_order.length; ++i)
            {
                let peptide = peptide_order[i];
                let peptide_info = this.peptideInfo[peptide];

                let peptide_blocks = peptide_info.ranges;
                let peptide_ids_gene = peptide_info.peptide_ids_gene;
                let peptide_ids_transcript = (peptide_info.transcripts_identified.length !== 0);
                let peptide_ids_orf = (peptide_info.orfs_identified.length !== 0);

                let y = (this.is_compact ? 0 : transformation(i)) + (this.peptideHeight - blockHeight * 3 / 4) / 2;

                let peptide_colour = "#535353";
                if (peptide_ids_orf)
                    peptide_colour = "#ff9500"; // Peptide is uniquely mapped to an ORF: Yellow
                else if (peptide_ids_transcript)
                    peptide_colour = "#00d0ff"; // Peptide is uniquely mapped to a transcript: Light blue
                else if (peptide_ids_gene)
                    peptide_colour = "#0000ff"; // Peptide is uniquely mapped to a gene: Blue

                for (let j = 0; j < peptide_blocks.length; ++j)
                {
                    let [x0, x1] = peptide_blocks[j];
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

                    svg += rect(actual_x0, actual_y0, actual_width, actual_height, peptide_colour);
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
        peptideOrder: function()
        {
            this.buildStack();
        }
    },

    mounted()
    {
        document.addEventListener("set_peptidegenomeprotstack_tooltip_text", (e) => {
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

        this.$root.$on("single_peptidegenomeprotstack_click", () =>
        {
            if (this.is_set_highlight)
            {
                let tooltip_text = this.tooltip_text;
                if (!tooltip_text)
                    return;

                let peptide_start_index = tooltip_text.indexOf("Peptide: ");
                if (peptide_start_index === -1)
                    return;

                peptide_start_index += "Peptide: ".length;
                let peptide_end_index = tooltip_text.indexOf("\r\n", peptide_start_index);
                if (peptide_end_index === -1)
                    return;

                let peptide = tooltip_text.substring(peptide_start_index, peptide_end_index);
                if (peptide === this.highlighted_peptide)
                {
                    d3.select("#peptidegenomeprotstack_tooltip").html("Highlights removed!");
                    this.$root.$emit("set_orf_transcript_highlight", [[], [], []]);
                    this.highlighted_peptide = "";
                    return;
                }

                let ump_orf = "";
                let ump_orf_start_index = tooltip_text.indexOf("Uniquely mapped to ORF ");
                if (ump_orf_start_index !== -1)
                {
                    ump_orf_start_index += "Uniquely mapped to ORF ".length;
                    let ump_orf_end_index = tooltip_text.indexOf("\r\n", ump_orf_start_index);
                    if (ump_orf_end_index !== -1)
                        ump_orf = tooltip_text.substring(ump_orf_start_index, ump_orf_end_index);
                }
                
                let ump_transcript = "";
                let ump_transcript_start_index = tooltip_text.indexOf("Uniquely mapped to transcript ");
                if (ump_transcript_start_index !== -1)
                {
                    ump_transcript_start_index += "Uniquely mapped to transcript ".length;
                    let ump_transcript_end_index = tooltip_text.indexOf("\r\n", ump_transcript_start_index);
                    if (ump_transcript_end_index !== -1)
                        ump_transcript = tooltip_text.substring(ump_transcript_start_index, ump_transcript_end_index);
                }

                let is_ump_gene = (tooltip_text.indexOf("Uniquely mapped to gene ") !== -1);

                let new_tooltip_text = "This peptide does not uniquely map to any ORF or transcript.<br>";
                if (ump_orf !== "" && ump_transcript === "")
                    new_tooltip_text = `ORF ${ump_orf} highlighted!<br>`;
                else if (ump_orf === "" && ump_transcript !== "")
                    new_tooltip_text = `Transcript ${ump_transcript} highlighted!<br>`;
                else if (ump_orf !== "" && ump_transcript !== "")
                    new_tooltip_text = `ORF ${ump_orf} and transcript ${ump_transcript} highlighted!<br>`;
                else if (is_ump_gene)
                    new_tooltip_text = "All mapped transcripts highlighted!<br>";

                let transcripts_mapped = [];
                if (ump_orf === "" && ump_transcript === "" && is_ump_gene)
                    if (this.peptideInfo[peptide] && this.peptideInfo[peptide].transcript_info)
                        transcripts_mapped = Object.keys(this.peptideInfo[peptide].transcript_info);

                d3.select("#peptidegenomeprotstack_tooltip").html(new_tooltip_text);

                // Emit an event for the isoform stack to receive so that it knows which ORF and/or transcript to highlight
                if ((ump_orf !== "") || (ump_transcript !== "") || (transcripts_mapped.length !== 0))
                {
                    this.$root.$emit("set_orf_transcript_highlight", [[ump_orf], [ump_transcript], transcripts_mapped]);
                    this.highlighted_peptide = peptide;
                }
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