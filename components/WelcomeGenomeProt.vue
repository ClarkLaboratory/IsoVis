/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

<template>
<b-container>
    <b-row>
        <b-col>
            <h1 class="text-center my-4" style="font-size: 50px;">IsoVis: Visualize alternative transcript and protein isoforms</h1>
        </b-col>
    </b-row>
    <div class="text-center">
        <b-button @click="requestDataUpload" class="m-1" size="lg" variant="warning">Upload data</b-button>
        <b-button @click="requestDemo" class="m-1" size="lg" variant="warning">Show demo data</b-button>
    </div>
    <br>
    <b-row>
        <b-col cols="3" style="padding-right: 0px;">
            <b-img class="float-right" src="~/assets/logos/IsovisLogo.svg" height="170px"></b-img>
        </b-col>
        <b-col cols="8" style="text-align: justify; text-justify: auto;">
            <p>
                IsoVis enables fast and informative visualization of transcript and protein isoforms, including exonic structures, protein features, open reading frames (ORFs), peptide evidence and relative expression levels.
                <br><br>
                IsoVis displays peptide evidence, ORFs and transcript isoforms from a combined GTF file as stacks along genomic coordinates. It can also show transcript counts and peptide intensities from CSV or tab-separated text files as heatmaps.
                <br><br>
                Reference data including the canonical ENSEMBL transcript, ORFs and encoded protein features are integrated with the isoform information.
            </p>
        </b-col>
    </b-row>
    <div class="text-center mt-2">
        <p class="m-2">Created by Ching Yin Wan, Jack Davis, Jarny Choi and Mike Clark.<br/>
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
</b-container>
</template>

<script>
import { BButton, BCol, BContainer, BImg, BLink, BRow } from 'bootstrap-vue';

export default
{
    components: {
        BButton,
        BCol,
        BContainer,
        BImg,
        BLink,
        BRow
    },

    data() {
        return {
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
        }
    }
}
</script>