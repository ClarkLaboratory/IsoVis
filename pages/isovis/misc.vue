/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

<template>
<b-container class="pt-2">
    <div class="card-columns" style="text-align: justify; text-justify: auto;">
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Disclaimer</h5>
                <p>IsoVis renders visualisations based on user provided data and some data sourced from other sites. Hence IsoVis is not responsible for the content of these data being displayed, nor do we guarantee constant availability of the externally sourced data.</p>
                <p>Information obtained on the IsoVis website is not intended to take the place of medical advice from a fully qualified health professional.</p>
                <p>The results shown by IsoVis website may not be used for advertising or product endorsement purposes without the author's explicit written permission.</p>
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Privacy</h5>
                <p>IsoVis is subject to the laws governing privacy in Australia: The Commonwealth Privacy Act 1988.</p>
                <p>IsoVis may log IP addresses, user agents, and URLs of requests made to the server purely for the purpose of identifying potentially malicious requests. IsoVis does not pass any information to another third party without the knowledge and prior consent of the user.</p>
                <p>IsoVis does not and will not store data uploaded by users. Any data uploaded by a user could only be seen and accessed by the user. No one else, including site owners and admins, can see or access this data.</p>
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">License agreement</h5>
                <p>IsoVis is an open-source resource freely available to anyone. It is released under the <b-link href="https://www.mozilla.org/en-US/MPL/2.0/" target="_blank">Mozilla Public License 2.0</b-link> and its data are released under the <b-link href="https://creativecommons.org/licenses/by/4.0/" target="_blank">Creative Commons Attribution 4.0 International License (CC BY 4.0)</b-link>.</p>
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Funding sources</h5>
                <p>Our current list of funders include:</p>
                <ul>
                    <li>ARC Discovery Project</li>
                    <li>NHMRC Fellowship</li>
                </ul>
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Any questions?</h5>
                <p>Please contact us on <b-link href="mailto:contact@isomix.org">contact@isomix.org</b-link> if you have any questions regarding our privacy policy.</p>
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