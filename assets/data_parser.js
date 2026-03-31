/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// Contains classes which can parse input data, such as the contents of gtf file and return objects
// which contain data useful for the application such as start and end points of genes.

import * as d3 from 'd3';   // used for its scaling functions

/**
 * Update the message to be displayed in the loading data popup.
 *
 * @param {String} loading_msg the message to display
 */
function update_loading_msg(loading_msg)
{
    let event = new CustomEvent("update_loading_msg", {detail: loading_msg});
    document.dispatchEvent(event);
}

/**
 * Update the fill percentage of the loading bar in the loading data popup.
 *
 * @param {Number} loading_percentage the fill percentage of the loading bar
 */
function update_loading_percentage(loading_percentage)
{
    let event = new CustomEvent("update_loading_percentage", {detail: loading_percentage});
    document.dispatchEvent(event);
}

/**
 * Return a chunk of text from an opened file.
 *
 * @param {File} file the opened file to read from
 * @param {Number} start the index of the first byte of the file to read from
 * @param {Number} end the index after the last byte of the file to read to
 * @returns {String} the chunk of text read from the file
 */
async function getFileChunk(file, start, end)
{
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

/**
 * Return filtered lines from a stack data file and the next index of the file to read from.
 *
 * @param {File} file the stack data file to read from
 * @param {Number} slice_index the index of the first byte of the file to read from
 * @param {String} needle a string that must be present in filtered lines
 * @param {Boolean} is_case_insensitive whether the line filtering is case-insensitive
 * @returns {[Array<String>, Number]} the filtered lines and the next index of the file to read from
 */
async function filteredStackLines(file, slice_index, needle = '', is_case_insensitive = false)
{
    let chunk_size = 5242880; // 5 MB

    let text = await getFileChunk(file, slice_index, slice_index + chunk_size);
    let next_slice_index = -1;

    if (text.length === chunk_size)
    {
        // FIXME: Make this code chunk size independent: A newline must exist for it to work
        let last_newline_index = text.lastIndexOf('\n');
        next_slice_index = slice_index + last_newline_index + 1;
        text = text.substring(0, last_newline_index);
    }

    text = text.replace(/\r/g, '');
    let lines = text.split('\n');
    let filtered_lines = [];

    let needle_to_search = (!needle ? '' : needle);
    if (is_case_insensitive)
        needle_to_search = needle_to_search.toUpperCase();

    for (let i = 0; i < lines.length; ++i)
    {
        let line = lines[i];

        // Ignore empty lines and comments
        if ((line === "") || (line[0] === '#'))
            continue;

        // Performing a case insensitive search?
        let temp_line = line;
        if (is_case_insensitive)
            temp_line = temp_line.toUpperCase();

        if (!needle_to_search || (temp_line.indexOf(needle_to_search) !== -1))
            filtered_lines.push(line);
    }

    return [filtered_lines, next_slice_index];
}

/**
 * Return filtered lines from a heatmap data file and the next index of the file to read from.
 *
 * @param {File} file the heatmap data file to read from
 * @param {Number} slice_index the index of the first byte of the file to read from
 * @param {Array<String>} needles an array of strings where at least one must be present in filtered lines
 * @param {Boolean} get_samples if true, extract the first line of the file and consider it to represent sample labels
 * @param {String?} modif_sites_gene if set, find lines containing this string and assume the file contains RNA modification sites heatmap data
 * @returns {[Array<String>, Number]} the filtered lines and the next index of the file to read from
 */
async function filteredHeatmapLines(file, slice_index, needles = [], get_samples = false, modif_sites_gene = null)
{
    let chunk_size = 5242880; // 5 MB

    let text = await getFileChunk(file, slice_index, slice_index + chunk_size);
    let next_slice_index = -1;

    if (text.length === chunk_size)
    {
        // FIXME: Make this code chunk size independent: A newline must exist for it to work
        let last_newline_index = text.lastIndexOf('\n');
        next_slice_index = slice_index + last_newline_index + 1;
        text = text.substring(0, last_newline_index);
    }

    text = text.replace(/("|\r)/g, '');
    let lines = text.split('\n');
    let filtered_lines = [];

    let first_line_found = !get_samples;
    for (let i = 0; i < lines.length; ++i)
    {
        let line = lines[i];

        // Ignore empty lines
        if (line === "")
            continue;

        // Looking for the sample names of the heatmap data file?
        if (!first_line_found)
        {
            filtered_lines.push(line);
            first_line_found = true;
            continue;
        }

        // Process non-RNA modification sites heatmap data
        if (!modif_sites_gene)
        {
            for (let j = 0; j < needles.length; ++j)
            {
                if (line.indexOf(needles[j]) !== -1)
                {
                    filtered_lines.push(line);
                    break;
                }
            }
        }
        // Process RNA modification sites heatmap data
        else
        {
            if (line.indexOf(modif_sites_gene) === -1)
                continue;

            for (let j = 0; j < needles.length; ++j)
            {
                if (line.indexOf(needles[j] - 1) !== -1)
                {
                    filtered_lines.push(line);
                    break;
                }
            }
        }
    }

    return [filtered_lines, next_slice_index];
}

/**
 * Return a list of integers from a BED file list column (i.e. blockSizes or blockStarts).
 *
 * @param {String} values the list column
 * @returns {Array<Number>} list of integers from the column
 */
function buildBEDList(values)
{
    let vals = values.split(',');
    let output = [];
    for (let i = 0; i < vals.length; ++i)
    {
        let intVal = parseInt(vals[i]);
        if (Number.isInteger(intVal))
            output.push(intVal);
    }
    return output;
}

/**
 * Return a reordered list of transcripts where known ones (with the 'ENS' prefix) come before novel ones.
 *
 * @param {Array<String>} transcripts list of transcripts
 * @returns {Array<String>} reordered list of transcripts
 */
function prioritiseKnownTranscripts(transcripts)
{
    let ens_transcripts = [];
    let non_ens_transcripts = [];

    for (let i = 0; i < transcripts.length; ++i)
    {
        let transcript = transcripts[i];
        if (transcript.indexOf("ENS") === 0)
            ens_transcripts.push(transcript);
        else
            non_ens_transcripts.push(transcript);
    }

    return ens_transcripts.concat(non_ens_transcripts);
}

export class PeptideData
{
    /**
     * Create a peptide data instance
     *
     * @param {string} file the input file
     * @param {Array<string>} transcript_ids an array of transcript IDs for the gene to be visualized
     */
    constructor(file, transcript_ids)
    {
        this.valid = false; // set to true at the end
        this.error = "";
        this.warning = "";
        this.file = file;
        this.transcript_ids = transcript_ids;
    }

    async parseFile()
    {
        let file = this.file;

        if (!file || file.size < 10)
        {
            this.error = "Please upload a peptide data file.";
            return;
        }

        if (file.size > 536870912)
        {
            this.error = "Peptide data file size should be less than 500 MB.";
            return;
        }

        let filename = file.name;
        if (!filename)
        {
            this.error = "Filename for peptide data is empty.";
            return;
        }

        let filename_dot_index = filename.lastIndexOf('.');
        if (filename_dot_index === -1)
        {
            this.error = "Peptide data file does not contain a file extension. Please specify the correct file extension in its filename.";
            return;
        }

        this.is_bed_type_unknown = false;
        this.is_reduced_bed = false;
        this.num_reduced_bed_columns = -1;

        filename = filename.toLowerCase();
        if (filename.endsWith(".bed12"))
            this.filetype = "BED";
        else if (filename.endsWith(".bed"))
        {
            this.filetype = "BED";
            this.is_bed_type_unknown = true;
        }
        else
        {
            let file_extension = filename.substring(filename_dot_index + 1);

            // Is this a reduced BED file? (BED4 to BED9)
            let valid_column_numbers = [4, 5, 6, 7, 8, 9];
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

            if (this.num_reduced_bed_columns === -1)
            {
                this.error = "Invalid peptide data file extension.";
                return;
            }
        }

        // The user has uploaded a .bed file, so determine the number of columns it should have
        if (this.is_bed_type_unknown)
        {
            let slice_index = 0;
            while (slice_index !== -1)
            {
                let arr = await filteredStackLines(this.file, slice_index);
                let filtered_lines = arr[0];
                slice_index = arr[1];

                if (filtered_lines.length === 0)
                    continue;

                let num_columns = filtered_lines[0].split('\t').length;
                if ((num_columns <= 3) || (num_columns === 10) || (num_columns === 11) || (num_columns >= 13))
                {
                    this.error = "Incorrect number of columns found in the uploaded peptide data BED file. Please upload a BED4 to BED9 file or a BED12 file.";
                    break;
                }

                // If there are 12 columns, this is a BED12 file
                if (num_columns === 12)
                {
                    this.is_bed_type_unknown = false;
                    break;
                }

                // If there are 4 to 9 columns, this is a reduced BED file
                this.is_reduced_bed = true;
                this.num_reduced_bed_columns = num_columns;
                this.is_bed_type_unknown = false;
                break;
            }

            if (this.is_bed_type_unknown)
            {
                if (!this.error)
                    this.error = "The uploaded peptide data BED file does not contain any valid BED line. Please upload a BED4 to BED9 file or a BED12 file.";
                return;
            }
        }

        this.transcripts = {};

        /* Structure: [array of genomic start and end coordinates the peptide's mapped to] */
        this.peptide_info = {};

        let parser_type = this.filetype;
        let loading_msg = `Getting peptides from ${this.filetype} file...`;

        update_loading_msg(loading_msg);

        let slice_index = 0;
        while (slice_index !== -1)
        {
            let arr = await filteredStackLines(this.file, slice_index);
            let filtered_lines = arr[0];
            slice_index = arr[1];

            let loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;

            if (parser_type === "BED")
            {
                if (this.is_reduced_bed)
                    this.peptidesFromReducedBED(filtered_lines);
                else
                    this.peptidesFromBED(filtered_lines);
            }

            update_loading_percentage(loading_percentage);
        }

        if ((parser_type === "BED") && this.is_reduced_bed)
        {
            for (let transcript of Object.keys(this.transcripts))
            {
                for (let peptide of Object.keys(this.transcripts[transcript]))
                {
                    let stringified_coords = JSON.stringify(this.transcripts[transcript][peptide]);
                    if (!(peptide in this.peptide_info))
                        this.peptide_info[peptide] = [stringified_coords];
                    else if (this.peptide_info[peptide].indexOf(stringified_coords) === -1)
                        this.peptide_info[peptide].push(stringified_coords);
                }
            }
        }

        this.peptides = Object.keys(this.peptide_info);
        this.peptideOrder = JSON.parse(JSON.stringify(this.peptides));
        this.valid = true;

        this.peptides.sort();

        this.peptide_to_transcripts = {};

        for (let peptide of this.peptides)
            this.peptide_to_transcripts[peptide] = [];

        for (let transcript of Object.keys(this.transcripts))
            for (let peptide of Object.keys(this.transcripts[transcript]))
                if (this.peptide_to_transcripts[peptide].indexOf(transcript) === -1)
                    this.peptide_to_transcripts[peptide].push(transcript);

        for (let peptide of Object.keys(this.peptide_to_transcripts))
            this.peptide_to_transcripts[peptide].sort((a, b) => a.localeCompare(b, "en", {numeric: true, sensitivity: "case"}));

        this.no_peptides = (Object.keys(this.transcripts).length === 0) || (this.peptides.length === 0);
        if (this.no_peptides)
            this.warning = "No peptides are mapped to the transcripts of the selected gene. Peptide visualization disabled for this gene.";

        delete this.transcripts;
    }

    peptidesFromBED(lines)
    {
        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let line = new PeptideBEDLine(lines[line_index]);
            if (!(line.valid))
                continue;

            let transcript = line.transcript;
            if (!transcript)
                continue;

            let peptide = line.peptide;
            if (!peptide)
                continue;

            // Only consider transcripts of the selected gene
            if (this.transcript_ids.indexOf(transcript) === -1)
                continue;

            let peptide_blocks = [];
            for (let i = 0; i < line.blockCount; ++i)
            {
                let start = line.start + line.blockStarts[i];
                let size = line.blockSizes[i];
                let range = [start, start + size - 1];

                let isFound = false;
                for (let [block_start, block_end] of peptide_blocks)
                {
                    if (block_start === range[0] && block_end === range[1])
                    {
                        isFound = true;
                        break;
                    }
                }

                if (!isFound)
                    peptide_blocks.push(range);
            }

            // Keep a record of which peptides each transcript is associated with
            if (!(transcript in this.transcripts))
            {
                this.transcripts[transcript] = {};
                this.transcripts[transcript][peptide] = [];
            }
            else if (!(peptide in this.transcripts[transcript]))
                this.transcripts[transcript][peptide] = [];
            else
                continue;

            let stringified_coords = JSON.stringify(peptide_blocks);
            if (!(peptide in this.peptide_info))
                this.peptide_info[peptide] = [stringified_coords];
            else if (this.peptide_info[peptide].indexOf(stringified_coords) === -1)
                this.peptide_info[peptide].push(stringified_coords);
        }
    }

    peptidesFromReducedBED(lines)
    {
        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let line = new PeptideReducedBEDLine(lines[line_index], this.num_reduced_bed_columns);
            if (!(line.valid))
                continue;

            let transcript = line.transcript;
            if (!transcript)
                continue;

            let peptide = line.peptide;
            if (!peptide)
                continue;

            // Only consider transcripts of the selected gene
            if (this.transcript_ids.indexOf(transcript) === -1)
                continue;

            // Keep a record of which peptides each transcript is associated with
            if (!(transcript in this.transcripts))
            {
                this.transcripts[transcript] = {};
                this.transcripts[transcript][peptide] = [];
            }
            else if (!(peptide in this.transcripts[transcript]))
                this.transcripts[transcript][peptide] = [];

            let peptide_block = [line.start, line.end];

            let isFound = false;
            let peptide_blocks = this.transcripts[transcript][peptide];
            for (let [block_start, block_end] of peptide_blocks)
            {
                if (block_start === range[0] && block_end === range[1])
                {
                    isFound = true;
                    break;
                }
            }

            if (!isFound)
                this.transcripts[transcript].push(peptide_block);
        }
    }
}

export class PeptideCountsData
{
    /**
     * Create a peptide counts data instance
     *
     * @param {string} file the input file
     * @param {string} peptides peptide sequences for the gene of interest
     */
    constructor(file, peptides)
    {
        this.valid = false; // set to true at the end
        this.error = "";
        this.warning = "";
        this.file = file;
        this.peptides = peptides;
    }

    async parseFile()
    {
        let file = this.file;

        if (!file || file.size < 10)
        {
            this.error = "Please upload a peptide counts file.";
            return;
        }

        if (file.size > 536870912)
        {
            this.error = "Peptide counts file size should be less than 500 MB.";
            return;
        }

        let filename = file.name;
        if (!filename)
        {
            this.error = "Filename for peptide counts data is empty.";
            return;
        }

        if (filename.indexOf('.') === -1)
        {
            this.error = "Peptide counts file does not contain a file extension. Please specify the correct file extension in its filename.";
            return;
        }

        // Determine delimiter
        filename = filename.toLowerCase();
        if (filename.endsWith(".csv"))
            this.delim = ',';
        else if (filename.endsWith(".tsv") || filename.endsWith(".txt"))
            this.delim = '\t';
        else
        {
            this.error = "Invalid peptide counts file extension. Please upload a CSV (comma-separated values) or tab-separated text (TSV / TXT) file.";
            return;
        }

        let slice_index = 0;
        let filtered_lines = [];
        let arr = await filteredHeatmapLines(this.file, slice_index, this.peptides, true);

        filtered_lines = arr[0];
        slice_index = arr[1];

        if (filtered_lines.length === 0)
        {
            this.error = "No relevant data lines found in the peptide counts file. Check if it contains data for the gene being visualized or if its formatting is incorrect.";
            return;
        }

        let first_line = filtered_lines[0];
        this.samples = first_line.split(this.delim).map((sample) => sample.trim());

        if (this.samples.length < 2)
        {
            this.error = "The first line of the peptide counts file has less than 2 data columns. The file must have at least 2 data columns.";
            return;
        }

        if (this.samples.some((sample) => sample.length === 0))
        {
            this.error = "Empty column name found in the peptide counts file. Please ensure all column names provided contain at least one non-whitespace character.";
            return;
        }

        if (new Set(this.samples.map((sample) => sample.toLowerCase())).size !== this.samples.length)
        {
            this.error = "Duplicate column names found in the peptide counts file. Please ensure all column names provided are unique.";
            return;
        }

        let forbidden_column_names = ["1/k0", "1/k0", "all mapped proteins", "all mapped genes", "average.missed.tryptic.cleavages", "average.peptide.charge", "average.peptide.length", "best.fr.mz", "best.fr.mz.delta", "channel", "channel.evidence", "channel.l", "channel.q.value", "corr", "cscore", "decoy", "decoy.cscore", "decoy.evidence", "delta", "delta", "description", "empirical.quality", "evidence", "exclude.from.quant", "excludefromassay", "file.name", "filename", "first.protein.description", "fragment.charge", "fragment.correlations", "fragment.info", "fragment.loss.type", "fragment.quant.corrected", "fragment.quant.raw", "fragment.series.number", "fragment.sum", "fragment.type", "fragmentcharge", "fragmentlosstype", "fragmentseriesnumber", "fragmenttype", "fullunimodpeptidename", "fwhm", "fwhm.rt", "fwhm.scans", "gene", "gene.names", "genes", "genes.maxlfq", "genes.maxlfq.quality", "genes.maxlfq.unique", "genes.maxlfq.unique.quality", "genes.normalised", "genes.quantity", "genes.topn", "gg.q.value", "global.peptidoform.q.value", "global.pg.q.value", "global.q.value", "intensities", "ion.mobility", "irt", "label.ratio", "lib.peptidoform.q.value", "lib.pg.q.value", "lib.ptm.site.confidence", "lib.q.value", "libraryintensity", "m/z", "mass.evidence", "median.mass.acc.ms1", "median.mass.acc.ms1.corrected", "median.mass.acc.ms2", "median.mass.acc.ms2.corrected", "median.rt.prediction.acc", "modification", "modified.sequence", "modifiedpeptide", "ms.level", "ms1.apex.area", "ms1.apex.mz.delta", "ms1.area", "ms1.normalised", "ms1.profile.corr", "ms1.signal", "ms1.total.signal.after", "ms1.total.signal.before", "ms2.scan", "ms2.scan", "ms2.signal", "n.proteotypic.sequences", "n.sequences", "normalisation.factor", "normalisation.instability", "normalisation.noise", "peptidegrouplabel", "peptidesequence", "peptidoform.q.value", "pg.maxlfq", "pg.maxlfq.quality", "pg.normalised", "pg.pep", "pg.q.value", "pg.quantity", "pg.topn", "pgqvalue", "precursor.charge", "precursor.id", "precursor.lib.index", "precursor.mz", "precursor.normalised", "precursor.quantity", "precursorcharge", "precursormz", "precursors.identified", "predicted.iim", "predicted.im", "predicted.irt", "predicted.rt", "probability", "product.mz", "productmz", "protein", "protein.group", "protein.id", "protein.ids", "protein.index.in.group", "protein.name", "protein.names", "protein.q.value", "protein.sites", "proteingroup", "proteinname", "proteins.identified", "proteotypic", "ptm.site.confidence", "q.value", "quantity.quality", "qvalue", "relative.intensity", "residue", "retention.times", "rt.start", "rt.stop", "run", "run.index", "sequence", "site", "site.occupancy.probabilities", "theoretical.mz", "total.quantity", "translated.q.value", "uniprotid", "window.high", "window.low"];

        this.peptide_sequence_colnum = -1;
        this.labels = [];

        for (let i = 0; i < this.samples.length; ++i)
        {
            let sample = this.samples[i].toLowerCase();
            if (((sample === "peptide_sequence") || (sample === "stripped.sequence") || (sample === "peptide")) && (this.peptide_sequence_colnum === -1))
                this.peptide_sequence_colnum = i;
            else if (forbidden_column_names.indexOf(sample) === -1)
                this.labels.push(this.samples[i]);
        }

        if (this.peptide_sequence_colnum === -1)
        {
            this.error = "No peptide sequence column found in the peptide counts file.";
            return;
        }

        this.labelOrder = JSON.parse(JSON.stringify(this.labels));

        // Prepare attributes
        this.maxValue = NaN; // min/max/avg values for colour scheme & legend
        this.minValue = NaN;

        this.sum = 0;
        this.num_nonzerovals = 0;

        this.export = {};

        let loading_percentage = 0;
        let loading_msg = "Getting peptide counts...";
        update_loading_msg(loading_msg);
        update_loading_percentage(loading_percentage);

        filtered_lines.splice(0, 1);
        this.processFilteredLines(filtered_lines);

        while (slice_index !== -1)
        {
            loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;
            update_loading_percentage(loading_percentage);

            let arr = await filteredHeatmapLines(this.file, slice_index, this.peptides);
            filtered_lines = arr[0];
            slice_index = arr[1];
            this.processFilteredLines(filtered_lines);
        }

        loading_percentage = 100;
        update_loading_percentage(loading_percentage);

        this.valid = true;

        this.no_peptide_counts = (Object.keys(this.export).length === 0);
        if (this.no_peptide_counts)
            this.warning = "The peptide counts file does not contain any information on the transcripts' peptides. Peptide counts visualization disabled.";
        else
        {
            if (this.num_nonzerovals === 0)
                this.num_nonzerovals = 1;

            this.average = this.sum / this.num_nonzerovals; // calculate averages
        }
    }

    processFilteredLines(filtered_lines)
    {
        for (let i = 0; i < filtered_lines.length; ++i)
        {
            // Clean up text and separate values
            let entries = filtered_lines[i].split(this.delim);
            if (entries.length !== this.samples.length)
                continue;

            let peptide = entries[this.peptide_sequence_colnum];
            if (this.peptides.indexOf(peptide) === -1)
                continue;

            for (let j = 0; j < this.samples.length; ++j)
            {
                let sample = this.samples[j];
                if (this.labels.indexOf(sample.toLowerCase()) === -1)
                    continue;

                let value = parseFloat(entries[j]);
                if (value)
                {
                    this.sum += value;
                    this.num_nonzerovals += 1;
                }

                if (isNaN(this.maxValue) || value > this.maxValue) this.maxValue = value;
                if (isNaN(this.minValue) || value < this.minValue) this.minValue = value;

                if (!this.export[peptide])
                {
                    this.export[peptide] = {};
                    this.export[peptide][sample] = value;
                }
                else if (this.export[peptide][sample] === undefined)
                    this.export[peptide][sample] = value;
            }
        }
    }
}

export class RNAModifSitesData
{
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

        let filename_dot_index = filename.lastIndexOf('.');
        if (filename_dot_index === -1)
        {
            this.error = "RNA modification sites data file does not contain a file extension. Please specify the correct file extension in its filename.";
            return;
        }

        this.is_bed_type_unknown = false;
        this.num_bed_columns = -1;

        filename = filename.toLowerCase();
        if (filename.endsWith(".bed"))
        {
            this.filetype = "BED";
            this.is_bed_type_unknown = true;
        }
        else
        {
            let file_extension = filename.substring(filename_dot_index + 1);

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
                let arr = await filteredStackLines(this.file, slice_index, this.gene);
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

        update_loading_msg(loading_msg);

        let slice_index = 0;
        while (slice_index !== -1)
        {
            let arr = await filteredStackLines(this.file, slice_index, this.gene);
            let filtered_lines = arr[0];
            slice_index = arr[1];

            let loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;

            if (parser_type === "BED")
                this.sitesFromBED(filtered_lines);

            update_loading_percentage(loading_percentage);
        }

        this.valid = true;
        this.allSites.sort((a, b) => a - b);
        this.siteOrder = JSON.parse(JSON.stringify(this.allSites));

        this.no_sites = (this.allSites.length === 0);
        if (this.no_sites)
            this.warning = "No RNA modification sites found for the selected gene. RNA modification site visualization disabled for this gene.";
    }

    sitesFromBED(lines)
    {
        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let line = new RNAModifSitesBEDLine(lines[line_index], this.num_bed_columns);
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
}

export class RNAModifSitesLevelData
{
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
        filename = filename.toLowerCase();
        if (filename.endsWith(".csv"))
            this.delim = ',';
        else if (filename.endsWith(".tsv") || filename.endsWith(".txt"))
            this.delim = '\t';
        else
        {
            this.error = "Invalid RNA modification level file extension. Please upload a CSV (comma-separated values) or tab-separated text (TSV / TXT) file.";
            return;
        }

        let slice_index = 0;
        let filtered_lines = [];
        let arr = await filteredHeatmapLines(this.file, slice_index, this.sites, true, this.gene);

        filtered_lines = arr[0];
        slice_index = arr[1];

        if (filtered_lines.length === 0)
        {
            this.error = "No relevant data lines found in the RNA modification level file. Check if it contains data for the gene being visualized or if its formatting is incorrect.";
            return;
        }

        let first_line = filtered_lines[0];
        this.samples = first_line.split(this.delim).map((sample) => sample.trim());

        if (this.samples.length < 3)
        {
            this.error = "The first line of the RNA modification level file has less than 3 data columns. The file must have at least 3 data columns.";
            return;
        }

        if (this.samples.some((sample) => sample.length === 0))
        {
            this.error = "Empty column name found in the RNA modification level file. Please ensure all column names provided contain at least one non-whitespace character.";
            return;
        }

        if (new Set(this.samples.map((sample) => sample.toLowerCase())).size !== this.samples.length)
        {
            this.error = "Duplicate column names found in the RNA modification level file. Please ensure all column names provided are unique.";
            return;
        }

        this.location_colnum = -1;
        this.gene_id_colnum = -1;
        this.labels = [];

        for (let i = 0; i < this.samples.length; ++i)
        {
            let sample = this.samples[i].toLowerCase();
            if ((sample === "location") && (this.location_colnum === -1))
                this.location_colnum = i;
            else if ((sample === "gene_id") && (this.gene_id_colnum === -1))
                this.gene_id_colnum = i;
            else
                this.labels.push(this.samples[i]);
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

        this.labelOrder = JSON.parse(JSON.stringify(this.labels));

        // Prepare attributes
        this.maxValue = NaN; // min/max/avg values for colour scheme & legend
        this.minValue = NaN;

        this.sum = 0;
        this.num_nonzerovals = 0;

        this.export = {};

        let loading_percentage = 0;
        let loading_msg = "Getting RNA modification levels...";
        update_loading_msg(loading_msg);
        update_loading_percentage(loading_percentage);

        filtered_lines.splice(0, 1);
        this.processFilteredLines(filtered_lines);

        while (slice_index !== -1)
        {
            loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;
            update_loading_percentage(loading_percentage);

            let arr = await filteredHeatmapLines(this.file, slice_index, this.sites, false, this.gene);
            filtered_lines = arr[0];
            slice_index = arr[1];
            this.processFilteredLines(filtered_lines);
        }

        loading_percentage = 100;
        update_loading_percentage(loading_percentage);

        this.valid = true;

        this.no_sites = (Object.keys(this.export).length === 0);
        if (this.no_sites)
            this.warning = "The RNA modification level file does not contain any information on the RNA modification sites of the selected gene. RNA modification level visualization disabled.";
        else
        {
            if (this.num_nonzerovals === 0)
                this.num_nonzerovals = 1;

            this.average = this.sum / this.num_nonzerovals; // calculate averages
        }
    }

    processFilteredLines(filtered_lines)
    {
        for (let i = 0; i < filtered_lines.length; ++i)
        {
            // Clean up text and separate values
            let entries = filtered_lines[i].split(this.delim);
            if (entries.length !== this.samples.length)
                continue;

            let gene = entries[this.gene_id_colnum].split('.')[0].trim();
            if (gene !== this.gene)
                continue;

            let site = parseInt(entries[this.location_colnum]) + 1; // Deal with BED coordinates being 0-based instead of 1-based
            if (isNaN(site) || (site <= 1) || (this.sites.indexOf(site) === -1))
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
}

/**
 * Class for representing primary (stack) data
 */
export class PrimaryData
{
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
        this.is_genomeprot = false;
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

        if (file.size > 3221225472)
        {
            this.error = "Stack file size should be less than 3 GB.";
            return;
        }

        let filename = file.name;
        if (!filename)
        {
            this.error = "Filename for isoform stack data is empty.";
            return;
        }

        let filename_dot_index = filename.lastIndexOf('.');
        if (filename_dot_index === -1)
        {
            this.error = "Stack file does not contain a file extension. Please specify the correct file extension in its filename.";
            return;
        }

        this.is_bed_type_unknown = false;
        this.is_reduced_bed = false;
        this.is_minimal_bed = false;
        this.num_reduced_bed_columns = -1;

        filename = filename.toLowerCase();
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
            let file_extension = filename.substring(filename_dot_index + 1);

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

        let genomeprot_comment = "##GenomeProt";
        let first_line = await getFileChunk(this.file, 0, genomeprot_comment.length);

        // Parse the file differently if it's a combined annotations GTF file from GenomeProt
        if (first_line === genomeprot_comment && this.filetype === "GTF")
        {
            this.is_genomeprot = true;

            this.transcripts = {};
            this.peptides = {};
            this.orfs = {};
            this.chromosome = "";
            this.gene_label = "";

            this.genes = new Set();
            if (gene)
                this.genes.add(gene);

            this.geneNameInfo = {};

            this.gene_attributes = {};
            this.gene_name_attributes = {};
            let keys = ["uniq_map_peptides", "lncRNA_peptides", "novel_txs", "novel_txs_distinguished", "unann_orfs", "uorf_5", "dorf_3", "pseudogene", "marker"];
            for (let key of keys)
            {
                this.gene_attributes[key] = new Set();
                this.gene_name_attributes[key] = new Set();
            }
            this.markerInfo = {};

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
                loading_msg = `Getting genes from GenomeProt combined annotations ${this.filetype} file...`;
            else
                loading_msg = `Getting peptides, transcripts and ORFs of gene '${this.gene}' from GenomeProt combined annotations ${this.filetype} file...`;

            update_loading_msg(loading_msg);

            let slice_index = 0;
            while (slice_index !== -1)
            {
                let arr = await filteredStackLines(this.file, slice_index, this.gene, true);
                let filtered_lines = arr[0];
                slice_index = arr[1];

                let loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;

                if (first_parser_type === "g_GTF")
                    this.genesFromGenomeProtGTF(filtered_lines);
                else if (first_parser_type === "e_GTF")
                    this.featuresFromGenomeProtGTF(filtered_lines);

                update_loading_percentage(loading_percentage);
            }
            for (let key of keys)
            {
                this.gene_attributes[key].delete('');
                this.gene_name_attributes[key].delete('');
                this.gene_attributes[key] = Array.from(this.gene_attributes[key]);
                this.gene_name_attributes[key] = Array.from(this.gene_name_attributes[key]);
            }

            this.genes = Array.from(this.genes);

            if (this.genes.length > 1)
            {
                this.valid = true;  // More than one gene found in the file; let the user pick one to visualize
                return;
            }
            else if (this.genes.length === 0)
            {
                this.error = "No genes found from the GenomeProt combined annotations file. Please upload a file with at least one gene.";
                return;
            }

            if (this.gene === null)
                this.gene = this.genes[0];

            if (second_parser_type)
            {
                loading_msg = `Getting peptides, transcripts and ORFs of gene '${this.gene}' from GenomeProt combined annotations ${this.filetype} file...`;
                update_loading_msg(loading_msg);

                let slice_index = 0;
                while (slice_index !== -1)
                {
                    let arr = await filteredStackLines(this.file, slice_index, this.gene, true);
                    let filtered_lines = arr[0];
                    slice_index = arr[1];

                    let loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;

                    this.featuresFromGenomeProtGTF(filtered_lines);
                    update_loading_percentage(loading_percentage);
                }
            }

            if (Object.keys(this.transcripts).length === 0)
            {
                this.error = "GenomeProt combined annotations file contains the searched gene ID but does not contain any of its transcripts.";
                return;
            }

            if (Object.keys(this.peptides).length === 0)
                this.warning = "GenomeProt combined annotations file contains the searched gene ID but does not contain any peptides mapped to it.";

            this.transcriptOrder = prioritiseKnownTranscripts(Object.keys(JSON.parse(JSON.stringify(this.transcripts)))); // store row order to allow for manual reordering

            // Get rid of any transcripts that have no exons
            while (true)
            {
                let no_empty_transcripts_found = true;
                for (let i = 0; i < this.transcriptOrder.length; ++i)
                {
                    let transcript_id = this.transcriptOrder[i];
                    let transcript_obj = this.transcripts[transcript_id];
                    if ((!transcript_obj.exons) || (transcript_obj.exons.length === 0))
                    {
                        no_empty_transcripts_found = false;
                        this.transcriptOrder.splice(i, 1);
                        delete this.transcripts[transcript_id];
                        break;
                    }
                }

                if (no_empty_transcripts_found)
                    break;
            }

            if (this.transcriptOrder.length === 0)
            {
                this.error = "GenomeProt combined annotations file contains the searched gene ID but does not contain any of its transcripts.";
                return;
            }

            // Store lists of all transcripts and ORFs the peptides uniquely map to
            this.transcripts_identified = [];
            this.orfs_identified = [];
            for (let peptide of Object.keys(this.peptides))
            {
                let peptide_info = this.peptides[peptide];
                let transcripts_identified = peptide_info.transcripts_identified;
                let orfs_identified = peptide_info.orfs_identified;

                for (let transcript_identified of transcripts_identified)
                    if (this.transcripts_identified.indexOf(transcript_identified) === -1)
                        this.transcripts_identified.push(transcript_identified);

                for (let orf_identified of orfs_identified)
                    if (this.orfs_identified.indexOf(orf_identified) === -1)
                        this.orfs_identified.push(orf_identified);
            }

            // Sort the regions of each ORF by ascending region starts
            for (let accession of Object.keys(this.orfs))
                this.orfs[accession].sort((block0, block1) => block0[0] - block1[0]);

            // build isoform objects from transcript data and save in list
            this.isoformList = [];
            for (let i = 0; i < this.transcriptOrder.length; ++i)
                this.isoformList.push(new Isoform(this.transcriptOrder[i], this.transcripts[this.transcriptOrder[i]], this.orfs));

            // Sort the regions of each ORF by descending region starts if the gene is not on the forward strand
            if (this.strand !== '+')
                for (let accession of Object.keys(this.orfs))
                    this.orfs[accession].reverse();

            this.allIsoforms = JSON.parse(JSON.stringify(this.isoformList)); // keep a copy to allow for manually adding/removing rows

            this.mergedRanges = mergeRanges(this.isoformList); // build the metagene

            // extra information about the gene
            this.gene = gene;
            this.start = this.isoformList[0].strand === '+' ?
                this.mergedRanges[0][0] :
                this.mergedRanges[this.mergedRanges.length - 1][1];
            this.end = this.isoformList[0].strand === '+' ?
                this.mergedRanges[this.mergedRanges.length - 1][1] :
                this.mergedRanges[0][0];
            this.width = Math.abs(this.end - this.start);
            this.strand = this.isoformList[0].strand;

            this.peptideOrder = Object.keys(this.peptides);
            this.peptideOrder.sort();
            for (let peptide_sequence of this.peptideOrder)
            {
                this.peptides[peptide_sequence].ranges.sort((exon0, exon1) => exon0[0] - exon1[0]);
                if (this.strand !== '+')
                    this.peptides[peptide_sequence].ranges.reverse();
            }

            this.valid = true; // data parsed correctly and ready for visualization

            return;
        }

        // Parse the file as non-GenomeProt stack data

        // The user has uploaded a .bed file, so determine the number of columns it should have
        if (this.is_bed_type_unknown)
        {
            let slice_index = 0;
            while (slice_index !== -1)
            {
                let arr = await filteredStackLines(this.file, slice_index, this.gene, true);
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

        this.genes = new Set();
        if (gene)
            this.genes.add(gene);

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

        update_loading_msg(loading_msg);

        let slice_index = 0;
        while (slice_index !== -1)
        {
            let arr = await filteredStackLines(this.file, slice_index, this.gene, true);
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

            update_loading_percentage(loading_percentage);
        }

        this.genes = Array.from(this.genes);
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
            update_loading_msg(loading_msg);

            let slice_index = 0;
            while (slice_index !== -1)
            {
                let arr = await filteredStackLines(this.file, slice_index, this.gene, true);
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

                update_loading_percentage(loading_percentage);
            }
        }

        // Remove transcripts that have a coding sequence but no exons
        let loaded_transcripts = Object.keys(this.transcripts);
        for (let loaded_transcript of loaded_transcripts)
            if (!(this.transcripts[loaded_transcript].exons) || (this.transcripts[loaded_transcript].exons.length === 0))
                this.transcripts[loaded_transcript] = null;

        if (Object.keys(this.transcripts).length === 0)
        {
            this.error = "Stack file contains the searched gene ID but does not contain any of its transcripts.";
            return;
        }

        this.transcriptOrder = prioritiseKnownTranscripts(Object.keys(JSON.parse(JSON.stringify(this.transcripts)))); // store row order to allow for manual reordering

        // build isoform objects from transcript data and save in list
        this.isoformList = [];
        for (let i = 0; i < this.transcriptOrder.length; ++i)
        {
            this.isoformList.push(new Isoform(this.transcriptOrder[i], this.transcripts[this.transcriptOrder[i]]));
            this.transcripts[this.transcriptOrder[i]] = null;
        }

        this.allIsoforms = JSON.parse(JSON.stringify(this.isoformList)); // keep a copy to allow for manually adding/removing rows

        this.mergedRanges = mergeRanges(this.isoformList); // build the metagene

        // extra information about the gene
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

        let properties_to_delete = "file gene error is_use_grch37 is_bed_type_unknown is_reduced_bed is_minimal_bed num_reduced_bed_columns filetype species".split(' ');
        for (let property_to_delete of properties_to_delete)
            delete this[property_to_delete];
    }

    exonsFromGFF3(lines)
    {
        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let line = new GFF3Line(lines[line_index]);
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
                    this.transcripts[transcript].exons = [line.range];
                    this.transcripts[transcript].strand = line.strand;
                }
                else
                    this.transcripts[transcript].exons.push(line.range);
            }
            else
            {
                if (!(transcript in this.transcripts))
                {
                    this.transcripts[transcript] = {};
                    this.transcripts[transcript].user_orf = [line.range];
                    this.transcripts[transcript].exons = [];
                    this.transcripts[transcript].strand = line.strand;
                }
                else
                    this.transcripts[transcript].user_orf.push(line.range);
            }
        }
    }

    exonsFromGTF(lines)
    {
        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let line = new GTFLine(lines[line_index]);
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
                    this.transcripts[transcript].exons = [line.range];
                    this.transcripts[transcript].strand = line.strand;
                }
                else
                    this.transcripts[transcript].exons.push(line.range);
            }
            else
            {
                if (!(transcript in this.transcripts))
                {
                    this.transcripts[transcript] = {};
                    this.transcripts[transcript].user_orf = [line.range];
                    this.transcripts[transcript].exons = [];
                    this.transcripts[transcript].strand = line.strand;
                }
                else
                    this.transcripts[transcript].user_orf.push(line.range);
            }
        }
    }

    exonsFromBED(lines)
    {
        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let line = new BEDLine(lines[line_index]);
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
                this.transcripts[transcript].user_orf = [];
                this.transcripts[transcript].exons = [];
                this.transcripts[transcript].strand = line.strand;

                for (let i = 0; i < line.blockCount; ++i)
                {
                    let start = line.start + line.blockStarts[i];
                    let size = line.blockSizes[i];
                    let range = [start, start + size - 1];
                    this.transcripts[transcript].exons.push(range);

                    if ((line.orf_start !== undefined) && (line.orf_end !== undefined))
                    {
                        let orf = intersection([line.orf_start, line.orf_end], range);
                        if (orf.length !== 0)
                            this.transcripts[transcript].user_orf.push(orf);
                    }
                }
            }
        }
    }

    exonsFromReducedBED(lines)
    {
        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let line = new ReducedBEDLine(lines[line_index], this.num_reduced_bed_columns);
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
                this.transcripts[transcript].user_orf = [];
                this.transcripts[transcript].exons = [];
                this.transcripts[transcript].strand = line.strand;

                this.transcripts[transcript].user_orf_range = [];
                if ((line.orf_start !== undefined) && (line.orf_end !== undefined))
                    this.transcripts[transcript].user_orf_range = [line.orf_start, line.orf_end];
            }

            let range = [line.start, line.end];
            this.transcripts[transcript].exons.push(range);

            if (this.transcripts[transcript].user_orf_range.length !== 0)
            {
                let orf = intersection(this.transcripts[transcript].user_orf_range, range);
                if (orf.length !== 0)
                    this.transcripts[transcript].user_orf.push(orf);
            }
        }
    }

    async exonsFromMinimalBED(lines)
    {
        let gene_strand = "";

        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let line = new MinimalBEDLine(lines[line_index], this.num_reduced_bed_columns);
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
                update_loading_msg(loading_msg);
                update_loading_percentage(0);

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
                this.transcripts[transcript].exons = [[line.start, line.end]];
                this.transcripts[transcript].strand = gene_strand;
            }
            else
                this.transcripts[transcript].exons.push([line.start, line.end]);
        }
    }

    genesFromGFF3(lines)
    {
        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let gff3_line = new GFF3Line(lines[line_index]);
            if (!(gff3_line.valid))
                continue;

            let gene_name = gff3_line.attributes.gene_id;
            if (!gene_name)
                continue;

            let period_index = gene_name.indexOf('.');
            if (period_index !== -1)
                gene_name = gene_name.substring(0, period_index);

            gene_name = gene_name.toUpperCase();
            this.genes.add(gene_name);
        }
    }

    genesFromGTF(lines)
    {
        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let gtf_line = new GTFLine(lines[line_index]);
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
            this.genes.add(gene_name);
        }
    }

    featuresFromGenomeProtGTF(lines)
    {
        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let gtf_line = new GenomeProtGTFLine(lines[line_index]);
            if (!(gtf_line.valid))
                continue;

            let gene_id = gtf_line.attributes.gene_id;
            if (!gene_id)
                continue;

            let period_index = gene_id.indexOf('.');
            if (period_index !== -1)
                gene_id = gene_id.substring(0, period_index);

            gene_id = gene_id.toUpperCase();
            if (this.gene !== gene_id)
                continue;

            // Extract the gene's chromosome
            if (!(this.chromosome) && gtf_line.chromosome)
                this.chromosome = gtf_line.chromosome;

            // Only extract information for peptides, CDS regions and exons
            let is_peptide = (gtf_line.source === "custom") && (gtf_line.feature === "exon");
            let is_cds = (gtf_line.source === "custom") && (gtf_line.feature === "CDS");
            let is_exon = (gtf_line.source !== "custom") && (gtf_line.feature === "exon");

            if (!(is_peptide || is_cds || is_exon))
                continue;

            // Ensure the GTF line has a transcript ID
            let transcript = gtf_line.attributes.transcript_id;
            if (!transcript)
                continue;

            transcript = transcript.split(".")[0];

            // Initialize the info entry for the transcript if it doesn't have already one
            if (!(transcript in this.transcripts))
            {
                this.transcripts[transcript] = {};
                this.transcripts[transcript].accessions = [];
                this.transcripts[transcript].user_orf = [];             // The union of all ORFs identified in the transcript rather than just one of its ORFs
                this.transcripts[transcript].exons = [];
                this.transcripts[transcript].strand = gtf_line.strand;
            }

            let gene_name = gtf_line.attributes.gene_name;
            if (gene_name && !(this.gene_label))
                this.gene_label = gene_name;

            if (is_peptide)
            {
                let accession = gtf_line.attributes.accession;
                let peptide = gtf_line.attributes.peptide;
                if (!(accession && peptide))
                    continue;

                let       peptide_ids_gene = (      gtf_line.attributes.peptide_ids_gene === "TRUE");
                let peptide_ids_transcript = (gtf_line.attributes.peptide_ids_transcript === "TRUE");
                let        peptide_ids_orf = (       gtf_line.attributes.peptide_ids_orf === "TRUE");

                let transcript_biotype = gtf_line.attributes.transcript_biotype;
                if (!transcript_biotype)
                    transcript_biotype = "unknown";

                let orf_type = gtf_line.attributes.orf_type;
                if (!orf_type)
                    orf_type = "unknown";

                let localisation = gtf_line.attributes.localisation;
                if (!localisation)
                    localisation = "unknown";

                let       gene_identified = (      gtf_line.attributes.gene_identified === "TRUE");
                let transcript_identified = (gtf_line.attributes.transcript_identified === "TRUE");
                let        orf_identified = (       gtf_line.attributes.orf_identified === "TRUE");

                let range = gtf_line.range;

                // Initialize the info entry for the peptide if it doesn't already have one
                if (!(peptide in this.peptides))
                {
                    this.peptides[peptide] = {};

                    // Genomic coordinates spanned by each 'exon' of the peptide
                    this.peptides[peptide].ranges = [range];

                    // Whether the peptide can identify the gene
                    this.peptides[peptide].peptide_ids_gene = peptide_ids_gene;

                    // Transcripts identified by the peptide (there should be at most one)
                    this.peptides[peptide].transcripts_identified = [];
                    if (peptide_ids_transcript)
                        this.peptides[peptide].transcripts_identified.push(transcript);

                    // ORFs identified by the peptide (there should be at most one)
                    this.peptides[peptide].orfs_identified = [];
                    if (peptide_ids_orf)
                        this.peptides[peptide].orfs_identified.push(accession);

                    // The transcripts that the peptide maps to
                    this.peptides[peptide].transcript_info = {};
                    this.peptides[peptide].transcript_info[transcript] = {"peptide_ids_transcript": peptide_ids_transcript, "biotype": transcript_biotype,
                                                                          "localisation": localisation, "transcript_identified": transcript_identified};

                    // The ORFs that the peptide maps to (e.g. InterPro proteins, novel ORFs)
                    this.peptides[peptide].accession_info = {};
                    this.peptides[peptide].accession_info[accession] = {"peptide_ids_orf": peptide_ids_orf, "orf_type": orf_type,
                                                                        "gene_identified": gene_identified, "orf_identified": orf_identified};
                }
                else
                {
                    // Peptide 'exon'
                    let isFound = false;
                    for (let [peptide_section_start, peptide_section_end] of this.peptides[peptide].ranges)
                    {
                        if ((peptide_section_start === range[0]) && (peptide_section_end === range[1]))
                        {
                            isFound = true;
                            break;
                        }
                    }

                    if (!isFound)
                        this.peptides[peptide].ranges.push(range);

                    // Whether the peptide can identify the gene
                    this.peptides[peptide].peptide_ids_gene ||= peptide_ids_gene;

                    // Transcripts identified by the peptide
                    if (peptide_ids_transcript && (this.peptides[peptide].transcripts_identified.indexOf(transcript) === -1))
                        this.peptides[peptide].transcripts_identified.push(transcript);

                    // ORFs identified by the peptide
                    if (peptide_ids_orf && (this.peptides[peptide].orfs_identified.indexOf(accession) === -1))
                        this.peptides[peptide].orfs_identified.push(accession);

                    // A transcript the peptide maps to
                    if (!(transcript in this.peptides[peptide].transcript_info))
                        this.peptides[peptide].transcript_info[transcript] = {"peptide_ids_transcript": peptide_ids_transcript, "biotype": transcript_biotype,
                                                                              "localisation": localisation, "transcript_identified": transcript_identified};

                    // An ORF the peptide maps to
                    if (!(accession in this.peptides[peptide].accession_info))
                        this.peptides[peptide].accession_info[accession] = {"peptide_ids_orf": peptide_ids_orf, "orf_type": orf_type,
                                                                            "gene_identified": gene_identified, "orf_identified": orf_identified};
                }
            }
            else if (is_cds)
            {
                let pid = gtf_line.attributes.pid;
                if (!pid)
                    continue;

                // There is supposed to be one accession per transcript; skip the line if there isn't one or if the transcript ID doesn't come after the underscore of the PID attribute
                let to_remove_index = pid.indexOf('_' + transcript);
                if (to_remove_index === -1)
                    continue;

                let accession = pid.substring(0, to_remove_index);
                if (this.transcripts[transcript].accessions.indexOf(accession) === -1)
                    this.transcripts[transcript].accessions.push(accession);

                let isFound = false;
                for (let [orf_block_start, orf_block_end] of this.transcripts[transcript].user_orf)
                {
                    if ((orf_block_start === gtf_line.range[0]) && (orf_block_end === gtf_line.range[1]))
                    {
                        isFound = true;
                        break;
                    }
                }

                if (!isFound)
                    this.transcripts[transcript].user_orf.push(gtf_line.range);

                if (!(accession in this.orfs))
                    this.orfs[accession] = [gtf_line.range];
                else
                {
                    let isFound = false;
                    for (let [orf_block_start, orf_block_end] of this.orfs[accession])
                    {
                        if ((orf_block_start === gtf_line.range[0]) && (orf_block_end === gtf_line.range[1]))
                        {
                            isFound = true;
                            break;
                        }
                    }

                    if (!isFound)
                        this.orfs[accession].push(gtf_line.range);
                }
            }
            else if (is_exon)
            {
                this.transcripts[transcript].exons.push(gtf_line.range);

                // If the gene being searched is a marker gene, store related information about it
                if (Object.keys(this.markerInfo).length !== 0)
                    continue;

                // All marker genes must contain a 'marker_gene' attribute with the value 'TRUE'
                if (gtf_line.attributes.marker_gene !== "TRUE")
                    continue;

                // p_val_adj: Adjusted p-value
                let p_val_adj = gtf_line.attributes.p_val_adj;
                if (!p_val_adj)
                    continue;
                p_val_adj = p_val_adj.split(',').map((num_str) => parseFloat(num_str));
                if (p_val_adj.some((num) => !Number.isFinite(num)))
                    continue;

                // The number of p_val_adj, avg_log2fc, pct.1 and pct.2 values should match the number of clusters provided in the first group
                // EXCEPTION: there are multiple clusters in the first group and only one value for each of the four aforementioned attributes
                let num_clusters = p_val_adj.length;
                if (num_clusters === 0)
                    continue;

                // avg_log2fc: log2(fold change of average expression between the two groups)
                let avg_log2fc = gtf_line.attributes.avg_log2fc;
                if (!avg_log2fc)
                    continue;
                avg_log2fc = avg_log2fc.split(',').map((num_str) => parseFloat(num_str));
                if ((avg_log2fc.length !== num_clusters) || avg_log2fc.some((num) => !Number.isFinite(num)))
                    continue;

                // pct.1: Percentage of cells where the gene is detected in the 1st group
                let pct1 = gtf_line.attributes["pct.1"];
                if (!pct1)
                    continue;
                pct1 = pct1.split(',').map((num_str) => parseFloat(num_str));
                if ((pct1.length !== num_clusters) || pct1.some((num) => !Number.isFinite(num)))
                    continue;

                // pct.2: Percentage of cells where the gene is detected in the 2nd group
                let pct2 = gtf_line.attributes["pct.2"];
                if (!pct2)
                    continue;
                pct2 = pct2.split(',').map((num_str) => parseFloat(num_str));
                if ((pct2.length !== num_clusters) || pct2.some((num) => !Number.isFinite(num)))
                    continue;

                // cluster: Cluster(s) containing marker gene (1st group)
                let cluster = gtf_line.attributes.cluster;
                if (!cluster)
                    continue;
                cluster = cluster.split(',').map((cluster_name) => cluster_name.trim());
                if ((cluster.indexOf('') !== -1) || ((num_clusters > 1) && (cluster.length !== num_clusters)))
                    continue;

                // against: Cluster(s) used for comparison (2nd group)
                let against = gtf_line.attributes.against;
                if (against)
                {
                    if (num_clusters > 1)
                        continue;
                    against = against.split(',').map((cluster_name) => cluster_name.trim());
                    if (against.indexOf('') !== -1)
                        continue;
                }
                else
                    against = undefined;

                this.markerInfo = {"p_val_adj": p_val_adj, "avg_log2fc": avg_log2fc, "pct1": pct1, "pct2": pct2, "cluster": cluster};
                if (against)
                    this.markerInfo.against = against;
            }
        }
    }

    genesFromGenomeProtGTF(lines)
    {
        for (let i = 0; i < lines.length; ++i)
        {
            let gtf_line = new GenomeProtGTFLine(lines[i]);
            if (!(gtf_line.valid))
                continue;

            let gene_id = gtf_line.attributes.gene_id;
            if (!gene_id)
                continue;

            let period_index = gene_id.indexOf('.');
            if (period_index !== -1)
                gene_id = gene_id.substring(0, period_index);

            gene_id = gene_id.toUpperCase();
            this.genes.add(gene_id);

            let gene_name = gtf_line.attributes.gene_name;
            if ((!gene_name) || (gene_name === gene_id))
                gene_name = '';
            else if (!(gene_name in this.geneNameInfo))
                this.geneNameInfo[gene_name] = [gene_id];
            else if (this.geneNameInfo[gene_name].indexOf(gene_id) === -1)
                this.geneNameInfo[gene_name].push(gene_id);

            // Information for marker genes is stored in a GTF line for an isoform exon
            let is_exon = (gtf_line.source !== "custom") && (gtf_line.feature === "exon");
            if (is_exon)
            {
                // All marker genes must contain a 'marker_gene' attribute with the value 'TRUE'
                if (gtf_line.attributes.marker_gene !== "TRUE")
                    continue;

                // p_val_adj: Adjusted p-value
                let p_val_adj = gtf_line.attributes.p_val_adj;
                if (!p_val_adj)
                    continue;
                p_val_adj = p_val_adj.split(',').map((num_str) => parseFloat(num_str));
                if (p_val_adj.some((num) => !Number.isFinite(num)))
                    continue;

                // The number of p_val_adj, avg_log2fc, pct.1 and pct.2 values should match the number of clusters provided in the first group
                // EXCEPTION: there are multiple clusters in the first group and only one value for each of the four aforementioned attributes
                let num_clusters = p_val_adj.length;
                if (num_clusters === 0)
                    continue;

                // avg_log2fc: log2(fold change of average expression between the two groups)
                let avg_log2fc = gtf_line.attributes.avg_log2fc;
                if (!avg_log2fc)
                    continue;
                avg_log2fc = avg_log2fc.split(',').map((num_str) => parseFloat(num_str));
                if ((avg_log2fc.length !== num_clusters) || avg_log2fc.some((num) => !Number.isFinite(num)))
                    continue;

                // pct.1: Percentage of cells where the gene is detected in the 1st group
                let pct1 = gtf_line.attributes["pct.1"];
                if (!pct1)
                    continue;
                pct1 = pct1.split(',').map((num_str) => parseFloat(num_str));
                if ((pct1.length !== num_clusters) || pct1.some((num) => !Number.isFinite(num)))
                    continue;

                // pct.2: Percentage of cells where the gene is detected in the 2nd group
                let pct2 = gtf_line.attributes["pct.2"];
                if (!pct2)
                    continue;
                pct2 = pct2.split(',').map((num_str) => parseFloat(num_str));
                if ((pct2.length !== num_clusters) || pct2.some((num) => !Number.isFinite(num)))
                    continue;

                // cluster: Cluster(s) containing marker gene (1st group)
                let cluster = gtf_line.attributes.cluster;
                if (!cluster)
                    continue;
                cluster = cluster.split(',').map((cluster_name) => cluster_name.trim());
                if ((cluster.indexOf('') !== -1) || ((num_clusters > 1) && (cluster.length !== num_clusters)))
                    continue;

                // against: Cluster(s) used for comparison (2nd group)
                let against = gtf_line.attributes.against;
                if (against)
                {
                    if (num_clusters > 1)
                        continue;
                    against = against.split(',').map((cluster_name) => cluster_name.trim());
                    if (against.indexOf('') !== -1)
                        continue;
                }

                this.gene_attributes.marker.add(gene_id);
                this.gene_name_attributes.marker.add(gene_name);

                continue;
            }

            // Only use information from peptides
            let is_peptide = (gtf_line.source === "custom") && (gtf_line.feature === "exon");
            if (!is_peptide)
                continue;

            let accession = gtf_line.attributes.accession;
            let peptide = gtf_line.attributes.peptide;
            if (!(accession && peptide))
                continue;

            let peptide_ids_orf = (gtf_line.attributes.peptide_ids_orf === "TRUE");
            if (!peptide_ids_orf)
                continue;

            let peptide_ids_transcript = (gtf_line.attributes.peptide_ids_transcript === "TRUE");
            let transcript_biotype = gtf_line.attributes.transcript_biotype;
            let orf_type = gtf_line.attributes.orf_type;
            let localisation = gtf_line.attributes.localisation;

            // ORFs with UMPs
            this.gene_attributes.uniq_map_peptides.add(gene_id);
            this.gene_name_attributes.uniq_map_peptides.add(gene_name);

            // Long non-coding RNAs with UMPs
            if (transcript_biotype === "lncRNA")
            {
                this.gene_attributes.lncRNA_peptides.add(gene_id);
                this.gene_name_attributes.lncRNA_peptides.add(gene_name);
            }
            // Novel transcript isoforms with UMPs
            else if (transcript_biotype === "novel")
            {
                this.gene_attributes.novel_txs.add(gene_id);
                this.gene_name_attributes.novel_txs.add(gene_name);

                // Novel transcript isoforms distinguished by UMPs
                if (peptide_ids_transcript)
                {
                    this.gene_attributes.novel_txs_distinguished.add(gene_id);
                    this.gene_name_attributes.novel_txs_distinguished.add(gene_name);
                }
            }
            // Pseudogenes with UMPs
            else if (transcript_biotype.indexOf("pseudogene") !== -1)
            {
                this.gene_attributes.pseudogene.add(gene_id);
                this.gene_name_attributes.pseudogene.add(gene_name);
            }

            // Unannotated ORFs with UMPs
            if (orf_type === "unannotated")
            {
                this.gene_attributes.unann_orfs.add(gene_id);
                this.gene_name_attributes.unann_orfs.add(gene_name);
            }

            // 5' uORFs with UMPs
            if (localisation === "5UTR")
            {
                this.gene_attributes.uorf_5.add(gene_id);
                this.gene_name_attributes.uorf_5.add(gene_name);
            }
            // 3' dORFs with UMPs
            else if (localisation === "3UTR")
            {
                this.gene_attributes.dorf_3.add(gene_id);
                this.gene_name_attributes.dorf_3.add(gene_name);
            }
        }
    }

    genesFromBED(lines)
    {
        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let line = new BEDLine(lines[line_index]);
            if (!(line.valid))
                continue;

            let gene = line.gene;
            if (!gene)
                continue;

            gene = gene.toUpperCase();
            this.genes.add(gene);
        }
    }

    genesFromReducedBED(lines)
    {
        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let line = new ReducedBEDLine(lines[line_index], this.num_reduced_bed_columns);
            if (!(line.valid))
                continue;

            let gene = line.gene;
            if (!gene)
                continue;

            gene = gene.toUpperCase();
            this.genes.add(gene);
        }
    }

    genesFromMinimalBED(lines)
    {
        for (let line_index = 0; line_index < lines.length; ++line_index)
        {
            let line = new MinimalBEDLine(lines[line_index], this.num_reduced_bed_columns);
            if (!(line.valid))
                continue;

            let gene = line.gene;
            if (!gene)
                continue;

            gene = gene.toUpperCase();
            this.genes.add(gene);
        }
    }

    async getGeneStrand(gene_name)
    {
        let url = `https://${this.is_use_grch37 ? "grch37." : ""}rest.ensembl.org/lookup/id/${gene_name}?species=${encodeURIComponent(this.species)}&content-type=application/json`;
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
}

