<template>
    <div id="pagePost">
        <Post :post="post" :editable="logged"/>
    </div>
</template>
<style lang="scss">
    #pagePost {
        h5 {
            margin-bottom: 20px;
        }
    }
</style>
<script>
    import Post from '~/components/Post.vue';
    import api from '~/lib/api';
    import { mapGetters } from 'vuex';

    export default {
        components: {
            Post,
        },
        computed: {
            ...mapGetters(['logged']),
        },
        async asyncData ({ params }) {
            const date = new Date().toLocaleTimeString();
            const post = await api.getPost(params.id);
            return {
                date,
                post,
                title: `${ post.title }`,
                description: `${ post.description }`,
            }
        },
        head () {
            return {
                title: this.title,
                meta: [
                    { hid: 'description', name: 'description', content: this.description }
                ]
            }
        },
    }
</script>
