/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

<template>
<b-container>
    <b-row>
        <b-col>
            <h1 class="text-center my-4" style="font-size: 50px;">IsoVis: Visualize alternative mRNA isoforms</h1>
        </b-col>
    </b-row>
    <div class="text-center">
        <b-button @click="requestDataUpload" class="m-1" size="lg" variant="warning">Upload data</b-button>
        <b-button @click="requestDemo" class="m-1" size="lg" variant="warning">Show demo data</b-button>
        <b-button href="tutorial/" target="_blank" class="m-1" size="lg" variant="warning">IsoVis tutorial <b-icon-book aria-hidden="true"></b-icon-book></b-button>
    </div>
    <br>
    <b-row>
        <b-col cols="3" style="padding-right: 0px;">
            <b-img class="float-right" src="~/assets/logos/IsovisLogo.svg" height="170px"></b-img>
        </b-col>
        <b-col cols="8" style="text-align: justify; text-justify: auto;">
            <p>
                IsoVis enables fast and informative visualization of gene isoforms including their exonic structures, protein features and relative expression levels.
                <br><br>
                IsoVis displays the exonic structures of isoforms from GFF, GTF or BED files as an isoform stack. It can also show isoform expression data from CSV or tab-separated text files as a heatmap.
                <br><br>
                Reference data including the canonical ENSEMBL transcript, open reading frames and encoded protein features are integrated with the isoform information.
            </p>
        </b-col>
    </b-row>
    <div class="text-center mt-2">
        <b-button @click="showClarkLabDataModal" class="m-1">Download demo or Clark Lab data</b-button>
        <b-button href="https://github.com/ClarkLaboratory/IsoVis" target="_blank" class="m-1">Source code <b-icon-github aria-hidden="true"></b-icon-github></b-button>
        <p class="m-2">Created by Jack Davis, Ching Yin Wan, Jarny Choi and Mike Clark.<br/>
            Publication: <b-link href="https://doi.org/10.1093/nar/gkae343" target="_blank">https://doi.org/10.1093/nar/gkae343</b-link><br/>
            Developed in the<b-link href="https://biomedicalsciences.unimelb.edu.au/sbs-research-groups/anatomy-and-physiology-research/systems-neuroscience/clark-lab" target="_blank">
            Clark Laboratory</b-link>, University of Melbourne.
            Hosted by <b-link href="https://www.stemformatics.org/" target="_blank">Stemformatics</b-link>.
        </p><br/>
        <div>
            <b-link href="https://www.stemformatics.org/" target="_blank"><b-img src="~/assets/logos/s4m_logo_square.png" height="60px"></b-img></b-link>
            <svg class="mx-3" width="10" height="80px"> 
                <line x1="5" x2="5" y1="0" y2="80" style="stroke:black;stroke-width:1"></line>
            </svg>
            <b-link href="https://www.unimelb.edu.au/" target="_blank"><b-img src="~/assets/logos/uni_logo_long.png" height="70"></b-img></b-link>
        </div>
        <br>
        <strong>Get in touch:</strong> <b-link href="mailto:contact-isomix@unimelb.edu.au">contact-isomix@unimelb.edu.au</b-link>
    </div>

    <!-- Modal for downloading demo data or Clark Lab data -->
    <b-modal v-model="modal.clarkLabData.show" size="xl" title="Download demo or Clark Lab data" hide-footer>
        <b-link href="https://doi.org/10.1093/nar/gkab1129" target="_blank"><p style="margin-bottom: 0px">Gleeson J <i>et al.</i> Accurate expression quantification from nanopore direct RNA sequencing with NanoCount. <i>Nucleic Acids Res</i> 2022;<b>50</b>:e19.</p></b-link>
        <b-button variant="primary" @click="downloadFile('Gleeson_et_al_NAR_2022.zip')">.zip (3.76 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('Gleeson_et_al_NAR_2022.7z')">.7z (2.81 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('Gleeson_et_al_NAR_2022.tar.gz')">.tar.gz (3.75 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('Gleeson_et_al_NAR_2022.tar.xz')">.tar.xz (2.81 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>

        <p></p>

        <b-link href="https://doi.org/10.1093/nargab/lqad060" target="_blank"><p style="margin-bottom: 0px">Prawer YDJ <i>et al.</i> Pervasive effects of RNA degradation on Nanopore direct RNA sequencing. <i>NAR Genom Bioinform</i> 2023;<b>5</b>:lqad060.</p></b-link>
        <b-button variant="primary" @click="downloadFile('Prawer_et_al_NARGB_2023.zip')">.zip (1.36 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('Prawer_et_al_NARGB_2023.7z')">.7z (1.03 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('Prawer_et_al_NARGB_2023.tar.gz')">.tar.gz (1.35 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('Prawer_et_al_NARGB_2023.tar.xz')">.tar.xz (1.04 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>

        <p></p>

        <b-link href="https://doi.org/10.1186/s13059-023-02907-y" target="_blank"><p style="margin-bottom: 0px">You Y <i>et al.</i> Identification of cell barcodes from long-read single-cell RNA-seq with BLAZE. <i>Genome Biol</i> 2023;<b>24</b>:66.</p></b-link>
        <b-button variant="primary" @click="downloadFile('You_et_al_GenomeBiol_2023.zip')">.zip (3.51 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('You_et_al_GenomeBiol_2023.7z')">.7z (3.01 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('You_et_al_GenomeBiol_2023.tar.gz')">.tar.gz (3.47 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('You_et_al_GenomeBiol_2023.tar.xz')">.tar.xz (3.01 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>

        <p></p>

        <p style="margin-bottom: 0px"><b-link href="https://www.gtexportal.org/home/downloads/adult-gtex/long_read_data" target="_blank">GTEx V9 long read RNA-seq data</b-link> (obtained from the GTEx Portal on 01/23/24 and adapted for IsoVis)</p>
        <b-button variant="primary" @click="downloadFile('GTEx_V9.zip')">.zip (32.5 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('GTEx_V9.7z')">.7z (15.7 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('GTEx_V9.tar.gz')">.tar.gz (32.5 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('GTEx_V9.tar.xz')">.tar.xz (15.7 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>

        <p></p>

        <b-link href="https://doi.org/10.1126/sciadv.adp0783" target="_blank"><p style="margin-bottom: 0px">Gleeson J <i>et al.</i> Isoform-level profiling of m<sup>6</sup>A epitranscriptomic signatures in human brain. <i>Sci Adv</i> 2025;<b>11</b>:eadp0783.</p></b-link>
        <b-button variant="primary" @click="downloadFile('Gleeson_et_al_SciAdv_2024.zip')">.zip (7.85 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('Gleeson_et_al_SciAdv_2024.7z')">.7z (6.09 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('Gleeson_et_al_SciAdv_2024.tar.gz')">.tar.gz (7.84 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('Gleeson_et_al_SciAdv_2024.tar.xz')">.tar.xz (6.09 MB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>

        <p></p>

        <b-link href="https://doi.org/10.1186/s13059-025-03724-1" target="_blank"><p style="margin-bottom: 0px">De Paoli-Iseppi R <i>et al.</i> Long-read sequencing reveals the RNA isoform repertoire of neuropsychiatric risk genes in human brain. <i>Genome Biol</i> 2025;<b>26</b>:298.</p></b-link>
        <b-button variant="primary" @click="downloadFile('DePaoliIseppi_et_al_GenomeBiol_2024.zip')">.zip (122 kB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('DePaoliIseppi_et_al_GenomeBiol_2024.7z')">.7z (111 kB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('DePaoliIseppi_et_al_GenomeBiol_2024.tar.gz')">.tar.gz (120 kB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('DePaoliIseppi_et_al_GenomeBiol_2024.tar.xz')">.tar.xz (111 kB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>

        <p></p>

        <p style="margin-bottom: 0px">Demo data</p>
        <b-button variant="primary" @click="downloadFile('demo_data.zip')">.zip (3.4 kB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('demo_data.7z')">.7z (2.3 kB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('demo_data.tar.gz')">.tar.gz (2.4 kB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
        <b-button variant="primary" @click="downloadFile('demo_data.tar.xz')">.tar.xz (2.3 kB) <b-icon-download aria-hidden="true"></b-icon-download></b-button>
    </b-modal>
</b-container>
</template>

<script>
import { BButton, BCol, BContainer, BImg, BLink, BModal, BRow, BIconBook, BIconDownload, BIconGithub } from 'bootstrap-vue';

export default
{
    components: {
        BButton,
        BCol,
        BContainer,
        BImg,
        BLink,
        BModal,
        BRow,
        BIconBook,
        BIconDownload,
        BIconGithub
    },

    data() {
        return {
            modal: {
                clarkLabData: {
                    show: false,
                }
            }
        }
    },

    methods: {
        // Parent or sibling components are in charge of showing demo/data upload, so request these.
        requestDemo() {
            this.$root.$emit("request_show_demo");
        },

        requestDataUpload() {
            this.$root.$emit("request_data_upload");
        },

        downloadFile(filename) {
            var link = document.createElement('a');
            link.href = '/' + filename;
            link.download = filename;
            link.click();
        },

        showClarkLabDataModal() {
            this.modal.clarkLabData.show = true;
        }
    }
}
</script>