/**
 * Class for representing secondary (heatmap) data
 */
export class SecondaryData
{
    /**
     * Create a secondary data instance
     *
     * @param {string} file the input file
     * @param {string} gene ID for the gene of interest
     * @param {string} transcript_ids transcript IDs for the gene of interest
     */
    constructor(file, gene, transcript_ids)
    {
        this.valid = false; // set to true at the end
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

        if (file.size > 3221225472)
        {
            this.error = "Heatmap file size should be less than 3 GB.";
            return;
        }

        let filename = file.name;
        if (!filename)
        {
            this.error = "Filename for heatmap data is empty.";
            return;
        }

        // Determine delimiter
        filename = filename.toLowerCase();
        if (filename.endsWith(".csv"))
            this.delim = ',';
        else if (filename.endsWith(".tsv") || filename.endsWith(".txt"))
            this.delim = '\t';
        else
        {
            this.error = "Invalid heatmap file extension. Please upload a CSV (comma-separated values) or tab-separated text (TSV / TXT) file.";
            return;
        }

        let slice_index = 0;
        let filtered_lines = [];
        let arr = await filteredHeatmapLines(this.file, slice_index, this.transcript_ids, true);

        filtered_lines = arr[0];
        slice_index = arr[1];

        if (filtered_lines.length === 0)
        {
            this.error = "No relevant data lines found in the heatmap file. Check if it contains data for the gene being visualized or if its formatting is incorrect.";
            return;
        }

        let first_line = filtered_lines[0];
        this.samples = first_line.split(this.delim).map((sample) => sample.trim());

        if (this.samples.length < 2)
        {
            this.error = "The first line of the heatmap file has less than 2 data columns. The file must have at least 2 data columns.";
            return;
        }

        if (this.samples.some((sample) => sample.length === 0))
        {
            this.error = "Empty column name found in the heatmap file. Please ensure all column names provided contain at least one non-whitespace character.";
            return;
        }

        if (new Set(this.samples.map((sample) => sample.toLowerCase())).size !== this.samples.length)
        {
            this.error = "Duplicate column names found in the heatmap file. Please ensure all column names provided are unique.";
            return;
        }

        this.gene_id_colnum = -1;
        this.transcript_id_colnum = -1;
        this.labels = [];

        for (let i = 0; i < this.samples.length; ++i)
        {
            let sample = this.samples[i].toLowerCase();
            if (((sample === "gene_id") || (sample === "geneid")) && (this.gene_id_colnum === -1))
                this.gene_id_colnum = i;
            else if (((sample === "transcript_id") || (sample === "txname")) && (this.transcript_id_colnum === -1))
                this.transcript_id_colnum = i;
            else
                this.labels.push(this.samples[i]);
        }

        if (this.transcript_id_colnum === -1)
        {
            this.error = "No transcript_id column found in the heatmap file.";
            return;
        }

        this.labelOrder = JSON.parse(JSON.stringify(this.labels));

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

        let loading_percentage = 0;
        let loading_msg = `Extracting data for gene '${this.gene}' from heatmap file...`;
        update_loading_msg(loading_msg);
        update_loading_percentage(loading_percentage);

        filtered_lines.splice(0, 1);
        this.processFilteredLines(filtered_lines);

        while (slice_index !== -1)
        {
            loading_percentage = (slice_index !== -1) ? parseFloat((slice_index * 100 / file.size).toFixed(2)) : 100;
            update_loading_percentage(loading_percentage);

            let arr = await filteredHeatmapLines(this.file, slice_index, this.transcript_ids);
            filtered_lines = arr[0];
            slice_index = arr[1];
            this.processFilteredLines(filtered_lines);
        }

        loading_percentage = 100;
        update_loading_percentage(loading_percentage);

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

        this.valid = true;

        let properties_to_delete = "file gene error delim transcripts gene_id_colnum transcript_id_colnum samples sum num_nonzerovals transcript_ids".split(' ');
        for (let property_to_delete of properties_to_delete)
            delete this[property_to_delete];
    }

