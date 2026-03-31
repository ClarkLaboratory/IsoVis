/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// Contains functions for calculating and categorizing splice junctions from input data.

/**
 * Calculate the set of spliced regions for an isoform set, including whether they appear in all isoforms
 *
 * @param {Array<Isoform>} isoformList List of all isoforms in the set
 * @returns {Array<Array<number>>} List of coordinates for spliced regions in the isoforms and a boolean indicating whether they appear in all isoforms
 */
export function calculateSplicedRegions(isoformList)
{
    let spliced_regions_dict = {};                  // The set of all spliced regions
    let spliced_region_counts = {};                 // The counts of each spliced region
    let spliced_regions_from_first_exon = {};       // The set of spliced regions found from the first exon of a transcript
    let spliced_regions_from_non_first_exon = {};   // The set of spliced regions found from any exon of a transcript other than the first exon
    let first_exon_boundaries = {};                 // The set of boundaries for the first exon of a transcript

    let is_strand_positive = (isoformList[0].strand === '+');
    let constitutive_junctions_exist = false;

    // Determine all spliced regions and store them in a dictionary in the form of 'string([start1, end1]), string([start2, end2]), ...'
    for (let isoform of isoformList)
    {
        let exon_ranges = isoform.exonRanges;
        for (let i = 0; i < exon_ranges.length - 1; ++i)
        {
            let exon0 = exon_ranges[i];
            let exon1 = exon_ranges[i + 1];

            let spliced_region_start = (is_strand_positive ? exon0[1] : exon1[1]);
            let spliced_region_end = (is_strand_positive ? exon1[0] : exon0[0]);

            let spliced_region = JSON.stringify([spliced_region_start, spliced_region_end]);
            spliced_regions_dict[spliced_region] = [];

            if (i !== 0)
                spliced_regions_from_non_first_exon[spliced_region] = [];

            if (spliced_region_counts[spliced_region])
                spliced_region_counts[spliced_region] += 1;
            else
                spliced_region_counts[spliced_region] = 1;
        }

        if (exon_ranges.length >= 2)
        {
            let first_exon_boundary = JSON.parse(JSON.stringify(exon_ranges[0]));
            let spliced_region_from_first_exon = (is_strand_positive) ? JSON.stringify([first_exon_boundary[1], exon_ranges[1][0]])
                                                                      : JSON.stringify([exon_ranges[1][1], first_exon_boundary[0]]);
            first_exon_boundaries[JSON.stringify(first_exon_boundary)] = [];
            spliced_regions_from_first_exon[spliced_region_from_first_exon] = [];
        }
    }

    // We want to return an array of splice junctions with their categorical information
    let spliced_regions_categorized = [];

    // Determine which spliced regions are constitutive (i.e. used in all loaded transcripts)
    // Special case: For spliced regions found for the first exon of a transcript, they are non-constitutive if
    // that exon overlaps with another first exon and they do not share the same end boundaries
    let alternative_splice_regions = {};
    let constitutive_splice_regions = {};

    for (let spliced_region of Object.keys(spliced_regions_dict))
    {
        let [spliced_region_start, spliced_region_end] = JSON.parse(spliced_region);

        if (alternative_splice_regions[spliced_region] || constitutive_splice_regions[spliced_region])
            continue;

        let is_constitutive = true;

        // Case 1: If a spliced region is present in all transcripts, it is constitutive
        if (spliced_region_counts[spliced_region] === isoformList.length)
        {
            constitutive_junctions_exist = true;
            constitutive_splice_regions[spliced_region] = [];
            continue;
        }

        // Case 2: 5' splice site not chosen
        // Case 3: 3' splice site skipped
        // If the 5' site of the spliced region is contained by an exon (case 2) OR
        // the spliced region contains the start of an internal exon (case 3),
        // the spliced region is non-constitutive
        for (let isoform of isoformList)
        {
            let exon_ranges = isoform.exonRanges;
            for (let i = 0; i < exon_ranges.length; ++i)
            {
                let exon = exon_ranges[i];

                // Case 2
                let five_prime_splice_site = (is_strand_positive) ? spliced_region_start : spliced_region_end;
                if ((exon[0] < five_prime_splice_site) && (five_prime_splice_site < exon[1]))
                {
                    is_constitutive = false;
                    break;
                }

                // Case 3
                let exon_start = (is_strand_positive) ? exon[0] : exon[1];
                if ((i !== 0) && (spliced_region_start < exon_start) && (exon_start < spliced_region_end))
                {
                    is_constitutive = false;
                    break;
                }
            }

            if (!is_constitutive)
                break;
        }

        if (!is_constitutive)
        {
            alternative_splice_regions[spliced_region] = [];
            continue;
        }

        // Case 4: Alternative 3' splice site
        // If there are other spliced regions with the same 5' site but different 3' site, then
        // the spliced region itself and those other spliced regions are non-constitutive
        for (let spliced_region_2 of Object.keys(spliced_regions_dict))
        {
            let [spliced_region_start_2, spliced_region_end_2] = JSON.parse(spliced_region_2);
            if ((spliced_region_start === spliced_region_start_2) && (spliced_region_end === spliced_region_end_2))
                continue;

            if ((is_strand_positive && (spliced_region_start === spliced_region_start_2) && (spliced_region_end !== spliced_region_end_2)) ||
                (!is_strand_positive && (spliced_region_end === spliced_region_end_2) && (spliced_region_start !== spliced_region_start_2)))
            {
                is_constitutive = false;
                alternative_splice_regions[spliced_region_2] = [];
            }
        }

        if (!is_constitutive)
        {
            alternative_splice_regions[spliced_region] = [];
            continue;
        }

        // Case 5: If the spliced region comes from the first exon of a transcript but not from a non-first-exon of a different transcript...
        if (spliced_regions_from_first_exon[spliced_region] && !spliced_regions_from_non_first_exon[spliced_region])
        {
            // Find all possible first exons it could have originated from
            let possible_first_exons = {};
            for (let first_exon_boundary of Object.keys(first_exon_boundaries))
            {
                let [first_exon_start, first_exon_end] = JSON.parse(first_exon_boundary);
                if ((is_strand_positive && (first_exon_end === spliced_region_start)) || (!is_strand_positive && (first_exon_start === spliced_region_end)))
                    possible_first_exons[first_exon_boundary] = [];
            }

            // If one of the first exons the spliced region possibly originated from overlaps with a different first exon but doesn't share the same exon end boundary,
            // then that spliced region is non-constitutive
            let is_determined_non_constitutive = false;
            for (let first_exon_boundary_1 of Object.keys(possible_first_exons))
            {
                let [first_exon_start_1, first_exon_end_1] = JSON.parse(first_exon_boundary_1);
                for (let first_exon_boundary_2 of Object.keys(first_exon_boundaries))
                {
                    let [first_exon_start_2, first_exon_end_2] = JSON.parse(first_exon_boundary_2);

                    if ((first_exon_start_1 === first_exon_start_2) && (first_exon_end_1 === first_exon_end_2))
                        continue;

                    if ((is_strand_positive && (first_exon_end_1 === first_exon_end_2)) || (!is_strand_positive && (first_exon_start_1 === first_exon_start_2)))
                        continue;

                    let overlap = intersection([first_exon_start_1, first_exon_end_1], [first_exon_start_2, first_exon_end_2]);
                    if ((overlap.length !== 0) && (overlap[0] !== overlap[1]))
                    {
                        is_constitutive = false;
                        is_determined_non_constitutive = true;
                        break;
                    }
                }

                if (is_determined_non_constitutive)
                    break;
            }

            if (!is_constitutive)
                alternative_splice_regions[spliced_region] = [];
            else
            {
                constitutive_junctions_exist = true;
                constitutive_splice_regions[spliced_region] = [];
            }

            continue;
        }

        // Case 6: If the spliced region is not present in all transcripts that fully overlap with it, the spliced region is non-constitutive
        for (let isoform of isoformList)
        {
            let isoform_range = [Math.min(isoform.start, isoform.end), Math.max(isoform.start, isoform.end)];
            let overlap = intersection(isoform_range, [spliced_region_start, spliced_region_end]);
            if ((overlap.length !== 0) && (overlap[0] === spliced_region_start) && (overlap[1] === spliced_region_end))
            {
                let is_spliced_region_in_transcript = false;
                let exon_ranges = isoform.exonRanges;
                for (let i = 0; i < exon_ranges.length - 1; ++i)
                {
                    let exon0 = exon_ranges[i];
                    let exon1 = exon_ranges[i + 1];

                    if (( is_strand_positive && (exon0[1] === spliced_region_start) && (exon1[0] === spliced_region_end)) ||
                        (!is_strand_positive && (exon1[1] === spliced_region_start) && (exon0[0] === spliced_region_end)))
                    {
                        is_spliced_region_in_transcript = true;
                        break;
                    }
                }

                if (!is_spliced_region_in_transcript)
                {
                    is_constitutive = false;
                    break;
                }
            }

            if (!is_constitutive)
                break;
        }

        if (is_constitutive)
        {
            constitutive_junctions_exist = true;
            constitutive_splice_regions[spliced_region] = [];
        }
        else
            alternative_splice_regions[spliced_region] = [];
    }

    for (let spliced_region of Object.keys(spliced_regions_dict))
    {
        let [spliced_region_start, spliced_region_end] = JSON.parse(spliced_region);

        if (alternative_splice_regions[spliced_region])
            spliced_regions_categorized.push([spliced_region_start, spliced_region_end, false]);
        else
            spliced_regions_categorized.push([spliced_region_start, spliced_region_end, true]);
    }

    return [spliced_regions_categorized, constitutive_junctions_exist];
}

