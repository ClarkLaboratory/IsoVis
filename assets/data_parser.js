/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// Contains classes which can parse input data, such as the contents of gtf file and return objects
// which contain data useful for the application such as start and end points of genes.

import * as d3 from 'd3';   // used for its scaling functions

/**
 * Move known isoforms to top of list.
 * 
 * @param {Array<string>} transcripts: list of transcripts ["ENST00000375793","9037411c-8329-4d13-bcdb-5545a1acfb34",...]
 * @returns {Array<string>} reordered list of transcripts
 */
export function prioritiseKnownTranscripts(transcripts)
{
    let orderedList = [];
    // One loop to pick up ENS transcripts, and another to pick up the others
    for (let transcript of transcripts) if (transcript.indexOf('ENS') === 0) orderedList.push(transcript);
    for (let transcript of transcripts) if (transcript.indexOf('ENS') !== 0) orderedList.push(transcript);
    return orderedList;
}

export class RNAModifSitesData {
    /**
     * Create an RNA modification sites data instance
     * 
     * @param {string} file the input file
     * @param {string} gene the ID of the gene to be visualized
     */
    constructor(file, gene)
    {
        this.valid = false; // set to true at the end
        this.error = "";
        this.warning = "";
        this.file = file;
        this.gene = gene;
    }

    async parseFile()
    {
        let file = this.file;

        if (!file || file.size < 10)
        {
            this.error = "Please upload an RNA modification sites data file.";
            return;
        }

        if (file.size > 536870912)
        {
            this.error = "RNA modification sites data file size should be less than 500 MB.";
            return;
        }

        let filename = file.name;
        if (!filename)
        {
            this.error = "Filename for RNA modification sites data is empty.";
            return;
        }

        if (filename.indexOf('.') === -1)
        {
            this.error = "RNA modification sites data file does not contain a file extension. Please specify the correct file extension in its filename.";
            return;
        }

        this.is_bed_type_unknown = false;
        this.num_bed_columns = -1;

        if (filename.endsWith(".bed"))
        {
            this.filetype = "BED";
            this.is_bed_type_unknown = true;
        }
        else
        {
            let last_dot_index = filename.lastIndexOf('.');
            let file_extension = filename.substring(last_dot_index + 1);

            let valid_column_numbers = [4, 5, 6, 7, 8, 9, 12];
            for (let valid_column_number of valid_column_numbers)
            {
                if (file_extension === `bed${valid_column_number}`)
                {
                    this.filetype = "BED";
                    this.num_bed_columns = valid_column_number;
                    break;
                }
            }

            if (this.num_bed_columns === -1)
            {
                this.error = "Invalid RNA modification sites data file extension.";
                return;
            }
        }

        // The user has uploaded a .bed file, so determine the number of columns it should have
        if (this.is_bed_type_unknown)
        {
            let slice_index = 0;
            while (slice_index !== -1)
            {
                let arr = await this.filteredLines(slice_index);
                let filtered_lines = arr[0];
                slice_index = arr[1];

                if (filtered_lines.length === 0)
                    continue;

                let num_columns = filtered_lines[0].split('\t').length;
                if ((num_columns <= 3) || (num_columns === 10) || (num_columns === 11) || (num_columns >= 13))
                {
                    this.error = "Incorrect number of columns found in the uploaded RNA modification sites BED file. Please upload a BED4 to BED9 file or a BED12 file.";
                    break;
                }

                this.num_bed_columns = num_columns;
                this.is_bed_type_unknown = false;
                break;
            }

            if (this.is_bed_type_unknown)
            {
                if (!this.error)
                    this.error = "The uploaded RNA modification sites BED file does not contain any valid BED line. Please upload a BED4 to BED9 file or a BED12 file.";
                return;
            }
        }

        this.allSites = [];

        let parser_type = this.filetype;
        let loading_msg = `Getting RNA modification sites from ${this.filetype} file...`;

        this.update_loading_msg(loading_msg);

        let slice_index = 0;
        while (slice_index !== -1)
        {
            let arr = await this.filteredLines(slice_index);
            let filtered_lines = arr[0];
            slice_index = arr[1];

            let loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;

            if (parser_type === "BED")
                this.sitesFromBED(filtered_lines);

            this.update_loading_percentage(loading_percentage);
        }

        this.valid = true;
        this.allSites.sort((a, b) => a - b);
        this.siteOrder = JSON.parse(JSON.stringify(this.allSites));

        this.no_sites = (Object.keys(this.allSites).length === 0);
        if (this.no_sites)
            this.warning = "No RNA modification sites found for the selected gene. RNA modification site visualization disabled for this gene.";
    }

    update_loading_msg(loading_msg)
    {
        let event = new CustomEvent("update_loading_msg", {detail: loading_msg});
        document.dispatchEvent(event);
    }

    update_loading_percentage(loading_percentage)
    {
        let event = new CustomEvent("update_loading_percentage", {detail: loading_percentage});
        document.dispatchEvent(event);
    }

    sitesFromBED(lines)
    {
        for (let raw_line of lines)
        {
            let line = new RNAModifSitesBEDLine(raw_line, this.num_bed_columns);
            if (!(line.valid))
                continue;

            let gene = line.gene;
            if (gene !== this.gene)
                continue;

            let start = line.start;
            if (this.allSites.indexOf(start) === -1)
                this.allSites.push(start);
        }
    }

    async filteredLines(slice_index)
    {
        let chunk_size = 5242880; // 5 MB

        let text = await this.getFileChunk(slice_index, slice_index + chunk_size);
        let next_slice_index = -1;

        if (text.length === chunk_size)
        {
            // FIXME: Make this code chunk size independent: A newline must exist for it to work
            let last_newline_index = text.lastIndexOf('\n');
            next_slice_index = slice_index + last_newline_index + 1;
            text = text.substring(0, last_newline_index);
        }

        text = text.replace(/\r/g, '');
        let raw_lines = text.split('\n');
        let filtered_lines = [];

        for (let i = 0; i < raw_lines.length; ++i)
        {
            let line = raw_lines[i];

            // Ignore empty lines and comments
            if ((line === "") || (line[0] === '#'))
                continue;

            if (line.indexOf(this.gene) !== -1)
                filtered_lines.push(line);
        }

        return [filtered_lines, next_slice_index];
    }

    async getFileChunk(start, end)
    {
        let file = this.file;
        let slice = file.slice(start, end);
        let text = await slice.text().then(
            res => res
        ).catch(err =>
        {
            console.log("Error parsing file!");
            console.log(err);
        });
        return text;
    }
}

export class RNAModifSitesLevelData {
    /**
     * Create an RNA modification level data instance
     *
     * @param {string} file the input file
     * @param {string} gene the ID of the gene to be visualized
     * @param {Array<Number>} sites coordinates of the RNA modification sites for the gene to be visualized
     */
    constructor(file, gene, sites)
    {
        this.valid = false; // set to true at the end
        this.error = "";
        this.warning = "";
        this.file = file;
        this.gene = gene;
        this.sites = sites;
    }