    processFilteredLines(filtered_lines)
    {
        for (let i = 0; i < filtered_lines.length; ++i)
        {
            // Clean up text and separate values
            let entries = filtered_lines[i].split(this.delim);
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
}

/**
 * Class for representing canonical transcript data
 */
export class CanonData
{
    /**
     * Create a canon data instance
     * jsonData object format determined by ensembl: https://rest.ensembl.org/lookup/id/{geneID}?expand=1;content-type=application/json
     * @param {object} jsonData data returned from API
     */
    constructor(jsonData)
    {
        let transcript_id = jsonData.id;
        let strand = jsonData.Exon[0].strand > 0 ? '+' : '-';
        let is_forward_strand = (strand === '+');

        // Enumerate all exons of each transcript and store coordinates and strand
        let transcript_info = {};
        transcript_info.exons = [];
        transcript_info.strand = strand;

        for (let exon of jsonData.Exon)
            transcript_info.exons.push([exon.start, exon.end]);

        this.isoformList = [new Isoform(transcript_id, transcript_info)];

        // Build metagene
        this.mergedRanges = mergeRanges(this.isoformList);

        // Store other data
        this.start = (is_forward_strand) ? this.mergedRanges[0][0] : this.mergedRanges[this.mergedRanges.length - 1][1];
        this.end = (is_forward_strand) ? this.mergedRanges[this.mergedRanges.length - 1][1] : this.mergedRanges[0][0];
        this.width = Math.abs(this.end - this.start);
        this.strand = strand;
        this.display = jsonData.display_name;
    }
}

/**
 * Class for representing protein data
 */
export class ProteinData
{
    /**
     * Create a protein data instance with data from InterPro
     * @param {string} accession protein accession taken from Pfam
     */
    constructor([metadata_json, features_json, domains_json], canon_data)
    {
        this.domainMap = {};
        this.motifMap = {};
        this.strand = canon_data.strand;
        this.reversed = (this.strand !== '+');

        let C2GDomain = [];
        let C2GRange = [];

        let orf = [];
        if (canon_data.orf)
            orf = JSON.parse(JSON.stringify(canon_data.orf));

        this.json = {"markups": [], "motifs": []};
        this.readMetadata(metadata_json);
        this.readFeatures(features_json);
        this.readDomains(domains_json);

        let cdsPosition = 0;
        for (let exon of orf)
        {
            if (this.reversed)
                exon.reverse();

            let exonLength = Math.abs(exon[1] - exon[0]);
            C2GDomain.push(cdsPosition);
            cdsPosition += exonLength;
            C2GDomain.push(cdsPosition);
            cdsPosition += 1;
            C2GRange.push(exon[0]);
            C2GRange.push(exon[1]);
        }

        this.originalData = JSON.parse(JSON.stringify(this.json));
        this.reversedData = JSON.parse(JSON.stringify(this.json));
        this.reverseData();

        let C2GMap = d3.scaleLinear().domain(C2GDomain).range(C2GRange); // CDS to Genome
        let P2CMap = (coord) => ([3 * (coord - 1), 3 * coord - 1]); // Protein to CDS: 3 nt for each aa
        this.getMap(C2GMap, P2CMap);
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

    getMap(C2GMap, P2CMap)
    {
        for (let region of this.originalData.regions)
        {
            let start = region.start;
            let end = region.end;
            let region_key = `${region.metadata.database}_${start}_${end}`;

            this.domainMap[region_key] = {};
            this.domainMap[region_key][start] = C2GMap(P2CMap(start)[0]);
            this.domainMap[region_key][end] = C2GMap(P2CMap(end)[1]);
        }

        for (let motif of this.originalData.motifs)
        {
            let start = motif.start;
            let end = motif.end;
            let motif_key = `${motif.metadata.type}_${start}_${end}`;

            this.motifMap[motif_key] = {};
            this.motifMap[motif_key][start] = C2GMap(P2CMap(start)[0]);
            this.motifMap[motif_key][end] = C2GMap(P2CMap(end)[1]);
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
        this.valid = false;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length !== 9)
            return;

        let range_begin = parseInt(line[3]);
        let range_end = parseInt(line[4]);
        let strand = line[6];
        if (isNaN(range_begin) || isNaN(range_end) || (range_begin > range_end) || ((strand !== '+') && (strand !== '-')))
            return;

        this.chromosome = line[0].trim();
        this.feature = line[2];
        this.range = [range_begin, range_end];
        this.strand = strand;
        this.attributes = {};

        // reconstruct attributed column as JSON
        let info = line[8].split(';');

        for (let entry_index = 0; entry_index < info.length; ++entry_index)
        {
            let entry = info[entry_index];
            if (entry.length <= 1)
                continue;

            entry = entry.trim().split('=');
            if (entry.length !== 2)
                continue;

            let attribute_name = decodeURI(entry[0]).trim().toLowerCase();
            if (attribute_name.length === 0)
                continue;

            let attribute_val = decodeURI(entry[1]);

            // If this is the last attribute, there could be a comment following it that needs to be removed
            let comment_index = attribute_val.indexOf('#');
            if (comment_index !== -1)
                attribute_val = attribute_val.substring(0, comment_index).trim();

            if (attribute_val.length === 0)
                continue;

            this.attributes[attribute_name] = attribute_val;
        }

        this.valid = true;
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
        this.valid = false;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length !== 9)
            return;

        let range_begin = parseInt(line[3]);
        let range_end = parseInt(line[4]);
        let strand = line[6];
        if (isNaN(range_begin) || isNaN(range_end) || (range_begin > range_end) || ((strand !== '+') && (strand !== '-')))
            return;

        this.chromosome = line[0].trim();
        this.isStringTie = (line[1].toLowerCase().indexOf("stringtie") !== -1);
        this.feature = line[2];
        this.range = [range_begin, range_end];
        this.strand = strand;
        this.attributes = {};

        // reconstruct attributed column as JSON
        let info = line[8].split(';');

        for (let entry_index = 0; entry_index < info.length; ++entry_index)
        {
            let entry = info[entry_index];
            if (entry.length <= 1)
                continue;

            entry = entry.trim().split(' ');
            if (entry.length < 2)
                continue;

            let attribute_name = entry[0].toLowerCase();

            entry.shift();
            let attribute_val = entry.join(' ').replace(/"/g, '').trim();
            this.attributes[attribute_name] = attribute_val;
        }

        this.valid = true;
    }
}

/**
 * Class to represent a line of the combined annotations GTF file from GenomeProt
 */
class GenomeProtGTFLine
{
    /**
     * Create a GenomeProtGTFLine instance
     *
     * @param {string} dataString line of the combined annotations GTF file in string format
     */
    constructor(dataString)
    {
        this.valid = false;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length !== 9)
            return;

        let range_begin = parseInt(line[3]);
        let range_end = parseInt(line[4]);
        let strand = line[6];
        if (isNaN(range_begin) || isNaN(range_end) || (range_begin > range_end) || ((strand !== '+') && (strand !== '-')))
            return;

        this.chromosome = line[0].trim();

        // Only consider lines where the source is "custom" or another word that is not "custom" (e.g. "Bambu")
        // If the source is "custom", the feature must be either "exon" or "CDS"
        // Otherwise, the feature must be either "exon" or "transcript"

        // custom +       exon = Peptide genomic range
        // custom +        CDS = CDS of a transcript annotated with the peptide ID
        //  Bambu + transcript = Transcript genomic range
        //  Bambu +       exon = Transcript exon genomic range

        this.source = line[1];

        this.feature = line[2];
        if ((this.source === "custom" && (this.feature !== "exon" && this.feature !==        "CDS")) ||
            (this.source !== "custom" && (this.feature !== "exon" && this.feature !== "transcript")))
            return;

        this.range = [range_begin, range_end];
        this.strand = strand;
        this.attributes = {};

        // reconstruct attributed column as JSON
        let info = line[8].split(';');

        let allowed_attributes = ["peptide", "accession", "transcript_id", "gene_id",
                                  "pid", "transcript_biotype", "peptide_ids_gene", "peptide_ids_orf", "peptide_ids_transcript", "orf_type", "localisation",
                                  "gene_identified", "transcript_identified", "orf_identified",
                                  "gene_name", "exon_number", "group_id",
                                  "marker_gene", "p_val_adj", "avg_log2fc", "pct.1", "pct.2", "cluster", "against"];

        for (let i = 0; i < info.length; ++i)
        {
            let entry = info[i];
            if (entry.length <= 1)
                continue;

            entry = entry.trim().split(' ');
            if (entry.length < 2)
                continue;

            let attribute_name = entry[0].toLowerCase();
            if (allowed_attributes.indexOf(attribute_name) === -1)
                continue;

            entry.shift();
            let attribute_val = entry.join(' ').replace(/"/g, '').trim();
            this.attributes[attribute_name] = attribute_val;
        }

        this.valid = true;
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
        this.valid = false;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length !== 12)
            return;

        let start = parseInt(line[1]) + 1;
        let end = parseInt(line[2]);
        let orf_start = parseInt(line[6]) + 1;
        let orf_end = parseInt(line[7]);
        let blockCount = parseInt(line[9]);
        let strand = line[5];
        if (isNaN(start) || isNaN(end) || (start > end) || isNaN(blockCount) || (blockCount === 0) || ((strand !== '+') && (strand !== '-')))
            return;

        // Extract the gene ID and transcript ID
        let split_column = line[3].split('|', 2);
        if (split_column.length !== 2)
        {
            split_column = line[3].split('_', 2);
            if (split_column.length !== 2)
                return;
        }

        this.chromosome = line[0].trim();
        this.start = start;
        this.end = end;

        if (!isNaN(orf_start) && !isNaN(orf_end) && (orf_start <= orf_end))
        {
            this.orf_start = orf_start;
            this.orf_end = orf_end;
        }

        this.gene = split_column[1].split('.')[0].trim();
        this.transcript = split_column[0].split('.')[0].trim();
        this.strand = strand;

        this.blockCount = blockCount;
        this.blockSizes = buildBEDList(line[10]);
        this.blockStarts = buildBEDList(line[11]);

        // The number of block lengths and number of block starting positions must be equal to the number of blocks
        if ((blockCount !== this.blockSizes.length) || (blockCount !== this.blockStarts.length))
            return;

        this.valid = true;
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
        this.valid = false;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length !== num_columns)
            return;

        let start = parseInt(line[1]) + 1;
        let end = parseInt(line[2]);
        let strand = line[5];
        if (isNaN(start) || isNaN(end) || (start > end) || ((strand !== '+') && (strand !== '-')))
            return;

        // If both the thick start and thick end columns are included, check them
        if (num_columns >= 8)
        {
            let orf_start = parseInt(line[6]) + 1;
            let orf_end = parseInt(line[7]);
            if (!isNaN(orf_start) && !isNaN(orf_end) && (orf_start <= orf_end))
            {
                this.orf_start = orf_start;
                this.orf_end = orf_end;
            }
        }

        // Extract the gene ID and transcript ID
        let split_column = line[3].split('|', 2);
        if (split_column.length !== 2)
        {
            split_column = line[3].split('_', 2);
            if (split_column.length !== 2)
                return;
        }

        this.chromosome = line[0].trim();
        this.start = start;         // The exon start
        this.end = end;             // The exon end
        this.gene = split_column[1].split('.')[0].trim();
        this.transcript = split_column[0].split('.')[0].trim();
        this.strand = strand;

        this.valid = true;
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
        this.valid = false;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length !== num_columns)
            return;

        let start = parseInt(line[1]) + 1;
        let end = parseInt(line[2]);
        if (isNaN(start) || isNaN(end) || (start > end))
            return;

        // Extract the gene ID and transcript ID
        let split_column = line[3].split('|', 2);
        if (split_column.length !== 2)
        {
            split_column = line[3].split('_', 2);
            if (split_column.length !== 2)
                return;
        }

        this.chromosome = line[0].trim();
        this.start = start;         // The exon start
        this.end = end;             // The exon end
        this.gene = split_column[1].split('.')[0].trim();
        this.transcript = split_column[0].split('.')[0].trim();

        this.valid = true;
    }
}

