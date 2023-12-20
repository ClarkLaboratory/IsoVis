<template>
<b-container>
    <b-row><b-col>
        <h1 class="text-center my-4">IsoVis: Visualize alternative mRNA isoforms</h1>
    </b-col></b-row>
    <b-row>
        <b-col>
            <b-img class="float-right" src="~/assets/logos/IsovisLogo.png" height="400px"></b-img>
        </b-col>
        <b-col style="text-align: justify; text-justify: auto;">
            <p>
                IsoVis enables fast and informative visualization of gene isoforms and comparison of their exonic structures and relative expression levels.
                Uniquely, IsoVis displays the position of ORFs and protein domains within isoforms, allowing the potential changes to protein sequence and
                function between isoforms to be quickly established.
                <br><br>
                Genes commonly express multiple mRNA isoforms through processes such as alternative splicing initiation and termination.
                While the advent of long-read RNA-seq has revolutionised our ability to accurately quantify expression of both known and novel RNA isoforms.
                IsoVis now facilitates visualization and investigation of these isoforms.
                <br><br>
                Transcript structures (GFF, GTF or BED12 files) are displayed as an isoform stack, while quantitative, sample-based data such as
                isoform abundances (CSV or TXT files) are presented as a heatmap. Reference data including the canonical ENSEMBL transcript,
                open reading frame and encoded protein domains are sourced from external databases and integrated with the isoform information.
            </p>
        </b-col>
    </b-row>
    <div class="text-center mt-2">
        <b-button @click="requestDataUpload" class="m-1" variant="warning">Upload data</b-button>
        <br>
        <b-button @click="requestDemo" class="m-1" variant="warning">Show demo data</b-button>
        <b-button @click="showClarkLabDataModal" class="m-1" variant="warning">Download demo or Clark Lab data</b-button>
        <b-button href="https://github.com/ClarkLaboratory/IsoVis" target="_blank" class="m-1" variant="warning">Source code <b-icon icon="github" aria-hidden="true"></b-icon></b-button>
        <p class="m-2">Created by Jack Davis, Ching Yin Wan, Jarny Choi and Mike Clark. Publication coming soon.<br/>
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
    <strong>Get in touch:</strong> <b-link href="mailto:contact@isomix.org">contact@isomix.org</b-link>
    </div>

    <!-- Modal for downloading demo data or Clark Lab data -->
    <b-modal v-model="modal.clarkLabData.show" size="xl" title="Download Clark Lab data" hide-footer>
        <b-link href="https://doi.org/10.1093/nar/gkab1129" target="_blank"><p style="margin-bottom: 0px">Gleeson J <i>et al.</i> Accurate expression quantification from nanopore direct RNA sequencing with NanoCount. <i>Nucleic Acids Res</i> 2022;<b>50</b>:e19.</p></b-link>
        <b-button variant="primary" @click="downloadFile('Gleeson_et_al_NAR_2022.zip')">.zip (3.91 MB) <b-icon icon="download" aria-hidden="true"></b-icon></b-button>
        <b-button variant="primary" @click="downloadFile('Gleeson_et_al_NAR_2022.7z')">.7z (2.91 MB) <b-icon icon="download" aria-hidden="true"></b-icon></b-button>
        <b-button variant="primary" @click="downloadFile('Gleeson_et_al_NAR_2022.tar.gz')">.tar.gz (3.91 MB) <b-icon icon="download" aria-hidden="true"></b-icon></b-button>
        <b-button variant="primary" @click="downloadFile('Gleeson_et_al_NAR_2022.tar.xz')">.tar.xz (2.91 MB) <b-icon icon="download" aria-hidden="true"></b-icon></b-button>

        <p></p>

        <b-link href="https://doi.org/10.1093/nargab/lqad060" target="_blank"><p style="margin-bottom: 0px">Prawer YDJ <i>et al.</i> Pervasive effects of RNA degradation on Nanopore direct RNA sequencing. <i>NAR Genom Bioinform</i> 2023;<b>5</b>:lqad060.</p></b-link>
        <b-button variant="primary" @click="downloadFile('Prawer_et_al_NARGB_2023.zip')">.zip (1.41 MB) <b-icon icon="download" aria-hidden="true"></b-icon></b-button>
        <b-button variant="primary" @click="downloadFile('Prawer_et_al_NARGB_2023.7z')">.7z (1.07 MB) <b-icon icon="download" aria-hidden="true"></b-icon></b-button>
        <b-button variant="primary" @click="downloadFile('Prawer_et_al_NARGB_2023.tar.gz')">.tar.gz (1.41 MB) <b-icon icon="download" aria-hidden="true"></b-icon></b-button>
        <b-button variant="primary" @click="downloadFile('Prawer_et_al_NARGB_2023.tar.xz')">.tar.xz (1.07 MB) <b-icon icon="download" aria-hidden="true"></b-icon></b-button>

        <p></p>

        <p style="margin-bottom: 0px">Demo data</p>
        <b-button variant="primary" @click="downloadFile('demo_data.zip')">.zip (1.09 kB) <b-icon icon="download" aria-hidden="true"></b-icon></b-button>
        <b-button variant="primary" @click="downloadFile('demo_data.7z')">.7z (0.93 kB) <b-icon icon="download" aria-hidden="true"></b-icon></b-button>
        <b-button variant="primary" @click="downloadFile('demo_data.tar.gz')">.tar.gz (0.89 kB) <b-icon icon="download" aria-hidden="true"></b-icon></b-button>
        <b-button variant="primary" @click="downloadFile('demo_data.tar.xz')">.tar.xz (0.89 kB) <b-icon icon="download" aria-hidden="true"></b-icon></b-button>
    </b-modal>
</b-container>
</template>

<script>
export default {
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