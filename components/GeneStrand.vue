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

export default {
    props: ["baseAxis", "chromosome"],
    
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
            this.$root.$emit("set_zoom", [this.start_drag, this.end_drag]);
            this.start_drag = -1;
        },

        remove_crosshair()
        {
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
            crosshair_canvas_ctx.font = "12px sans-serif";
            crosshair_canvas_ctx.setLineDash([2, 2]);
            crosshair_canvas_ctx.strokeStyle = "rgb(83,83,83)";

            crosshair_canvas_ctx.beginPath();
            crosshair_canvas_ctx.moveTo(x, 30);
            crosshair_canvas_ctx.lineTo(x, 70 + this.margin.top - 20);
            crosshair_canvas_ctx.stroke();

            let chromosome = (this.chromosome) ? this.chromosome + ":" : "";

            let genomic_location = chromosome + Math.floor(this.baseAxis.geneToAxisScale.invert(this.baseAxis.axisToScreenScale.invert(x)));

            let label_width = crosshair_canvas_ctx.measureText(genomic_location).width;
            let label_x = Math.min(x, Math.floor(crosshair_canvas.width - label_width));
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
            ctx.font = "12px sans-serif";

            // Add background colour
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "black";

            // Add left label
            let left_label = chromosome + self.baseAxis.endpoints()[0];
            ctx.fillText(left_label, 0, 70 + this.margin.top);
            
            // Add center label
            let center_label = ((self.baseAxis.genomeCoords().strand == '+') ? "Forward" : "Reverse") + " strand";
            ctx.fillText(center_label, (width - ctx.measureText(center_label).width) / 2, 70 + this.margin.top);

            // Add right label
            let right_label = chromosome + self.baseAxis.endpoints()[1];
            ctx.fillText(right_label, width - ctx.measureText(right_label).width, 70 + this.margin.top);

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
                .attr("data-htmltoimage-ignore", true)
                .attr("style", "position: absolute; left: 1rem !important;");

            d3.select("#axisCrosshairCanvas")
                .on("mouseover", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX);})
                .on("mousemove", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX);})
                .on("mouseleave", function() {self.$root.$emit("remove_crosshair");})
                .on("contextmenu", function (evt) {evt.preventDefault();})
                .on("mousedown", function (evt) {if ((evt.buttons & 0b10) !== 0) {self.$root.$emit("reset_zoom"); return;} self.$root.$emit("set_start_drag", self.mouse_to_genome(evt.clientX));})
                .on("mouseup", function (evt) {self.set_end_drag(self.mouse_to_genome(evt.clientX));});

            // // Add SVG
            // const svg = d3.select("#axisDiv").append('svg')
            //     .attr("class", "m-0 p-0")
            //     .attr('id', 'axis-svg')
            //     .attr('width', width)
            //     .attr('height', self.height);
            
            // // Add group element
            // const axisMain = svg.append('g')
            //     .attr('class', 'axisMain')
            //     .attr('width', width)
            //     .attr('height', svgHeight)
            //     .style('position', 'relative')
            //     .attr('transform', 'translate(0, ' + self.margin.top + ')');

            // // Initial crosshair
            // axisMain.append("line")
            //     .attr("class", "axis-crosshair")
            //     .attr('data-htmltoimage-ignore', 'true')
            //     .attr("x1", 0)
            //     .attr("y1", 0)
            //     .attr("x2", 0)
            //     .attr("y2", svgHeight)
            //     .style("stroke-width", "1")
            //     .style("stroke", "black")
            //     .style("stroke-dasharray", '2, 2')
            //     .style("pointer-events", "none");

            // // Add label for specific genomic coordinate
            // const positionLabel = axisMain.append('text')
            //     .attr('class', 'crosshairPosition')
            //     .attr('data-htmltoimage-ignore', 'true')
            //     .attr('x', 0)
            //     .attr('y', -7.5)
            //     .attr('font-size', 'small');
            //     d3.select('#axis-svg')
            //         .attr('width', width);
                
            // axisMain.selectAll('.ticks').remove();
            // axisMain.selectAll('.label').remove();

            // // Add background
            // const backgroundRect = axisMain.append('rect')
            //     .attr('x', 0)
            //     .attr('y', 0)
            //     .attr('width', width)
            //     .attr('height', svgHeight)
            //     .style('fill', "white");

            // // add left label
            // const leftLabel = axisMain.append('text')
            //     .attr('class', 'label')
            //     .attr('id', 'start')
            //     .text(self.baseAxis.endpoints()[0])
            //     .attr('x', 0)
            //     .attr('y', 70)
            //     .attr('font-size', 'smaller');

            // // add right label 
            // const rightLabel = axisMain.append('text')
            //     .attr('class', 'label')
            //     .attr('id', 'end')
            //     .text(self.baseAxis.endpoints()[1])
            //     .attr('y', 70)
            //     .attr('font-size', 'smaller');
            // rightLabel.attr('x', width - rightLabel.node().getComputedTextLength());

            // // function for building triangular ticks
            // let coords = (d) => {
            //     if (self.baseAxis.genomeCoords().strand == '+')
            //     { 
            //         return self.baseAxis.scale(tickScale(d)) + ',' + svgHeight / 3 + " " + 
            //             ((d !== 100) ? self.baseAxis.scale(tickScale(d) + step) + ',' + svgHeight / 2 + ' ' : '') + 
            //             self.baseAxis.scale(tickScale(d)) + ', ' + svgHeight * 2/3;
            //     }
            //     else
            //     {
            //         return self.baseAxis.scale(tickScale(d)) + ',' + svgHeight / 3 + " " + 
            //             ((d !== 100) ? self.baseAxis.scale(tickScale(d) - step) + ',' + svgHeight / 2 + ' ' : '') + 
            //             self.baseAxis.scale(tickScale(d)) + ', ' + svgHeight * 2/3;
            //     }
            // }

            // // add axis ticks
            // axisMain.selectAll('.ticks').data(d3.range(0, 101))
            //     .enter()
            // .append('polygon')
            //     .attr('class', 'ticks')
            //     .attr('points', function (d) {return coords(d)})
            //     .attr('stroke', "rgb(83,83,83)")
            //     .attr('fill', "#d5ebe8");

            // // add midline 
            // const midline = axisMain.append('line')
            //     .attr('class', 'midline')
            //     .attr('x1', 0)
            //     .attr('x2', width)
            //     .attr('y1', svgHeight / 2)
            //     .attr('y2', svgHeight / 2)
            //     .style('stroke-width', 1)
            //     .style("stroke", "rgb(83,83,83)")
            //     .style("stroke-dasharray", '4, 2')
            //     .style("pointer-events", "none");
        },
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