/**
 * Class to represent a line of a BED12 file used to store peptide data
 */
class PeptideBEDLine
{
    /**
     * Create a PeptideBEDLine instance
     *
     * @param {string} dataString line of a peptide BED file in string format
     */
    constructor(dataString)
    {
        this.valid = false;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length !== 12)
            return;

        let start = parseInt(line[1]) + 1;
        let end = parseInt(line[2]);
        let blockCount = parseInt(line[9]);
        if (isNaN(start) || isNaN(end) || (start > end) || isNaN(blockCount) || (blockCount === 0))
            return;

        // Extract the transcript ID and peptide sequence
        let split_column = line[3].split('|', 2);
        if (split_column.length !== 2)
        {
            split_column = line[3].split('_', 2);
            if (split_column.length !== 2)
                return;
        }

        this.start = start;
        this.end = end;
        this.transcript = split_column[0].split('.')[0].trim();
        this.peptide = split_column[1].trim();

        // Reject lines containing empty transcripts and peptides
        if ((this.transcript.length === 0) || (this.peptide.length === 0))
            return;

        this.blockCount = blockCount;
        this.blockSizes = buildBEDList(line[10]);
        this.blockStarts = buildBEDList(line[11]);

        // The number of block lengths and number of block starting positions must be equal to the number of blocks
        if ((blockCount !== this.blockSizes.length) || (blockCount !== this.blockStarts.length))
            return;

