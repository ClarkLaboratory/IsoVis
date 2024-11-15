/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// BaseAxis manages scaling between gene coordinates (input) and screen coordinates (output).

import * as d3 from 'd3';

export class BaseAxis {
    /**
     * A class to manage scaling functionality for the visualization
     * 
     * @param {number} width the width of the gene = abs(end - start)
     * @param {number} start the start coordinate of the gene
     * @param {number} end the end coordinate of the gene
     * @param {char} strand the direction of the RNA strand
     * @param {Array<Array<number>>} mergedRanges Union of exon ranges across all isoforms (i.e., the metagene)
     * @param {Array<Array<number, number, boolean>>} spliced_regions Set of spliced regions and whether they appear for all shown isoforms
     * @param {Array<number>} relative_heights List of relative heights for each spliced region (excluding constitutive ones)
     * @param {Array<number>} relative_heights_all List of relative heights for each spliced region
     */
    constructor(width, start, end, strand, mergedRanges, spliced_regions, relative_heights, relative_heights_all) {
        this.width = width; // genomic width
        this.plotWidth = 700; // screen resolution width
        this.start = start; 
        this.end = end; 
        this.fixedIntronLength = 50;
        this.shrink = false; // specifies if intron areas are shrunk, to highlight exonic features - set to true when introns are normalized
        this.mergedRanges = mergedRanges; // metagene coordinates
        this.spliced_regions = spliced_regions;
        this.relative_heights = relative_heights;
        this.relative_heights_all = relative_heights_all;
        this.baseDomain = this.start < this.end ? [this.start, this.end] : [this.end, this.start]; // initial domain for genomic scaling function (ordered for genome orientation)
        this.domain = [0, this.width]; // domain in use (switch between base and shrunk)
        this.baseRange = [0, this.width]; // initial range for genomic scaling function
        this.range = [0, this.width]; // range in use (switch between base and shrunk)
        this.shrunkDomain = []; // domain for genomic scaling after intron normalization
        this.shrunkRange = []; // range for genomic scaling after intron normalization
        this.screenDomain = [0, this.width]; // domain for scaling to screen resolution
        this.screenRange = [0, this.plotWidth]; // range for scaling to screen resolution
        this.proteinDomain = []; // domain for protein scaling fucntion
        this.avgExonLength = 0;
        this.strand = strand;
        this.ascending = true; // do coordinates increase from left to right? (depends on gene orientation and whether or not reading direction has been switched)
        this.geneToAxisScale = d3.scaleLinear().domain(this.domain).range(this.range); // scale gene to intermediary axis
        this.proteinToAxisScale = d3.scaleLinear().domain(this.proteinDomain).range(this.baseRange); // scale protein to intermediary axis
        this.axisToScreenScale = d3.scaleLinear().domain(this.screenDomain).range(this.screenRange); // scale intermediary axis to screen
    }

    isnormalized = () => {
        return this.shrink;
    }

    isAscending = () => {
        return this.ascending;
    }

    scale = (x) => {
        /**
         * Function to directly scale gene to screen
         * 
         * @param {int} x coordinate to be scaled
         * @returns {int} scaled coordinate
         */
        return this.axisToScreenScale(this.geneToAxisScale(x));
    }

    proteinScale = (x) => {
        /**
         * Function to directly scale protein to screen
         * 
         * @param {int} x coordinate to be scaled
         * @returns {int} scaled coordinate
         */
        return this.axisToScreenScale(this.proteinToAxisScale(x));
    }

    setProteinDomain(domain) {
        /**
         * Setter function for the protein domain
         * 
         * @param {number[]} domain start and end coordinates for the protein domain
         */
        this.proteinDomain = this.ascending ? domain : domain.reverse();
        this.proteinToAxisScale = d3.scaleLinear().domain(this.proteinDomain).range(this.baseRange);
    }

