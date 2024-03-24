/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

Component to render main set of visualizations in a 3x3 grid.
This component is itself made of other components which sit in some of these grid locations.
Requires mainData object which is used here to update the relevant data other components use.

<template>
<b-container fluid class="grid-container" style="background-color: white;">
    <b-form inline class="justify-content-center mt-3">
        <b-link v-if="is_gene_on_ensembl" :href="`https://${is_use_grch37 ? 'grch37.' : ''}ensembl.org/${species}/Gene/Summary?g=${mainData.selectedGene}`" target="_blank">
            <h3>{{ mainData.geneLabel ? `${mainData.geneLabel} (${mainData.selectedGene})` : mainData.selectedGene }}</h3>
        </b-link>
        <h3 v-else>{{ mainData.selectedGene }}</h3>
    </b-form>

    <b-form inline class="justify-content-center mb-3">
        <b-dropdown v-if="show_stack" text="Stack options" class="mr-3" size="sm" variant="dark">
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
            <b-dropdown-item v-if="!protein_disabled && protein_ready && show_stack" @click="setShowDomainLabels(!show_protein_labels)" v-b-tooltip.hover.right="'Display the labels of shown protein domains (externally sourced)'">
                Protein domain labels (beta)<b-icon-check v-if="show_protein_labels" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="orfs_ready && !no_orfs && show_stack" @click="setShowOrfs(!show_orfs)" v-b-tooltip.hover.right="'Display known ORFs for known transcripts (externally sourced)'">
                Known ORFs<b-icon-check v-if="show_orfs" variant="success"></b-icon-check>
            </b-dropdown-item>
        </b-dropdown>
        <b-button variant="primary" size="sm" @click="setShowStack(!show_stack)">
            {{show_stack ? "Hide stack" : "Show stack"}}
        </b-button>
        <b-button v-show="!mainData.heatmapData" variant="warning" size="sm" class="ml-2" @click="requestHeatmapDataUpload()">
            Add a heatmap
        </b-button>
        <b-button v-show="mainData.heatmapData" variant="primary" size="sm" class="ml-2" @click="setShowHeatmap(!show_heatmap)">
            {{show_heatmap ? "Hide heatmap" : "Show heatmap"}}
        </b-button>
        <b-dropdown v-if="((canon_disabled || protein_disabled) || protein_ready) && (show_stack || (mainData.heatmapData && show_heatmap))" text="Export page as..." size="sm" variant="dark" class="ml-3">
            <b-dropdown-item @click="exportPNG()">PNG</b-dropdown-item>
            <b-dropdown-item @click="exportJPEG()">JPEG</b-dropdown-item>
            <b-dropdown-item @click="exportSVG()">SVG</b-dropdown-item>
            <b-dropdown-item @click="exportPDF()">PDF</b-dropdown-item>
            <b-dropdown-item disabled>Export individual components...</b-dropdown-item>
            <b-dropdown-item v-if="!protein_disabled && protein_ready && show_canon && show_stack && show_protein && show_protein_labels" @click="exportProteinLabelsSVG()">Protein labels SVG</b-dropdown-item>
            <b-dropdown-item v-if="!protein_disabled && protein_ready && show_canon && show_stack && show_protein" @click="exportProteinSVG()">Protein diagram SVG</b-dropdown-item>
            <b-dropdown-item v-if="!protein_disabled && protein_ready && show_canon && show_stack && show_protein && (show_domains || show_motifs)" @click="exportProteinMapSVG()">Protein domain and motif mappings SVG</b-dropdown-item>
            <b-dropdown-item v-if="!canon_disabled && (mainData.canonData && (Object.keys(mainData.canonData).length !== 0)) && show_canon && show_stack" @click="exportCanonTrackSVG()">Canonical isoform SVG</b-dropdown-item>
            <b-dropdown-item v-if="show_stack" @click="exportStackSVG()">Isoform stack SVG</b-dropdown-item>
            <b-dropdown-item v-if="show_stack" @click="exportStrandSVG()">Gene strand SVG</b-dropdown-item>
            <b-dropdown-item v-if="mainData.heatmapData && show_heatmap" @click="exportHeatmapSVG()">Heatmap SVG</b-dropdown-item>
            <b-dropdown-item v-if="mainData.heatmapData && show_heatmap" @click="exportHeatmapLegendSVG()">Heatmap legend SVG</b-dropdown-item>
        </b-dropdown>
    </b-form>

    <!-- Row 1: Nothing, protein domain labels, and nothing -->
    <b-row v-show="!protein_disabled && show_stack && show_protein && show_protein_labels" class="row1">

        <!-- Column 1.1: Nothing -->
        <b-col class="col1 text-center" cols="3">
        </b-col>

        <!-- Column 1.2: Protein domain labels -->
        <b-col class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9">
            <ProteinLabels :proteinData="mainData.proteinData" :base-axis="baseAxis" ref="proteinLabelsComponent"></ProteinLabels>
        </b-col>

        <!-- Column 1.3: Nothing -->
        <b-col v-show="mainData.heatmapData && show_heatmap" class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

    <!-- Row 2: Protein information, protein & protein mapping, and nothing -->
    <b-row v-show="!protein_disabled && show_stack && show_protein" class="border-bottom row2">

        <!-- Column 2.1: Protein information -->
        <b-col class="col1 text-center" cols="3" style="white-space: nowrap; overflow: auto;">
            <span v-if="labels.interpro_source_database != '' && labels.uniprot != '' && labels.ensembl != '' && labels.uniparc != ''"><b-link :href="`https://${is_use_grch37 ? 'grch37.' : ''}ensembl.org/${species}/Transcript/Summary?db=core;p=${this.labels.ensembl}`" target="_blank">Protein</b-link>: <b-link :href="`https://www.ebi.ac.uk/interpro/protein/${labels.interpro_source_database}/${labels.uniprot}/`" target="_blank">InterPro</b-link>, <b-link :href="`https://www.uniprot.org/uniprot/${this.labels.uniprot}`" target="_blank">UniProt</b-link>, <b-link :href="`https://www.uniprot.org/uniparc/${this.labels.uniparc}`" target="_blank">UniParc</b-link></span>
            <span v-else-if="labels.interpro_source_database != '' && labels.uniprot != '' && labels.ensembl != ''"><b-link :href="`https://${is_use_grch37 ? 'grch37.' : ''}ensembl.org/${species}/Transcript/Summary?db=core;p=${this.labels.ensembl}`" target="_blank">Protein</b-link>: <b-link :href="`https://www.ebi.ac.uk/interpro/protein/${labels.interpro_source_database}/${labels.uniprot}/`" target="_blank">InterPro</b-link>, <b-link :href="`https://www.uniprot.org/uniprot/${this.labels.uniprot}`" target="_blank">UniProt</b-link></span>
            <span v-else-if="labels.interpro_source_database != '' && labels.uniprot != '' && labels.uniparc != ''">Protein: <b-link :href="`https://www.ebi.ac.uk/interpro/protein/${labels.interpro_source_database}/${labels.uniprot}/`" target="_blank">InterPro</b-link>, <b-link :href="`https://www.uniprot.org/uniprot/${this.labels.uniprot}`" target="_blank">UniProt</b-link>, <b-link :href="`https://www.uniprot.org/uniparc/${this.labels.uniparc}`" target="_blank">UniParc</b-link></span>
            <span v-else-if="labels.interpro_source_database != '' && labels.uniprot != ''">Protein: <b-link :href="`https://www.ebi.ac.uk/interpro/protein/${labels.interpro_source_database}/${labels.uniprot}/`" target="_blank">InterPro</b-link>, <b-link :href="`https://www.uniprot.org/uniprot/${this.labels.uniprot}`" target="_blank">UniProt</b-link></span>
            <span v-else-if="labels.ensembl != '' && labels.uniprot != '' && labels.uniparc != ''"><b-link :href="`https://${is_use_grch37 ? 'grch37.' : ''}ensembl.org/${species}/Transcript/Summary?db=core;p=${this.labels.ensembl}`" target="_blank">Protein</b-link>: <b-link :href="`https://www.uniprot.org/uniprot/${this.labels.uniprot}`" target="_blank">UniProt</b-link>, <b-link :href="`https://www.uniprot.org/uniparc/${this.labels.uniparc}`" target="_blank">UniParc</b-link></span>
            <span v-else-if="labels.ensembl != '' && labels.uniprot != ''"><b-link :href="`https://${is_use_grch37 ? 'grch37.' : ''}ensembl.org/${species}/Transcript/Summary?db=core;p=${this.labels.ensembl}`" target="_blank">Protein</b-link>: <b-link :href="`https://www.uniprot.org/uniprot/${this.labels.uniprot}`" target="_blank">UniProt</b-link></span>
            <span v-else-if="labels.ensembl != '' && labels.uniparc != ''"><b-link :href="`https://${is_use_grch37 ? 'grch37.' : ''}ensembl.org/${species}/Transcript/Summary?db=core;p=${this.labels.ensembl}`" target="_blank">Protein</b-link>: <b-link :href="`https://www.uniprot.org/uniparc/${this.labels.uniparc}`" target="_blank">UniParc</b-link></span>
            <span v-else-if="labels.uniprot != '' && labels.uniparc != ''">Protein: <b-link :href="`https://www.uniprot.org/uniprot/${this.labels.uniprot}`" target="_blank">UniProt</b-link>, <b-link :href="`https://www.uniprot.org/uniparc/${this.labels.uniparc}`" target="_blank">UniParc</b-link></span>
            <span v-else-if="labels.ensembl != ''"><b-link :href="`https://${is_use_grch37 ? 'grch37.' : ''}ensembl.org/${species}/Transcript/Summary?db=core;p=${this.labels.ensembl}`" target="_blank">Protein</b-link></span>
            <span v-else-if="labels.uniprot != ''">Protein: <b-link :href="`https://www.uniprot.org/uniprot/${this.labels.uniprot}`" target="_blank">UniProt</b-link></span>
            <span v-else-if="labels.uniparc != ''">Protein: <b-link :href="`https://www.uniprot.org/uniparc/${this.labels.uniparc}`" target="_blank">UniParc</b-link></span>
            <span v-else>Protein:</span>
            <span v-if="!labels_ready"> <b-spinner variant="dark" class="ml-1" type="grow" small></b-spinner></span>
            <br>
            <span><b-img style="width: 16px; height: 16px; background-color: #4a1c83; display: inline-block; border: 0; border-style: none; border-radius: 16px; overflow: visible; vertical-align: -0.15em;"></b-img> PFAM domain, <b-img style="width: 16px; height: 16px; background-color: #c3a685; display: inline-block; border: 0; border-style: none; overflow: visible; vertical-align: -0.15em;"></b-img> Signal peptide</span><br>
            <span><b-img style="width: 16px; height: 16px; background-color: #bbe8be; display: inline-block; border: 0; border-style: none; overflow: visible; vertical-align: -0.15em;"></b-img> Disordered region, <b-img style="width: 16px; height: 16px; background-color: #d0cfee; display: inline-block; border: 0; border-style: none; overflow: visible; vertical-align: -0.15em;"></b-img> Coil</span>
        </b-col>

        <!-- Column 2.2: Protein & protein mapping -->
        <!-- <b-col class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9" style="z-index: 2;"> -->
        <b-col class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9">
            <Protein :proteinData="mainData.proteinData" :base-axis="baseAxis" ref="proteinComponent"></Protein>
        </b-col>

        <!-- Column 2.3: Nothing -->
        <b-col v-show="mainData.heatmapData && show_heatmap" class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

    <!-- Row 3: Canonical transcript information, canonical transcript track, and nothing -->
    <b-row v-show="!canon_disabled && show_stack && show_canon" class="border-bottom row3">

        <!-- Column 3.1: Canonical transcript information -->
        <b-col class="col1 text-center" cols="3" style="white-space: nowrap; overflow: auto;">
            <span>
            Canonical isoform: 
            <b-spinner v-if="showCanonLoading" variant="dark" class="ml-1" type="grow" small></b-spinner>
            <br>
            </span>
            <span v-if="!labels.refseq">
            <b-link :href="`https://${is_use_grch37 ? 'grch37.' : ''}ensembl.org/${species}/Transcript/Summary?db=core;g=${this.mainData.selectedGene};t=${this.canonicalTranscript}`" target="_blank">{{ this.canonDisplay }}</b-link>
            </span>
            <span v-else>
            <b-link :href="`https://${is_use_grch37 ? 'grch37.' : ''}ensembl.org/${species}/Transcript/Summary?db=core;g=${this.mainData.selectedGene};t=${this.canonicalTranscript}`" target="_blank">{{ this.canonDisplaySymbolOrID }}</b-link>, <b-link :href="`https://www.ncbi.nlm.nih.gov/nuccore/${labels.refseq}`" target="_blank">{{ this.labels.refseq }}</b-link>
            </span>
        </b-col>

        <!-- Column 3.2: Canonical transcript track -->
        <b-col class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9">
            <CanonTrack :base-axis="baseAxis" :canon-data="mainData.canonData" ref="canonStackComponent" class="grid-item" style="margin-top: 0px; margin-bottom: 0px; padding-top: 0px; padding-bottom: 0px; padding-left: 1rem !important; padding-right: 1rem !important;"></CanonTrack>
        </b-col>

        <!-- Column 3.3: Nothing -->
        <b-col v-show="mainData.heatmapData && show_heatmap" class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

    <!-- Row 4: User isoforms label, nothing, and nothing-->
    <b-row class="row4">

        <!-- Column 4.1: User isoforms label -->
        <b-col class="col1 text-center" cols="3" style="white-space: nowrap; overflow: auto; padding-top: 5px; padding-bottom: 5px">
            <span>User isoforms:</span>
            <b-icon-sort-alpha-down v-if="orfs_ready" @click="sortIsoformsByAlpha()" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.top="'Sort isoforms by ascending transcript symbols / IDs'"></b-icon-sort-alpha-down>
            <b-icon-sort-alpha-down-alt v-if="orfs_ready" @click="sortIsoformsByAlpha(false)" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.top="'Sort isoforms by descending transcript symbols / IDs'"></b-icon-sort-alpha-down-alt>
            <b-img v-if="orfs_ready && mainData.heatmapData" @click="sortIsoformsByMeanHeatmap()" style="width: 16px; height: 16px; cursor: pointer; background: linear-gradient(#1170aa, #fff8e6, #fc7d0b); display: inline-block; border: 0; border-style: none; overflow: visible; vertical-align: -0.15em;" v-b-tooltip.hover.window.top="'Sort isoforms by ascending mean heatmap values'"></b-img>
            <b-img v-if="orfs_ready && mainData.heatmapData" @click="sortIsoformsByMeanHeatmap(false)" style="width: 16px; height: 16px; cursor: pointer; background: linear-gradient(#fc7d0b, #fff8e6, #1170aa); display: inline-block; overflow: visible; vertical-align: -0.15em;" v-b-tooltip.hover.window.top="'Sort isoforms by descending mean heatmap values'"></b-img>
        </b-col>

        <!-- Column 4.2: Nothing -->
        <b-col class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9">
        </b-col>

        <!-- Column 4.3: Nothing -->
        <b-col v-show="mainData.heatmapData && show_heatmap" class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

    <!-- Row 5: Accession list, isoform stack, and heatmap -->
    <b-row class="border-bottom row5">

        <!-- Column 5.1: Accession list -->
        <b-col class="col1 grid-item mx-0 g-0" cols="3" style="text-align: center; white-space: nowrap; overflow: auto;">
            <draggable v-model="transcriptIds" @start="drag=true" @end="onEnd">
                <div v-for="transcriptId in transcriptIds" :key="transcriptId" :id="transcriptId" style="display: block; height: 51px; line-height: 51px; background-color: white;">
                    <!-- Delete button -->
                    <b-icon-x v-if="(transcriptIds.length > 1) && transcript_names_ready" class="icon float-left" @click="removeIsoform(transcriptId);" style="display: block; height: 51px; line-height: 51px; cursor: pointer;"></b-icon-x>
                    <!-- Loading icon -->
                    <b-spinner v-if="!transcript_names_ready" variant="dark" class="ml-1 float-left" type="grow" small></b-spinner>
                    <!-- Accession ID -->
                    <span v-if="transcriptNames[transcriptId] === 'Novel'" class="accessionText"><b-link :href="`https://${is_use_grch37 ? 'grch37.' : ''}ensembl.org/${species}/Transcript/Summary?db=core;g=${mainData.selectedGene};t=${transcriptId}`" target="_blank">{{transcriptId}}</b-link></span>
                    <span v-else-if="(transcriptNames[transcriptId] === 'Not found') || (!transcriptNames[transcriptId])" class="accessionText">{{transcriptId}}</span>
                    <span v-else class="accessionText"><b-link :href="`https://${is_use_grch37 ? 'grch37.' : ''}ensembl.org/${species}/Transcript/Summary?db=core;g=${mainData.selectedGene};t=${transcriptId}`" target="_blank">{{transcript_names_ready ? transcriptNames[transcriptId] + " (" + transcriptId + ')' : transcriptId}}</b-link></span>
                    <!-- Reorder icon -->
                    <b-icon-list v-if="(mainData && mainData.isoformData && mainData.isoformData.transcriptOrder && (mainData.isoformData.transcriptOrder.length > 1)) && transcript_names_ready" class="icon float-right" style="display: block; height: 51px; line-height: 51px; cursor: pointer;"></b-icon-list>
                </div>
            </draggable>
            <b-icon-plus v-if="isoformList.length > 1" @click="addClick" style="cursor: pointer;">+</b-icon-plus>
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

        <!-- Column 5.2: Isoform stack -->
        <b-col v-show="show_stack" class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9">
            <IsoformStack :base-axis="baseAxis" :isoform-list="mainData.isoformData.isoformList" ref="isoformStackComponent" class="grid-item mx-0 g-0" style="padding-left: 1rem !important; padding-right: 1rem !important;"></IsoformStack>
        </b-col>

        <!-- Column 5.3: Heatmap -->
        <b-col v-show="mainData.heatmapData && show_heatmap" class="col3" :cols="show_stack ? 3 : 9">
            <Heatmap :heatmapData="mainData.heatmapData" ref="heatmapComponent" class="grid-item mx-0 g-0 align-self-center" style="padding-left: 1rem !important; padding-right: 1rem !important;"></Heatmap>
        </b-col>

    </b-row>

    <!-- Row 6: Logo, gene strand, and sample labels + heatmap legend -->
    <b-row class="row6">

        <!-- Column 6.1: Logo -->
        <b-col class="col1 grid-item p-3 mx-0 my-1 g-0" style="display: flex; align-items: center; justify-content: center;" cols="3">
            <b-img src="~/assets/logos/IsovisLogo.svg" height="120px"></b-img>
        </b-col>

        <!-- Column 6.2: Gene strand -->
        <b-col v-show="show_stack" class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9">
            <GeneStrand :base-axis="baseAxis" :chromosome="mainData.isoformData.chromosome" :is-strand-unknown="mainData.isoformData.is_strand_unknown" ref="geneStrandComponent" class="grid-item p-3 mx-0 my-1 g-0"/>
        </b-col>

        <!-- Column 6.3: Sample labels + heatmap legend -->
        <b-col v-show="mainData.heatmapData && show_heatmap" class="col3" :cols="show_stack ? 3 : 9">
            <HeatmapLegend :heatmapData="mainData.heatmapData" ref="heatmapLegendComponent" class="grid-item p-3 mx-0 my-1 g-0 text-center"></HeatmapLegend>
        </b-col>

    </b-row>

    <!-- Row 7: Nothing, gene strand explanation, and log-transform button -->
    <b-row class="row7">

        <!-- Column 7.1: Nothing -->
        <b-col class="col1" cols="3">
        </b-col>

        <!-- Column 7.2: Gene strand explanation -->
        <b-col v-show="show_stack" class="col2" :cols="(mainData.heatmapData && show_heatmap) ? 6 : 9" style="text-align: center">
            <b-link href="help_gene_strand/" target="_blank">What is this diagram?</b-link>
        </b-col>

        <!-- Column 7.3: Log-transform button -->
        <b-col v-if="mainData.heatmapData && show_heatmap" class="col3" style="display: flex; justify-content: center;" :cols="show_stack ? 3 : 9">
            <b-form-checkbox button size="sm" button-variant="outline-secondary" v-model="logTransformChecked" name="check-button">Transform: log<sub>10</sub>(x+1)</b-form-checkbox>
        </b-col>

    </b-row>

