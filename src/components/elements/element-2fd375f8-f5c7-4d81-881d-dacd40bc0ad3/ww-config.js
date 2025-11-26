export default {
  editor: {
    label: {
      en: "PDF viewer",
    },
    icon: 'document-report',
  },
  properties: {
    pdf: {
      label: { en: "PDF Url", fr: "PDF Url" },
      type: "Text",
      options: {
        placeholder: "PDF url",
      },
      defaultValue:
        "https://weweb-staging.s3.amazonaws.com/designs/1fb3c298-9f4f-4b49-9661-35a8eee7941b/files/Focussurcatnat.pdf",
      bindable: true,
    },
  },
};