    async parseFile()
    {
        let file = this.file;

        if (!file || file.size < 10)
        {
            this.error = "Please upload an RNA modification level file.";
            return;
        }

        if (file.size > 536870912)
        {
            this.error = "RNA modification level file size should be less than 500 MB.";
            return;
        }

        let filename = file.name;
        if (!filename)
        {
            this.error = "Filename for RNA modification level data is empty.";
            return;
        }

        if (filename.indexOf('.') === -1)
        {
            this.error = "RNA modification level file does not contain a file extension. Please specify the correct file extension in its filename.";
            return;
        }

        // Determine delimiter
        if (filename.endsWith(".csv"))
            this.delim = ',';
        else if (filename.endsWith(".txt"))
            this.delim = '\t';
        else
        {
            this.error = "Invalid RNA modification level file extension.";
            return;
        }

        let slice_index = 0;
        let filtered_lines = [];
        let arr = await this.filteredLines(slice_index, true);

        filtered_lines = arr[0];
        slice_index = arr[1];

        let loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;
        let loading_msg = "Getting RNA modification levels...";
        this.update_loading_msg(loading_msg);
        this.update_loading_percentage(loading_percentage);

        if (filtered_lines.length === 0)
        {
            this.error = "No relevant data lines found in RNA modification level file. Check if it contains data for the gene being visualized or if its formatting is incorrect.";
            return;
        }

        let first_line = filtered_lines[0];
        this.samples = first_line.replace(/"/g, '').replace(/\r/g, '').split(this.delim);
        if (this.samples.length < 3)
        {
            this.error = "First line of RNA modification level file has less than 3 data columns. The file must have at least 3 data columns.";
            return;
        }

        this.location_colnum = -1;
        this.gene_id_colnum = -1;

        for (let i = 0; i < this.samples.length; ++i)
        {
            let sample = this.samples[i].toLowerCase();
            if (sample === "location")
                this.location_colnum = i;
            else if (sample === "gene_id")
                this.gene_id_colnum = i;
        }

        if (this.location_colnum === -1)
        {
            this.error = "No location column found in the RNA modification level file.";
            return;
        }

        if (this.gene_id_colnum === -1)
        {
            this.error = "No gene_id column found in the RNA modification level file.";
            return;
        }

        // Prepare attributes
        this.maxValue = NaN; // min/max/avg values for colour scheme & legend
        this.minValue = NaN;

        this.sum = 0;
        this.num_nonzerovals = 0;

        this.export = {};

        filtered_lines.splice(0, 1);
        this.processFilteredLines(filtered_lines);

        while (slice_index !== -1)
        {
            let arr = await this.filteredLines(slice_index);
            filtered_lines = arr[0];
            slice_index = arr[1];
            this.processFilteredLines(filtered_lines);

            loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;
            this.update_loading_percentage(loading_percentage);
        }

        this.valid = true;

        this.no_sites = (Object.keys(this.export).length === 0);
        if (this.no_sites)
            this.warning = "The RNA modification level file does not contain any information on the RNA modification sites of the selected gene. RNA modification level visualization disabled.";
        else
        {
            if (this.num_nonzerovals === 0)
                this.num_nonzerovals = 1;

            this.average = this.sum / this.num_nonzerovals;                 // calculate averages
        }
    }

    update_loading_msg(loading_msg)
    {
        let event = new CustomEvent("update_loading_msg", {detail: loading_msg});
        document.dispatchEvent(event);
    }

    update_loading_percentage(loading_percentage)
    {
        let event = new CustomEvent("update_loading_percentage", {detail: loading_percentage});
        document.dispatchEvent(event);
    }

    async filteredLines(slice_index, get_samples = false)
    {
        let chunk_size = 5242880; // 5 MB

        let text = await this.getFileChunk(slice_index, slice_index + chunk_size);
        let next_slice_index = -1;

        if (text.length === chunk_size)
        {
            // FIXME: Make this code chunk size independent: A newline must exist for it to work
            let last_newline_index = text.lastIndexOf('\n');
            next_slice_index = slice_index + last_newline_index + 1;
            text = text.substring(0, last_newline_index);
        }

        text = text.replace(/\r/g, '');
        let raw_lines = text.split('\n');
        let filtered_lines = [];

        let first_line_found = !get_samples;
        for (let i = 0; i < raw_lines.length; ++i)
        {
            let line = raw_lines[i];

            // Ignore empty lines
            if (line === "")
                continue;

            if (!first_line_found)
            {
                filtered_lines.push(line);
                first_line_found = true;
                continue;
            }

            // Find all lines that contain the gene being searched for
            if (line.indexOf(this.gene) === -1)
                continue;

            // Only consider sites identified from the RNA modification sites data file
            for (let site of this.sites)
            {
                if (line.indexOf((site - 1).toString()) !== -1) // Deal with BED file coordinates being 0-based instead of 1-based
                {
                    filtered_lines.push(line);
                    break;
                }
            }
        }

        return [filtered_lines, next_slice_index];
    }

    processFilteredLines(filtered_lines)
    {
        for (let i = 0; i < filtered_lines.length; ++i)
        {
            // Clean up text and separate values
            let entries = filtered_lines[i].replace(/"/g, '').replace(/\r/g, '').split(this.delim);
            if (entries.length !== this.samples.length)
                continue;

            let gene = entries[this.gene_id_colnum].split('.')[0].trim();
            if (gene !== this.gene)
                continue;

            let site = parseInt(entries[this.location_colnum]) + 1; // Deal with BED coordinates being 0-based instead of 1-based
            if (isNaN(site) || (site < 0) || (this.sites.indexOf(site) === -1))
                continue;

            for (let j = 0; j < this.samples.length; ++j)
            {
                if ((j === this.location_colnum) || (j === this.gene_id_colnum))
                    continue;

                let sample = this.samples[j];
                let value = parseFloat(entries[j]);

                if (value)
                {
                    this.sum += value;
                    this.num_nonzerovals += 1;
                }

                if (isNaN(this.maxValue) || value > this.maxValue) this.maxValue = value;
                if (isNaN(this.minValue) || value < this.minValue) this.minValue = value;

                if (!this.export[site])
                {
                    this.export[site] = {};
                    this.export[site][sample] = value;
                }
                else if (this.export[site][sample] === undefined)
                    this.export[site][sample] = value;
            }
        }
    }

    async getFileChunk(start, end)
    {
        let file = this.file;
        let slice = file.slice(start, end);
        let text = await slice.text().then(
            res => res
        ).catch(err =>
        {
            console.log("Error parsing file!");
            console.log(err);
        });
        return text;
    }
}

export class PrimaryData {
    /**
     * Create a primary data instance
     * 
     * @param {string} file the input file
     * @param {string} gene ID for the gene of interest
     * @param {string} species the species the data came from
     * @param {boolean} is_use_grch37 whether the data uses the GRCh37 genome build instead of GRCh38 (applicable for human data only)
     */
    constructor(file, gene, species, is_use_grch37)
    {
        this.valid = false; // set to true at the end
        this.error = "";
        this.file = file;
        this.gene = gene;
        this.species = species;
        this.is_use_grch37 = is_use_grch37;
        this.is_strand_unknown = false;
    }

    async parseFile()
    {
        let file = this.file;
        let gene = this.gene;

        if (!file || file.size < 10)
        {
            this.error = "Please upload an isoform stack file.";
            return;
        }

        if (file.size > 2147483648)
        {
            this.error = "Stack file size should be less than 2 GB.";
            return;
        }

        let filename = file.name;
        if (!filename)
        {
            this.error = "Filename for isoform stack data is empty.";
            return;
        }

        if (filename.indexOf('.') === -1)
        {
            this.error = "Stack file does not contain a file extension. Please specify the correct file extension in its filename.";
            return;
        }

        this.is_bed_type_unknown = false;
        this.is_reduced_bed = false;
        this.is_minimal_bed = false;
        this.num_reduced_bed_columns = -1;

        if (filename.endsWith(".gff3"))
            this.filetype = "GFF3";
        else if (filename.endsWith(".gff") || filename.endsWith(".gff2") || filename.endsWith(".gtf"))
            this.filetype = "GTF";
        else if (filename.endsWith(".bed12"))
            this.filetype = "BED";
        else if (filename.endsWith(".bed"))
        {
            this.filetype = "BED";
            this.is_bed_type_unknown = true;
        }
        else
        {
            let last_dot_index = filename.lastIndexOf('.');
            let file_extension = filename.substring(last_dot_index + 1);

            // Is this a reduced BED file? (BED6 to BED9)
            let valid_column_numbers = [6, 7, 8, 9];
            for (let valid_column_number of valid_column_numbers)
            {
                if (file_extension === `bed${valid_column_number}`)
                {
                    this.filetype = "BED";
                    this.is_reduced_bed = true;
                    this.num_reduced_bed_columns = valid_column_number;
                    break;
                }
            }

            // Is this a minimal BED file? (BED4 to BED5)
            valid_column_numbers = [4, 5];
            for (let valid_column_number of valid_column_numbers)
            {
                if (file_extension === `bed${valid_column_number}`)
                {
                    this.filetype = "BED";
                    this.is_minimal_bed = true;
                    this.num_reduced_bed_columns = valid_column_number;
                    break;
                }
            }

            if (this.num_reduced_bed_columns === -1)
            {
                this.error = "Invalid stack file extension.";
                return;
            }
        }

        // The user has uploaded a .bed file, so determine the number of columns it should have
        if (this.is_bed_type_unknown)
        {
            let slice_index = 0;
            while (slice_index !== -1)
            {
                let arr = await this.filteredLines(slice_index);
                let filtered_lines = arr[0];
                slice_index = arr[1];

                if (filtered_lines.length === 0)
                    continue;

                let num_columns = filtered_lines[0].split('\t').length;
                if ((num_columns <= 3) || (num_columns === 10) || (num_columns === 11) || (num_columns >= 13))
                {
                    this.error = "Incorrect number of columns found in the uploaded stack BED file. Please upload a BED4 to BED9 file or a BED12 file.";
                    break;
                }

                // If there are 12 columns, this is a BED12 file
                if (num_columns === 12)
                {
                    this.is_bed_type_unknown = false;
                    break;
                }

                // If there are 6 to 9 columns, this is a reduced BED file
                if ((num_columns >= 6) && (num_columns <= 9))
                {
                    this.is_reduced_bed = true;
                    this.num_reduced_bed_columns = num_columns;
                    this.is_bed_type_unknown = false;
                    break;
                }

                // If there are 4 or 5 columns, this is a minimal BED file
                this.is_minimal_bed = true;
                this.num_reduced_bed_columns = num_columns;
                this.is_bed_type_unknown = false;
                break;
            }

            if (this.is_bed_type_unknown)
            {
                if (!this.error)
                    this.error = "The uploaded stack BED file does not contain any valid BED line. Please upload a BED4 to BED9 file or a BED12 file.";
                return;
            }
        }

        this.transcripts = {};
        this.chromosome = "";

        this.geneInfo = {};
        if (gene)
            this.geneInfo[gene] = null;

        let first_parser_type = null;
        let second_parser_type = null;

        if (!gene)
        {
            first_parser_type = `g_${this.filetype}`;
            second_parser_type = `e_${this.filetype}`;
        }
        else
            first_parser_type = `e_${this.filetype}`;

        let loading_msg = "";

        if (first_parser_type.startsWith("g_"))
            loading_msg = `Getting genes from ${this.filetype} file...`;
        else
            loading_msg = `Getting isoform exons of gene '${this.gene}' from ${this.filetype} file...`;

        this.update_loading_msg(loading_msg);

        let slice_index = 0;
        while (slice_index !== -1)
        {
            let arr = await this.filteredLines(slice_index);
            let filtered_lines = arr[0];
            slice_index = arr[1];

            let loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;

            if (first_parser_type === "g_GFF3")
                this.genesFromGFF3(filtered_lines);
            else if (first_parser_type === "e_GFF3")
                this.exonsFromGFF3(filtered_lines);
            else if (first_parser_type === "g_GTF")
                this.genesFromGTF(filtered_lines);
            else if (first_parser_type === "e_GTF")
                this.exonsFromGTF(filtered_lines);
            else if (first_parser_type === "g_BED")
            {
                if (this.is_reduced_bed)
                    this.genesFromReducedBED(filtered_lines);
                else if (this.is_minimal_bed)
                    this.genesFromMinimalBED(filtered_lines);
                else
                    this.genesFromBED(filtered_lines);
            }
            else if (first_parser_type === "e_BED")
            {
                if (this.is_reduced_bed)
                    this.exonsFromReducedBED(filtered_lines);
                else if (this.is_minimal_bed)
                    await this.exonsFromMinimalBED(filtered_lines);
                else
                    this.exonsFromBED(filtered_lines);
            }

            this.update_loading_percentage(loading_percentage);
        }

        this.genes = Object.keys(this.geneInfo);
        if (this.genes.length > 1)
        {
            this.valid = true;  // More than one gene found in the file; let the user pick one to visualize
            return;
        }
        else if (this.genes.length === 0)
        {
            this.error = "No genes found from the stack file. Please upload a stack file with at least one gene.";
            return;
        }

        if (this.gene === null)
            this.gene = this.genes[0];

        if (second_parser_type)
        {
            loading_msg = `Getting isoform exons of gene '${this.gene}' from ${this.filetype} file...`;
            this.update_loading_msg(loading_msg);

            let slice_index = 0;
            while (slice_index !== -1)
            {
                let arr = await this.filteredLines(slice_index);
                let filtered_lines = arr[0];
                slice_index = arr[1];

                let loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;

                if (second_parser_type === "e_GFF3")
                    this.exonsFromGFF3(filtered_lines);
                else if (second_parser_type === "e_GTF")
                    this.exonsFromGTF(filtered_lines);
                else if (second_parser_type === "e_BED")
                {
                    if (this.is_reduced_bed)
                        this.exonsFromReducedBED(filtered_lines);
                    else if (this.is_minimal_bed)
                        await this.exonsFromMinimalBED(filtered_lines);
                    else
                        this.exonsFromBED(filtered_lines);
                }

                this.update_loading_percentage(loading_percentage);
            }
        }

        if (Object.keys(this.transcripts).length === 0)
        {
            this.error = "Stack file contains the searched gene ID but does not contain any of its transcripts.";
            return;
        }

        this.transcriptOrder = prioritiseKnownTranscripts(Object.keys(JSON.parse(JSON.stringify(this.transcripts)))); // store row order to allow for manual reordering

        // build isoform objects from transcript data and save in list
        this.isoformList = [];
        for (let i=0; i<this.transcriptOrder.length; ++i)
            this.isoformList.push(new Isoform(this.transcriptOrder[i], this.transcripts[this.transcriptOrder[i]]));

        // for (let [key, value] of Object.entries(this.transcripts)) this.isoformList.push(new Isoform(key, value));
        this.allIsoforms = JSON.parse(JSON.stringify(this.isoformList)) // keep a copy to allow for manually adding/removing rows

        this.mergedRanges = mergeRanges(this.isoformList); // build the metagene

        // extra information about the gene
        this.minExons = this.mergedRanges.length; 
        this.gene = gene;
        this.start = this.isoformList[0].strand === '+' ? 
            this.mergedRanges[0][0] : 
            this.mergedRanges[this.mergedRanges.length - 1][1];
        this.end = this.isoformList[0].strand === '+' ? 
            this.mergedRanges[this.mergedRanges.length - 1][1] : 
            this.mergedRanges[0][0];
        this.width = Math.abs(this.end - this.start);
        this.strand = this.isoformList[0].strand;

        this.valid = true; // data parsed correctly and ready for visualization
    }

    update_loading_msg(loading_msg)
    {
        let event = new CustomEvent("update_loading_msg", {detail: loading_msg});
        document.dispatchEvent(event);
    }

    update_loading_percentage(loading_percentage)
    {
        let event = new CustomEvent("update_loading_percentage", {detail: loading_percentage});
        document.dispatchEvent(event);
    }

    exonsFromGFF3(lines)
    {
        for (let raw_line of lines)
        {
            let line = new GFF3Line(raw_line);
            if (!(line.valid) || (line.feature !== "exon" && line.feature !== "CDS"))
                continue;

            let gene_to_search = this.gene;
            if (gene_to_search && (line.feature === "exon"))
            {
                let gene_name = line.attributes.gene_id;
                if (!gene_name)
                    continue;

                let period_index = gene_name.indexOf('.');
                if (period_index !== -1)
                    gene_name = gene_name.substring(0, period_index);

                gene_name = gene_name.toUpperCase();
                gene_to_search = gene_to_search.toUpperCase();
                if (gene_to_search !== gene_name)
                    continue;
            }

            // Extract the transcript's chromosome
            if ((!this.chromosome) && line.chromosome)
                this.chromosome = line.chromosome;

            let transcript = line.attributes.transcript_id;
            if (!transcript)
                continue;

            transcript = transcript.split(".")[0];

            if (line.feature === "exon")
            {
                if (!(transcript in this.transcripts))
                {
                    this.transcripts[transcript] = {};
                    this.transcripts[transcript].user_orf = [];
                }

                if (!this.transcripts[transcript].exon_count)
                    this.transcripts[transcript].exon_count = 0;

                let exon = this.transcripts[transcript].exon_count;
                this.transcripts[transcript][exon] = line.range;
                this.transcripts[transcript].strand = line.strand;
                this.transcripts[transcript].exon_count += 1;
            }
            else
            {
                // The transcript must be defined before its CDS
                if (!(transcript in this.transcripts))
                    continue;

                this.transcripts[transcript].user_orf.push(line.range);
            }
        }
    }

    exonsFromGTF(lines)
    {
        for (let raw_line of lines)
        {
            let line = new GTFLine(raw_line);
            if (!(line.valid) || (line.feature !== "exon" && line.feature !== "CDS"))
                continue;

            let gene_to_search = this.gene;
            if (gene_to_search && (line.feature === "exon"))
            {
                let gene_name = line.attributes.gene_id;
                if (!gene_name)
                    continue;

                if (!line.isStringTie)
                {
                    let period_index = gene_name.indexOf('.');
                    if (period_index !== -1)
                        gene_name = gene_name.substring(0, period_index);
                }

                gene_name = gene_name.toUpperCase();
                gene_to_search = gene_to_search.toUpperCase();
                if (gene_to_search !== gene_name)
                    continue;
            }

            // Extract the transcript's chromosome
            if ((!this.chromosome) && line.chromosome)
                this.chromosome = line.chromosome;

            let transcript = line.attributes.transcript_id;
            if (!transcript)
                continue;

            if (!line.isStringTie)
                transcript = transcript.split(".")[0];

            if (line.feature === "exon")
            {
                if (!(transcript in this.transcripts))
                {
                    this.transcripts[transcript] = {};
                    this.transcripts[transcript].user_orf = [];
                }

                if (!this.transcripts[transcript].exon_count)
                    this.transcripts[transcript].exon_count = 0;

                let exon = this.transcripts[transcript].exon_count;
                this.transcripts[transcript][exon] = line.range;
                this.transcripts[transcript].strand = line.strand;
                this.transcripts[transcript].exon_count += 1;
            }
            else
            {
                // The transcript must be defined before its CDS
                if (!(transcript in this.transcripts))
                    continue;

                this.transcripts[transcript].user_orf.push(line.range);
            }
        }
    }

    exonsFromBED(lines)
    {
        for (let raw_line of lines)
        {
            let line = new BEDLine(raw_line);
            if (!(line.valid))
                continue;

            let gene_to_search = this.gene;
            if (gene_to_search)
            {
                let gene_name = line.gene;
                if (!gene_name)
                    continue;

                let period_index = gene_name.indexOf('.');
                if (period_index !== -1)
                    gene_name = gene_name.substring(0, period_index);

                gene_name = gene_name.toUpperCase();
                gene_to_search = gene_to_search.toUpperCase();
                if (gene_to_search !== gene_name)
                    continue;
            }

            // Extract the transcript's chromosome
            if ((!this.chromosome) && line.chromosome)
                this.chromosome = line.chromosome;

            let transcript = line.transcript;
            if (!transcript)
                continue;

            transcript = transcript.split(".")[0];

            if (!(transcript in this.transcripts))
            {
                let strand = line.strand;

                this.transcripts[transcript] = {};
                this.transcripts[transcript].strand = strand;
                this.transcripts[transcript].user_orf = [];

                for (let i = 0; i < line.blockCount; ++i)
                {
                    let start = line.start + line.blockStarts[i];
                    let size = line.blockSizes[i];
                    let range = [start, start + size - 1];
                    this.transcripts[transcript][i] = range;

                    if ((line.orf_start !== undefined) && (line.orf_end !== undefined))
                    {
                        let orf = intersection([line.orf_start, line.orf_end], range);
                        if (orf.length !== 0)
                        {
                            if (strand === '+')
                                this.transcripts[transcript].user_orf.push(orf);
                            else
                                this.transcripts[transcript].user_orf.unshift(orf);
                        }
                    }
                }
            }
        }
    }

    exonsFromReducedBED(lines)
    {
        for (let raw_line of lines)
        {
            let line = new ReducedBEDLine(raw_line, this.num_reduced_bed_columns);
            if (!(line.valid))
                continue;

            let gene_to_search = this.gene;
            if (gene_to_search)
            {
                let gene_name = line.gene;
                if (!gene_name)
                    continue;

                let period_index = gene_name.indexOf('.');
                if (period_index !== -1)
                    gene_name = gene_name.substring(0, period_index);

                gene_name = gene_name.toUpperCase();
                gene_to_search = gene_to_search.toUpperCase();
                if (gene_to_search !== gene_name)
                    continue;
            }

            // Extract the transcript's chromosome
            if ((!this.chromosome) && line.chromosome)
                this.chromosome = line.chromosome;

            let transcript = line.transcript;
            if (!transcript)
                continue;

            transcript = transcript.split(".")[0];

            if (!(transcript in this.transcripts))
            {
                this.transcripts[transcript] = {};
                this.transcripts[transcript].strand = line.strand;
                this.transcripts[transcript].user_orf = [];
                this.transcripts[transcript].user_orf_range = [];
                if ((line.orf_start !== undefined) && (line.orf_end !== undefined))
                    this.transcripts[transcript].user_orf_range = [line.orf_start, line.orf_end];
            }

            let exon_number = 0;
            let strand = this.transcripts[transcript].strand;
            while (true)
            {
                if (!this.transcripts[transcript][exon_number])
                {
                    let start = line.start;
                    let end = line.end;
                    let range = [start, end];
                    this.transcripts[transcript][exon_number] = range;

                    if (this.transcripts[transcript].user_orf_range.length !== 0)
                    {
                        let orf = intersection(this.transcripts[transcript].user_orf_range, range);
                        if (orf.length !== 0)
                        {
                            if (strand === '+')
                                this.transcripts[transcript].user_orf.push(orf);
                            else
                                this.transcripts[transcript].user_orf.unshift(orf);
                        }
                    }

                    break;
                }
                exon_number += 1;
            }
        }
    }

    async exonsFromMinimalBED(lines)
    {
        let gene_strand = "";

        for (let raw_line of lines)
        {
            let line = new MinimalBEDLine(raw_line, this.num_reduced_bed_columns);
            if (!(line.valid))
                continue;

            let gene_to_search = this.gene;
            if (gene_to_search)
            {
                let gene_name = line.gene;
                if (!gene_name)
                    continue;

                let period_index = gene_name.indexOf('.');
                if (period_index !== -1)
                    gene_name = gene_name.substring(0, period_index);

                gene_name = gene_name.toUpperCase();
                gene_to_search = gene_to_search.toUpperCase();
                if (gene_to_search !== gene_name)
                    continue;
            }

            // Extract the transcript's chromosome
            if ((!this.chromosome) && line.chromosome)
                this.chromosome = line.chromosome;

            let transcript = line.transcript;
            if (!transcript)
                continue;

            // Attempt to determine the strandedness of the gene
            if (!gene_strand && line.gene)
            {
                let gene_name = line.gene;

                let period_index = gene_name.indexOf('.');
                if (period_index !== -1)
                    gene_name = gene_name.substring(0, period_index);

                // Look up the gene's strandedness on Ensembl
                let loading_msg = `Determining strandedness of gene '${gene_name}'...`;
                this.update_loading_msg(loading_msg);
                this.update_loading_percentage(0);

                gene_strand = await this.getGeneStrand(gene_name);
                if (gene_strand === "Unknown")
                {
                    this.is_strand_unknown = true;
                    gene_strand = '+'; // For unknown strandedness, assume all data is on the forward strand
                }
            }

            transcript = transcript.split(".")[0];

            if (!(transcript in this.transcripts))
            {
                this.transcripts[transcript] = {};
                this.transcripts[transcript].strand = gene_strand;
            }

            let exon_number = 0;
            while (true)
            {
                if (!this.transcripts[transcript][exon_number])
                {
                    let start = line.start;
                    let end = line.end;
                    let range = [start, end];
                    this.transcripts[transcript][exon_number] = range;
                    break;
                }
                exon_number += 1;
            }
        }
    }

    genesFromGFF3(lines)
    {
        for (let line of lines)
        {
            let gff3_line = new GFF3Line(line);
            if (!(gff3_line.valid))
                continue;

            let gene_name = gff3_line.attributes.gene_id;
            if (!gene_name)
                continue;

            let dot_index = gene_name.indexOf('.');
            if (dot_index !== -1)
                gene_name = gene_name.substring(0, dot_index);

            gene_name = gene_name.toUpperCase();
            if (!(gene_name in this.geneInfo))
                this.geneInfo[gene_name] = null;
        }
    }

    genesFromGTF(lines)
    {
        for (let line of lines)
        {
            let gtf_line = new GTFLine(line);
            if (!(gtf_line.valid))
                continue;

            let gene_name = gtf_line.attributes.gene_id;
            if (!gene_name)
                continue;

            if (!gtf_line.isStringTie)
            {
                let period_index = gene_name.indexOf('.');
                if (period_index !== -1)
                    gene_name = gene_name.substring(0, period_index);
            }

            gene_name = gene_name.toUpperCase();
            if (!(gene_name in this.geneInfo))
                this.geneInfo[gene_name] = null;
        }
    }

    genesFromBED(lines)
    {
        for (let raw_line of lines)
        {
            let line = new BEDLine(raw_line);
            if (!(line.valid))
                continue;

            let gene = line.gene;
            if (!gene)
                continue;

            gene = gene.toUpperCase();
            if (!(gene in this.geneInfo))
                this.geneInfo[gene] = null;
        }
    }

    genesFromReducedBED(lines)
    {
        for (let raw_line of lines)
        {
            let line = new ReducedBEDLine(raw_line, this.num_reduced_bed_columns);
            if (!(line.valid))
                continue;

            let gene = line.gene;
            if (!gene)
                continue;

            gene = gene.toUpperCase();
            if (!(gene in this.geneInfo))
                this.geneInfo[gene] = null;
        }
    }

    genesFromMinimalBED(lines)
    {
        for (let raw_line of lines)
        {
            let line = new MinimalBEDLine(raw_line, this.num_reduced_bed_columns);
            if (!(line.valid))
                continue;

            let gene = line.gene;
            if (!gene)
                continue;

            gene = gene.toUpperCase();
            if (!(gene in this.geneInfo))
                this.geneInfo[gene] = null;
        }
    }

    async filteredLines(slice_index)
    {
        let chunk_size = 5242880; // 5 MB
        let gene_to_search = this.gene;

        let text = await this.getFileChunk(slice_index, slice_index + chunk_size);
        let next_slice_index = -1;

        if (text.length === chunk_size)
        {
            // FIXME: Make this code chunk size independent: A newline must exist for it to work
            let last_newline_index = text.lastIndexOf('\n');
            next_slice_index = slice_index + last_newline_index + 1;
            text = text.substring(0, last_newline_index);
        }

        text = text.replace(/\r/g, '');
        let raw_lines = text.split('\n');
        let filtered_lines = [];

        if (gene_to_search === null)
        {
            for (let i = 0; i < raw_lines.length; ++i)
            {
                let line = raw_lines[i];

                // Ignore empty lines and comments
                if ((line === "") || (line[0] === '#'))
                    continue;

                filtered_lines.push(line);
            }
        }
        else
        {
            let uppercase_gene_to_search = gene_to_search.toUpperCase();
            for (let i = 0; i < raw_lines.length; ++i)
            {
                let line = raw_lines[i];

                // Ignore empty lines and comments
                if ((line === "") || (line[0] === '#'))
                    continue;

                // Find all lines that contain the gene being searched for
                if (line.toUpperCase().indexOf(uppercase_gene_to_search) !== -1)
                    filtered_lines.push(line);
            }
        }

        return [filtered_lines, next_slice_index];
    }

    async getFileChunk(start, end)
    {
        let file = this.file;
        let slice = file.slice(start, end);
        let text = await slice.text().then(
            res => res
        ).catch(err =>
        {
            console.log("Error parsing file!");
            console.log(err);
        });
        return text;
    }

    async getGeneStrand(gene_name)
    {
        let url = `https://${this.is_use_grch37 ? "grch37." : ""}rest.ensembl.org/lookup/id/${gene_name}?species=${this.species}&content-type=application/json`;
        let response = await this.fetchJSON(url);
        if (!response || response.error || !response.strand)
            return "Unknown";

        let strand = response.strand;
        let strandedness = (strand === 1) ? '+' : ((strand === -1) ? '-' : "Unknown");
        return strandedness;
    }

    async fetchJSON(url)
    {
        let response = await fetch(url).then(
            res => res.json()
        ).catch(err =>
        {
            console.log("Error fetching JSON from", url);
            console.log(err);
        });
        return response;
    }

    updateTranscriptOrder(transcripts) {
        /**
         * Update transcript order after reordering / removing / adding isoforms. 
         * 
         * @param {Array<string>} transcripts: list of transcripts 
         */
        let newIsoformList = [];
        for (let i = 0; i < transcripts.length; ++i) {
            for (let isoform of this.allIsoforms) {
                if (isoform.transcriptID == transcripts[i]) newIsoformList.push(isoform);
            }
        }
        this.isoformList = newIsoformList;
        this.transcriptOrder = transcripts;
    }
}

/**
 * Class for representing secondary data
 */
export class SecondaryData {
    /**
     * Create a secondary data instance
     * 
     * @param {string} file the input file
     * @param {string} gene ID for the gene of interest
     * @param {string} transcript_ids transcript IDs for the gene of interest
     */
    constructor(file, gene, transcript_ids) {
        this.valid = false;
        this.error = "";
        this.warning = "";
        this.file = file;
        this.gene = gene;
        this.transcript_ids = transcript_ids;
    }

    async parseFile()
    {
        let file = this.file;
        if (!file || file.size < 10)
        {
            this.error = "Please upload a heatmap file.";
            return;
        }

        if (file.size > 2147483648)
        {
            this.error = "Heatmap file size should be less than 2 GB.";
            return;
        }

        let filename = file.name;
        if (!filename)
        {
            this.error = "Filename for heatmap data is empty.";
            return;
        }

        // Determine delimiter
        if (filename.endsWith(".csv"))
            this.delim = ',';
        else if (filename.endsWith(".txt"))
            this.delim = '\t';
        else
        {
            this.error = "Invalid heatmap file extension.";
            return;
        }

        let slice_index = 0;
        let filtered_lines = [];
        let arr = await this.filteredLines(slice_index, true);
        
        filtered_lines = arr[0];
        slice_index = arr[1];

        let loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;
        let loading_msg = `Extracting data for gene '${this.gene}' from heatmap file...`;
        this.update_loading_msg(loading_msg);
        this.update_loading_percentage(loading_percentage);

        if (filtered_lines.length === 0)
        {
            this.error = "No relevant data lines found in heatmap file. Check if it contains data for the gene being visualized or if its formatting is incorrect.";
            return;
        }

        let first_line = filtered_lines[0];
        this.samples = first_line.replace(/"/g, '').replace(/\r/g, '').split(this.delim);
        if (this.samples.length < 2)
        {
            this.error = "First line of heatmap file has less than 2 data columns. The file must have at least 2 data columns.";
            return;
        }

        this.gene_id_colnum = -1;
        this.transcript_id_colnum = -1;

        for (let i = 0; i < this.samples.length; ++i)
        {
            let sample = this.samples[i].toLowerCase();
            if (sample === "gene_id")
                this.gene_id_colnum = i;
            else if (sample === "transcript_id")
                this.transcript_id_colnum = i;
        }

        if (this.transcript_id_colnum === -1)
        {
            this.error = "No transcript_id column found in the heatmap file.";
            return;
        }

        // Prepare attributes
        this.transcripts = [];

        this.maxValue = NaN; // min/max/avg values for colour scheme & legend
        this.logMax = NaN;
        this.minValue = NaN;
        this.logMin = NaN;

        this.sum = 0;
        this.num_nonzerovals = 0;

        this.export = [];
        this.logExport = [];

        filtered_lines.splice(0, 1);
        this.processFilteredLines(filtered_lines);

        while (slice_index !== -1)
        {
            let arr = await this.filteredLines(slice_index);
            filtered_lines = arr[0];
            slice_index = arr[1];
            this.processFilteredLines(filtered_lines);

            loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;
            this.update_loading_percentage(loading_percentage);
        }

        if (this.transcripts.length === 0)
        {
            this.warning = "The heatmap file does not contain any information on the transcripts of the gene to be visualized.";
            this.average = NaN;
            this.logAverage = NaN;
        }
        else
        {
            if (this.num_nonzerovals === 0)
                this.num_nonzerovals = 1;

            // calculate averages
            this.average = this.sum / this.num_nonzerovals;
            this.logAverage = Math.log10(this.average + 1);
        }

        this.allIsoforms = JSON.parse(JSON.stringify(this.transcripts)); // store copy of transcripts to allow for manually adding/removing rows
        this.valid = true;
    }

    update_loading_msg(loading_msg)
    {
        let event = new CustomEvent("update_loading_msg", {detail: loading_msg});
        document.dispatchEvent(event);
    }

    update_loading_percentage(loading_percentage)
    {
        let event = new CustomEvent("update_loading_percentage", {detail: loading_percentage});
        document.dispatchEvent(event);
    }

    async filteredLines(slice_index, get_samples = false)
    {
        let chunk_size = 5242880; // 5 MB

        let text = await this.getFileChunk(slice_index, slice_index + chunk_size);
        let next_slice_index = -1;

        if (text.length === chunk_size)
        {
            // FIXME: Make this code chunk size independent: A newline must exist for it to work
            let last_newline_index = text.lastIndexOf('\n');
            next_slice_index = slice_index + last_newline_index + 1;
            text = text.substring(0, last_newline_index);
        }

        text = text.replace(/\r/g, '');
        let raw_lines = text.split('\n');
        let filtered_lines = [];

        let first_line_found = !get_samples;
        for (let i = 0; i < raw_lines.length; ++i)
        {
            let line = raw_lines[i];

            // Ignore empty lines
            if (line === "")
                continue;

            if (!first_line_found)
            {
                filtered_lines.push(line);
                first_line_found = true;
                continue;
            }

            // Find all lines that contain the transcript IDs being searched for
            for (let transcript_id of this.transcript_ids)
            {
                if (line.indexOf(transcript_id) !== -1)
                {
                    filtered_lines.push(line);
                    break;
                }
            }
        }

        return [filtered_lines, next_slice_index];
    }

    processFilteredLines(filtered_lines)
    {
        for (let i = 0; i < filtered_lines.length; ++i)
        {
            // Clean up text and separate values
            let entries = filtered_lines[i].replace(/"/g, '').replace(/\r/g, '').split(this.delim);
            if (entries.length !== this.samples.length)
                continue;

            let transcript_id = entries[this.transcript_id_colnum].split('.')[0];

            // Only record expression levels if the transcript is encoded by the gene of interest and the transcript's info has not been recorded before
            if (transcript_id && (this.transcript_ids.indexOf(transcript_id) !== -1) && (this.transcripts.indexOf(transcript_id) === -1))
                this.transcripts.push(transcript_id);
            else
                continue;

            for (let j = 0; j < this.samples.length; ++j)
            {
                if ((j === this.gene_id_colnum) || (j === this.transcript_id_colnum))
                    continue;

                let sample = this.samples[j];
                let value = parseFloat(entries[j]);
                let logValue = Math.log10(value + 1); // for log transform

                if (value)
                {
                    this.sum += value;
                    this.num_nonzerovals += 1;
                }

                if (isNaN(this.maxValue) || value > this.maxValue) this.maxValue = value;
                if (isNaN(this.logMax) || logValue > this.logMax) this.logMax = logValue;
                if (isNaN(this.minValue) || value < this.minValue) this.minValue = value;
                if (isNaN(this.logMin) || logValue < this.logMin) this.logMin = logValue;

                this.export.push({transcript: transcript_id, sample: sample, value: value});
                this.logExport.push({transcript: transcript_id, sample: sample, value: logValue});
            }
        }
    }

    async getFileChunk(start, end)
    {
        let file = this.file;
        let slice = file.slice(start, end);
        let text = await slice.text().then(
            res => res
        ).catch(err =>
        {
            console.log("Error parsing file!");
            console.log(err);
        });
        return text;
    }

    updateTranscriptOrder(transcripts) {
        /**
         * Update transcript order after reordering / removing / adding isoforms.
         * Only one property holds this here, so simple to update this property.
         * 
         * @param {Array<string>} transcripts: list of transcripts 
         */
        this.transcripts = transcripts;
    }
}

/**
 * Class for representing canon data
 */
export class CanonData {
    /**
     * Create a canon data instance
     * jsonData object format determined by ensembl: https://rest.ensembl.org/lookup/id/{geneID}?expand=1;content-type=application/json
     * @param {object} jsonData data returned from API
     */
    constructor(jsonData)
    {
        // Enumerate all exons of each transcript and store coordinates and strand
        this.transcripts = {};
        this.transcripts[jsonData.id] = {};
        for (let i = 0; i < jsonData.Exon.length; ++i) {
            this.transcripts[jsonData.id][i] = [jsonData.Exon[i].start, jsonData.Exon[i].end];
        }
        this.transcripts[jsonData.id].strand = jsonData.Exon[0].strand > 0 ? '+' : '-';

        // Store canonical transcript as an Isoform object
        this.isoformList = [new Isoform(jsonData.id, this.transcripts[jsonData.id])];
        this.orfs = [];

        // let exonCount = this.isoformList[0].exonRanges.length;
        // this.minExons = (exonCount < primaryMinExons) ? exonCount : primaryMinExons;
        
        // Build metagene
        this.mergedRanges = mergeRanges(this.isoformList);
        this.minExons = this.mergedRanges.length;
        
        // Store other data
        this.gene = jsonData.Parent;
        this.start = this.isoformList[0].strand == '+' ? 
            this.mergedRanges[0][0] : 
            this.mergedRanges[this.mergedRanges.length - 1][1];
        this.end = this.isoformList[0].strand == '+' ? 
            this.mergedRanges[this.mergedRanges.length - 1][1] : 
            this.mergedRanges[0][0];
        this.width = Math.abs(this.end - this.start);
        this.strand = jsonData.strand > 0 ? '+' : '-';
        this.display = jsonData.display_name;
    }
}

// Class for representing protein data
export class ProteinData
{
    /**
     * Create a protein data instance with data from InterPro
     * @param {string} accession protein accession taken from Pfam
     */
    constructor([metadata_json, features_json, domains_json], accession, canon_data)
    {
        this.labels = {"canonical": accession, "isoform": accession};
        this.ready = false;
        this.domainMap = {};
        this.motifMap = {};
        this.strand = canon_data.strand;
        this.reversed = this.strand === '+' ? false : true;
        this.C2GDomain = [];

        this.orf = [];
        if (canon_data.orf)
            this.orf = JSON.parse(JSON.stringify(canon_data.orf));

        this.json = {"markups": [], "motifs": []};
        this.readMetadata(metadata_json);
        this.readFeatures(features_json);
        this.readDomains(domains_json);
        this.id = this.json.metadata.identifier;

        this.C2GDomain = [];
        this.C2GRange = [];
        let cdsPosition = 0;
        for (let exon of this.orf)
        {
            if (this.reversed) exon.reverse();
            let exonLength = Math.abs(exon[1] - exon[0]);
            this.C2GDomain.push(cdsPosition);
            cdsPosition += exonLength;
            this.C2GDomain.push(cdsPosition);
            cdsPosition += 1;
            this.C2GRange.push(exon[0]);
            this.C2GRange.push(exon[1]);
        }
        this.C2GMap = d3.scaleLinear().domain(this.C2GDomain).range(this.C2GRange); // CDS to Genome
        this.P2CMap = (coord) => ([3 * (coord - 1), 3 * coord - 1]); // Protein to CDS: 3 nt for each aa

        this.originalData = JSON.parse(JSON.stringify(this.json));
        this.reversedData = JSON.parse(JSON.stringify(this.json));

        this.reverseData();
        this.getMap();
    }

    readMetadata(metadata_json)
    {
        let metadata = metadata_json.metadata;
        if (metadata != null)
        {
            let metadata_obj =
            {
                "database": "uniprot",
                "identifier": metadata.id,
                "organism": metadata.source_organism.fullName,
                "description": metadata.name,
                "taxid": metadata.source_organism.taxId,
                "accession": metadata.accession
            };
            this.json.metadata = metadata_obj;
            this.json.length = metadata.length;
        }
    }

    readFeatures(features_json)
    {
        let valid_features = ["Coil", "mobidb-lite", "SIGNAL_PEPTIDE"];
        let colours = {"Coil": "#a1a0de", "mobidb-lite": "#78d17d", "SIGNAL_PEPTIDE": "#c3a685"}
        for (let valid_feature of valid_features)
        {
            let motifs = features_json[valid_feature];
            if (motifs == null)
                continue;

            let database = motifs.source_database;
            let colour = colours[valid_feature];

            for (let location of motifs.locations)
            {
                for (let fragment of location.fragments)
                {
                    let type = fragment.seq_feature ? fragment.seq_feature : valid_feature;
                    if (valid_feature === "mobidb-lite" && type !== "Consensus Disorder Prediction")
                        continue;

                    let start = fragment.start;
                    let end = fragment.end;

                    let motif_obj =
                    {
                        "display": true,
                        "colour": colour,
                        "start": start,
                        "end": end,
                        "startStyle": "straight",
                        "endStyle": "straight",
                        "metadata":
                        {
                            "database": database,
                            "start": start,
                            "end": end,
                            "type": type
                        }
                    };
                    this.json.motifs.push(motif_obj);
                }
            }
        }
    }

    readDomains(domains_json)
    {
        let valid_types = ["domain", "family"];
        let valid_database = "pfam";

        let results = domains_json.results;
        if (results != null)
        {
            var regions = [];
            for (let result of results)
            {
                if (!result.metadata)
                    continue;
                if ((valid_types.indexOf(result.metadata.type) === -1) || result.metadata.source_database !== valid_database)
                    continue;
                if (!result.proteins)
                    continue;

                for (let protein of result.proteins)
                {
                    if (!protein.entry_protein_locations)
                        continue;

                    for (let entry_protein_location of protein.entry_protein_locations)
                    {
                        if (!entry_protein_location.fragments)
                            continue;

                        for (let fragment of entry_protein_location.fragments)
                        {
                            let region_obj = 
                            {
                                "display": true,
                                "colour": "#4a1c83",
                                "start": fragment.start,
                                "end": fragment.end,
                                "startStyle": "curved",
                                "endStyle": "curved",
                                "metadata":
                                {
                                    "database": result.metadata.source_database,
                                    "start": fragment.start,
                                    "end": fragment.end,
                                    "description": result.metadata.name,
                                    "accession": result.metadata.accession,
                                    "identifier": result.metadata.name.substring(0, result.metadata.name.indexOf(' '))
                                }
                            };
                            regions.push(region_obj);
                        }
                    }
                }
            }
            this.json.regions = regions;
        }
    }

    /**
     * Reverse all coordinates of the reversedData attribute
     */
    reverseData()
    {
        var data = this.reversedData;
        if (data.regions != null)
        {
            for (var region of data.regions)
            {
                var copy = JSON.parse(JSON.stringify(region));
                region.start = data.length - copy.end;
                region.end = data.length - copy.start;
                region.startStyle = copy.endStyle;
                region.endStyle = copy.startStyle;
                region.metadata.start = copy.metadata.end;
                region.metadata.end = copy.metadata.start;
            }
        }

        if (data.motifs != null)
        {
            for (var motif of data.motifs)
            {
                var copy = JSON.parse(JSON.stringify(motif))
                motif.start = data.length - copy.end;
                motif.end = data.length - copy.start;
                motif.startStyle = copy.endStyle;
                motif.endStyle = copy.startStyle;
                motif.metadata.start = copy.metadata.end;
                motif.metadata.end = copy.metadata.start;
            }
        }
    }

    getMap()
    {
        for (let region of this.originalData.regions)
        {
            let start = region.start;
            let end = region.end;
            let region_key = `${region.metadata.database}_${start}_${end}`;

            this.domainMap[region_key] = {};
            this.domainMap[region_key][start] = this.C2GMap(this.P2CMap(start)[0]);
            this.domainMap[region_key][end] = this.C2GMap(this.P2CMap(end)[1]);
        }

        for (let motif of this.originalData.motifs)
        {
            let start = motif.start;
            let end = motif.end;
            let motif_key = `${motif.metadata.type}_${start}_${end}`;

            this.motifMap[motif_key] = {};
            this.motifMap[motif_key][start] = this.C2GMap(this.P2CMap(start)[0]);
            this.motifMap[motif_key][end] = this.C2GMap(this.P2CMap(end)[1]);
        }
    }
}

/**
 * Class to represent a line of a GFF3 file
 */
class GFF3Line
{
    /**
     * Create a GFF3Line instance
     * 
     * @param {string} dataString line of a GFF3 file in string format
     */
    constructor(dataString)
    {
        this.valid = true;

        // extract data from input
        let line = dataString.trim().split('\t');        
        if (line.length < 9)
        {
            this.valid = false;
            return;
        }

        let range_begin = parseInt(line[3]);
        let range_end = parseInt(line[4]);
        let strand = line[6].trim();
        if (isNaN(range_begin) || isNaN(range_end) || ((strand !== '+') && (strand !== '-')))
        {
            this.valid = false;
            return;
        }

        this.chromosome = line[0].trim();
        this.feature = line[2].trim();
        this.range = [range_begin, range_end];
        this.strand = strand;
        //this.frame = line[7];
        this.attributes = {};

        // reconstruct attributed column as JSON
        let info = line[8].split(';'); 

        for (let entry of info)
        {
            if (entry.length <= 1)
                continue;

            entry = entry.trim().replace(/\r/g, '').split('=');
            if (entry.length !== 2)
                continue;

            let attribute_name = decodeURI(entry[0]).trim().toLowerCase();
            let attribute_val = decodeURI(entry[1]);

            if (attribute_name.length === 0)
                continue;

            // If this is the last attribute, there could be a comment following it that needs to be removed
            let comment_index = attribute_val.indexOf('#');
            if (comment_index !== -1)
                attribute_val = attribute_val.substring(0, comment_index).trim();

            if (attribute_val.length === 0)
                continue;

            this.attributes[attribute_name] = attribute_val;
        }
    }
}

/**
 * Class to represent a line of a GTF file
 */
class GTFLine
{
    /**
     * Create a GTFLine instance
     * 
     * @param {string} dataString line of a GTF file in string format
     */
    constructor(dataString)
    {
        this.valid = true;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length < 9)
        {
            this.valid = false;
            return;
        }

        let range_begin = parseInt(line[3]);
        let range_end = parseInt(line[4]);
        let strand = line[6].trim();
        if (isNaN(range_begin) || isNaN(range_end) || ((strand !== '+') && (strand !== '-')))
        {
            this.valid = false;
            return;
        }

        this.chromosome = line[0].trim();
        this.isStringTie = (line[1].toLowerCase().indexOf("stringtie") !== -1);
        this.feature = line[2].trim();
        this.range = [range_begin, range_end];
        this.strand = strand;
        //this.frame = line[7];
        this.attributes = {};

        // reconstruct attributed column as JSON
        let info = line[8].split(';'); 

        for (let entry of info)
        {
            if (entry.length <= 1)
                continue;

            entry = entry.trim().replace(/\r/g, '').split(" ");
            if (entry.length < 2)
                continue;

            let attribute_name = entry[0].toLowerCase();
            let attribute_val = entry[1].replace(/"/g, '');
            this.attributes[attribute_name] = attribute_val;
        }
    }
}

/**
 * Class to represent a line of a BED12 file used to store isoform stack data
 */
class BEDLine
{
    /**
     * Create a BEDLine instance
     *
     * @param {string} dataString line of a BED file in string format
     */
    constructor(dataString)
    {
        this.valid = true;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length !== 12)
        {
            this.valid = false;
            return;
        }

        let start = parseInt(line[1]) + 1;
        let end = parseInt(line[2]);
        let orf_start = parseInt(line[6]) + 1;
        let orf_end = parseInt(line[7]);
        let blockCount = parseInt(line[9]);
        let strand = line[5].trim();
        if (isNaN(start) || isNaN(end) || isNaN(blockCount) || (blockCount === 0) || ((strand !== '+') && (strand !== '-')))
        {
            this.valid = false;
            return;
        }

        // Extract the gene ID and transcript ID
        let split_column = line[3].split('|', 2);
        if (split_column.length !== 2)
            split_column = line[3].split('_', 2);

        if (split_column.length !== 2)
        {
            this.valid = false;
            return;
        }

        this.chromosome = line[0];
        this.start = start;
        this.end = end;

        if (!isNaN(orf_start) && !isNaN(orf_end) && (orf_start < orf_end))
        {
            this.orf_start = orf_start;
            this.orf_end = orf_end;
        }

        this.gene = split_column[1].split('.')[0].trim();
        this.transcript = split_column[0].split('.')[0].trim();
        this.strand = strand;

        this.blockCount = blockCount;
        this.blockSizes = this.buildList(line[10]);
        this.blockStarts = this.buildList(line[11]);

        // The number of block lengths and number of block starting positions must be equal to the number of blocks
        if ((blockCount !== this.blockSizes.length) || (blockCount !== this.blockStarts.length))
            this.valid = false;
    }

    buildList(values)
    {
        let vals = values.split(',');
        let output = [];
        for (let val of vals)
        {
            let intVal = parseInt(val);
            if (Number.isInteger(intVal))
                output.push(intVal);
        }
        return output;
    }
}

/**
 * Class to represent a line of a BED6, BED7, BED8 or BED9 file used to store isoform stack data
 */
class ReducedBEDLine
{
    /**
     * Create a ReducedBEDLine instance
     * The difference between ReducedBEDLine and BEDLine is that the former represents a single exon in a transcript of a gene,
     * while the latter represents all exons of a transcript of a gene
     *
     * @param {string} dataString line of a reduced BED file in string format
     * @param {number} num_columns number of columns in the line; there should only be 6 to 9 columns
     */
    constructor(dataString, num_columns)
    {
        this.valid = true;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length !== num_columns)
        {
            this.valid = false;
            return;
        }

        let start = parseInt(line[1]) + 1;
        let end = parseInt(line[2]);
        let strand = line[5].trim();
        if (isNaN(start) || isNaN(end) || ((strand !== '+') && (strand !== '-')))
        {
            this.valid = false;
            return;
        }

        // If both the thick start and thick end columns are included, check them
        if (num_columns >= 8)
        {
            let orf_start = parseInt(line[6]) + 1;
            let orf_end = parseInt(line[7]);
            if (!isNaN(orf_start) && !isNaN(orf_end) && (orf_start < orf_end))
            {
                this.orf_start = orf_start;
                this.orf_end = orf_end;
            }
        }

        // Extract the gene ID and transcript ID
        let split_column = line[3].split('|', 2);
        if (split_column.length !== 2)
            split_column = line[3].split('_', 2);

        if (split_column.length !== 2)
        {
            this.valid = false;
            return;
        }

        this.chromosome = line[0];
        this.start = start;         // The exon start
        this.end = end;             // The exon end
        this.gene = split_column[1].split('.')[0].trim();
        this.transcript = split_column[0].split('.')[0].trim();
        this.strand = strand;
    }
}

/**
 * Class to represent a line of a BED4 or BED5 file used to store isoform stack data
 */
class MinimalBEDLine
{
    /**
     * Create a MinimalBEDLine instance
     * The difference between MinimalBEDLine and ReducedBEDLine is that the former does not have the gene strand column,
     * while the latter does
     *
     * @param {string} dataString line of a minimal BED file in string format
     * @param {number} num_columns number of columns in the line; there should only be 4 to 5 columns
     */
    constructor(dataString, num_columns)
    {
        this.valid = true;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length !== num_columns)
        {
            this.valid = false;
            return;
        }

        let start = parseInt(line[1]) + 1;
        let end = parseInt(line[2]);
        if (isNaN(start) || isNaN(end))
        {
            this.valid = false;
            return;
        }

        // Extract the gene ID and transcript ID
        let split_column = line[3].split('|', 2);
        if (split_column.length !== 2)
            split_column = line[3].split('_', 2);

        if (split_column.length !== 2)
        {
            this.valid = false;
            return;
        }

        this.chromosome = line[0];
        this.start = start;         // The exon start
        this.end = end;             // The exon end
        this.gene = split_column[1].split('.')[0].trim();
        this.transcript = split_column[0].split('.')[0].trim();
    }
}

/**
 * Class to represent a line of a BED file used to store RNA modification sites data
 */
class RNAModifSitesBEDLine
{
    /**
     * Create a RNAModifSitesBEDLine instance
     * 
     * @param {string} dataString line of an RNA modification sites BED file in string format
     * @param {Number} num_columns number of columns in the BED file
     */
    constructor(dataString, num_columns)
    {
        this.valid = true;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length !== num_columns)
        {
            this.valid = false;
            return;
        }