        this.valid = true;
    }
}

/**
 * Class to represent a line of a BED12 file used to store peptide data
 */
class PeptideReducedBEDLine
{
    /**
     * Create a PeptideBEDLine instance
     *
     * @param {string} dataString line of a peptide BED file in string format
     * @param {Number} num_columns number of columns in the line; there should be only 6 to 9 lines
     */
    constructor(dataString, num_columns)
    {
        this.valid = false;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length !== num_columns)
            return;

        let start = parseInt(line[1]) + 1;
        let end = parseInt(line[2]);
        if (isNaN(start) || isNaN(end) || (start > end))
            return;

        // Extract the transcript ID and peptide sequence
        let split_column = line[3].split('|', 2);
        if (split_column.length !== 2)
        {
            split_column = line[3].split('_', 2);
            if (split_column.length !== 2)
                return;
        }

        this.start = start;
        this.end = end;
        this.transcript = split_column[0].split('.')[0].trim();
        this.peptide = split_column[1].trim();

        // Reject lines containing empty transcripts and peptides
        if ((this.transcript.length === 0) || (this.peptide.length === 0))
            return;

        this.valid = true;
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
        this.valid = false;

        // extract data from input
        let line = dataString.split('\t');
        if (line.length !== num_columns)
            return;

        let start = parseInt(line[1]) + 1;
        let end = parseInt(line[2]);
        if (isNaN(start) || isNaN(end) || (start !== end))
            return;

