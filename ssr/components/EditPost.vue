<template>
    <v-row align="center" id="pagePostEdit">
        <v-form ref="form" v-model="valid" lazy="true" class="form-edit">
            <h3>{{ post.title || 'Crear nuevo post' }}</h3>
            <v-text-field
                    v-model="post.title"
                    :counter="60"
                    :rules="titleRules"
                    label="Título"
                    required
            ></v-text-field>
            <v-text-field
                    v-model="post.description"
                    :rules="descRules"
                    :counter="150"
                    label="Descripción"
                    required
            ></v-text-field>
            <v-text-field
                    v-model="post.image"
                    :rules="imageRules"
                    label="Imagen (url)"
                    required
            ></v-text-field>
                <v-combobox multiple
                    v-model="post.tags"
                    label="Tags (añade con intro)"
                    append-icon
                    chips
                    deletable-chips
                    class="tag-input"
                    :search-input.sync="search"
                    @keyup.tab="updateTags"
                    @paste="updateTags"/>
            <client-only>
                <wysiwyg id="editorHtml" v-model="post.text" />
            </client-only>
        </v-form>
        <v-btn :disabled="!valid" color="green" class="mr-4" @click="save">
            Guardar
        </v-btn>
        <v-btn color="blue" class="mr-4" to="/" nuxt>
            Volver
        </v-btn>
        <v-btn color="red" class="mr-4" @click="remove" v-if="post.slug">
            Borrar
        </v-btn>
    </v-row>
</template>
<style lang="scss">

    #pagePostEdit {
        form.form-edit {
            width: 100%;
            margin-bottom: 20px;
        }
        h3 {
            margin-bottom: 30px;
        }
    }
</style>
<script>
    import api from '~/lib/api';
    import { mapActions } from 'vuex';

    export default {
        props: ['post'],
        data: () => ({
            valid: true,
            lazy: false,
            title: '',
            titleRules: [
                v => !!v || 'Título obligatorio',
                v => (v && v.length <= 60) || 'El título ha de tener máximoo 60 caractéres',
            ],
            descRules: [
                v => !!v || 'Descripción obligatoria',
                v => (v && v.length <= 150) || 'La descripción ha de tener máximoo 150 caractéres',
            ],
            imageRules: [
                v => !!v || 'Imagen obligatoria'
            ],
            newTags: [],
            search: '',
        }),
        tags() {
            return [...this.post.tags, ...this.newTags];
        },
        methods: {
            ...mapActions(['loading', 'alert', 'logout']),
            updateTags() {
                this.$nextTick(() => {
                    try {
                        this.post.tags.push(...this.search.split(','));
                        this.$nextTick(() => {
                            this.search = '';
                        });
                    } catch (e) {

                    }
                });
            },
            async save () {
                if(this.$refs.form.validate()) {
                    try {
                        this.loading(true);
                        const fn = this.post.slug === undefined ? api.createPost : api.updatePost;
                        const data = await fn({ post: this.post });
                        this.post.slug = data.slug;
                        this.$forceUpdate();
                        this.alert('Post guardado correctamente');
                    } catch (e) {
                        this.alert(e.message);
                        if (e.code === 401) {
                            this.logout();
                            this.$router.push({ path: '/login' });
                        }
                    } finally {
                        this.loading(false);
                    }
                }
            },
            remove() {
                this.alert({
                    width: 600,
                    message: `¿Deseas borrar el post?`,
                    title: '¡Atención!',
                    acceptText: '¡Borrar!',
                    cancelText: 'Cancelar',
                    accept: this.deletePost.bind(this),
                });
            },
            async deletePost() {
                try {
                    this.loading(true);
                    await api.deletePost({ id: this.post.slug });
                    this.alert('Post borrado correctamente');
                    this.$router.push({ path: '/' });
                } catch (e) {
                    this.alert(e.message);
                } finally {
                    this.loading(false);
                }
            }
        },
    }
</script>
