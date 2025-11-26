<template>
    <div class="ww-date">
        <wwElement v-bind="content.el" :ww-props="{ text: formatedDate }" />
    </div>
</template>

<script>
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

export default {
    props: {
        content: { type: Object, required: true },
    },
    computed: {
        formatedDate() {
            return dayjs(this.content.date).format(this.formatToUse);
        },
        formatToUse() {
            return this.content.customFormat.length ? this.content.customFormat : this.content.format;
        },
    },
    mounted() {
        dayjs.extend(customParseFormat);
    },
    methods: {
        goToDoc() {
            window.open('https://day.js.org/docs/en/display/format#docsNav', '_blank');
        },
    },
};
</script>
