export default {
    editor: {
        label: {
            en: 'Dialog',
            fr: 'Dialog',
        },
        icon: 'cursor-click',
        hint: () => {
            return [
                {
                    type: 'brand',
                    text: "Open the dialog externally by using workflow action 'Execute component action' with the correct dialog name",
                    icon: '16/circle-info',
                },
                {
                    type: 'brand',
                    text: 'When working with Z-index, apply it to both Content and Overlay elements',
                    icon: '16/circle-info',
                },
            ];
        },
    },
    inherit: {
        type: 'ww-layout',
    },
    options: {
        displayAllowedValues: ['flex', 'grid', 'inline-flex', 'inline-grid'],
    },
    states: ['focus', 'disabled'],
    triggerEvents: [
        {
            name: 'change',
            label: {
                en: 'On open status change',
                fr: 'Changement de valeur',
            },
            event: { value: true },
        },
        {
            name: 'open',
            label: {
                en: 'On open',
                fr: "À l'ouverture",
            },
        },
        {
            name: 'close',
            label: {
                en: 'On close',
                fr: 'À la fermeture',
            },
        },
    ],
    actions: [
        {
            label: 'Toggle',
            action: 'toggleDialog',
        },
        {
            label: 'Open',
            action: 'openDialog',
        },
        {
            label: 'Close',
            action: 'closeDialog',
        },
    ],
    properties: {
        toggleDialog: {
            type: 'Button',
            editorOnly: true,
            options: {
                text: { en: 'Toggle' },
                action: 'toggleDialog',
            },
        },
        type: {
            label: {
                en: 'Type',
                fr: 'Type',
            },
            type: 'TextSelect',
            section: 'style',
            options: {
                options: [
                    { value: 'none', label: { en: 'None', fr: 'Aucun' } },
                    { value: 'modal', label: { en: 'Modal', fr: 'Modal' } },
                    { value: 'sheet', label: { en: 'Sheet', fr: 'Sheet' } },
                ],
            },
            bindable: true,
            defaultValue: 'modal',
            propertyHelp: {
                tooltip:
                    'If set to "none", the dialog will be unpositioned. If set to "modal", the dialog will be displayed as a modal which can be placed in various positions. If set to "sheet", the dialog will be displayed as a full width or height element on a side of the screen.',
            },
        },
        sideModal: {
            label: {
                en: 'Side',
                fr: 'Positionnement',
            },
            type: 'TextSelect',
            section: 'style',
            options: {
                options: [
                    { value: 'left', label: { en: 'Left', fr: 'Gauche' } },
                    { value: 'center', label: { en: 'Center', fr: 'Centre' } },
                    { value: 'right', label: { en: 'Right', fr: 'Droite' } },
                    { value: 'custom', label: { en: 'Custom', fr: 'Personnalisé' } },
                ],
            },
            defaultValue: 'center',
            hidden: content => content.type !== 'modal',
            bindable: true,
        },
        customPositionX: {
            hidden: content => content.sideModal !== 'custom' || content.type !== 'modal',
            label: {
                en: 'Horizontal',
                fr: 'Horizontal',
            },
            type: 'Length',
            options: {
                unitChoices: [
                    { value: '%', label: '%', min: 0, max: 100 },
                    { value: 'px', label: 'px', min: 0, max: 1000 },
                ],
            },
            defaultValue: '0%',
            bindable: true,
        },
        sideSheet: {
            label: {
                en: 'Side',
                fr: 'Positionnement',
            },
            type: 'TextSelect',
            section: 'style',
            options: {
                options: [
                    { value: 'left', label: { en: 'Left', fr: 'Gauche' } },
                    { value: 'top', label: { en: 'Top', fr: 'Haut' } },
                    { value: 'right', label: { en: 'Right', fr: 'Droite' } },
                    { value: 'bottom', label: { en: 'Bottom', fr: 'Bas' } },
                ],
            },
            hidden: content => content.type !== 'sheet',
            defaultValue: 'top',
            bindable: true,
        },
        align: {
            hidden: content => content.type !== 'modal',
            label: {
                en: 'Align',
                fr: 'Alignement',
            },
            type: 'TextSelect',
            section: 'style',
            options: {
                options: [
                    { value: 'top', label: { en: 'Top', fr: 'Haut' } },
                    { value: 'center', label: { en: 'Center', fr: 'Centre' } },
                    { value: 'bottom', label: { en: 'Bottom', fr: 'Bas' } },
                    { value: 'custom', label: { en: 'Custom', fr: 'Personnalisé' } },
                ],
            },
            defaultValue: 'center',
            bindable: true,
        },
        customPositionY: {
            hidden: content => content.align !== 'custom' || content.type !== 'modal',
            label: {
                en: 'Vertical',
                fr: 'Vertical',
            },
            type: 'Length',
            options: {
                unitChoices: [
                    { value: '%', label: '%', min: 0, max: 100 },
                    { value: 'px', label: 'px', min: 0, max: 1000 },
                ],
            },
            defaultValue: '0%',
            bindable: true,
        },
        animation: {
            label: {
                en: 'Animation',
                fr: 'Animation',
            },
            section: 'style',
            type: 'TextSelect',
            options: {
                options: [
                    { value: null, label: { en: 'None', fr: 'Aucune' } },
                    { value: 'fade', label: { en: 'Fade', fr: 'Fondu' } },
                    { value: 'slide-in', label: { en: 'Slide in', fr: 'Diapositive' } },
                    { value: 'zoom', label: { en: 'Zoom', fr: 'Zoom' } },
                ],
            },
            defaultValue: null,
            bindable: true,
        },
        slideInDirection: {
            hidden: content => content.animation !== 'slide-in' || content.animation === null,
            label: {
                en: 'Direction',
                fr: 'Direction',
            },
            type: 'TextSelect',
            section: 'style',
            options: {
                options: [
                    { value: 'top', label: { en: 'Top', fr: 'Haut' } },
                    { value: 'left', label: { en: 'Left', fr: 'Gauche' } },
                    { value: 'bottom', label: { en: 'Bottom', fr: 'Bas' } },
                    { value: 'right', label: { en: 'Right', fr: 'Droite' } },
                ],
            },
            defaultValue: 'top',
            bindable: true,
        },
        animationDuration: {
            label: {
                en: 'Animation duration (ms)',
                fr: "Durée de l'animation (ms)",
            },
            section: 'style',
            type: 'Number',
            defaultValue: 300,
            options: {
                min: 0,
                max: 10000,
            },
            bindable: true,
            hidden: content => content.animation === null,
        },
        animationEasing: {
            label: {
                en: 'Animation easing',
                fr: 'Animation easing',
            },
            section: 'style',
            type: 'TextSelect',
            options: {
                options: [
                    { value: 'linear', label: { en: 'Linear', fr: 'Linéaire' } },
                    { value: 'ease', label: { en: 'Ease', fr: 'Acceleration' } },
                    { value: 'ease-in', label: { en: 'Ease in', fr: 'Acceleration progressive' } },
                    { value: 'ease-out', label: { en: 'Ease out', fr: 'Deceleration' } },
                    { value: 'ease-in-out', label: { en: 'Ease in out', fr: 'Acceleration et déclinaison' } },
                ],
            },
            defaultValue: 'linear',
            bindable: true,
            hidden: content => content.animation === null,
        },

        preventScroll: {
            label: {
                en: 'Prevent Scrolling',
                fr: 'Désactiver le scroll',
            },
            type: 'OnOff',
            defaultValue: true,
            bindable: true,
            propertyHelp: {
                tooltip: 'Whether users can scroll the page when the dialog is open.',
            },
        },
        escClose: {
            label: {
                en: 'Escape key to close',
                fr: 'La touche échap pour fermer',
            },
            type: 'OnOff',

            defaultValue: false,
            bindable: true,
            propertyHelp: {
                tooltip: 'Whether the dialog should be closed when the escape key is pressed.',
            },
        },
        trigger: {
            label: {
                en: 'Trigger',
                fr: 'Déclencheur',
            },
            type: 'OnOff',
            defaultValue: true,
            bindable: true,
            propertyHelp: {
                tooltip: 'Whether the trigger component is present.',
            },
        },
        triggerClickOpens: {
            type: 'OnOff',
            label: {
                en: 'Trigger click opens',
                fr: 'Ouverture au clic',
            },

            defaultValue: true,
            bindable: true,
            propertyHelp: {
                tooltip:
                    'You can disable the whole trigger to open the Dialog. For example, if you want to open it with a smaller icon or button inside the trigger.',
            },
            hidden: content => !content.trigger,
        },
        overlay: {
            label: {
                en: 'Overlay',
                fr: 'Overlay',
            },
            type: 'OnOff',

            defaultValue: true,
            bindable: true,
            propertyHelp: {
                tooltip: 'Whether you want to display an overlay behind your dialog.',
            },
        },
        clickOutsideCloses: {
            label: {
                en: 'Click outside to close',
                fr: 'Fermeture au clic',
            },
            type: 'OnOff',
            defaultValue: false,
            bindable: true,
            propertyHelp: {
                tooltip: 'Whether the dialog should be closed when the user clicks outside the dialog.',
            },
            hidden: content => content.overlay,
        },
        overlayClickCloses: {
            type: 'OnOff',
            label: {
                en: 'Overlay click closes',
                fr: 'Fermeture au clic',
            },

            defaultValue: true,
            bindable: true,
            propertyHelp: {
                tooltip: 'You can prevent the dialog from closing when the user clicks the overlay.',
            },
            hidden: content => !content.overlay,
        },
        preventInteractionsOutside: {
            hidden: content => content.overlay || content.clickOutsideCloses,
            label: {
                en: 'Prevent interaction outside',
            },
            type: 'OnOff',
            defaultValue: true,
            bindable: true,
            propertyHelp: {
                tooltip:
                    "If this is true, all interactions are disabled outside the dialog content. If you have this off, but have an overlay, you won't be able to interact with outside elements.",
            },
        },
        triggerElement: {
            hidden: true,
            defaultValue: {
                isWwObject: true,
                type: 'ww-flexbox',
                name: 'Trigger',
            },
            navigator: {
                hidden: content => !content.trigger,
            },
        },
        contentElement: {
            hidden: true,
            defaultValue: {
                isWwObject: true,
                type: 'ww-flexbox',
                name: 'Content',
            },
        },
        overlayElement: {
            hidden: true,
            defaultValue: {
                isWwObject: true,
                type: 'ww-flexbox',
                name: 'Overlay',
            },
            navigator: {
                hidden: content => !content.overlay,
            },
        },
    },
};
