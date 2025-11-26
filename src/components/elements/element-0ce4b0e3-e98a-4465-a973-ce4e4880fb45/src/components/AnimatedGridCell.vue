<template>
    <div 
        class="grid-cell"
        :style="cellStyles"
        @click="onClick"
    ></div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
    name: 'AnimatedGridCell',
    props: {
        row: { type: Number, required: true },
        col: { type: Number, required: true },
        cellSize: { type: Number, required: true },
        idleColor: { type: String, required: true },
        activeColor: { type: String, required: true },
        animationSpeed: { type: Number, default: 300 }
    },
    emits: ['cell-click'],
    setup(props, { emit }) {
        const isActive = ref(false);
        let animationTimer = null;

        const cellStyles = computed(() => ({
            width: `${props.cellSize}px`,
            height: `${props.cellSize}px`,
            backgroundColor: isActive.value ? props.activeColor : props.idleColor
        }));

        const scheduleAnimation = () => {
            const randomDelay = Math.random() * 5000; // Random delay between 0-5s
            animationTimer = setTimeout(() => {
                isActive.value = true;
                
                // Reset after animation duration
                setTimeout(() => {
                    isActive.value = false;
                    scheduleAnimation(); // Schedule next animation
                }, props.animationSpeed);
            }, randomDelay);
        };

        const onClick = () => {
            emit('cell-click', props.row, props.col);
        };

        onMounted(() => {
            scheduleAnimation();
        });

        onUnmounted(() => {
            if (animationTimer) {
                clearTimeout(animationTimer);
            }
        });

        return {
            cellStyles,
            onClick
        };
    }
};
</script>

<style lang="scss" scoped>
.grid-cell {
    flex: 0 0 auto;
    border-radius: 4px;
    transition: background-color 0.3s ease;
    cursor: pointer;
    
    &:hover {
        background-color: var(--active-color) !important;
    }
}
</style>