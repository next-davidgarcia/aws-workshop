<template>
  <v-row align="center" justify="center" id="loginComp">
    <v-card outlined tile shaped>
      <v-img :src="logo" class="logo ma-7"/>
      <v-form ref="form" v-if="tab === 'login'" @submit="doLogin" v-on:submit.prevent>
        <v-text-field
          v-model="email"
          label="E-Mail"
          required
        ></v-text-field>
        <v-text-field
          v-model="password"
          :append-icon="showPass ? 'fa-eye' : 'fa-eye-slash'"
          :type="showPass ? 'text' : 'password'"
          label="Contraseña"
          @click:append="showPass = !showPass"
        ></v-text-field>
        <v-btn
          :disabled="!password || !email"
          color="primary"
          class="mr-4"
          large
          type="submit">Acceder</v-btn>
        <div class="actionLink">
          <span class="link" @click="toggle('remember')">Recordar Contraseña</span>
          <span class="link" @click="goRegister()">Registrarme</span>
        </div>
      </v-form>
      <v-form ref="form2" v-if="tab === 'remember'">
        <v-text-field
          v-model="email"
          label="E-Mail"
          required
        ></v-text-field>
        <v-btn
          color="primary"
          class="mr-4"
          @click="doRemember">
          Recordar contraseña
        </v-btn>
        <div class="actionLink">
          <a href="/login/#!" @click="toggle('login')">Volver al login</a>
        </div>
      </v-form>
      <v-form ref="form3" v-if="tab === 'reset'">
        <v-text-field
          v-model="password"
          :append-icon="showPass ? 'fa-eye' : 'fa-slashf'"
          :type="showPass ? 'text' : 'password'"
          label="Nueva Contraseña"
          @click:append="showPass = !showPass"
        ></v-text-field>
        <v-text-field
          v-model="password2"
          :append-icon="showPass2 ? 'fa-eye' : 'fa-slash'"
          :type="showPass2 ? 'text' : 'password'"
          label="Repita Nueva Contraseña"
          @click:append="showPass2 = !showPass2"
        ></v-text-field>
        <v-text-field
          v-model="code"
          label="Código"
          required
        ></v-text-field>
        <v-btn
          :disabled="!password || !password2 || !code || (password !== password2)"
          color="success"
          class="mr-4"
          @click="doReset">
          Resetear contraseña
        </v-btn>
        <div class="actionLink">
          <a href="/login/#!" @click="toggle('remember')">
            Volver a recordar contraseña</a>
        </div>
      </v-form>
    </v-card>
  </v-row>
</template>

<style lang="scss">
  #loginComp {
    margin-right: 0px;
    margin-left: 0px;
    span.link {
      color: $aqua;
      text-decoration: underline;
      cursor: pointer;
    }
    text-align: center;
    width: 100%;
    .v-card {
      width: 100%;
      margin: 20px;
      padding: 20px;
    }
    .actionLink {
      font-size: 14px;
      display: block;
      width: 100%;
      text-align: center;
      margin-top: 20px;
      span.link {
        margin: 0 10px;
      }
    }
    btn {
      display: inline;
    }
    .logo {
      display: inline-block;
    }
  }
</style>

<script>
  import logo from '@/assets/logo.svg';
  import { mapActions } from 'vuex';

  export default {
    components: {
    },
    data() {
      return {
        logo,
        email: '',
        code: '',
        password: '',
        password2: '',
        showPass: false,
        showPass2: false,
        tab: 'login',
      };
    },
    methods: {
      ...mapActions(['loading', 'alert']),
      ...mapActions('user', ['login', 'logout', 'rememberPassword', 'resetPassword']),
      goRegister() {
        this.$router.push({ name: 'register' });
      },
      async doLogin() {
        try {
          this.loading(true);
          if (this.email && this.password) {
            await this.login({ email: this.email, password: this.password });
            this.$router.push({ name: 'home' });
          } else {
            this.alert('E-mail y contraseñas son campos obligatorios');
            this.loading(false);
          }
        } catch (e) {
          this.logout();
          this.alert('Acceso no válido');
          this.loading(false);
        }
        this.password = '';
      },
      async doRemember() {
        try {
          this.loading(true);
          if (this.email) {
            await this.rememberPassword({ email: this.email });
            this.toggle('reset');
            this.alert('Recibirá un correo electrónico con las instrucciones a seguir.');
          } else {
            this.alert('E-mail válido obligatorio');
          }
        } catch (e) {
          this.email = '';
          this.alert('E-Mail no existente');
        }
        this.loading(false);
      },
      async doReset() {
        try {
          this.loading(true);
          // TODO validar contraseña (formato)
          if (this.password && this.code) {
            const result = await this.resetPassword({
              password: this.password, code: this.code,
            });
            if (result !== false) {
              this.toggle('login');
              this.alert('Contraseña correctamente cambiada');
            } else {
              this.alert('Ha ocurrido un error. Vuelva a intentarlo');
            }
          } else {
            this.alert('La contraseña ha de tener una cifra, una mayúscula y al menos 6 caractéres');
          }
        } catch (e) {
          this.password = '';
          this.code = '';
          this.alert('Ha ocurrido un error. Vuelva a intentarlo');
        }
        this.loading(false);
      },
      toggle(tab) {
        this.tab = tab;
      },
    },
    mounted() {
      if (this.$route.query.code !== undefined) {
        this.code = this.$route.query.code;
        this.toggle('reset');
      }
      this.loading(false);
    },
  };
</script>
