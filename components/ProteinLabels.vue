/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

<template>
<div id="proteinLabelsParent" class="grid-item" style="margin-top: 0px; margin-bottom: 0px; padding-top: 0px; padding-bottom: 0px; padding-left: 1rem !important; padding-right: 1rem !important;" ref="parentDiv">
    <div id="proteinLabelsDiv">
        <p>Loading protein labels...</p>
    </div>
</div>
</template>

<script>
import * as d3 from 'd3';
import {diagonal_text, put_in_svg, text_hanging_baseline} from "~/assets/svg_utils";

export default {
    props: ["proteinData", "baseAxis"],

    methods: {
        extract_two_words(description)
        {
            let first_two_separators = [];

            let first_space_index = description.indexOf(' ');
            let first_hyphen_index = description.indexOf('-');
            let next_index = -1;

            let no_spaces = (first_space_index === -1);
            let no_hyphens = (first_hyphen_index === -1);

            // The description has no spaces or hyphens
            if (no_spaces && no_hyphens)
                return description;

            // Extract information for the first separator
            if (no_spaces)
            {
                next_index = first_hyphen_index + 1;
                first_two_separators.push('-');
            }
            else if (no_hyphens)
            {
                next_index = first_space_index + 1;
                first_two_separators.push(' ');
            }
            else
            {
                next_index = Math.min(first_space_index, first_hyphen_index) + 1;
                first_two_separators.push(description.charAt(next_index - 1));
            }

            let second_space_index = description.indexOf(' ', next_index);
            let second_hyphen_index = description.indexOf('-', next_index);

            no_spaces = (second_space_index === -1);
            no_hyphens = (second_hyphen_index === -1);

            // The description only has one space or hyphen
            if (no_spaces && no_hyphens)
                return description;

            // Extract information for the second separator
            if (no_spaces)
                first_two_separators.push(['-', second_hyphen_index]);
            else if (no_hyphens)
                first_two_separators.push([' ', second_space_index]);
            else
                first_two_separators.push([description.charAt(Math.min(second_space_index, second_hyphen_index)), Math.min(second_space_index, second_hyphen_index)]);

            let [first_separator, [second_separator, second_separator_index]] = first_two_separators;

            // If both separators are spaces, take everything before the second separator
            if ((first_separator === ' ') && (second_separator === ' '))
                return description.substring(0, second_separator_index);

            // If the second separator is a hyphen, take everything before the first space after that hyphen if there is one, or take everything after the second separator if there isn't
            if (second_separator === '-')
            {
                let space_after_second_separator_index = description.indexOf(' ', second_separator_index + 1);
                if (space_after_second_separator_index === -1)
                    return description;
                return description.substring(0, space_after_second_separator_index);
            }

            // If the first separator is a hyphen, take everything before the second separator (i.e. the first space after that hyphen)
            return description.substring(0, second_separator_index);
        },

        init()
        {
            document.getElementById("proteinLabelsDiv").innerHTML = "<p>Loading protein labels...</p>";
        },

        buildProteinLabels() {
            if (!this.baseAxis) return;

            let padding = 16;
            let height = 85;
            let width = 300;
            let max_diagonal_width = Math.floor(height / Math.cos(Math.PI / 4) - 6);

            // make a copy of data and update axis
            let data = this.proteinData;
            if (!data || !('originalData' in data) || !('reversedData' in data)) return;

            // compute width of component
            let stack = document.getElementById('stackDiv');
            if (stack)
                width = Math.ceil(stack.getBoundingClientRect().width - 2 * padding);
            else return;

            let scale = (stack.getBoundingClientRect().width - 32) / this.proteinData.originalData.length;

            let original = this.proteinData.originalData;
            let reversed = this.proteinData.reversedData;
            this.proteinData.labels_json = this.proteinData.reversed ?
                JSON.parse(JSON.stringify(reversed)) : JSON.parse(JSON.stringify(original));
            let labels_json_data = this.proteinData.labels_json;
            labels_json_data.length *= scale;
            for (var region of labels_json_data.regions) {
                if (region.start) region.start *= scale;
                if (region.end) region.end *= scale;
                if (region.aliStart) region.aliStart *= scale;
                if (region.aliEnd) region.aliEnd *= scale;
                if (region.modelStart) region.modelStart *= scale;
                if (region.modelEnd) region.modelEnd *= scale;
                if (region.modelLength) region.modelLength *= scale;
            }
            for (var motif of labels_json_data.motifs) {
                if (motif.start) motif.start *= scale;
                if (motif.end) motif.end *= scale;
            }

            this.baseAxis.setProteinDomain([0, data.labels_json.length]);
            const axis = this.baseAxis;

            // clear target element of any content
            d3.select("#proteinLabelsDiv").selectAll("*").remove();

            // FIXME: The protein diagram pop-ups go under the labels unless this style is set
            d3.select("#proteinLabelsDiv")
                .style("z-index", -100);

            d3.select("#proteinLabelsDiv").append("canvas")
                .attr("width", width)
                .attr("height", 1)
                .attr("style", "margin-bottom: -5.5px") // FIXME: When the canvas is added into the page, the element becomes 5.5 pixels taller than it should be
                .attr("id", "proteinLabelsCanvas");

            let canvas = document.getElementById("proteinLabelsCanvas");
            let ctx = canvas.getContext("2d");
            ctx.fillStyle = "#000000";

            let label_draw_information = [];
            let is_need_diagonal = false;
            let max_horizontal_height = -1;
            let max_diagonal_height = -1;

            let domain_regions = [];
            for (let domain_index = 0; domain_index < data.labels_json.regions.length; ++domain_index)
            {
                let domain = data.labels_json.regions[domain_index];
                let domain_label = domain.metadata.description;
                if (!domain_label)
                    continue;

                domain_label = this.extract_two_words(domain_label.trim());

                let domain_start_x = axis.proteinScale(domain.start);
                let domain_end_x = axis.proteinScale(domain.end);
                if (domain_start_x > domain_end_x)
                {
                    let temp = domain_start_x;
                    domain_start_x = domain_end_x;
                    domain_end_x = temp;
                }

                domain_regions.push([domain_start_x, domain_end_x, domain_label]);
            }

            domain_regions.sort(function (a, b) {return a[0] - b[0];});
            for (let domain_region_index = 0; domain_region_index < domain_regions.length; ++domain_region_index)
            {
                let [domain_start_x, domain_end_x, domain_label] = domain_regions[domain_region_index];
                let label_center_x = Math.round((domain_start_x + domain_end_x) / 2);

                let leftmost_x = 0;
                if (domain_region_index > 0)
                {
                    let left_dist_between_edges = Math.abs(domain_start_x - domain_regions[domain_region_index - 1][1]);
                    leftmost_x = domain_start_x - left_dist_between_edges / 2;
                }

                let rightmost_x = width - 0.00001;
                if (domain_region_index < domain_regions.length - 1)
                {
                    let right_dist_between_edges = Math.abs(domain_regions[domain_region_index + 1][0] - domain_end_x);
                    rightmost_x = domain_end_x + right_dist_between_edges / 2;
                }

                let left_dist_from_center = Math.abs(label_center_x - leftmost_x);
                let right_dist_from_center = Math.abs(rightmost_x - label_center_x);
                let dist_from_center = Math.min(left_dist_from_center, right_dist_from_center);
                let domain_pixel_width = Math.floor(dist_from_center * 2) - 6;

                let font_size = 16.0;
                let can_draw_horizontally = false;
                let label_width = 0;
                while (font_size >= 10.0)
                {
                    ctx.font = `${font_size}px sans-serif`;
                    label_width = ctx.measureText(domain_label).width;

                    // If the label can be drawn within the width of the domain, it can be drawn horizontally
                    if (label_width <= domain_pixel_width)
                    {
                        can_draw_horizontally = true;
                        break;
                    }

                    font_size -= 0.1;
                }

                if (can_draw_horizontally)
                {
                    let label_metrics = ctx.measureText(domain_label);
                    let label_height = label_metrics.actualBoundingBoxAscent + label_metrics.actualBoundingBoxDescent;
                    if (label_height > max_horizontal_height)
                        max_horizontal_height = label_height;

                    let label_x = Math.round(label_center_x - (label_width / 2));
                    label_draw_information.push([false, domain_label, label_x, font_size]);
                    continue;
                }

                // The label must be drawn diagonally
                font_size = 16.0;
                let can_draw_diagonally = false;
                let diagonal_width = max_diagonal_width;

                let length_to_right_side = width - label_center_x;
                if (length_to_right_side < height)
                    diagonal_width = Math.floor(length_to_right_side / Math.cos(Math.PI / 4) - 6);

                while (font_size >= 10.0)
                {
                    ctx.font = `${font_size}px sans-serif`;
                    label_width = ctx.measureText(domain_label).width;

                    // If the label can be drawn within the 45 degree diagonal of the space given for drawing labels, the whole label can be rendered
                    if (label_width <= diagonal_width)
                    {
                        can_draw_diagonally = true;
                        break;
                    }

                    font_size -= 0.1;
                }

                if (can_draw_diagonally)
                {
                    let label_height = Math.round(label_width * Math.cos(Math.PI / 4));
                    if (label_height > max_diagonal_height)
                        max_diagonal_height = label_height;

                    label_draw_information.push([true, domain_label, label_center_x, font_size]);
                    is_need_diagonal = true;
                    continue;
                }

                // The whole label cannot be rendered even at the lowest font size, so some characters need to be cropped
                let last_character_index = domain_label.length - 1;
                while (last_character_index >= 0)
                {
                    let shortened_domain_label = domain_label.substring(0, last_character_index + 1) + "...";
                    let shortened_label_width = ctx.measureText(shortened_domain_label).width;
                    if (shortened_label_width <= diagonal_width)
                    {
                        let label_height = Math.round(shortened_label_width * Math.cos(Math.PI / 4));
                        if (label_height > max_diagonal_height)
                            max_diagonal_height = label_height;

                        label_draw_information.push([true, shortened_domain_label, label_center_x, font_size]);
                        is_need_diagonal = true;
                        break;
                    }

                    last_character_index -= 1;
                }
            }

            // If there are no labels to be drawn, hide the canvas
            if ((max_diagonal_height === -1) && (max_horizontal_height === -1))
            {
                canvas.height = 0;
                return;
            }

            if (is_need_diagonal)
                canvas.height = Math.ceil(max_diagonal_height) + 6;
            else
                canvas.height = Math.ceil(max_horizontal_height) + 3;

            height = canvas.height;

            for (let [is_draw_diagonally, label_text, label_x, font_size] of label_draw_information)
            {
                ctx.font = `${font_size}px sans-serif`;

                if (is_draw_diagonally)
                {
                    ctx.save();
                    ctx.translate(label_x, height);
                    ctx.rotate(-Math.PI / 4);
                    ctx.fillText(label_text, 0, 0);
                    ctx.restore();
                }
                else
                {
                    let prev_text_baseline = ctx.textBaseline;
                    ctx.textBaseline = "bottom";
                    ctx.fillText(label_text, label_x, height);
                    ctx.textBaseline = prev_text_baseline;
                }
            }
        },

        buildProteinLabelsSvg(symbol = false) {
            if (!this.baseAxis)
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            let padding = 16;
            let height = 85;
            let svg_width = 300;
            let max_diagonal_width = Math.floor(height / Math.cos(Math.PI / 4) - 6);

            // make a copy of data and update axis
            let data = this.proteinData;
            if (!data || !('originalData' in data) || !('reversedData' in data))
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            // compute width of component
            let stack = document.getElementById('stackDiv');
            if (stack)
                svg_width = Math.ceil(stack.getBoundingClientRect().width - 2 * padding);
            else
            {
                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            let scale = (stack.getBoundingClientRect().width - 32) / this.proteinData.originalData.length;

            let original = this.proteinData.originalData;
            let reversed = this.proteinData.reversedData;
            this.proteinData.labels_json = this.proteinData.reversed ?
                JSON.parse(JSON.stringify(reversed)) : JSON.parse(JSON.stringify(original));
            let labels_json_data = this.proteinData.labels_json;
            labels_json_data.length *= scale;
            for (var region of labels_json_data.regions) {
                if (region.start) region.start *= scale;
                if (region.end) region.end *= scale;
                if (region.aliStart) region.aliStart *= scale;
                if (region.aliEnd) region.aliEnd *= scale;
                if (region.modelStart) region.modelStart *= scale;
                if (region.modelEnd) region.modelEnd *= scale;
                if (region.modelLength) region.modelLength *= scale;
            }
            for (var motif of labels_json_data.motifs) {
                if (motif.start) motif.start *= scale;
                if (motif.end) motif.end *= scale;
            }

            this.baseAxis.setProteinDomain([0, data.labels_json.length]);
            const axis = this.baseAxis;

            d3.select("#proteinLabelsDiv").append("canvas").attr("id", "labelCalcCanvas");

            let canvas = document.getElementById("labelCalcCanvas");
            let ctx = canvas.getContext("2d");
            ctx.fillStyle = "#000000";

            let label_draw_information = [];
            let is_need_diagonal = false;
            let max_horizontal_height = -1;
            let max_diagonal_height = -1;

            let domain_regions = [];
            for (let domain_index = 0; domain_index < data.labels_json.regions.length; ++domain_index)
            {
                let domain = data.labels_json.regions[domain_index];
                let domain_label = domain.metadata.description;
                if (!domain_label)
                    continue;

                domain_label = this.extract_two_words(domain_label.trim());

                let domain_start_x = axis.proteinScale(domain.start);
                let domain_end_x = axis.proteinScale(domain.end);
                if (domain_start_x > domain_end_x)
                {
                    let temp = domain_start_x;
                    domain_start_x = domain_end_x;
                    domain_end_x = temp;
                }

                domain_regions.push([domain_start_x, domain_end_x, domain_label]);
            }

            domain_regions.sort(function (a, b) {return a[0] - b[0];});
            for (let domain_region_index = 0; domain_region_index < domain_regions.length; ++domain_region_index)
            {
                let [domain_start_x, domain_end_x, domain_label] = domain_regions[domain_region_index];
                let label_center_x = Math.round((domain_start_x + domain_end_x) / 2);

                let leftmost_x = 0;
                if (domain_region_index > 0)
                {
                    let left_dist_between_edges = Math.abs(domain_start_x - domain_regions[domain_region_index - 1][1]);
                    leftmost_x = domain_start_x - left_dist_between_edges / 2;
                }

                let rightmost_x = svg_width - 0.00001;
                if (domain_region_index < domain_regions.length - 1)
                {
                    let right_dist_between_edges = Math.abs(domain_regions[domain_region_index + 1][0] - domain_end_x);
                    rightmost_x = domain_end_x + right_dist_between_edges / 2;
                }

                let left_dist_from_center = Math.abs(label_center_x - leftmost_x);
                let right_dist_from_center = Math.abs(rightmost_x - label_center_x);
                let dist_from_center = Math.min(left_dist_from_center, right_dist_from_center);
                let domain_pixel_width = Math.floor(dist_from_center * 2) - 6;

                let font_size = 16.0;
                let can_draw_horizontally = false;
                let label_width = 0;
                while (font_size >= 10.0)
                {
                    ctx.font = `${font_size}px sans-serif`;
                    label_width = ctx.measureText(domain_label).width;

                    // If the label can be drawn within the width of the domain, it can be drawn horizontally
                    if (label_width <= domain_pixel_width)
                    {
                        can_draw_horizontally = true;
                        break;
                    }

                    font_size -= 0.1;
                }

                if (can_draw_horizontally)
                {
                    let label_metrics = ctx.measureText(domain_label);
                    let label_height = label_metrics.actualBoundingBoxAscent + label_metrics.actualBoundingBoxDescent;
                    if (label_height > max_horizontal_height)
                        max_horizontal_height = label_height;

                    let label_x = Math.round(label_center_x - (label_width / 2));
                    label_draw_information.push([false, domain_label, label_x, font_size]);
                    continue;
                }

                // The label must be drawn diagonally
                font_size = 16.0;
                let can_draw_diagonally = false;
                let diagonal_width = max_diagonal_width;

                let length_to_right_side = svg_width - label_center_x;
                if (length_to_right_side < height)
                    diagonal_width = Math.floor(length_to_right_side / Math.cos(Math.PI / 4) - 6);

                while (font_size >= 10.0)
                {
                    ctx.font = `${font_size}px sans-serif`;
                    label_width = ctx.measureText(domain_label).width;

                    // If the label can be drawn within the 45 degree diagonal of the space given for drawing labels, the whole label can be rendered
                    if (label_width <= diagonal_width)
                    {
                        can_draw_diagonally = true;
                        break;
                    }

                    font_size -= 0.1;
                }

                if (can_draw_diagonally)
                {
                    let label_height = Math.round(label_width * Math.cos(Math.PI / 4));
                    if (label_height > max_diagonal_height)
                        max_diagonal_height = label_height;

                    label_draw_information.push([true, domain_label, label_center_x, font_size]);
                    is_need_diagonal = true;
                    continue;
                }

                // The whole label cannot be rendered even at the lowest font size, so some characters need to be cropped
                let last_character_index = domain_label.length - 1;
                while (last_character_index >= 0)
                {
                    let shortened_domain_label = domain_label.substring(0, last_character_index + 1) + "...";
                    let shortened_label_width = ctx.measureText(shortened_domain_label).width;
                    if (shortened_label_width <= diagonal_width)
                    {
                        let label_height = Math.round(shortened_label_width * Math.cos(Math.PI / 4));
                        if (label_height > max_diagonal_height)
                            max_diagonal_height = label_height;

                        label_draw_information.push([true, shortened_domain_label, label_center_x, font_size]);
                        is_need_diagonal = true;
                        break;
                    }

                    last_character_index -= 1;
                }
            }

            // If there are no labels to be drawn, return an empty SVG
            if ((max_diagonal_height === -1) && (max_horizontal_height === -1))
            {
                document.querySelector("#labelCalcCanvas").remove();

                if (symbol)
                    return [-1, -1, null];
                return "";
            }

            let svg_height = (is_need_diagonal) ? Math.ceil(max_diagonal_height) + 6 : Math.ceil(max_horizontal_height) + 3;
            let svg = "";

            for (let [is_draw_diagonally, label_text, label_x, font_size] of label_draw_information)
            {
                if (is_draw_diagonally)
                    svg += diagonal_text(label_text, label_x, svg_height, font_size, "sans-serif");
                else
                {
                    ctx.font = `${font_size}px sans-serif`;
                    let text_metrics = ctx.measureText(label_text);
                    let text_height = text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent;
                    svg += text_hanging_baseline(label_text, label_x, svg_height - text_height, font_size, "sans-serif");
                }
            }

            document.querySelector("#labelCalcCanvas").remove();

            if (symbol)
                return [svg_width, svg_height, svg];

            svg = put_in_svg(svg_width, svg_height, svg);
            return svg;
        },

        build()
        {
            this.init();
            this.buildProteinLabels();
        }
    },

    watch: {
        proteinData: function()
        {
            this.build();
        },
        baseAxis: function()
        {
            this.build();
        }
    }
}
</script>