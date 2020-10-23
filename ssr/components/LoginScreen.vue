<template>
  <v-row align="center" justify="center" id="loginComp">
    <v-col xs="12" md="6" sm="8">
      <v-card>
        <v-row align="center" justify="center">
          <v-form ref="login" v-if="tab === 'login'" @submit="doLogin" v-on:submit.prevent>
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
                large
                type="submit">Acceder</v-btn>
            <v-btn color="primary" large @click="tab = 'faceLogin'">Reconocimiento facial</v-btn>
            <div class="actionLink">
              <!--<span class="link" @click="toggle('remember')">Recordar Contraseña</span>-->
              <span class="link" @click="goTo('register')">Registrarme</span>
            </div>
          </v-form>
          <div v-if="tab === 'faceLogin'">
            <Camera :face="true" v-on:face="doFaceLogin"/>
            <div class="actionLink">
              <span class="link" @click="goTo('login')">Volver</span>
            </div>
          </div>
          <v-form ref="register" v-if="tab === 'register'" v-model="valid" lazy="true">
            <v-text-field
                    v-model="email"
                    label="E-Mail"
                    :rules="mailRule"
                    required
            ></v-text-field>
            <v-text-field
                    v-model="name"
                    label="Nombre"
                    :rules="requiredRule"
                    required
            ></v-text-field>
            <v-text-field
                    v-model="surname"
                    label="Apellido"
                    :rules="requiredRule"
                    required
            ></v-text-field>
            <v-text-field
                    v-model="password"
                    :append-icon="showPass ? 'fa-eye' : 'fa-slashf'"
                    :type="showPass ? 'text' : 'password'"
                    label="Contraseña"
                    :rule="passRule"
                    @click:append="showPass = !showPass"
                    required
            ></v-text-field>
            <v-text-field
                    v-model="password2"
                    :append-icon="showPass2 ? 'fa-eye' : 'fa-slash'"
                    :type="showPass2 ? 'text' : 'password'"
                    label="Repita Contraseña"
                    :rule="passRule"
                    required
                    @click:append="showPass2 = !showPass2"
            ></v-text-field>
            <v-btn
                    :disabled="!valid || (password !== password2)"
                    color="success"
                    @click="doRegister">
              Registrarme
            </v-btn>
            <div class="actionLink">
              <span class="link" @click="goTo('login')">Volver</span>
            </div>
          </v-form>
        </v-row>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
    import api from '~/lib/api';
    import Camera from '@/components/Camera';
    import { mapActions } from 'vuex';

    export default {
        components: {
            Camera,
        },
        data() {
            return {
                email: '',
                password: '',
                password2: '',
                name: '',
                surname: '',
                showPass: false,
                showPass2: false,
                tab: 'login',
                valid: false,
                requiredRule: [
                    (v) => !!v || 'Campo obligatorio',
                    (v) => (v && v.length <= 100) || 'El campo ha de tener un máximo de 100 caracteres',
                ],
                passRule: [
                    (v) => !!v || 'La contraseña es obligatoria',
                    (v) => (v || '').length >= 8 || 'Al menos 8 caracteres',
                    (v) => (/^(?=.*\d)([!¡@#$%^-¿?&_*{}]*)(?=.*[a-z])(?=.*[A-Z])[!¡@#$%^-¿?&_*{}0-9a-zA-ZÀ-ÿ\u00f1\u00d1]{8,}$/.test(v)
                        || 'La contraseña ha de tener 1 mayúscula, 1 minúscula y un número'),
                ],
                mailRule: [
                    (v) => !!v || 'El e-mail es obligatorio',
                    (v) => (/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(v)
                        || 'E-Mail no válido'),
                ],
            };
        },
        methods: {
            ...mapActions(['loading', 'alert', 'login']),
            async doLogin() {
                try {
                    this.loading(true);
                    const { token, user } = await api.login({
                        email: this.email,
                        password: this.password,
                    });
                    this.$refs.login.reset();
                    this.login({ token, user });
                    this.$emit('logged');
                } catch (e) {
                  this.alert(e.message);
                    this.loading(false);
                }
            },
            async doFaceLogin(image) {
                try {
                    this.loading(true);
                    this.goTo('login');
                    const { token, user } = await api.faceLogin({ image });
                    this.login({ token, user });
                    this.$emit('logged');
                } catch (e) {
                    this.alert(e.message);
                    this.loading(false);
                }
            },
            goTo(tab) {
              this.tab = tab;
            },
            async doRegister() {
                try {
                    this.loading(true);
                    await api.register({
                        name: this.name,
                        surname: this.surname,
                        email: this.email,
                        password: this.password,
                    });
                    this.$refs.register.reset();
                    this.alert('Usuario registrado correctamente');
                    this.goTo('login');
                } catch (e) {
                    this.alert(e.message);
                } finally {
                    this.loading(false);
                }
            },
        },
    };
</script>

<style lang="scss">

  #loginComp {
    min-height: 100%;
    margin-top: -70px;
    .v-form {
      width: 90%;
      margin: 20px 0;
      span.link {
        color: #50a2d6;
        text-decoration: underline;
        cursor: pointer;
      }
      text-align: center;
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
    }
  }
</style>
