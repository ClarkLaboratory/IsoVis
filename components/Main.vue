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
            <b-dropdown-item v-if="!peptide_disabled" @click="setShowPeptide(!show_peptide)" v-b-tooltip.hover.right="'Display the mapping of peptides to transcripts'">
                Peptide mapping (beta)<b-icon-check v-if="show_peptide" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="!peptide_disabled && (mainData.isoformData.is_genomeprot)" @click="setPeptideIntegration(!peptide_integration_mode)" v-b-tooltip.hover.right="'Highlight all ORFs and transcripts that peptides are uniquely mapped to'">
                Peptide integration (beta)<b-icon-check v-if="peptide_integration_mode" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="orfs_ready && !no_orfs && show_stack" @click="setShowOrfs(!show_orfs)" v-b-tooltip.hover.right="'Display known ORFs for known transcripts (externally sourced)'">
                Known ORFs<b-icon-check v-if="show_orfs" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="orfs_ready && !no_user_orfs && show_stack" @click="setShowUserOrfs(!show_user_orfs)" v-b-tooltip.hover.right="'Display ORFs from the uploaded isoform stack data'">
                User ORFs<b-icon-check v-if="show_user_orfs" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="(canon_disabled || protein_disabled || protein_ready) && !is_other_isoforms_button_clicked" @click="getAllOtherIsoforms()" v-b-tooltip.hover.right="'Load all other Ensembl isoforms of the displayed gene that are not present in the uploaded isoform data (externally sourced)'">
                Load all other Ensembl isoforms
            </b-dropdown-item>
            <b-dropdown-item v-if="other_isoforms_loading" disabled>
                Loading all other Ensembl isoforms...
            </b-dropdown-item>
            <b-dropdown-item v-if="other_isoforms_disabled" disabled>
                All other Ensembl isoforms (none found)
            </b-dropdown-item>
            <b-dropdown-item v-if="is_other_isoforms_button_clicked && !other_isoforms_disabled && !other_isoforms_loading" @click="setShowAllOtherIsoforms(!show_all_other_isoforms)" v-b-tooltip.hover.right="'Display all other Ensembl isoforms of the displayed gene that are not present in the uploaded isoform data (externally sourced)'">
                All other Ensembl isoforms<b-icon-check v-if="show_all_other_isoforms" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="!rna_modif_disabled" @click="setShowRNAModif(!show_rna_modif)" v-b-tooltip.hover.right="'Display RNA modification sites identified in the currently visualized gene'">
                RNA modifications (beta)<b-icon-check v-if="show_rna_modif" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item @click="setShowSplices(!show_splices)" v-b-tooltip.hover.right="'Display splice junctions (default: only those that are not present in all transcripts)'">
                Show splice differences graph<b-icon-check v-if="show_splices" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="constitutive_junctions_exist" @click="setShowConstitutiveJunctions(!show_constitutive_junctions)" v-b-tooltip.hover.right="'Display splice junctions present in all transcripts that fully cover them by their transcription start and end sites (hidden by default)'">
                Show constitutive junctions<b-icon-check v-if="show_constitutive_junctions" variant="success"></b-icon-check>
            </b-dropdown-item>
        </b-dropdown>
        <b-button v-show="heatmap_data_exists && show_heatmap_column" variant="primary" size="sm" @click="setShowStack(!show_stack)">
            {{show_stack ? "Hide stack" : "Show stack"}}
        </b-button>
        <b-button v-show="!mainData.heatmapData" variant="warning" size="sm" class="ml-2" @click="requestHeatmapDataUpload()">
            Add isoform heatmap
        </b-button>
        <b-dropdown v-if="heatmap_data_exists" text="Heatmap options" class="ml-2" size="sm" variant="dark">
            <b-dropdown-item v-if="show_stack" @click="setShowHeatmapColumn(!show_heatmap_column)" v-b-tooltip.hover.right="'Display a column of heatmaps'">
                Show heatmap column<b-icon-check v-if="show_heatmap_column" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="mainData.peptideCountsData && !peptide_disabled && !peptide_compact_mode" @click="setShowPeptideHeatmap(!show_peptide_heatmap)" v-b-tooltip.hover.right="'Display the peptide intensities heatmap'">
                Peptide intensities heatmap<b-icon-check v-if="show_peptide_heatmap" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="mainData.peptideCountsData && !peptide_disabled && !peptide_compact_mode" @click="setHidePeptideHeatmapLabels(!hide_peptide_heatmap_labels)" v-b-tooltip.hover.right="'Hide sample labels for the peptide intensities heatmap'">
                Hide peptide intensities heatmap sample labels<b-icon-check v-if="hide_peptide_heatmap_labels" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="mainData.rnaModifLevelData && !rna_modif_disabled && !rna_modif_compact_mode" @click="setShowRNAModifHeatmap(!show_rna_modif_heatmap)" v-b-tooltip.hover.right="'Display the RNA modification levels heatmap'">
                RNA modification levels heatmap<b-icon-check v-if="show_rna_modif_heatmap" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="mainData.rnaModifLevelData && !rna_modif_disabled && !rna_modif_compact_mode" @click="setHideRNAModifHeatmapLabels(!hide_rna_modif_heatmap_labels)" v-b-tooltip.hover.right="'Hide sample labels for the RNA modification levels heatmap'">
                Hide RNA modification levels heatmap sample labels<b-icon-check v-if="hide_rna_modif_heatmap_labels" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="mainData.heatmapData" @click="setShowIsoformHeatmap(!show_isoform_heatmap)" v-b-tooltip.hover.right="'Display the isoform heatmap'">
                Isoform heatmap<b-icon-check v-if="show_isoform_heatmap" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="mainData.heatmapData" @click="setHideIsoformHeatmapLabels(!hide_isoform_heatmap_labels)" v-b-tooltip.hover.right="'Hide sample labels for the isoform heatmap'">
                Hide isoform heatmap sample labels<b-icon-check v-if="hide_isoform_heatmap_labels" variant="success"></b-icon-check>
            </b-dropdown-item>
            <b-dropdown-item v-if="mainData.heatmapData" @click="setLogTransform(!isoform_heatmap_log_transform)" v-b-tooltip.hover.right="'Toggle log transform for the isoform heatmap data (log10(x + 1))'">
                Log transform of isoform heatmap<b-icon-check v-if="isoform_heatmap_log_transform" variant="success"></b-icon-check>
            </b-dropdown-item>
        </b-dropdown>
        <!-- <b-button v-show="(mainData.heatmapData || mainData.peptideCountsData || mainData.rnaModifLevelData) && show_stack" variant="primary" size="sm" class="ml-2" @click="setShowHeatmap(!show_heatmap)">
            {{show_heatmap ? "Hide heatmaps" : "Show heatmaps"}}
        </b-button> -->
        <b-dropdown v-if="(canon_disabled || protein_disabled || protein_ready) && visible_components_exist" text="Export page as..." size="sm" variant="dark" class="ml-3">
            <b-dropdown-item @click="exportPNG()">PNG</b-dropdown-item>
            <b-dropdown-item @click="exportJPEG()">JPEG</b-dropdown-item>
            <b-dropdown-item @click="exportSVG()">SVG</b-dropdown-item>
            <b-dropdown-item @click="exportPDF()">PDF</b-dropdown-item>
            <b-dropdown-item disabled>Export individual components...</b-dropdown-item>
            <b-dropdown-item v-if="protein_labels_visible" @click="exportProteinLabelsSVG()">Protein labels SVG</b-dropdown-item>
            <b-dropdown-item v-if="protein_diagram_visible" @click="exportProteinSVG()">Protein diagram SVG</b-dropdown-item>
            <b-dropdown-item v-if="protein_mappings_visible" @click="exportProteinMapSVG()">Protein domain and motif mappings SVG</b-dropdown-item>
            <b-dropdown-item v-if="canonical_isoform_visible" @click="exportCanonTrackSVG()">Canonical isoform SVG</b-dropdown-item>
            <b-dropdown-item v-if="peptide_stack_visible" @click="exportPeptideSVG()">Peptide stack SVG</b-dropdown-item>
            <b-dropdown-item v-if="peptide_heatmap_visible" @click="exportPeptideHeatmapSVG()">Peptide heatmap SVG</b-dropdown-item>
            <b-dropdown-item v-if="peptide_heatmap_legend_visible" @click="exportPeptideHeatmapLegendSVG()">Peptide heatmap legend SVG</b-dropdown-item>
            <b-dropdown-item v-if="splice_graph_visible" @click="exportSpliceGraphSVG()">Splice differences graph SVG</b-dropdown-item>
            <b-dropdown-item v-if="other_ensembl_isoforms_visible" @click="exportOtherIsoformsSVG()">Other Ensembl isoforms SVG</b-dropdown-item>
            <b-dropdown-item v-if="rna_modification_sites_visible" @click="exportRNAModificationSitesSVG()">RNA modification sites SVG</b-dropdown-item>
            <b-dropdown-item v-if="rna_modification_levels_visible" @click="exportRNAModificationLevelsSVG()">RNA modification levels SVG</b-dropdown-item>
            <b-dropdown-item v-if="rna_modification_levels_legend_visible" @click="exportRNAModificationLevelsLegendSVG()">RNA modification levels legend SVG</b-dropdown-item>
            <b-dropdown-item v-if="isoform_stack_visible" @click="exportStackSVG()">Isoform stack SVG</b-dropdown-item>
            <b-dropdown-item v-if="gene_strand_visible" @click="exportStrandSVG()">Gene strand SVG</b-dropdown-item>
            <b-dropdown-item v-if="isoform_heatmap_visible" @click="exportHeatmapSVG()">Heatmap SVG</b-dropdown-item>
            <b-dropdown-item v-if="isoform_heatmap_legend_visible" @click="exportHeatmapLegendSVG()">Heatmap legend SVG</b-dropdown-item>
        </b-dropdown>
    </b-form>

    <!-- Row 1: Nothing, protein domain labels, and nothing -->
    <b-row v-show="!protein_disabled && show_stack && show_protein && show_protein_labels" class="row1">

        <!-- Column 1.1: Nothing -->
        <b-col class="col1 text-center" cols="3">
        </b-col>

        <!-- Column 1.2: Protein domain labels -->
        <b-col class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
            <ProteinLabels :proteinData="mainData.proteinData" :base-axis="baseAxis" ref="proteinLabelsComponent"></ProteinLabels>
        </b-col>

        <!-- Column 1.3: Nothing -->
        <b-col v-show="heatmap_data_exists && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
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
        <b-col class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
            <Protein :proteinData="mainData.proteinData" :base-axis="baseAxis" ref="proteinComponent"></Protein>
        </b-col>

        <!-- Column 2.3: Nothing -->
        <b-col v-show="heatmap_data_exists && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
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
        <b-col class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
            <CanonTrack :base-axis="baseAxis" :canon-data="mainData.canonData" ref="canonStackComponent" class="grid-item" style="margin-top: 0px; margin-bottom: 0px; padding-top: 0px; padding-bottom: 0px; padding-left: 1rem !important; padding-right: 1rem !important;"></CanonTrack>
        </b-col>

        <!-- Column 3.3: Nothing -->
        <b-col v-show="heatmap_data_exists && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

    <!-- Extra row: Peptides label, nothing, and nothing -->
    <b-row v-show="!peptide_disabled && show_peptide" class="row13">

        <!-- Column W.1: Peptides label -->
        <b-col class="col1 text-center" cols="3" style="white-space: nowrap; overflow: auto; padding-top: 5px; padding-bottom: 5px">
            <span>Peptides (beta):</span>
            <b-icon-sort-alpha-down v-if="!peptide_compact_mode" @click="sortPeptidesByAlpha()" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.top="'Sort peptides by ascending amino acid sequences'"></b-icon-sort-alpha-down>
            <b-icon-sort-alpha-down-alt v-if="!peptide_compact_mode" @click="sortPeptidesByAlpha(false)" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.top="'Sort peptides by descending amino acid sequences'"></b-icon-sort-alpha-down-alt>
            <b-img v-if="mainData.peptideCountsData && !peptide_compact_mode" @click="sortPeptidesByMeanHeatmap()" style="width: 16px; height: 16px; cursor: pointer; background: linear-gradient(#440154, #21918c, #fde725); display: inline-block; border: 0; border-style: none; overflow: visible; vertical-align: -0.15em;" v-b-tooltip.hover.window.top="'Sort peptides by ascending mean peptide counts'"></b-img>
            <b-img v-if="mainData.peptideCountsData && !peptide_compact_mode" @click="sortPeptidesByMeanHeatmap(false)" style="width: 16px; height: 16px; cursor: pointer; background: linear-gradient(#fde725, #21918c, #440154); display: inline-block; overflow: visible; vertical-align: -0.15em;" v-b-tooltip.hover.window.top="'Sort peptides by descending mean peptide counts'"></b-img>
            <b-icon-arrows-collapse v-if="!peptide_compact_mode" @click="setPeptideCompact(!peptide_compact_mode)" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.top="'Collapse peptides into one row (hides the peptide counts heatmap and legend)'"></b-icon-arrows-collapse>
            <b-icon-arrows-expand v-if="peptide_compact_mode" @click="setPeptideCompact(!peptide_compact_mode)" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.top="'Expand peptides into individual rows'"></b-icon-arrows-expand>
            <br v-if="show_stack">
            <span v-if="mainData.isoformData.is_genomeprot && show_stack">Uniquely map to <b-img style="width: 16px; height: 16px; background-color: #ff9500; display: inline-block; border: 0; border-style: none; overflow: visible; vertical-align: -0.15em;"></b-img> ORF > <b-img style="width: 16px; height: 16px; background-color: #0000ff; display: inline-block; border: 0; border-style: none; overflow: visible; vertical-align: -0.15em;"></b-img> Gene</span>
            <br v-if="!peptide_compact_mode && mainData.isoformData.is_genomeprot && show_stack">
            <span v-if="!peptide_compact_mode && mainData.isoformData.is_genomeprot && show_stack">Click on a coloured peptide to highlight features:</span>
            <b-icon-check v-if="!peptide_compact_mode && peptide_highlight_mode && (mainData.isoformData.is_genomeprot) && show_stack" @click="setPeptideHighlight(!peptide_highlight_mode)" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.right="'Enabled (click to disable)'"></b-icon-check>
            <b-icon-x v-if="!peptide_compact_mode && !peptide_highlight_mode && (mainData.isoformData.is_genomeprot) && show_stack" @click="setPeptideHighlight(!peptide_highlight_mode)" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.right="'Disabled (click to enable)'"></b-icon-x>
        </b-col>

        <!-- Column W.2: Nothing -->
        <b-col v-show="show_stack" class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
        </b-col>

        <!-- Column W.3: Nothing -->
        <b-col v-show="heatmap_data_exists && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

    <!-- Extra row: Peptide list, peptide stack, and peptide counts -->
    <b-row v-show="!peptide_disabled && show_peptide" class="border-bottom row14">

        <!-- Column W.1: Peptide list -->
        <b-col class="col1 text-center" cols="3" style="white-space: nowrap; overflow: auto;">
            <draggable v-if="!peptide_compact_mode" v-model="peptideOrder" @start="drag=true" @end="onPeptideEnd">
                <div v-for="peptide in peptideOrder" :key="peptide" :id="peptide" style="display: block; height: 31px; line-height: 31px; background-color: white;">
                    <!-- Delete button -->
                    <b-icon-x v-if="(peptideOrder.length > 1)" class="icon float-left" @click="removePeptide(peptide);" style="display: block; height: 31px; line-height: 31px; cursor: pointer;"></b-icon-x>
                    <!-- Peptide -->
                    <span>{{peptide}}</span>
                    <!-- Reorder icon -->
                    <b-icon-list v-if="(peptideOrder && (peptideOrder.length > 1))" class="icon float-right" style="display: block; height: 31px; line-height: 31px; cursor: pointer;"></b-icon-list>
                </div>
            </draggable>
            <div v-if="peptide_compact_mode" style="display: block; height: 31px; line-height: 31px; background-color: white;">
                <!-- Compact mode label -->
                <span>(Compact mode enabled)</span>
            </div>
            <b-icon-plus v-if="(!peptide_compact_mode) && allPeptides && allPeptides.length > 1" @click="addPeptideClick" style="cursor: pointer;">+</b-icon-plus>
            <b-modal v-model="modal.addPeptide.show" size="md" title="Edit peptide list" ok-only>
                <div class="border-top"></div>
                <div v-for="peptide in allPeptides" :key="peptide" :style="inclusionStyle((peptideOrder.indexOf(peptide) !== -1))" class="text-center border-bottom">
                    <!-- Delete button -->
                    <b-icon-x v-if="(peptideOrder.length > 1) && (peptideOrder.indexOf(peptide) !== -1)" @click="removePeptide(peptide)" class="icon float-left" style="display: block; height: 32px; line-height: 32px; cursor: pointer;"></b-icon-x>
                    <!-- Add button -->
                    <b-icon-plus v-if="peptideOrder.indexOf(peptide) === -1" @click="addPeptide(peptide)" class="icon float-left" style="display: block; height: 32px; line-height: 32px; cursor: pointer;"></b-icon-plus>
                    <!-- Peptide -->
                    {{peptide}}
                </div>
            </b-modal>
        </b-col>

        <!-- Column W.2: Peptide stack -->
        <b-col v-show="mainData && mainData.isoformData && !(mainData.isoformData.is_genomeprot) && show_stack" class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
            <PeptideStack :base-axis="baseAxis" :peptide-order="peptide_data.peptideOrder" :peptide-info="peptide_data.peptideInfo" :is-genome-prot="mainData.isoformData.is_genomeprot" ref="peptideStackComponent" class="grid-item mx-0 g-0" style="padding-left: 1rem !important; padding-right: 1rem !important;"></PeptideStack>
        </b-col>
        <b-col v-show="mainData && mainData.isoformData && (mainData.isoformData.is_genomeprot) && show_stack" class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
            <PeptideGenomeProtStack :base-axis="baseAxis" :peptide-order="peptide_data.peptideOrder" :peptide-info="peptide_data.peptideInfo" :is-genome-prot="mainData.isoformData.is_genomeprot" :current-gene="mainData.selectedGene" ref="peptideGenomeProtStackComponent" class="grid-item mx-0 g-0" style="padding-left: 1rem !important; padding-right: 1rem !important;"></PeptideGenomeProtStack>
        </b-col>

        <!-- Column W.3: Peptide counts -->
        <b-col v-show="heatmap_data_exists && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
            <PeptideCounts :peptideCountsData="mainData.peptideCountsData" :peptide-order="peptide_data.peptideOrder" ref="peptideCountsComponent" class="grid-item mx-0 g-0 align-self-center" style="padding-left: 1rem !important; padding-right: 1rem !important;"></PeptideCounts>
        </b-col>

    </b-row>

    <!-- Extra row: Nothing, nothing, and peptide counts legend -->
    <b-row v-show="!peptide_disabled && show_peptide && show_peptide_heatmap && mainData.peptideCountsData && show_heatmap_column && !peptide_compact_mode" class="border-bottom row15">

        <!-- Column X.1: Nothing -->
        <b-col cols="3">
        </b-col>

        <!-- Column X.2: Nothing -->
        <b-col v-show="show_stack" class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
        </b-col>

        <!-- Column X.3: Sample labels + heatmap legend -->
        <b-col v-show="mainData.peptideCountsData && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
            <PeptideCountsLegend :peptideCountsData="mainData.peptideCountsData" ref="peptideCountsLegendComponent" class="grid-item p-0 mx-0 my-3 g-0 text-center"></PeptideCountsLegend>
        </b-col>

    </b-row>

    <!-- Extra row: Splice differences graph label, splice differences graph, and nothing -->
    <b-row v-show="show_splices && show_stack" class="border-bottom row10">

        <!-- Column X.1: Splice differences graph label -->
        <b-col class="col1 text-center" cols="3" style="white-space: nowrap; overflow: auto;">
            <span>Splice differences graph:</span>
        </b-col>

        <!-- Column X.2: Splice differences graph -->
        <b-col v-show="show_stack" class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
            <SpliceGraph :base-axis="baseAxis" ref="spliceGraphComponent" class="grid-item" style="margin-top: 0px; margin-bottom: 0px; padding-top: 0px; padding-bottom: 0px; padding-left: 1rem !important; padding-right: 1rem !important;"></SpliceGraph>
        </b-col>

        <!-- Column X.3: Nothing -->
        <b-col v-show="heatmap_data_exists && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

    <!-- Extra row 2A: Other isoforms label, nothing, and nothing -->
    <b-row v-show="!other_isoforms_disabled && show_all_other_isoforms && show_stack" class="row11">

        <!-- Column YA.1: Other isoforms label -->
        <b-col class="col1 text-center" cols="3" style="white-space: nowrap; overflow: auto; padding-top: 5px; padding-bottom: 5px">
            <span>Other Ensembl isoforms:</span>
            <b-spinner v-if="other_isoforms_loading" variant="dark" class="ml-1" type="grow" small></b-spinner>
            <b-icon-sort-alpha-down v-if="!other_isoforms_loading" @click="sortOtherIsoformsByAlpha()" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.top="'Sort Ensembl isoforms by ascending transcript symbols / IDs'"></b-icon-sort-alpha-down>
            <b-icon-sort-alpha-down-alt v-if="!other_isoforms_loading" @click="sortOtherIsoformsByAlpha(false)" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.top="'Sort Ensembl isoforms by descending transcript symbols / IDs'"></b-icon-sort-alpha-down-alt>
        </b-col>

        <!-- Column 4.2: Nothing -->
        <b-col class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
        </b-col>

        <!-- Column 4.3: Nothing -->
        <b-col v-show="heatmap_data_exists && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

    <!-- Extra row 2B: Other isoforms label, other isoforms stack, and nothing -->
    <b-row v-show="!other_isoforms_disabled && show_all_other_isoforms && show_stack && other_isoform_data && other_isoform_data.isoformList && (other_isoform_data.isoformList.length >= 1)" class="border-bottom row12">

        <!-- Column YB.1: Other isoforms accession list -->
        <b-col class="col1 text-center" cols="3" style="white-space: nowrap; overflow: auto;">
            <draggable v-model="other_isoforms_ids" @start="drag=true" @end="onOtherEnd">
                <div v-for="other_isoform_id in other_isoforms_ids" :key="other_isoform_id" :id="other_isoform_id" style="display: block; height: 51px; line-height: 51px; background-color: white;">
                    <!-- Delete button -->
                    <b-icon-x v-if="(other_isoforms_ids.length > 1)" class="icon float-left" @click="removeOtherIsoform(other_isoform_id);" style="display: block; height: 51px; line-height: 51px; cursor: pointer;"></b-icon-x>
                    <!-- Accession ID -->
                    <span v-if="transcriptNames[other_isoform_id] === 'Novel'" class="accessionText"><b-link :href="`https://${is_use_grch37 ? 'grch37.' : ''}ensembl.org/${species}/Transcript/Summary?db=core;g=${mainData.selectedGene};t=${other_isoform_id}`" target="_blank">{{other_isoform_id}}</b-link></span>
                    <span v-else class="accessionText"><b-link :href="`https://${is_use_grch37 ? 'grch37.' : ''}ensembl.org/${species}/Transcript/Summary?db=core;g=${mainData.selectedGene};t=${other_isoform_id}`" target="_blank">{{transcriptNames[other_isoform_id] + " (" + other_isoform_id + ')'}}</b-link></span>
                    <!-- Reorder icon -->
                    <b-icon-list v-if="(other_isoforms_ids && (other_isoforms_ids.length > 1))" class="icon float-right" style="display: block; height: 51px; line-height: 51px; cursor: pointer;"></b-icon-list>
                </div>
            </draggable>
            <b-icon-plus v-if="other_isoform_data && other_isoform_data.allIsoforms && other_isoform_data.allIsoforms.length > 1" @click="addOtherClick" style="cursor: pointer;">+</b-icon-plus>
            <b-modal v-model="modal.addOtherIsoform.show" size="md" title="Edit Ensembl isoform list" ok-only>
                <div class="border-top"></div>
                <div v-for="isoform in otherIsoformList" :key="isoform" :style="inclusionStyle((other_isoforms_ids.indexOf(isoform) !== -1))" class="text-center border-bottom">
                    <!-- Delete button -->
                    <b-icon-x v-if="(other_isoforms_ids.length > 1) && (other_isoforms_ids.indexOf(isoform) !== -1)" @click="removeOtherIsoform(isoform)" class="icon float-left" style="display: block; height: 32px; line-height: 32px; cursor: pointer;"></b-icon-x>
                    <!-- Add button -->
                    <b-icon-plus v-if="other_isoforms_ids.indexOf(isoform) === -1" @click="addOtherIsoform(isoform)" class="icon float-left" style="display: block; height: 32px; line-height: 32px; cursor: pointer;"></b-icon-plus>
                    <!-- Accession ID -->
                    {{(transcriptNames[isoform] && (transcriptNames[isoform] !== "Novel")) ? `${transcriptNames[isoform]} (${isoform})` : isoform}}
                </div>
            </b-modal>
        </b-col>

        <!-- Column YB.2: Other isoforms stack -->
        <b-col v-show="show_stack && other_isoform_data && other_isoform_data.isoformList && (other_isoform_data.isoformList.length >= 1)" class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
            <OtherIsoformStack :base-axis="baseAxis" :isoform-list="other_isoform_data.isoformList" ref="otherIsoformStackComponent" class="grid-item mx-0 g-0" style="padding-left: 1rem !important; padding-right: 1rem !important;"></OtherIsoformStack>
        </b-col>

        <!-- Column YB.3: Nothing -->
        <b-col v-show="heatmap_data_exists && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

    <!-- Extra row: RNA modification sites label, nothing, and nothing -->
    <b-row v-show="!rna_modif_disabled && show_rna_modif" class="row16">

        <!-- Column X.1: RNA modification sites label -->
        <b-col class="col1 text-center" cols="3" style="white-space: nowrap; overflow: auto; padding-top: 5px; padding-bottom: 5px">
            <span>RNA modification sites (beta):</span>
            <b-icon-sort-alpha-down v-if="!rna_modif_compact_mode" @click="sortSitesByCoords()" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.top="'Sort sites by ascending genomic coordinates'"></b-icon-sort-alpha-down>
            <b-icon-sort-alpha-down-alt v-if="!rna_modif_compact_mode" @click="sortSitesByCoords(false)" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.top="'Sort sites by descending genomic coordinates'"></b-icon-sort-alpha-down-alt>
            <b-img v-if="mainData.rnaModifLevelData && !rna_modif_compact_mode" @click="sortSitesByMeanHeatmap()" style="width: 16px; height: 16px; cursor: pointer; background: linear-gradient(#440154, #21918c, #fde725); display: inline-block; border: 0; border-style: none; overflow: visible; vertical-align: -0.15em;" v-b-tooltip.hover.window.top="'Sort sites by ascending mean modification levels'"></b-img>
            <b-img v-if="mainData.rnaModifLevelData && !rna_modif_compact_mode" @click="sortSitesByMeanHeatmap(false)" style="width: 16px; height: 16px; cursor: pointer; background: linear-gradient(#fde725, #21918c, #440154); display: inline-block; overflow: visible; vertical-align: -0.15em;" v-b-tooltip.hover.window.top="'Sort sites by descending mean modification levels'"></b-img>
            <b-icon-arrows-collapse v-if="!rna_modif_compact_mode" @click="setRNAModifCompact(!rna_modif_compact_mode)" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.top="'Collapse sites into one row (hides the RNA modification levels heatmap and legend)'"></b-icon-arrows-collapse>
            <b-icon-arrows-expand v-if="rna_modif_compact_mode" @click="setRNAModifCompact(!rna_modif_compact_mode)" aria-hidden="true" style="cursor: pointer;" v-b-tooltip.hover.window.top="'Expand sites into individual rows'"></b-icon-arrows-expand>
        </b-col>

        <!-- Column X.2: Nothing -->
        <b-col v-show="show_stack" class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
        </b-col>

        <!-- Column X.3: Nothing -->
        <b-col v-show="heatmap_data_exists && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

    <!-- Extra row: RNA modification site list, RNA modification sites stack, and RNA modification levels -->
    <b-row v-show="!rna_modif_disabled && show_rna_modif" class="border-bottom row17">

        <!-- Column W.1: RNA modification site list -->
        <b-col class="col1 text-center" cols="3" style="white-space: nowrap; overflow: auto;">
            <draggable v-if="!rna_modif_compact_mode" v-model="siteOrder" @start="drag=true" @end="onSiteEnd">
                <div v-for="site in siteOrder" :key="site" :id="site" style="display: block; height: 31px; line-height: 31px; background-color: white;">
                    <!-- Delete button -->
                    <b-icon-x v-if="(siteOrder.length > 1)" class="icon float-left" @click="removeSite(site);" style="display: block; height: 31px; line-height: 31px; cursor: pointer;"></b-icon-x>
                    <!-- Site -->
                    <span>{{site}}</span>
                    <!-- Reorder icon -->
                    <b-icon-list v-if="(siteOrder && (siteOrder.length > 1))" class="icon float-right" style="display: block; height: 31px; line-height: 31px; cursor: pointer;"></b-icon-list>
                </div>
            </draggable>
            <div v-if="rna_modif_compact_mode" style="display: block; height: 31px; line-height: 31px; background-color: white;">
                <!-- Compact mode label -->
                <span>(Compact mode enabled)</span>
            </div>
            <b-icon-plus v-if="(!rna_modif_compact_mode) && allSites && allSites.length > 1" @click="addSiteClick" style="cursor: pointer;">+</b-icon-plus>
            <b-modal v-model="modal.addSite.show" size="md" title="Edit RNA modification site list" ok-only>
                <div class="border-top"></div>
                <div v-for="site in allSites" :key="site" :style="inclusionStyle((siteOrder.indexOf(site) !== -1))" class="text-center border-bottom">
                    <!-- Delete button -->
                    <b-icon-x v-if="(siteOrder.length > 1) && (siteOrder.indexOf(site) !== -1)" @click="removeSite(site)" class="icon float-left" style="display: block; height: 30px; line-height: 30px; cursor: pointer;"></b-icon-x>
                    <!-- Add button -->
                    <b-icon-plus v-if="siteOrder.indexOf(site) === -1" @click="addSite(site)" class="icon float-left" style="display: block; height: 30px; line-height: 30px; cursor: pointer;"></b-icon-plus>
                    <!-- Site -->
                    {{site}}
                </div>
            </b-modal>
        </b-col>

        <!-- Column W.2: RNA modification sites stack -->
        <b-col v-show="show_stack" class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
            <RNAModifSiteStack :base-axis="baseAxis" :site-order="site_data.siteOrder" ref="RNAModifStackComponent" class="grid-item mx-0 g-0" style="padding-left: 1rem !important; padding-right: 1rem !important;"></RNAModifSiteStack>
        </b-col>

        <!-- Column W.3: RNA modification levels -->
        <b-col v-show="heatmap_data_exists && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
            <RNAModifLevels :rnaModifLevelData="mainData.rnaModifLevelData" :site-order="site_data.siteOrder" ref="RNAModifLevelsComponent" class="grid-item mx-0 g-0 align-self-center" style="padding-left: 1rem !important; padding-right: 1rem !important;"></RNAModifLevels>
        </b-col>

    </b-row>

    <!-- Extra row: Nothing, nothing, and RNA modification levels legend -->
    <b-row v-show="!rna_modif_disabled && show_rna_modif && show_rna_modif_heatmap && mainData.rnaModifLevelData && show_heatmap_column && !rna_modif_compact_mode" class="border-bottom row18">

        <!-- Column X.1: Nothing -->
        <b-col cols="3">
        </b-col>

        <!-- Column X.2: Nothing -->
        <b-col v-show="show_stack" class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
        </b-col>

        <!-- Column X.3: RNA modification levels legend -->
        <b-col v-show="mainData.rnaModifLevelData && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
            <RNAModifLevelsLegend :rnaModifLevelData="mainData.rnaModifLevelData" ref="RNAModifLevelsLegendComponent" class="grid-item p-0 mx-0 my-3 g-0 text-center"></RNAModifLevelsLegend>
        </b-col>

    </b-row>

    <!-- Row 4: User isoforms label, nothing, and nothing -->
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
        <b-col class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
        </b-col>

        <!-- Column 4.3: Nothing -->
        <b-col v-show="heatmap_data_exists && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
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
            <b-modal v-model="modal.addIsoform.show" size="md" title="Edit isoform list" ok-only>
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
        <b-col v-show="show_stack" class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
            <IsoformStack :base-axis="baseAxis" :isoform-list="mainData.isoformData.isoformList" :orf-info="mainData.isoformData.orfs" ref="isoformStackComponent" class="grid-item mx-0 g-0" style="padding-left: 1rem !important; padding-right: 1rem !important;"></IsoformStack>
        </b-col>

        <!-- Column 5.3: Heatmap -->
        <b-col v-show="heatmap_data_exists && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
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
        <b-col v-show="show_stack" class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9">
            <GeneStrand :base-axis="baseAxis" :chromosome="mainData.isoformData.chromosome" :is-strand-unknown="mainData.isoformData.is_strand_unknown" :is-strandedness-mismatched="is_strandedness_mismatched" ref="geneStrandComponent" class="grid-item p-3 mx-0 my-1 g-0"/>
        </b-col>

        <!-- Column 6.3: Sample labels + heatmap legend -->
        <b-col v-show="heatmap_data_exists && show_heatmap_column" class="col3" :cols="show_stack ? 3 : 9">
            <HeatmapLegend :heatmapData="mainData.heatmapData" ref="heatmapLegendComponent" class="grid-item p-0 mx-0 my-3 g-0 text-center"></HeatmapLegend>
        </b-col>

    </b-row>

    <!-- Row 7: Nothing, gene strand explanation, and nothing -->
    <b-row class="row7">

        <!-- Column 7.1: Nothing -->
        <b-col class="col1" cols="3">
        </b-col>

        <!-- Column 7.2: Gene strand explanation -->
        <b-col v-show="show_stack" class="col2" :cols="(heatmap_data_exists && show_heatmap_column) ? 6 : 9" style="text-align: center">
            <b-link href="help_gene_strand/" target="_blank">What is this diagram?</b-link>
        </b-col>

        <!-- Column 7.3: Nothing -->
        <b-col class="col3" :cols="show_stack ? 3 : 9">
        </b-col>

    </b-row>

