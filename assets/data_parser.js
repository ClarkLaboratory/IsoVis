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

export class PrimaryData {
    /**
     * Create a primary data instance
     * 
     * @param {string} file the input file
     * @param {string} gene ID for the gene of interest
     */
    constructor(file, gene)
    {
        this.valid = false; // set to true at the end
        this.error = "";
        this.file = file;
        this.gene = gene;
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

        if (filename.endsWith(".gff3"))
            this.filetype = "GFF3";
        else if (filename.endsWith(".gff") || filename.endsWith(".gff2") || filename.endsWith(".gtf"))
            this.filetype = "GTF";
        else if (filename.endsWith(".bed") || filename.endsWith(".bed12"))
            this.filetype = "BED";
        else
        {
            this.error = "Invalid stack file extension.";
            return;
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
                this.genesFromBED(filtered_lines);
            else if (first_parser_type === "e_BED")
                this.exonsFromBED(filtered_lines);

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
                    this.exonsFromBED(filtered_lines);

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
        this.leftEnd = this.mergedRanges[0][0];
        this.rightEnd = this.mergedRanges[this.mergedRanges.length - 1][1];
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
            if ((!line.valid) || (line.feature !== "exon"))
                continue;

            // Extract the transcript's chromosome
            if ((!this.chromosome) && line.chromosome)
                this.chromosome = line.chromosome;

            let transcript = line.attributes.transcript_id;
            if (!transcript)
                continue;

            transcript = transcript.split(".")[0];

            if (!(transcript in this.transcripts))
                this.transcripts[transcript] = {};

            if (!this.transcripts[transcript].exon_count)
                this.transcripts[transcript].exon_count = 0;

            let exon = this.transcripts[transcript].exon_count;
            this.transcripts[transcript][exon] = line.range;
            this.transcripts[transcript].strand = line.strand;
            this.transcripts[transcript].exon_count += 1;
        }
    }

    exonsFromGTF(lines)
    {
        for (let raw_line of lines)
        {
            let line = new GTFLine(raw_line);
            if ((!line.valid) || (line.feature !== "exon"))
                continue;

            // Extract the transcript's chromosome
            if ((!this.chromosome) && line.chromosome)
                this.chromosome = line.chromosome;

            let transcript = line.attributes.transcript_id;
            if (!transcript)
                continue;

            if (!line.isStringTie)
                transcript = transcript.split(".")[0];

            if (!(transcript in this.transcripts))
                this.transcripts[transcript] = {};

            if (!this.transcripts[transcript].exon_count)
                this.transcripts[transcript].exon_count = 0;

            let exon = this.transcripts[transcript].exon_count;
            this.transcripts[transcript][exon] = line.range;
            this.transcripts[transcript].strand = line.strand;
            this.transcripts[transcript].exon_count += 1;
        }
    }

    exonsFromBED(lines)
    {
        for (let raw_line of lines)
        {
            let line = new BEDLine(raw_line);
            if (!line.valid)
                continue;

            // Extract the transcript's chromosome
            if ((!this.chromosome) && line.chromosome)
                this.chromosome = line.chromosome;

            let transcript = line.transcript;
            if (!transcript)
                continue;

            transcript = transcript.split(".")[0];

            if (!(transcript in this.transcripts))
                this.transcripts[transcript] = {};

            for (let i = 0; i < line.blockCount; ++i)
            {
                let start = line.start + line.blockStarts[i];
                let size = line.blockSizes[i];
                let range = [start, start + size - 1];
                this.transcripts[transcript][i] = range;
            }

            this.transcripts[transcript].strand = line.strand;
        }
    }