        let start = parseInt(line[1]) + 1;
        let end = parseInt(line[2]);
        if (isNaN(start) || isNaN(end) || (start !== end))
        {
            this.valid = false;
            return;
        }

        this.start = start;
        this.end = end;
        this.gene = line[3].split('.')[0].trim();

        // Reject lines containing empty genes
        if (this.gene.length === 0)
        {
            this.valid = false;
            return;
        }
    }
}

/**
 * Class for representing an isoform
 */
class Isoform {
    /**
     * Create an isoform instance
     * 
     * @param {string} label the Ensembl transcript ID for the isoform
     * @param {object} exons enumeration of exons storing coordinates and strand
     */
    constructor(label, exons) {
        // Store data
        this.transcriptID = label;
        this.exons = {}
        for (let key of Object.keys(exons)) {
            key = parseInt(key);
            if (!isNaN(key)) {
                this.exons[key] = exons[key];
            }
        }
        this.strand = exons.strand;
        this.exonRanges = [];
        for (let value of Object.values(this.exons)) {
            this.exonRanges.push(value);
        }
        this.start = this.strand == '+' ? this.exonRanges[0][0] : this.exonRanges[this.exonRanges.length - 1][1];
        this.end = this.strand == '+' ? this.exonRanges[this.exonRanges.length - 1][1] : this.exonRanges[0][0];
        this.length = Math.abs(this.end - this.start);
        this.orf = [];

        this.user_orf = [];
        if (exons.user_orf && (exons.user_orf.length !== 0))
            this.user_orf = JSON.parse(JSON.stringify(exons.user_orf));
    }
}