</b-container>
</template>

<script>
import { createBaseAxis } from '~/assets/base_axis';
import { CanonData, OtherIsoformData, ProteinData, mergeRanges, calculateSplicedRegions, calculateRelativeHeights, calculateRelativeHeightsAll } from '~/assets/data_parser';
import { put_in_svg, put_in_symbol, put_in_hyperlink, use, put_in_protein_symbol, isovis_logo_symbol, line, rect, rounded_rect, text_preserve_whitespace_central_baseline, text_double_centered, text_topped_centered, tspan } from '~/assets/svg_utils';
import draggable from 'vuedraggable';
import { BButton, BCol, BContainer, BDropdown, BDropdownItem, BForm, BFormCheckbox, BIconArrowsCollapse, BIconArrowsExpand, BIconCheck, BIconList, BIconPlus, BIconSortAlphaDown, BIconSortAlphaDownAlt, BIconX, BImg, BLink, BModal, BRow, BSpinner, VBTooltip } from 'bootstrap-vue';

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
        BIconArrowsCollapse,
        BIconArrowsExpand,
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
                },
                addOtherIsoform:
                {
                    show: false,
                },
                addPeptide:
                {
                    show: false,
                },
                addSite:
                {
                    show: false,
                }
            },

            show_protein: true,
            show_domains: true,
            show_motifs: true,
            show_protein_labels: false,
            show_orfs: false,
            show_user_orfs: false,
            show_peptide: false,

            peptide_compact_mode: false,
            peptide_highlight_mode: false,
            peptide_integration_mode: false,

            show_splices: false,
            show_constitutive_junctions: false,

            show_rna_modif: false,
            rna_modif_compact_mode: false,

            show_canon: true,
            show_stack: true,
            show_heatmap_column: true,
            showCanonLoading: true,

            show_peptide_heatmap: false,
            hide_peptide_heatmap_labels: false,
            show_rna_modif_heatmap: false,
            hide_rna_modif_heatmap_labels: false,
            show_isoform_heatmap: false,
            hide_isoform_heatmap_labels: false,

            protein_disabled: false,
            canon_disabled: false,
            peptide_disabled: true,
            rna_modif_disabled: true,

            is_other_isoforms_button_clicked: false,
            show_all_other_isoforms: false,
            other_isoforms_loading: false,
            other_isoforms_disabled: false,
            other_isoforms_resize: false,
            other_isoforms_toggled: false,
            other_isoform_data: false,

            transcriptIds: [],
            transcriptNames: {},
            species_to_prefix: {},
            is_gene_on_ensembl: false,
            transcript_names_ready: false,
            orfs_ready: false,
            no_orfs: true,
            no_user_orfs: true,
            protein_ready: false,
            labels_ready: false,
            labels: {"ensembl": "", "uniprot": "", "uniparc": "", "interpro_source_database": ""},
            isoform_heatmap_log_transform: false,

            canondata_ranges: [],
            canondata_start: -1,
            canondata_end: -1,

            peptideOrder: [],
            allPeptides: [],
            peptide_data: false,

            siteOrder: [],
            allSites: [],
            site_data: false,

            other_isoforms_ids: [],
            other_isoforms_ranges: [],
            other_isoforms_start: -1,
            other_isoforms_end: -1,

            spliced_regions: null,
            relative_heights: null,
            relative_heights_all: null,
            is_spliced_regions_outdated: false,

            constitutive_junctions_exist: false,

            is_strandedness_mismatched: false,

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

        otherIsoformList()
        {
            let data = [];
            if (this.other_isoform_data && this.other_isoform_data.allIsoforms)
            {
                for (let isoform of this.other_isoform_data.allIsoforms)
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
        },

        heatmap_data_exists()
        {
            return (this.mainData.heatmapData || this.mainData.peptideCountsData || this.mainData.rnaModifLevelData);
        },

        protein_labels_visible()
        {
            return (this.protein_diagram_visible && this.show_protein_labels);
        },

        protein_diagram_visible()
        {
            return (!this.protein_disabled && this.protein_ready && this.show_canon && this.show_stack && this.show_protein);
        },

        protein_mappings_visible()
        {
            return (this.protein_diagram_visible && (this.show_domains || this.show_motifs));
        },

        canonical_isoform_visible()
        {
            return (!this.canon_disabled && (this.mainData.canonData && (Object.keys(this.mainData.canonData).length !== 0)) && this.show_canon && this.show_stack);
        },

        peptide_stack_visible()
        {
            return (!this.peptide_disabled && this.show_stack && this.show_peptide);
        },

        peptide_heatmap_visible()
        {
            return (!this.peptide_disabled && this.show_peptide && this.show_peptide_heatmap && this.mainData.peptideCountsData && this.show_heatmap_column && !this.peptide_compact_mode);
        },

        peptide_heatmap_legend_visible()
        {
            return this.peptide_heatmap_visible;
        },

        splice_graph_visible()
        {
            return (this.show_splices && this.show_stack);
        },

        other_ensembl_isoforms_visible()
        {
            return (this.is_other_isoforms_button_clicked && !this.other_isoforms_disabled && !this.other_isoforms_loading && this.show_all_other_isoforms && this.show_stack);
        },

        rna_modification_sites_visible()
        {
            return (!this.rna_modif_disabled && this.show_rna_modif && this.show_stack);
        },

        rna_modification_levels_visible()
        {
            return (!this.rna_modif_disabled && this.show_rna_modif && this.mainData.rnaModifLevelData && this.show_heatmap_column && !this.rna_modif_compact_mode && this.show_rna_modif_heatmap);
        },

        rna_modification_levels_legend_visible()
        {
            return this.rna_modification_levels_visible;
        },

        isoform_stack_visible()
        {
            return this.show_stack;
        },

        gene_strand_visible()
        {
            return this.isoform_stack_visible;
        },

        isoform_heatmap_visible()
        {
            return (this.mainData.heatmapData && this.show_isoform_heatmap && this.show_heatmap_column);
        },

        isoform_heatmap_legend_visible()
        {
            return this.isoform_heatmap_visible;
        },

        visible_components_exist()
        {
            return (this.protein_labels_visible ||
                    this.protein_diagram_visible ||
                    this.protein_mappings_visible ||
                    this.canonical_isoform_visible ||
                    this.peptide_stack_visible ||
                    this.peptide_heatmap_visible ||
                    this.peptide_heatmap_legend_visible ||
                    this.splice_graph_visible ||
                    this.other_ensembl_isoforms_visible ||
                    this.rna_modification_sites_visible ||
                    this.rna_modification_levels_visible ||
                    this.rna_modification_levels_legend_visible ||
                    this.isoform_stack_visible ||
                    this.gene_strand_visible ||
                    this.isoform_heatmap_visible ||
                    this.isoform_heatmap_legend_visible);
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
            this.setShowIsoformHeatmap(true);
            this.setShowHeatmapColumn(true);
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

        onOtherEnd(evt)
        {
            let orig_isoformlist = JSON.parse(JSON.stringify(this.other_isoform_data.isoformList));
            let new_isoformlist = [];
            for (let transcript_id of this.other_isoforms_ids)
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

            this.other_isoform_data.transcriptOrder = JSON.parse(JSON.stringify(this.other_isoforms_ids));
            this.other_isoform_data.isoformList = JSON.parse(JSON.stringify(new_isoformlist));

            this.is_dragging_done = true;
        },

        onPeptideEnd(evt)
        {
            this.peptide_data.peptideOrder = JSON.parse(JSON.stringify(this.peptideOrder));
            this.is_dragging_done = true;
        },

        onSiteEnd(evt)
        {
            this.site_data.siteOrder = JSON.parse(JSON.stringify(this.siteOrder));
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

        addOtherClick()
        {
            this.modal.addOtherIsoform.show = true;
        },

        addPeptideClick()
        {
            this.modal.addPeptide.show = true;
        },

        addSiteClick()
        {
            this.modal.addSite.show = true;
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

            let [shown_text_and_links, shown_canonical_text_and_links, shown_peptide_texts, shown_other_text_and_links, shown_rna_site_texts, protein_info_first_line, protein_info_second_line, protein_info_third_line] = this.determineLeftSideTexts();
            let [longest_text_width, protein_first_line, protein_second_line, protein_third_line] = this.determineLeftSideTextMaxWidth(shown_text_and_links, shown_canonical_text_and_links, shown_peptide_texts, shown_other_text_and_links, shown_rna_site_texts, protein_info_first_line, protein_info_second_line, protein_info_third_line);

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

            // Deal with the case when only the heatmap column is shown
            if (!this.show_stack)
            {
                // All the information for the second column
                let [isoform_heatmap_width, isoform_heatmap_height, isoform_heatmap_symbol] = (this.isoform_heatmap_visible) ? this.$refs.heatmapComponent.buildHeatmapSvg(true) : [-1, -1, null];
                let [isoform_heatmap_legend_width, isoform_heatmap_legend_height, isoform_heatmap_legend_symbol] = (this.isoform_heatmap_legend_visible) ? this.$refs.heatmapLegendComponent.buildHeatmapLegendSvg(true) : [-1, -1, null];
                let [rna_modif_heatmap_width, rna_modif_heatmap_height, rna_modif_heatmap_symbol] = (this.rna_modification_levels_visible) ? this.$refs.RNAModifLevelsComponent.buildHeatmapSvg(true) : [-1, -1, null];
                let [rna_modif_heatmap_legend_width, rna_modif_heatmap_legend_height, rna_modif_heatmap_legend_symbol] = (this.rna_modification_levels_legend_visible) ? this.$refs.RNAModifLevelsLegendComponent.buildHeatmapLegendSvg(true) : [-1, -1, null];
                let [peptide_heatmap_width, peptide_heatmap_height, peptide_heatmap_symbol] = (this.peptide_heatmap_visible) ? this.$refs.peptideCountsComponent.buildHeatmapSvg(true) : [-1, -1, null];
                let [peptide_heatmap_legend_width, peptide_heatmap_legend_height, peptide_heatmap_legend_symbol] = (this.peptide_heatmap_legend_visible) ? this.$refs.peptideCountsLegendComponent.buildHeatmapLegendSvg(true) : [-1, -1, null];

                let second_column_width = Math.max(isoform_heatmap_width, isoform_heatmap_legend_width, rna_modif_heatmap_width, rna_modif_heatmap_legend_width, peptide_heatmap_width, peptide_heatmap_legend_width);

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
                y += main_gene_text_height + 15;

                // Peptide list and peptide counts heatmap
                if (!this.peptide_disabled && this.show_peptide)
                {
                    // Draw the 'Peptides (beta):' label
                    svg += text_topped_centered("Peptides (beta):", x, y, 16, "sans-serif");

                    {
                        let text_metrics = text_metrics_canvas_ctx.measureText("Peptides (beta):");
                        y += text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent + 5;
                    }

                    let line_y = -1;
                    if (!((peptide_heatmap_width === -1) || (peptide_heatmap_height === -1) || !peptide_heatmap_symbol))
                    {
                        line_y = Math.ceil(y + peptide_heatmap_height + 10);

                        // Draw the peptide counts heatmap
                        svg += put_in_symbol("peptide_counts_heatmap", peptide_heatmap_width, peptide_heatmap_height, peptide_heatmap_symbol);
                        svg += use("#peptide_counts_heatmap", 50 + longest_text_width + 50, y);
                    }

                    // Draw all shown peptides
                    y += 15;
                    for (let peptide_text of shown_peptide_texts)
                    {
                        if (peptide_text === "Peptides (beta):")
                            continue;

                        let text_elem = text_double_centered(peptide_text, x, y, 16, "sans-serif", "");
                        svg += text_elem;
                        y += 1 + 30;
                    }

                    y -= 15;

                    if (line_y !== -1)
                        y = line_y;

                    svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                    y += 15;
                }

                // Peptide counts heatmap legend
                if (!((peptide_heatmap_legend_width === -1) || (peptide_heatmap_legend_height === -1) || !peptide_heatmap_legend_symbol))
                {
                    y -= 5;

                    svg += put_in_symbol("peptide_counts_heatmap_legend", peptide_heatmap_legend_width, peptide_heatmap_legend_height, peptide_heatmap_legend_symbol);
                    svg += use("#peptide_counts_heatmap_legend", 50 + longest_text_width + 50, y);

                    y = Math.ceil(y + peptide_heatmap_legend_height) + 10;

                    svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                    y += 15;
                }

                // RNA modification sites list and RNA modification levels heatmap
                if (!this.rna_modif_disabled && this.show_rna_modif)
                {
                    // Draw the 'RNA modification sites (beta):' label
                    svg += text_topped_centered("RNA modification sites (beta):", x, y, 16, "sans-serif");

                    {
                        let text_metrics = text_metrics_canvas_ctx.measureText("RNA modification sites (beta):");
                        y += text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent + 5;
                    }

                    let line_y = -1;
                    if (!((rna_modif_heatmap_width === -1) || (rna_modif_heatmap_height === -1) || !rna_modif_heatmap_symbol))
                    {
                        line_y = Math.ceil(y + rna_modif_heatmap_height + 10);

                        // Draw the RNA modification levels heatmap
                        svg += put_in_symbol("rna_modification_levels_heatmap", rna_modif_heatmap_width, rna_modif_heatmap_height, rna_modif_heatmap_symbol);
                        svg += use("#rna_modification_levels_heatmap", 50 + longest_text_width + 50, y);
                    }

                    // Draw all shown RNA modification site coordinates
                    y += 15;
                    for (let site_text of shown_rna_site_texts)
                    {
                        if (site_text === "RNA modification sites (beta):")
                            continue;

                        let text_elem = text_double_centered(site_text, x, y, 16, "sans-serif", "");
                        svg += text_elem;
                        y += 1 + 30;
                    }

                    y -= 15;

                    if (line_y !== -1)
                        y = line_y;

                    svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                    y += 15;
                }

                // RNA modification levels heatmap legend
                if (!((rna_modif_heatmap_legend_width === -1) || (rna_modif_heatmap_legend_height === -1) || !rna_modif_heatmap_legend_symbol))
                {
                    y -= 5;

                    svg += put_in_symbol("rna_modification_levels_heatmap_legend", rna_modif_heatmap_legend_width, rna_modif_heatmap_legend_height, rna_modif_heatmap_legend_symbol);
                    svg += use("#rna_modification_levels_heatmap_legend", 50 + longest_text_width + 50, y);

                    y = Math.ceil(y + rna_modif_heatmap_legend_height) + 10;

                    svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                    y += 15;
                }

                // The accession list

                // Draw the 'User isoforms:' label
                svg += text_topped_centered("User isoforms:", x, y, 16, "sans-serif");

                {
                    let text_metrics = text_metrics_canvas_ctx.measureText("User isoforms:");
                    y += text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent + 5;
                }

                // Draw the isoform heatmap
                if (!((isoform_heatmap_width === -1) || (isoform_heatmap_height === -1) || !isoform_heatmap_symbol))
                {
                    svg += put_in_symbol("isoform_heatmap", isoform_heatmap_width, isoform_heatmap_height, isoform_heatmap_symbol);
                    svg += use("#isoform_heatmap", 50 + longest_text_width + 50, y);
                }

                let line_y = -1;
                if (isoform_heatmap_height !== -1)
                    line_y = Math.ceil(y + isoform_heatmap_height + 10);

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

                y -= 30;

                // Draw the grey horizontal line
                if (line_y !== -1)
                    y = line_y;

                svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                y += 10;

                // Draw the IsoVis logo
                svg += isovis_logo_symbol("logo", 123.75, 120);
                svg += use("#logo", 50 + (longest_text_width - 123.75) / 2, y);

                // Draw the isoform heatmap legend
                if (!((isoform_heatmap_legend_width === -1) || (isoform_heatmap_legend_height === -1) || !isoform_heatmap_legend_symbol))
                {
                    svg += put_in_symbol("isoform_heatmap_legend", isoform_heatmap_legend_width, isoform_heatmap_legend_height, isoform_heatmap_legend_symbol);
                    svg += use("#isoform_heatmap_legend", 50 + longest_text_width + 50, y);
                }

                // Determine the SVG height
                let svg_height = Math.ceil(Math.max(y + 120, y + isoform_heatmap_legend_height)) + 20;

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

            let protein_labels_shown = this.protein_labels_visible;
            let protein_shown = this.protein_diagram_visible;
            let canon_shown = this.canonical_isoform_visible;
            let peptide_shown = this.peptide_stack_visible;
            let splice_graph_shown = this.splice_graph_visible;
            let other_isoforms_shown = this.other_ensembl_isoforms_visible;
            let rna_modification_sites_shown = this.rna_modification_sites_visible;
            let isoform_heatmap_shown = this.isoform_heatmap_visible;

            // All the information for the second column
            let [protein_labels_width, protein_labels_height, protein_labels_symbol] = (protein_labels_shown) ? this.$refs.proteinLabelsComponent.buildProteinLabelsSvg(true) : [-1, -1, null];
            let [protein_width, protein_height, protein_symbol] = (protein_shown) ? this.$refs.proteinComponent.buildProteinSvg(true) : [-1, -1, null];
            let [protein_map_width, protein_map_height, protein_map_symbol] = (protein_shown) ? this.$refs.proteinComponent.buildProteinMapSvg(true) : [-1, -1, null];
            let [canon_track_width, canon_track_height, canon_track_symbol] = (canon_shown) ? this.$refs.canonStackComponent.buildStackSvg(true) : [-1, -1, null];
            let [peptide_stack_width, peptide_stack_height, peptide_stack_symbol] = (peptide_shown && this.mainData.isoformData.is_genomeprot) ? this.$refs.peptideGenomeProtStackComponent.buildStackSvg(true)
                                                                                                                                               : ((peptide_shown && !this.mainData.isoformData.is_genomeprot) ? this.$refs.peptideStackComponent.buildStackSvg(true) : [-1, -1, null]);
            let [splice_graph_width, splice_graph_height, splice_graph_symbol] = (splice_graph_shown) ? this.$refs.spliceGraphComponent.buildGraphSvg(true) : [-1, -1, null];
            let [other_isoforms_width, other_isoforms_height, other_isoforms_symbol] = (other_isoforms_shown) ? this.$refs.otherIsoformStackComponent.buildStackSvg(true) : [-1, -1, null];
            let [rna_modif_stack_width, rna_modif_stack_height, rna_modif_stack_symbol] = (rna_modification_sites_shown) ? this.$refs.RNAModifStackComponent.buildStackSvg(true) : [-1, -1, null];
            let [isoform_stack_width, isoform_stack_height, isoform_stack_symbol] = this.$refs.isoformStackComponent.buildStackSvg(true);
            let [gene_strand_width, gene_strand_height, gene_strand_symbol] = this.$refs.geneStrandComponent.buildStrandSvg(true);

            let second_column_width = Math.max(protein_width, protein_map_width, canon_track_width, isoform_stack_width, gene_strand_width);

            // All the information for the third column
            let [isoform_heatmap_width, isoform_heatmap_height, isoform_heatmap_symbol] = (isoform_heatmap_shown) ? this.$refs.heatmapComponent.buildHeatmapSvg(true) : [-1, -1, null];
            let [isoform_heatmap_legend_width, isoform_heatmap_legend_height, isoform_heatmap_legend_symbol] = (isoform_heatmap_shown) ? this.$refs.heatmapLegendComponent.buildHeatmapLegendSvg(true) : [-1, -1, null];
            let [rna_modif_heatmap_width, rna_modif_heatmap_height, rna_modif_heatmap_symbol] = (this.rna_modification_levels_visible) ? this.$refs.RNAModifLevelsComponent.buildHeatmapSvg(true) : [-1, -1, null];
            let [rna_modif_heatmap_legend_width, rna_modif_heatmap_legend_height, rna_modif_heatmap_legend_symbol] = (this.rna_modification_levels_legend_visible) ? this.$refs.RNAModifLevelsLegendComponent.buildHeatmapLegendSvg(true) : [-1, -1, null];
            let [peptide_heatmap_width, peptide_heatmap_height, peptide_heatmap_symbol] = (this.peptide_heatmap_visible) ? this.$refs.peptideCountsComponent.buildHeatmapSvg(true) : [-1, -1, null];
            let [peptide_heatmap_legend_width, peptide_heatmap_legend_height, peptide_heatmap_legend_symbol] = (this.peptide_heatmap_legend_visible) ? this.$refs.peptideCountsLegendComponent.buildHeatmapLegendSvg(true) : [-1, -1, null];

            let third_column_width = Math.max(-1, isoform_heatmap_width, isoform_heatmap_legend_width, rna_modif_heatmap_width, rna_modif_heatmap_legend_width, peptide_heatmap_width, peptide_heatmap_legend_width);

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
                bottom_y1 = Math.ceil(bottom_y1 + protein_third_line_height + 5) + 5;

                // Draw the protein domain and motif diagram
                y = 20 + main_gene_text_height + 10;
                if (protein_labels_shown && !((protein_labels_width === -1) || (protein_labels_height === -1) || !protein_labels_symbol))
                    y += protein_labels_height;

                // Add the height of the protein diagram
                if (!((protein_width === -1) || (protein_height === -1) || !protein_symbol))
                    y += protein_height;

                // Add the height of the protein mapping diagram
                if (!((protein_map_width === -1) || (protein_map_height === -1) || !protein_map_symbol))
                    y += protein_map_height;

                // Draw the grey horizontal line
                let bottom_y2 = Math.ceil(y);
                y = Math.max(bottom_y1, bottom_y2) + 1;
                svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                // Draw the third line of the protein info
                let temp_y = y - protein_third_line_height - 5 - 5;
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

                temp_y = y - 1;

                // Draw the protein mapping diagram
                if (!((protein_map_width === -1) || (protein_map_height === -1) || !protein_map_symbol))
                {
                    temp_y -= protein_map_height;
                    svg += put_in_symbol("protein_map", protein_map_width, protein_map_height, protein_map_symbol);
                    svg += use("#protein_map", 50 + longest_text_width + 50, temp_y);
                }

                // Draw the protein diagram
                if (!((protein_width === -1) || (protein_height === -1) || !protein_symbol))
                {
                    temp_y -= protein_height;
                    svg += put_in_protein_symbol("protein", protein_width, protein_height, protein_symbol);
                    svg += use("#protein", 50 + longest_text_width + 50, temp_y);
                }

                // Spacing
                y += 5;
            }

            // The canonical isoform
            if (canon_shown)
            {
                // Draw the 'Canonical isoform:' label
                svg += text_topped_centered("Canonical isoform:", x, y + 2, 16, "sans-serif");

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
                svg += text_topped_centered(tspan_elems, x, y - text_metrics.actualBoundingBoxAscent - text_metrics.actualBoundingBoxDescent - 2 - 2, 16, "sans-serif");

                y += 15;
            }

            // Peptide stack and peptide counts heatmap
            if (peptide_shown)
            {
                // Draw the 'Peptides (beta):' label
                svg += text_topped_centered("Peptides (beta):", x, y, 16, "sans-serif");

                {
                    let text_metrics = text_metrics_canvas_ctx.measureText("Peptides (beta):");
                    y += text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent + 5;
                }

                // Draw the peptide highlight legend if it is shown
                if (this.mainData.isoformData.is_genomeprot && this.show_stack)
                {
                    y += 5;

                    let peptide_highlight_legend_text = "Uniquely map to" + "  " + "ORF >" + "  " + "Gene";
                    let text_metrics = text_metrics_canvas_ctx.measureText(peptide_highlight_legend_text);
                    let peptide_highlight_legend_text_height = Math.max(text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent, 16);
                    let peptide_highlight_legend_text_width = text_metrics.width + 16 * 3;
                    let peptide_highlight_legend_elems = "";

                    peptide_highlight_legend_elems += text_preserve_whitespace_central_baseline("Uniquely map to ", x - peptide_highlight_legend_text_width / 2, y + peptide_highlight_legend_text_height / 2, 16, "sans-serif");
                    peptide_highlight_legend_elems += rect(x - peptide_highlight_legend_text_width / 2 + text_metrics_canvas_ctx.measureText("Uniquely map to ").width, y, 16, 16, "#ff9500");
                    peptide_highlight_legend_elems += text_preserve_whitespace_central_baseline(" ORF > ", x - peptide_highlight_legend_text_width / 2 + text_metrics_canvas_ctx.measureText("Uniquely map to ").width + 16, y + peptide_highlight_legend_text_height / 2, 16, "sans-serif");
                    peptide_highlight_legend_elems += rect(x - peptide_highlight_legend_text_width / 2 + text_metrics_canvas_ctx.measureText("Uniquely map to ").width + 16 + text_metrics_canvas_ctx.measureText(" ORF > ").width, y, 16, 16, "#0000ff");
                    peptide_highlight_legend_elems += text_preserve_whitespace_central_baseline(" Gene", x - peptide_highlight_legend_text_width / 2 + text_metrics_canvas_ctx.measureText("Uniquely map to ").width + 16 + text_metrics_canvas_ctx.measureText(" ORF > ").width + 16, y + peptide_highlight_legend_text_height / 2, 16, "sans-serif");

                    svg += peptide_highlight_legend_elems;

                    y += peptide_highlight_legend_text_height + 5;
                }

                // Draw the peptide stack
                let line_y = -1;
                if (!((peptide_stack_width === -1) || (peptide_stack_height === -1) || !peptide_stack_symbol))
                {
                    line_y = Math.ceil(y + peptide_stack_height);
                    svg += put_in_symbol("peptide_stack", peptide_stack_width, peptide_stack_height, peptide_stack_symbol);
                    svg += use("#peptide_stack", 50 + longest_text_width + 50, y);
                }

                // Draw the peptide counts heatmap
                if (!((peptide_heatmap_width === -1) || (peptide_heatmap_height === -1) || !peptide_heatmap_symbol))
                {
                    line_y = Math.max(Math.ceil(y + peptide_heatmap_height + 10), line_y);
                    svg += put_in_symbol("peptide_counts_heatmap", peptide_heatmap_width, peptide_heatmap_height, peptide_heatmap_symbol);
                    svg += use("#peptide_counts_heatmap", 50 + longest_text_width + 50 + second_column_width + 50, y);
                }

                // Draw all shown peptides
                y += 15;
                for (let peptide_text of shown_peptide_texts)
                {
                    if ((peptide_text === "Peptides (beta):") || (peptide_text === "Uniquely map to" + "  " + "ORF >" + "  " + "Gene"))
                        continue;

                    let text_elem = text_double_centered(peptide_text, x, y, 16, "sans-serif", "");
                    svg += text_elem;
                    y += 1 + 30;
                }

                y -= 15;

                if (line_y !== -1)
                    y = line_y;

                svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                y += 15;
            }

            // Peptide counts heatmap legend
            if (!((peptide_heatmap_legend_width === -1) || (peptide_heatmap_legend_height === -1) || !peptide_heatmap_legend_symbol))
            {
                y -= 5;

                svg += put_in_symbol("peptide_counts_heatmap_legend", peptide_heatmap_legend_width, peptide_heatmap_legend_height, peptide_heatmap_legend_symbol);
                svg += use("#peptide_counts_heatmap_legend", 50 + longest_text_width + 50 + second_column_width + 50, y);

                y = Math.ceil(y + peptide_heatmap_legend_height) + 10;

                svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                y += 15;
            }

            // Splice differences graph
            if (splice_graph_shown)
            {
                // Draw the 'Splice differences graph:' label
                svg += text_topped_centered("Splice differences graph:", x, y, 16, "sans-serif");

                // Draw the splice differences graph
                let line_y = -1;
                if (!((splice_graph_width === -1) || (splice_graph_height === -1) || !splice_graph_symbol))
                {
                    line_y = Math.ceil(y + splice_graph_height);
                    svg += put_in_symbol("splice_graph", splice_graph_width, splice_graph_height, splice_graph_symbol);
                    svg += use("#splice_graph", 50 + longest_text_width + 50, y);
                }

                if (line_y !== -1)
                    y = line_y;

                svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                y += 15;
            }

            // Other Ensembl isoforms
            if (other_isoforms_shown)
            {
                // Draw the 'Other Ensembl isoforms:' label
                svg += text_topped_centered("Other Ensembl isoforms:", x, y, 16, "sans-serif");

                {
                    let text_metrics = text_metrics_canvas_ctx.measureText("Other Ensembl isoforms:");
                    y += text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent + 5;
                }

                // Draw the other Ensembl isoforms stack
                let line_y = -1;
                if (!((other_isoforms_width === -1) || (other_isoforms_height === -1) || !other_isoforms_symbol))
                {
                    line_y = Math.ceil(y + other_isoforms_height + 10);
                    svg += put_in_symbol("other_isoforms_stack", other_isoforms_width, other_isoforms_height, other_isoforms_symbol);
                    svg += use("#other_isoforms_stack", 50 + longest_text_width + 50, y);
                }

                // Draw all shown isoform texts
                y += 25;
                for (let [isoform_text, hyperlink] of shown_other_text_and_links)
                {
                    if (isoform_text === "Other Ensembl isoforms:")
                        continue;

                    let fill = (hyperlink) ? "#007bff" : "";
                    let text_elem = text_double_centered(isoform_text, x, y, 16, "sans-serif", fill);

                    if (hyperlink)
                        text_elem = put_in_hyperlink(hyperlink, text_elem);

                    svg += text_elem;

                    y += 1 + 50;
                }

                if (line_y !== -1)
                    y = line_y;

                svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                y += 15;
            }

            // RNA modification sites stack and RNA modification levels heatmap
            if (rna_modification_sites_shown)
            {
                // Draw the 'RNA modification sites (beta):' label
                svg += text_topped_centered("RNA modification sites (beta):", x, y, 16, "sans-serif");

                {
                    let text_metrics = text_metrics_canvas_ctx.measureText("RNA modification sites (beta):");
                    y += text_metrics.actualBoundingBoxAscent + text_metrics.actualBoundingBoxDescent + 5;
                }

                // Draw the RNA modification sites stack
                let line_y = -1;
                if (!((rna_modif_stack_width === -1) || (rna_modif_stack_height === -1) || !rna_modif_stack_symbol))
                {
                    line_y = Math.ceil(y + rna_modif_stack_height + 10);
                    svg += put_in_symbol("rna_modification_sites_stack", rna_modif_stack_width, rna_modif_stack_height, rna_modif_stack_symbol);
                    svg += use("#rna_modification_sites_stack", 50 + longest_text_width + 50, y);
                }

                // Draw the RNA modification levels heatmap
                if (!((rna_modif_heatmap_width === -1) || (rna_modif_heatmap_height === -1) || !rna_modif_heatmap_symbol))
                {
                    line_y = Math.max(Math.ceil(y + rna_modif_heatmap_height + 10), line_y);
                    svg += put_in_symbol("rna_modification_levels_heatmap", rna_modif_heatmap_width, rna_modif_heatmap_height, rna_modif_heatmap_symbol);
                    svg += use("#rna_modification_levels_heatmap", 50 + longest_text_width + 50 + second_column_width + 50, y);
                }

                // Draw all shown RNA modification site coordinates
                y += 15;
                for (let site_text of shown_rna_site_texts)
                {
                    if (site_text === "RNA modification sites (beta):")
                        continue;

                    let text_elem = text_double_centered(site_text, x, y, 16, "sans-serif", "");
                    svg += text_elem;
                    y += 1 + 30;
                }

                y -= 15;

                if (line_y !== -1)
                    y = line_y;

                svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                y += 15;
            }

            // RNA modification levels heatmap legend
            if (!((rna_modif_heatmap_legend_width === -1) || (rna_modif_heatmap_legend_height === -1) || !rna_modif_heatmap_legend_symbol))
            {
                y -= 5;

                svg += put_in_symbol("rna_modification_levels_heatmap_legend", rna_modif_heatmap_legend_width, rna_modif_heatmap_legend_height, rna_modif_heatmap_legend_symbol);
                svg += use("#rna_modification_levels_heatmap_legend", 50 + longest_text_width + 50 + second_column_width + 50, y);

                y = Math.ceil(y + rna_modif_heatmap_legend_height) + 10;

                svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

                y += 15;
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

            // Draw the isoform heatmap
            if (!((isoform_heatmap_width === -1) || (isoform_heatmap_height === -1) || !isoform_heatmap_symbol))
            {
                svg += put_in_symbol("isoform_heatmap", isoform_heatmap_width, isoform_heatmap_height, isoform_heatmap_symbol);
                svg += use("#isoform_heatmap", 50 + longest_text_width + 50 + second_column_width + 50, y);
            }

            let line_y = -1;
            if (isoform_heatmap_height !== -1)
                line_y = Math.ceil(y + isoform_heatmap_height + 10);

            line_y = Math.max(y + isoform_stack_height + 10, line_y);

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

            y -= 30;

            // Draw the grey horizontal line
            if (line_y !== -1)
                y = line_y;

            svg += line(0, y + 0.5, svg_width - 1, y + 0.5, "#dee2e6", 1);

            y += 10;

            // Draw the IsoVis logo
            svg += isovis_logo_symbol("logo", 123.75, 120);
            svg += use("#logo", 50 + (longest_text_width - 123.75) / 2, y);

            // Draw the gene strand diagram
            svg += put_in_symbol("gene_strand", gene_strand_width, gene_strand_height, gene_strand_symbol);
            svg += use("#gene_strand", 50 + longest_text_width + 50, y);

            // Draw the isoform heatmap legend
            if (!((isoform_heatmap_legend_width === -1) || (isoform_heatmap_legend_height === -1) || !isoform_heatmap_legend_symbol))
            {
                svg += put_in_symbol("isoform_heatmap_legend", isoform_heatmap_legend_width, isoform_heatmap_legend_height, isoform_heatmap_legend_symbol);
                svg += use("#isoform_heatmap_legend", 50 + longest_text_width + 50 + second_column_width + 50, y);
            }

            // Determine the SVG height
            let svg_height = Math.ceil(Math.max(y + 120, y + gene_strand_height, y + isoform_heatmap_legend_height)) + 20;

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

        determineLeftSideTextMaxWidth(shown_text_and_links, shown_canonical_text_and_links, shown_peptide_texts, shown_other_text_and_links, shown_rna_site_texts, protein_info_first_line, protein_info_second_line, protein_info_third_line)
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

            if (this.splice_graph_visible)
                shown_texts.push("Splice differences graph:");

            for (let line_text of shown_peptide_texts)
                shown_texts.push(line_text);

            for (let [line_text, ignored] of shown_other_text_and_links)
                shown_texts.push(line_text);

            for (let line_text of shown_rna_site_texts)
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

            // Also consider the peptide highlight legend if it is present
            if (!this.peptide_disabled && this.show_peptide && this.mainData.isoformData.is_genomeprot && this.show_stack)
            {
                let shown_text = "Uniquely map to" + "  " + "ORF >" + "  " + "Gene";
                let peptide_highlight_legend_line_width = text_width_canvas_ctx.measureText(shown_text).width + 16 * 3;
                longest_text_width = Math.max(longest_text_width, peptide_highlight_legend_line_width);
            }

            text_width_canvas.remove();

            return [longest_text_width, protein_first_line, protein_second_line, protein_third_line];
        },

        determineLeftSideTexts()
        {
            // Structure: An array of [text, hyperlink for the text if it exists]
            let shown_text_and_links = [["User isoforms:", null]];

            // Accession list (always visible)
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
            if (this.canonical_isoform_visible)
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

            let shown_peptide_texts = [];

            // Peptides
            if (!this.peptide_disabled && this.show_peptide)
            {
                shown_peptide_texts.push("Peptides (beta):");

                if (this.mainData.isoformData.is_genomeprot && this.show_stack)
                    shown_peptide_texts.push("Uniquely map to" + "  " + "ORF >" + "  " + "Gene");

                if (!this.peptide_compact_mode)
                {
                    for (let peptide of this.peptideOrder)
                        shown_peptide_texts.push(peptide);
                }
                else
                    shown_peptide_texts.push("(Compact mode enabled)");
            }

            let shown_other_text_and_links = [];

            // Other Ensembl isoforms
            if (this.other_ensembl_isoforms_visible)
            {
                shown_other_text_and_links.push(["Other Ensembl isoforms:", null]);

                for (let other_isoform_id of this.other_isoforms_ids)
                {
                    let shown_text = null;
                    let link = `https://${this.is_use_grch37 ? 'grch37.' : ''}ensembl.org/${this.species}/Transcript/Summary?db=core;g=${this.mainData.selectedGene};t=${other_isoform_id}`;

                    if (this.transcriptNames[other_isoform_id] === 'Novel')
                        shown_text = other_isoform_id;
                    else
                        shown_text = this.transcriptNames[other_isoform_id] + " (" + other_isoform_id + ')';

                    shown_other_text_and_links.push([shown_text, link]);
                }
            }

            let shown_rna_site_texts = [];

            // RNA modification sites
            if (!this.rna_modif_disabled && this.show_rna_modif)
            {
                shown_rna_site_texts.push("RNA modification sites (beta):");

                if (!this.rna_modif_compact_mode)
                {
                    for (let site of this.siteOrder)
                        shown_rna_site_texts.push(site.toString());
                }
                else
                    shown_rna_site_texts.push("(Compact mode enabled)");
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

            return [shown_text_and_links, shown_canonical_text_and_links, shown_peptide_texts, shown_other_text_and_links, shown_rna_site_texts, protein_info_first_line, protein_info_second_line, protein_info_third_line];
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

        exportPeptideSVG()
        {
            let svg = (this.mainData.isoformData.is_genomeprot) ? this.$refs.peptideGenomeProtStackComponent.buildStackSvg() : this.$refs.peptideStackComponent.buildStackSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_peptide_stack.svg` : 'IsoVis_peptide_stack.svg';
            link.click();
        },

        exportPeptideHeatmapSVG()
        {
            let svg = this.$refs.peptideCountsComponent.buildHeatmapSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_peptide_intensities_heatmap.svg` : 'IsoVis_peptide_intensities_heatmap.svg';
            link.click();
        },

        exportPeptideHeatmapLegendSVG()
        {
            let svg = this.$refs.peptideCountsLegendComponent.buildHeatmapLegendSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_peptide_intensities_heatmap_legend.svg` : 'IsoVis_peptide_intensities_heatmap_legend.svg';
            link.click();
        },

        exportSpliceGraphSVG()
        {
            let svg = this.$refs.spliceGraphComponent.buildGraphSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_splice_graph.svg` : 'IsoVis_splice_graph.svg';
            link.click();
        },

        exportOtherIsoformsSVG()
        {
            let svg = this.$refs.otherIsoformStackComponent.buildStackSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_other_isoforms.svg` : 'IsoVis_other_isoforms.svg';
            link.click();
        },

        exportRNAModificationSitesSVG()
        {
            let svg = this.$refs.RNAModifStackComponent.buildStackSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_rna_modification_sites.svg` : 'IsoVis_rna_modification_sites.svg';
            link.click();
        },

        exportRNAModificationLevelsSVG()
        {
            let svg = this.$refs.RNAModifLevelsComponent.buildHeatmapSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_rna_modification_levels.svg` : 'IsoVis_rna_modification_levels.svg';
            link.click();
        },

        exportRNAModificationLevelsLegendSVG()
        {
            let svg = this.$refs.RNAModifLevelsLegendComponent.buildHeatmapLegendSvg();
            let link = document.createElement('a');
            link.href = "data:image/svg;charset=utf-8," + encodeURIComponent(svg);
            link.download = this.mainData.selectedGene ? `IsoVis_${this.mainData.selectedGene}_rna_modification_levels_legend.svg` : 'IsoVis_rna_modification_levels_legend.svg';
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

            let is_other_isoforms_loaded = (this.other_isoform_data && this.other_isoform_data.isoformList && (this.other_isoform_data.isoformList.length >= 1));
            let is_canon_loaded = (!(!canonData || Object.keys(canonData).length == 0));
            let is_zoomed = ((this.zoom_start !== -1) && (this.zoom_end !== -1));

            // Determine the start and end of the genomic coordinate axis
            let start = -1;
            let end = -1;

            if (is_zoomed)
            {
                start = this.zoom_start;
                end = this.zoom_end;
            }
            else if (is_other_isoforms_loaded && this.show_all_other_isoforms)
            {
                start = this.other_isoforms_start;
                end = this.other_isoforms_end;
            }
            else if (is_canon_loaded)
            {
                start = this.canondata_start;
                end = this.canondata_end;
            }
            else
            {
                start = isoformData.start;
                end = isoformData.end;
            }

            if (start > end)
            {
                let temp = start;
                start = end;
                end = temp;
            }

            let width = end - start;
            let strand = isoformData.strand;

            // Determine the metagene regions
            let mergedRanges = [];
            if (is_other_isoforms_loaded && this.show_all_other_isoforms)
                mergedRanges = this.other_isoforms_ranges;
            else if (is_canon_loaded)
                mergedRanges = this.canondata_ranges;
            else
                mergedRanges = isoformData.mergedRanges;

            // Calculate or update the splcing regions
            let spliced_regions = this.spliced_regions;
            let relative_heights = this.relative_heights;
            let relative_heights_all = this.relative_heights_all;
            if (this.is_spliced_regions_outdated || !spliced_regions || !relative_heights || !relative_heights_all)
            {
                let isoform_list = JSON.parse(JSON.stringify(this.mainData.isoformData.allIsoforms)); // isoformList?
                if (is_other_isoforms_loaded && this.show_all_other_isoforms)
                {
                    let other_isoforms_list = JSON.parse(JSON.stringify(this.other_isoform_data.isoformList));
                    isoform_list = isoform_list.concat(other_isoforms_list);
                }
                if (is_canon_loaded && this.show_canon)
                {
                    let canon_isoform_list = JSON.parse(JSON.stringify(this.mainData.canonData.isoformList));
                    isoform_list = isoform_list.concat(canon_isoform_list);
                }

                let constitutive_junctions_exist = false;

                [spliced_regions, constitutive_junctions_exist] = calculateSplicedRegions(isoform_list);
                relative_heights = calculateRelativeHeights(spliced_regions);
                relative_heights_all = calculateRelativeHeightsAll(spliced_regions);

                this.spliced_regions = spliced_regions;
                this.relative_heights = relative_heights;
                this.relative_heights_all = relative_heights_all;
                this.is_spliced_regions_outdated = false;

                this.constitutive_junctions_exist = constitutive_junctions_exist;
            }

            
            // let new_baseaxis = createBaseAxis(width, start, end, strand, mergedRanges);
            let new_baseaxis = createBaseAxis(width, start, end, strand, mergedRanges, spliced_regions, relative_heights, relative_heights_all);

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
            let stack_isoform_list = JSON.parse(JSON.stringify(this.mainData.isoformData.allIsoforms));
            let isoform_list = canon_isoform_list.concat(stack_isoform_list);
            
            this.canondata_ranges = mergeRanges(isoform_list);
            this.canondata_start = this.mainData.isoformData.strand == '+' ? Math.min(this.mainData.isoformData.start, this.mainData.canonData.start) :
                Math.max(this.mainData.isoformData.start, this.mainData.canonData.start);
            this.canondata_end = this.mainData.isoformData.strand == '+' ? Math.max(this.mainData.isoformData.end, this.mainData.canonData.end) :
                Math.min(this.mainData.isoformData.end, this.mainData.canonData.end);

            this.zoom_start = this.canondata_start;
            this.zoom_end = this.canondata_end;
            this.is_zoom_reset = true;

            this.is_spliced_regions_outdated = true;

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
            if (this.mainData.peptideCountsData)
            {
                this.$refs.peptideCountsComponent.buildHeatmap();
                this.$refs.peptideCountsLegendComponent.buildHeatmapLegend();
            }
            if (this.mainData.rnaModifLevelData)
            {
                this.$refs.RNAModifLevelsComponent.buildHeatmap();
                this.$refs.RNAModifLevelsLegendComponent.buildHeatmapLegend();
            }
        },

        togglenormalization()
        {
            this.baseAxis.togglenormalization();
            this.$refs.isoformStackComponent.buildStack();
            this.$refs.otherIsoformStackComponent.buildStack();
            this.$refs.spliceGraphComponent.buildGraph();
            if (!this.canon_disabled)
                this.$refs.canonStackComponent.buildStack();
            if (!this.peptide_disabled)
            {
                if (!(this.mainData.isoformData.is_genomeprot))
                    this.$refs.peptideStackComponent.buildStack();
                else
                    this.$refs.peptideGenomeProtStackComponent.buildStack();
            }
            if (!this.rna_modif_disabled)
                this.$refs.RNAModifStackComponent.buildStack();
            this.$refs.geneStrandComponent.buildStrand();
            if (!this.protein_disabled)
                this.buildProteinComponent();
        },

        toggleReadDirection()
        {
            this.baseAxis.reverse();
            this.$refs.isoformStackComponent.buildStack();
            this.$refs.otherIsoformStackComponent.buildStack();
            this.$refs.spliceGraphComponent.buildGraph();
            if (!this.canon_disabled)
                this.$refs.canonStackComponent.buildStack();
            if (!this.peptide_disabled)
            {
                if (!(this.mainData.isoformData.is_genomeprot))
                    this.$refs.peptideStackComponent.buildStack();
                else
                    this.$refs.peptideGenomeProtStackComponent.buildStack();
            }
            if (!this.rna_modif_disabled)
                this.$refs.RNAModifStackComponent.buildStack();
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

        setShowPeptide(state)
        {
            this.show_peptide = state;
            if (this.show_peptide === false)
            {
                this.peptide_compact_mode = false;
                if (!(this.mainData.isoformData.is_genomeprot))
                    this.$refs.peptideStackComponent.is_compact = false;
                else
                    this.$refs.peptideGenomeProtStackComponent.is_compact = false;
                this.$refs.peptideCountsComponent.is_compact = false;
                this.setShowPeptideHeatmap(false);
            }
            else if (this.mainData.peptideCountsData)
            {
                this.show_peptide_heatmap = state;
                this.$refs.peptideCountsComponent.show_peptide_heatmap = state;
                this.$refs.peptideCountsLegendComponent.show_peptide_heatmap = state;
            }

            this.resizePage();
        },

        setPeptideCompact(state)
        {
            this.peptide_compact_mode = state;
            if (!(this.mainData.isoformData.is_genomeprot))
                this.$refs.peptideStackComponent.is_compact = state;
            else
                this.$refs.peptideGenomeProtStackComponent.is_compact = state;
            this.$refs.peptideCountsComponent.is_compact = state;

            if (this.peptide_compact_mode === true)
            {
                this.show_peptide = true;
                if (this.mainData.peptideCountsData)
                    this.setShowPeptideHeatmap(false);
            }
            else if (this.mainData.peptideCountsData)
                this.setShowPeptideHeatmap(true);

            this.resizePage();
        },

        setPeptideHighlight(state)
        {
            this.peptide_integration_mode = false;

            this.peptide_highlight_mode = state;
            if (this.mainData.isoformData.is_genomeprot)
                this.$refs.peptideGenomeProtStackComponent.is_set_highlight = state;
            if (!this.peptide_highlight_mode)
            {
                this.$refs.peptideGenomeProtStackComponent.highlighted_peptide = "";
                this.$refs.isoformStackComponent.ump_orfs_to_highlight = [];
                this.$refs.isoformStackComponent.ump_transcripts_to_highlight = [];
                this.$refs.isoformStackComponent.transcripts_to_highlight = [];
                // if (!this.canon_disabled)
                // {
                //     this.$refs.canonStackComponent.ump_orfs_to_highlight = [];
                //     this.$refs.canonStackComponent.ump_transcripts_to_highlight = [];
                //     this.$refs.canonStackComponent.transcripts_to_highlight = [];
                // }
            }

            this.resizePage();
        },

        setPeptideIntegration(state)
        {
            this.peptide_integration_mode = state;
            if (this.mainData.isoformData.is_genomeprot)
            {
                this.peptide_highlight_mode = state;
                this.$refs.peptideGenomeProtStackComponent.is_set_highlight = state;
                this.$refs.peptideGenomeProtStackComponent.highlighted_peptide = "";
            }
            this.$refs.isoformStackComponent.ump_orfs_to_highlight = (this.peptide_highlight_mode) ? JSON.parse(JSON.stringify(this.mainData.isoformData.orfs_identified)) : [];
            this.$refs.isoformStackComponent.ump_transcripts_to_highlight = (this.peptide_highlight_mode) ? JSON.parse(JSON.stringify(this.mainData.isoformData.transcripts_identified)) : [];
            this.$refs.isoformStackComponent.transcripts_to_highlight = [];
            // if (!this.canon_disabled)
            // {
            //     this.$refs.canonStackComponent.ump_orfs_to_highlight = this.$refs.isoformStackComponent.ump_orfs_to_highlight;
            //     this.$refs.canonStackComponent.ump_transcripts_to_highlight = this.$refs.isoformStackComponent.ump_transcripts_to_highlight;
            //     this.$refs.canonStackComponent.transcripts_to_highlight = [];
            // }
            if (this.peptide_integration_mode)
                this.setShowUserOrfs(true);

            this.resizePage();
        },

        setShowRNAModif(state)
        {
            this.show_rna_modif = state;
            if (this.show_rna_modif === false)
            {
                this.rna_modif_compact_mode = false;
                this.$refs.RNAModifStackComponent.is_compact = false;
                this.$refs.RNAModifLevelsComponent.is_compact = false;
                this.setShowRNAModifHeatmap(false);
            }
            this.resizePage();
        },

        setRNAModifCompact(state)
        {
            this.rna_modif_compact_mode = state;
            this.$refs.RNAModifStackComponent.is_compact = state;
            this.$refs.RNAModifLevelsComponent.is_compact = state;

            if (this.rna_modif_compact_mode === true)
            {
                this.show_rna_modif = true;
                if (this.mainData.rnaModifLevelData)
                    this.setShowRNAModifHeatmap(false);
            }
            else if (this.mainData.rnaModifLevelData)
                this.setShowRNAModifHeatmap(true);

            this.resizePage();
        },

        setShowCanon(state)
        {
            if (this.show_canon !== state)
                this.is_spliced_regions_outdated = true;

            this.show_canon = state;
            if (state == false)
                this.setShowProtein(false);

            this.is_zoom_changed = true;
            this.setBaseAxis();
        },

        setShowAllOtherIsoforms(state)
        {
            if (this.show_all_other_isoforms !== state)
                this.is_spliced_regions_outdated = true;

            this.show_all_other_isoforms = state;
            this.other_isoforms_toggled = true;
            this.is_zoom_reset = true;
            this.resetZoom();
        },

        setShowSplices(state)
        {
            this.show_splices = state;
            if (!this.show_splices)
            {
                this.setShowConstitutiveJunctions(false);
            }
            this.resizePage();
        },

        setShowConstitutiveJunctions(state)
        {
            this.show_constitutive_junctions = state;
            this.$refs.spliceGraphComponent.is_draw_constitutive = state;
            if (this.show_constitutive_junctions)
                this.setShowSplices(true);
        },

        setShowStack(state)
        {
            this.show_stack = state;
            this.is_stack_toggled = true;
        },
        
        setShowHeatmapColumn(state)
        {
            this.show_heatmap_column = state;
            this.is_heatmap_toggled = true;
        },

        setShowPeptideHeatmap(state)
        {
            this.show_peptide_heatmap = state;
            this.$refs.peptideCountsComponent.show_peptide_heatmap = state;
            this.$refs.peptideCountsLegendComponent.show_peptide_heatmap = state;
            if (state === true)
                this.setShowPeptide(true);
        },

        setHidePeptideHeatmapLabels(state)
        {
            this.hide_peptide_heatmap_labels = state;
            this.$refs.peptideCountsLegendComponent.hide_peptide_heatmap_labels = state;
            //this.resizePage();
        },

        setShowRNAModifHeatmap(state)
        {
            this.show_rna_modif_heatmap = state;
            this.$refs.RNAModifLevelsComponent.show_rna_modif_heatmap = state;
            this.$refs.RNAModifLevelsLegendComponent.show_rna_modif_heatmap = state;
            if (state === true)
                this.setShowRNAModif(true);
        },

        setHideRNAModifHeatmapLabels(state)
        {
            this.hide_rna_modif_heatmap_labels = state;
            this.$refs.RNAModifLevelsLegendComponent.hide_rna_modif_heatmap_labels = state;
            //this.resizePage();
        },

        setShowIsoformHeatmap(state)
        {
            this.show_isoform_heatmap = state;
            this.$refs.heatmapComponent.show_isoform_heatmap = state;
            this.$refs.heatmapLegendComponent.show_isoform_heatmap = state;
        },

        setHideIsoformHeatmapLabels(state)
        {
            this.hide_isoform_heatmap_labels = state;
            this.$refs.heatmapLegendComponent.hide_isoform_heatmap_labels = state;
            this.resizePage();
        },

        requestHeatmapDataUpload()
        {
            this.$root.$emit("request_heatmap_data_upload");
        },

        setShowOrfs(state)
        {
            this.show_orfs = state;

            if (this.show_orfs && this.show_user_orfs)
            {
                this.show_user_orfs = false;

                this.$refs.isoformStackComponent.show_user_orfs = false;

                if (!this.other_isoforms_disabled)
                    this.$refs.otherIsoformStackComponent.show_user_orfs = false;

                if (!this.canon_disabled)
                    this.$refs.canonStackComponent.show_user_orfs = false;
            }

            this.$refs.isoformStackComponent.show_orfs = state;

            if (!this.other_isoforms_disabled)
                this.$refs.otherIsoformStackComponent.show_orfs = state;

            if (!this.canon_disabled)
                this.$refs.canonStackComponent.show_orfs = state;

            this.resizePage();
        },

        setShowUserOrfs(state)
        {
            this.show_user_orfs = state;

            if (this.show_user_orfs && this.show_orfs)
            {
                this.show_orfs = false;

                this.$refs.isoformStackComponent.show_orfs = false;

                if (!this.other_isoforms_disabled)
                    this.$refs.otherIsoformStackComponent.show_orfs = false;

                if (!this.canon_disabled)
                    this.$refs.canonStackComponent.show_orfs = false;
            }

            this.$refs.isoformStackComponent.show_user_orfs = state;

            if (!this.other_isoforms_disabled)
                this.$refs.otherIsoformStackComponent.show_user_orfs = state;

            if (!this.canon_disabled)
                this.$refs.canonStackComponent.show_user_orfs = state;

            this.resizePage();
        },

        setLogTransform(state)
        {
            this.isoform_heatmap_log_transform = state;
            this.$refs.heatmapComponent.logTransform = state;
            this.$refs.heatmapLegendComponent.logTransform = state;
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
                {
                    this.mainData.geneLabel = response.display_name;
                    // Let GenomeProt(SC) know which gene is selected by the user
                    if (window.parent !== window)
                        window.parent.postMessage(this.mainData.geneLabel, document.referrer);
                }
                else
                {
                    // Let GenomeProt(SC) know which gene is selected by the user
                    if (window.parent !== window)
                        window.parent.postMessage(this.mainData.selectedGene, document.referrer);
                }

                canon_id = response.canonical_transcript;
                canon_id = canon_id.substring(0, canon_id.indexOf('.'));

                url = `https://${this.is_use_grch37 ? "grch37." : ""}rest.ensembl.org/lookup/id/${canon_id}?species=${this.species}&expand=1;content-type=application/json`;
                let transcript = await this.fetchJSON(url);
                if (transcript && transcript.Exon)
                {
                    canon_data = new CanonData(transcript);
                    this.is_strandedness_mismatched = (canon_data.strand !== this.mainData.isoformData.strand);
                }
            }

            this.showCanonLoading = false;
            return [canon_data, canon_id];
        },

        /**
         * Fetch all Ensembl isoforms that are not present in the uploaded stack data.
         */
        async getAllOtherIsoforms()
        {
            this.is_other_isoforms_button_clicked = true;
            this.show_all_other_isoforms = true;
            this.other_isoforms_loading = true;

            let gene_id = this.mainData.selectedGene;
            let all_stack_isoform_ids = this.isoformList;

            let isoform_list = JSON.parse(JSON.stringify(this.mainData.isoformData.allIsoforms));
            let is_canon_loaded = (!(!this.mainData.canonData || Object.keys(this.mainData.canonData).length == 0));
            if (is_canon_loaded)
            {
                let canon_isoform_list = JSON.parse(JSON.stringify(this.mainData.canonData.isoformList));
                isoform_list = isoform_list.concat(canon_isoform_list);
            }

            let url = `https://${this.is_use_grch37 ? "grch37." : ""}rest.ensembl.org/lookup/id/${gene_id}?species=${this.species}&expand=1&content-type=application/json`;
            let response = await this.fetchJSON(url);
            if (response && !response.error && response.Transcript && (response.Transcript.length !== 0))
            {
                let transcripts = response.Transcript;
                let other_isoform_data = new OtherIsoformData(transcripts, all_stack_isoform_ids, isoform_list);
                if (other_isoform_data.isoformList.length === 0)
                {
                    this.show_all_other_isoforms = false;
                    this.other_isoforms_disabled = true;
                    this.other_isoforms_loading = false;
                    return;
                }

                for (let i = 0; i < other_isoform_data.isoformList.length; ++i)
                {
                    let isoform = other_isoform_data.isoformList[i];

                    let url = `https://${this.is_use_grch37 ? "grch37." : ""}rest.ensembl.org/map/cds/${isoform.transcriptID}/1..${isoform.length}?species=${this.species}&content-type=application/json`;
                    let response = await this.fetchJSON(url);
                    if (!response)
                        continue;

                    let ORFExons = [];
                    for (let entry of response.mappings)
                        ORFExons.push([entry.start, entry.end]);

                    other_isoform_data.isoformList[i].orf = ORFExons;
                    other_isoform_data.allIsoforms[i].orf = ORFExons;
                }

                for (let transcript_id of Object.keys(other_isoform_data.id_to_symbol))
                    this.transcriptNames[transcript_id] = other_isoform_data.id_to_symbol[transcript_id];

                this.other_isoforms_ranges = JSON.parse(JSON.stringify(other_isoform_data.mergedRanges));
                this.other_isoforms_ids = JSON.parse(JSON.stringify(other_isoform_data.transcriptOrder));

                this.other_isoforms_start = other_isoform_data.start;
                this.other_isoforms_end = other_isoform_data.end;

                if (this.mainData.isoformData.strand === '+')
                {
                    if (this.canondata_start !== -1)
                        this.other_isoforms_start = Math.min(this.canondata_start, this.other_isoforms_start);
                    else
                        this.other_isoforms_start = Math.min(this.other_isoforms_start, this.mainData.isoformData.start);

                    if (this.canondata_end !== -1)
                        this.other_isoforms_end = Math.max(this.canondata_end, this.other_isoforms_end);
                    else
                        this.other_isoforms_end = Math.max(this.other_isoforms_end, this.mainData.isoformData.end);
                }
                else
                {
                    if (this.canondata_start !== -1)
                        this.other_isoforms_start = Math.max(this.canondata_start, this.other_isoforms_start);
                    else
                        this.other_isoforms_start = Math.max(this.other_isoforms_start, this.mainData.isoformData.start);

                    if (this.canondata_end !== -1)
                        this.other_isoforms_end = Math.min(this.canondata_end, this.other_isoforms_end);
                    else
                        this.other_isoforms_end = Math.min(this.other_isoforms_end, this.mainData.isoformData.end);
                }

                this.other_isoforms_loading = false;

                this.other_isoform_data = JSON.parse(JSON.stringify(other_isoform_data));

                this.zoom_start = this.other_isoforms_start;
                this.zoom_end = this.other_isoforms_end;
                this.is_zoom_reset = true;

                this.is_spliced_regions_outdated = true;
                this.setBaseAxis();

                this.other_isoforms_resize = true;
            }
            else
            {
                this.show_all_other_isoforms = false;
                this.other_isoforms_disabled = true;
                this.other_isoforms_loading = false;
            }
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

                // If the ORF of a transcript has already been fetched (e.g. when the uploaded isoform stack data contains the canonical transcript), do not fetch it again.
                if (ORFs[transcript_id])
                    continue;

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
                        ORFExons.push([entry.start, entry.end]);
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
            let are_user_orfs_present = false;

            if (this.mainData.isoformData && this.mainData.isoformData.isoformList)
            {
                for (var isoform of this.mainData.isoformData.isoformList)
                {
                    if (!isoform || !isoform.transcriptID)
                        continue;

                    if (isoform.transcriptID in ORFs)
                        isoform.orf = ORFs[isoform.transcriptID];

                    are_user_orfs_present ||= (isoform.user_orf && isoform.user_orf.length !== 0);
                }
            }

            if (this.mainData.isoformData && this.mainData.isoformData.allIsoforms)
            {
                for (var isoform of this.mainData.isoformData.allIsoforms)
                {
                    if (!isoform || !isoform.transcriptID)
                        continue;

                    if (isoform.transcriptID in ORFs)
                        isoform.orf = ORFs[isoform.transcriptID];
                }
            }

            if (Object.keys(this.mainData.canonData).length != 0 && this.mainData.canonData.isoformList)
            {
                for (var isoform of this.mainData.canonData.isoformList)
                {
                    if (isoform.transcriptID in ORFs)
                    {
                        isoform.orf = ORFs[isoform.transcriptID];
                        isoform.user_orf = ORFs[isoform.transcriptID];
                        this.mainData.canonData.orf = ORFs[isoform.transcriptID];
                    }
                }
            }

            this.orfs_ready = true;
            this.no_orfs = (Object.keys(ORFs).length === 0);
            this.no_user_orfs = !are_user_orfs_present;
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
                return new ProteinData([metadata_json, features_json, domains_json], canon_data);

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
         * Add an isoform with a particular transcript ID to the Ensembl isoform stack.
         * @param {string} transcript_id Transcript ID
         */
        addOtherIsoform(transcript_id)
        {
            for (let isoform of this.other_isoform_data.allIsoforms)
            {
                if (isoform.transcriptID === transcript_id)
                {
                    this.other_isoform_data.isoformList.push(isoform);
                    break;
                }
            }

            this.other_isoform_data.transcriptOrder.push(transcript_id);
            this.other_isoforms_ids.push(transcript_id);

            this.resizePage();
        },

        /**
         * Add a peptide to the peptide stack and heatmap.
         * @param {string} peptide Amino acid sequence of the peptide
         */
        addPeptide(peptide)
        {
            this.peptideOrder.push(peptide);
            this.peptide_data.peptideOrder.push(peptide);

            this.resizePage();
        },

        /**
         * Add an RNA modification site to the RNA modification site stack and modification levels heatmap.
         * @param {Number} site Coordinate of the RNA modification site
         */
        addSite(site)
        {
            this.siteOrder.push(site);
            this.site_data.siteOrder.push(site);

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

        /**
         * Remove an isoform with a particular transcript ID from the 'Ensembl isoforms' stack.
         * @param {string} transcript_id Transcript ID
         */
        removeOtherIsoform(transcript_id)
        {
            for (let i = 0; i < this.other_isoform_data.isoformList.length; ++i)
            {
                if (this.other_isoform_data.isoformList[i].transcriptID == transcript_id)
                {
                    this.other_isoform_data.isoformList.splice(i, 1);
                    this.other_isoform_data.transcriptOrder.splice(i, 1);
                }
            }

            this.other_isoforms_ids.splice(this.other_isoforms_ids.indexOf(transcript_id), 1);

            this.resizePage();
        },

        /**
         * Remove a peptide from the peptide stack and heatmap.
         * @param {string} peptide Amino acid sequence of the peptide
         */
        removePeptide(peptide)
        {
            this.peptideOrder.splice(this.peptideOrder.indexOf(peptide), 1);
            this.peptide_data.peptideOrder.splice(this.peptide_data.peptideOrder.indexOf(peptide), 1);

            this.resizePage();
        },

        /**
         * Remove an RNA modification site from the RNA modification site stack and modification levels heatmap.
         * @param {Number} site Coordinate of the RNA modification site
         */
        removeSite(site)
        {
            this.siteOrder.splice(this.siteOrder.indexOf(site), 1);
            this.site_data.siteOrder.splice(this.site_data.siteOrder.indexOf(site), 1);

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

        sortOtherIsoformsByAlpha(ascending = true)
        {
            let shown_isoforms = [];
            for (let i = 0; i < this.other_isoforms_ids.length; ++i)
            {
                let transcript_id = this.other_isoforms_ids[i];

                // Sort the currently shown isoforms by their transcript name if they have one, and by their transcript ID if they don't.
                let transcript_name = this.transcriptNames[transcript_id];
                if ((!transcript_name) || (transcript_name === "Novel"))
                    transcript_name = transcript_id;

                shown_isoforms.push([transcript_name, transcript_id]);
            }

            shown_isoforms.sort((a, b) => a[0].localeCompare(b[0], "en", {numeric: true, sensitivity: "case"}));
            if (!ascending)
                shown_isoforms.reverse();

            this.other_isoforms_ids = [];
            this.other_isoform_data.isoformList = [];
            this.other_isoform_data.transcriptOrder = [];

            for (let [ignored, transcript_id] of shown_isoforms)
            {
                this.other_isoforms_ids.push(transcript_id);
                this.other_isoform_data.transcriptOrder.push(transcript_id);
                for (let isoform of this.other_isoform_data.allIsoforms)
                {
                    if (isoform.transcriptID === transcript_id)
                    {
                        this.other_isoform_data.isoformList.push(isoform);
                        break;
                    }
                }
            }

            this.is_sorting_done = true;
        },

        sortPeptidesByAlpha(ascending = true)
        {
            this.peptideOrder.sort();
            if (!ascending)
                this.peptideOrder.reverse();

            this.peptide_data.peptideOrder = JSON.parse(JSON.stringify(this.peptideOrder));

            this.is_sorting_done = true;
        },

        sortSitesByCoords(ascending = true)
        {
            this.siteOrder.sort((a, b) => a - b);
            if (!ascending)
                this.siteOrder.reverse();

            this.site_data.siteOrder = JSON.parse(JSON.stringify(this.siteOrder));

            this.is_sorting_done = true;
        },

        sortIsoformsByMeanHeatmap(ascending = true)
        {
            let isoform_means = {};
            for (let transcript_id of this.transcriptIds)
                isoform_means[transcript_id] = [];

            let cell_values = this.isoform_heatmap_log_transform ? this.mainData.heatmapData.logExport : this.mainData.heatmapData.export;
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

        sortPeptidesByMeanHeatmap(ascending = true)
        {
            let peptide_means = {};
            for (let peptide of this.peptideOrder)
                peptide_means[peptide] = [];

            let all_values = this.mainData.peptideCountsData.export;
            for (let peptide of this.peptideOrder)
            {
                let sample_values = all_values[peptide];
                for (let sample of Object.keys(sample_values))
                {
                    let value = sample_values[sample];
                    if ((value === null) || (value === undefined) || (isNaN(value)))
                        continue;

                    peptide_means[peptide].push(value);
                }
            }

            let shown_peptides = [];
            let no_mean_peptides = []; // For peptides that have all-NaN heatmap values
            for (let peptide of Object.keys(peptide_means))
            {
                let values = peptide_means[peptide];
                let num_samples = values.length;

                if (num_samples === 0)
                {
                    no_mean_peptides.push([-1, peptide]);
                    continue;
                }

                let mean = 0;
                for (let value of values)
                    mean += value;

                mean /= num_samples;

                shown_peptides.push([mean, peptide]);
            }

            shown_peptides.sort(function(a, b)
            {
                return a[0] - b[0];
            });
            if (!ascending)
                shown_peptides.reverse();

            shown_peptides.concat(no_mean_peptides);

            this.peptideOrder = [];
            this.peptide_data.peptideOrder = [];

            for (let [ignored, peptide] of shown_peptides)
            {
                this.peptideOrder.push(peptide);
                this.peptide_data.peptideOrder.push(peptide);
            }

            this.is_sorting_done = true;
        },

        sortSitesByMeanHeatmap(ascending = true)
        {
            let site_level_means = {};
            for (let site of this.siteOrder)
                site_level_means[site] = [];

            let all_values = this.mainData.rnaModifLevelData.export;
            for (let site of this.siteOrder)
            {
                let sample_values = all_values[site];
                for (let sample of Object.keys(sample_values))
                {
                    let value = sample_values[sample];
                    if ((value === null) || (value === undefined) || (isNaN(value)))
                        continue;

                    site_level_means[site].push(value);
                }
            }

            let shown_sites = [];
            let no_mean_sites = []; // For sites that have all-NaN heatmap values
            for (let site of Object.keys(site_level_means))
            {
                let values = site_level_means[site];
                let num_samples = values.length;

                if (num_samples === 0)
                {
                    no_mean_sites.push([-1, site]);
                    continue;
                }

                let mean = 0;
                for (let value of values)
                    mean += value;

                mean /= num_samples;

                shown_sites.push([mean, site]);
            }

            shown_sites.sort(function(a, b)
            {
                return a[0] - b[0];
            });
            if (!ascending)
                shown_sites.reverse();

            shown_sites.concat(no_mean_sites);

            this.siteOrder = [];
            this.site_data.siteOrder = [];

            for (let [ignored, site] of shown_sites)
            {
                this.siteOrder.push(parseInt(site));
                this.site_data.siteOrder.push(parseInt(site));
            }

            this.is_sorting_done = true;
        },

        resizePage()
        {
            if (this.show_stack)
            {
                this.$refs.isoformStackComponent.buildStack();
                this.$refs.otherIsoformStackComponent.buildStack();
                this.$refs.canonStackComponent.buildStack();
                if (!this.peptide_disabled)
                {
                    if (!(this.mainData.isoformData.is_genomeprot))
                        this.$refs.peptideStackComponent.buildStack();
                    else
                        this.$refs.peptideGenomeProtStackComponent.buildStack();
                }
                if (!this.rna_modif_disabled)
                    this.$refs.RNAModifStackComponent.buildStack();
                this.$refs.geneStrandComponent.buildStrand();
                this.buildProteinComponent();

                if (this.show_splices)
                    this.$refs.spliceGraphComponent.buildGraph();
            }

            if (this.heatmap_data_exists && this.show_heatmap_column)
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
            {
                this.$refs.isoformStackComponent.buildStack();
                this.$refs.otherIsoformStackComponent.buildStack();
                if (!(this.mainData.isoformData.is_genomeprot))
                    this.$refs.peptideStackComponent.buildStack();
                else
                    this.$refs.peptideGenomeProtStackComponent.buildStack();
                this.$refs.RNAModifStackComponent.buildStack();
                this.$refs.spliceGraphComponent.buildGraph();
            }

            if (this.show_heatmap_column)
            {
                this.$refs.heatmapComponent.buildHeatmap();
                if (this.mainData.peptideCountsData)
                    this.$refs.peptideCountsComponent.buildHeatmap();
                if (this.mainData.rnaModifLevelData)
                    this.$refs.RNAModifLevelsComponent.buildHeatmap();
            }
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

        if (this.other_isoforms_resize)
        {
            this.other_isoforms_resize = false;
            this.resizePage();
        }

        // TODO: This shouldn't be necessary, but there's an edge case where the protein mappings do not resize
        // if they're visible and the visibility of other isoforms is toggled
        if (this.other_isoforms_toggled)
        {
            this.other_isoforms_toggled = false;
            this.resizePage();
        }

        // Let GenomeProt(SC) know the total height occupied by all elements shown in the webpage so that the height of the IsoVis window can be automatically adjusted
        if (window.parent !== window)
            window.parent.postMessage(`To resize: ${Math.ceil(document.body.getBoundingClientRect().height)}`, document.referrer);
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
                else if (where === "OtherStack")
                    this.$root.$emit("single_otherstack_click");
                else if (where === "PeptideStack")
                    this.$root.$emit("single_peptidestack_click");
                else if (where === "PeptideGenomeProtStack")
                    this.$root.$emit("single_peptidegenomeprotstack_click");
                else if (where === "RNAModifStack")
                    this.$root.$emit("single_rnamodifstack_click");
            }
        });

        this.$root.$on("reset_zoom", () =>
        {
            this.is_zoom_changed = true;
            this.is_zoom_reset = true;
            this.resetZoom();
        });

        this.$root.$on("set_orf_transcript_highlight", ([ump_orfs_to_highlight, ump_transcripts_to_highlight, transcripts_to_highlight]) =>
        {
            this.peptide_integration_mode = false;

            this.setShowUserOrfs(true);

            this.$refs.isoformStackComponent.ump_orfs_to_highlight = ump_orfs_to_highlight;
            this.$refs.isoformStackComponent.ump_transcripts_to_highlight = ump_transcripts_to_highlight;
            this.$refs.isoformStackComponent.transcripts_to_highlight = transcripts_to_highlight;
            this.$refs.isoformStackComponent.buildStack();
            // if (!this.canon_disabled)
            // {
            //     this.$refs.canonStackComponent.ump_orfs_to_highlight = ump_orfs_to_highlight;
            //     this.$refs.canonStackComponent.ump_transcripts_to_highlight = ump_transcripts_to_highlight;
            //     this.$refs.canonStackComponent.transcripts_to_highlight = transcripts_to_highlight;
            //     this.$refs.canonStackComponent.buildStack();
            // }
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

            // Let GenomeProt(SC) know the information to show about the marker gene selected
            if (window.parent !== window)
                window.parent.postMessage(this.mainData.isoformData.markerInfo, document.referrer);

            window.addEventListener("resize", this.resizePage);

            this.is_other_isoforms_button_clicked = false;
            this.show_all_other_isoforms = false;
            this.other_isoforms_loading = false;
            this.other_isoforms_disabled = false;
            this.other_isoforms_resize = false;
            this.other_isoforms_toggled = false;
            this.other_isoform_data = false;

            this.show_splices = false;
            this.show_constitutive_junctions = false;

            this.show_stack = true;
            this.show_heatmap_column = false;

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
            this.no_user_orfs = true;
            this.protein_ready = false;
            this.isoform_heatmap_log_transform = false;
            this.labels = {"ensembl": "", "refseq": "", "uniprot": "", "uniparc": "", "interpro_source_database": ""};

            this.protein_disabled = false;
            this.canon_disabled = false;
            this.peptide_disabled = true;
            this.rna_modif_disabled = true;

            this.peptideOrder = [];
            this.allPeptides = [];
            this.peptide_data = false;

            this.siteOrder = [];
            this.allSites = [];
            this.site_data = false;

            this.other_isoforms_ids = [];
            this.other_isoforms_ranges = [];
            this.other_isoforms_start = -1;
            this.other_isoforms_end = -1;

            this.spliced_regions = null;
            this.relative_heights = null;
            this.relative_heights_all = null;
            this.is_spliced_regions_outdated = false;

            this.constitutive_junctions_exist = false;

            this.is_strandedness_mismatched = false;

            this.peptide_compact_mode = false;
            this.peptide_highlight_mode = false;
            this.peptide_integration_mode = false;
            this.rna_modif_compact_mode = false;

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
            this.setShowUserOrfs(false);
            this.setShowDomains(true);
            this.setShowMotifs(true);
            this.setShowDomainLabels(false);
            this.setShowPeptide(false);
            this.setShowConstitutiveJunctions(false);
            this.setShowRNAModif(false);
            this.setRNAModifCompact(false);

            this.setHidePeptideHeatmapLabels(false);
            this.setHideRNAModifHeatmapLabels(false);
            this.setHideIsoformHeatmapLabels(false);
            this.setShowPeptideHeatmap(false);
            this.setShowRNAModifHeatmap(false);
            this.setShowIsoformHeatmap(false);
            this.setLogTransform(false);

            this.resizePage();

            if (!this.mainData.demoData)
            {
                if (this.mainData.peptideData)
                {
                    this.peptide_disabled = false;
                    if (this.mainData.peptideCountsData)
                        this.setShowPeptideHeatmap(true);
                    this.peptideOrder = JSON.parse(JSON.stringify(this.mainData.peptideData.peptideOrder));
                    this.allPeptides = JSON.parse(JSON.stringify(this.mainData.peptideData.peptides));
                    this.peptide_data = {peptideOrder: JSON.parse(JSON.stringify(this.peptideOrder)), peptideInfo: JSON.parse(JSON.stringify(this.mainData.peptideData.peptide_info))};
                }
                else if (this.mainData.isoformData.peptides && (Object.keys(this.mainData.isoformData.peptides).length !== 0))
                {
                    this.peptide_disabled = false;
                    
                    this.$refs.peptideGenomeProtStackComponent.highlighted_peptide = "";

                    this.setShowPeptide(true);              // Show peptides and highlight them by default specifically for GenomeProt data
                    this.setPeptideHighlight(false);
                    if (this.mainData.peptideCountsData)
                        this.setShowPeptideHeatmap(true);

                    // If user ORFs exist, show them by default
                    for (var isoform of this.mainData.isoformData.allIsoforms)
                    {
                        if (!isoform || !isoform.transcriptID)
                            continue;

                        if (isoform.user_orf && isoform.user_orf.length !== 0)
                        {
                            this.no_orfs = false;
                            this.no_user_orfs = false;
                            this.setShowUserOrfs(true);
                            break;
                        }
                    }
                    this.peptideOrder = JSON.parse(JSON.stringify(this.mainData.isoformData.peptideOrder));
                    this.allPeptides = JSON.parse(JSON.stringify(this.peptideOrder));
                    this.peptide_data = {peptideOrder: JSON.parse(JSON.stringify(this.peptideOrder)), peptideInfo: JSON.parse(JSON.stringify(this.mainData.isoformData.peptides))};
                }

                if (this.mainData.rnaModifData)
                {
                    this.rna_modif_disabled = false;
                    if (this.mainData.rnaModifLevelData)
                        this.setShowRNAModifHeatmap(true);
                    this.siteOrder = JSON.parse(JSON.stringify(this.mainData.rnaModifData.siteOrder));
                    this.allSites = JSON.parse(JSON.stringify(this.mainData.rnaModifData.allSites));
                    this.site_data = {siteOrder: JSON.parse(JSON.stringify(this.mainData.rnaModifData.siteOrder))};
                }

                if (this.mainData.heatmapData)
                    this.setShowIsoformHeatmap(true);

                if (this.mainData.heatmapData || (!this.rna_modif_disabled && this.mainData.rnaModifLevelData) || (!this.peptide_disabled && this.mainData.peptideCountsData))
                {
                    this.setShowHeatmapColumn(true);
                    this.resizePage();
                }

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
                        this.canon_disabled = true;

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
                this.setShowIsoformHeatmap(true);
                this.show_heatmap_column = true;
                this.is_gene_on_ensembl = true;
                this.showCanonLoading = false;
                this.calculate_canon_mergedranges();
                this.orfs_ready = true;
                this.no_orfs = false;
                this.no_user_orfs = false;
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
        }
    }
}
</script>