<template>
    <div id="homePage">
        <v-row>
            <v-col xs="9">
                <h1>NextBlog</h1>
            </v-col>
            <v-col xs="3" class="text-right">
                <v-btn class="addBtn" v-if="logged" :to="`/post/edit/_new`" nuxt>Nuevo</v-btn>
            </v-col>
        </v-row>
        <v-row>
            <v-col xs="12">
                <PostList v-on:plus="morePosts()" :posts="posts"/>
            </v-col>
        </v-row>
    </div>
</template>
<style lang="scss">
    #homePage {

    }
</style>
<script>
    import { mapGetters, mapActions } from 'vuex';
    import PostList from '~/components/PostList.vue';
    import api from '~/lib/api';
    export default {
        components: {
            PostList,
        },
        data() {
            return {
                posts: [],
                page: 1,
                pages: 0,
                total: 0,
            }
        },
        computed: {
            ...mapGetters(['logged']),
        },
        methods: {
            ...mapActions(['loading', 'alert']),
            async morePosts() {
                try {
                    this.loading(true);
                    this.page++;
                    const page = this.page;
                    const { posts, pages, total } = await api.getPosts(page);
                    this.pages = pages;
                    this.total = total;
                    this.posts.push(...posts);
                } catch (e) {
                    this.alert('Error obteniendo posts');
                } finally {
                    this.loading(false);
                }
            },
        },
        async asyncData ({ params }) {
            try {
                const { posts, pages, total } = await api.getPosts();
                return {
                    posts,
                    pages,
                    total,
                }
            } catch (e) {
                return {
                    title: 'Error',
                    description: 'Error',
                    posts: [],
                };
            }
        },
        head() {
            return {
                title: 'NextBlog',
                meta: [
                    { hid: 'description', name: 'description', content: `Blog en AWS y NuxtJS` }
                ]
            }
        },
    }
</script>
