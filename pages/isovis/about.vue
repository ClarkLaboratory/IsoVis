<template>
<b-container class="pt-2">
    <div class="card-columns" style="text-align: justify; text-justify: auto;">
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">About IsoVis</h5>
                <p>IsoVis enables fast and informative visualization of gene isoforms and comparison of their exonic structures and relative expression levels.
                    Uniquely, IsoVis displays the position of ORFs and protein domains within isoforms, allowing the potential changes to protein sequence and
                    function between isoforms to be quickly established.
                </p>
                <p>Transcript structures (GFF, GTF or BED12 files) are displayed as an isoform stack, while quantitative, sample-based data such as
                    isoform abundances (CSV or TXT files) are presented as a heatmap. Reference data including the canonical ENSEMBL transcript,
                    open reading frame and encoded protein domains are sourced from external databases and integrated with the isoform information.
                </p>
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">About data processing</h5>
                <b-link href="../help_upload/" target="_blank">Click here to show help on upload data</b-link>
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Report issues and request new features to be added to IsoVis</h5>
                Please use the <b-link href="https://github.com/ClarkLaboratory/IsoVis/issues" target="_blank">issue tracker</b-link> on the IsoVis GitHub repository.
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Team</h5>
                <p>Created by Jack Davis, Ching Yin Wan, Jarny Choi and Mike Clark. Publication coming soon.</p>
                <p>Developed in the
                    <b-link href="https://biomedicalsciences.unimelb.edu.au/sbs-research-groups/anatomy-and-physiology-research/systems-neuroscience/clark-lab" target="_blank">Clark Laboratory</b-link>, University of Melbourne.</p>
                    Hosted by <b-link href="https://www.stemformatics.org/" target="_blank">Stemformatics</b-link>.
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Contact us</h5>
                <p>Please do not hesitate to contact us with your enquiries. We also welcome feedback (positive or negative).
                    Alerting us with any bugs or functions can be extremely useful for us, as they can sometimes go undetected otherwise.
                    Feel free to also make new feature requests, as these could be community driven.
                    Thanks for your interest in IsoVis!
                </p>
                <ul>
                    <li>Report bugs and request features: <b-link href="https://github.com/ClarkLaboratory/IsoVis/issues" target="_blank">Issue tracker</b-link></li>
                    <li>All other enquiries: <b-link href="mailto:contact@isomix.org">contact@isomix.org</b-link></li>
                    <li>Address: 30 Royal Parade, Kenneth Myer Building (144), University of Melbourne, Parkville, Victoria</li>
                </ul>
            </div>
        </div>
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