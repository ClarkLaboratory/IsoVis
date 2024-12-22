# IsoVis: Visualize alternative mRNA isoforms

https://isomix.org/isovis

IsoVis enables fast and informative visualization of gene isoforms and comparison of their exonic structures and relative expression levels. Uniquely, IsoVis displays the position of ORFs and protein domains within isoforms, allowing the potential changes to protein sequence and function between isoforms to be quickly established.

Genes commonly express multiple mRNA isoforms through processes such as alternative splicing initiation and termination. While the advent of long-read RNA-seq has revolutionised our ability to accurately quantify expression of both known and novel RNA isoforms. IsoVis now facilitates visualization and investigation of these isoforms.

Transcript structures (GFF, GTF or BED files) are displayed as an isoform stack, while quantitative, sample-based data such as isoform abundances (CSV or TXT files) are presented as a heatmap. Reference data including the canonical ENSEMBL transcript, open reading frame and encoded protein domains are sourced from external databases and integrated with the isoform information.

Created by Jack Davis, Ching Yin Wan, Jarny Choi and Mike Clark. Developed in the Clark Laboratory at the University of Melbourne.

Publication: https://doi.org/10.1093/nar/gkae343

Hosted by Stemformatics: https://www.stemformatics.org/

If you use IsoVis, please cite:

Ching Yin Wan, Jack Davis, Manveer Chauhan, Josie Gleeson, Yair D J Prawer, Ricardo De Paoli-Iseppi, Christine A Wells, Jarny Choi, Michael B Clark, IsoVis – a webserver for visualization and annotation of alternative RNA isoforms, *Nucleic Acids Research*, Volume 52, Issue W1, 5 July 2024, Pages W341–W347, https://doi.org/10.1093/nar/gkae343

## Installing IsoVis locally

### Setting up a Conda environment for running IsoVis (recommended)

This procedure is not necessary if you are using a local copy of `npm` to install packages and a local copy of `node` to run the server.

```bash
conda create -n isovis
conda activate isovis
conda install -c conda-forge nodejs
```

### Installing dependencies

The following dependencies are used by IsoVis:
- `Nuxt 2`: IsoVis is developed in this version of Nuxt.js.
- `BootstrapVue`: For making IsoVis a responsive web application.
- `d3`: For creating some of the data visualizations seen in IsoVis.
- `domain-gfx`: For drawing the diagram of protein domains and motifs.
- `svg-to-pdfkit`: For converting SVGs of the visualization webpage into a PDF.
- `blob-stream`: For converting the output of Node streams into HTML5 Blobs, which is necessary for the PDF export functionality to work.
- `vuedraggable`: For enabling the isoforms in the isoform list to be rearranged via dragging.

To install them, run the following command:

```bash
npm install nuxt@2.* bootstrap-vue d3 domain-gfx svg-to-pdfkit blob-stream vuedraggable
```

### Applying IsoVis-specific modifications to `domain-gfx` source code

IsoVis applies two minor modifications to the source code of the `domain-gfx` library.

The first modification causes protein domains in the protein diagram to look flat rather than three-dimensional as in previous IsoVis versions.

The reasons for this modification are as follows:

1. We believe this change helps modernize the protein diagram slightly.
2. From our testing, when exporting PDFs with three-dimensional protein domains drawn, some PDF readers cannot render those domains fully when zoomed in. However, this issue does not occur with flat protein domains.

To apply this modification when installing IsoVis, follow these steps:

1. After installing the dependencies as stated above, open `node_modules/domain-gfx/src/index.js` in a text editor.
2. Locate the line that contains the text `height: this._computeHeight(),`.
3. To the right of the comma, enter `spotlight: false`.
4. Save the file.

The second modification ensures that protein diagram pop-ups always float on top of the buttons above the diagram.

To apply this modification when installing IsoVis:

1. Open `node_modules/domain-gfx/src/tooltip/style.js` in a text editor.
2. Locate the line that contains the text `font-family: Sans-Serif;`.
3. Add a new line below that line and enter `z-index: 500;`.
4. Save the file.

### Resolving the 'digital envelope routines unsupported' error for OpenSSL

This error could occur for `node` versions 17 and above when building the IsoVis application.

To avoid this error, run the following command if you are on a Unix system:

```bash
export NODE_OPTIONS=--openssl-legacy-provider
```

If you are on Windows instead, run the following command if you are using a `cmd` prompt:

```cmd
set NODE_OPTIONS=--openssl-legacy-provider
```

If you are using a PowerShell prompt rather than a `cmd` prompt, run this command:

```powershell
$env:NODE_OPTIONS="--openssl-legacy-provider"
```

## Running IsoVis locally

IsoVis is served at `http://localhost:3000/`. There are two ways to run IsoVis:

### Hot reload enabled (developmental purposes)

```bash
npm run dev
```

Any code changes you make to IsoVis when running it with this command would update the server live.

### Static application (normal usage)

```bash
npm run build
npm run generate
npm run start
```

For more information on what these commands do, visit the [Nuxt 2 documentation](https://v2.nuxt.com/).

## Source code directories

The 4 directories shown in this repository have meanings specific to Nuxt 2. They are covered as follows:

### `assets`

This directory contains the assets used by IsoVis. These include the logos and images used, as well as the `*.js` files that are used to parse and process uploaded data files.

For more information on this directory, visit [the Nuxt 2 documentation](https://v2.nuxt.com/docs/directory-structure/assets/).

### `pages`

This directory holds files that structure the pages you see on IsoVis. Each file here is mapped to a URL in an intuitive manner.

Example: `/pages/isovis/faq.vue` is mapped to `/isovis/faq/`, and `/pages/isovis/about.vue` is mapped to `/isovis/about/`.

Index pages behave a bit differently: `/pages/index.vue` is mapped to `/`, and `/pages/isovis/index.vue` is mapped to `/isovis/`.

For more information on this directory, visit [the Nuxt 2 documentation](https://v2.nuxt.com/docs/get-started/routing/).

### `components`

This directory contains the Vue.js components used by the pages in IsoVis. The `*.vue` files in the `pages` directory make use of these components. Changing the code of a component would change its appearance and behaviour on the IsoVis pages that use it.

For more information on this directory, visit [the Nuxt 2 documentation](https://v2.nuxt.com/docs/directory-structure/components/).

### `static`

This directory stores static files served by IsoVis: Downloadable datasets; release notes; a compressed list of species supported by IsoVis and their corresponding taxonomy IDs; and a compressed JSON file storing the mapping from each supported species to their Ensembl ID prefix. Each file in this directory is mapped to `/`.

Example: `/static/demo_data.zip` is mapped to `/demo_data.zip`.

For more information on this directory, visit [the Nuxt 2 documentation](https://v2.nuxt.com/docs/directory-structure/static/).

## Source code files

The other files in this repository also have specific meanings:

- `.gitignore`: A list of directories and files that would not be tracked by Git when submitting a pull request or committing to the IsoVis GitHub repository.
- `nuxt.config.js`: The configuration file for the Nuxt 2 server.
- `package.json`: Contains `npm` scripts that can be run for setting up a local installation of IsoVis.
- `README.md`: The file you are reading right now.