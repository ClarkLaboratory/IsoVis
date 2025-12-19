/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

This is the top level page which uses all the components to simply switch views.
So there will always be a single URL, even as the user selects different "pages" from navigation menus.
This design simplifies data transfer between pages, as new data can be stored at this top level
and parts of the data can be propagated down to the components which need them.
It also makes it easier to have a persistent "page" of data visualization, as we can just show/hide
the div/component which contain the visualization rather than instantiating it and having to recreate
the exact state of that page from the previous state.

<template>
<div>
    <!-- Navbar is at the top, controlling which views to show. -->
    <b-navbar toggleable="lg" type="dark" variant="dark" class="nav-fill w-100">
        <b-navbar-brand v-if="selectedView=='Welcome'">IsoVis</b-navbar-brand>
        <b-navbar-brand v-if="selectedView=='Main'"><b-link @click="clearData" v-b-tooltip.hover.bottom="'Clear data and return to the home page'" style="color:white">IsoVis</b-link></b-navbar-brand>
        <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>
        <b-form-input v-if="selectedView=='Main'" @keyup.enter="changeZoom" v-model="enteredZoom" placeholder="Zoom to coordinates (e.g. 15720442 - 15727968)" size="sm" style="width: 350px;"></b-form-input>
        <b-button v-if="selectedView=='Main' && !$refs.componentMain.is_zoom_reset" @click="resetZoom" variant="warning" size="sm" class="ml-2" style="white-space: nowrap;">Reset zoom</b-button>
        <b-collapse id="nav-collapse" is-nav>
            <!-- Right aligned nav items -->
            <b-navbar-nav class="ml-auto">
                <b-button @click="clearData" v-show="!isMainDataEmpty" variant="danger" size="sm" class="ml-2" style="white-space: nowrap;">Clear data and return to the home page</b-button>
                <b-button @click="downloadDemo" v-show="(!isMainDataEmpty) && isDemoDataShown" variant="secondary" size="sm" class="ml-2" style="white-space: nowrap;">Download demo data</b-button>
                <b-button @click="modal.selectGene.show=true" v-show="!isMainDataEmpty && this.mainData.isoformData && !(this.mainData.isoformData.is_genomeprot) && this.all_genes && this.all_genes.length > 1" variant="primary" size="sm" class="ml-2" style="white-space: nowrap;">Change selected gene</b-button>
                <b-button @click="modal.selectGenomeProtGene.show=true" v-show="!isMainDataEmpty && this.mainData.isoformData && this.mainData.isoformData.is_genomeprot && this.all_genes && this.all_genes.length > 1" variant="primary" size="sm" class="ml-2" style="white-space: nowrap;">Change selected gene</b-button>
                <b-dropdown text="About" variant="dark" right class="ml-2">
                    <b-dropdown-item href="about/" target="_blank">About IsoVis</b-dropdown-item>
                    <b-dropdown-item @click="modal.changelog.show=true">Release notes</b-dropdown-item>
                    <b-dropdown-item @click="modal.citation.show=true">How to cite us</b-dropdown-item>
                    <b-dropdown-item href="misc/" target="_blank">Privacy, license and funding</b-dropdown-item>
                </b-dropdown>
                <b-dropdown text="Help" variant="dark" right class="ml-2">
                    <b-dropdown-item href="tutorial/" target="_blank">Tutorial on how to use IsoVis</b-dropdown-item>
                    <b-dropdown-item href="help_upload/" target="_blank">Help on upload data</b-dropdown-item>
                    <b-dropdown-item href="help_gene_strand/" target="_blank">Help on gene strand diagram</b-dropdown-item>
                    <b-dropdown-item href="faq/" target="_blank">Frequently asked questions (FAQ)</b-dropdown-item>
                    <b-dropdown-item href="https://github.com/ClarkLaboratory/IsoVis" target="_blank">Go to the IsoVis GitHub repository</b-dropdown-item>
                    <b-dropdown-item href="https://github.com/ClarkLaboratory/IsoVis/issues" target="_blank">Report issues or request features</b-dropdown-item>
                </b-dropdown>
            </b-navbar-nav>
        </b-collapse>
    </b-navbar>

    <!-- Main content -->
    <Welcome v-if="selectedView=='Welcome'" class="flex-fill"/>
    <Main :main-data="mainData" v-show="selectedView=='Main'" ref="componentMain" class="flex-fill"/>

    <!-- Footer contains release notes and logos. -->
    <footer class="footer bg-dark mt-2">
        <b-row align-h="between" class="p-2" style="margin-left: 0px; margin-right: 0px;">
            <b-col cols="3" style="padding-left: 0px; padding-right: 0px;">
                <span class="text-white">&copy; {{getYear()}} IsoVis</span>
                <b-link href="#" v-b-modal.release-notes class="text-white ml-3">{{versionNumber}}</b-link>
            </b-col>
            <b-col cols="6" class="text-center" style="padding-left: 0px; padding-right: 0px;">
                <b class="text-white">This website is free and open to all users and there is no login requirement.</b>
            </b-col>
            <b-col cols="3" class="text-right" style="padding-left: 0px; padding-right: 0px;">
                <b-link href="https://stemformatics.org" target="_blank"><b-img src="~/assets/logos/StemformaticsLogo_REV_RGB_300px.png" height="22"></b-img></b-link>
                <b-link href="https://nectar.org.au/" target="_blank" class="ml-2"><b-img src="@/assets/logos/nectardirectorate-logo.png" height="18"></b-img></b-link>
            </b-col>
        </b-row>
    </footer>

    <!-- Data upload modal -->
    <b-modal v-model="modal.uploadData.show" size="md" title="Upload data" hide-footer>
        <p>Upload your own data here to visualize.
            <b-link href="help_upload/" target="_blank">More info...</b-link>
        </p>
        <b-form @submit="handleFileUpload" @submit.stop.prevent inline>
            <em><b>Stack data</b> file (.gff/.gtf/.bed) (<b>required</b>, max. 2 GB)</em>
            <b-form-file v-model="modal.uploadData.stackFile" no-drop accept=".gtf, .gff, .gff2, .gff3, .bed, .bed4, .bed5, .bed6, .bed7, .bed8, .bed9, .bed12"></b-form-file>
            <em class="mt-3"><b>Heatmap data</b> file (.csv/.tsv/.txt) (optional, max. 2 GB)</em>
            <b-form-file v-model="modal.uploadData.heatmapFile" no-drop accept=".csv, .tsv, .txt"></b-form-file>
            <em class="mt-3" v-show="is_show_peptide_upload_options"><b>Peptide data</b> file (.bed) (optional; ignored if a GenomeProt annotation file was uploaded as <b>stack data</b>; max. 500 MB)</em>
            <b-form-file v-show="is_show_peptide_upload_options" v-model="modal.uploadData.peptideFile" no-drop accept=".bed, .bed4, .bed5, .bed6, .bed7, .bed8, .bed9, .bed12"></b-form-file>
            <em class="mt-3" v-show="is_show_peptide_upload_options"><b>Peptide counts data</b> file (.csv/.tsv/.txt) (optional, but visualization requires peptide data to have been provided; max. 500 MB)</em>
            <b-form-file v-show="is_show_peptide_upload_options" v-model="modal.uploadData.peptideCountsFile" no-drop accept=".csv, .tsv, .txt"></b-form-file>
            <em class="mt-3" v-show="is_show_rna_modif_upload_options"><b>RNA modifications data</b> file (.bed) (optional, max. 500 MB)</em>
            <b-form-file v-show="is_show_rna_modif_upload_options" v-model="modal.uploadData.rnaModifFile" no-drop accept=".bed, .bed4, .bed5, .bed6, .bed7, .bed8, .bed9, .bed12"></b-form-file>
            <em class="mt-3" v-show="is_show_rna_modif_upload_options"><b>RNA modification level data</b> file (.csv/.tsv/.txt) (optional but requires RNA modifications data file, max. 500 MB)</em>
            <b-form-file v-show="is_show_rna_modif_upload_options" v-model="modal.uploadData.rnaModifLevelFile" no-drop accept=".csv, .tsv, .txt"></b-form-file>
            <em class="mt-3"><b>Species</b> (default: Homo_sapiens)</em>
            <b-form-input v-model="enteredSpecies" list="acceptedSpecies" class="mb-3" style="width: 100%"></b-form-input>
            <b-form-datalist id="acceptedSpecies">
                <option v-for="ensemblSpecies in ensemblSpeciesList" :key="ensemblSpecies">{{ ensemblSpecies }}</option>
            </b-form-datalist>
            <b-form-checkbox v-model="is_show_peptide_upload_options">Show peptide data upload options (beta)</b-form-checkbox>
            <b-form-checkbox v-model="is_show_rna_modif_upload_options">Show RNA modifications data upload options (beta)</b-form-checkbox>
            <b-form-checkbox v-model="is_use_grch37">Use GRCh37 (hg19) instead of GRCh38 (hg38)</b-form-checkbox>
        </b-form>
        <b-form inline class="float-right mt-3">
            <b-button @click="modal.uploadData.show=false" variant="dark">Cancel</b-button>
            <b-button @click="handleFileUpload" variant="primary" class="ml-2">Apply</b-button>
        </b-form>
    </b-modal>

    <!-- Gene selection modal (non-GenomeProt) -->
    <b-modal v-model="modal.selectGene.show" size="md" title="Select a gene" hide-footer no-close-on-backdrop no-close-on-esc>
        <p>More than one gene is found in the stack data file. Please select the gene you would like to visualize.</p>
        <b-form-group style="margin-bottom: 0px;" description="Start typing either the gene's symbol or ID, then select from the list of genes and press enter.">
            <b-form-input @keyup="searchGenes" @keyup.enter="checkInput" v-model="enteredGene" list="geneIds" class="mb-3" placeholder="Search (e.g. CACNA1C, ENSG00000116786)..."></b-form-input>
            <b-form-datalist id="geneIds"></b-form-datalist>
            <p v-show="no_genes_found"><span style="color: red;">No genes found with your search query.</span> Please change your search query to find genes.</p>
        </b-form-group>
    </b-modal>

    <!-- Gene selection modal (GenomeProt) -->
    <b-modal v-model="modal.selectGenomeProtGene.show" size="lg" title="Select a gene" hide-footer no-close-on-backdrop no-close-on-esc>
        <p>More than one gene is found in the stack data file. Please select the gene you would like to visualize.</p>
        <b-form-group style="margin-bottom: 0px;" description="Start typing either the gene's symbol or ID, then select from the list of genes and press enter.">
            <b-form-input @keyup="searchGenomeProtGenes" @keyup.enter="checkGenomeProtGeneInput" v-model="enteredGenomeProtGene" list="genomeProtGeneIds" class="mb-3" placeholder="Search (e.g. CACNA1C, ENSG00000116786)..."></b-form-input>
            <b-form-datalist id="genomeProtGeneIds"></b-form-datalist>
            <p v-show="no_genomeprot_genes_found"><span style="color: red;">No genes found with your search query.</span> Please change your search query to find genes.</p>
            <em class="mt-3">Gene filtering options (ORF = open reading frame, UMP = uniquely mapped peptide):</em>
            <b-form-checkbox v-model="uniq_map_peptides" :disabled="no_uniq_map_peptides">ORFs with UMPs ({{ !no_uniq_map_peptides ? `${num_uniq_map_peptides}` : "none" }})</b-form-checkbox>
            <b-form-checkbox v-model="unknome_filter" :disabled="no_unknome_filter">ORFs with UMPs from zero-'knownness' Unknome v3 genes (human / mouse / zebrafish / fruit fly) ({{ !no_unknome_filter ? `${num_unknome_filter}` : "none" }})</b-form-checkbox>
            <b-form-checkbox v-model="lncRNA_peptides" :disabled="no_lncRNA_peptides">Long non-coding RNAs with UMPs ({{ !no_lncRNA_peptides ? `${num_lncRNA_peptides}` : "none" }})</b-form-checkbox>
            <b-form-checkbox v-model="novel_txs" :disabled="no_novel_txs">Novel transcript isoforms with UMPs ({{ !no_novel_txs ? `${num_novel_txs}` : "none" }})</b-form-checkbox>
            <b-form-checkbox v-model="novel_txs_distinguished" :disabled="no_novel_txs_distinguished">Novel transcript isoforms distinguished by UMPs ({{ !no_novel_txs_distinguished ? `${num_novel_txs_distinguished}` : "none" }})</b-form-checkbox>
            <b-form-checkbox v-model="unann_orfs" :disabled="no_unann_orfs">Unannotated ORFs with UMPs ({{ !no_unann_orfs ? `${num_unann_orfs}` : "none" }})</b-form-checkbox>
            <b-form-checkbox v-model="uorf_5" :disabled="no_uorf_5">5' uORFs with UMPs ({{ !no_uorf_5 ? `${num_uorf_5}` : "none" }})</b-form-checkbox>
            <b-form-checkbox v-model="dorf_3" :disabled="no_dorf_3">3' dORFs with UMPs ({{ !no_dorf_3 ? `${num_dorf_3}` : "none" }})</b-form-checkbox>
            <b-form-checkbox v-model="pseudogene" :disabled="no_pseudogene">Pseudogenes with UMPs ({{ !no_pseudogene ? `${num_pseudogene}` : "none" }})</b-form-checkbox>
            <b-form-checkbox v-model="marker" :disabled="no_marker">Marker genes ({{ !no_marker ? `${num_marker}` : "none" }})</b-form-checkbox>
        </b-form-group>
    </b-modal>

    <!-- No matching gene selected -->
    <b-modal v-model="modal.noMatchingGene.show" size="md" title="No matching gene found" hide-footer>
        <p>No matching gene found in the stack data file. Please select a gene from the list.</p>
    </b-modal>

    <!-- Heatmap data upload modal -->
    <b-modal v-model="modal.heatmapUploadData.show" size="md" title="Upload heatmap data" hide-footer>
        <p>Upload your own data here to visualize.
            <b-link href="help_upload/" target="_blank">More info...</b-link>
        </p>
        <b-form inline>
            <em><b>Heatmap data</b> file (.csv/.txt) (max. 2 GB)</em> 
            <b-form-file v-model="modal.heatmapUploadData.heatmapFile" no-drop accept=".csv, .txt"></b-form-file>
        </b-form>
        <b-form inline class="float-right mt-3">
            <b-button @click="modal.heatmapUploadData.show=false" variant="dark">Cancel</b-button>
            <b-button @click="handleHeatmapFileUpload" variant="primary" class="ml-2">Apply</b-button>
        </b-form>
    </b-modal>

    <!-- Loading modal -->
    <b-modal v-model="modal.loading.show" size="md" title="Processing data..." hide-header-close hide-footer no-close-on-backdrop no-close-on-esc>
        <b-progress max="100" precision="2" show-progress>
            <b-progress-bar :value="modal.loading.value" :label="`${modal.loading.value.toFixed(2)}%`"></b-progress-bar>
        </b-progress>
        <p> {{ modal.loading.msg }} </p>
    </b-modal>

    <!-- Release notes modal -->
    <b-modal v-model="modal.changelog.show" size="xl" id='release-notes' title="Release notes" scrollable ok-only ok-title="Close">
        <ul class="list-unstyled">
            <li v-for="item in releaseNotes" :key="item.version" class="mb-2"><b>{{item.version}} ({{item.date}})</b>
                <ul><li v-for="note in item.notes" :key="note">{{note}}</li></ul>
            </li>
        </ul>
    </b-modal>

    <!-- Citation modal -->
    <b-modal v-model="modal.citation.show" size="lg" id='citation' title="How to cite us" ok-only ok-title="Close">
        <p>If you use IsoVis, please cite:</p>
        <p>Ching Yin Wan, Jack Davis, Manveer Chauhan, Josie Gleeson, Yair D J Prawer, Ricardo De Paoli-Iseppi, Christine A Wells, Jarny Choi, Michael B Clark, IsoVis – a webserver for visualization and annotation of alternative RNA isoforms, <i>Nucleic Acids Research</i>, Volume 52, Issue W1, 5 July 2024, Pages W341–W347, <b-link href="https://doi.org/10.1093/nar/gkae343" target="_blank">https://doi.org/10.1093/nar/gkae343</b-link></p>
    </b-modal>
