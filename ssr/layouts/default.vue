<template>
    <v-app>
      <Loading/>
      <Alert/>
      <v-app-bar app>
        <v-container>
          <v-toolbar-title id="logo">
            <nuxt-link to="/">
              <img :src="logo">
            </nuxt-link>
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-menu v-model="menu" :close-on-content-click="false" :nudge-width="200"
                  offset-x id="menu" offset-y>
            <template v-slot:activator="{ on }">
              <v-avatar v-on="on" class="cursor-pointer" id="menuAct" height="61">
                <v-icon class="avatar" size="48">mdi-account-circle</v-icon>
              </v-avatar>
            </template>
            <v-card>
              <v-list v-if="logged === true">
                <v-list-item>
                  <v-list-item-content v-if="user">
                    <v-list-item-title>{{ user.name }} {{ user.surmane }}</v-list-item-title>
                    <v-list-item-subtitle>{{ user.email }}</v-list-item-subtitle>
                  </v-list-item-content>
                  <v-list-item-action>
                    <v-btn @click="logout">
                      <v-icon>mdi-logout</v-icon>
                    </v-btn>
                  </v-list-item-action>
                </v-list-item>
              </v-list>
              <v-list v-if="logged === false">
                <v-list-item>
                  <v-list-item-content>
                    <v-btn to="/login" nuxt>
                      Acceder
                    </v-btn>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-card>
          </v-menu>
        </v-container>
      </v-app-bar>
      <v-container id="appWrapper">
        <nuxt/>
      </v-container>
      <v-footer app>
        <v-container>
          <span class="px-4">BBVA Next Technologies &copy; {{ new Date().getFullYear() }}</span>
        </v-container>
      </v-footer>
    </v-app>
</template>

<style lang="scss">
  #menuAct {
    float: right;
  }
  #menu {
    margin-top: 20px;
  }
  #logo {
    float: left;
    img {
      height: 44px;
      margin-top: 10px;
    }
  }

  #appWrapper {
    margin-top: 70px;
    margin-bottom: 70px;
    min-height: 100%;
  }

</style>
<script>
    import logo from '@/assets/next.png';
    import Loading from '@/components/Loading.vue';
    import Alert from '@/components/Alert.vue';
    import LoginScreen from '@/components/LoginScreen.vue';
    import { mapGetters, mapActions } from 'vuex';
    export default {
        components: {
            Loading,
            Alert,
            LoginScreen,
        },
        data() {
            return {
                logo,
                menu: null,
            }
        },
        computed: {
            ...mapGetters(['logged', 'user']),
        },
        methods: {
            ...mapActions(['loading', 'logout', 'login']),
            fb() {
                this.login({ user: { name: 'pepe' }, token: '1245t' });
                this.$forceUpdate();
            },
        },
    }
</script>
