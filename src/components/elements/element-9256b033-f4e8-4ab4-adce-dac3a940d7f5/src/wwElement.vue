<template>
    <div
        :style="
            content.animation
                ? {
                      '--transition-duration': animationDuration,
                      '--transition-easing': content.animationEasing,
                  }
                : null
        "
        role="dialog"
    >
        <wwElement v-if="content.trigger" v-bind="content.triggerElement" role="dialog" @click="onTriggerClick()" />

        <template v-if="isOpen">
            <template v-if="!isEditing">
                <div v-if="content.clickOutsideCloses" class="pointer-capture" @click.stop="closeDialog()"></div>
                <div
                    v-else-if="content.preventInteractionsOutside && !content.overlay"
                    class="pointer-capture"
                    @click.stop="null"
                ></div>
            </template>

            <template v-if="content.overlay">
                <wwElement
                    ref="overlayElement"
                    v-bind="content.overlayElement"
                    role="dialog"
                    @click="handleOverlayClick()"
                />
            </template>
        </template>

        <template v-if="transitionName">
            <Transition :name="transitionName">
                <div v-if="isOpen">
                    <wwElement
                        v-bind="content.contentElement"
                        role="dialog"
                        :style="{ ...contentStyle }"
                        class="ww-dialog"
                    />
                </div>
            </Transition>
        </template>
        <template v-else>
            <div v-if="isOpen">
                <wwElement
                    v-bind="content.contentElement"
                    :style="{ ...contentStyle }"
                    role="dialog"
                    class="ww-dialog"
                />
            </div>
        </template>
    </div>
</template>

<script>
import { computed, ref, watch, onUnmounted } from 'vue';
import { useDialogStyle } from './composables/useDialogStyle';

export default {
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
    },
    emits: ['trigger-event'],
    setup(props, { emit }) {
        const { getModalStyle, getSheetStyle, getTransitionName } = useDialogStyle();

        const animationDuration = computed(() => {
            return props.content.animationDuration + 'ms';
        });

        const transitionName = computed(() => {
            return getTransitionName(props.content.animation, props.content.slideInDirection);
        });

        const { value: isOpen, setValue: setIsOpen } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'open',
            type: 'boolean',
            defaultValue: false,
            componentType: 'element',
        });

        const setDialogState = newValue => {
            setIsOpen(newValue);

            const eventName = newValue ? 'open' : 'close';
            emit('trigger-event', {
                name: eventName,
                event: {
                    open: newValue,
                },
            });

            emit('trigger-event', {
                name: 'change',
                event: {
                    open: newValue,
                },
            });
        };

        function toggleDialog() {
            setDialogState(!isOpen.value);
        }
        function openDialog() {
            setDialogState(true);
        }

        function closeDialog() {
            setDialogState(false);
        }

        function addEscapeListener() {
            wwLib.getFrontDocument().addEventListener('keydown', handleEscapeKey);
        }

        function removeEscapeListener() {
            wwLib.getFrontDocument().removeEventListener('keydown', handleEscapeKey);
        }

        function handleEscapeKey(event) {
            if (event.key === 'Escape') {
                onEscapeKeyDown();
            }
        }

        function onEscapeKeyDown() {
            if (isEditing.value || !props.content.escClose) {
                return;
            }
            closeDialog();
        }

        watch(
            () => isOpen.value,
            newValue => {
                if (props.content.preventScroll && !isEditing.value) {
                    if (newValue) {
                        wwLib.getFrontDocument().body.style.overflow = 'hidden';
                        wwLib.getFrontDocument().documentElement.style.overflow = 'hidden';
                    } else {
                        wwLib.getFrontDocument().body.style.removeProperty('overflow');
                        wwLib.getFrontDocument().documentElement.style.removeProperty('overflow');
                    }
                }
                if (newValue) {
                    addEscapeListener();
                } else {
                    removeEscapeListener();
                }
            }
        );

        const isEditing = computed(() => {
            // eslint-disable-next-line no-unreachable
            return false;
        });

        wwLib.wwElement.useRegisterElementLocalContext('dialog', ref({ isOpen }), {
            toggleDialog: {
                method: toggleDialog,
                editor: {
                    label: 'Toggle',
                    description: 'Toggle the dialog state.',
                },
            },
            openDialog: {
                method: openDialog,
                editor: {
                    label: 'Open',
                    description: 'Open the dialog.',
                },
            },
            closeDialog: {
                method: closeDialog,
                editor: {
                    label: 'Close',
                    description: 'Close the dialog.',
                },
            },
        });

        const contentStyle = computed(() => {
            let style = {};
            switch (props.content.type) {
                case 'modal':
                    style = getModalStyle(
                        props.content.sideModal,
                        props.content.align,
                        props.content.customPositionX,
                        props.content.customPositionY
                    );
                    break;
                case 'sheet':
                    style = getSheetStyle(props.content.sideSheet);
                    break;
            }
            return style;
        });

        function handleOverlayClick() {
            if (props.content.overlayClickCloses && !isEditing.value) {
                closeDialog();
            }
        }

        function handleOutsideClick() {
            if (props.content.clickOutsideCloses && !isEditing.value) {
                closeDialog();
            }
        }

        function onTriggerClick() {
            if (!props.content.triggerClickOpens || isEditing.value) {
                return;
            }

            toggleDialog();
        }

        onUnmounted(() => {
            removeEscapeListener();
            wwLib.getFrontDocument().body.style.removeProperty('overflow');
            wwLib.getFrontDocument().documentElement.style.removeProperty('overflow');
        });

        return {
            toggleDialog,
            openDialog,
            closeDialog,
            contentStyle,
            isOpen,
            transitionName,
            animationDuration,
            isEditing,
            onEscapeKeyDown,
            handleOverlayClick,
            onTriggerClick,
            handleOutsideClick,
        };
    },
};
</script>