    updateScale() {
        /**
         * Updates domains and ranges of scales
         */
        this.geneToAxisScale = d3.scaleLinear().domain(this.domain).range(this.range);
        this.axisToScreenScale = d3.scaleLinear().domain(this.screenDomain).range(this.screenRange);
    }

    setPlotWidth = (width) => {
        /**
         * Setter function for the width of the axis
         * 
         * @param {int} width the width of the axis
         */
        this.plotWidth = width;
        this.screenRange = this.ascending ? [0, this.plotWidth] : [this.plotWidth, 0];
        this.updateScale();
    }

    togglenormalization = () => {
        this.shrink = !this.shrink;
        this.domain = this.shrink ? this.shrunkDomain : this.baseDomain;
        this.range = this.shrink ? this.shrunkRange : this.baseRange;
        this.updateScale();
    }

    normalizeIntrons = (shrink) => {
        /**
         * Set intron normalization and updates axis scales. 
         * true means introns are shrank, false means expanded out.
         */
        this.shrink = shrink;
        this.domain = this.shrink ? this.shrunkDomain : this.baseDomain;
        this.range = this.shrink ? this.shrunkRange : this.baseRange;
        this.updateScale();
    }

    reverse = () => { 
        /**
         * reverses scaling direction and updates axis scales
         */
        this.ascending = !this.ascending; 
        this.screenRange.reverse();
        this.updateScale();
    }

    calculateShrinkage = () => {
        /**
         * Calculates scale domain and range for normalized intron state
         */

        let ranges = [];
        
        for (var range of this.mergedRanges)
            ranges.push(range);
        
        if (ranges.length < 1) return;

        // Sort metagenes into genomic order
        ranges.sort(function (a, b) {return a[0] - b[0];});

        // Determine which metagenes would be shown in the current zoomed area
        let shown_ranges = [];
        let zoom_start = Math.min(this.start, this.end);
        let zoom_end = Math.max(this.start, this.end);
        for (let [a, b] of ranges)
        {
            let metagene_start = Math.min(a, b);
            let metagene_end = Math.max(a, b);

            let metagene_start_shown = ((zoom_start <= metagene_start) && (metagene_start <= zoom_end));
            let metagene_end_shown = ((zoom_start <= metagene_end) && (metagene_end <= zoom_end));

            // If both the start and end of the metagene aren't shown, there are 2 possible cases:
            if (!(metagene_start_shown || metagene_end_shown))
            {
                let zoom_start_inside = ((metagene_start <= zoom_start) && (zoom_start <= metagene_end));
                let zoom_end_inside = ((metagene_start <= zoom_end) && (zoom_end <= metagene_end));

                // Case 1: The zoomed area's inside the metagene
                if (zoom_start_inside && zoom_end_inside)
                    shown_ranges.push([zoom_start, zoom_end]);

                // Case 2: The zoomed area's outside the metagene
                continue;
            }

            // If the start of the metagene isn't shown, the range shown would be [zoom_start, metagene_end].
            // If the end of the metagene isn't shown, the range shown would be [metagene_start, zoom_end].
            // Otherwise, the whole metagene is shown.

            let range = [metagene_start, metagene_end];
            if (!metagene_start_shown)
                range = [zoom_start, metagene_end];
            else if (!metagene_end_shown)
                range = [metagene_start, zoom_end];

            if (range[0] !== range[1])
                shown_ranges.push(range);
        }

        if (shown_ranges.length < 1) return;

        // Initialise helper variables
        const width = this.width;
        const rangeCount = shown_ranges.length;

        // Determine the number of introns present in the zoomed area
        let numIntrons = rangeCount - 1;
        if (shown_ranges[0][0] > this.start)
            numIntrons += 1;
        if (shown_ranges[shown_ranges.length - 1][1] < this.end)
            numIntrons += 1;

        const allExonLength = shown_ranges.reduce(function (previous, range) {return previous + Math.abs(range[1] - range[0])}, 0);
        let intronLength = (numIntrons > 0) ? ((width - allExonLength) / numIntrons) * 0.25 : 0;
        this.avgExonLength = (width - numIntrons * intronLength) / rangeCount;
        // const intronLength = numIntrons > 1 ? Math.max(this.fixedIntronLength, (width * 0.25) / numIntrons) : this.fixedIntronLength;
        // this.avgExonLength = (width - numIntrons * intronLength) / rangeCount;
        // const allExonLength = shown_ranges.reduce(function (previous, range) {return previous + Math.abs(range[1] - range[0])}, 0);
        const rangeToLength = d3.scaleLinear().domain([0, allExonLength / rangeCount]).range([0, this.avgExonLength]);
        const d3Domain = [];
        const d3Range = [];
        let xPosition = 0;

        // Start the list of scaling parameters
        if (shown_ranges[0][0] > this.start) {
            d3Domain.push(this.start);
            d3Range.push(xPosition);
            xPosition += intronLength;
        }

        // Append the start and end coordinates to the list of scaling parameters
        shown_ranges.forEach(function (range) {
            let rangeLength = Math.abs(range[1] - range[0]);
            d3Domain.push(range[0]);
            d3Domain.push(range[1]);
            d3Range.push(xPosition);
            xPosition += rangeToLength(rangeLength);
            d3Range.push(xPosition);
            xPosition += intronLength;
        });

        // End the list of scaling parameters
        if (shown_ranges[shown_ranges.length - 1][1] < this.end) {
            d3Domain.push(this.end);
            d3Range.push(xPosition);
        } else {
            xPosition -= intronLength;
        }
        
        // Update axis attributes
        this.width = xPosition;
        this.shrunkDomain = d3Domain;
        this.shrunkRange = d3Range;
    }

