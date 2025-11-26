export const maskPropertiesOrder = ['maskType', 'pattern', 'options', 'placeholderVisible', 'placeholderChar'];


export const maskProperties = {
    pattern: {
        label: {
            en: 'Pattern',
        },
        type: 'Text',
        section: 'settings',
        bindable: true,
        defaultValue: '{8}000000',
    },
    placeholderVisible: {
        label: {
            en: 'Mask placeholder',
        },
        type: 'OnOff',
        section: 'settings',
        defaultValue: false,
    },
    placeholderChar: {
        label: {
            en: 'Placeholder character',
        },
        type: 'Text',
        section: 'settings',
        bindable: true,
        defaultValue: '_',
        hidden: content => content.placeholderVisible !== true,
    },
};
