<template>
    <div class="ww-input-basic" :class="{ editing: isEditing }" v-bind="rootBinding">
        <input
            ref="input"
            :key="componentKey"
            :id="$attrs.id"
            :value="formattedValue"
            class="ww-input-basic__input"
            :class="$attrs.class"
            v-bind="inputBinding"
            type="text"
            :name="wwElementState.name"
            :readonly="content.readonly"
            :required="content.required"
            :placeholder="isAdvancedPlaceholder ? '' : wwLang.getText(content.placeholder)"
            :style="style"
            @blur="onBlur"
            @focus="onFocus"
            @input="onInputChange"
            @mouseenter="onMouseEnter"
            @mouseleave="onMouseLeave"
        />
        <div
            v-if="isAdvancedPlaceholder"
            ref="placeholder"
            class="ww-input-basic__placeholder"
            :style="placeholderSyle"
            @click="focusInput"
        >
            <wwElement
                style="pointerevents: none"
                v-bind="content.placeholderElement"
                :states="value.length ? ['active'] : []"
                :ww-props="{ text: wwLang.getText(content.placeholder) || 'Placeholder' }"
            ></wwElement>
        </div>
    </div>
</template>

<script>
import { computed, ref, nextTick, inject } from 'vue';
import IMask from 'imask';

const INPUT_STYLE_PROPERTIES = [
    'padding',
    'border',
    'borderLeft',
    'borderRight',
    'borderTop',
    'borderBottom',
    'borderRadius',
    'background',
    'boxShadow',
    'cursor',
];

