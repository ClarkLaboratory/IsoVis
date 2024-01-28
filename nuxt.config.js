/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  // Target: https://go.nuxtjs.dev/config-target
  target: 'static',

  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'isomix',
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
      { name: 'format-detection', content: 'telephone=no' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
  ],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    // https://go.nuxtjs.dev/bootstrap
    'bootstrap-vue/nuxt',
    // '@nuxtjs/axios',
  ],

  bootstrapVue: {
    components: [
      "BButton",
      "BCol",
      "BCollapse",
      "BContainer",
      "BDropdown",
      "BDropdownItem",
      "BForm",
      "BFormCheckbox",
      "BFormDatalist",
      "BFormFile",
      "BFormGroup",
      "BFormInput",
      "BIconBook",
      "BIconCheck",
      "BIconDownload",
      "BIconGithub",
      "BIconList",
      "BIconPlus",
      "BIconSortAlphaDown",
      "BIconSortAlphaDownAlt",
      "BIconX",
      "BImg",
      "BLink",
      "BModal",
      "BNavbar",
      "BNavbarBrand",
      "BNavbarNav",
      "BNavbarToggle",
      "BProgress",
      "BProgressBar",
      "BRow",
      "BSpinner"
    ],
    componentPlugins: ["BVModalPlugin"],
    directives: [
      "VBModal",
      "VBTooltip"
    ]
  },

  // Build Configuration: https://go.nuxtjs.dev/config-build
  // Need standalone=true to be able to import d3.
  // See comment by agm1984 here: https://stackoverflow.com/questions/44121264/loading-d3-with-nuxt-vue/69470924#69470924
  build: {
    /*analyze: {
      analyzerMode: 'static'
    },*/
    babel: {
      compact: true
    },
    standalone: true,
    transpile: ['domain-gfx'],
    minifyCSS: true,
    minifyJS: true,
    html: {
      minifyCSS: true,
      minifyJS: true,
    }
  },

  ssr: false
}