</div>
</template>

<script>
import { PrimaryData, SecondaryData, PeptideData, PeptideCountsData, RNAModifSitesData, RNAModifSitesLevelData } from '~/assets/data_parser';
import { BButton, BCol, BCollapse, BDropdown, BDropdownItem, BForm, BFormDatalist, BFormFile, BFormGroup, BFormInput, BImg, BLink, BModal, BNavbar, BNavbarBrand, BNavbarNav, BNavbarToggle, BProgress, BProgressBar, BRow, BVModalPlugin, VBModal, VBTooltip } from 'bootstrap-vue';

export default
{
    components: {
        BButton,
        BCol,
        BCollapse,
        BDropdown,
        BDropdownItem,
        BForm,
        BFormDatalist,
        BFormFile,
        BFormGroup,
        BFormInput,
        BImg,
        BLink,
        BModal,
        BNavbar,
        BNavbarBrand,
        BNavbarNav,
        BNavbarToggle,
        BProgress,
        BProgressBar,
        BRow,
        BVModalPlugin
    },

    directives: {
        VBModal,
        VBTooltip
    },

    data() {
        return {
            views: ["Main", "Welcome", "About", "Privacy"],
            selectedView: "Welcome",

            mainData: {init: false, isoformData:{}, heatmapData:null, canonData:{}, selectedGene:'', geneLabel:'', demoData:false, is_use_grch37:false},

            modal: {
                uploadData:
                {
                    show: false,
                    stackFile: null,
                    heatmapFile: null,
                    peptideFile: null,
                    peptideCountsFile: null,
                    rnaModifFile: null,
                    rnaModifLevelFile: null,
                },
                selectGene:
                {
                    show: false,
                },
                selectGenomeProtGene:
                {
                    show: false,
                },
                noMatchingGene:
                {
                    show: false,
                },
                heatmapUploadData:
                {
                    show: false,
                    heatmapFile: null,
                },
                loading:
                {
                    show: false,
                    msg: "Loading...",
                    value: 0,
                },
                changelog:
                {
                    show: false,
                },
                citation:
                {
                    show: false,
                }
            },

            filtered_genes: [], // array of genes filtered from the file
            all_genes: [],      // array of all genes found in the file
            all_gene_names: [], // array of all gene names found in the file (for GenomeProt data only)
            selectedGene: null,
            enteredGene: null,
            enteredGenomeProtGene: null,
            is_changing_gene: false,

            no_genes_found: false,
            no_genomeprot_genes_found: false,

            geneNameInfo: {},
            gene_attributes: {},
            gene_name_attributes: {},

            cached_list_of_all_genes: [],
            cached_list_of_all_gene_names: [],
            cached_gene_filters: null,

            uniq_map_peptides: false,
            unknome_filter: false,
            lncRNA_peptides: false,
            novel_txs: false,
            novel_txs_distinguished: false,
            unann_orfs: false,
            uorf_5: false,
            dorf_3: false,
            pseudogene: false,
            marker: false,

            no_uniq_map_peptides: false,
            no_unknome_filter: false,
            no_lncRNA_peptides: false,
            no_novel_txs: false,
            no_novel_txs_distinguished: false,
            no_unann_orfs: false,
            no_uorf_5: false,
            no_dorf_3: false,
            no_pseudogene: false,
            no_marker: false,

            num_uniq_map_peptides: 0,
            num_unknome_filter: 0,
            num_lncRNA_peptides: 0,
            num_novel_txs: 0,
            num_novel_txs_distinguished: 0,
            num_unann_orfs: 0,
            num_uorf_5: 0,
            num_dorf_3: 0,
            num_pseudogene: 0,
            num_marker: 0,

            unknome_gene_ids: [],
            unknome_gene_symbols: [],

            enteredZoom: null,
            enteredSpecies: null,
            is_use_grch37: false,
            is_show_peptide_upload_options: false,
            is_show_rna_modif_upload_options: false,

            controller: null,
            options: {},

            versionNumber: '',
            releaseNotes: [],

            taxon_id: -1,
            ensemblSpeciesList: [],
            speciesToTaxId: {}
        }
    },

    computed:
    {
        isMainDataEmpty()
        {
            return (this.mainData.init === false);
        },

        isDemoDataShown()
        {
            return (this.mainData.demoData === true);
        }
    },

    methods: {
        async decompressGzippedJSON(url)
        {
            let compressed = await fetch(url).then(
                res => res.blob()
            );
            let decompressor = new DecompressionStream("gzip");
            let decompressed = compressed.stream().pipeThrough(decompressor);
            return await new Response(decompressed).json();
        },

        // When the user requests demo data, this function fetches it from /static/ and populates mainData.
        // Since Main.vue is watching a change in mainData, it should update automatically and show the demo.
        async showDemo()
        {
            let data = await this.decompressGzippedJSON("/demo_data.json.gz");

            this.selectedView = 'Main';
            data.secondaryData.transcriptOrder = JSON.parse(JSON.stringify(data.primaryData.transcriptOrder));
            this.mainData = {isoformData:data.primaryData, heatmapData:data.secondaryData, canonData:data.canonData, 
                             proteinData:data.proteinData, selectedGene:data.selectedGene, geneLabel:data.geneLabel, demoData:true, species:"Homo_sapiens", is_use_grch37: false};
        },

        downloadDemo()
        {
            var link = document.createElement('a');
            link.href = "/demo_data.zip";
            link.download = "demo_data.zip";
            link.click();
        },

        changeZoom()
        {
            let entered_zoom = this.enteredZoom;
            if (!entered_zoom)
                return;

            let start_end = entered_zoom.split('-');
            if (start_end.length !== 2)
                return;

            let start = parseInt(start_end[0]);
            let end = parseInt(start_end[1]);
            if (isNaN(start) || isNaN(end))
                return;

            this.$root.$emit("set_zoom", [start, end, false]);
        },

        resetZoom()
        {
            this.$root.$emit("reset_zoom");
        },

        reset_loading_popup()
        {
            this.modal.loading.show = false;
            this.modal.loading.msg = "Loading...";
            this.modal.loading.value = 0;
        },

        clearGenomeProtGeneCacheAndOptions()
        {
            this.cached_list_of_all_genes = [];
            this.cached_list_of_all_gene_names = [];
            this.cached_gene_filters = null;

            this.enteredGenomeProtGene = null;

            this.uniq_map_peptides = false;
            this.unknome_filter = false;
            this.lncRNA_peptides = false;
            this.novel_txs = false;
            this.novel_txs_distinguished = false;
            this.unann_orfs = false;
            this.uorf_5 = false;
            this.dorf_3 = false;
            this.pseudogene = false;
            this.marker = false;
        },

        clearGenomeProtGeneData()
        {
            this.clearGenomeProtGeneCacheAndOptions();

            this.geneNameInfo = {};
            this.gene_attributes = {};
            this.gene_name_attributes = {};

            this.no_uniq_map_peptides = false;
            this.no_unknome_filter = false;
            this.no_lncRNA_peptides = false;
            this.no_novel_txs = false;
            this.no_novel_txs_distinguished = false;
            this.no_unann_orfs = false;
            this.no_uorf_5 = false;
            this.no_dorf_3 = false;
            this.no_pseudogene = false;
            this.no_marker = false;

            this.num_uniq_map_peptides = 0;
            this.num_unknome_filter = 0;
            this.num_lncRNA_peptides = 0;
            this.num_novel_txs = 0;
            this.num_novel_txs_distinguished = 0;
            this.num_unann_orfs = 0;
            this.num_uorf_5 = 0;
            this.num_dorf_3 = 0;
            this.num_pseudogene = 0;
            this.num_marker = 0;

            this.unknome_gene_ids = [];
            this.unknome_gene_symbols = [];
        },

        clearData()
        {
            this.selectedView = "Welcome";

            this.clearGenomeProtGeneData();

            this.enteredGene = null;
            this.selectedGene = null;
            this.filtered_genes = [];
            this.all_genes = [];
            this.all_gene_names = [];
            this.enteredZoom = null;
            this.enteredSpecies = null;
            this.is_use_grch37 = false;
            this.is_show_peptide_upload_options = false;
            this.is_show_rna_modif_upload_options = false;
            this.no_genes_found = false;
            this.no_genomeprot_genes_found = false;
            this.taxon_id = -1;
            this.modal.uploadData.stackFile = null;
            this.modal.uploadData.heatmapFile = null;
            this.modal.uploadData.peptideFile = null;
            this.modal.uploadData.peptideCountsFile = null;
            this.modal.uploadData.rnaModifFile = null;
            this.modal.uploadData.rnaModifLevelFile = null;
            this.modal.heatmapUploadData.heatmapFile = null;

            this.$refs.componentMain.abortFetches();

            // Unpick any previously selected gene in GenomeProt(SC)
            if (!(this.isDemoDataShown) && (window.parent !== window))
                window.parent.postMessage("", document.referrer);

            this.mainData = {init: false, isoformData:{}, heatmapData:null, canonData:{}, selectedGene:'', geneLabel:'', demoData:false, species:"Homo_sapiens", is_use_grch37:false};
        },

        checkInput()
        {
            let entered_gene = this.enteredGene;
            if (!entered_gene)
                return;

            if (this.all_genes.indexOf(entered_gene) !== -1)
            {
                this.selectedGene = entered_gene;
                this.modal.selectGene.show = false;
                this.enteredGene = null;
                this.is_changing_gene = true;
                this.no_genes_found = false;
                this.handleFileUpload();
            }
            else
            {
                // If the user selected an entry that looks like '<gene symbol> (<gene ID>)', extract the gene ID
                let left_bracket_index = entered_gene.indexOf('(');
                if (left_bracket_index !== -1)
                {
                    let right_bracket_index = entered_gene.indexOf(')', left_bracket_index + 1);
                    if (right_bracket_index !== -1)
                        entered_gene = entered_gene.substring(left_bracket_index + 1, right_bracket_index);

                    if (this.all_genes.indexOf(entered_gene) !== -1)
                    {
                        this.selectedGene = entered_gene;
                        this.modal.selectGene.show = false;
                        this.enteredGene = null;
                        this.is_changing_gene = true;
                        this.no_genes_found = false;
                        this.handleFileUpload();
                    }
                    else
                        this.modal.noMatchingGene.show = true;
                }
                else
                    this.modal.noMatchingGene.show = true;
            }
        },

        checkGenomeProtGeneInput()
        {
            let entered_gene = this.enteredGenomeProtGene;
            if (!entered_gene)
                return;

            if (this.all_genes.indexOf(entered_gene) !== -1)
            {
                this.selectedGene = entered_gene;
                this.modal.selectGenomeProtGene.show = false;
                this.enteredGenomeProtGene = null;
                this.is_changing_gene = true;
                this.no_genomeprot_genes_found = false;
                this.handleFileUpload();
            }
            else
            {
                // If the user selected an entry that looks like '<gene symbol> (<gene ID>)', extract the gene ID
                let left_bracket_index = entered_gene.indexOf('(');
                if (left_bracket_index !== -1)
                {
                    let right_bracket_index = entered_gene.indexOf(')', left_bracket_index + 1);
                    if (right_bracket_index !== -1)
                        entered_gene = entered_gene.substring(left_bracket_index + 1, right_bracket_index);

                    if (this.all_genes.indexOf(entered_gene) !== -1)
                    {
                        this.selectedGene = entered_gene;
                        this.modal.selectGenomeProtGene.show = false;
                        this.enteredGenomeProtGene = null;
                        this.is_changing_gene = true;
                        this.no_genomeprot_genes_found = false;
                        this.handleFileUpload();
                    }
                    else
                        this.modal.noMatchingGene.show = true;
                }
                else
                    this.modal.noMatchingGene.show = true;
            }
        },

        buildDatalist(is_update_genes_found = false)
        {
            let gene_ids = Object.keys(this.options);
            let symbol_options = [];
            let id_options = [];

            for (let gene_id of gene_ids)
            {
                let symbol = this.options[gene_id];
                if (!symbol)
                    id_options.push(`<option>${gene_id}</option>`);
                else
                    symbol_options.push(`<option>${symbol} (${gene_id})</option>`);
            }

            symbol_options.sort();
            id_options.sort();

            // Sorted gene symbol + ID options come first, then sorted gene ID options come later
            let new_options = symbol_options.concat(id_options);

            let gene_ids_list = document.getElementById("geneIds");
            if (!gene_ids_list)
                return;

            gene_ids_list.innerHTML = new_options;

            if (is_update_genes_found)
                this.no_genes_found = (new_options.length === 0);
            else
                this.no_genes_found = false;
        },

        buildGenomeProtDatalist(is_update_genes_found = false)
        {
            let gene_ids = Object.keys(this.options);
            let symbol_options = [];
            let id_options = [];

            for (let gene_id of gene_ids)
            {
                let symbol = this.options[gene_id];
                if (!symbol)
                    id_options.push(`<option>${gene_id}</option>`);
                else
                    symbol_options.push(`<option>${symbol} (${gene_id})</option>`);
            }

            symbol_options.sort();
            id_options.sort();

            // Sorted gene symbol + ID options come first, then sorted gene ID options come later
            let new_options = symbol_options.concat(id_options);

            let gene_ids_list = document.getElementById("genomeProtGeneIds");
            if (!gene_ids_list)
                return;

            gene_ids_list.innerHTML = new_options;

            if (is_update_genes_found)
                this.no_genomeprot_genes_found = (new_options.length === 0);
            else
                this.no_genomeprot_genes_found = false;
        },

        // Include at most 100 genes from the genes in the stack data file that begin with the user's input (case-insensitive)
        async searchGenes(key_event)
        {
            // FIXME: Find a better way to ignore keys that do not affect the user input or detect whether the user input is changed
            let ignored_keys = ["Enter", "Control", "Meta", "Alt", "Tab", "Shift", "CapsLock", "NumLock", "ContextMenu", "PrintScreen", "Pause", "Break", "Cancel", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"];
            if (ignored_keys.indexOf(key_event.key) !== -1)
                return;

            if (this.enteredGene === null)
                return;

            let entered_gene = this.enteredGene.toLowerCase();
            let total_count = 0;
            let max_genes = 100;

            this.options = {};
            this.buildDatalist();

            for (let i = 0; (i < this.all_genes.length) && (total_count < max_genes); ++i)
            {
                let gene = this.all_genes[i];
                if (gene.toLowerCase().indexOf(entered_gene) === 0)
                {
                    this.options[gene] = null;
                    total_count += 1;
                }
            }

            this.buildDatalist();

            if (this.controller)
                this.controller.abort();

            // Only perform a search when a user has entered at least 2 characters
            if (this.enteredGene.length < 2)
                return;

            this.controller = new AbortController();
            const signal = this.controller.signal;

            // Search for Ensembl gene IDs by gene symbol from mygene.info
            let data = await fetch(`https://mygene.info/v3/query?species=${this.taxon_id}&fields=symbol,ensembl.gene&q=symbol:${this.enteredGene}*`, { signal })
                .then(res => res.json())
                .catch(() => {});

            if (data && data.total > 0)
            {
                let hits = data["hits"];
                if (!hits)
                    return;

                for (let hit of hits)
                {
                    let ensembl_obj = hit.ensembl;
                    if (!ensembl_obj)
                        continue;

                    let symbol = hit.symbol;
                    if (!symbol)
                        continue;

                    if (ensembl_obj.constructor === Array)
                    {
                        for (let obj of ensembl_obj)
                        {
                            let gene = obj.gene;
                            if (!gene)
                                continue;
                            gene = gene.toUpperCase();
                            if (this.all_genes.indexOf(gene) !== -1)
                                this.options[gene] = symbol;
                        }
                    }
                    else
                    {
                        let gene = ensembl_obj.gene;
                        if (!gene)
                            continue;
                        gene = gene.toUpperCase();
                        if (this.all_genes.indexOf(gene) !== -1)
                            this.options[gene] = symbol;
                    }
                }

                this.buildDatalist(true);
            }
            else
                this.no_genes_found = (Object.keys(this.options).length === 0);
        },

        mergeLists(list1, list2)
        {
            let list1_length = list1.length;
            let list2_length = list2.length;

            let shorter_list = (list1_length < list2_length) ? list1 : list2;
            let  longer_list = (list1_length < list2_length) ? list2 : list1;

            let result = [];
            longer_list = new Set(longer_list);
            for (let elem of shorter_list)
                if (longer_list.has(elem))
                    result.push(elem);

            return result;
        },

        // Include at most 100 genes from the genes in the stack data file that begin with the user's input (case-insensitive)
        searchGenomeProtGenes(key_event)
        {
            // FIXME: Find a better way to ignore keys that do not affect the user input or detect whether the user input is changed
            let ignored_keys = ["Enter", "Control", "Meta", "Alt", "Tab", "Shift", "CapsLock", "NumLock", "ContextMenu", "PrintScreen", "Pause", "Break", "Cancel", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"];
            if (ignored_keys.indexOf(key_event.key) !== -1)
                return;

            if (this.enteredGenomeProtGene === null)
                return;

            let entered_gene = this.enteredGenomeProtGene.toLowerCase();
            let total_count = 0;
            let max_genes = 100;

            this.options = {};
            this.buildGenomeProtDatalist();

            let gene_filters = "";
            if (this.uniq_map_peptides)
                gene_filters += "uniq_map_peptides";
            if (this.unknome_filter)
                gene_filters += "unknome_filter";
            if (this.lncRNA_peptides)
                gene_filters += "lncRNA_peptides";
            if (this.novel_txs)
                gene_filters += "novel_txs";
            if (this.novel_txs_distinguished)
                gene_filters += "novel_txs_distinguished";
            if (this.unann_orfs)
                gene_filters += "unann_orfs";
            if (this.uorf_5)
                gene_filters += "uorf_5";
            if (this.dorf_3)
                gene_filters += "dorf_3";
            if (this.pseudogene)
                gene_filters += "pseudogene";
            if (this.marker)
                gene_filters += "marker";

            let list_of_all_genes = this.cached_list_of_all_genes;
            let list_of_all_gene_names = this.cached_list_of_all_gene_names;
            if (this.cached_gene_filters !== gene_filters)
            {
                this.cached_gene_filters = gene_filters;

                list_of_all_genes = this.all_genes;
                list_of_all_gene_names = this.all_gene_names;

                let is_any_other_ump_filter_selected = (this.unknome_filter || this.lncRNA_peptides || this.novel_txs || this.novel_txs_distinguished ||
                                                        this.unann_orfs || this.uorf_5 || this.dorf_3 || this.pseudogene);

                // Create the lists of gene IDs and gene names according to the gene filters applied by the user

                // Optimization: If any other UMP filter is selected, then only consider the gene lists for those filters rather than for UMPs only
                if (is_any_other_ump_filter_selected)
                {
                    // Go through each filter one by one
                    if (this.unknome_filter)
                    {
                        list_of_all_genes = JSON.parse(JSON.stringify((this.gene_attributes["unknome_filter"])));
                        list_of_all_gene_names = JSON.parse(JSON.stringify((this.gene_name_attributes["unknome_filter"])));
                    }
                    if (this.lncRNA_peptides)
                    {
                        list_of_all_genes = this.mergeLists(list_of_all_genes, this.gene_attributes["lncRNA_peptides"]);
                        list_of_all_gene_names = this.mergeLists(list_of_all_gene_names, this.gene_name_attributes["lncRNA_peptides"]);
                    }
                    if (this.novel_txs)
                    {
                        list_of_all_genes = this.mergeLists(list_of_all_genes, this.gene_attributes["novel_txs"]);
                        list_of_all_gene_names = this.mergeLists(list_of_all_gene_names, this.gene_name_attributes["novel_txs"]);
                    }
                    if (this.novel_txs_distinguished)
                    {
                        list_of_all_genes = this.mergeLists(list_of_all_genes, this.gene_attributes["novel_txs_distinguished"]);
                        list_of_all_gene_names = this.mergeLists(list_of_all_gene_names, this.gene_name_attributes["novel_txs_distinguished"]);
                    }
                    if (this.unann_orfs)
                    {
                        list_of_all_genes = this.mergeLists(list_of_all_genes, this.gene_attributes["unann_orfs"]);
                        list_of_all_gene_names = this.mergeLists(list_of_all_gene_names, this.gene_name_attributes["unann_orfs"]);
                    }
                    if (this.uorf_5)
                    {
                        list_of_all_genes = this.mergeLists(list_of_all_genes, this.gene_attributes["uorf_5"]);
                        list_of_all_gene_names = this.mergeLists(list_of_all_gene_names, this.gene_name_attributes["uorf_5"]);
                    }
                    if (this.dorf_3)
                    {
                        list_of_all_genes = this.mergeLists(list_of_all_genes, this.gene_attributes["dorf_3"]);
                        list_of_all_gene_names = this.mergeLists(list_of_all_gene_names, this.gene_name_attributes["dorf_3"]);
                    }
                    if (this.pseudogene)
                    {
                        list_of_all_genes = this.mergeLists(list_of_all_genes, this.gene_attributes["pseudogene"]);
                        list_of_all_gene_names = this.mergeLists(list_of_all_gene_names, this.gene_name_attributes["pseudogene"]);
                    }
                }
                // Otherwise, if just the UMP filter is selected, then use the gene list for that filter
                else if (this.uniq_map_peptides)
                {
                    list_of_all_genes = this.mergeLists(list_of_all_genes, this.gene_attributes["uniq_map_peptides"]);
                    list_of_all_gene_names = this.mergeLists(list_of_all_gene_names, this.gene_name_attributes["uniq_map_peptides"]);
                }

                // Filter for marker genes last as they don't have to encode UMPs
                if (this.marker)
                {
                    list_of_all_genes = this.mergeLists(list_of_all_genes, this.gene_attributes["marker"]);
                    list_of_all_gene_names = this.mergeLists(list_of_all_gene_names, this.gene_name_attributes["marker"]);
                }

                this.cached_list_of_all_genes = list_of_all_genes;
                this.cached_list_of_all_gene_names = list_of_all_gene_names;
            }

            for (let i = 0; (i < list_of_all_genes.length) && (total_count < max_genes); ++i)
            {
                let gene = list_of_all_genes[i];
                if (gene.toLowerCase().indexOf(entered_gene) === 0)
                {
                    this.options[gene] = null;
                    total_count += 1;
                }
            }

            total_count = 0;
            for (let i = 0; (i < list_of_all_gene_names.length) && (total_count < max_genes); ++i)
            {
                let gene_name = list_of_all_gene_names[i];
                if (gene_name.toLowerCase().indexOf(entered_gene) === 0)
                {
                    // Check if the gene name corresponds to gene ID(s) that are not filtered away
                    let gene_ids_from_name = this.geneNameInfo[gene_name];
                    for (let gene_id_from_name of gene_ids_from_name)
                    {
                        if (list_of_all_genes.indexOf(gene_id_from_name) !== -1)
                        {
                            this.options[gene_id_from_name] = gene_name;
                            total_count += 1;
                            if (total_count === max_genes)
                                break;
                        }
                    }
                }
            }

            this.buildGenomeProtDatalist(true);
        },

        async handleFileUpload()
        {
            // Check the entered species
            let species = this.enteredSpecies;
            if (!species)
            {
                this.taxon_id = 9606;
                species = "Homo_sapiens";
            }
            else if (this.ensemblSpeciesList.indexOf(species) === -1)
            {
                this.$bvModal.msgBoxOk("Please select a species from the list.");
                this.taxon_id = -1;
                return;
            }
            else
            {
                // Extract the Latin name of the entered species
                let last_left_bracket_index = species.lastIndexOf('(');
                let last_right_bracket_index = species.lastIndexOf(')');
                if ((last_left_bracket_index === -1) || (last_right_bracket_index === -1))
                {
                    this.$bvModal.msgBoxOk("This error should not occur. Please report this issue to the issue tracker on the IsoVis GitHub repository.");
                    this.taxon_id = -1;
                    return;
                }

                this.taxon_id = this.speciesToTaxId[species];
                species = species.substring(last_left_bracket_index + 1, last_right_bracket_index);
            }

            // Read the stack file
            let file = this.modal.uploadData.stackFile;
            let hfile = (this.modal.heatmapUploadData.heatmapFile) ? this.modal.heatmapUploadData.heatmapFile : this.modal.uploadData.heatmapFile;
            let pfile = this.modal.uploadData.peptideFile;
            let pcfile = this.modal.uploadData.peptideCountsFile;
            let rna_modif_file = this.modal.uploadData.rnaModifFile;
            let rna_modif_level_file = this.modal.uploadData.rnaModifLevelFile;

            let isoformData = new PrimaryData(file, this.selectedGene, species, (this.is_use_grch37 && (species === "Homo_sapiens")));

            this.modal.loading.show = true;
            await isoformData.parseFile();

            if (!isoformData.valid)
            {
                this.reset_loading_popup();
                this.$bvModal.msgBoxOk(isoformData.error);
                this.selectedGene = null;
                this.modal.uploadData.stackFile = null;
                return;
            }

            // If no particular gene was selected, then all genes from the file must have been read
            if (this.selectedGene == null)
                this.all_genes = isoformData.genes;

            this.filtered_genes = isoformData.genes;

            // Only one gene could be shown at a time, so ask the user to pick a gene if the stack data file contains multiple
            if (this.filtered_genes.length > 1)
            {
                this.reset_loading_popup();
                if (isoformData.is_genomeprot)
                {
                    this.geneNameInfo = isoformData.geneNameInfo;
                    this.gene_attributes = JSON.parse(JSON.stringify(isoformData.gene_attributes));
                    this.gene_name_attributes = JSON.parse(JSON.stringify(isoformData.gene_name_attributes));

                    this.all_gene_names = Object.keys(this.geneNameInfo);
                    // this.all_gene_names.sort((a, b) => a.localeCompare(b, "en", {sensitivity: "case"}));

                    // Load Unknome gene IDs and symbols
                    await this.getUnknomeGeneIDsAndSymbols(species);

                    // Disable search filters for genes that don't exist in the uploaded data
                    if ((this.unknome_gene_ids.length === 0) && (this.unknome_gene_symbols.length === 0))
                        this.no_unknome_filter = true;
                    else
                    {
                        this.gene_attributes["unknome_filter"] = this.mergeLists(this.gene_attributes["uniq_map_peptides"], this.unknome_gene_ids);
                        this.gene_name_attributes["unknome_filter"] = this.mergeLists(this.gene_name_attributes["uniq_map_peptides"], this.unknome_gene_symbols);

                        // this.gene_attributes["unknome_filter"].sort((a, b) => a.localeCompare(b, "en", {sensitivity: "case"}));
                        // this.gene_name_attributes["unknome_filter"].sort((a, b) => a.localeCompare(b, "en", {sensitivity: "case"}));
                    }

                    this.num_uniq_map_peptides = this.gene_attributes["uniq_map_peptides"].length;
                    this.num_unknome_filter = this.gene_attributes["unknome_filter"].length;
                    this.num_lncRNA_peptides = this.gene_attributes["lncRNA_peptides"].length;
                    this.num_novel_txs = this.gene_attributes["novel_txs"].length;
                    this.num_novel_txs_distinguished = this.gene_attributes["novel_txs_distinguished"].length;
                    this.num_unann_orfs = this.gene_attributes["unann_orfs"].length;
                    this.num_uorf_5 = this.gene_attributes["uorf_5"].length;
                    this.num_dorf_3 = this.gene_attributes["dorf_3"].length;
                    this.num_pseudogene = this.gene_attributes["pseudogene"].length;
                    this.num_marker = this.gene_attributes["marker"].length;

                    this.no_uniq_map_peptides = (this.num_uniq_map_peptides === 0) && (this.gene_name_attributes["uniq_map_peptides"].length === 0);
                    this.no_unknome_filter = (this.num_unknome_filter === 0) && (this.gene_name_attributes["unknome_filter"].length === 0);
                    this.no_lncRNA_peptides = (this.num_lncRNA_peptides === 0) && (this.gene_name_attributes["lncRNA_peptides"].length === 0);
                    this.no_novel_txs = (this.num_novel_txs === 0) && (this.gene_name_attributes["novel_txs"].length === 0);
                    this.no_novel_txs_distinguished = (this.num_novel_txs_distinguished === 0) && (this.gene_name_attributes["novel_txs_distinguished"].length === 0);
                    this.no_unann_orfs = (this.num_unann_orfs === 0) && (this.gene_name_attributes["unann_orfs"].length === 0);
                    this.no_uorf_5 = (this.num_uorf_5 === 0) && (this.gene_name_attributes["uorf_5"].length === 0);
                    this.no_dorf_3 = (this.num_dorf_3 === 0) && (this.gene_name_attributes["dorf_3"].length === 0);
                    this.no_pseudogene = (this.num_pseudogene === 0) && (this.gene_name_attributes["pseudogene"].length === 0);
                    this.no_marker = (this.num_marker === 0) && (this.gene_name_attributes["marker"].length === 0);

                    this.options = {};
                    this.buildGenomeProtDatalist();
                    this.clearGenomeProtGeneCacheAndOptions();

                    this.modal.selectGenomeProtGene.show = true;
                }
                else
                    this.modal.selectGene.show = true;
                return;
            }

            if (this.filtered_genes.length === 1)
                this.selectedGene = this.filtered_genes[0];
            else
            {
                this.reset_loading_popup();
                this.$bvModal.msgBoxOk("This error should not occur. Please report this issue to the issue tracker on the IsoVis GitHub repository.");
                return;
            }

            if (isoformData.warning)
                this.$bvModal.msgBoxOk(isoformData.warning);

            let transcript_ids_of_gene = Object.keys(isoformData.transcripts);

            let heatmapData = (hfile) ? new SecondaryData(hfile, this.selectedGene, transcript_ids_of_gene) : null;
            if (heatmapData)
            {
                await heatmapData.parseFile();
                this.reset_loading_popup();

                if (!heatmapData.valid)
                {
                    this.$bvModal.msgBoxOk(heatmapData.error);
                    this.selectedGene = null;
                    if (this.modal.heatmapUploadData.heatmapFile)
                        this.modal.heatmapUploadData.heatmapFile = null;
                    else
                        this.modal.uploadData.heatmapFile = null;
                    return;
                }
                else if (heatmapData.warning)
                    this.$bvModal.msgBoxOk(heatmapData.warning);

                // Add transcript ids to heatmap data
                heatmapData.transcriptOrder = JSON.parse(JSON.stringify(isoformData.transcriptOrder));
            }

            this.reset_loading_popup();
            let peptideData = (pfile && !(isoformData.is_genomeprot)) ? new PeptideData(pfile, transcript_ids_of_gene) : null;
            if (peptideData)
            {
                await peptideData.parseFile();

                if (!peptideData.valid)
                {
                    this.$bvModal.msgBoxOk(peptideData.error);
                    this.modal.uploadData.peptideFile = null;
                    return;
                }
                else if (peptideData.warning)
                    this.$bvModal.msgBoxOk(peptideData.warning);

                if (peptideData.no_peptides)
                    peptideData = null;
            }

            this.reset_loading_popup();
            // let peptides_of_gene = (peptideData && peptideData.peptides) ? peptideData.peptides : null;
            let peptides_of_gene = (peptideData && peptideData.peptides) ? peptideData.peptides : ((isoformData.peptides && (Object.keys(isoformData.peptides).length !== 0)) ? Object.keys(isoformData.peptides) : null);
            peptides_of_gene = JSON.parse(JSON.stringify(peptides_of_gene));
            if (peptides_of_gene)
                peptides_of_gene.sort();
            let peptideCountsData = (pcfile && peptides_of_gene && (peptides_of_gene.length !== 0)) ? new PeptideCountsData(pcfile, peptides_of_gene) : null;
            // let peptideCountsData = (pcfile && peptides_of_gene && (peptides_of_gene.length !== 0) && !(isoformData.is_genomeprot)) ? new PeptideCountsData(pcfile, peptides_of_gene) : null;
            if (peptideCountsData)
            {
                await peptideCountsData.parseFile();

                if (!peptideCountsData.valid)
                {
                    this.$bvModal.msgBoxOk(peptideCountsData.error);
                    this.modal.uploadData.peptideCountsFile = null;
                    return;
                }
                else if (peptideCountsData.warning)
                    this.$bvModal.msgBoxOk(peptideCountsData.warning);

                if (peptideCountsData.no_peptide_counts)
                    peptideCountsData = null;
            }

            this.reset_loading_popup();
            let rnaModifData = rna_modif_file ? new RNAModifSitesData(rna_modif_file, this.selectedGene) : null;
            if (rnaModifData)
            {
                await rnaModifData.parseFile();

                if (!rnaModifData.valid)
                {
                    this.$bvModal.msgBoxOk(rnaModifData.error);
                    this.modal.uploadData.rnaModifFile = null;
                    return;
                }
                else if (rnaModifData.warning)
                    this.$bvModal.msgBoxOk(rnaModifData.warning);

                if (rnaModifData.no_sites)
                    rnaModifData = null;
            }

            this.reset_loading_popup();
            let rna_modif_sites = (rnaModifData && rnaModifData.allSites) ? rnaModifData.allSites : null;
            let rnaModifLevelData = (rna_modif_level_file && rna_modif_sites && (rna_modif_sites.length !== 0)) ? new RNAModifSitesLevelData(rna_modif_level_file, this.selectedGene, rna_modif_sites) : null;
            if (rnaModifLevelData)
            {
                await rnaModifLevelData.parseFile();

                if (!rnaModifLevelData.valid)
                {
                    this.$bvModal.msgBoxOk(rnaModifLevelData.error);
                    this.modal.uploadData.rnaModifLevelFile = null;
                    return;
                }
                else if (rnaModifLevelData.warning)
                    this.$bvModal.msgBoxOk(rnaModifLevelData.warning);

                if (rnaModifLevelData.no_sites)
                    rnaModifLevelData = null;
            }

            if (this.is_changing_gene)
            {
                this.is_changing_gene = false;
                this.$refs.componentMain.abortFetches();
            }

            this.mainData = {isoformData:isoformData, heatmapData:heatmapData, peptideData:peptideData, peptideCountsData:peptideCountsData, rnaModifData:rnaModifData, rnaModifLevelData:rnaModifLevelData,
                             canonData:{}, demoData:false, selectedGene:this.selectedGene, species:species, is_use_grch37: (this.is_use_grch37 && (species === "Homo_sapiens"))};
            this.modal.uploadData.show = false;
            this.selectedView = 'Main';
        },

        async handleHeatmapFileUpload()
        {
            let hfile = this.modal.heatmapUploadData.heatmapFile;
            let transcript_ids_of_gene = Object.keys(this.mainData.isoformData.transcripts);
            let heatmapData = new SecondaryData(hfile, this.selectedGene, transcript_ids_of_gene);

            this.modal.loading.show = true;
            await heatmapData.parseFile();
            this.reset_loading_popup();

            if (!heatmapData.valid)
            {
                this.$bvModal.msgBoxOk(heatmapData.error);
                this.modal.heatmapUploadData.heatmapFile = null;
                return;
            }
            else if (heatmapData.warning)
            {
                this.$bvModal.msgBoxOk(heatmapData.warning);
            }

            heatmapData.transcriptOrder = JSON.parse(JSON.stringify(this.mainData.isoformData.transcriptOrder));
            this.mainData.heatmapData = JSON.parse(JSON.stringify(heatmapData));

            this.$refs.componentMain.addHeatmapData();
            this.modal.heatmapUploadData.show = false;
            this.selectedView = 'Main';
        },

        async getReleaseNotes()
        {
            let res = await fetch("/ReleaseNotes.json");
            res.json().then((data) => {
                this.releaseNotes = data;
                this.date = this.releaseNotes[0].date;
                this.versionNumber = this.releaseNotes[0].version;
            });
        },

        async getSpecies()
        {
            this.speciesToTaxId = await this.decompressGzippedJSON("/species.json.gz");
            this.ensemblSpeciesList = Object.keys(this.speciesToTaxId);
            this.ensemblSpeciesList.sort();
        },

        async getSpeciesToPrefix()
        {
            this.$refs.componentMain.species_to_prefix = await this.decompressGzippedJSON("/species_to_prefix.json.gz");
        },

        async getUnknomeGeneIDsAndSymbols(species)
        {
            let accepted_species = ["Homo_sapiens", "Mus_musculus", "Danio_rerio", "Drosophila_melanogaster"];
            if (accepted_species.indexOf(species) === -1)
            {
                this.unknome_gene_ids = [];
                this.unknome_gene_symbols = [];
                return;
            }

            this.unknome_gene_ids = await this.decompressGzippedJSON(`/unknome/gene_ids/${species}.json.gz`);
            this.unknome_gene_symbols = await this.decompressGzippedJSON(`/unknome/gene_symbols/${species}.json.gz`);
        },

        getYear()
        {
            let date = new Date();
            let year = date.getFullYear();
            return year;
        }
    },

    mounted()
    {
        this.getReleaseNotes();
        this.getSpecies();
        this.getSpeciesToPrefix();
        document.addEventListener("update_loading_msg", (e) => {
            let msg = e.detail;
            this.modal.loading.msg = msg;
        });
        document.addEventListener("update_loading_percentage", (e) => {
            let value = e.detail;
            this.modal.loading.value = value;
        });
        this.$root.$on('request_show_demo', () => {
            this.showDemo();
        });
        this.$root.$on('request_data_upload', () => {
            this.modal.uploadData.show = true;
        });
        this.$root.$on('request_heatmap_data_upload', () => {
            this.modal.heatmapUploadData.show = true;
        });
    }
}
</script>

<style>
a:hover {
    text-decoration: none;
}
</style>