<template>
    <div class="ww-checkbox" :style="style">
        <div :class="[content.icon]" aria-hidden="true"></div>
    </div>
</template>

<script>
export default {
    props: {
        content: { type: Object, required: true },
    },
    computed: {
        style() {
            return {
                color: this.content.color,
                fontSize: `${this.content.fontSize}px`,
            };
        },
    },
};
</script>

<style scoped lang="scss">
.ww-checkbox {
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>
