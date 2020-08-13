<template>
    <div id="pagePost">
        <EditPost :post="post"/>
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
    import EditPost from '~/components/EditPost.vue';
    import api from '~/lib/api';

    export default {
        components: {
            EditPost,
        },
        middleware: 'auth',
        async asyncData ({ params }) {
            try {
                const post = (params.id === '_new') ? { tags: [] } : await api.getPost(params.id);
                return {
                    post,
                    title: post.title || 'Nuevo Post',
                    description: post.description ? post.description : 'Nuevo post',
                }
            } catch (e) {
                return {
                    post: false,
                    title: 'Error',
                    description: 'Error',
                };
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