/**
 * Class for representing the data of all other Ensembl isoforms
 */
export class OtherIsoformData
{
    constructor(transcripts, all_stack_isoform_ids, isoform_list)
    {
        this.transcripts = {};
        this.id_to_symbol = {};
        this.strand = '';
        this.start = -1;
        this.end = -1;

        for (let transcript of transcripts)
        {
            if (!transcript.Exon || !transcript.id)
                continue;

            let transcript_id = transcript.id;
            if (all_stack_isoform_ids.indexOf(transcript_id) !== -1)
                continue;

            let symbol = transcript.display_name;
            if (!symbol)
                symbol = "Novel";

            this.id_to_symbol[transcript_id] = symbol;

            let strand = (transcript.strand === 1) ? '+' : '-';
            if (!this.strand)
                this.strand = strand;

            let transcript_start = transcript.start;
            let transcript_end = transcript.end;

            // The genomic start and end coordinates of the other isoform data are based on the assumption that:
            // 1. For forward strands, the start is smaller than the end
            // 2. For reverse strands, the start is bigger than the end
            // However, the Ensembl API returns transcript data where the start coordinate is always smaller than the end coordinate regardless
            // of its strandedness, which can be unintuitive
            // So, swap the transcript start and end coordinates if it's encoded on the reverse strand to make the following calculations work
            // as intended
            if ((this.strand === '-') && (transcript_start < transcript_end))
            {
                let temp = transcript_start;
                transcript_start = transcript_end;
                transcript_end = temp;
            }

            if (this.strand === '+')
            {
                if (this.start === -1)
                    this.start = transcript_start;
                else
                    this.start = Math.min(transcript_start, this.start);

                if (this.end === -1)
                    this.end = transcript_end;
                else
                    this.end = Math.max(transcript_end, this.end);
            }
            else
            {
                if (this.start === -1)
                    this.start = transcript_start;
                else
                    this.start = Math.max(transcript_start, this.start);

                if (this.end === -1)
                    this.end = transcript_end;
                else
                    this.end = Math.min(transcript_end, this.end);
            }

            this.transcripts[transcript_id] = {};
            let exons = transcript.Exon;
            if (strand === '-')
                exons.reverse();

            for (let i = 0; i < exons.length; ++i)
            {
                let exon = exons[i];
                let exon_start = exon.start;
                let exon_end = exon.end;
                this.transcripts[transcript_id][i] = [exon_start, exon_end];
            }
            this.transcripts[transcript_id].strand = this.strand;
        }

        this.transcriptOrder = prioritiseKnownTranscripts(Object.keys(JSON.parse(JSON.stringify(this.transcripts))));
        this.isoformList = [];
        for (let i = 0; i < this.transcriptOrder.length; ++i)
            this.isoformList.push(new Isoform(this.transcriptOrder[i], this.transcripts[this.transcriptOrder[i]]));

        let all_isoforms = JSON.parse(JSON.stringify(this.isoformList));
        all_isoforms = all_isoforms.concat(JSON.parse(JSON.stringify(isoform_list)));
        this.mergedRanges = mergeRanges(all_isoforms);

        this.allIsoforms = JSON.parse(JSON.stringify(this.isoformList));
    }
}

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
        let exon_ranges = JSON.parse(JSON.stringify(isoform.exonRanges));
        exon_ranges.sort((exon0, exon1) => exon0[0] - exon1[0]);

        for (let i = 0; i < exon_ranges.length - 1; ++i)
        {
            let exon0 = exon_ranges[i];
            let exon1 = exon_ranges[i + 1];

            let spliced_region_start = exon0[1];
            let spliced_region_end = exon1[0];

            let spliced_region = JSON.stringify([spliced_region_start, spliced_region_end]);
            spliced_regions_dict[spliced_region] = [];

            if ((is_strand_positive && (i !== 0)) || (!is_strand_positive && (i !== exon_ranges.length - 2)))
                spliced_regions_from_non_first_exon[spliced_region] = [];

            if (spliced_region_counts[spliced_region])
                spliced_region_counts[spliced_region] += 1;
            else
                spliced_region_counts[spliced_region] = 1;
        }

        if (exon_ranges.length >= 2)
        {
            let first_exon_boundary = JSON.parse(JSON.stringify(exon_ranges[0]));
            let spliced_region_from_first_exon = JSON.stringify([first_exon_boundary[1], exon_ranges[1][0]]);
            if (!is_strand_positive)
            {
                first_exon_boundary = JSON.parse(JSON.stringify(exon_ranges[exon_ranges.length - 1]));
                spliced_region_from_first_exon = JSON.stringify([exon_ranges[exon_ranges.length - 2][1], first_exon_boundary[0]]);   
            }
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
            let exon_ranges = JSON.parse(JSON.stringify(isoform.exonRanges));
            exon_ranges.sort((exon0, exon1) => exon0[0] - exon1[0]);

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
                if (((is_strand_positive && i !== 0) || (!is_strand_positive && i !== exon_ranges.length - 1)) &&
                    ((spliced_region_start < exon_start) && (exon_start < spliced_region_end)))
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
                    if (overlap.length !== 0)
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
                let exon_ranges = JSON.parse(JSON.stringify(isoform.exonRanges));
                exon_ranges.sort((exon0, exon1) => exon0[0] - exon1[0]);

                let is_spliced_region_in_transcript = false;
                for (let i = 0; i < exon_ranges.length - 1; ++i)
                {
                    let exon0 = exon_ranges[i];
                    let exon1 = exon_ranges[i + 1];

                    if ((exon0[1] === spliced_region_start) && (exon1[0] === spliced_region_end))
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
 * Calculate the relative height of each spliced region in the set of spliced regions for an isoform set (excludes constitutive junctions)
 *
 * @param {Array<Isoform>} spliced_regions The set of spliced regions
 * @returns {Array<Array<number>>} A list of decimals, where each is the relative height of the corresponding spliced region 
 */
export function calculateRelativeHeights(spliced_regions)
{
    let relative_heights = [];

    // Strategy to drawing easily distinguishable arcs (taken from JunctionSeq):
    // For each spliced region, consider the number of spliced regions contained within it ('num_under') and the number outside of it ('num_over')
    // The lowest arc would be for a spliced region that is contained within all other spliced regions
    // The highest arc would be for a spliced region that contains all other spliced regions

    for (let [spliced_region_start, spliced_region_end, is_constitutive] of spliced_regions)
    {
        if (is_constitutive)
        {
            relative_heights.push(-1);
            continue;
        }

        let num_under = -1; // -1 is used because we don't count the spliced region itself, we only consider all other spliced regions
        let num_over = -1;

        for (let [other_spliced_region_start, other_spliced_region_end, other_is_constitutive] of spliced_regions)
        {
            if (other_is_constitutive)
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
 * Calculate the relative height of each spliced region in the set of spliced regions for an isoform set, INCLUDING constitutive junctions
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

/**
 * Calculate metagene for an isoform set
 * 
 * @param {Array<Isoform>} isoformList List of all isoforms in the set
 * @returns {Array<Array<number>>} List of coordinates for exonic regions in the metagene
 */
export function mergeRanges(isoformList) {
    let temp = [],
    exons = [],
    merged = [];

    // extract all exons from isoforms
    for (let isoform of isoformList) {
        for (let exon of isoform.exonRanges) {
            if (exons.length == 0 || !checkInclusion(exon, exons)) exons.push(exon);
        }
    }

    // compute unions between exon pairs and store in temporary list
    for (let exon of exons) {
        if (temp.length == 0) {
            temp.push(exon);
        } else {
            for (let i = 0; i < temp.length; ++i) {
                let currentUnion = union(temp[i], exon);
                if (currentUnion.length != 0) {
                    temp.splice(i, 1);
                    exon = currentUnion;
                    i = -1; continue;
                }
            }
            temp.push(exon);
        }
    }

    // collect all unique coordinate pairs from temporary list, sort and return
    for (let i = 0; i < temp.length; ++i) {
        let exon = temp[i];
        if (!checkInclusion(exon, merged)) merged.push(exon);
    }
    merged.sort((range1, range2) => (range1[0] - range2[0]));
    return merged;
}

/**
 * Calculate the union of two overlapping exons
 * 
 * @param {Array<number>} exon1 The start and end coordinates of the first exon
 * @param {Array<number>} exon2 The start and end coordinates of the second exon
 * @returns {Array<number>} Coordinates of the union (empty if no overlap found)
 */
function union(exon1, exon2)
{
    let start1 = exon1[0], 
    start2 = exon2[0],
    end1 = exon1[1],
    end2 = exon2[1],
    output = [];

    if (start1 < end2 && start2 < end1) {
        output = [Math.min(start1, start2), Math.max(end1, end2)];
    }
    return output;
}

/**
 * Calculate the intersection of between the ORF of a transcript and one of its exons
 * 
 * @param {Array<number>} orf The start and end coordinates of the ORF
 * @param {Array<number>} exon The start and end coordinates of the exon
 * @returns {Array<number>} Coordinates of the intersection (empty if none found)
 */
function intersection(orf, exon)
{
    let orf_start = orf[0], 
    exon_start = exon[0],
    orf_end = orf[1],
    exon_end = exon[1],
    output = [];

    if ((exon_end < orf_start) || (exon_start > orf_end))
        return output;

    output = [Math.max(orf_start, exon_start), Math.min(orf_end, exon_end)];
    if (output[0] === output[1])
        return [];

    return output;
}

/**
 * Check if a list has a specified entry in it
 * 
 * @param {*} entry The entry to search for
 * @param {Array<*>} list The list to search
 * @returns {boolean} Boolean value describing inclusion
 */
function checkInclusion(entry, list) {
    let output = false;
    for (let value of list) {
        if (entry.every((val, index) => val === value[index])) {
            output = true;
            break;
        }
    }
    return output;
}