<style lang="scss">
.ww-dialog {
    --translate-x: 0px;
    --translate-y: 0px;
    --translate-x-offset: 0px;
    --translate-y-offset: 0px;
    --scale: 1;
    --calc-translate-x: calc(var(--translate-x) + var(--translate-x-offset));
    --calc-translate-y: calc(var(--translate-y) + var(--translate-y-offset));
    transition: transform var(--transition-duration) var(--transition-easing),
        opacity var(--transition-duration) var(--transition-easing) !important;
    transform: translateX(var(--calc-translate-x)) translateY(var(--calc-translate-y)) scaleX(var(--scale))
        scaleY(var(--scale)) !important;
}

/* Fade */
.fade-transition-enter-active,
.fade-transition-leave-active {
    transition: opacity var(--transition-duration) var(--transition-easing) !important;
}

.fade-transition-enter-from,
.fade-transition-leave-to {
    opacity: 0;
}

/* Slide Left */
.slide-in-left-transition-enter-from .ww-dialog {
    --translate-x-offset: -20px;
    opacity: 0;
}
.slide-in-left-enter-to .ww-dialog {
    --translate-x-offset: 0;
    opacity: 1;
}
.slide-in-left-transition-leave-from .ww-dialog {
    --translate-x-offset: 0;
    opacity: 1;
}
.slide-in-left-transition-leave-to .ww-dialog {
    --translate-x-offset: -20px;
    opacity: 0;
}

/* Slide Right */
.slide-in-right-transition-enter-from .ww-dialog {
    --translate-x-offset: 20px;
    opacity: 0;
}
.slide-in-right-enter-to .ww-dialog {
    --translate-x-offset: 0;
    opacity: 1;
}
.slide-in-right-transition-leave-from .ww-dialog {
    --translate-x-offset: 0;
    opacity: 1;
}
.slide-in-right-transition-leave-to .ww-dialog {
    --translate-x-offset: 20px;
    opacity: 0;
}

/* Slide Top */
.slide-in-top-transition-enter-from .ww-dialog {
    --translate-y-offset: -20px;
    opacity: 0;
}
.slide-in-top-enter-to .ww-dialog {
    --translate-y-offset: 0;
    opacity: 1;
}
.slide-in-top-transition-leave-from .ww-dialog {
    --translate-y-offset: 0;
    opacity: 1;
}
.slide-in-top-transition-leave-to .ww-dialog {
    --translate-y-offset: -20px;
    opacity: 0;
}

/* Slide-in bottom Animation */
.slide-in-bottom-transition-enter-from .ww-dialog {
    --translate-y-offset: 20px;
    opacity: 0;
}
.slide-in-bottom-enter-to .ww-dialog {
    --translate-y-offset: 0;
    opacity: 1;
}
.slide-in-bottom-transition-leave-from .ww-dialog {
    --translate-y-offset: 0;
    opacity: 1;
}
.slide-in-bottom-transition-leave-to .ww-dialog {
    --translate-y-offset: 20px;
    opacity: 0;
}

/* Zoom Animation */
.zoom-transition-enter-from .ww-dialog,
.zoom-transition-leave-to .ww-dialog {
    --scale: 0;
}
.zoom-transition-enter-to .ww-dialog,
.zoom-transition-leave-from .ww-dialog {
    --scale: 1;
}

.pointer-capture {
    position: fixed;
    top: 0;
    left: 0;
    width: 100dvw;
    height: 100dvh;
    pointer-events: auto;
}
</style>
