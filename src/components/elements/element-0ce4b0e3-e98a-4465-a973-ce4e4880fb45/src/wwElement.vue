<template>
    <div 
        class="perfect-grid" 
        ref="gridContainer"
        :style="gridStyles"
    >
        <div 
            v-for="row in rows" 
            v-bind:key="row"
            class="grid-row"
        >
            <AnimatedGridCell
                v-for="col in columns"
                v-bind:key="col"
                :row="row"
                :col="col"
                :cell-size="cellSize"
                :idle-color="idleColor"
                :active-color="activeColor"
                :animation-speed="animationSpeed"
                @cell-click="onCellClick"
            />
        </div>
    </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import AnimatedGridCell from './components/AnimatedGridCell.vue';

export default {
    components: {
        AnimatedGridCell
    },
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
    },
    emits: ['trigger-event'],
    setup(props, { emit }) {
        const gridContainer = ref(null);
        const rows = ref(1);
        const columns = ref(1);

        const extractSize = (value) => {
            if (!value) return 0;
            return parseInt(value.replace(/[^0-9]/g, ''));
        };

        const cellSize = computed(() => extractSize(props.content?.cellSize) || 50);
        const gap = computed(() => extractSize(props.content?.gap) || 0);
        const idleColor = computed(() => props.content?.idleColor || '#e0e0e0');
        const activeColor = computed(() => props.content?.activeColor || '#4CAF50');
        const animationSpeed = computed(() => props.content?.animationSpeed || 300);

        const gridStyles = computed(() => ({
            '--cell-size': `${cellSize.value}px`,
            '--cell-gap': `${gap.value}px`,
            '--idle-color': idleColor.value,
            '--active-color': activeColor.value
        }));

        const calculateGrid = () => {
            if (!gridContainer.value) return;
            
            const containerWidth = gridContainer.value.clientWidth;
            const containerHeight = gridContainer.value.clientHeight;
            
            columns.value = Math.ceil(containerWidth / (cellSize.value + gap.value));
            rows.value = Math.ceil(containerHeight / (cellSize.value + gap.value));
        };

        const onCellClick = (row, col) => {
            emit('trigger-event', {
                name: 'cellClick',
                event: { row, col }
            });
        };

        const resetGrid = () => {
            calculateGrid();
        };

        watch(() => [props.content?.cellSize, props.content?.gap], () => {
            calculateGrid();
        });

        onMounted(() => {
            calculateGrid();
            
            const resizeObserver = new ResizeObserver(() => {
                calculateGrid();
            });
            
            if (gridContainer.value) {
                resizeObserver.observe(gridContainer.value);
            }
        });

        return {
            gridContainer,
            rows,
            columns,
            gridStyles,
            cellSize,
            idleColor,
            activeColor,
            animationSpeed,
            onCellClick,
            resetGrid
        };
    }
};
</script>

<style lang="scss" scoped>
.perfect-grid {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    
    .grid-row {
        display: flex;
        flex-wrap: nowrap;
        gap: var(--cell-gap);
        margin-bottom: var(--cell-gap);
        
        &:last-child {
            margin-bottom: 0;
        }
    }
}
</style>