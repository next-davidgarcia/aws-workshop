<template>
    <div class="pagePostItem">
        <v-card
                v-if="post"
                max-width="700"
                class="mx-auto"
        >
            <v-list-item>
                <v-list-item-content>
                    <v-list-item-title class="headline">{{ post.title }}</v-list-item-title>
                    <v-list-item-subtitle class="mt-5 mb-5">{{ post.description }}</v-list-item-subtitle>
                </v-list-item-content>
            </v-list-item>

            <v-img
                    v-if="post.image"
                    :src="post.image"
                    max-height="300"
            ></v-img>
            <v-card-text v-if="post && post.tags">
                <v-chip v-for="tag in post.tags" class="ma-2" color="primary" :key="tag">
                    {{ tag }}
                </v-chip>
            </v-card-text>
            <v-card-text v-html="post.text"></v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn icon @click="read()">
                    <v-icon>mdi-motion-play</v-icon>
                </v-btn>
                <v-btn icon @click="analyze()">
                    <v-icon>mdi-api</v-icon>
                </v-btn>
                <v-btn  v-if="editable" icon :to="`/post/edit/${ post.slug }`" nuxt>
                    <v-icon>mdi-lead-pencil</v-icon>
                </v-btn>
                <audio v-if="sound !== false" ref="audioPlayer"><source :src="sound" type="audio/mpeg"></audio>
            </v-card-actions>
        </v-card>
    </div>
</template>
<style lang="scss">
    .pagePostItem {
        .overview {
            display: block;
            margin-top: 20px;
        }
        h1 {
            margin-bottom: 20px;
        }
        h2 {
            margin-bottom: 30px;
        }
    }
</style>
<script>
    import api from '~/lib/api';
    import { mapActions } from 'vuex';


    export default {
    props: ['post', 'editable'],
    data() {
      return {
          sound: false,
      };
    },
    methods: {
        ...mapActions(['alert']),
        async read() {
            const { url } = await api.readPost(this.post.slug);
            this.sound = url;
            this.play();
        },
        async analyze() {
            const data = await api.analyzePost(this.post.slug);
            this.alert({ message: `El texto es de sentimiento ${ data.Sentiment }`, title: 'Analisis del texto' });
        },
        play() {
            const self = this;
            setTimeout(() => {
                self.$refs.audioPlayer.play();
            }, 300);
        },
    }
  }
</script>
