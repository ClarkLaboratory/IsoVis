<template>
    <b-container>
        <div>
            The gene strand displays the genomic location and orientation of the 
            gene of interest.
            <br><br>
            Start and end coordinates of the gene are displayed at each side
            of the diagram. The dotted vertical line shows the precise 
            genomic coordinate of the cursor.
            <br><br>
            The diagram displays triangular ticks pointing from 5' to 3'.
            As the 5'-3' direction is reversible, a gene on the reverse strand
            could be viewed from either left-to-right or right-to-left.
            <br><br>
            The width of ticks indicates warping of the genomic coordinate axis
            following intron normalization. Ticks will be of uniform width when
            intron normalization is disabled.
            <br><br>
            Gene with intron normalization:
            <br>
            <b-img src="~/assets/gene_strand/normalized.png"></b-img> <br>
            <br><br>
            The same gene without intron normalization:
            <br>
            <b-img src="~/assets/gene_strand/uniform.png"></b-img> <br>
        </div>
    </b-container>
</template>