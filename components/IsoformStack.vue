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

export default {
    props: ["baseAxis", "isoformList"],
    
    data: () => {
        return {
            // dimensions
            width: 0,
            padding: 16,
            isoformHeight: 50,
            isoformGap: 1,

            show_orfs: false,
            start_drag: -1,
            end_drag: -1
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
            this.$root.$emit("set_zoom", [this.start_drag, this.end_drag]);
            this.start_drag = -1;
        },

        remove_crosshair()
        {
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

            if (!this.baseAxis || !this.isoformList || Object.keys(this.baseAxis).length == 0)
                return;

            this.width = document.getElementById("stackDiv").getBoundingClientRect().width - 2 * this.padding;
            this.baseAxis.setPlotWidth(this.width);

            // var data = (state.showCanon) ? state.canonData : state.primaryData;
            let svgHeight = this.groupScale(this.isoformList.length, this.isoformHeight, this.isoformGap) - this.isoformGap;
            let exonHeight = this.show_orfs ? this.isoformHeight / 3 : this.isoformHeight / 2;
            // let exonTranslation = `translate(0, ${(this.isoformHeight - exonHeight) / 2})`;

            let self = this;  // avoid conflict with 'this' referring to a different object within some functions.

            // Clear the target element of any content
            d3.select("#stackDiv").selectAll("*").remove();

            d3.select("#stackDiv").append("canvas")
                .attr("width", Math.ceil(self.width))
                .attr("height", Math.ceil(svgHeight))
                .attr("id", "stackCanvas")
                .attr("style", "position: absolute; left: 1rem !important;");
            let canvas = document.getElementById("stackCanvas");
            let ctx = canvas.getContext("2d");

            let transformation = (i) => self.groupScale(i, self.isoformHeight, self.isoformGap);
            let screen_ranges = self.baseAxis.screenRanges();

            // Add metagene background to each isoform
            ctx.fillStyle = "rgb(213,235,232)";
            for (let [x0, x1] of screen_ranges)
            {
                let width = Math.abs(x1 - x0);
                let actual_x0 = Math.round(x0);
                let actual_x1 = Math.round(width + x0);
                let actual_width = actual_x1 - actual_x0;
                for (let i = 0; i < self.isoformList.length; ++i)
                {
                    let y0 = transformation(i);
                    ctx.fillRect(actual_x0, y0, actual_width, self.isoformHeight);
                }
            }

            // Add the intron line to each isoform
            for (let i = 0; i < self.isoformList.length; ++i)
            {
                let isoform = self.isoformList[i];
                let x0 = self.baseAxis.scale(isoform.start);
                let x1 = self.baseAxis.scale(isoform.end);
                let y0 = (self.isoformHeight) / 2 + transformation(i);
                let y1 = y0;

                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.stroke();
            }

            // Add exons to each isoform
            ctx.fillStyle = self.show_orfs ? "rgb(112,112,112)" : "rgb(83,83,83)";
            for (let i = 0; i < self.isoformList.length; ++i)
            {
                let isoform = self.isoformList[i];
                let exon_ranges = isoform.exonRanges;
                let y = transformation(i) + (self.isoformHeight - exonHeight) / 2;

                for (let [x0, x1] of exon_ranges)
                {
                    let x = self.baseAxis.isAscending() ? self.baseAxis.scale(x0) : self.baseAxis.scale(x1);
                    let width = Math.abs(self.baseAxis.scale(x1) - self.baseAxis.scale(x0));
                    let actual_x0 = Math.round(x);
                    let actual_x1 = Math.round(width + x);
                    let actual_width = Math.max(actual_x1 - actual_x0, 1);                      // we want to show every exon, so ensure they're each at least 1 pixel wide
                    let height = exonHeight;
                    let actual_y0 = (y - Math.floor(y) <= 0.5) ? Math.floor(y) : Math.round(y); // emulating the SVG pixel coordinate rounding behaviour
                    let actual_y1 = Math.round(height + y);
                    let actual_height = actual_y1 - Math.round(y);
                    ctx.fillRect(actual_x0, actual_y0, actual_width, actual_height);
                }
            }

            if (self.show_orfs)
            {
                // Add ORFs to each isoform
                ctx.fillStyle = "rgb(83,83,83)";
                let orfHeight = self.isoformHeight / 2;
                for (let i = 0; i < self.isoformList.length; ++i)
                {
                    let isoform = self.isoformList[i];
                    let orf_ranges = isoform.orf;

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
                        ctx.fillRect(actual_x0, actual_y0, actual_width, actual_height);
                    }
                }
            }

            d3.select("#stackDiv").append("canvas")
                .attr("width", Math.ceil(self.width))
                .attr("height", Math.ceil(svgHeight))
                .attr("id", "stackCrosshairCanvas")
                .attr("data-htmltoimage-ignore", true)
                .attr("style", "position: absolute; left: 1rem !important;");

            d3.select("#stackCrosshairCanvas")
                .on("mouseover", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX);})
                .on("mousemove", function (evt) {self.$root.$emit("draw_crosshair", evt.clientX);})
                .on("mouseleave", function() {self.$root.$emit("remove_crosshair");})
                .on("contextmenu", function (evt) {evt.preventDefault();})
                .on("mousedown", function (evt) {if ((evt.buttons & 0b10) !== 0) {self.$root.$emit("reset_zoom"); return;} self.$root.$emit("set_start_drag", self.mouse_to_genome(evt.clientX));})
                .on("mouseup", function (evt) {self.set_end_drag(self.mouse_to_genome(evt.clientX));});

            // d3.select("#stackCrosshairCanvas")
            //     .on("mouseover", function (evt) {self.draw_crosshair(evt.clientX);})
            //     .on("mousemove", function (evt) {self.draw_crosshair(evt.clientX);})
            //     .on("mouseleave", this.remove_crosshair);

            // // Append SVG
            // let svg = d3.select('#stackDiv').append("svg")
            //     .attr('id', 'stack-svg')
            //     .attr("height", svgHeight)
            //     .style("width", self.width)

            // // Append main group element
            // const stackMain = svg.append("g")
            //     .attr("class", "stackMain")
            //     .attr("width", self.width) 
            //     .attr("height", svgHeight)
            //     .style("position", "relative");

            // // Append isoforms group element
            // const isoforms = stackMain.append("g")
            //     .attr("class", "isoforms");

            // // Add the crosshair
            // const crosshair = stackMain.append("line")
            //     .attr("id", "stack-crosshair")
            //     .attr('data-htmltoimage-ignore', 'true')
            //     .attr("x1", 0)
            //     .attr("y1", 0)
            //     .attr("x2", 0)
            //     .attr("y2", svgHeight)
            //     .style("stroke-width", "1")
            //     .style("stroke", "black")
            //     .style("stroke-dasharray", '2, 2')
            //     .style("pointer-events", "none");

            // // Update SVG and crosshair dimensions
            // svg.attr("height", svgHeight).attr("width", this.width);
            // crosshair.attr("y2", svgHeight)

            // let transformation = (i) => `translate(0, ${self.groupScale(i, self.isoformHeight, self.isoformGap)})`;

            // // Add individual group elements for each isoform
            // const isoform = isoforms.selectAll(".isoform")
            //     .data(self.isoformList, function (d) {return d.transcriptID;})
            //     .enter()
            // .append("g")
            //     .attr("class", "isoform")
            //     .attr("transform", function (d, i) {return transformation(i)});

            // // Add metagene background to each isoform group
            // const metagene = isoform.selectAll(".rangeRect")
            //     .data(self.baseAxis.screenRanges())
            //     .enter()
            // .append("rect")
            //     .attr("class", "rangeRect")
            //     .attr("x", function (d) {return d[0]}) 
            //     .attr("y", 0) 
            //     .attr("width", function (d) {return Math.abs(d[1] - d[0])})
            //     .attr("height", self.isoformHeight)
            //     .style("pointer-event", "none")
            //     .style("fill", "rgb(213,235,232)")
            //     .style("opacity", 1);

            // // Add the intron line to each isoform group
            // const intronLine = isoform.append("line")
            //     .attr("class", "intronLine")
            //     .attr("x1", function (d) {return self.baseAxis.scale(d.start)})
            //     .attr("x2", function (d) {return self.baseAxis.scale(d.end)})
            //     .attr("y1", (self.isoformHeight) / 2)
            //     .attr("y2", (self.isoformHeight) / 2)
            //     .style("stroke-width", "1")
            //     .style("stroke", "black")
            //     .style("pointer-events", "none");
                            
            // // Add exons to each rectangle
            // const exon = isoform.selectAll("exon")
            //     .data(function (d) {return d.exonRanges}) 
            //     .enter()
            // .append("rect")
            //     .attr("class", "exon")
            //     .attr("x", function (d) {return self.baseAxis.isAscending() ? self.baseAxis.scale(d[0]) : self.baseAxis.scale(d[1])}) 
            //     .attr("y", 0)
            //     .attr("height", exonHeight)
            //     .attr("width", function (d) {return Math.abs(self.baseAxis.scale(d[1]) - self.baseAxis.scale(d[0]))})
            //     .style("fill", self.show_orfs ? "rgb(112,112,112)" : "rgb(83,83,83)")
            //     .style("opacity", 1)
            //     .attr("transform", exonTranslation);

            // if (self.show_orfs) {
            //     // Add ORF to each rectangle
            //     const orfHeight = self.isoformHeight / 2;
            //     const ORFExon = isoform.selectAll("orfExon")
            //         .data(function (d) {return d.orf}) 
            //         .enter()
            //     .append("rect")
            //         .attr("class", "exon")
            //         .attr("x", function (d) {return self.baseAxis.isAscending() ? self.baseAxis.scale(d[0]) : self.baseAxis.scale(d[1])}) 
            //         .attr("y", 0)
            //         .attr("height", orfHeight)
            //         .attr("width", function (d) {return Math.abs(self.baseAxis.scale(d[1]) - self.baseAxis.scale(d[0]))})
            //         .style("fill", "rgb(83,83,83)")
            //         .style("opacity", 1)
            //         .attr("transform", "translate(0, " + orfHeight / 2 + ")");      
            // }
        },
    },

    watch: {
        baseAxis: function()
        {
            this.buildStack();
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