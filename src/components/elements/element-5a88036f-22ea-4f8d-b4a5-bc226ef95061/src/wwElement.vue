<template>
    <draggable
        v-model="internalItems"
        :item-key="itemKey"
        :clone="(el) => el"
        :group="group"
        :sort="sortable"
        :handle="handle?.length ? `.${handle}` : null"
        :disabled="isEditing || isReadonly"
        @change="onChange"
        @start="setDrag(true)"
        @end="setDrag(false)"
    >
        <template #header>
            <wwLayout path="headerElement"></wwLayout>
        </template>
        <template #item="{ element, index: itemIndex }">
            <div class="draggable-item">
                <wwLayoutItemContext
                    :index="itemIndex"
                    :item="null"
                    is-repeat
                    :data="element"
                    :repeated-items="internalItems"
                >
                    <wwLayout path="itemElement"></wwLayout>
                </wwLayoutItemContext>
            </div>
        </template>
        <template #footer>
            <wwLayout path="footerElement"></wwLayout>
        </template>
    </draggable>
</template>

<script>
import draggable from "vuedraggable";

export default {
    components: {
        draggable,
    },
    inject: {
        customHandler: { defaultValue: null },
        customDragHandler: { defaultValue: null },
    },
    props: {
        wwElementState: { type: Object, required: true },
        content: { type: Object, required: true },
        uid: { type: String, required: true },

    },
    emits: ["trigger-event"],
    setup(props) {
        const { value: isDragging, setValue: setDrag } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: "isDragging",
            type: "boolean",
            defaultValue: false,
            readonly: true,
        });
        return { isDragging, setDrag };
    },
    data: () => ({
        internalItems: [],
    }),
    methods: {
        onChange(change) {
            this.customHandler &&
                this.customHandler(change, { ...this.wwElementState.props, updatedStackItems: this.internalItems });
            if (change.moved) {
                this.$emit("trigger-event", {
                    name: "item:moved",
                    event: {
                        item: change.moved.element,
                        oldIndex: change.moved.oldIndex,
                        newIndex: change.moved.newIndex,
                        updatedList: this.internalItems,
                    },
                });
            }

            if (change.added) {
                this.$emit("trigger-event", {
                    name: "item:added",
                    event: {
                        item: change.added.element,
                        newIndex: change.added.newIndex,
                        updatedList: this.internalItems,
                    },
                });
            }

            if (change.removed) {
                this.$emit("trigger-event", {
                    name: "item:removed",
                    event: {
                        item: change.removed.element,
                        oldIndex: change.removed.oldIndex,
                        updatedList: this.internalItems,
                    },
                });
            }
        },
    },
    computed: {
        isEditing() {

            // eslint-disable-next-line no-unreachable
            return false;
        },
        items() {
            const data = this.wwElementState.props.items ? this.wwElementState.props.items : this.content.items;
            const items = wwLib.wwCollection.getCollectionData(data);
            if (!Array.isArray(items)) return [];
            return items;
        },
        group() {
            return this.wwElementState.props.group ? this.wwElementState.props.group : this.content.group;
        },
        sortable() {
            return this.wwElementState.props.sortable ? this.wwElementState.props.sortable : this.content.sortable;
        },
        itemKey() {
            return this.wwElementState.props.itemKey || "id";
        },
        handle() {
            return this.wwElementState.props.handle?.length
                ? this.wwElementState.props.handle
                : this.content.customDragHandle
                ? this.content.handleClass || "draggable"
                : null;
        },
        isReadonly() {

            // Ensure to return a boolean as vuedraggable interpret undefined as true
            return !!(this.wwElementState.props.readonly || this.content.readonly);
        },
    },
    watch: {
        items: {
            immediate: true,
            deep: true,
            handler: function (value) {
                this.internalItems = [...value];
            },
        },
        isDragging(value) {
            if (this.customDragHandler) {
                this.customDragHandler(value, { ...this.wwElementState.props });
            }
        },
        isReadonly: {
            immediate: true,
            handler(value) {
                if (value) {
                    this.$emit("add-state", "readonly");
                } else {
                    this.$emit("remove-state", "readonly");
                }
            },
        },
    },
};
</script>

<style scoped>
/** FIX POINTER-EVENTS: ALL BREAKING DRAGGABLE ON MOBILE/TABLET (TOUCH MODE) */
.draggable-item :deep(.ww-layout) {
    pointer-events: unset !important;
}
.draggable-item :deep(* > .ww-element) {
    pointer-events: unset !important;
}
.draggable-item :deep(* .ww-element) {
    pointer-events: unset !important;
}
</style>
