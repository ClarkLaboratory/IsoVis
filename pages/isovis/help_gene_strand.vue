/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

<template>
    <b-container class="text-justify">
        <div>
            The gene strand displays the genomic location and orientation of the gene of interest.
            <br><br>
            Start and end coordinates of the gene are displayed at each side of the diagram. The dotted vertical line shows the precise genomic coordinate of the cursor.
            <br><br>
            The diagram displays triangular arrowheads pointing from 5' to 3'. As the 5'-3' direction is reversible, a gene on the reverse strand could be viewed from either left-to-right or right-to-left.
            <br><br>
            The width of arrowheads indicates warping of the genomic coordinate axis following intron normalization. Arrowheads will be of uniform width when intron normalization is disabled.
            <br><br>
            Gene with intron normalization:
            <br>
            <b-img src="~/assets/gene_strand/normalized.png"></b-img><br>
            <br><br>
            The same gene without intron normalization:
            <br>
            <b-img src="~/assets/gene_strand/uniform.png"></b-img><br>
            <br><br>
            For genes with unknown strandedness (e.g. non-Ensembl gene IDs in uploaded BED4 to BED5 stack data files), IsoVis would <u>assume</u> that they are on the forward strand, and the gene strand diagram would display 'Assumed forward strand.'
        </div>
    </b-container>
</template>

<script>

import { BContainer, BImg } from 'bootstrap-vue';

export default
{
    components: {
        BContainer,
        BImg
    }
}

</script>