</b-container>
</template>

<script>
import { createBaseAxis } from '~/assets/base_axis';
import { CanonData, ProteinData, mergeRanges } from '~/assets/data_parser';
import { put_in_svg, put_in_symbol, put_in_hyperlink, use, put_in_protein_symbol, isovis_logo_symbol, line, rect, rounded_rect, text_preserve_whitespace_central_baseline, text_double_centered, text_topped_centered, tspan } from '~/assets/svg_utils';
import draggable from 'vuedraggable';
import { BButton, BCol, BContainer, BDropdown, BDropdownItem, BForm, BFormCheckbox, BIconCheck, BIconList, BIconPlus, BIconSortAlphaDown, BIconSortAlphaDownAlt, BIconX, BImg, BLink, BModal, BRow, BSpinner, VBTooltip } from 'bootstrap-vue';

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
        BIconSortAlphaDown,
        BIconSortAlphaDownAlt,
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
            show_protein_labels: false,
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
            no_orfs: true,
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
            is_use_grch37: false,

            is_demo_resize_done: false,
            is_sorting_done: false,
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

        canonDisplaySymbolOrID()
        {
            return this.mainData.canonData.display ? `${this.mainData.canonData.display}` : `${this.canonicalTranscript}`;
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

        exportPNG()
        {
            let [svg_width, svg_height, svg] = this.exportSVG(true);

            let export_canvas = document.createElement("canvas");
            export_canvas.setAttribute("width", svg_width);
            export_canvas.setAttribute("height", svg_height);
            let export_canvas_ctx = export_canvas.getContext("2d");

            let filename = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}.png` : 'IsoVis.png';

            let img = new Image();
            img.width = svg_width;
            img.height = svg_height;

            img.onload = function()
            {
                export_canvas_ctx.fillStyle = "white";
                export_canvas_ctx.fillRect(0, 0, svg_width, svg_height);
                export_canvas_ctx.drawImage(img, 0, 0);
                let png = export_canvas.toDataURL("image/png");
                let link = document.createElement('a');
                link.href = png;
                link.download = filename;
                link.click();
            };

            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        },

        exportJPEG()
        {
            let [svg_width, svg_height, svg] = this.exportSVG(true);

            let export_canvas = document.createElement("canvas");
            export_canvas.setAttribute("width", svg_width);
            export_canvas.setAttribute("height", svg_height);
            let export_canvas_ctx = export_canvas.getContext("2d");

            let filename = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}.png` : 'IsoVis.png';

            let img = new Image();
            img.width = svg_width;
            img.height = svg_height;

            img.onload = function()
            {
                export_canvas_ctx.fillStyle = "white";
                export_canvas_ctx.fillRect(0, 0, svg_width, svg_height);
                export_canvas_ctx.drawImage(img, 0, 0);
                let jpeg = export_canvas.toDataURL("image/jpeg", 1.0);
                let link = document.createElement('a');
                link.href = jpeg;
                link.download = filename;
                link.click();
            };

            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        },

        async exportPDF()
        {
            let PDFDocument = require("~/assets/pdfkit.standalone.js");
            let SVGtoPDF = require("svg-to-pdfkit");
            let blobStream = require("blob-stream");

            let [svg_width, svg_height, svg] = this.exportSVG(true);
            let doc = new PDFDocument({size: [svg_width, svg_height]});
            SVGtoPDF(doc, svg, 0, 0, {assumePt: true});

            let filename = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}.pdf` : 'IsoVis.pdf';
            let stream = doc.pipe(blobStream());
            stream.on("finish", function()
            {
                let url = stream.toBlobURL("application/pdf");
                let link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.click();
            });
            doc.end();
        },

        exportSVG(is_return_svg = false)
        {
            // We want all the text on the left hand side fully shown and centered
            // Idea: Calculate the width of the longest component on the left hand side, then center-align the texts accordingly

            let [shown_text_and_links, shown_canonical_text_and_links, protein_info_first_line, protein_info_second_line, protein_info_third_line] = this.determineLeftSideTexts();
            let [longest_text_width, protein_first_line, protein_second_line, protein_third_line] = this.determineLeftSideTextMaxWidth(shown_text_and_links, shown_canonical_text_and_links, protein_info_first_line, protein_info_second_line, protein_info_third_line);

            // Create a temporary canvas for calculating text metrics
            let text_metrics_canvas = document.createElement("canvas");
            let text_metrics_canvas_ctx = text_metrics_canvas.getContext("2d");

            // Calculate the width of the main gene text
            text_metrics_canvas_ctx.font = "28px sans-serif";

            let main_gene_text = "";
            let main_gene_hyperlink = null;

            if (this.is_gene_on_ensembl)
            {
                main_gene_text = this.mainData.geneLabel ? `${this.mainData.geneLabel} (${this.mainData.selectedGene})` : this.mainData.selectedGene;
                main_gene_hyperlink = `https://${this.is_use_grch37 ? 'grch37.' : ''}ensembl.org/${this.species}/Gene/Summary?g=${this.mainData.selectedGene}`;
            }
            else
            {
                main_gene_text = this.mainData.selectedGene;
            }

            let main_gene_text_width = text_metrics_canvas_ctx.measureText(main_gene_text).width;
            let main_gene_text_height = -1;

            {
                let main_gene_text_metrics = text_metrics_canvas_ctx.measureText(main_gene_text);
                main_gene_text_height = main_gene_text_metrics.actualBoundingBoxAscent + main_gene_text_metrics.actualBoundingBoxDescent;
            }

            // Set the font for calculating metrics for other shown texts
            text_metrics_canvas_ctx.font = "16px sans-serif";

            // Deal with the case when only the heatmap is shown
            if (!this.show_stack)
            {
                // All the information for the second column
                let [heatmap_width, heatmap_height, heatmap_symbol] = this.$refs.heatmapComponent.buildHeatmapSvg(true);
                let [heatmap_legend_width, heatmap_legend_height, heatmap_legend_symbol] = this.$refs.heatmapLegendComponent.buildHeatmapLegendSvg(true);

                let second_column_width = Math.max(heatmap_width, heatmap_legend_width);

                let svg = "";
                let svg_width = 50 + longest_text_width + 50 + second_column_width + 50;

                // To deal with the very unlikely case where the main gene text is wider than the rest of the visualization
                svg_width = Math.ceil(Math.max(main_gene_text_width, svg_width));

                // Begin creating the SVG
                let x = svg_width / 2;
                let y = 20;

                // Draw the main gene text
                {
                    let fill = (main_gene_hyperlink) ? "#007bff" : "";
                    let tspan_elem = tspan(main_gene_text, fill);
                    let text_elem = text_topped_centered(tspan_elem, x, y, 28, "sans-serif");

                    if (main_gene_hyperlink)
                        text_elem = put_in_hyperlink(main_gene_hyperlink, text_elem);

                    svg += text_elem;
                }

                x = 50 + longest_text_width / 2;
                y += main_gene_text_height + 10;

                // The accession list

                // Draw the 'User isoforms:' label
                svg += text_topped_centered("User isoforms:", x, y, 16, "sans-serif");

                {
                    let text_metrics = text_metrics_canvas_ctx.measureText("User isoforms:");
                    y += text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent + 5;
                }

                // Draw the heatmap
                svg += put_in_symbol("heatmap", heatmap_width, heatmap_height, heatmap_symbol);
                svg += use("#heatmap", 50 + longest_text_width + 50, y);

                // Draw the grey horizontal line
                let line_y = Math.ceil(y + heatmap_height + 10);
                svg += line(0, line_y + 0.5, svg_width - 1, line_y + 0.5, "#dee2e6", 1);

                // Draw all shown isoform texts
                y += 25;
                for (let [isoform_text, hyperlink] of shown_text_and_links)
                {
                    if (isoform_text === "User isoforms:")
                        continue;

                    let fill = (hyperlink) ? "#007bff" : "";
                    let text_elem = text_double_centered(isoform_text, x, y, 16, "sans-serif", fill);

                    if (hyperlink)
                        text_elem = put_in_hyperlink(hyperlink, text_elem);

                    svg += text_elem;

                    y += 1 + 50;
                }

                y = line_y + 10;

                // Draw the IsoVis logo
                svg += isovis_logo_symbol("logo", 123.75, 120);
                svg += use("#logo", 50 + (longest_text_width - 123.75) / 2, y);

                // Draw the heatmap legend
                svg += put_in_symbol("heatmap_legend", heatmap_legend_width, heatmap_legend_height, heatmap_legend_symbol);
                svg += use("#heatmap_legend", 50 + longest_text_width + 50, y);

                // Determine the SVG height
                let svg_height = Math.ceil(Math.max(y + 120, y + heatmap_legend_height)) + 20;

                svg = put_in_svg(svg_width, svg_height, svg);

                text_metrics_canvas.remove();

                if (is_return_svg)
                    return [svg_width, svg_height, svg];

                // Export the SVG
                let link = document.createElement('a');
                link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
                link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}.svg` : 'IsoVis.svg';
                link.click();

                return;
            }

            let protein_labels_shown = (!this.protein_disabled && this.show_stack && this.show_protein && this.show_protein_labels);
            let protein_shown = (!this.protein_disabled && this.show_stack && this.show_protein);
            let canon_shown = (!this.canon_disabled && this.show_stack && this.show_canon);
            let heatmap_shown = (this.mainData.heatmapData && this.show_heatmap);

            // All the information for the second column
            let [protein_labels_width, protein_labels_height, protein_labels_symbol] = (protein_labels_shown) ? this.$refs.proteinLabelsComponent.buildProteinLabelsSvg(true) : [-1, -1, null];
            let [protein_width, protein_height, protein_symbol] = (protein_shown) ? this.$refs.proteinComponent.buildProteinSvg(true) : [-1, -1, null];
            let [protein_map_width, protein_map_height, protein_map_symbol] = (protein_shown) ? this.$refs.proteinComponent.buildProteinMapSvg(true) : [-1, -1, null];
            let [canon_track_width, canon_track_height, canon_track_symbol] = (canon_shown) ? this.$refs.canonStackComponent.buildStackSvg(true) : [-1, -1, null];
            let [isoform_stack_width, isoform_stack_height, isoform_stack_symbol] = this.$refs.isoformStackComponent.buildStackSvg(true);
            let [gene_strand_width, gene_strand_height, gene_strand_symbol] = this.$refs.geneStrandComponent.buildStrandSvg(true);

            let second_column_width = Math.max(protein_width, protein_map_width, canon_track_width, isoform_stack_width, gene_strand_width);

            // All the information for the third column
            let [heatmap_width, heatmap_height, heatmap_symbol] = (heatmap_shown) ? this.$refs.heatmapComponent.buildHeatmapSvg(true) : [-1, -1, null];
            let [heatmap_legend_width, heatmap_legend_height, heatmap_legend_symbol] = (heatmap_shown) ? this.$refs.heatmapLegendComponent.buildHeatmapLegendSvg(true) : [-1, -1, null];

            let third_column_width = Math.max(-1, heatmap_width, heatmap_legend_width);

            let svg = "";
            let svg_width = 50 + longest_text_width + 50 + second_column_width + 50;
            if (third_column_width !== -1)
                svg_width += 50 + third_column_width;

            // To deal with the very unlikely case where the main gene text is wider than the rest of the visualization
            svg_width = Math.ceil(Math.max(main_gene_text_width, svg_width));

            // Begin creating the SVG
            let x = svg_width / 2;
            let y = 20;

            // Draw the main gene text
            {
                let fill = (main_gene_hyperlink) ? "#007bff" : "";
                let tspan_elem = tspan(main_gene_text, fill);
                let text_elem = text_topped_centered(tspan_elem, x, y, 28, "sans-serif");

                if (main_gene_hyperlink)
                    text_elem = put_in_hyperlink(main_gene_hyperlink, text_elem);

                svg += text_elem;
            }

            y += main_gene_text_height + 10;

            // The protein labels
            if (protein_labels_shown)
            {
                if (!((protein_labels_width === -1) || (protein_labels_height === -1) || !protein_labels_symbol))
                {
                    svg += put_in_symbol("protein_labels", protein_labels_width, protein_labels_height, protein_labels_symbol);
                    svg += use("#protein_labels", 50 + longest_text_width + 50, y);
                    y += protein_labels_height;
                }
            }

            x = 50 + longest_text_width / 2;

            // The protein text and diagrams
            if (protein_shown)
            {
                let first_line_tspan_elems = "";
                for (let [line_text, hyperlink] of protein_info_first_line)
                {
                    let fill = (hyperlink) ? "#007bff" : "";
                    let tspan_elem = tspan(line_text, fill);

                    if (hyperlink)
                        tspan_elem = put_in_hyperlink(hyperlink, tspan_elem);

                    first_line_tspan_elems += tspan_elem;
                }

                let text_metrics = text_metrics_canvas_ctx.measureText(protein_first_line);
                y += text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent + 7;

                let second_line_tspan_elems = "";
                for (let [line_text, hyperlink] of protein_info_second_line)
                {
                    let fill = (hyperlink) ? "#007bff" : "";
                    let tspan_elem = tspan(line_text, fill);

                    if (hyperlink)
                        tspan_elem = put_in_hyperlink(hyperlink, tspan_elem);

                    second_line_tspan_elems += tspan_elem;
                }

                text_metrics = text_metrics_canvas_ctx.measureText(protein_second_line);
                let protein_second_line_height = Math.max(text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent, 16);
                let bottom_y1 = Math.ceil(y + protein_second_line_height + 7);

                text_metrics = text_metrics_canvas_ctx.measureText(protein_third_line);
                let protein_third_line_height = Math.max(text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent, 16);
                bottom_y1 = Math.ceil(bottom_y1 + protein_third_line_height + 5);

                // Draw the protein domain and motif diagram
                y = 20 + main_gene_text_height + 10;
                if (protein_labels_shown && !((protein_labels_width === -1) || (protein_labels_height === -1) || !protein_labels_symbol))
                    y += protein_labels_height;

                if (!((protein_width === -1) || (protein_height === -1) || !protein_symbol))
                {
                    svg += put_in_protein_symbol("protein", protein_width, protein_height, protein_symbol);
                    svg += use("#protein", 50 + longest_text_width + 50, y);
                    y += protein_height;
                }

                // Draw the protein mapping diagram
                if (!((protein_map_width === -1) || (protein_map_height === -1) || !protein_map_symbol))
                {
                    svg += put_in_symbol("protein_map", protein_map_width, protein_map_height, protein_map_symbol);
                    svg += use("#protein_map", 50 + longest_text_width + 50, y);
                    y += protein_map_height;
                }

                // Draw the grey horizontal line
                let bottom_y2 = Math.ceil(y);
                y = Math.max(bottom_y1, bottom_y2) + 1;
                svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                // Draw the third line of the protein info
                let temp_y = y - protein_third_line_height - 5;
                let protein_third_line_width = text_metrics_canvas_ctx.measureText(protein_third_line).width + 16 * 2;
                let protein_third_line_elems = "";

                protein_third_line_elems += rect(x - protein_third_line_width / 2, temp_y, 16, 16, "#bbe8be");
                protein_third_line_elems += text_preserve_whitespace_central_baseline(" Disordered region, ", x - protein_third_line_width / 2 + 16, temp_y + protein_third_line_height / 2, 16, "sans-serif");
                protein_third_line_elems += rect(x - protein_third_line_width / 2 + 16 + text_metrics_canvas_ctx.measureText(" Disordered region, ").width, temp_y, 16, 16, "#d0cfee");
                protein_third_line_elems += text_preserve_whitespace_central_baseline(" Coil", x - protein_third_line_width / 2 + 16 + text_metrics_canvas_ctx.measureText(" Disordered region, ").width + 16, temp_y + protein_third_line_height / 2, 16, "sans-serif");
                svg += protein_third_line_elems;

                // Draw the second line of the protein info
                temp_y -= protein_second_line_height + 7;
                let protein_second_line_width = text_metrics_canvas_ctx.measureText(protein_second_line).width + 16 * 2;
                let protein_second_line_elems = "";

                protein_second_line_elems += rounded_rect(x - protein_second_line_width / 2, temp_y, 16, 16, 8, 8, "#4a1c83");
                protein_second_line_elems += text_preserve_whitespace_central_baseline(" PFAM domain, ", x - protein_second_line_width / 2 + 16, temp_y + protein_second_line_height / 2, 16, "sans-serif");
                protein_second_line_elems += rect(x - protein_second_line_width / 2 + 16 + text_metrics_canvas_ctx.measureText(" PFAM domain, ").width, temp_y, 16, 16, "#c3a685");
                protein_second_line_elems += text_preserve_whitespace_central_baseline(" Signal peptide", x - protein_second_line_width / 2 + 16 + text_metrics_canvas_ctx.measureText(" PFAM domain, ").width + 16, temp_y + protein_second_line_height / 2, 16, "sans-serif");
                svg += protein_second_line_elems;

                // Draw the first line of the protein info
                text_metrics = text_metrics_canvas_ctx.measureText(protein_first_line);
                svg += text_topped_centered(first_line_tspan_elems, x, temp_y - text_metrics.actualBoundingBoxAscent - text_metrics.actualBoundingBoxDescent - 7, 16, "sans-serif");

                // Spacing
                y += 5;
            }

            // The canonical isoform
            if (canon_shown)
            {
                // Draw the 'Canonical isoform:' label
                svg += text_topped_centered("Canonical isoform:", x, y, 16, "sans-serif");

                // Draw the canonical isoform track
                let max_y = -1;
                if (!((canon_track_width === -1) || (canon_track_height === -1) || !canon_track_symbol))
                {
                    max_y = Math.ceil(y - 4 + canon_track_height);
                    svg += put_in_symbol("canon_track", canon_track_width, canon_track_height, canon_track_symbol);
                    svg += use("#canon_track", 50 + longest_text_width + 50, y - 4);
                }

                // Calculate the possible y-coordinate for drawing the canonical isoform text
                let text_metrics = text_metrics_canvas_ctx.measureText("Canonical isoform:");
                y += text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent + 9;

                let tspan_elems = "";
                let actual_line_text = "";
                for (let [line_text, hyperlink] of shown_canonical_text_and_links[1])
                {
                    let fill = (hyperlink) ? "#007bff" : "";
                    let tspan_elem = tspan(line_text, fill);

                    if (hyperlink)
                        tspan_elem = put_in_hyperlink(hyperlink, tspan_elem);

                    tspan_elems += tspan_elem;
                    actual_line_text += line_text;
                }

                // Draw the grey horizontal line
                text_metrics = text_metrics_canvas_ctx.measureText(actual_line_text);
                y = Math.ceil(y + text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent + 5);

                if (max_y !== -1)
                    y = Math.max(y, max_y);

                svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                // Draw the canonical isoform text
                svg += text_topped_centered(tspan_elems, x, y - text_metrics.actualBoundingBoxAscent - text_metrics.actualBoundingBoxDescent - 2, 16, "sans-serif");

                y += 10;
            }

            // The accession list

            // Draw the 'User isoforms:' label
            svg += text_topped_centered("User isoforms:", x, y, 16, "sans-serif");

            {
                let text_metrics = text_metrics_canvas_ctx.measureText("User isoforms:");
                y += text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent + 5;
            }

            // Draw the isoform stack
            svg += put_in_symbol("isoform_stack", isoform_stack_width, isoform_stack_height, isoform_stack_symbol);
            svg += use("#isoform_stack", 50 + longest_text_width + 50, y);

            // Draw the heatmap
            if (heatmap_shown)
            {
                if (!((heatmap_width === -1) || (heatmap_height === -1) || !heatmap_symbol))
                {
                    svg += put_in_symbol("heatmap", heatmap_width, heatmap_height, heatmap_symbol);
                    svg += use("#heatmap", 50 + longest_text_width + 50 + second_column_width + 50, y);
                }
            }

            // Draw the grey horizontal line
            let line_y = Math.ceil(y + isoform_stack_height + 10);
            svg += line(0, line_y + 0.5, svg_width - 1, line_y + 0.5, "#dee2e6", 1);

            // Draw all shown isoform texts
            y += 25;
            for (let [isoform_text, hyperlink] of shown_text_and_links)
            {
                if (isoform_text === "User isoforms:")
                    continue;

                let fill = (hyperlink) ? "#007bff" : "";
                let text_elem = text_double_centered(isoform_text, x, y, 16, "sans-serif", fill);

                if (hyperlink)
                    text_elem = put_in_hyperlink(hyperlink, text_elem);

                svg += text_elem;

                y += 1 + 50;
            }

            y = line_y + 10;

            // Draw the IsoVis logo
            svg += isovis_logo_symbol("logo", 123.75, 120);
            svg += use("#logo", 50 + (longest_text_width - 123.75) / 2, y);

            // Draw the gene strand diagram
            svg += put_in_symbol("gene_strand", gene_strand_width, gene_strand_height, gene_strand_symbol);
            svg += use("#gene_strand", 50 + longest_text_width + 50, y);

            // Draw the heatmap legend
            if (heatmap_shown)
            {
                if (!((heatmap_legend_width === -1) || (heatmap_legend_height === -1) || !heatmap_legend_symbol))
                {
                    svg += put_in_symbol("heatmap_legend", heatmap_legend_width, heatmap_legend_height, heatmap_legend_symbol);
                    svg += use("#heatmap_legend", 50 + longest_text_width + 50 + second_column_width + 50, y);
                }
            }

            // Determine the SVG height
            let svg_height = Math.ceil(Math.max(y + 120, y + gene_strand_height, y + heatmap_legend_height)) + 20;

            svg = put_in_svg(svg_width, svg_height, svg);

            text_metrics_canvas.remove();

            if (is_return_svg)
                return [svg_width, svg_height, svg];

            // Export the SVG
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}.svg` : 'IsoVis.svg';
            link.click();
        },

        determineLeftSideTextMaxWidth(shown_text_and_links, shown_canonical_text_and_links, protein_info_first_line, protein_info_second_line, protein_info_third_line)
        {
            // Determine the first line of the protein info
            let protein_first_line = "";
            for (let [line_text, ignored] of protein_info_first_line)
                protein_first_line += line_text;

            // Determine the second line of the protein info
            let protein_second_line = protein_info_second_line;

            // Determine the third line of the protein info
            let protein_third_line = protein_info_third_line;

            // Put all texts shown on the left side of the screen into this array
            let shown_texts = [protein_first_line];
            for (let [line_text, ignored] of shown_text_and_links)
                shown_texts.push(line_text);

            // Determine the first line of the canonical isoform info
            if (shown_canonical_text_and_links && shown_canonical_text_and_links[0])
                shown_texts.push(shown_canonical_text_and_links[0][0]);

            // Determine the secnod line of the canonical isoform info
            if (shown_canonical_text_and_links && shown_canonical_text_and_links[1])
            {
                let second_line_text = "";
                for (let [line_text, ignored] of shown_canonical_text_and_links[1])
                    second_line_text += line_text;
                shown_texts.push(second_line_text);
            }

            let text_width_canvas = document.createElement("canvas");
            let text_width_canvas_ctx = text_width_canvas.getContext("2d");
            text_width_canvas_ctx.font = "16px sans-serif";

            // Calculate the width of the longest text in that array
            let longest_text_width = 123.75; // The width of the IsoVis logo
            for (let shown_text of shown_texts)
            {
                let text_width = text_width_canvas_ctx.measureText(shown_text).width;
                if (text_width > longest_text_width)
                    longest_text_width = text_width;
            }

            // Also consider the second and third lines of the protein info (i.e. the protein features legend)
            let protein_second_line_width = text_width_canvas_ctx.measureText(protein_second_line).width + 16 * 2;
            let protein_third_line_width = text_width_canvas_ctx.measureText(protein_third_line).width + 16 * 2;
            longest_text_width = Math.max(longest_text_width, protein_second_line_width, protein_third_line_width);

            text_width_canvas.remove();

            return [longest_text_width, protein_first_line, protein_second_line, protein_third_line];
        },

        determineLeftSideTexts()
        {
            let shown_text_and_links = [["User isoforms:", null]];

            // Accession list
            for (let transcriptId of this.transcriptIds)
            {
                let shown_text = null;
                let link = null;

                if (this.transcriptNames[transcriptId] === 'Novel')
                {
                    link = `https://${this.is_use_grch37 ? 'grch37.' : ''}ensembl.org/${this.species}/Transcript/Summary?db=core;g=${this.mainData.selectedGene};t=${transcriptId}`;
                    shown_text = transcriptId;
                }
                else if ((this.transcriptNames[transcriptId] === 'Not found') || (!this.transcriptNames[transcriptId]))
                {
                    shown_text = transcriptId;
                }
                else
                {
                    link = `https://${this.is_use_grch37 ? 'grch37.' : ''}ensembl.org/${this.species}/Transcript/Summary?db=core;g=${this.mainData.selectedGene};t=${transcriptId}`;
                    shown_text = `${this.transcript_names_ready ? this.transcriptNames[transcriptId] + " (" + transcriptId + ')' : transcriptId}`;
                }

                shown_text_and_links.push([shown_text, link]);
            }

            let shown_canonical_text_and_links = [];

            // Canonical isoform
            if (!this.canon_disabled && this.show_stack && this.show_canon)
            {
                shown_canonical_text_and_links.push(["Canonical isoform:", null]);

                let second_line_info = [];
                if (!this.labels.refseq)
                    second_line_info.push([this.canonDisplay, `https://${this.is_use_grch37 ? 'grch37.' : ''}ensembl.org/${this.species}/Transcript/Summary?db=core;g=${this.mainData.selectedGene};t=${this.canonicalTranscript}`]);
                else
                {
                    second_line_info.push([this.canonDisplaySymbolOrID, `https://${this.is_use_grch37 ? 'grch37.' : ''}ensembl.org/${this.species}/Transcript/Summary?db=core;g=${this.mainData.selectedGene};t=${this.canonicalTranscript}`]);
                    second_line_info.push([", ", null]);
                    second_line_info.push([this.labels.refseq, `https://www.ncbi.nlm.nih.gov/nuccore/${this.labels.refseq}`]);
                }

                shown_canonical_text_and_links.push(second_line_info);
            }

            // Protein
            let protein_info_first_line = [];
            let protein_info_second_line = "";
            let protein_info_third_line = "";

            if (!this.protein_disabled && this.show_stack && this.show_protein)
            {
                let ensembl_link = "";
                if (this.labels.ensembl != '')
                    ensembl_link = `https://${this.is_use_grch37 ? 'grch37.' : ''}ensembl.org/${this.species}/Transcript/Summary?db=core;p=${this.labels.ensembl}`;

                let interpro_link = "";
                if (this.labels.interpro_source_database != '' && this.labels.uniprot != '')
                    interpro_link = `https://www.ebi.ac.uk/interpro/protein/${this.labels.interpro_source_database}/${this.labels.uniprot}/`;

                let uniprot_link = "";
                if (this.labels.uniprot != '')
                    uniprot_link = `https://www.uniprot.org/uniprot/${this.labels.uniprot}`;

                let uniparc_link = "";
                if (this.labels.uniparc != '')
                    uniparc_link = `https://www.uniprot.org/uniparc/${this.labels.uniparc}`;

                if (!(ensembl_link || interpro_link || uniprot_link || uniparc_link))
                    protein_info_first_line.push(["Protein:", null]);
                else if (ensembl_link && !(interpro_link || uniprot_link || uniparc_link))
                    protein_info_first_line.push(["Protein", ensembl_link]);
                else
                {
                    if (ensembl_link)
                    {
                        protein_info_first_line.push(["Protein", ensembl_link]);
                        protein_info_first_line.push([": ", null]);
                    }
                    else
                        protein_info_first_line.push(["Protein: ", null]);

                    let other_links = [];
                    if (interpro_link)
                        other_links.push([interpro_link, "InterPro"]);
                    if (uniprot_link)
                        other_links.push([uniprot_link, "UniProt"]);
                    if (uniparc_link)
                        other_links.push([uniparc_link, "UniParc"]);

                    for (let other_links_index = 0; other_links_index < other_links.length; ++other_links_index)
                    {
                        let [shown_link, shown_text] = other_links[other_links_index];
                        protein_info_first_line.push([shown_text, shown_link]);
                        if (other_links_index !== other_links.length - 1)
                        protein_info_first_line.push([", ", null]);
                    }
                }

                protein_info_second_line = " PFAM domain, " + " Signal peptide";
                protein_info_third_line = " Disordered region, " + " Coil";
            }

            return [shown_text_and_links, shown_canonical_text_and_links, protein_info_first_line, protein_info_second_line, protein_info_third_line];
        },

        exportProteinLabelsSVG()
        {
            let svg = this.$refs.proteinLabelsComponent.buildProteinLabelsSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_protein.svg` : 'IsoVis_protein_labels.svg';
            link.click();
        },

        exportProteinSVG()
        {
            let svg = this.$refs.proteinComponent.buildProteinSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_protein.svg` : 'IsoVis_protein.svg';
            link.click();
        },

        exportProteinMapSVG()
        {
            let svg = this.$refs.proteinComponent.buildProteinMapSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_protein_mapping.svg` : 'IsoVis_protein_mapping.svg';
            link.click();
        },

        exportCanonTrackSVG()
        {
            let svg = this.$refs.canonStackComponent.buildStackSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_canon_track.svg` : 'IsoVis_canon_track.svg';
            link.click();
        },

        exportStackSVG()
        {
            let svg = this.$refs.isoformStackComponent.buildStackSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_stack.svg` : 'IsoVis_stack.svg';
            link.click();
        },

        exportStrandSVG()
        {
            let svg = this.$refs.geneStrandComponent.buildStrandSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_strand.svg` : 'IsoVis_strand.svg';
            link.click();
        },

        exportHeatmapSVG()
        {
            if (this.mainData.heatmapData)
            {
                let svg = this.$refs.heatmapComponent.buildHeatmapSvg();
                let link = document.createElement('a');
                link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
                link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_heatmap.svg` : 'IsoVis_heatmap.svg';
                link.click();
            }
        },

        exportHeatmapLegendSVG()
        {
            if (this.mainData.heatmapData)
            {
                let svg = this.$refs.heatmapLegendComponent.buildHeatmapLegendSvg();
                let link = document.createElement('a');
                link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
                link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_heatmap_legend.svg` : 'IsoVis_heatmap_legend.svg';
                link.click();
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
            this.$refs.proteinLabelsComponent.buildProteinLabels();
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

        setShowDomainLabels(state)
        {
            this.show_protein_labels = state;
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

        requestHeatmapDataUpload()
        {
            this.$root.$emit("request_heatmap_data_upload");
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
            ).catch(
                () => null
            );
            return response;
        },

        /**
         * Check if a gene ID is linked to Ensembl.
         * @param {*} gene_id The gene ID.
         */
        async isGeneOnEnsembl(gene_id)
        {
            let url = `https://${this.is_use_grch37 ? "grch37." : ""}rest.ensembl.org/lookup/id/${gene_id}?species=${this.species}&content-type=application/json`;
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

                let url = `https://${this.is_use_grch37 ? "grch37." : ""}rest.ensembl.org/lookup/id/${transcript_id}?species=${this.species}&content-type=application/json`;
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

            let url = `https://${this.is_use_grch37 ? "grch37." : ""}rest.ensembl.org/lookup/id/${gene_id}?species=${this.species}&content-type=application/json`;
            let response = await this.fetchJSON(url);
            if (response && !response.error && response.canonical_transcript)
            {
                if (response.display_name)
                    this.mainData.geneLabel = response.display_name;

                canon_id = response.canonical_transcript;
                canon_id = canon_id.substring(0, canon_id.indexOf('.'));

                url = `https://${this.is_use_grch37 ? "grch37." : ""}rest.ensembl.org/lookup/id/${canon_id}?species=${this.species}&expand=1;content-type=application/json`;
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

                let url = `https://${this.is_use_grch37 ? "grch37." : ""}rest.ensembl.org/map/cds/${isoform.transcriptID}/1..${isoform.length}?species=${this.species}&content-type=application/json`;
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

            if (this.mainData.isoformData && this.mainData.isoformData.allIsoforms)
            {
                for (var isoform of this.mainData.isoformData.allIsoforms)
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
            this.no_orfs = (Object.keys(ORFs).length === 0);
        },

        /**
         * Fetch the UniProt, UniParc and Ensembl labels of the canonical transcript.
         * @param {string} canon_id Ensembl ID of the canonical transcript
         */
        async getLabels(canon_id)
        {
            let url = `https://${this.is_use_grch37 ? "grch37." : ""}rest.ensembl.org/xrefs/id/${canon_id}?species=${this.species}&all_levels=1;content-type=application/json`;
            let response = await this.fetchJSON(url);

            if ((!response) || (response.error))
                return;

            for (let item of response)
            {
                if (item.dbname === "Uniprot/SWISSPROT" && item.db_display_name === "UniProtKB/Swiss-Prot")
                    this.labels["uniprot"] = item.primary_id;
                else if (item.dbname === "UniParc" && item.db_display_name === "UniParc")
                    this.labels["uniparc"] = item.primary_id;
                else if (item.dbname === "RefSeq_mRNA" && item.db_display_name === "RefSeq mRNA")
                    this.labels["refseq"] = item.display_id;
            }

            if (!this.labels["uniprot"])
            {
                for (let item of response)
                {
                    if (item.dbname === "Uniprot/SPTREMBL" && item.db_display_name === "UniProtKB/TrEMBL")
                        this.labels["uniprot"] = item.primary_id;
                }
            }

            url = `https://${this.is_use_grch37 ? "grch37." : ""}rest.ensembl.org/lookup/id/${canon_id}?species=${this.species}&expand=1;content-type=application/json`;
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

            let url = `https://${this.is_use_grch37 ? "grch37." : ""}rest.ensembl.org/xrefs/id/${canon_id}?species=${this.species}&all_levels=1;content-type=application/json`;
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
                this.labels["interpro_source_database"] = response.metadata.source_database;
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

        sortIsoformsByAlpha(ascending = true)
        {
            let shown_isoforms = [];
            for (let i = 0; i < this.transcriptIds.length; ++i)
            {
                let transcript_id = this.transcriptIds[i];

                // Sort the currently shown isoforms by their transcript name if they have one, and by their transcript ID if they don't.
                let transcript_name = this.transcriptNames[transcript_id];
                if ((!transcript_name) || (transcript_name === "Not found") || (transcript_name === "Novel"))
                    transcript_name = transcript_id;

                shown_isoforms.push([transcript_name, transcript_id]);
            }

            shown_isoforms.sort((a, b) => a[0].localeCompare(b[0], "en", {numeric: true, sensitivity: "case"}));
            if (!ascending)
                shown_isoforms.reverse();

            let heatmap_data_exists = (this.mainData.heatmapData && this.mainData.heatmapData.transcriptOrder);

            this.transcriptIds = [];
            this.mainData.isoformData.isoformList = [];
            this.mainData.isoformData.transcriptOrder = [];
            if (heatmap_data_exists)
                this.mainData.heatmapData.transcriptOrder = [];

            for (let [ignored, transcript_id] of shown_isoforms)
            {
                this.transcriptIds.push(transcript_id);
                this.mainData.isoformData.transcriptOrder.push(transcript_id);
                if (heatmap_data_exists)
                    this.mainData.heatmapData.transcriptOrder.push(transcript_id);
                for (let isoform of this.mainData.isoformData.allIsoforms)
                {
                    if (isoform.transcriptID === transcript_id)
                    {
                        this.mainData.isoformData.isoformList.push(isoform);
                        break;
                    }
                }
            }

            this.is_sorting_done = true;
        },

        sortIsoformsByMeanHeatmap(ascending = true)
        {
            let isoform_means = {};
            for (let transcript_id of this.transcriptIds)
                isoform_means[transcript_id] = [];

            let cell_values = this.logTransformChecked ? this.mainData.heatmapData.logExport : this.mainData.heatmapData.export;
            for (let cell_value of cell_values)
            {
                let value = cell_value.value;
                if ((value === null) || (value === undefined) || (isNaN(value)))
                    continue;

                let transcript = cell_value.transcript;
                if (this.transcriptIds.indexOf(transcript) === -1)
                    continue;

                isoform_means[transcript].push(value);
            }

            let shown_isoforms = [];
            let no_mean_isoforms = []; // For isoforms that have all-NaN heatmap values
            for (let transcript of Object.keys(isoform_means))
            {
                let values = isoform_means[transcript];
                let num_samples = values.length;

                if (num_samples === 0)
                {
                    no_mean_isoforms.push([-1, transcript]);
                    continue;
                }

                let mean = 0;
                for (let value of values)
                    mean += value;

                mean /= num_samples;

                shown_isoforms.push([mean, transcript]);
            }

            shown_isoforms.sort(function(a, b)
            {
                return a[0] - b[0];
            });
            if (!ascending)
                shown_isoforms.reverse();

            shown_isoforms.concat(no_mean_isoforms);

            this.transcriptIds = [];
            this.mainData.isoformData.isoformList = [];
            this.mainData.isoformData.transcriptOrder = [];
            this.mainData.heatmapData.transcriptOrder = [];

            for (let [ignored, transcript_id] of shown_isoforms)
            {
                this.transcriptIds.push(transcript_id);
                this.mainData.isoformData.transcriptOrder.push(transcript_id);
                this.mainData.heatmapData.transcriptOrder.push(transcript_id);
                for (let isoform of this.mainData.isoformData.allIsoforms)
                {
                    if (isoform.transcriptID === transcript_id)
                    {
                        this.mainData.isoformData.isoformList.push(isoform);
                        break;
                    }
                }
            }

            this.is_sorting_done = true;
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

        if (this.is_sorting_done)
        {
            this.is_sorting_done = false;
            this.resizePage();
        }

        if (this.is_zoom_changed)
        {
            this.is_zoom_changed = false;
            this.resizePage();
        }
    },

    mounted()
    {
        this.$root.$on("set_zoom", ([zoom_start, zoom_end, is_mouse_used, where = null]) =>
        {
            if (zoom_start !== zoom_end)
            {
                this.is_zoom_reset = false;
                this.is_zoom_changed = true;
                this.setZoom(zoom_start, zoom_end);
            }
            else if (is_mouse_used)
            {
                this.$root.$emit("single_click");
                if (where === "Canon")
                    this.$root.$emit("single_canon_click");
                else if (where === "Stack")
                    this.$root.$emit("single_stack_click");
            }
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
            this.no_orfs = true;
            this.protein_ready = false;
            this.logTransformChecked = false;
            this.labels = {"ensembl": "", "refseq": "", "uniprot": "", "uniparc": "", "interpro_source_database": ""};

            this.protein_disabled = false;
            this.canon_disabled = false;

            this.controller = new AbortController();
            this.signal = this.controller.signal;

            this.baseAxis = {};
            this.zoom_start = this.mainData.isoformData.start;
            this.zoom_end = this.mainData.isoformData.end;
            this.is_use_grch37 = this.mainData.is_use_grch37;
            this.is_zoom_changed = false;
            this.is_zoom_reset = true;
            this.setBaseAxis();

            if (!this.mainData.demoData)
                this.getTranscriptNames().then();
            this.buildHeatmapComponent();

            this.setShowOrfs(false);
            this.setShowDomains(true);
            this.setShowMotifs(true);
            this.setShowDomainLabels(false);

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
                                        this.buildProteinComponent();
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
                this.no_orfs = false;
                this.protein_ready = true;
                this.transcriptNames = {"ENST00000375793": "PLEKHM2-201", "ENST00000375799": "PLEKHM2-202"};
                this.transcript_names_ready = true;
                this.labels.ensembl = "ENSP00000364956";
                this.labels.uniprot = "Q8IWE5";
                this.labels.uniparc = "UPI00001C1D9C";
                this.labels.refseq = "NM_015164.4";
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