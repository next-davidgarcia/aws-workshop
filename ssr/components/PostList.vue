<template>
    <div id="postList" v-if="posts">
        <v-row>
            <v-col xs="12" md="4" v-for="post in posts" :key="post.id" >
                <PostListItem :post="post"/>
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="12" class="text-center">
                <v-btn class="more" @click="more()">Siguientes</v-btn>
            </v-col>
        </v-row>
    </div>
</template>
<style lang="scss">
    #postList {
        width: 100%;
        display: block;
        .more {
            display: inline-block;
        }
    }
</style>
<script>
  import PostListItem from '~/components/PostListItem.vue';

  export default {
    components: {
        PostListItem,
    },
    props: ['posts'],
    methods: {
      more() {
        this.$emit('plus');
      },
    },
  }
</script>
