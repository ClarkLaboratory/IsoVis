Component to render main set of visualizations in a 3x3 grid.
This component is itself made of other components which sit in some of these grid locations.
Requires mainData object which is used here to update the relevant data other components use.

<template>
<b-container fluid class="grid-container" style="background-color: white;">
    <b-form inline class="justify-content-center mt-3">
        <b-link v-if="is_gene_on_ensembl" :href="`https://ensembl.org/${species}/Gene/Summary?g=${mainData.selectedGene}`" target="_blank">
            <h3>{{ mainData.geneLabel ? `${mainData.geneLabel} (${mainData.selectedGene})` : mainData.selectedGene }}</h3>
        </b-link>
        <h3 v-else>{{ mainData.selectedGene }}</h3>

        <b-dropdown v-if="show_stack" data-htmltoimage-ignore="true" text="Stack options" size="sm" variant="dark" class="ml-3">
            <b-dropdown-item v-if="((canon_disabled || protein_disabled) || protein_ready) && show_stack" @click="togglenormalization()" v-b-tooltip.hover.right="'Toggle normalization of intron length in the isoform stack'">
                Intron normalization<b-icon-check v-if="baseAxis.isnormalized()" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="((canon_disabled || protein_disabled) || protein_ready) && show_stack" @click="toggleReadDirection()" v-b-tooltip.hover.right="'Switch the reading direction'">
                Ascending reading direction<b-icon-check v-if="baseAxis.isAscending()" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="!canon_disabled && show_stack" @click="setShowCanon(!show_canon)" v-b-tooltip.hover.right="'Display the canonical isoform for the selected gene (externally sourced)'">
                Canonical transcript<b-icon-check v-if="show_canon" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="!protein_disabled && protein_ready && show_stack" @click="setShowProtein(!show_protein)" v-b-tooltip.hover.right="'Display the domains and motifs of the canonical protein (externally sourced)'">
                Canonical protein<b-icon-check v-if="show_protein" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="!protein_disabled && protein_ready && show_stack" @click="setShowDomains(!show_domains)" v-b-tooltip.hover.right="'Display the mapping of protein domains to the canonical transcript (externally sourced)'">
                Protein domain mapping<b-icon-check v-if="show_domains" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="!protein_disabled && protein_ready && show_stack" @click="setShowMotifs(!show_motifs)" v-b-tooltip.hover.right="'Display the mapping of protein motifs to the canonical transcript (externally sourced)'">
                Protein motif mapping<b-icon-check v-if="show_motifs" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="orfs_ready && show_stack" @click="setShowOrfs(!show_orfs)" v-b-tooltip.hover.right="'Display known ORFs for known transcripts (externally sourced)'">
                Known ORFs<b-icon-check v-if="show_orfs" variant="success"></b-icon-check>
            </b-dropdown-item>
        </b-dropdown>

        <b-button data-htmltoimage-ignore="true" variant="primary" size="sm" class="ml-3" @click="setShowStack(!show_stack)">
            {{show_stack ? "Hide stack" : "Show stack"}}
        </b-button>
        <b-button v-show="mainData.heatmapData" data-htmltoimage-ignore="true" variant="primary" size="sm" class="ml-2" @click="setShowHeatmap(!show_heatmap)">
            {{show_heatmap ? "Hide heatmap" : "Show heatmap"}}
        </b-button>
        <b-dropdown data-htmltoimage-ignore="true" text="Export image as..." size="sm" variant="dark" class="ml-3">
            <b-dropdown-item @click="exportImage()">PNG</b-dropdown-item>
            <b-dropdown-item @click="exportImage('jpeg')">JPEG</b-dropdown-item>
            <b-dropdown-item @click="exportImage('svg')">SVG (beta)</b-dropdown-item>
        </b-dropdown>
    </b-form>

    <!-- Row 1: Protein information, protein & protein mapping, and nothing -->
    <b-row v-show="!protein_disabled && show_stack && show_protein" class="border-bottom row1">

        <!-- Column 1.1: Protein information -->
        <b-col class="col1 text-center" cols="3" style="white-space: nowrap; overflow: auto;">
            <!-- Display label -->
            <br>
            <span v-if="labels.uniprot != '' && labels.interpro_source_database != '' && labels.ensembl != ''">Protein: <b-link :href="`https://www.ebi.ac.uk/interpro/protein/${labels.interpro_source_database}/${labels.uniprot}/`" target="_blank">{{this.labels.uniprot}}</b-link> (<b-link :href="`https://ensembl.org/${species}/Transcript/Summary?db=core;p=${this.labels.ensembl}`" target="_blank">{{this.labels.ensembl}}</b-link>)</span>
            <span v-else-if="labels.uniprot != '' && labels.ensembl != ''">Protein: {{this.labels.uniprot}} (<b-link :href="`https://ensembl.org/${species}/Transcript/Summary?db=core;p=${this.labels.ensembl}`" target="_blank">{{this.labels.ensembl}}</b-link>)</span>
            <span v-else-if="labels.uniprot != ''">Protein: {{this.labels.uniprot}}</span>
            <span v-else>Protein: <b-spinner variant="dark" class="ml-1" type="grow" small></b-spinner></span>
            <br v-if="labels_ready">
            <!-- Links to external databases about the protein -->
            <b-link v-if="labels.uniprot != ''" :href="`https://www.uniprot.org/uniprot/${this.labels.uniprot}`" target="_blank">UniProt</b-link>,
            <b-link v-if="labels.uniparc != ''" :href="`https://www.uniprot.org/uniparc/${this.labels.uniparc}`" target="_blank">UniParc</b-link>
        </b-col>

        <!-- Column 1.2: Protein & protein mapping -->
        <b-col class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9" style="z-index: 2;">
            <Protein :proteinData="mainData.proteinData" :base-axis="baseAxis" ref="proteinComponent"></Protein>
        </b-col>

        <!-- Column 1.3: Nothing -->
        <b-col v-show="mainData.heatmapData && show_heatmap" class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

    <!-- Row 2: Canonical transcript information, canonical transcript track, and nothing -->
    <b-row v-show="!canon_disabled && show_stack && show_canon" class="border-bottom row2">

        <!-- Column 2.1: Canonical transcript information -->
        <b-col class="col1 text-center" cols="3" style="white-space: nowrap; overflow: auto;">
            <span>
            Canonical isoform: 
            <b-spinner v-if="showCanonLoading" variant="dark" class="ml-1" type="grow" small></b-spinner>
            <br>
            <b-link :href="`https://ensembl.org/${species}/Transcript/Summary?db=core;g=${this.mainData.selectedGene};t=${this.canonicalTranscript}`" target="_blank">
            {{ this.canonDisplay }}
            </b-link>
            </span>
        </b-col>

        <!-- Column 2.2: Canonical transcript track -->
        <b-col class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9">
            <CanonTrack :base-axis="baseAxis" :canon-data="mainData.canonData" ref="canonStackComponent" class="grid-item" style="margin-top: 0px; margin-bottom: 0px; padding-top: 0px; padding-bottom: 0px; padding-left: 1rem !important; padding-right: 1rem !important;"></CanonTrack>
        </b-col>

        <!-- Column 2.3: Nothing -->
        <b-col v-show="mainData.heatmapData && show_heatmap" class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

    <!-- Row 3: User isoforms label, nothing, and nothing-->
    <b-row class="row3">

        <!-- Column 3.1: User isoforms label -->
        <b-col class="col1 text-center" cols="3" style="white-space: nowrap; overflow: auto; padding-top: 5px; padding-bottom: 5px">
            <span>User isoforms:</span>
        </b-col>

        <!-- Column 3.2: Nothing -->
        <b-col class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9">
        </b-col>

        <!-- Column 3.3: Nothing -->
        <b-col v-show="mainData.heatmapData && show_heatmap" class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

    <!-- Row 4: Accession list, isoform stack, and heatmap -->
    <b-row class="border-bottom row4">

        <!-- Column 4.1: Accession list -->
        <b-col class="col1 grid-item mx-0 g-0" cols="3" style="text-align: center; white-space: nowrap; overflow: auto;">
            <draggable v-model="transcriptIds" @start="drag=true" @end="onEnd">
                <div v-for="transcriptId in transcriptIds" :key="transcriptId" :id="transcriptId" style="display: block; height: 51px; line-height: 51px; background-color: white;">
                    <!-- Delete button-->
                    <b-icon-x data-htmltoimage-ignore="true" v-if="(transcriptIds.length > 1) && transcript_names_ready" class="icon float-left" @click="removeIsoform(transcriptId);" style="display: block; height: 51px; line-height: 51px; cursor: pointer;"></b-icon-x>
                    <!-- Loading icon -->
                    <b-spinner data-htmltoimage-ignore="true" v-if="!transcript_names_ready" variant="dark" class="ml-1 float-left" type="grow" small></b-spinner>
                    <!-- Accession ID -->
                    <span v-if="transcriptNames[transcriptId] === 'Novel'" class="accessionText"><b-link :href="`https://ensembl.org/${species}/Transcript/Summary?db=core;g=${mainData.selectedGene};t=${transcriptId}`" target="_blank">{{transcriptId}}</b-link></span>
                    <span v-else-if="(transcriptNames[transcriptId] === 'Not found') || (!transcriptNames[transcriptId])" class="accessionText">{{transcriptId}}</span>
                    <span v-else class="accessionText"><b-link :href="`https://ensembl.org/${species}/Transcript/Summary?db=core;g=${mainData.selectedGene};t=${transcriptId}`" target="_blank">{{transcript_names_ready ? transcriptNames[transcriptId] + " (" + transcriptId + ')' : transcriptId}}</b-link></span>
                    <!-- Reorder icon -->
                    <b-icon-list data-htmltoimage-ignore="true" v-if="(mainData && mainData.isoformData && mainData.isoformData.transcriptOrder && (mainData.isoformData.transcriptOrder.length > 1)) && transcript_names_ready" class="icon float-right" style="display: block; height: 51px; line-height: 51px; cursor: pointer;"></b-icon-list>
                </div>
            </draggable>
            <b-icon-plus v-if="isoformList.length > 1" data-htmltoimage-ignore="true" @click="addClick" style="cursor: pointer;">+</b-icon-plus>
            <b-modal v-model="modal.addIsoform.show" size="md" title="Edit isoform list">
                <div class="border-top"></div>
                <div v-for="isoform in isoformList" :key="isoform" :style="inclusionStyle((includedIsoforms.indexOf(isoform) !== -1))" class="text-center border-bottom">
                    <!-- Delete button -->
                    <b-icon-x v-if="(includedIsoforms.length > 1) && (includedIsoforms.indexOf(isoform) !== -1)" @click="removeIsoform(isoform)" class="icon float-left" style="display: block; height: 32px; line-height: 32px; cursor: pointer;"></b-icon-x>
                    <!-- Add button -->
                    <b-icon-plus v-if="includedIsoforms.indexOf(isoform) === -1" @click="addIsoform(isoform)" class="icon float-left" style="display: block; height: 32px; line-height: 32px; cursor: pointer;"></b-icon-plus>
                    <!-- Accession ID -->
                    {{(transcriptNames[isoform] && (transcriptNames[isoform] !== "Novel") && (transcriptNames[isoform] !== "Not found")) ? `${transcriptNames[isoform]} (${isoform})` : isoform}}
                </div>
            </b-modal>
        </b-col>

        <!-- Column 4.2: Isoform stack -->
        <b-col v-show="show_stack" class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9">
            <IsoformStack :base-axis="baseAxis" :isoform-list="mainData.isoformData.isoformList" ref="isoformStackComponent" class="grid-item mx-0 g-0" style="padding-left: 1rem !important; padding-right: 1rem !important;"></IsoformStack>
        </b-col>

        <!-- Column 4.3: Heatmap -->
        <b-col v-show="mainData.heatmapData && show_heatmap" class="col3" :cols="show_stack ? 3 : 9">
            <Heatmap :heatmapData="mainData.heatmapData" ref="heatmapComponent" class="grid-item mx-0 g-0 align-self-center" style="padding-left: 1rem !important; padding-right: 1rem !important;"></Heatmap>
        </b-col>

    </b-row>

    <!-- Row 5: Logo, gene strand, and sample labels + heatmap legend -->
    <b-row class="row5">

        <!-- Column 5.1: Logo -->
        <b-col class="col1 grid-item p-3 mx-0 my-1 g-0" style="display: flex; align-items: center; justify-content: center;" cols="3">
            <b-img src="~/assets/logos/IsovisLogo.png" height="120px"></b-img>
        </b-col>

        <!-- Column 5.2: Gene strand -->
        <b-col v-show="show_stack" class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9">
            <GeneStrand :base-axis="baseAxis" :chromosome="mainData.isoformData.chromosome" ref="geneStrandComponent" class="grid-item p-3 mx-0 my-1 g-0"/>
        </b-col>

        <!-- Column 5.3: Sample labels + heatmap legend -->
        <b-col v-show="mainData.heatmapData && show_heatmap" class="col3" :cols="show_stack ? 3 : 9">
            <HeatmapLegend :heatmapData="mainData.heatmapData" ref="heatmapLegendComponent" class="grid-item p-3 mx-0 my-1 g-0 text-center"></HeatmapLegend>
        </b-col>

    </b-row>

    <!-- Row 6: Nothing, gene strand explanation, and log-transform button -->
    <b-row :data-htmltoimage-ignore="!logTransformChecked" class="row6">

        <!-- Column 6.1: Nothing -->
        <b-col class="col1" cols="3">
        </b-col>

        <!-- Column 6.2: Gene strand explanation -->
        <b-col v-show="show_stack" class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9" style="text-align: center">
            <b-link data-htmltoimage-ignore="true" href="help_gene_strand/" target="_blank">What is this diagram?</b-link>
        </b-col>

        <!-- Column 6.3: Log-transform button -->
        <b-col v-if="mainData.heatmapData && show_heatmap" class="col3" style="display: flex; justify-content: center;" :cols="show_stack ? 3 : 9">
            <b-form-checkbox data-htmltoimage-ignore="true" button size="sm" button-variant="outline-secondary" v-model="logTransformChecked" name="check-button"> 
                Transform: log<sub>10</sub>(x+1)
            </b-form-checkbox>
        </b-col>

    </b-row>

