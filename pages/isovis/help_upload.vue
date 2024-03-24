/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

<template>
<b-container class="pt-2 text-justify">
    <strong><em>Supported genome builds:</em></strong><br>
    IsoVis queries Ensembl to integrate additional information about the displayed gene and known Ensembl transcripts in uploaded stack data into visualizations.<br>
    Ensembl supports only the most recent genome build for all species and additionally supports GRCh37 (hg19) for human data.<br>
    To correctly visualize your data, please ensure you are using either GRCh38 (hg38) or GRCh37 (hg19) for human data, and the most recent genome build found in Ensembl for data from any other species supported by IsoVis.

    <hr>

    <strong><em>GFF/GTF:</em></strong><br>
    Stack data can be provided in GFF or GTF files.<br>
    GFF3 files must have a file extension of '.gff3'.<br>
    GTF files must have a file extension of '.gtf', '.gff', or '.gff2'.<br><br>
    The attributes column (column 9) of each line <strong> must contain</strong>:<ol>
        <li>
            A <strong>'gene_id'</strong> attribute storing either<ul>
                <li>The Ensembl gene ID (preferred)<br>
                    (e.g. gene_id "ENSG00000123456.1")</li>
                <li>A unique identifier for the gene/genomic locus<br>
                    (e.g. gene_id "nonHuman1")</li>
            </ul>
        </li>
        <li>
            A <strong>'transcript_id'</strong> attribute storing either<ul>
                <li>The corresponding Ensembl ID for <em>known</em> transcripts<br>
                    (e.g. transcript_id "ENST00000123456.1")</li>  
                <li>A unique identifier for <em>novel</em> transcripts<br>
                    (e.g. transcript_id "novelTranscript1")</li>
            </ul> 
        </li>
    </ol>
    The exons of each transcript must be ordered by ascending starting genome coordinates.<br>
    The strand of each transcript isoform (column 7) must be specified.

    <hr>

    <strong><em>BED12:</em></strong><br>
    Stack data can be provided as a BED12 file.<br>
    BED12 files must have a file extension of either '.bed' or '.bed12'.<br><br>

    The name column (column 4) of each line <strong>must contain</strong> a gene ID and transcript ID in the format <strong>transcriptID_geneID</strong> or <strong>transcriptID|geneID</strong>. Example:
    <ul>
        <li><strong>ENST00000123456.1_ENSG00000123456.1</strong> or <strong>ENST00000123456.1|ENSG00000123456.1</strong> (for known transcripts)</li>
        <li><strong>novelTranscript1_ENSG00000123456.1</strong> or <strong>novelTranscript1|ENSG00000123456.1</strong> (for novel transcripts)</li>
    </ul>
    The strand of each transcript isoform (column 6) must be specified.

    <hr>

    <strong><em>BED6 to BED9:</em></strong><br>
    Stack data can be provided as a BED6, BED7, BED8 or BED9 file.<br>
    BED6 to BED9 files must have a file extension of either '.bed' or '.bedx', where 'x' is 6, 7, 8, or 9.<br><br>

    These files have the same formatting requirements as BED12 files along with the following additional requirements:
    <ol>
        <li>The start (column 2) and end (column 3) of the chromosome region in each line represents the start and end of an exon instead of a whole transcript.</li>
        <li>The exons of each transcript must be ordered by ascending starting genome coordinates.</li>
    </ol>

    <hr>

    <strong><em>BED4 to BED5:</em></strong><br>
    Stack data can be provided as a BED4 or BED5 file.<br>
    BED4 to BED5 files must have a file extension of either '.bed' or '.bedx', where 'x' is 4 or 5.<br><br>

    These files have the same formatting requirements as BED6 to BED9 files.<br><br>

    <b>Note on determining gene strandedness:</b><br>
    As BED4 to BED5 files do not contain the gene strand column, IsoVis would attempt to fetch this information from Ensembl using the gene ID and species specified by the user.<br>
    If this information could not be fetched, IsoVis would <u>assume</u> that the transcripts of the gene are on the forward strand, and the gene strand diagram would display 'Assumed forward strand.'<br>
    To ensure that the gene strandedness could be determined, please specify the correct gene IDs in the stack file and the correct species when uploading stack data.

    <hr>

    <strong><em>Heatmap data:</em></strong><br>
    Heatmap data can be provided either as a <strong>CSV</strong> file or a <strong>tab-delimited text file</strong>.<br>
    Heatmap files must have a file extension of either '.csv' or '.txt'.<br><br>

    The first row of the file should contain column names.<br><br>

    These two columns <strong>must</strong> be in the file:
    <ul>
        <li>gene_id, which stores the gene ID of each row (e.g. ENSG00000116786.13).</li>
        <li>transcript_id, which stores the transcript ID of each row (e.g. ENST00000375793.2).</li>
    </ul>
    All other columns should:
    <ul>
        <li>Be named by unique sample IDs.</li>
        <li>Contain numeric data corresponding to the transcript/sample of the corresponding row/column.</li>
    </ul>
    There is no requirement on the positions of the columns.<br><br>
    Example heatmap data:<table class="table b-table table-sm">
        <thead>
            <tr>
                <th>gene_id</th>
                <th>transcript_id</th>
                <th>sample_1</th>
                <th>sample_2</th>
                <th>sample_3</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>ENSG00000123456.1</td>
                <td>ENST00000123456.1</td>
                <td>11.2554</td>
                <td>12.9126</td>
                <td>12.1272</td>
            </tr>
            <tr>
                <td>ENSG00000123456.1</td>
                <td>novelTranscript1</td>
                <td>19.3096</td>
                <td>33.6227</td>
                <td>33.6221</td>
            </tr>
            <tr>
                <td>novelGene1</td>
                <td>novelTranscript2</td>
                <td>17.7803</td>
                <td>4.2698</td>
                <td>10.0318</td>
            </tr>
        </tbody>
    </table>

    <hr>

    <strong><em>Important notes:</em></strong><br>
    1. Gene and transcript IDs are trimmed at '.' characters to generalise different versions of Ensembl IDs<br>
    (e.g. <em>ENSG00000123456<strong>.1</strong></em> and <em>ENSG00000123456<strong>.2</strong></em> both become <em>ENSG00000123456</em>).<br>
    Please avoid including '.' elsewhere in gene and transcript IDs to avoid unintended trimming.<br>
    <br>
    2. For BED files, gene and transcript IDs can be separated by an underscore ('_') or a vertical line ('|').<br>
    Please avoid including '_' or '|' elsewhere in gene and transcript IDs to ensure the data is parsed correctly.<br>
    <br>
    3. To visualize genes found on multiple chromosomes, we suggest ensuring the transcript IDs differ before the dot character ('.').<br>
    For example, if the transcript IDs being used are 'ENSTxxxxx.4' and 'ENSTxxxxx.4_PAR_Y', IsoVis trims them at the '.' during file parsing and turns them into 'ENSTxxxxx'.<br>
    This causes both transcripts to be considered as the same transcript and <b>visualized incorrectly as one transcript</b> instead of two.<br>
    Transcript IDs that could be used instead are 'ENSTxxxxx.4' and 'ENSTxxxxxY.4'.
</b-container>
</template>

<script>

import { BContainer } from 'bootstrap-vue';

export default
{
    components: {
        BContainer
    }
}

</script>