<template>
    <div class="ww-pdf-viewer" :class="{ editing: isEditing }" ref="pdfContainer"></div>
</template>

<script>
import PDFObject from "pdfobject";

export default {
    props: {
        content: { type: Object, required: true },

    },
    data() {
        return {
            resizeObserver: null,
        };
    },
    watch: {
        content: {
            deep: true,
            handler() {
                this.init();
            },
        },
    },
    computed: {
        isEditing() {

            // eslint-disable-next-line no-unreachable
            return false;
        },
    },
    methods: {
        initObserver() {
            this.resizeObserver = new ResizeObserver(() => {
                this.init();
            });

            this.resizeObserver.observe(this.$el);
        },
        clearObserver() {
            this.resizeObserver.disconnect();
        },
        init() {
            PDFObject.embed(this.content.pdf, this.$refs.pdfContainer);
        },
    },
    beforeUnmount() {
        this.resizeObserver.disconnect();
    },
    mounted() {
        this.init();
        this.initObserver();
    },
};
</script>

<style lang="scss" scoped>

</style>
