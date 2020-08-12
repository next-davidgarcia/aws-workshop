import Vue from 'vue';
import wysiwyg from "vue-wysiwyg";

Vue.use(wysiwyg, {
    // { [module]: boolean (set true to hide) }
    //7 hideModules: { "bold": true },

    // you can override icons too, if desired
    // just keep in mind that you may need custom styles in your application to get everything to align
    // iconOverrides: { "bold": "<i class='your-custom-icon'></i>" },

    // if the image option is not set, images are inserted as base64

    // limit content height if you wish. If not set, editor size will grow with content.
    maxHeight: "500px",

    // set to 'true' this will insert plain text without styling when you paste something into the editor.
    // forcePlainTextOnPaste: true,

    // specify editor locale, if you don't specify this, the editor will default to english.
    locale: 'es'
}); // config is optional. more below