        this.start = start;
        this.end = end;
        this.gene = line[3].split('.')[0].trim();

        // Reject lines containing empty genes
        if (this.gene.length === 0)
            return;

        this.valid = true;
    }
}

/**
 * Class for representing an isoform
 */
class Isoform
{
    /**
     * Create an isoform instance
     *
     * @param {string} label the Ensembl transcript ID for the isoform
     * @param {object} exons enumeration of exons storing coordinates and strand
     * @param {object} orfs the regions of all ORFs found encoded in the gene of the isoform
     */
    constructor(label, exons, orfs = null)
    {
        this.transcriptID = label;
        this.strand = exons.strand;
        let is_forward_strand = (this.strand === '+');

        this.exonRanges = JSON.parse(JSON.stringify(exons.exons));
        this.exonRanges.sort((exon0, exon1) => exon0[0] - exon1[0]);

        // Ensure there is no overlap between exon ranges
        while (true)
        {
            let is_overlapping = false;

            for (let i = 0; i < this.exonRanges.length - 1; ++i)
            {
                let exon0 = this.exonRanges[i];
                let exon1 = this.exonRanges[i + 1];
                let merged = union(exon0, exon1);
                if (merged.length !== 0)
                {
                    is_overlapping = true;
                    this.exonRanges.splice(i, 1);
                    this.exonRanges[i] = merged;
                    break;
                }
            }

            if (!is_overlapping)
                break;
        }

        if (!is_forward_strand)
            this.exonRanges.reverse();

        // TODO: In the future, avoid using union() so that it's possible to identify and visualize overlapping ORFs within an isoform
        this.user_orf = [];
        this.overlapping_orf_regions = [];
        if (exons.user_orf && (exons.user_orf.length !== 0))
        {
            this.user_orf = JSON.parse(JSON.stringify(exons.user_orf));
            this.user_orf.sort((exon0, exon1) => exon0[0] - exon1[0]);

            // Only applicable for non-GenomeProt(SC) data
            if (!(exons.accessions))
                this.overlapping_orf_regions = calculate_overlapping_regions(this.user_orf);

            // Ensure there is no overlap between user ORF ranges
            while (true)
            {
                let is_overlapping = false;

                for (let i = 0; i < this.user_orf.length - 1; ++i)
                {
                    let orf0 = this.user_orf[i];
                    let orf1 = this.user_orf[i + 1];
                    let merged = union(orf0, orf1);
                    if (merged.length !== 0)
                    {
                        is_overlapping = true;
                        this.user_orf.splice(i, 1);
                        this.user_orf[i] = merged;
                        break;
                    }
                }

                if (!is_overlapping)
                    break;
            }

            if (!is_forward_strand)
                this.user_orf.reverse();
        }

        // Store other data
        this.start = is_forward_strand ? this.exonRanges[0][0] : this.exonRanges[this.exonRanges.length - 1][0];
        this.end = is_forward_strand ? this.exonRanges[this.exonRanges.length - 1][1] : this.exonRanges[0][1];
        this.length = Math.abs(this.end - this.start);
        this.orf = [];

        // Only applicable for GenomeProt(SC) data
        this.accessions = [];
        if (exons.accessions)
        {
            this.accessions = JSON.parse(JSON.stringify(exons.accessions));
            this.accessions.sort((a, b) => a.localeCompare(b, "en", {numeric: true, sensitivity: "case"}));

            if ((this.accessions.length > 1) && orfs && (Object.keys(orfs).length > 1))
            {
                let orf_regions = [];
                for (let accession of this.accessions)
                    for (let orf_region of orfs[accession])
                        orf_regions.push(orf_region);

                if (orf_regions.length <= 1)
                    return;

                orf_regions.sort((block0, block1) => block0[0] - block1[0]);
                this.overlapping_orf_regions = calculate_overlapping_regions(orf_regions);
            }
        }
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

        let protein_coding_biotypes = ["IG_C_gene", "IG_D_gene", "IG_J_gene", "IG_V_gene", "TR_C_gene", "TR_D_gene", "TR_J_gene", "TR_V_gene", "non_stop_decay", "nonsense_mediated_decay", "protein_coding", "protein_coding_LoF"];

        for (let transcript of transcripts)
        {
            if (!transcript.Exon || !transcript.id)
                continue;

            let transcript_id = transcript.id;
            if (all_stack_isoform_ids.indexOf(transcript_id) !== -1)
                continue;

            let is_protein_coding = (protein_coding_biotypes.indexOf(transcript.biotype) !== -1);

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
            this.transcripts[transcript_id].exons = [];
            this.transcripts[transcript_id].strand = this.strand;
            this.transcripts[transcript_id].is_protein_coding = is_protein_coding;

            let exons = transcript.Exon;
            if (this.strand === '-')
                exons.reverse();

            for (let exon of exons)
                this.transcripts[transcript_id].exons.push([exon.start, exon.end]);
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
 * Calculate metagene for an isoform set
 *
 * @param {Array<Isoform>} isoformList List of all isoforms in the set
 * @returns {Array<Array<number>>} List of coordinates for exonic regions in the metagene
 */
export function mergeRanges(isoformList)
{
    let temp = [], exons = [], merged = [];

    // extract all exons from isoforms
    for (let isoform of isoformList)
        for (let exon of isoform.exonRanges)
            if (exons.length === 0 || !checkInclusion(exon, exons))
                exons.push(exon);

    // compute unions between exon pairs and store in temporary list
    for (let exon of exons)
    {
        if (temp.length === 0)
            temp.push(exon);
        else
        {
            for (let i = 0; i < temp.length; ++i)
            {
                let currentUnion = union(temp[i], exon);
                if (currentUnion.length !== 0)
                {
                    temp.splice(i, 1);
                    exon = currentUnion;
                    i = -1;
                    continue;
                }
            }
            temp.push(exon);
        }
    }

    // collect all unique coordinate pairs from temporary list, sort and return
    for (let exon of temp)
        if (!checkInclusion(exon, merged))
            merged.push(exon);

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
export function union(exon1, exon2)
{
    let [[start1, end1], [start2, end2]] = [exon1, exon2];

    if ((end2 < start1) || (start2 > end1))
        return [];

    return [Math.min(start1, start2), Math.max(end1, end2)];
}

/**
 * Calculate the intersection of between the ORF of a transcript and one of its exons
 *
 * @param {Array<number>} orf The start and end coordinates of the ORF
 * @param {Array<number>} exon The start and end coordinates of the exon
 * @returns {Array<number>} Coordinates of the intersection (empty if none found)
 */
export function intersection(orf, exon)
{
    let [[orf_start, orf_end], [exon_start, exon_end]] = [orf, exon];

    if ((exon_end < orf_start) || (exon_start > orf_end))
        return [];

    return [Math.max(orf_start, exon_start), Math.min(orf_end, exon_end)];
}

/**
 * Check if a list has a specified entry in it
 *
 * @param {*} entry The entry to search for
 * @param {Array<*>} list The list to search
 * @returns {boolean} Boolean value describing inclusion
 */
function checkInclusion(entry, list)
{
    for (let value of list)
        if (entry.every((val, index) => val === value[index]))
            return true;

    return false;
}

/**
 * Find overlapping regions in a list of regions sorted by ascending start coordinates
 *
 * @param {Array<*>} regions The list of regions (must be sorted by ascending start coordinates)
 * @returns {Array<*>} The list of overlapping regions
 */
function calculate_overlapping_regions(regions)
{
    let overlapping_regions = [];

    for (let i = 0; i < regions.length - 1; ++i)
    {
        let region0 = regions[i];
        for (let j = i + 1; j < regions.length; ++j)
        {
            let region1 = regions[j];
            if (region0[1] < region1[0])
                break;

            let overlapping_region = intersection(region0, region1);
            if (overlapping_region.length !== 0)
            {
                let is_overlapping_region_unique = true;
                for (let [a, b] of overlapping_regions)
                {
                    if ((a === overlapping_region[0]) && (b === overlapping_region[1]))
                    {
                        is_overlapping_region_unique = false;
                        break;
                    }
                }

                if (is_overlapping_region_unique)
                    overlapping_regions.push(overlapping_region);
            }
        }
    }

    while (true)
    {
        let new_regions_added = false;
        overlapping_regions.sort((block0, block1) => block0[0] - block1[0]);

        for (let i = 0; i < overlapping_regions.length - 1; ++i)
        {
            let region0 = overlapping_regions[i];
            for (let j = i + 1; j < overlapping_regions.length; ++j)
            {
                let region1 = overlapping_regions[j];
                if (region0[1] < region1[0])
                    break;

                let merged_region = union(region0, region1);
                if (merged_region.length !== 0)
                {
                    overlapping_regions.splice(j, 1);
                    overlapping_regions.splice(i, 1);
                    overlapping_regions.push(merged_region);
                    new_regions_added = true;
                    break;
                }
            }

            if (new_regions_added)
                break;
        }

        if (!new_regions_added)
            break;
    }

    return overlapping_regions;
}