export default {
    inheritAttrs: false,
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
        wwElementState: { type: Object, required: true },
    },
    emits: ['trigger-event', 'add-state', 'remove-state', 'update:content:effect'],
    setup(props, { emit }) {

        const type = computed(() => {
            if (Object.keys(props.wwElementState.props).includes('type')) {
                return props.wwElementState.props.type;
            }
            return props.content.type;
        });

        const { value: variableValue, setValue } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'value',
            type: computed(() => (['decimal', 'number'].includes(type.value) ? 'number' : 'string')),
            defaultValue: props.content.value === undefined ? '' : props.content.value,
        });

        const { setValue: setUnmaskedValue } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'raw value',
            type: computed(() => (['decimal', 'number'].includes(type.value) ? 'number' : 'string')),
            defaultValue: props.content.value === undefined ? '' : props.content.value,
        });

        const input = ref(null);

        const state = inject('componentState', {});

        const useForm = inject('_wwForm:useForm', () => {});

        const fieldName = computed(() => props.content.fieldName);
        const validation = computed(() => props.content.validation);
        const customValidation = computed(() => props.content.customValidation);
        const required = computed(() => props.content.required);

        const { createElement } = wwLib.wwElement.useCreate();

        useForm(
            variableValue,
            { fieldName, validation, customValidation, required, initialValue: computed(() => props.content.value) },
            { elementState: props.wwElementState, emit, sidepanelFormPath: 'form', setValue }
        );

        return { variableValue, setValue, setUnmaskedValue, type, input, state, createElement };
    },
    data() {
        return {
            mask: null,
            paddingLeft: '0px',
            placeholderPosition: {
                top: '0px',
                left: '0px',
            },
            isFocused: false,
            isHovered: false,
            noTransition: false,
            isMounted: false,
            isDebouncing: false,
            wasAccepted: false,
            wasCompleted: false,
            componentKey: 0,
        };
    },
    computed: {
        isEditing() {
            // eslint-disable-next-line no-unreachable
            return false;
        },
        value() {
            return this.variableValue;
        },
        formattedValue() {
            if (this.mask) {
                return this.mask.value;
            }
            return this.value !== undefined && this.value !== null ? String(this.value) : '';
        },
        delay() {
            return wwLib.wwUtils.getLengthUnit(this.content.debounceDelay)[0];
        },
        rootBinding() {
            const style = { ...(this.$attrs.style || {}) };
            INPUT_STYLE_PROPERTIES.forEach(property => {
                delete style[property];
            });

            let rootAttrs = {};
            for (const key in this.$attrs) {
                if ((this.state?.attributes || []).some(attr => attr.name === key)) {
                    continue;
                }
                rootAttrs[key] = this.$attrs[key];
            }

            const bindings = {
                ...rootAttrs,
                style,
            };
            delete bindings.id;
            delete bindings.class;

            return bindings;
        },
        placeholderSyle() {
            const transition = `all ${this.noTransition ? '0ms' : this.content.transition} ${
                this.content.timingFunction
            }`;

            const animatedPosition =
                this.content.placeholderPosition === 'outside'
                    ? {
                          top: '-' + this.content.positioningAjustment,
                          left: this.placeholderPosition.left,
                          transform: `translate3d(0, -100%, 0) scale(${this.content.placeholderScaling})`,
                          transformOrigin: 'left',
                          transition,
                      }
                    : {
                          top: this.content.positioningAjustment,
                          left: this.placeholderPosition.left,
                          transform: `translate3d(0, 0%, 0) scale(${this.content.placeholderScaling})`,
                          transformOrigin: 'left',
                          transition,
                      };

            if (this.content.forceAnimation && this.isEditing) return animatedPosition;
            if (this.value && this.value !== 0) return animatedPosition;
            animatedPosition.cursor = this.$attrs?.style?.cursor || 'text';
            if (this.isDebouncing) return animatedPosition;
            if (this.content.animationTrigger === 'focus' && this.isFocused) return animatedPosition;

            return {
                top: this.placeholderPosition.top,
                left: this.placeholderPosition.left,
                userSelect: 'none',
                transform: 'translate3d(0, 0%, 0) scale(1)',
                transformOrigin: 'left',
                transition,
                cursor: this.$attrs?.style?.cursor || 'text',
            };
        },
        style() {
            const style = {
                ...wwLib.wwUtils.getTextStyleFromContent(this.content),
                '--placeholder-color': this.content.placeholderColor,
            };
            delete style['whiteSpaceCollapse']; //Create a visual bug in Firefox
            delete style['whiteSpace']; //Create a visual bug in Firefox
            INPUT_STYLE_PROPERTIES.forEach(property => {
                if (this.$attrs?.style?.[property]) {
                    style[property] = this.$attrs?.style?.[property];
                }
            });

            return style;
        },
        inputType() {
            if (!this.content) return 'text';
            if (this.content.type === 'password') {
                return this.content.displayPassword ? 'text' : 'password';
            }
            return this.content.type;
        },
        isReadonly() {
            return this.wwElementState.props.readonly === undefined
                ? this.content.readonly
                : this.wwElementState.props.readonly;
        },
        isAdvancedPlaceholder() {
            return this.content.advancedPlaceholder && !this.isReadonly;
        },
        maskOptions() {
            const placeholder = `${this.content.placeholderChar}`;

            return {
                mask: this.content.pattern,
                ...(this.content.placeholderVisible && placeholder.length
                    ? { placeholderChar: placeholder, lazy: false }
                    : {}),
            };
        },
        inputBinding() {
            let attrs = (this.state?.attributes || []).reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
            }, {});
            return { ...attrs, ...(this.wwElementState.props.attributes || {}) };
        },
    },
    watch: {
        maskOptions: {
            deep: true,
            handler() {
                this.initIMask();
            },
        },
        'content.placeholderVisible'() {
            this.initIMask();
        },
        'content.placeholderChar'() {
            this.initIMask();
        },
        isEditing() {
            this.initIMask();
        },
        value(newValue, oldValue) {
            if (this.mask && newValue !== undefined && newValue !== null) {
                // When value changes, ensure mask is properly applied
                this.$nextTick(() => {
                    // Convert to string to ensure IMask receives the correct type
                    const stringValue = String(newValue);
                    if (this.mask.value !== stringValue) {
                        this.mask.value = stringValue;
                    }
                    if (this.input && this.input.value !== this.mask.value) {
                        this.input.value = this.mask.value;
                    }
                });
            } else if (this.mask) {
                // Handle null/undefined values
                this.mask.value = '';
                if (this.input) {
                    this.input.value = '';
                }
            }
        },
        'content.value'(newValue) {
            if (newValue === this.value) return;

            this.setValue(newValue);

            if (this.mask) {
                // Convert newValue to string to ensure IMask receives the correct type
                const stringValue = newValue !== null && newValue !== undefined ? String(newValue) : '';
                if (this.mask.value !== stringValue) {
                    this.mask.value = stringValue;
                }
                this.setUnmaskedValue(this.mask.unmaskedValue);

                // Ensure mask formatting is applied to the display value
                this.$nextTick(() => {
                    if (this.input && this.input.value !== this.mask.value) {
                        this.input.value = this.mask.value;
                    }
                });
            }
            this.$emit('trigger-event', { name: 'initValueChange', event: { value: newValue } });
        },
        isReadonly: {
            immediate: true,
            handler(value) {
                if (value) {
                    this.$emit('add-state', 'readonly');
                } else {
                    this.$emit('remove-state', 'readonly');
                }

                this.$nextTick(() => {
                    this.handleObserver();
                });
            },
        },
        'content.type'() {
            this.$nextTick(() => {
                this.handleObserver();
            });
        },
        input() {
            this.$nextTick(() => {
                this.handleObserver();
            });
        },
        'content.advancedPlaceholder': {
            async handler(value) {

                this.$nextTick(() => {
                    this.handleObserver();
                });
            },
        },
    },
    beforeUnmount() {
        if (this.resizeObserverContent) this.resizeObserverContent.disconnect();
        if (this.resizeObserverBorder) this.resizeObserverBorder.disconnect();

        wwLib.getFrontDocument().removeEventListener('keyup', this.onKeyEnter);

        if (this.mask) this.mask.destroy();
    },
    mounted() {
        this.isMounted = true;
        this.handleObserver();
        wwLib.getFrontDocument().addEventListener('keyup', this.onKeyEnter);

        this.initIMask();
    },
    methods: {
        async initIMask() {
            if (this.mask) this.mask.destroy();
            this.componentKey++;
            await nextTick();

            if (!this.input) {
                return;
            }

            this.mask = IMask(this.input, this.maskOptions);

            // Override IMask's updateValue method to ensure the formatted value
            // is always displayed in the input element
            const originalUpdateValue = this.mask.updateValue.bind(this.mask);
            this.mask.updateValue = () => {
                originalUpdateValue();

                // Make sure input value is synchronized with mask.value
                if (this.input && this.input.value !== this.mask.value) {
                    this.input.value = this.mask.value;
                }
            };

            this.mask.on('accept', event => this.handleDebounce(event, 'accept'));
            this.mask.on('complete', event => this.handleDebounce(event, 'complete'));

            // Set initial mask value if value exists
            if (this.value !== undefined && this.value !== null) {
                // Convert to string to ensure IMask receives the correct type
                const stringValue = String(this.value);
                this.mask.value = stringValue;

                // Force sync with input element
                if (this.input) {
                    this.input.value = this.mask.value;
                }
                
                // Update masked and unmasked values
                this.setUnmaskedValue(this.mask.unmaskedValue);
            } else {
                // Handle null/undefined values
                this.mask.value = '';
                if (this.input) {
                    this.input.value = '';
                }
                this.setUnmaskedValue('');
            }
        },
        onInputChange(event) {
            this.wasAccepted = false;
            this.wasCompleted = false;

            // Update the mask with the input value
            if (this.mask && event.target && event.target.value !== undefined) {
                // Store what user is typing
                this.mask.value = event.target.value;

                // Update component value to match what user typed
                const newValue = this.mask.value;
                if (newValue !== this.value) {
                    this.setValue(newValue);
                    this.setUnmaskedValue(this.mask.unmaskedValue);
                }
            }

            setTimeout(() => {
                this.checkForRejection(event);
            }, 100);
        },
        checkForRejection(event) {
            if (!this.wasAccepted && !this.wasCompleted) {
                this.onCharacterReject(event);
            }
        },
        handleDebounce(event, type) {
            this.wasAccepted = false;
            this.wasCompleted = false;

            // Check if event is valid and has target property
            const newValue = event && event.target ? event.target.value : this.mask.value;

            this.setValue(newValue);
            this.setUnmaskedValue(this.mask.unmaskedValue);

            if (type === 'accept') {
                this.wasAccepted = true;
            } else if (type === 'complete') {
                this.wasCompleted = true;
            }

            if (this.content.debounce) {
                this.isDebouncing = true;
                if (this.debounce) {
                    clearTimeout(this.debounce);
                }
                this.debounce = setTimeout(() => {
                    this.dispatchInputEvents(newValue, event || {}, type);
                    this.isDebouncing = false;
                }, this.delay);
            } else {
                this.dispatchInputEvents(newValue, event || {}, type);
            }
        },
        onCharacterReject(event) {
            if (!event || event.key === 'Enter') return;
            this.$emit('trigger-event', {
                name: 'characterReject',
                event: {
                    domEvent: event,
                    value: this.value,
                    character: event.data || null,
                },
            });
        },
        dispatchInputEvents(value, event, type) {
            if (type === 'complete') {
                this.$emit('trigger-event', {
                    name: 'maskComplete',
                    event: { domEvent: event, value },
                });
            } else if (type === 'accept') {
                this.$emit('trigger-event', {
                    name: 'characterAccept',
                    event: {
                        domEvent: event,
                        value,
                        character: event && event.data ? event.data : null,
                    },
                });
                this.$emit('trigger-event', { name: 'change', event: { domEvent: event, value } });
            }
        },
        onKeyEnter(event) {
            if (event.key === 'Enter' && this.isFocused)
                this.$emit('trigger-event', { name: 'onEnterKey', event: { value: this.value } });
        },
        handleObserver() {
            if (!this.isMounted) return;
            if (this.resizeObserverContent) this.resizeObserverContent.disconnect();
            if (this.resizeObserverBorder) this.resizeObserverBorder.disconnect();
            const el = this.$refs.input;
            if (!el) return;

            // We need both Observers because one of them works outside a ww-modal, while the other in a ww-modal
            this.resizeObserverContent = new ResizeObserver(() => {
                this.updatePosition(el);
            });
            this.resizeObserverBorder = new ResizeObserver(() => {
                this.updatePosition(el);
            });
            this.resizeObserverContent.observe(el, { box: 'content-box' });
            this.resizeObserverBorder.observe(el, { box: 'border-box' });
        },
        updatePosition(el) {
            const placeholder = this.$refs.placeholder;
            if (!el || !placeholder || this.isReadonly) return;
            this.noTransition = true;

            const pos = el.clientHeight / 2 - placeholder.clientHeight / 2;
            this.placeholderPosition.top = pos + 'px';
            this.placeholderPosition.left = el.style.paddingLeft;

            setTimeout(() => {
                this.noTransition = false;
            }, wwLib.wwUtils.getLengthUnit(this.content.transition)[0]);
        },
        onMouseEnter() {
            this.isHovered = true;

            // Check if the input value doesn't match the masked value format
            if (this.mask && this.value) {
                // A formatted mask value should be different than the raw value
                // because it contains formatting characters
                const formattedValue = this.mask.value;
                const rawValue = this.value.toString().replace(/\s+/g, '');

                if (formattedValue.replace(/\s+/g, '') === rawValue && formattedValue !== this.value) {
                    // Reset the mask value to trigger proper formatting
                    this.$nextTick(() => {
                        // Force reapply the mask
                        this.mask.updateValue();
                        // Update the input value with the formatted value
                        this.input.value = this.mask.value;
                    });
                }
            }
        },

        onMouseLeave() {
            this.isHovered = false;

            // Ensure mask stays applied when leaving hover state
            if (this.mask && this.value && this.input) {
                const formattedValue = this.mask.value;
                if (formattedValue !== this.input.value) {
                    // Force reapply the mask
                    this.$nextTick(() => {
                        this.mask.updateValue();
                        this.input.value = this.mask.value;
                    });
                }
            }
        },

        onFocus() {
            this.isFocused = true;
            this.$emit('trigger-event', { name: 'focus', event: null });
            this.$emit('add-state', 'focus');

            // Ensure mask is correctly applied on focus
            if (this.mask && this.value) {
                this.$nextTick(() => {
                    // Make sure the formatted value is displayed
                    const displayValue = this.mask.value;
                    if (displayValue !== this.input.value) {
                        this.input.value = displayValue;
                    }
                });
            }
        },

        onBlur() {
            this.isFocused = false;
            this.$emit('trigger-event', { name: 'blur', event: null });
            this.$emit('remove-state', 'focus');

            // If typing created a new value in the input, update component value to match
            if (this.mask && this.input) {
                const inputValue = this.input.value;

                // Update internal value to match what the user typed
                if (inputValue !== this.value && this.mask.masked.isComplete) {
                    this.setValue(inputValue);
                    this.setUnmaskedValue(this.mask.unmaskedValue);
                    this.$emit('trigger-event', {
                        name: 'change',
                        event: { value: inputValue },
                    });
                }
            }
        },

        // /!\ Use externally
        focusInput() {
            if (this.isReadonly) return;
            const el = this.$refs.input;
            if (el) el.focus();
        },
    },
};
</script>

<style lang="scss" scoped>
.ww-input-basic {
    position: relative;
    isolation: isolate;


    &__input {
        width: 100%;
        height: 100%;
        outline: none;
        border: none;
        background-color: inherit;
        border-radius: inherit;

        &::placeholder {
            color: var(--placeholder-color, #000000ad);
            font-family: inherit;
            font-size: inherit;
            font-weight: inherit;
            line-height: inherit;
            text-decoration: inherit;
            letter-spacing: inherit;
            word-spacing: inherit;
        }

        &.date-placeholder {
            color: var(--placeholder-color, #000000ad);
            font-family: inherit;
            font-size: inherit;
            font-weight: inherit;
            line-height: inherit;
            text-decoration: inherit;
            letter-spacing: inherit;
            word-spacing: inherit;
        }
    }

    &__placeholder {
        position: absolute;
        height: fit-content;
    }
}
</style>
