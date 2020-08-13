<template>
    <LoginScreen v-on:logged="goHome()"/>
</template>
<style lang="scss">
    #homePage {

    }
</style>
<script>
    import LoginScreen from '~/components/LoginScreen.vue';
    export default {
        components: {
            LoginScreen
        },
        methods: {
          goHome() {
              this.$router.push({ path: '/' });
          }
        },
        middleware: 'not-auth',
        head() {
            return {
                title: 'NextBlog | Acceso',
                meta: [
                    { hid: 'description', name: 'description', content: `Acceso` }
                ]
            }
        },
    }
</script>