/**
 * Calculate the relative height of each spliced region in the set of spliced regions for an isoform set (for constitutive junctions only or for alternative junctions only)
 *
 * @param {Array<Isoform>} spliced_regions The set of spliced regions
 * @returns {Array<Array<number>>} A list of decimals, where each is the relative height of the corresponding spliced region
 */
export function calculateRelativeHeights(spliced_regions, alternative_only = true)
{
    let relative_heights = [];

    // Strategy to drawing easily distinguishable arcs (taken from JunctionSeq):
    // For each spliced region, consider the number of spliced regions contained within it ('num_under') and the number outside of it ('num_over')
    // The lowest arc would be for a spliced region that is contained within all other spliced regions
    // The highest arc would be for a spliced region that contains all other spliced regions

    for (let [spliced_region_start, spliced_region_end, is_constitutive] of spliced_regions)
    {
        if (is_constitutive === alternative_only)
        {
            relative_heights.push(-1);
            continue;
        }

        let num_under = -1; // -1 is used because we don't count the spliced region itself, we only consider all other spliced regions
        let num_over = -1;

        for (let [other_spliced_region_start, other_spliced_region_end, other_is_constitutive] of spliced_regions)
        {
            if (other_is_constitutive === alternative_only)
                continue;
            if ((spliced_region_start <= other_spliced_region_start) && (spliced_region_end >= other_spliced_region_end))
                num_under += 1;
            if ((spliced_region_start >= other_spliced_region_start) && (spliced_region_end <= other_spliced_region_end))
                num_over += 1;
        }

        relative_heights.push((num_under + 1) / (num_over + num_under + 1));
    }

    return relative_heights;
}