    genomeCoords = () => {
        /**
         * Return genomic coordinates
         */
        return {
            start: this.start,
            end: this.end,
            width: this.width,
            strand: this.strand,
        }
    }

    endpoints = () => {
        /**
         * Return end point positions as an array
         */
        let leftEnd = this.genomeCoords().strand == "+" ? this.genomeCoords().start : this.genomeCoords().end;
        let rightEnd = this.genomeCoords().strand == "+" ? this.genomeCoords().end : this.genomeCoords().start;
        let ascending = this.ascending; // can't use this in the next bit
        return [leftEnd, rightEnd].sort(function (a, b) {return ascending ? a - b : b - a;});
    }

    screenRanges = () => {
        /**
         * Return exon ranges in terms of screen dimensions pixels
         */
        let ranges = [];
        //let data = (this.showCanon) ? this.canonData.mergedRanges : this.primaryData.mergedRanges;
        let data = this.mergedRanges;
        for (const range of data) {
            ranges.push([this.scale(range[0]), this.scale(range[1])].sort(function (a, b) {return a - b;}));
        }
        return ranges;
    }
}

export function createBaseAxis(width, start, end, strand, mergedRanges, spliced_regions, relative_heights, relative_heights_all, plotWidth=400) {
    /**
     * Creates and returns a BaseAxis object
     * 
     * @param {int} width the width of the axis
     * @param {int} start the start coordinate of the axis
     * @param {int} end the end coordinate of the axis
     * @param {char} strand the direction of the RNA strand
     * @param {Array<Array<number>>} mergedRanges union of exon ranges across all isoforms
     * @param {Array<Array<number, number, boolean>>} spliced_regions Set of spliced regions and whether they appear for all shown isoforms
     * @param {Array<number>} relative_heights List of relative heights for each spliced region
     * @param {Array<number>} relative_heights_all List of relative heights for each spliced region
     * @returns {BaseAxis} the axis
     */
    const axis = new BaseAxis(width, start, end, strand, mergedRanges, spliced_regions, relative_heights, relative_heights_all);
    axis.calculateShrinkage();
    axis.normalizeIntrons(true); // normalize introns as default
    axis.setPlotWidth(plotWidth);
    return axis;
}