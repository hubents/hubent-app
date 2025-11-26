<template>
    <div class="ww-input-verification-code-container">
        <wwElement
            class="ww-input-verification-code"
            v-for="(_, index) of Array(content.nbrOfCode)"
            :key="index"
            :ref="`ww-input-verification-code-${index}`"
            v-bind="content.input"
            @keydown.backspace="backspace(index)"
            :ww-props="{ value: localValue[index] || ' ' }"
            @paste="onPaste(index, $event)"
            @element-event="onChange(index, $event)"
            @click="selectInput(index)"
        />
    </div>
</template>

<script>
export default {
    props: {
        uid: { type: String, required: true },
        content: { type: Object, required: true },
    },
    emits: ['trigger-event'],
    setup(props) {
        const { value, setValue } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'value',
            defaultValue: '',
            componentType: 'element',
            type: 'string',
            readonly: true,
            resettable: true,
        });
        return { value, setValue };
    },
    data() {
        return {
            localValue: '',
        };
    },
    computed: {
        isEditing() {
            // eslint-disable-next-line no-unreachable
            return false;
        },
        isComplete() {
            return this.localValue.split('').filter(char => char !== ' ').length >= this.content.nbrOfCode;
        },
    },
    watch: {
        isComplete(value) {
            if (!value) return;
            this.$emit('trigger-event', { name: 'complete', event: { value: this.localValue.trim() } });
        },
    },
    methods: {
        getInputComponentRef(index) {
            return (
                this.$refs[`ww-input-verification-code-${index}`]?.componentRef ||
                this.$refs[`ww-input-verification-code-${index}`]?.[0]?.componentRef
            );
        },
        replaceAt(str, index, replacement) {
            return str.substring(0, index) + replacement + str.substring(index + replacement.length);
        },
        focusInput(index) {
            let input = this.getInputComponentRef(index);
            try {
                input.focusInput();
            } catch {
                wwLib.wwLog.warn('WARNING [INPUT-CODE], failed to focus input');
            }
        },
        selectInput(index) {
            let input = this.getInputComponentRef(index);
            try {
                input.selectInput();
            } catch {
                wwLib.wwLog.warn('WARNING [INPUT-CODE], failed to select input');
            }
        },
        onPaste(index, pasteEvent) {
            let input = this.getInputComponentRef(index);
            input?.inputRef?.blur(); // Unfocus to be sure the data is correctly pasted

            pasteEvent.preventDefault();
            const pastedData = pasteEvent.clipboardData.getData('text');
            this.onChange(index, { value: pastedData, type: 'update:value' }, true);
        },
        onChange(index, { value, type }, pastedData = false) {
            if (type !== 'update:value') return;
            value = value === null || value === undefined ? '' : `${value}`;
            value = value.trim();
            let newFocusIndex = index;
            if (!value.length) {
                value = ' ';
            } else {
                newFocusIndex = Math.min(this.content.nbrOfCode - 1, index + value.length);
            }
            let newValue = this.replaceAt(`${this.localValue}`, index, value).substring(0, this.content.nbrOfCode);
            newValue = newValue.trim();
            this.localValue = '';

            this.$nextTick(() => {
                this.localValue = newValue;
                this.setValue(`${this.localValue}`);
                this.$emit('trigger-event', { name: 'change', event: { value: `${this.localValue}` } });
                setTimeout(() => {
                    this.focusInput(newFocusIndex);
                    this.selectInput(newFocusIndex);

                    // Unselect the text if the data is pasted
                    if (pastedData) {
                        const focusedInputComponent = this.getInputComponentRef(newFocusIndex);
                        const input = focusedInputComponent?.inputRef;
                        if (input && typeof input.setSelectionRange === 'function') {
                            const textLength = input.value.length;
                            input.setSelectionRange(textLength, textLength);
                        }
                    }
                }, 0);
            });
        },
        backspace(index) {
            if (index && (this.localValue[index] === ' ' || this.localValue[index] === undefined))
                this.$nextTick(() => this.focusInput(index - 1));
        },
    },
};
</script>

<style lang="scss">
.ww-input-verification-code {
    /* Chrome, Safari, Edge, Opera */
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    /* Firefox */
    input[type='number'] {
        -moz-appearance: textfield;
    }
    &-container {
        display: flex;
    }
}
</style>