    genesFromGFF3(lines)
    {
        for (let line of lines)
        {
            let gff3_line = new GFF3Line(line);
            if (!gff3_line.valid)
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
            if (!gtf_line.valid)
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
        for (let line of lines)
        {
            let columns = line.split('\t');
            if (columns.length < 4)
                continue;

            let split_column = columns[3].split('|', 2);
            if (split_column.length !== 2)
                split_column = columns[3].split('_', 2);

            if (split_column.length !== 2)
                continue;
            
            let gene = split_column[1].split('.')[0].toUpperCase();
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
        });
        return text;
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
     */
    constructor(file, gene) {
        this.valid = false;
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
        if (this.samples.length < 3)
        {
            this.error = "First line of heatmap file has less than 3 data columns. The file must have at least 3 data columns.";
            return;
        }
        
        this.gene_id_colnum = this.samples.indexOf("gene_id");
        if (this.gene_id_colnum === -1)
        {
            this.error = "No gene_id column found in the heatmap file.";
            return;
        }

        this.transcript_id_colnum = this.samples.indexOf("transcript_id");
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
            this.warning = "The heatmap file does not contain any information on the gene to be visualized.";
            this.average = NaN;
            this.logAverage = NaN;
        }
        else
        {
            if (this.num_nonzerovals === 0)
                this.num_nonzerovals = 1;

            // calculate averages
            this.average = this.sum / this.num_nonzerovals;
            this.logAverage = Math.log10(this.average);
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
        let uppercase_gene_to_search = this.gene.toUpperCase();

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
            if (line.toUpperCase().indexOf(uppercase_gene_to_search) !== -1)
                filtered_lines.push(line);
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

            let gene = entries[this.gene_id_colnum].split('.')[0];
            if (gene !== this.gene)
                continue;

            let transcript_id = entries[this.transcript_id_colnum].split('.')[0];
            if (transcript_id && (this.transcripts.indexOf(transcript_id) === -1))
                this.transcripts.push(transcript_id);

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
    constructor(jsonData) {

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
        this.leftEnd = this.mergedRanges[0][0];
        this.rightEnd = this.mergedRanges[this.mergedRanges.length - 1][1];
        this.width = Math.abs(this.end - this.start);
        this.strand = jsonData.strand > 0 ? '+' : '-';
        this.display = jsonData.display_name;
        this.proteinID = jsonData.Translation ? jsonData.Translation.id : null;
        this.uniprotID = jsonData.uniprotID ? jsonData.uniprotID : null;
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
        this.isoformCoords = null;
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
        this.P2CMap = (coord) => ([3 * (coord), 3 * (coord) - 1]); // Protein to CDS: 3 nt for each aa

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
                        "colour": colour,
                        "type": type,
                        "display": true,
                        "start": start,
                        "end": end,
                        "metadata":
                        {
                            "database": database,
                            "type": type,
                            "start": start,
                            "end": end
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
                if (result.metadata == null)
                    continue;
                if ((valid_types.indexOf(result.metadata.type) === -1) || result.metadata.source_database !== valid_database)
                    continue;
                for (let protein of result.proteins)
                {
                    for (let entry_protein_location of protein.entry_protein_locations)
                    {
                        for (let fragment of entry_protein_location.fragments)
                        {
                            let region_obj = 
                            {
                                "modelStart": fragment.start,
                                "modelEnd": fragment.end,
                                "start": fragment.start,
                                "end": fragment.end,
                                "modelLength": fragment.end - fragment.start,
                                "colour": "#4a1c83",
                                "endStyle": "curved",
                                "startStyle": "curved",
                                "text": "",
                                "type": "pfama",
                                "display": true,
                                "aliStart": fragment.start,
                                "aliEnd": fragment.end,
                                "href": "/family/" + entry_protein_location.model,
                                "metadata":
                                {
                                    "start": fragment.start,
                                    "end": fragment.end,
                                    "scoreName": "e-value",
                                    "score": entry_protein_location.score.toString(),
                                    "aliStart": fragment.start,
                                    "aliEnd": fragment.end,
                                    "description": result.metadata.name,
                                    "accession": result.metadata.accession,
                                    "database": result.metadata.source_database,
                                    "identifier": result.metadata.name.substring(0, result.metadata.name.indexOf(' ')),
                                    "type": result.metadata.type.charAt(0).toUpperCase() + result.metadata.type.substring(1)
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
                region.aliStart = data.length - copy.aliEnd;
                region.aliEnd = data.length - copy.aliStart;
                region.modelStart = data.length - copy.modelEnd;
                region.modelEnd = data.length - copy.modelStart;
                region.startStyle = copy.endStyle;
                region.endStyle = copy.startStyle;
                region.metadata.start = copy.metadata.end;
                region.metadata.end = copy.metadata.start;
                region.metadata.aliStart = copy.metadata.aliEnd;
                region.metadata.aliEnd = copy.metadata.aliStart;
            }
        }

        if (data.motifs != null)
        {
            for (var motif of data.motifs)
            {
                var copy = JSON.parse(JSON.stringify(motif))
                motif.start = data.length - copy.end;
                motif.end = data.length - copy.start;
                motif.metadata.start = copy.metadata.end;
                motif.metadata.end = copy.metadata.start;
            }
        }
    }

    getMap()
    {
        // initalise coordinate lists
        let domainCoords = [];
        let motifCoords = [];
        for (let region of this.originalData.regions) domainCoords.push([region.start, region.end]);
        for (let region of this.originalData.motifs) if (region.display) motifCoords.push([region.start, region.end]); // only map features displayed in the graphic (some are occasionally hidden)

        // map domains
        for (let coord of domainCoords) {
            let start = this.isoformCoords ? parseInt(this.isoformCoords[coord[0]]) : coord[0]; // use updated coords if necessary
            let end = this.isoformCoords ? parseInt(this.isoformCoords[coord[1]]) : coord[1];
            this.domainMap[start] = this.C2GMap(this.P2CMap(this.reversed ? end : start)[0]); // map coords
            this.domainMap[end] = this.C2GMap(this.P2CMap(this.reversed ? start : end)[1]);
        }

        // map features
        for (let coord of motifCoords) {
            let start = coord[0];
            let end = coord[1];
            this.motifMap[start] = this.C2GMap(this.P2CMap(this.reversed ? end : start)[0]); // map coords
            this.motifMap[end] = this.C2GMap(this.P2CMap(this.reversed ? start : end)[1]);
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
        if (line.length < 12)
        {
            this.valid = false;
            return;
        }

        let start = parseInt(line[1]) + 1;
        let end = parseInt(line[2]);
        let blockCount = parseInt(line[9]);
        let strand = line[5].trim();
        if (isNaN(start) || isNaN(end) || isNaN(blockCount) || ((strand !== '+') && (strand !== '-')))
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
        this.gene = split_column[1].split('.')[0].trim();
        this.transcript = split_column[0].split('.')[0].trim();
        this.strand = strand;

        this.blockCount = blockCount;
        this.blockSizes = this.buildList(line[10]);
        this.blockStarts = this.buildList(line[11]);

        // The number of exon lengths and number of exon starting positions must be equal to the number of exons
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
        this.exonRanges = []
        for (let value of Object.values(this.exons)) {
            this.exonRanges.push(value);
        }
        this.start = this.strand == '+' ? this.exonRanges[0][0] : this.exonRanges[this.exonRanges.length - 1][1];
        this.end = this.strand == '+' ? this.exonRanges[this.exonRanges.length - 1][1] : this.exonRanges[0][0];
        this.length = Math.abs(this.end - this.start);
        this.orf = []
    }
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
 * Calculate the overlap between two exons
 * 
 * @param {Array<number>} exon1 The start and end coordinates of the first exon
 * @param {Array<number>} exon2 The start and end coordinates of the second exon
 * @returns {Array<number>} Coordinates of the overlap (empty if no overlap found)
 */
function union(exon1, exon2) {
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