/**
 * Calculate the relative height of each spliced region in the set of spliced regions for an isoform set (for both constitutive and alternative junctions)
 *
 * @param {Array<Isoform>} spliced_regions The set of spliced regions
 * @returns {Array<Array<number>>} A list of decimals, where each is the relative height of the corresponding spliced region
 */
export function calculateRelativeHeightsAll(spliced_regions)
{
    let relative_heights = [];

    for (let [spliced_region_start, spliced_region_end] of spliced_regions)
    {
        let num_under = -1; // -1 is used because we don't count the spliced region itself, we only consider all other spliced regions
        let num_over = -1;

        for (let [other_spliced_region_start, other_spliced_region_end] of spliced_regions)
        {
            if ((spliced_region_start <= other_spliced_region_start) && (spliced_region_end >= other_spliced_region_end))
                num_under += 1;
            if ((spliced_region_start >= other_spliced_region_start) && (spliced_region_end <= other_spliced_region_end))
                num_over += 1;
        }

        relative_heights.push((num_under + 1) / (num_over + num_under + 1));
    }

    return relative_heights;
}

function intersection(orf, exon)
{
    let [[orf_start, orf_end], [exon_start, exon_end]] = [orf, exon];

    if ((exon_end < orf_start) || (exon_start > orf_end))
        return [];

    return [Math.max(orf_start, exon_start), Math.min(orf_end, exon_end)];
}