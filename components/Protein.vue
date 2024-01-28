/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

<template>
<div id="proteinParent" class="grid-item" style="margin-top: 0px; margin-bottom: 0px; padding-top: 0px; padding-bottom: 0px; padding-left: 1rem !important; padding-right: 1rem !important;" ref="parentDiv">
    <div id="proteinDiv">
        <p>Loading protein diagram...</p>
    </div>
    <div id="proteinDomainMapDiv">
        <p>Loading protein mapping...</p>
    </div>
</div>
</template>

<script>
import DomainGfx from 'domain-gfx';
import * as d3 from 'd3';

export default {
    props: ["proteinData", "baseAxis"],

    data: () => {
        return {
            show_domains: true,
            show_motifs: true,
        };
    },

    methods: {
        // scale protein graphic
        updateProteinCoords(scale) {
            let original = this.proteinData.originalData;
            let reversed = this.proteinData.reversedData;
            this.proteinData.json = this.proteinData.reversed ?
                JSON.parse(JSON.stringify(reversed)) : JSON.parse(JSON.stringify(original));
            let data = this.proteinData.json;
            data.length *= scale;
            for (var region of data.regions) {
                if (region.start) region.start *= scale;
                if (region.end) region.end *= scale;
                if (region.aliStart) region.aliStart *= scale;
                if (region.aliEnd) region.aliEnd *= scale;
                if (region.modelStart) region.modelStart *= scale;
                if (region.modelEnd) region.modelEnd *= scale;
                if (region.modelLength) region.modelLength *= scale;
            }
            for (var motif of data.motifs) {
                if (motif.start) motif.start *= scale;
                if (motif.end) motif.end *= scale;
            }
            for (var markup of data.markups) {
                if (markup.start) markup.start *= scale;
                if (markup.end) markup.end *= scale;
            }
        },

        // Build original/scaled coordinate pairs from protein data (orientation-specific)
        domainCoords(paired=false) {
            let coords = [];
            let data = this.proteinData;
            for (let i = 0; i < data.json.regions.length; ++i) {
                // use updated coords if necessary
                let start = data.isoformCoords ? parseInt(data.isoformCoords[data.originalData.regions[i].start]) : data.originalData.regions[i].start;
                let end = data.isoformCoords ? parseInt(data.isoformCoords[data.originalData.regions[i].end]) : data.originalData.regions[i].end;
                let coordPair = [{
                    original: start,
                    scaled: this.baseAxis.isAscending() ? data.json.regions[i].start : data.json.regions[i].end
                }, 
                {
                    original: end,
                    scaled: this.baseAxis.isAscending() ? data.json.regions[i].end : data.json.regions[i].start
                }]
                if (paired)
                    coords.push(coordPair)
                else
                    coords = coords.concat(coordPair)
            }
            if (paired) {
                for (let i = 0; i < data.json.regions.length; ++i) {
                    let coordPair = [{
                        original: data.originalData.regions[i].start,
                        scaled: this.baseAxis.isAscending() ? data.json.regions[i].start : data.json.regions[i].end
                    }, 
                    {
                        original: data.originalData.regions[i].end,
                        scaled: this.baseAxis.isAscending() ? data.json.regions[i].end : data.json.regions[i].start
                    }]
                    coords.push(coordPair)
                }
            }
            return coords;
        },

        motifCoords(paired=false) {
            let coords = [];
            let data = this.proteinData;
            for (let i = 0; i < data.json.motifs.length; ++i) {
                // use updated coords if necessary
                let start = data.isoformCoords ? parseInt(data.isoformCoords[data.originalData.motifs[i].start]) : data.originalData.motifs[i].start;
                let end = data.isoformCoords ? parseInt(data.isoformCoords[data.originalData.motifs[i].end]) : data.originalData.motifs[i].end;
                let coordPair = [{
                    original: start,
                    scaled: this.baseAxis.isAscending() ? data.json.motifs[i].start : data.json.motifs[i].end
                }, 
                {
                    original: end,
                    scaled: this.baseAxis.isAscending() ? data.json.motifs[i].end : data.json.motifs[i].start
                }]
                if (paired)
                    coords.push(coordPair);
                else
                    coords = coords.concat(coordPair);
            }
            if (paired) {
                for (let i = 0; i < data.json.motifs.length; ++i) {
                    let coordPair = [{
                        original: data.originalData.motifs[i].start,
                        scaled: this.baseAxis.isAscending() ? data.json.motifs[i].start : data.json.motifs[i].end
                    }, 
                    {
                        original: data.originalData.motifs[i].end,
                        scaled: this.baseAxis.isAscending() ? data.json.motifs[i].end : data.json.motifs[i].start
                    }]
                    coords.push(coordPair)
                }
            }
            return coords;
        },

        init()
        {
            document.getElementById("proteinDiv").innerHTML = "<p>Loading protein diagram...</p>";
            document.getElementById("proteinDomainMapDiv").innerHTML = "<p>Loading protein mapping...</p>";
        },

        buildProtein() {
            // only proceed if there is protein data and the stack has been generated
            if (!this.proteinData) return;

            // Check if the InterPro entry for the protein accession does not exist
            if (this.proteinData.gone)
            {
                document.getElementById("proteinDiv").innerHTML = '<br>';
                document.getElementById("proteinDomainMapDiv").innerHTML = "<p>The InterPro entry for the canonical protein does not exist.</p>";
                return;
            }

            const el = document.getElementById('stackDiv');
            if (!el) return;

            // compute x scale and scale protein coordinates
            let xscale = (el.getBoundingClientRect().width - 32) / this.proteinData.originalData.length; 
            this.updateProteinCoords(xscale);
            const data = this.proteinData.json;

            // clear target element of content and insert graphic
            d3.select('#proteinDiv').selectAll('*').remove();
            const parent = document.getElementById('proteinDiv');
            const graphic = new DomainGfx({data, parent});
        },

        buildProteinMap() {
            let padding = 16;
            let height = 30;
            let width = 300;

            // make a copy of data and update axis
            let data = this.proteinData;
            if (!data || !('json' in data)) return;
            this.baseAxis.setProteinDomain([0, data.json.length]);
            const axis = this.baseAxis;

            // compute width of component
            let stack = document.getElementById('stackDiv');
            if (stack)
                width = stack.getBoundingClientRect().width - 2 * (padding + 1);
            else return;

            // clear target element of any content
            d3.select('#proteinDomainMapDiv').selectAll("*").remove();

            d3.select("#proteinDomainMapDiv").append("canvas")
                .attr("width", width)
                .attr("height", height)
                .attr("style", "margin-bottom: -5.5px") // FIXME: When the canvas is added into the page, the element becomes 5.5 pixels taller than it should be
                .attr("id", "proteinMapCanvas");
            let canvas = document.getElementById("proteinMapCanvas");
            let ctx = canvas.getContext("2d");
            ctx.strokeStyle = "rgb(83, 83, 83)";

            if (this.show_domains)
            {
                // Add shading for mapped domain regions
                let a = 0.2; // opacity
                let coords = this.domainCoords(true);
                let regions = this.proteinData.originalData.regions;
                for (let region of regions)
                {
                    let start = data.isoformCoords ? data.isoformCoords[region.start] : region.start;
                    let end = data.isoformCoords ? data.isoformCoords[region.end] : region.end;
                    let points = [start, end].sort();

                    // Assume that colours are in the form '#rrggbb'
                    let colour = region.colour;
                    let r = parseInt(colour.substring(1, 3), 16);
                    let g = parseInt(colour.substring(3, 5), 16);
                    let b = parseInt(colour.substring(5, 7), 16);
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;

                    for (let coord of coords)
                    {
                        let pair = [coord[0].original, coord[1].original].sort()
                        if ((pair[0] == points[0]) && (pair[1] == points[1]))
                        {
                            let pt0 = [axis.proteinScale(coord[0].scaled), 0];
                            let pt1 = [axis.scale(data.domainMap[coord[0].original]), height];
                            let pt2 = [axis.scale(data.domainMap[coord[1].original]), height];
                            let pt3 = [axis.proteinScale(coord[1].scaled), 0];

                            let path = new Path2D();
                            path.moveTo(pt0[0], pt0[1]);
                            path.lineTo(pt1[0], pt1[1]);
                            path.lineTo(pt2[0], pt2[1]);
                            path.lineTo(pt3[0], pt3[1]);
                            path.lineTo(pt0[0], pt0[1]);
                            path.closePath();

                            ctx.fill(path);
                        }
                    }
                }

                // Add mapping lines for the start and end of each domain region
                let domain_coords = this.domainCoords();
                for (let domain_coord of domain_coords)
                {
                    if (!data.domainMap[domain_coord.original])
                        continue;
                    let x0 = axis.proteinScale(domain_coord.scaled);
                    let y0 = 0;
                    let x1 = axis.scale(data.domainMap[domain_coord.original]);
                    let y1 = height;
                    ctx.beginPath();
                    ctx.moveTo(x0, y0);
                    ctx.lineTo(x1, y1);
                    ctx.stroke();
                }
            }

            if (this.show_motifs)
            {
                // Add shading for mapped motif regions
                let a = 0.2; // opacity
                let coords = this.motifCoords(true);
                let motifs = this.proteinData.originalData.motifs;
                for (let motif of motifs)
                {
                    let start = data.isoformCoords ? data.isoformCoords[motif.start] : motif.start;
                    let end = data.isoformCoords ? data.isoformCoords[motif.end] : motif.end;
                    let points = [start, end].sort();

                    // Assume that colours are in the form '#rrggbb'
                    let colour = motif.colour;
                    let r = parseInt(colour.substring(1, 3), 16);
                    let g = parseInt(colour.substring(3, 5), 16);
                    let b = parseInt(colour.substring(5, 7), 16);
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;

                    for (let coord of coords)
                    {
                        let pair = [coord[0].original, coord[1].original].sort()
                        if ((pair[0] == points[0]) && (pair[1] == points[1]))
                        {
                            let pt0 = [axis.proteinScale(coord[0].scaled), 0];
                            let pt1 = [axis.scale(data.motifMap[coord[0].original]), height];
                            let pt2 = [axis.scale(data.motifMap[coord[1].original]), height];
                            let pt3 = [axis.proteinScale(coord[1].scaled), 0];

                            let path = new Path2D();
                            path.moveTo(pt0[0], pt0[1]);
                            path.lineTo(pt1[0], pt1[1]);
                            path.lineTo(pt2[0], pt2[1]);
                            path.lineTo(pt3[0], pt3[1]);
                            path.lineTo(pt0[0], pt0[1]);
                            path.closePath();

                            ctx.fill(path);
                        }
                    }
                }

                // Add mapping lines for the start and end of each motif region
                let motif_coords = this.motifCoords();
                for (let motif_coord of motif_coords)
                {
                    if (!data.motifMap[motif_coord.original])
                        continue;
                    let x0 = axis.proteinScale(motif_coord.scaled);
                    let y0 = 0;
                    let x1 = axis.scale(data.motifMap[motif_coord.original]);
                    let y1 = height;
                    ctx.beginPath();
                    ctx.moveTo(x0, y0);
                    ctx.lineTo(x1, y1);
                    ctx.stroke();
                }
            }

            // // append SVG
            // const svg = d3.select('#proteinDomainMapDiv').append('svg')
            //     .attr('id', 'map-svg')
            //     .attr('width', width)
            //     .attr('height', height);

            // // append main group element
            // const mapMain = svg.append('g')
            //     .attr('class', 'mapMain')
            //     .attr('width', width)
            //     .attr('height', height)
            //     .style('position', 'relative');

            // if (this.show_domains)
            // {
            //     // Add map lines for each domain
            //     d3.select('.mapMain').selectAll('.domainLine')
            //         .data(this.domainCoords())
            //         .enter()
            //     .append('line')
            //         .attr('class', function (d) {return data.domainMap[d.original] ? '.domainLine' : '.domainLine no-map'})
            //         .attr("x1", function (d) {return axis.proteinScale(d.scaled)})
            //         .attr("y1", 0)
            //         .attr("x2", function (d) {return axis.scale(data.domainMap[d.original])})
            //         .attr("y2", height)
            //         .style("stroke-width", "1")
            //         .style("stroke", "rgb(83, 83, 83)")
            //         .style("pointer-events", "none");

            //     // remove unsuccessful mappings
            //     d3.selectAll(".no-map").remove();

            //     let coords = this.domainCoords(true);

            //     // add shading for mapped regions
            //     d3.select('.mapMain').selectAll('.domainShade')
            //         .data(this.proteinData.originalData.regions)
            //         .enter()
            //     .append('polygon')
            //         .attr('class', 'domainShade')
            //         .attr('points', function(d) {
            //             let start = data.isoformCoords ? data.isoformCoords[d.start] : d.start;
            //             let end = data.isoformCoords ? data.isoformCoords[d.end] : d.end;
            //             let points = [start, end].sort();
            //             for (let coord of coords) {
            //                 let pair = [coord[0].original, coord[1].original].sort()
            //                 if (points.join(',') == pair.join(',')) {
            //                     return`${axis.proteinScale(coord[0].scaled)},0 ${axis.scale(data.domainMap[coord[0].original])},${height} ${axis.scale(data.domainMap[coord[1].original])},${height} ${axis.proteinScale(coord[1].scaled)},0`
            //                 }
            //             }
            //         })
            //         .attr('fill', function (d) {return d.colour;})
            //         .attr('fill-opacity', '0.2');
            // }
            
            // if (this.show_motifs)
            // {
            //     // Add map lines for each domain
            //     d3.select('.mapMain').selectAll('.motifLine')
            //         .data(this.motifCoords())
            //         .enter()
            //     .append('line')
            //         .attr('class', function (d) {return data.motifMap[d.original] ? '.motifLine' : '.motifLine no-map'})
            //         .attr("x1", function (d) {return axis.proteinScale(d.scaled)})
            //         .attr("y1", 0)
            //         .attr("x2", function (d) {return axis.scale(data.motifMap[d.original])})
            //         .attr("y2", height)
            //         .style("stroke-width", "1")
            //         .style("stroke", "rgb(83, 83, 83)")
            //         .style("pointer-events", "none");

            //     // remove unsuccessful mappings
            //     d3.selectAll(".no-map").remove();

            //     let coords = this.motifCoords(true);

            //     // add shading for mapped regions
            //     d3.select('.mapMain').selectAll('.motifShade')
            //         .data(this.proteinData.originalData.motifs)
            //         .enter()
            //     .append('polygon')
            //         .attr('class', 'motifShade')
            //         .attr('points', function(d) {
            //             let start = data.isoformCoords ? data.isoformCoords[d.start] : d.start;
            //             let end = data.isoformCoords ? data.isoformCoords[d.end] : d.end;
            //             let points = [start, end].sort();
            //             for (let coord of coords) {
            //                 let pair = [coord[0].original, coord[1].original].sort()
            //                 if (points.join(',') == pair.join(',')) {
            //                     return`${axis.proteinScale(coord[0].scaled)},0 ${axis.scale(data.motifMap[coord[0].original])},${height} ${axis.scale(data.motifMap[coord[1].original])},${height} ${axis.proteinScale(coord[1].scaled)},0`
            //                 }
            //             }
            //         })
            //         .attr('fill', function (d) {return d.colour;})
            //         .attr('fill-opacity', '0.2');
            // }
        },

        build()
        {
            this.init();
            this.buildProtein();
            this.buildProteinMap();
        },

        // reverse protein graphic
        reverseProtein() {
            this.proteinData.reversed = !this.proteinData.reversed;
        },
    },

    watch: {
        proteinData: function()
        {
            this.build();
        },
        show_domains: function()
        {
            this.build();
        },
        show_motifs: function()
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