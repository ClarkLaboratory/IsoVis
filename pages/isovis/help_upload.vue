/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

<template>
    <b-container class="text-justify">
        <div class="text-center">
            <h2>Help on upload data</h2>
        </div>
        <div>
            <b><u>Table of contents:</u></b>
            <br>
            <ol>
                <li><b-link href="#supported_genome_builds">Supported genome builds</b-link></li>
                <li><b-link href="#isoform_stack_data">Isoform stack data</b-link></li>
                <ul>
                    <li><b-link href="#isoform_stack_gff_gtf">GFF/GTF files</b-link></li>
                    <li><b-link href="#isoform_stack_bed">BED files</b-link></li>
                    <ol>
                        <li><b-link href="#isoform_stack_bed12">BED12</b-link></li>
                        <li><b-link href="#isoform_stack_bed6_to_bed9">BED6 to BED9</b-link></li>
                        <li><b-link href="#isoform_stack_bed4_to_bed5">BED4 to BED5</b-link></li>
                    </ol>
                </ul>
                <li><b-link href="#isoform_heatmap_data">Isoform heatmap data</b-link></li>
                <li><b-link href="#rna_modifications_data">RNA modifications data</b-link></li>
                <li><b-link href="#rna_modification_level_data">RNA modification level data</b-link></li>
                <li><b-link href="#important_notes">Important notes</b-link></li>
            </ol>
        </div>
        <hr>
        <b-link name="supported_genome_builds"></b-link>
        <h3>Supported genome builds</h3>
        <br>
        <div>
            IsoVis queries Ensembl to integrate additional information about the displayed gene and known Ensembl transcripts in uploaded isoform stack data into visualizations.
            <br><br>
            Ensembl supports only the most recent genome build for all species and additionally supports GRCh37 (hg19) for human data.
            <br><br>
            To correctly visualize your data, please ensure you are using either GRCh38 (hg38) or GRCh37 (hg19) for human data, and the most recent genome build found in Ensembl for data from any other species supported by IsoVis.
        </div>
        <br>
        <b-link name="isoform_stack_data"></b-link>
        <h3>Isoform stack data</h3>
        <br>
        <div>
            Isoform stack data can be provided in <b-link href="#isoform_stack_gff_gtf">GFF/GTF files</b-link> or <b-link href="#isoform_stack_bed">BED files</b-link>.
            <br><br>
            <b-link name="isoform_stack_gff_gtf"></b-link>
            <b><u>Isoform stack data GFF/GTF files:</u></b>
            <br><br>
            GFF3 files must have a file extension of '.gff3'.<br>
            GTF files must have a file extension of '.gtf', '.gff', or '.gff2'.<br><br>
            IsoVis only considers lines where the feature column (column 3) is either '<b>exon</b>' (isoform exons) or '<b>CDS</b>' (user ORFs). All other lines are ignored.<br>
            The attributes column (column 9) of each line <strong>must contain</strong>:<ol>
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
            The exons and user ORF of each transcript <b>must</b> be ordered by <b>ascending</b> starting genome coordinates.<br>
            The strand of each transcript isoform (column 7) must be specified.
            <br><br>

            <b-link name="isoform_stack_bed"></b-link>
            <b><u>Isoform stack data BED files:</u></b>
            <br><br>
            IsoVis supports loading isoform stack data from <b-link href="#isoform_stack_bed12">BED12 files</b-link>, <b-link href="#isoform_stack_bed6_to_bed9">BED6 to BED9 files</b-link>, and <b-link href="#isoform_stack_bed4_to_bed5">BED4 to BED5 files</b-link>.<br>
            Each type of BED file has specific formatting requirements.
            <br><br>

            <b-link name="isoform_stack_bed12"></b-link>
            <u>1. BED12:</u><br>
            BED12 files must have a file extension of either '.bed' or '.bed12'.<br><br>

            The name column (column 4) of each line <strong>must contain</strong> a gene ID and transcript ID in the format <strong>transcriptID_geneID</strong> or <strong>transcriptID|geneID</strong>. Example:
            <ul>
                <li><strong>ENST00000123456.1_ENSG00000123456.1</strong> or <strong>ENST00000123456.1|ENSG00000123456.1</strong> (for known transcripts)</li>
                <li><strong>novelTranscript1_ENSG00000123456.1</strong> or <strong>novelTranscript1|ENSG00000123456.1</strong> (for novel transcripts)</li>
            </ul>
            The strand of each transcript isoform (column 6) must be specified.<br>
            To specify user ORFs, put the start and end coordinates of ORFs in the <b>thickStart</b> and <b>thickEnd</b> columns (columns 7 and 8) respectively. The start coordinate must be lower than the end coordinate.<br>
            For transcripts without user ORFs, set the <b>thickStart</b> and <b>thickEnd</b> columns to a dash ('-').

            <br><br>

            <b-link name="isoform_stack_bed6_to_bed9"></b-link>
            <u>2. BED6 to BED9:</u><br>
            BED6 to BED9 files must have a file extension of either '.bed' or '.bedx', where 'x' is 6, 7, 8, or 9.<br><br>

            These files have the same formatting requirements as BED12 files along with the following additional requirements:
            <ol>
                <li>The start (column 2) and end (column 3) of the chromosome region in each line represents the start and end of an exon instead of a whole transcript.</li>
                <li>The exons of each transcript <b>must</b> be ordered by <b>ascending</b> starting genome coordinates.</li>
            </ol>
            As user ORF data are stored in the 7th and 8th columns of a BED file, only BED8 and BED9 files may be used to store such data.

            <br><br>

            <b-link name="isoform_stack_bed4_to_bed5"></b-link>
            <u>3. BED4 to BED5:</u><br>
            BED4 to BED5 files must have a file extension of either '.bed' or '.bedx', where 'x' is 4 or 5.<br><br>

            These files have the same formatting requirements as BED6 to BED9 files.<br><br>

            As such files <b>do not contain the gene strand column</b>, IsoVis would <u>attempt to fetch this information from Ensembl using the gene ID and species specified by the user</u>.<br>
            If this information could not be fetched, IsoVis would <u>assume</u> that the transcripts of the gene are on the forward strand, and the gene strand diagram would display 'Assumed forward strand.'<br>
            To ensure that the gene strandedness could be determined, please specify the correct gene IDs in the stack file and the correct species when uploading stack data.
        </div>
        <br>
        <b-link name="isoform_heatmap_data"></b-link>
        <h3>Isoform heatmap data</h3>
        <br>
        <div>
            Isoform heatmap data can be provided either as a <strong>CSV</strong> file or a <strong>tab-delimited text file</strong>.<br>
            These files must have a file extension of either '.csv' or '.txt'.
            <br><br>
            The first row of the file should contain column names.
            <br><br>
            The <b>transcript_id</b> column <strong>must</strong> be in the file. It stores the transcript ID of each row (e.g. ENST00000375793.2).<br>
            All other columns should:
            <ul>
                <li>Be named by unique sample IDs.</li>
                <li>Contain numeric data corresponding to the transcript/sample of the corresponding row/column.</li>
            </ul>
            <b>Note</b>: Older IsoVis versions used to require a gene_id column in isoform heatmap data files. For backwards compatibility, the current version of IsoVis ignores the gene_id column if it is present.
            <br><br>
            There is no requirement on the positions of the columns.
            <br><br>
            Example isoform heatmap data:<table class="table b-table table-sm">
                <thead>
                    <tr>
                        <th>transcript_id</th>
                        <th>sample_1</th>
                        <th>sample_2</th>
                        <th>sample_3</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>ENST00000123456.1</td>
                        <td>11.2554</td>
                        <td>12.9126</td>
                        <td>12.1272</td>
                    </tr>
                    <tr>
                        <td>novelTranscript1</td>
                        <td>19.3096</td>
                        <td>33.6227</td>
                        <td>33.6221</td>
                    </tr>
                    <tr>
                        <td>novelTranscript2</td>
                        <td>17.7803</td>
                        <td>4.2698</td>
                        <td>10.0318</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <br>
        <b-link name="rna_modifications_data"></b-link>
        <h3>RNA modifications data</h3>
        <br>
        <div>
            RNA modifications data can be provided either as a <b>BED4 to BED9</b> or <b>BED12</b> file.<br>
            These files must have a file extension of either '.bed' or '.bedx', where 'x' is 4, 5, 6, 7, 8, 9 or 12.
            <br><br>
            The name column (column 4) of each line <strong>must</strong> be a gene ID.<br>
            The genomic start and end coordinates of each RNA modification site <strong>must</strong> be specified in columns 2 and 3 respectively.<br>
            Since each RNA modification site is only one nucleotide long, the end coordinate of a site <strong>must</strong> be 1 more than its start coordinate.<br>
            All other columns of the BED file will be ignored.
        </div>
        <br>
        <b-link name="rna_modification_level_data"></b-link>
        <h3>RNA modification level data</h3>
        <br>
        <div>
            RNA modification levels can be provided either as a <strong>CSV</strong> file or a <strong>tab-delimited text file</strong>.<br>
            These files must have a file extension of either '.csv' or '.txt'.
            <br><br>
            The first row of the file should contain column names.
            <br><br>
            The file <strong>must</strong> contain the two following columns:
            <ul>
                <li><b>location</b>: The start coordinate of the RNA modification site.</li>
                <li><b>gene_id</b>: The ID of the gene the RNA modification site is found in.</li>
            </ul>
            All other columns should:
            <ul>
                <li>Be named by unique sample IDs.</li>
                <li>Contain numeric data corresponding to the RNA modification site/sample of the corresponding row/column.</li>
            </ul>
            There is no requirement on the positions of the columns.
            <br><br>
            Example RNA modification level data:<table class="table b-table table-sm">
                <thead>
                    <tr>
                        <th>gene_id</th>
                        <th>location</th>
                        <th>sample_1</th>
                        <th>sample_2</th>
                        <th>sample_3</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>ENSG00000123456</td>
                        <td>123</td>
                        <td>0.1</td>
                        <td>0.2</td>
                        <td>0.3</td>
                    </tr>
                    <tr>
                        <td>ENSG00000234567</td>
                        <td>456</td>
                        <td>0.4</td>
                        <td>0.5</td>
                        <td>0.6</td>
                    </tr>
                    <tr>
                        <td>ENSG00000345678</td>
                        <td>789</td>
                        <td>0.7</td>
                        <td>0.8</td>
                        <td>0.9</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <br>
        <b-link name="important_notes"></b-link>
        <h3>Important notes</h3>
        <br>
        <div>
            1. Gene and transcript IDs are trimmed at '.' characters to generalise different versions of Ensembl IDs
            (e.g. <em>ENSG00000123456<strong>.1</strong></em> and <em>ENSG00000123456<strong>.2</strong></em> both become <em>ENSG00000123456</em>).<br>
            Please avoid including '.' elsewhere in gene and transcript IDs to avoid unintended trimming.<br>
            <br>
            2. For BED files, gene and transcript IDs can be separated by an underscore ('_') or a vertical line ('|').<br>
            Please avoid including '_' or '|' elsewhere in gene and transcript IDs to ensure the data is parsed correctly.<br>
            <br>
            3. To visualize genes found on multiple chromosomes, we suggest ensuring the transcript IDs differ before the dot character ('.').<br>
            For example, if the transcript IDs being used are 'ENSTxxxxx.4' and 'ENSTxxxxx.4_PAR_Y', IsoVis trims them at the '.' during file parsing and turns them into 'ENSTxxxxx'.<br>
            This causes both transcripts to be considered as the same transcript and <b>visualized incorrectly as one transcript</b> instead of two.<br>
            Transcript IDs that could be used instead are 'ENSTxxxxx.4' and 'ENSTxxxxxY.4'.<br>
            <br>
            4. To visualize user ORFs for uploaded transcripts (including novel isoforms), specify:<br>
            <ul>
                <li><u>GTF and GFF files</u>: <b>CDS</b> lines</li>
                <li><u>BED8, BED9 and BED12 files</u>: <b>thickStart</b> and <b>thickEnd</b> information</li>
            </ul>
            5. IsoVis can show more than one user ORF for each transcript as long as isoform stack data is uploaded in GTF or GFF files and the user ORFs are non-overlapping.<br>
            For overlapping user ORFs, there is currently no method to tell them apart as IsoVis will merge them.
        </div>
    </b-container>
</template>

<script>

import { BContainer, BLink } from 'bootstrap-vue';

export default
{
    components: {
        BContainer,
        BLink
    }
}

</script>