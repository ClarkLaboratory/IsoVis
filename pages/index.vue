/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

<template>
    <div class="container">
        <div class="row d-flex justify-content-center flex-nowrap">
            <div style="font-size: 25px; text-align: center">
                <p>Welcome to Isomix.org!<br />Here, you can find links to all <b-link href="https://biomedicalsciences.unimelb.edu.au/sbs-research-groups/anatomy-and-physiology-research/neuroscience/clark-lab" target="_blank">Clark Lab</b-link> isoform analysis tools.</p>
            </div>
        </div>
        <div class="row d-flex justify-content-center flex-nowrap" style="padding-bottom: 12px; gap: 12px">
            <div class="card" style="width: 45vw; align-items: center; box-shadow: 0px 0px 3px 3px #888888;">
                <img src="~/assets/logos/NanocountLogo.png" class="card-img-top" style="max-height: 120px; max-width: 35vw; width: auto; height: auto; padding-top: 12px;">
                <div class="card-body">
                    <h5 class="card-title">NanoCount</h5>
                    <p class="card-text">Quantify isoform abundance in Nanopore direct-RNA sequencing</p>
                    <b-link href="https://github.com/ClarkLaboratory/NanoCount" class="btn btn-primary" target="_blank">Click here for the NanoCount GitHub repository</b-link>
                </div>
            </div>
            <div class="card" style="width: 45vw; align-items: center; box-shadow: 0px 0px 3px 3px #888888;">
                <img src="~/assets/logos/BlazeLogo.png" class="card-img-top" style="max-height: 120px; max-width: 35vw; width: auto; height: auto; padding-top: 12px;">
                <div class="card-body">
                    <h5 class="card-title">BLAZE</h5>
                    <p class="card-text">Identify cell barcodes from Nanopore long-read single-cell RNA-seq</p>
                    <b-link href="https://github.com/ClarkLaboratory/BLAZE" class="btn btn-primary" target="_blank">Click here for the BLAZE GitHub repository</b-link>
                </div>
            </div>
        </div>
        <div class="row d-flex justify-content-center flex-nowrap" style="padding-bottom: 12px; gap: 12px">
            <div class="card" style="width: 45vw; align-items: center; box-shadow: 0px 0px 3px 3px #888888;">
                <img src="~/assets/logos/IsovisLogo.png" class="card-img-top" style="max-height: 120px; max-width: 35vw; width: auto; height: auto; padding-top: 12px;">
                <div class="card-body">
                    <h5 class="card-title">IsoVis</h5>
                    <p class="card-text">Visualize transcript structures and expression levels of alternative mRNA isoforms</p>
                    <b-link href="isovis" class="btn btn-primary" target="_blank">Click here to go to IsoVis</b-link>
                </div>
            </div>
            <div class="card" style="width: 45vw; align-items: center; box-shadow: 0px 0px 3px 3px #888888;">
                <img src="~/assets/logos/IsolampLogo.png" class="card-img-top" style="max-height: 120px; max-width: 35vw; width: auto; height: auto; padding-top: 12px;">
                <div class="card-body">
                    <h5 class="card-title">IsoLamp</h5>
                    <p class="card-text">Discovery and annotation of transcript isoforms from amplicon sequencing</p>
                    <b-link href="https://github.com/ClarkLaboratory/IsoLamp" class="btn btn-primary" target="_blank">Click here for the IsoLamp GitHub repository</b-link>
                </div>
            </div>
        </div>
        <div class="row d-flex justify-content-center flex-nowrap" style="padding-bottom: 12px;">
            <div class="card" style="width: calc(90vw + 12px); align-items: center; box-shadow: 0px 0px 3px 3px #888888;">
                <div class="card-body">
                    <h5 class="card-title">NanoSplicer</h5>
                    <p class="card-text">Accurate identification of splice junctions using Nanopore squiggles</p>
                    <b-link href="https://github.com/shimlab/NanoSplicer" class="btn btn-primary" target="_blank">Click here for the NanoSplicer GitHub repository</b-link>
                </div>
            </div>
        </div>
        <div class="row d-flex justify-content-center flex-nowrap">
            <div style="font-size: 25px; text-align: center">
                <p>The Clark Lab is based at the University of Melbourne, Australia.<br />Contact us: <b-link href="mailto:michael.clark@unimelb.edu.au">michael.clark@unimelb.edu.au</b-link></p>
            </div>
        </div>
    </div>
</template>

<script>

import { BLink } from 'bootstrap-vue';

export default
{
    components: {
        BLink
    }
}

</script>