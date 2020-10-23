<template>
    <v-layout align-center justify-center row fill-height>
        <v-btn v-if="showCamera === false" @click="showCamera = true">Registrar login facial</v-btn>
        <Camera v-if="showCamera" :face="true" v-on:face="faceDetected"/>
    </v-layout>
</template>
<style lang="scss">
    #homePage {

    }
</style>
<script>
    import Camera from '@/components/Camera';
    import api from '~/lib/api';
    import { mapActions } from 'vuex';


    export default {
        components: {
            Camera,
        },
        data() {
            return {
                showCamera: false,
            };
        },
        methods: {
            ...mapActions(['loading', 'alert']),
            async faceDetected(image) {
                try {
                    this.showCamera = false;
                    this.loading(true);
                    await api.addFace({ image });
                    this.alert('Reconocimiento facial actualizado');
                    this.goHome();
                } catch (e) {
                    this.alert('Error actualizando reconocimiento facial');
                    this.loading(false);
                }
            },
            goHome() {
                this.$router.push({ path: '/' });
            }
        },
        middleware: 'auth',
        head() {
            return {
                title: 'NextBlog | Registro login facial',
                meta: [
                    { hid: 'description', name: 'description', content: `Activa el reconocimiento facial` }
                ]
            }
        },
    }
</script>
