/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

<template>
    <b-container class="text-justify">
        <div class="text-center">
            <h2>IsoVis tutorial</h2>
        </div>
        <div>
            <b><u>Table of contents:</u></b>
            <br>
            <ol>
                <li><b-link href="#quick_start">Quick start</b-link></li>
                <li><b-link href="#intro">Introduction</b-link></li>
                <li><b-link href="#home">Home page and how to get help</b-link></li>
                <li><b-link href="#features">IsoVis visualization features</b-link></li>
                    <ul>
                        <li><b-link href="#the_default_stack">The default isoform stack</b-link></li>
                        <li><b-link href="#stack_customization">Customizing the isoform stack</b-link></li>
                        <li><b-link href="#demo_stack_interpretation">Interpretation of the demo isoform stack</b-link></li>
                        <li><b-link href="#the_heatmap">The heatmap</b-link></li>
                        <li><b-link href="#other_features">Other visualization features</b-link></li>
                        <li><b-link href="#image_export">Exporting high quality images of the visualization</b-link></li>
                    </ul>
                <li><b-link href="#uploading_data">Uploading data to visualize and specifying your gene of interest</b-link></li>
                <li><b-link href="#change_genes_or_datasets">Changing genes or datasets to visualize</b-link></li>
            </ol>
        </div>
        <hr>
        <b-link name="quick_start"></b-link>
        <h3>Quick start</h3>
        <br>
        <div>
            To explore IsoVis features, click on the 'Show demo data' button in the home page.
            <br><br>
            To upload your isoform stack data and heatmap data files for visualization, click on the 'Upload data' button in the home page.
        </div>
        <br>
        <b-link name="intro"></b-link>
        <h3>Introduction</h3>
        <br>
        <div>
            IsoVis is a tool for visualizing and analyzing alternative mRNA isoforms. It displays the exonic structures of isoforms from GFF, GTF or BED files as an isoform stack. It can also show quantitative expression data of the displayed isoforms from CSV or tab-separated text files as a heatmap.
            <br><br>
            IsoVis can integrate relevant information from <b-link href="https://www.ensembl.org/index.html" target="_blank">Ensembl</b-link> and <b-link href="https://www.ebi.ac.uk/interpro/" target="_blank">InterPro</b-link> into visualizations. When isoforms are labelled by their Ensembl gene and transcript IDs in the stack file, IsoVis can retrieve the open reading frames of known transcripts, the canonical Ensembl transcript, and the protein domains and motifs of that transcript.
            <br><br>
            Users can upload files containing isoform information on one gene to a whole transcriptome to IsoVis. Isovis allows users to select and switch between genes to visualize, with the central visualization displaying the isoform information of one gene at a time.
            <br><br>
            IsoVis can accept and visualize properly formatted stack and heatmap files containing isoform information from any species (see <b-link href="../help_upload/" target="_blank">help page on proper formatting on input files</b-link>). Currently, IsoVis can integrate Ensembl and InterPro information from any chordate species in Ensembl, plus Drosophila and yeast.
            <br><br>
            IsoVis can also accept stack data from the GRCh37 (hg19) genome build.
        </div>
        <br>
        <b-link name="home"></b-link>
        <h3>Home page and how to get help</h3>
        <br>
        <div class="text-center">
            <b-img src="~/assets/tutorial/home_page.png" style="max-width: 45vw;"></b-img>
            <br>
            The IsoVis home page.
        </div>
        <br>
        <div>
            The '<b-link href="#uploading_data">Upload data</b-link>' button shows a pop-up for uploading files containing isoform and heatmap data into IsoVis for visualization.
            <br><br>
            The 'Show demo data' button creates a data visualization for demonstrating IsoVis features.
            <br><br>
            The 'Download demo or Clark Lab data' button allows one to download the data used to create the demo visualization, the datasets featured in the IsoVis manuscript, as well as data from other Clark Laboratory projects.
            <br><br>
            The 'Source code' button opens the <b-link href="https://github.com/ClarkLaboratory/IsoVis" target="_blank">IsoVis GitHub repository</b-link> in a new tab.
        </div>
        <br>
        <div class="text-center">
            <b-img src="~/assets/tutorial/about_and_help_menus.png" style="max-width: 45vw;"></b-img>
            <br>
            The 'About' and 'Help' menus in the navigation bar.
        </div>
        <br>
        <div>
            The navigation bar at the top of the page shows two menus. The 'About' menu contains additional information regarding IsoVis, including the changelog for each IsoVis version update and how IsoVis keeps uploaded data private to the user. The 'Help' menu has further information on how to use IsoVis and get help, as well as an extensive <b-link href="../faq/" target="_blank">FAQ page</b-link>.
            <br><br>
            Users who have encountered issues or would like to request new features can file a bug report or feature request in the IsoVis GitHub repository. For users who wish to send private feedback on IsoVis or do not wish to use GitHub, they may send emails to the <b-link href="mailto:contact@isomix.org">contact@isomix.org</b-link> address shown on the home page.
        </div>
        <br>
        <b-link name="features"></b-link>
        <h3>IsoVis visualization features</h3>
        <br>
        <div class="text-center">
            <b-img src="~/assets/tutorial/demo_visualization.png" style="max-width: 45vw;"></b-img>
            <br>
            The demo data visualization in IsoVis, which demonstrates the key visualization features.
        </div>
        <br>
        <div>
            Visualizations in IsoVis consist of three parts: The isoform stack (center), the heatmap (right) and isoform labels and hyperlinks to external resources (left). IsoVis can integrate additional information from Ensembl and InterPro into the visualization using the Ensembl gene IDs and transcript IDs specified in the isoform stack file.
            <br><br>
            <b-link name="the_default_stack"></b-link>
            <b><u>The default isoform stack:</u></b>
            <br><br>
            The stack shows the exonic structures of isoforms encoded by the currently displayed gene along a genomic coordinate axis. Black rectangles indicate exons while thin horizontal lines indicate introns. Background green shading indicates regions that are exonic in any isoform. The cursor can be hovered over the stack to show a vertical crosshair displaying the genomic coordinate of any feature.
        </div>
        <br>
        <div class="text-center">
            <b-img src="~/assets/tutorial/retained_intron.png" style="max-width: 45vw;"></b-img>
            <br>
            A retained intron in the bottom isoform of the stack.
        </div>
        <br>
        <div>
            'User isoforms' are those found in the uploaded isoform stack file. A list is shown to the left of the displayed isoforms, which shows their transcript IDs. If an Ensembl transcript ID was used, IsoVis also shows the corresponding Ensembl transcript symbol and includes a hyperlink to its entry in Ensembl.
            <br><br>
            The 'Canonical isoform' is the Ensembl canonical transcript associated with the gene being visualized. <b-link href="https://www.ensembl.org/info/genome/genebuild/canonical.html" target="_blank">According to Ensembl</b-link>, the canonical transcript is defined as 'a single, representative transcript identified at every locus', and for genes encoding proteins, is the transcript that, 'on balance, has the highest coverage of conserved exons, highest expression, longest coding sequence and is represented in other key resources, such as NCBI and UniProt'.
        </div>
        <br>
        <div class="text-center">
            <b-img src="~/assets/tutorial/protein_hover.png" style="max-width: 45vw;"></b-img>
            <br>
            Details of protein features in the canonical protein are shown in pop-ups.
        </div>
        <br>
        <div>
            When the canonical isoform encodes a protein and InterPro contains information about the protein, a canonical protein diagram is displayed at the top of the stack. It shows selected domains and motifs of the canonical protein using data from InterPro. Domains and motifs are mapped to the exons of the canonical isoform to indicate which exons they are encoded by. Currently, we show Pfam-annotated domains (purple), signal peptides from Phobius (yellow), intrinsically disordered regions from MobiDB-lite (light green), and coils (violet). More information about the displayed domains and motifs can be shown by hovering over them, and external links to Ensembl, InterPro, UniProt and UniParc on the protein are displayed if they exist.
        </div>
        <br>
        <div class="text-center">
            <b-img src="~/assets/tutorial/gene_strand.png" style="max-width: 45vw;"></b-img>
            <br>
            The gene strand diagram from the demo visualization.
        </div>
        <br>
        <div>
            The bottom of the visualization shows the gene strand diagram. It displays the genomic start and end coordinates of the stack isoforms, as well as the chromosome and strand the displayed gene is encoded on. The triangular arrowheads show the 5' to 3' direction. All arrowheads cover the same length of the genome and their widths show how much the genomic coordinate axis has warped due to intron normalization, with narrower ticks showing more warping than wider ones. If intron normalization is disabled in the stack options, all arrowheads will have the same width.
            <br><br>
            <b-link name="stack_customization"></b-link>
            <b><u>Customizing the isoform stack:</u></b>
        </div>
        <br>
        <div class="text-center">
            <b-img src="~/assets/tutorial/stack_options.gif" style="max-width: 55vw;"></b-img>
            <br>
            A demonstration of the stack options.
        </div>
        <br>
        <div>
            The 'Stack options' button can be used to configure the isoform stack: By default, introns are normalized and have the same width, but intron normalization can be disabled to display the locus in genomic scale. The genomic coordinate axis can be configured to have ascending or descending genomic coordinates. Several elements of the isoform stack can be toggled, including the canonical transcript, the canonical protein, the mapping for protein domains and motifs, labels for the protein domains (beta), any known ORFs (open reading frames), and all other Ensembl isoforms of the currently displayed gene that are absent from the uploaded stack data (beta).
            <br><br>
            If the 'Known ORFs' stack option is enabled, then Ensembl isoforms that have known ORFs show grey, thinner rectangles for untranslated regions and thicker rectangles for ORFs.
        </div>
        <br>
        <div class="text-center">
            <b-img src="~/assets/tutorial/other_features.gif" style="max-width: 55vw;"></b-img>
            <br>
            A demonstration of zooming into the stack, rearranging and sorting isoforms, and toggling their visibility.
        </div>
        <br>
        <div>
            Users can zoom into specific genomic coordinates either by entering them in the 'Zoom to coordinates' text box at the top of the page and pressing Enter, or by clicking, dragging, and releasing the cursor at the desired genomic coordinates. To reset the zooming, click on the 'Reset zoom' button at the top of the page.
            <br><br>
            The 'A to Z' and 'Z to A' icons next to the 'User isoforms:' label can be used to sort the isoforms by ascending or descending transcript symbols or IDs. Moreover, stack isoforms can be dragged to rearrange them, and they can be hidden using the cross buttons in the list. The 'plus' button at the bottom of the list opens an 'Edit isoform list' pop-up, allowing users to toggle the visibility of each isoform.
            <br><br>
            <b-link name="demo_stack_interpretation"></b-link>
            <b><u>Interpretation of the demo isoform stack:</u></b>
            <br><br>
            The uploaded isoform stack file contains information on three isoforms of the <i>PLEKHM2</i> gene. There are several alternative splicing differences, such as a skipped exon shown as an additional exon in the <i>PLEKHM2-202</i> (ENST00000375799) isoform, and a retained intron in the novel 9037411c-8329-4d13-bcdb-5545a1acfb34 isoform. The canonical isoform is <i>PLEKHM2-202</i>, which encodes a protein containing a RUN domain, a PH domain, three intrinsically disordered regions and a coil. The skipped exon encodes the beginning of the first intrinsically disordered region.
            <br><br>
            The gene strand diagram shows that the <i>PLEKHM2</i> gene is located at base pair 15684320 to 15734769 of chromosome 1 (chr1). The gene is encoded on the forward strand, and the 5'-3' direction is shown from left to right. Intron normalization is enabled as indicated by the varying arrowhead widths.
            <br><br>
            <b-link name="the_heatmap"></b-link>
            <b><u>The heatmap:</u></b>
        </div>
        <br>
        <div class="text-center">
            <b-img src="~/assets/tutorial/heatmap_features.png" style="max-width: 45vw;"></b-img>
            <br>
            Heatmap of demo data. Left: The hover pop-up displaying details of one of the cells. Right: Heatmap where isoforms are sorted by descending mean values.
        </div>
        <br>
        <div>
            Users can optionally upload a heatmap data file, which includes any form of quantitative data related to the shown isoforms. One common use case is to display the expression levels or count matrix for each isoform in specific samples.
            <br><br>
            Each heatmap cell is coloured on a blue-white-orange scale. Cells can be hovered over to display a pop-up that shows which sample and isoform they are from, as well as the numerical value they are encoding. The three numbers below the scale indicate the minimum, mean, and maximum of the heatmap data values. The shown data can be log-transformed using the log-transform button at the bottom of the heatmap, allowing easier comparison of data across orders of magnitude.
            <br><br>
            Users can click on the two colour-gradient icons next to the 'User isoforms:' label to sort isoforms by ascending or descending mean heatmap values. This is useful for quickly showing which isoforms have higher overall expression levels in samples.
            <br><br>
            <b-link name="other_features"></b-link>
            <b><u>Other visualization features:</u></b>
        </div>
        <br>
        <div class="text-center">
            <b-img src="~/assets/tutorial/resized_stack.png" style="max-width: 45vw;"></b-img>
            <br><br>
            <b-img src="~/assets/tutorial/resized_heatmap.png" style="max-width: 45vw;"></b-img>
            <br>
            Automatic resizing of the stack and heatmap when one of them is hidden.
        </div>
        <br>
        <div>
            The isoform stack and the heatmap can be hidden or shown using the buttons next to the stack options. The stack automatically resizes to fill up the remaining space when the heatmap is hidden, and vice-versa.
            <br><br>
            To clear the visualized data and go back to the home page, users can click on either the 'IsoVis' button at the top left of the page or the 'Clear data and return to the home page' button at the top of the page.
            <br><br>
            <b-link name="image_export"></b-link>
            <b><u>Exporting high quality images of the visualization:</u></b>
        </div>
        <br>
        <div class="text-center">
            <b-img src="~/assets/tutorial/IsoVis_ENSG00000116786.png" style="max-width: 45vw;"></b-img>
            <br>
            An exported PNG image of the demo visualization.
        </div>
        <br>
        <div>
            An image showing the visualized data can be exported using the options under the 'Export image as...' menu. Only relevant details of the webpage are included in the exported image. Currently, image export options are PNG, JPEG, SVG and PDF.
        </div>
        <br>
        <b-link name="uploading_data"></b-link>
        <h3>Uploading data to visualize and specifying your gene of interest</h3>
        <br>
        <div class="text-center">
            <b-img src="~/assets/tutorial/upload_data_and_select_a_gene.png" style="max-width: 45vw;"></b-img>
            <br>
            Example usage of the 'Upload data' and 'Select a gene' pop-ups.
        </div>
        <br>
        <div>
            To upload data into IsoVis for visualization, click on the 'Upload data' button in the home page, then specify the data files to be uploaded. The formatting requirements of the uploaded files can be found from the <b-link href="../help_upload/" target="_blank">help page on upload data</b-link>. 
            <br><br>
            Selecting a species is optional. IsoVis can visualize properly formatted stack and heatmap files from any species. To include linked gene, isoform and protein information from external databases, select the species the data came from in the 'Upload data' pop-up. Currently, IsoVis supports all chordate species in Ensembl, plus the fruit fly (<i>Drosophila melanogaster</i>), and yeast (<i>Saccharomyces cerevisiae</i>).
            <br><br>
            IsoVis also supports data from the GRCh37 (hg19) genome build. To upload stack data from GRCh37, the 'Use GRCh37 (hg19) instead of GRCh38 (hg38)' checkbox should be ticked.
            <br><br>
            If the uploaded isoform stack file contains data on more than one gene, the user is prompted by a pop-up to select a gene to visualize. To do so, start typing either the symbol or ID of the gene in the search box, then select from a list of possible genes to visualize and press Enter.
            <br><br>
            The <b-link href="https://mygene.info/" target="_blank">mygene.info</b-link> service is used for performing the gene symbol search. To ensure that it works as intended, please specify the correct species in the 'Upload data' pop-up.
            <br><br>
            If the uploaded isoform stack file contains data on only one gene, then isoforms from that gene are automatically visualized without prompting the user to select a gene of interest.
        </div>
        <br>
        <b-link name="change_genes_or_datasets"></b-link>
        <h3>Changing genes or datasets to visualize</h3>
        <br>
        <div>
            To change the gene being visualized, click on the 'Change selected gene' button at the top of the page. The 'Select a gene' pop-up will appear and you can search for and select a different gene to visualize.
            <br><br>
            To change the dataset being visualized, clear the visualized data using either the 'IsoVis' button or the 'Clear data and return to the home page' button, then choose different files to upload to IsoVis.
        </div>
    </b-container>
</template>

<script>

import { BContainer, BImg, BLink } from 'bootstrap-vue';

export default
{
    components: {
        BContainer,
        BImg,
        BLink
    }
}

</script>