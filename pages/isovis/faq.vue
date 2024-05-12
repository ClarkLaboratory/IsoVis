/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

<template>
    <b-container class="text-justify">
        <h3>Formatting, uploading and navigating data</h3>
        <br>
        <div>
            Q: <b>What data must I upload into IsoVis to visualize it?</b><br>
            A: You must upload an isoform stack file. The heatmap data is optional.
        </div>
        <br>
        <div>
            Q: <b>How should the data files I upload be formatted?</b><br>
            A: Please refer to <b-link href="../help_upload/" target="_blank">this page</b-link> for more information.
        </div>
        <br>
        <div>
            Q: <b>How do I clear the uploaded data?</b><br>
            A: Click on the 'Clear data and return to the home page' button on the top right of the webpage, or click on the 'IsoVis' button on the top left of the webpage.
        </div>
        <br>
        <div>
            Q: <b>How do I select a gene?</b><br>
            A: When you upload isoform stack data containing multiple Ensembl gene IDs, a pop-up will appear asking you to select a gene.<br>
               Start typing either the symbol or ID of the gene you wish to visualize into the search box, then select a gene from the list.<br>
               A minimum of 2 characters is required to perform gene symbol search. A maximum of 100 genes will be shown in the list at any one time.<br>
               If the gene you wish to select is not shown, continue typing its symbol or ID until it appears in the list.
        </div>
        <br>
        <div>
            Q: <b>How do I visualize a different gene?</b><br>
            A: To visualize a different gene in your uploaded stack file, click on the 'Change selected gene' button at the top of the webpage.
        </div>
        <br>
        <div>
            Q: <b>What species can IsoVis accept data from?</b><br>
            A: IsoVis will accept properly formatted stack and heatmap data files from any species.<br>
               IsoVis should provide linked information from any chordate species in Ensembl, plus <i>Drosophila melanogaster</i> and yeast (<i>Saccharomyces cerevisiae</i>).<br>
               To ensure this occurs, select the correct species in the data upload pop-up.
        </div>
        <br>
        <div>
            Q: <b>What genome versions or builds can IsoVis use?</b><br>
            A: If uploading data from one of the species supported by IsoVis, you must be using the genome version found in Ensembl to ensure correct visualization.<br>
               Using an older genome version can lead to <b>mismatches</b> between the coordinates of features in your data and the ones from Ensembl.<br>
               For <u>humans</u>, both GRCh38 (hg38) and GRCh37 (hg19) are currently supported by Ensembl.<br>
               IsoVis will use GRCh38 by default. If using GRCh37, please tick the 'Use GRCh37 (hg19) instead of GRCh38 (hg38)' checkbox in the 'Upload data' pop-up.<br>
               For <u>all other species supported by IsoVis</u>, please use the latest genome version to ensure correct visualization.
        </div>
        <br>
        <div>
            Q: <b>I would like to visualize genes found on multiple chromosomes. How should the data files be formatted?</b><br>
            A: There are occasions when a gene is found on multiple chromosomes, such as the pseudoautosomal regions shared by the human X and Y chromosomes.<br>
               To allow transcript isoforms from each gene version to be correctly visualized, we suggest ensuring the transcript IDs differ before the dot character ('.').<br>
               For example, if the transcript IDs being used are 'ENSTxxxxx.4' and 'ENSTxxxxx.4_PAR_Y', IsoVis trims them at the '.' during file parsing and turns them into 'ENSTxxxxx'.<br>
               This causes both transcripts to be considered as the same transcript and <b>visualized incorrectly as one transcript</b> instead of two.<br>
               Transcript IDs that could be used instead are 'ENSTxxxxx.4' and 'ENSTxxxxxY.4'.
        </div>
        <br>
        <div>
            Q: <b>How is my uploaded data processed by IsoVis?</b><br>
            A: The uploaded data is processed locally within your browser: The stack and heatmap files being uploaded are read locally, and data stored within them is visualized.<br>
               No data is actually uploaded to or stored in the IsoVis server. Your uploaded files will not be sent across the internet and will always be accessible to you only.
        </div>
        <br>
        <div>
            Q: <b>Does IsoVis retain my data? Is my data private?</b><br>
            A: IsoVis does not store or retain any uploaded data.<br>
               All uploaded data is private to the user and cannot be seen or accessed by anyone else, including the IsoVis or Stemformatics team.<br>
               No uploaded data is actually sent to or stored in the IsoVis server. The data being uploaded is processed locally within your web browser.
        </div>
        <br>
        <div>
            Q: <b>What data can I export from IsoVis?</b><br>
            A: You can export images of your isoform stack and heatmap either on their own or together using the 'Export image as...' button.<br>
               The currently available image formats are PNG, JPEG, SVG and PDF.<br>
               Exported images only show the uploaded data and do not contain website navigation or help features.
        </div>
        <br>
        <div>
            Q: <b>How do I download demo data?</b><br>
            A: There are currently two ways to do so:<br>
            <ol>
                <li>Click on the 'Show demo data' button on the front page, then click on the 'Download demo data' button at the top of the webpage.</li>
                <li>Click on the 'Download demo or Clark Lab data' button on the front page. In the pop-up that appears, click on one of the four file formats for download under the 'Demo data' heading.</li>
            </ol>
        </div>
        <div>
            Q: <b>How do I view Clark Lab data?</b><br>
            A: At the moment, you must first download the Clark Lab data, then manually upload them from your computer to the IsoVis website:<br>
            <ol>
                <li>Click on the 'Download demo or Clark Lab data' button on the front page. A pop-up would appear, showing some papers from the Clark Lab.</li>
                <li>You can download archives storing the isoform stack and heatmap data for each paper there.</li>
                <li>Extract the stack and heatmap files from the downloaded archive.</li>
                <li>Upload the extracted stack and heatmap files to the IsoVis website.</li>
            </ol>
               This is to avoid any memory issues that may arise when automatically visualizing data from these papers within IsoVis. These issues could cause your browser to crash.
        </div>
        <br>
        <h3>Isoform stack features</h3>
        <br>
        <div>
            Q: <b>What are the stack options?</b><br>
            A: IsoVis provides several options to add information to your uploaded isoform stack. These include:<br>
            <ul>
                <li>Intron normalization: By default, introns are shrunk and normalized to focus on exons. This can be disabled to view the gene locus in the genomic scale.</li>
                <li>Ascending reading direction: By default, genes are displayed left to right from a smaller genome coordinate to a larger genome coordinate. This direction can be reversed.</li>
                <li>Canonical transcript: The transcript isoform annotated as a canonical / major transcript in Ensembl. Provides a transcript to compare against user data.</li>
                <li>Canonical protein: Protein domain and motif information from InterPro for the canonical transcript.</li>
                <li>Protein domain mapping: Turn on or off the mapping of InterPro protein domains to exons.</li>
                <li>Protein motif mapping: Turn on or off the mapping of InterPro protein motifs to exons.</li>
                <li>Protein domain labels (beta): Show or hide labels of InterPro protein domains.</li>
                <li>Known ORFs: Turn on or off the display of the coding sequence. Applicable to annotated isoforms with known ORFs only.</li>
                <li>Load all other Ensembl isoforms (beta): Loads all Ensembl isoforms of the currently displayed gene that are absent from the uploaded stack data.</li>
            </ul>
        </div>
        <div>
            Q: <b>What linked information does IsoVis display, and where does it come from?</b><br>
            A: IsoVis uses the Ensembl gene ID provided in the stack data file to obtain and link to the relevant gene information from Ensembl.<br>
               This information includes the canonical transcript isoform and the Ensembl symbol of the gene.<br>
               Annotated Ensembl transcript isoforms in user data are linked to their associated Ensembl transcript pages.<br>
               Protein information from InterPro is displayed and mapped to the canonical isoform. Further information on the protein is provided as links to UniProt and UniParc. 
        </div>
        <br>
        <div>
            Q: <b>Will IsoVis decide if my transcript isoforms are known or novel?</b><br>
            A: No, IsoVis relies on the Ensembl transcript isoform annotations in the uploaded stack data file.<br>
               IsoVis will display the isoform labels provided by the user.
        </div>
        <br>
        <div>
            Q: <b>What protein domains and motifs do IsoVis display?</b><br>
            A: IsoVis displays a subset of information regarding the canonical protein from InterPro. This includes:<br>
            <ul>
                <li>Pfam-annotated domains (dark purple ovals)</li>
                <li>Signal peptides (yellow rectangles)</li>
                <li>Intrinsically disordered regions from MobiDB-lite (light green rectangles)</li>
                <li>Coils (violet rectangles)</li>
            </ul>
        </div>
        <div>
            Q: <b>Why doesn't my data show linked gene, canonical transcript, or protein information?</b><br>
            A: If uploading non-human data, ensure you have selected the correct species in the 'Data upload' pop-up.<br>
               If you have selected the species, check that the data formatting is correct, such as annotating known transcript isoforms with Ensembl transcript IDs.<br>
               Alternatively, if the species isn't present in the upload list, there is no data in Ensembl to link to.
        </div>
        <br>
        <div>
            Q: <b>Why doesn't an Ensembl transcript from my stack data file have a clickable link?</b><br>
            A: The transcript either doesn't exist or is retired, such as <b-link href="https://ensembl.org/Homo_sapiens/Transcript/Idhistory?t=ENST00000613795" target="_blank">ENST00000613795</b-link>.
        </div>
        <br>
        <div>
            Q: <b>Why does an Ensembl transcript from my stack data file have a clickable link but have no transcript symbol?</b><br>
            A: The transcript is novel, such as <b-link href="https://ensembl.org/Homo_sapiens/Transcript/Idhistory?t=ENST00000669836" target="_blank">ENST00000669836</b-link>.
        </div>
        <br>
        <div>
            Q: <b>How do I zoom into transcripts?</b><br>
            A: You could click and drag within the visualization of the canonical transcript, isoform stack, or gene strand.<br>
               You could also use the coordinate box at the top of the page: Enter the range of genomic coordinates you wish to zoom into and press 'Enter'.
        </div>
        <br>
        <div>
            Q: <b>How do I reset the zoom?</b><br>
            A: You could right-click the visualization of the canonical transcript, isoform stack, or gene strand.<br>
               Alternatively, you could click on the 'Reset zoom' button at the top of the page.
        </div>
        <br>
        <div>
            Q: <b>What is the gene strand diagram?</b><br>
            A: Please refer to <b-link href="../help_gene_strand/" target="_blank">this page</b-link> for more information.
        </div>
        <br>
        <h3>Heatmap</h3>
        <br>
        <div>
            Q: <b>How can I view the details of each heatmap cell?</b><br>
            A: You can hover your cursor over a heatmap cell to see which sample and transcript it is for, as well as its numerical value.<br>
        </div>
        <br>
        <div>
            Q: <b>Why does hovering over a heatmap cell show an 'undefined' or 'NaN' numerical value?</b><br>
            A: 'Undefined' is shown when the heatmap file does not contain any data for that cell. The row of that cell would also show 'undefined' values.<br>
               'NaN' stands for 'not a number'. This value is shown when the heatmap cell does not contain numerical data.
        </div>
        <br>
        <div>
            Q: <b>Why are some rows of the heatmap greyed out?</b><br>
            A: The uploaded heatmap data file does not contain any numerical data for the transcripts that show grey heatmap rows.
        </div>
        <br>
        <div>
            Q: <b>Why is the entire heatmap greyed out? Why does the heatmap colour scale show 'NaN'?</b><br>
            A: The uploaded heatmap data file does not contain any data related to the gene being visualized.<br>
               'NaN' stands for 'not a number'. The heatmap colour scale shows this when the whole heatmap is greyed out.<br>
               If the heatmap file should contain relevant data, ensure it is formatted correctly and uses the correct gene and transcript IDs.
        </div>
        <br>
        <h3>Bugs and feature requests</h3>
        <br>
        <div>
            Q: <b>How do I report any bugs I have encountered or request any features to be added to IsoVis?</b><br>
            A: Please file bug reports or feature requests in the <b-link href="https://github.com/ClarkLaboratory/IsoVis/issues" target="_blank">IsoVis GitHub repository</b-link>.
        </div>
        <br>
        <h3>Miscellaneous</h3>
        <br>
        <div>
            Q: <b>I have used IsoVis to create images for a publication. How do I cite IsoVis?</b><br>
            A: Please click on the 'How to cite us' button under the 'About' dropdown menu for the most recent citation to provide.
        </div>
        <br>
        <div>
            Q: <b>Does this website use cookies?</b><br>
            A: No, IsoVis does not use cookies.
        </div>
        <br>
        <div>
            Q: <b>Which operating systems and web browsers does IsoVis support?</b><br>
            A: IsoVis has been tested on and supports the following operating systems and browsers:<br>
            <ul>
                <li>Windows: Chrome, Firefox, Edge</li>
                <li>macOS: Chrome, Firefox</li>
                <li>Linux: Chrome, Firefox</li>
            </ul>
            We recommend using IsoVis on Chrome or Edge as it tends to perform better on these browsers than on Firefox.<br>
            We <b>do not</b> recommend using IsoVis on Safari as certain features do not work there yet, such as exporting PNGs and JPEGs.<br> 
        </div>
        <br>
        <div>
            Q: <b>Is IsoVis open-source?</b><br>
            A: Yes. The source code for IsoVis can be accessed in <b-link href="https://github.com/ClarkLaboratory/IsoVis" target="_blank">its GitHub repository</b-link>.
        </div>
        <br>
        <div>
            Q: <b>How do I install IsoVis locally?</b><br>
            A: Download the IsoVis source code, then follow the installation instructions in <b-link href="https://github.com/ClarkLaboratory/IsoVis/blob/main/README.md" target="_blank">this document</b-link>.
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