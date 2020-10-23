import FaceCam from '@/lib/FaceCam';

export default (context, inject) => {
    // Inject $hello(msg) in Vue, context and store.
    inject('FaceCam', FaceCam);
    // For Nuxt <= 2.12, also add 👇
    // context.$hello = hello
};