</b-container>
</template>

<script>
import { createBaseAxis } from '~/assets/base_axis';
import { CanonData, ProteinData, mergeRanges } from '~/assets/data_parser';
import * as htmltoimage from 'html-to-image';
import draggable from 'vuedraggable';
import { BButton, BCol, BContainer, BDropdown, BDropdownItem, BForm, BFormCheckbox, BIconCheck, BIconList, BIconPlus, BIconX, BImg, BLink, BModal, BRow, BSpinner, VBTooltip } from 'bootstrap-vue';

export default
{
    props: ["mainData"],

    components: {
        draggable,
        BButton,
        BCol,
        BContainer,
        BDropdown,
        BDropdownItem,
        BForm,
        BFormCheckbox,
        BIconCheck,
        BIconList,
        BIconPlus,
        BIconX,
        BImg,
        BLink,
        BModal,
        BRow,
        BSpinner
    },

    directives: {
        VBTooltip
    },

    data: () =>
    {
        return {
            baseAxis: {},
            modal: {
                addIsoform:
                {
                    show: false,
                }
            },

            show_protein: true,
            show_domains: true,
            show_motifs: true,
            show_orfs: false,
            show_canon: true,
            show_stack: true,
            show_heatmap: true,
            showCanonLoading: true,

            protein_disabled: false,
            canon_disabled: false,

            transcriptIds: [],
            transcriptNames: {},
            species_to_prefix: {},
            is_gene_on_ensembl: false,
            transcript_names_ready: false,
            orfs_ready: false,
            protein_ready: false,
            labels_ready: false,
            labels: {"ensembl": "", "uniprot": "", "uniparc": "", "interpro_source_database": ""},
            logTransformChecked: false,

            canondata_ranges: [],
            canondata_start: -1,
            canondata_end: -1,
            canondata_width: -1,

            zoom_start: -1,
            zoom_end: -1,
            is_zoom_changed: false,
            is_zoom_reset: true,

            is_demo_resize_done: false,
            is_dragging_done: false,
            is_stack_toggled: false,
            is_heatmap_toggled: false,

            controller: null,
            signal: null
        };
    },

    computed:
    {
        isoformList()
        {
            let data = [];
            if (this.mainData && this.mainData.isoformData && this.mainData.isoformData.allIsoforms)
            {
                for (let isoform of this.mainData.isoformData.allIsoforms)
                    data.push(isoform.transcriptID);
            }
            return data;
        },

        includedIsoforms()
        {
            let to_return = [];
            if (this.mainData && this.mainData.isoformData && this.mainData.isoformData.transcriptOrder)
                to_return = this.mainData.isoformData.transcriptOrder;
            return to_return;
        },

        species()
        {
            return this.mainData.species;
        },

        canonicalTranscript()
        {
            return this.mainData.canonData.isoformList? this.mainData.canonData.isoformList[0].transcriptID : '';
        },

        canonDisplay()
        {
            return this.mainData.canonData.display ? `${this.mainData.canonData.display} (${this.canonicalTranscript})` : this.canonicalTranscript;
        },

        canonStyle()
        {
            return (this.show_canon) ? "" : "display: none";
        }
    },

    methods: {
        abortFetches()
        {
            if (this.controller)
                this.controller.abort();
        },

        addHeatmapData()
        {
            this.setShowHeatmap(true);
            this.buildHeatmapComponent();
        },

        onEnd(evt)
        {
            let orig_isoformlist = JSON.parse(JSON.stringify(this.mainData.isoformData.isoformList));
            let new_isoformlist = [];
            for (let transcript_id of this.transcriptIds)
            {
                for (let i = 0; i < orig_isoformlist.length; ++i)
                {
                    let isoform = JSON.parse(JSON.stringify(orig_isoformlist[i]));
                    if (isoform.transcriptID === transcript_id)
                    {
                        new_isoformlist.push(isoform);
                        break;
                    }
                }
            }

            this.mainData.isoformData.transcriptOrder = JSON.parse(JSON.stringify(this.transcriptIds));
            this.mainData.isoformData.isoformList = JSON.parse(JSON.stringify(new_isoformlist));

            if (this.mainData.heatmapData && this.mainData.heatmapData.transcriptOrder)
                this.mainData.heatmapData.transcriptOrder = JSON.parse(JSON.stringify(this.transcriptIds));

            this.is_dragging_done = true;
        },

        inclusionStyle(state)
        {
            if (state)
                return "height: 32px; line-height: 32px;";
            return "height: 32px; line-height: 32px; background-color: rgb(255, 0, 0, 0.1);";
        },

        addClick()
        {
            this.modal.addIsoform.show = true;
        },

        exportImage(image_type = "png")
        {
            function filter (node)
            {
                try
                {
                    if (node.getAttribute("data-htmltoimage-ignore") == "true")
                        return false;
                    return true;
                }
                catch (error)
                {
                    return true;
                }
            }

            let height = document.querySelector(".grid-container").clientHeight;
            let row = document.querySelector(".row6");
            if (row.getAttribute("data-htmltoimage-ignore") != "true")
                height += row.clientHeight; // FIXME: If log transform is enabled, add the height of the bottom row to prevent the log-transform button in the image from cutting off 

            if (image_type == "png")
            {
                htmltoimage.toPng(document.querySelector(".grid-container"), { filter: filter, height: height }).then(data_url =>
                {
                    var link = document.createElement('a');
                    link.href = data_url;
                    link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}.png` : 'IsoVis.png';
                    link.click();
                });
            }
            else if (image_type == "jpeg")
            {
                htmltoimage.toJpeg(document.querySelector(".grid-container"), { filter: filter, height: height }).then(data_url =>
                {
                    var link = document.createElement('a');
                    link.href = data_url;
                    link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}.jpg` : 'IsoVis.jpg';
                    link.click();
                });
            }
            else if (image_type == "svg") // FIXME: Do more testing on the SVG image export function
            {
                htmltoimage.toSvg(document.querySelector(".grid-container"), { filter: filter, height: height }).then(data_url =>
                {
                    var link = document.createElement('a');
                    link.href = data_url;
                    link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}.svg` : 'IsoVis.svg';
                    link.click();
                });
            }
        },

        setBaseAxis()
        {
            let introns_normalized = (Object.keys(this.baseAxis).length != 0) ? this.baseAxis.isnormalized() : true;
            let is_ascending = (Object.keys(this.baseAxis).length != 0) ? this.baseAxis.isAscending() : true;

            let isoformData = JSON.parse(JSON.stringify(this.mainData.isoformData));
            let canonData = JSON.parse(JSON.stringify(this.mainData.canonData));
            this.transcriptIds = isoformData.transcriptOrder.map((item)=>item);

            let is_canon_loaded = (!(!canonData || Object.keys(canonData).length == 0));
            let is_zoomed = ((this.zoom_start !== -1) && (this.zoom_end !== -1));

            let start = (is_zoomed) ? this.zoom_start : ((is_canon_loaded) ? this.canondata_start : isoformData.start);
            let end = (is_zoomed) ? this.zoom_end : ((is_canon_loaded) ? this.canondata_end : isoformData.end);

            if (start > end)
            {
                let temp = start;
                start = end;
                end = temp;
            }

            let width = end - start;
            let strand = isoformData.strand;
            let mergedRanges = (is_canon_loaded) ? this.canondata_ranges : isoformData.mergedRanges;

            let new_baseaxis = createBaseAxis(width, start, end, strand, mergedRanges);

            // Do not use the newly calculated genomic coordinate axis if nothing would be shown in the zoomed range 
            if ((new_baseaxis.shrunkRange.length === 0) || (new_baseaxis.shrunkDomain.length === 0))
                return;

            this.zoom_start = start;
            this.zoom_end = end;
            this.baseAxis = new_baseaxis;

            if (!introns_normalized)
                this.baseAxis.togglenormalization();

            if (!is_ascending)
                this.baseAxis.reverse();

            this.resizePage();
        },

        resetZoom()
        {
            this.zoom_start = -1;
            this.zoom_end = -1;
            this.setBaseAxis();
        },

        setZoom(zoom_start, zoom_end)
        {
            if (!((zoom_start === -1) || (zoom_end === -1) || (zoom_start == zoom_end)))
            {
                this.zoom_start = zoom_start;
                this.zoom_end = zoom_end;
            }

            this.setBaseAxis();
        },

        // Calculate the metagene ranges from both the uploaded isoform stack data and the downloaded canonical transcript data, and set the base axis accordingly.
        calculate_canon_mergedranges()
        {
            let canon_isoform_list = JSON.parse(JSON.stringify(this.mainData.canonData.isoformList));
            let stack_isoform_list = JSON.parse(JSON.stringify(this.mainData.isoformData.isoformList));
            let isoform_list = canon_isoform_list.concat(stack_isoform_list);
            
            this.canondata_ranges = mergeRanges(isoform_list);
            this.canondata_start = this.mainData.isoformData.strand == '+' ? Math.min(this.mainData.isoformData.start, this.mainData.canonData.start) :
                Math.max(this.mainData.isoformData.start, this.mainData.canonData.start);
            this.canondata_end = this.mainData.isoformData.strand == '+' ? Math.max(this.mainData.isoformData.end, this.mainData.canonData.end) :
                Math.min(this.mainData.isoformData.end, this.mainData.canonData.end);
            this.canondata_width = Math.abs(this.canondata_end - this.canondata_start);

            this.zoom_start = this.canondata_start;
            this.zoom_end = this.canondata_end;
            this.is_zoom_reset = true;
            this.setBaseAxis();
        },

        buildProteinComponent()
        {
            this.$refs.proteinComponent.buildProtein();
            this.$refs.proteinComponent.buildProteinMap();
        },

        buildHeatmapComponent()
        {
            this.$refs.heatmapComponent.buildHeatmap();
            this.$refs.heatmapLegendComponent.buildHeatmapLegend();
        },

        togglenormalization()
        {
            this.baseAxis.togglenormalization();
            this.$refs.isoformStackComponent.buildStack();
            if (!this.canon_disabled)
                this.$refs.canonStackComponent.buildStack();
            this.$refs.geneStrandComponent.buildStrand();
            if (!this.protein_disabled)
                this.buildProteinComponent();
        },

        toggleReadDirection()
        {
            this.baseAxis.reverse();
            this.$refs.isoformStackComponent.buildStack();
            if (!this.canon_disabled)
                this.$refs.canonStackComponent.buildStack();
            this.$refs.geneStrandComponent.buildStrand();
            if (!this.protein_disabled)
            {
                this.mainData.proteinData.reversed = !this.mainData.proteinData.reversed;
                this.buildProteinComponent();
            }
        },

        setShowDomains(state)
        {
            this.show_domains = state;
            this.$refs.proteinComponent.show_domains = state;
            if (state == true && this.show_protein == false)
                this.setShowProtein(true);
        },

        setShowMotifs(state)
        {
            this.show_motifs = state;
            this.$refs.proteinComponent.show_motifs = state;
            if (state == true && this.show_protein == false)
                this.setShowProtein(true);
        },

        setShowProtein(state)
        {
            this.show_protein = state;
            if (state == true && this.show_canon == false)
                this.setShowCanon(true);
            this.resizePage();
        },

        setShowCanon(state)
        {
            this.show_canon = state;
            if (state == false)
                this.setShowProtein(false);
            this.is_zoom_changed = true;
            this.setBaseAxis();
        },

        setShowStack(state)
        {
            this.show_stack = state;
            this.is_stack_toggled = true;
        },
        
        setShowHeatmap(state)
        {
            this.show_heatmap = state;
            this.is_heatmap_toggled = true;
        },

        setShowOrfs(state)
        {
            this.show_orfs = state;
            
            this.$refs.isoformStackComponent.show_orfs = state;

            if (!this.canon_disabled)
                this.$refs.canonStackComponent.show_orfs = state;

            this.resizePage();
        },

        toggleLogTransform()
        {
            this.$refs.heatmapComponent.logTransform = !this.$refs.heatmapComponent.logTransform;
            this.$refs.heatmapLegendComponent.logTransform = !this.$refs.heatmapLegendComponent.logTransform;
        },

        /**
         * Fetch a JSON object from a URL.
         * @param {string} url URL
         * @returns {Object} The JSON object
         */
        async fetchJSON(url)
        {
            let response = await fetch(url, { signal: this.signal }).then(
                res => res.json()
            ).catch(err =>
            {
                console.log("Error fetching JSON from", url);
                console.log(err);
            });
            return response;
        },

        /**
         * Check if a gene ID is linked to Ensembl.
         * @param {*} gene_id The gene ID.
         */
        async isGeneOnEnsembl(gene_id)
        {
            let url = `https://rest.ensembl.org/lookup/id/${gene_id}?species=${this.species}&content-type=application/json`;
            let response = await this.fetchJSON(url);
            this.is_gene_on_ensembl = (response && !response.error);
        },

        /**
         * Fetch transcript names from Ensembl.
         */
         async getTranscriptNames()
         {
            let prefix = this.species_to_prefix[this.species];
            for (let transcript_id of this.transcriptIds)
            {
                // Don't try to fetch names for transcripts that we've already found a name for
                if (this.transcriptNames[transcript_id] != null)
                    continue;

                // For species that do have a stable ID prefix, only fetch names for transcripts that have a matching prefix.
                // For species that don't have a stable ID prefix, fetch the names of all transcripts being visualized.
                if (prefix && (transcript_id.toUpperCase().indexOf(prefix) !== 0))
                    continue;

                let transcript_name = "";

                let url = `https://rest.ensembl.org/lookup/id/${transcript_id}?species=${this.species}&content-type=application/json`;
                let response = await this.fetchJSON(url);
                if (response)
                {
                    if (response.display_name)
                        transcript_name = response.display_name;
                    else if (response.error)
                        transcript_name = "Not found";  // The transcript either doesn't exist or is retired, such as ENST00000613795
                    else                                // The transcript does exist but it's novel
                        transcript_name = "Novel";
                }

                this.transcriptNames[transcript_id] = transcript_name;
            }
            this.transcript_names_ready = true;
        },

        /**
         * Fetch canonical transcript data from Ensembl.
         * @param {string} gene_id Ensembl gene ID from the stack file
         * @returns {Array<>} An array containing 2 elements:
         * 1. A JSON object containing the canonical transcript data, and
         * 2. The Ensembl ID of the canonical transcript
         */
        async getCanonData(gene_id)
        {
            this.showCanonLoading = true;
            let canon_data = {};
            let canon_id = "";

            let url = `https://rest.ensembl.org/lookup/id/${gene_id}?species=${this.species}&content-type=application/json`;
            let response = await this.fetchJSON(url);
            if (response && !response.error && response.canonical_transcript)
            {
                if (response.display_name)
                    this.mainData.geneLabel = response.display_name;

                canon_id = response.canonical_transcript;
                canon_id = canon_id.substring(0, canon_id.indexOf('.'));

                url = `https://rest.ensembl.org/lookup/id/${canon_id}?species=${this.species}&expand=1;content-type=application/json`;
                let transcript = await this.fetchJSON(url);
                if (transcript && transcript.Exon)
                {
                    canon_data = new CanonData(transcript);
                }
            }

            this.showCanonLoading = false;
            return [canon_data, canon_id];
        },

        /**
         * Fetch the open reading frames (ORFs) of each transcript with an Ensembl ID.
         * This would later call updateORFs(ORFs), which updates isoformData.isoformList and canonData.isoformList with the fetched ORFs.
         */
        async getORFs()
        {
            let ORFs = {};
            let isoforms = this.mainData.isoformData.isoformList;

            if (!isoforms)
                return;

            let prefix = this.species_to_prefix[this.species];
            isoforms = isoforms.concat(this.mainData.canonData.isoformList);
            for (let isoform of isoforms)
            {
                if (!isoform || !isoform.transcriptID)
                    continue;

                let transcript_id = isoform.transcriptID;

                // For species that do have a stable ID prefix, only fetch ORFs for transcripts that have a matching prefix.
                // For species that don't have a stable ID prefix, fetch the ORFs of all transcripts being visualized.
                if (prefix && (transcript_id.toUpperCase().indexOf(prefix) !== 0))
                    continue;

                let url = `https://rest.ensembl.org/map/cds/${isoform.transcriptID}/1..${isoform.length}?species=${this.species}&content-type=application/json`;
                let response = await this.fetchJSON(url);
                if (response)
                {
                    let ORFExons = [];
                    for (let entry of response.mappings)
                    {
                        ORFExons.push([entry.start, entry.end]);
                    }
                    ORFs[isoform.transcriptID] = ORFExons;
                }
            }

            this.updateORFs(ORFs);
        },

        /**
         * Update isoformData.isoformList and canonData.isoformList with the fetched ORFs.
         * @param {object} ORFs A dictionary listing the ORFs of each transcript with an Ensembl ID
         */
        updateORFs(ORFs)
        {
            if (this.mainData.isoformData && this.mainData.isoformData.isoformList)
            {
                for (var isoform of this.mainData.isoformData.isoformList)
                {
                    if (!isoform || !isoform.transcriptID)
                        continue;

                    if (isoform.transcriptID in ORFs)
                    {
                        isoform.orf = ORFs[isoform.transcriptID];
                    }
                }
            }
            

            if (Object.keys(this.mainData.canonData).length != 0 && this.mainData.canonData.isoformList)
            {
                for (var isoform of this.mainData.canonData.isoformList)
                {
                    if (isoform.transcriptID in ORFs)
                    {
                        isoform.orf = ORFs[isoform.transcriptID];
                        this.mainData.canonData.orf = ORFs[isoform.transcriptID];
                    }
                }
            }

            this.orfs_ready = true;
        },

        /**
         * Fetch the UniProt, UniParc and Ensembl labels of the canonical transcript.
         * @param {string} canon_id Ensembl ID of the canonical transcript
         */
        async getLabels(canon_id)
        {
            let url = `https://rest.ensembl.org/xrefs/id/${canon_id}?species=${this.species}&all_levels=1;content-type=application/json`;
            let response = await this.fetchJSON(url);

            if ((!response) || (response.error))
                return;

            for (let item of response)
            {
                if (item.dbname === "Uniprot/SWISSPROT" && item.db_display_name === "UniProtKB/Swiss-Prot")
                    this.labels["uniprot"] = item.primary_id;
                else if (item.dbname === "UniParc" && item.db_display_name === "UniParc")
                    this.labels["uniparc"] = item.primary_id;
            }

            if (!this.labels["uniprot"])
            {
                for (let item of response)
                {
                    if (item.dbname === "Uniprot/SPTREMBL" && item.db_display_name === "UniProtKB/TrEMBL")
                        this.labels["uniprot"] = item.primary_id;
                }
            }

            url = `https://rest.ensembl.org/lookup/id/${canon_id}?species=${this.species}&expand=1;content-type=application/json`;
            response = await this.fetchJSON(url);
            if (response && response.Translation && response.Translation.id)
                this.labels["ensembl"] = response.Translation.id;

            this.labels_ready = true;
        },

        /**
         * Fetch the InterPro protein accession from Ensembl.
         * @param {string} canon_id Ensembl ID of the canonical transcript
         * @returns {string} The InterPro protein accession
         */
        async getAccession(canon_id)
        {
            let accession = "";

            let url = `https://rest.ensembl.org/xrefs/id/${canon_id}?species=${this.species}&all_levels=1;content-type=application/json`;
            let response = await this.fetchJSON(url);

            if ((!response) || (response.error))
                return "";

            for (let item of response)
            {
                if (item.dbname === "Uniprot/SWISSPROT" && item.db_display_name === "UniProtKB/Swiss-Prot")
                {
                    accession = item.primary_id;
                    break;
                }
            }

            if (!accession)
            {
                for (let item of response)
                {
                    if (item.dbname === "Uniprot/SPTREMBL" && item.db_display_name === "UniProtKB/TrEMBL")
                    {
                        accession = item.primary_id;
                        break;
                    }
                }
            }

            return accession;
        },

        /**
         * Fetch the source database of an InterPro protein accession..
         * @param {string} accession InterPro protein accession
         */
         async getInterProSourceDB(accession)
        {
            let url = `https://www.ebi.ac.uk/interpro/api/protein/UniProt/${accession}/?format=json`;
            let response = await this.fetchJSON(url);
            if (response && response.metadata && response.metadata.source_database)
                this.labels.interpro_source_database = response.metadata.source_database;
        },

        /**
         * Fetch the protein data from InterPro.
         * @param {string} accession InterPro protein accession
         * @returns {ProteinData} The protein data
         */
        async getProteinData(accession, canon_data)
        {
            let metadata_url = `https://www.ebi.ac.uk/interpro/api/protein/UniProt/${accession}/?format=json`;
            let features_url = `https://www.ebi.ac.uk/interpro/api/protein/UniProt/${accession}/?extra_features&format=json`;
            let domains_url = `https://www.ebi.ac.uk/interpro/api/entry/all/protein/UniProt/${accession}/?format=json`;

            let metadata_json = await this.fetchJSON(metadata_url);
            let features_json = await this.fetchJSON(features_url);
            let domains_json = await this.fetchJSON(domains_url);

            // If the InterPro entry for the protein accession does not exist, these JSON objects would be undefined
            if (metadata_json && features_json && domains_json)
                return new ProteinData([metadata_json, features_json, domains_json], accession, canon_data);

            return undefined;
        },

        /**
         * Add an isoform with a particular transcript ID to the visualized data.
         * @param {string} transcript_id Transcript ID
         */
        addIsoform(transcript_id)
        {
            for (let isoform of this.mainData.isoformData.allIsoforms)
            {
                if (isoform.transcriptID === transcript_id)
                {
                    this.mainData.isoformData.isoformList.push(isoform);
                    break;
                }
            }

            if (this.mainData.heatmapData && this.mainData.heatmapData.transcriptOrder)
                this.mainData.heatmapData.transcriptOrder.push(transcript_id);

            this.mainData.isoformData.transcriptOrder.push(transcript_id);
            this.transcriptIds.push(transcript_id);

            this.resizePage();
        },

        /**
         * Remove an isoform with a particular transcript ID from the visualized data.
         * @param {string} transcript_id Transcript ID
         */
        removeIsoform(transcript_id)
        {
            for (let i = 0; i < this.mainData.isoformData.isoformList.length; ++i)
            {
                if (this.mainData.isoformData.isoformList[i].transcriptID == transcript_id)
                {
                    this.mainData.isoformData.isoformList.splice(i, 1);
                    this.mainData.isoformData.transcriptOrder.splice(i, 1);
                }
            }

            if (this.mainData.heatmapData && this.mainData.heatmapData.transcriptOrder)
            {
                let index = this.mainData.heatmapData.transcriptOrder.indexOf(transcript_id);
                if (index !== -1)
                    this.mainData.heatmapData.transcriptOrder.splice(index, 1);
            }

            this.transcriptIds.splice(this.transcriptIds.indexOf(transcript_id), 1);

            this.resizePage();
        },

        resizePage()
        {
            if (this.show_stack)
            {
                this.$refs.isoformStackComponent.buildStack();
                this.$refs.canonStackComponent.buildStack();
                this.$refs.geneStrandComponent.buildStrand();
                this.buildProteinComponent();
            }

            if (this.mainData.heatmapData && this.show_heatmap)
                this.buildHeatmapComponent();
        }
    },

    updated()
    {
        // Ensures that the protein mappings are displayed in the correct widths when the demo data's first loaded
        if (!this.is_demo_resize_done)
        {
            this.resizePage();
            this.is_demo_resize_done = true;
        }

        if (this.is_stack_toggled || this.is_heatmap_toggled)
        {
            this.is_stack_toggled = false;
            this.is_heatmap_toggled = false;
            this.resizePage();
        }

        if (this.is_dragging_done)
        {
            this.is_dragging_done = false;

            if (this.show_stack)
                this.$refs.isoformStackComponent.buildStack();

            if (this.show_heatmap)
                this.$refs.heatmapComponent.buildHeatmap();
        }

        if (this.is_zoom_changed)
        {
            this.is_zoom_changed = false;
            this.resizePage();
        }
    },

    mounted()
    {
        this.$root.$on("set_zoom", ([zoom_start, zoom_end]) =>
        {
            this.is_zoom_changed = true;
            this.is_zoom_reset = false;
            this.setZoom(zoom_start, zoom_end);
        });

        this.$root.$on("reset_zoom", () =>
        {
            this.is_zoom_changed = true;
            this.is_zoom_reset = true;
            this.resetZoom();
        });
    },

    unmounted()
    {
        window.removeEventListener("resize", this.resizePage);
    },

    watch:
    {
        mainData: function()
        {
            if (this.mainData.init === false)
                return;

            window.addEventListener("resize", this.resizePage);

            this.show_stack = true;
            this.show_heatmap = true;
            this.is_stack_toggled = false;
            this.is_heatmap_toggled = false;
            this.is_demo_resize_done = (!this.mainData.demoData ? true : false);
            this.showCanonLoading = true;

            this.transcriptNames = {};
            this.transcriptIds = [];            

            this.is_gene_on_ensembl = false;
            this.transcript_names_ready = false;
            this.labels_ready = false;
            this.orfs_ready = false;
            this.protein_ready = false;
            this.logTransformChecked = false;
            this.labels = {"ensembl": "", "uniprot": "", "uniparc": "", "interpro_source_database": ""};

            this.protein_disabled = false;
            this.canon_disabled = false;

            this.controller = new AbortController();
            this.signal = this.controller.signal;

            this.baseAxis = {};
            this.zoom_start = this.mainData.isoformData.start;
            this.zoom_end = this.mainData.isoformData.end;
            this.is_zoom_changed = false;
            this.is_zoom_reset = true;
            this.setBaseAxis();

            if (!this.mainData.demoData)
                this.getTranscriptNames().then();
            this.buildHeatmapComponent();

            this.setShowOrfs(false);
            this.setShowDomains(true);
            this.setShowMotifs(true);

            this.resizePage();

            if (!this.mainData.demoData)
            {
                let gene_id = this.mainData.selectedGene;
                this.isGeneOnEnsembl(gene_id).then();
                this.getCanonData(gene_id).then(([canon_data, canon_id]) =>
                {
                    if (Object.keys(canon_data).length != 0)
                    {
                        this.mainData.canonData = canon_data;
                        this.calculate_canon_mergedranges();

                        // Ensures that both the displayed canonical isoform width and the protein diagram width match the stack's
                        this.resizePage();
                    }
                    else
                    {
                        this.canon_disabled = true;
                    }

                    if (canon_id != "")
                        this.getLabels(canon_id).then();

                    this.getORFs().then(() =>
                    {
                        if (canon_id != "")
                        {
                            this.getAccession(canon_id).then((accession) =>
                            {
                                if (accession != "")
                                {
                                    this.getInterProSourceDB(accession).then();
                                    this.getProteinData(accession, this.mainData.canonData).then((protein_data) =>
                                    {
                                        if (!protein_data)
                                        {
                                            this.mainData.proteinData = new Object();
                                            this.mainData.proteinData.gone = true;
                                        }
                                        else
                                            this.mainData.proteinData = JSON.parse(JSON.stringify(protein_data));

                                        this.protein_ready = true;
                                        this.resizePage();
                                    });
                                }
                                else
                                    this.protein_disabled = true;
                            });
                        }
                        else
                            this.protein_disabled = true;
                    });
                });
            }
            else
            {
                this.is_gene_on_ensembl = true;
                this.showCanonLoading = false;
                this.calculate_canon_mergedranges();
                this.orfs_ready = true;
                this.protein_ready = true;
                this.transcriptNames = {"ENST00000375793": "PLEKHM2-201", "ENST00000375799": "PLEKHM2-202"};
                this.transcript_names_ready = true;
                this.labels.ensembl = "ENSP00000364956";
                this.labels.uniprot = "Q8IWE5";
                this.labels.uniparc = "UPI00001C1D9C";
                this.labels.interpro_source_database = "reviewed";
                this.labels_ready = true;
            }
        },

        logTransformChecked()
        {
            this.toggleLogTransform();
        }
    }
}
</script>