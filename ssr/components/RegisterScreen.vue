<template>
  <v-row align="center" justify="center" id="registerComp">
    <v-card outlined tile shaped>
      <v-img :src="logo" class="logo"/>
      <p>Si ya tiene una cuenta, pulse
        <router-link :to="{ name: 'login' }">aquí</router-link>
        para acceder a ella</p>
      <p>Todos sus datos serán validados de forma automática.</p>
      <ValidationObserver v-slot="{ handleSubmit }">
        <v-form ref="form2" v-if="tab === 'register'"
                v-on:submit.prevent="handleSubmit(doRegister)">
          <ValidationProvider name="País" rules="required" v-slot="{ errors }">
            <v-select
              :items="countries"
              label="País"
              v-model="registerForm.country"
              :error-messages="errors"
              v-on:change="changePrefix"
            ></v-select>
          </ValidationProvider>
          <ValidationProvider
            name="E-Mail"
            rules="required|email" v-slot="{ errors }">
            <v-text-field
              v-model="registerForm.email"
              label="E-Mail (recibirá en él los pedidos)"
              :error-messages="errors"
            ></v-text-field>
          </ValidationProvider>
          <ValidationProvider
            name="Repita el E-Mail"
            :rules="`required|isEmailRepeated:${registerForm.email}`"
            v-slot="{ errors }">
            <v-text-field
              v-model="registerForm.email2"
              label="Repita el E-Mail"
              :error-messages="errors" >
            </v-text-field>
          </ValidationProvider>
          <ValidationProvider name="Nombre" rules="required" v-slot="{ errors }">
            <v-text-field
              v-model="registerForm.name"
              label="Nombre"
              :error-messages="errors"
            ></v-text-field>
          </ValidationProvider>
          <ValidationProvider name="Apellidos" rules="required" v-slot="{ errors }">
            <v-text-field
              v-model="registerForm.surname"
              label="Apellidos"
              :error-messages="errors"
            ></v-text-field>
          </ValidationProvider>
          <ValidationProvider name="Código Postal" rules="required" v-slot="{ errors }">
            <v-text-field
              v-model="registerForm.cp"
              label="Código Postal"
              :error-messages="errors"
            ></v-text-field>
          </ValidationProvider>
          <ValidationProvider name="Contraseña" rules="required" v-slot="{ errors }">
            <v-text-field
              v-model="registerForm.password"
              :append-icon="showPass ? 'fa fa-eye' : 'fa fa-eye-slash'"
              :type="showPass ? 'text' : 'password'"
              label="Contraseña"
              @click:append="showPass = !showPass"
              :error-messages="errors"
            ></v-text-field>
          </ValidationProvider>
          <ValidationProvider
            name="Nombre del comercio"
            :rules="`required|isPasswordRepeated:${registerForm.password}|checkPassword`"
            v-slot="{ errors }">
            <v-text-field
              v-model="registerForm.password2"
              :append-icon="showPass2 ? 'fa fa-eye' : 'fa fa-eye-slash'"
              :type="showPass2 ? 'text' : 'password'"
              label="Repita contraseña"
              @click:append="showPass2 = !showPass2"
              :error-messages="errors"
            ></v-text-field>
          </ValidationProvider>
          <v-checkbox v-model="policies" v-if="registerForm.country">
            <template v-slot:label>
              <div>
                He leído y acepto los
                <v-tooltip bottom>
                  <template v-slot:activator="{ on }">
                    <a
                      :href="conditionsHref"
                      target="_blank" @click.stop v-on="on">
                      Términos y condiciones
                    </a>
                  </template>
                  Click para revisarlos
                </v-tooltip>
                y la
                <v-tooltip bottom>
                  <template v-slot:activator="{ on }">
                    <a
                      :href="`https://static.comercioadistancia.com/legal/${ registerForm.country }/privacidad.pdf`"
                      target="_blank" @click.stop v-on="on">
                      Política de privacidad
                    </a>
                  </template>
                  Click para revisarlos
                </v-tooltip>
              </div>
            </template>
          </v-checkbox>
          <vue-recaptcha
            class="recaptcha"
            :sitekey="reCaptchaCode"
            ref="recaptcha"
            @verify="onVerify"
            @expired="onExpired"/>
          <v-btn color="primary" class="mr-4" type="submit">Registrarme</v-btn>
          <div class="actionLink">
            <span class="link" @click="goToLogin()">Ya tengo cuenta</span>
            <span class="link" @click="toggle('activate')">Activar mi cuenta</span>
          </div>
        </v-form>
      </ValidationObserver>
      <v-form ref="form3" v-if="tab === 'activate'">
        <v-text-field
          v-model="code"
          label="Código"
          required
        ></v-text-field>
        <v-btn
          :disabled="!code"
          color="primary"
          class="mr-4"
          @click="doActivation">
          Activar mi cuenta
        </v-btn>
        <div class="actionLink">
          <span class="link" @click="toggle('request')">Solicitar un nuevo código</span>
          <span class="link" @click="toggle('register')">Volver al registro</span>
        </div>
      </v-form>
      <v-form ref="form3" v-if="tab === 'request'">
        <v-text-field
          v-model="email"
          label="E-Mail">
        </v-text-field>
        <v-btn
          :disabled="!email"
          color="primary"
          class="mr-4"
          @click="getCode">
          Solicitar código
        </v-btn>
        <div class="actionLink">
          <span class="link" @click="getCode">Solicitar un nuevo código</span>
          <span class="link" @click="toggle('register')">Volver al registro</span>
        </div>
      </v-form>
    </v-card>
  </v-row>
</template>

<style lang="scss">
  #registerComp {
    margin-right: 0px;
    margin-left: 0px;
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
      margin-bottom: 20px;
    }
    .recaptcha {
      display: block;
      text-align: center;
      margin: 20px 0;
      > div {
        display: inline-block;
      }
    }
    span.link {
      color: $aqua;
      text-decoration: underline;
      cursor: pointer;
    }
  }
</style>

<script>
  import logo from '@/assets/logo.svg';
  import { COUNTRIES } from '@/utils/constants';
  import { mapActions, mapGetters } from 'vuex';
  import VueRecaptcha from 'vue-recaptcha';

  export default {
    components: {
      VueRecaptcha,
    },
    data() {
      return {
        logo,
        validForm: false,
        policies: false,
        registerForm: {
          country: '',
          email: '',
          email2: '',
          name: '',
          surname: '',
          cp: '',
          code: '',
          password: '',
          password2: '',
          phonePrefix: '',
        },
        showPass: false,
        showPass2: false,
        tab: 'register',
        email: '',
        code: '',
        phonePrefixes: COUNTRIES.map((item) => ({
          text: item.prefix, value: item.value, id: item.value,
        })),
        countries: COUNTRIES,
        captchaResult: false,
      };
    },
    computed: {
      ...mapGetters(['reCaptchaCode']),
      conditionsHref() {
        const { country } = this.registerForm;

        if (country) {
          const suffix = country === 'es' ? '-tienda' : '';
          return `https://static.comercioadistancia.com/legal/${ country }/terminos${ suffix }.pdf`;
        }

        return '';
      },
    },
    methods: {
      ...mapActions(['loading', 'alert']),
      ...mapActions('user', [
        'login', 'logout', 'registerUser', 'activateUser', 'sendActivationCode', 'setCountry',
      ]),
      goToLogin() {
        this.$router.push({ name: 'login' });
      },
      onVerify(response) {
        this.captchaResult = response;
      },
      onExpired() {
        this.captchaResult = false;
      },
      resetCaptcha() {
        this.captchaResult = false;
        this.$refs.recaptcha.reset();
      },
      async doRegister() {
        try {
          if (this.policies !== true) {
            this.alert(`Ha de aceptar los términos y condiciones
            de uso además de las políticas de privacidad`);
            return;
          }
          if (this.captchaResult === false) {
            this.alert('Ha de completar el reCaptcha');
            return;
          }
          this.loading(true);
          const data = this.formatUser();
          if (data.error === undefined) {
            data.reCaptcha = this.captchaResult;
            await this.registerUser(data);
            this.resetCaptcha();
            this.toggle('activate');
            this.alert(`Recibirá un correo electrónico con las
            instrucciones para validar su cuenta`);
          } else {
            this.alert(data.error);
          }
        } catch (e) {
          this.resetCaptcha();
          this.alert('Ha ocurrido un error. Vuelva a intentarlo pasados unos momentos');
        }
        this.loading(false);
      },
      formatUser() {
        const {
          country,
          email,
          name,
          surname,
          phonePrefix,
          cp,
          password,
        } = this.registerForm;

        return {
          country,
          email: email.toLowerCase(),
          name,
          surname,
          phone: `${ phonePrefix }55556666`,
          cp,
          password,
        };
      },
      async doActivation() {
        try {
          this.loading(true);
          if (this.code !== '') {
            const result = await this.activateUser({
              code: this.code,
            });
            if (result !== false) {
              this.alert('Cuenta activada correctamente');
              this.$router.push({ name: 'createShop' });
            } else {
              this.alert('Error activando su cuenta. Vuelva a intentarlo o solicite otro código');
              this.loading(false);
            }
          }
        } catch (e) {
          this.alert('Ha ocurrido un error. Vuelva a intentarlo pasados unos momentos');
          this.loading(false);
        }
      },
      toggle(tab) {
        this.tab = tab;
      },
      changePrefix() {
        if (this.registerForm.country !== '') {
          this.setCountry(this.registerForm.country);
          const prefix = this.phonePrefixes.find((i) => i.id === this.registerForm.country);
          if (prefix !== undefined) {
            this.registerForm.phonePrefix = prefix.text;
            return;
          }
        }
        this.registerForm.phonePrefix = '';
      },
      async getCode() {
        if (this.email !== '') {
          try {
            this.loading(true);
            await this.sendActivationCode({ email: this.email });
            this.toggle('activate');
            this.alert('Código enviado. Revise su carpeta de correo no deseado o SPAM');
          } catch (e) {
            this.alert('Ha ocurrido un error. Vuelva a intentarlo pasados unos momentos');
          }
          this.loading(false);
        } else {
          this.alert('Introduzca un correo electrónico válido');
        }
      },
    },
    mounted() {
      if (this.$route.query.code !== undefined) {
        this.code = this.$route.query.code;
        this.toggle('activate');
      }
      this.loading(false);
    },
    created() {
      this.loading(false);
    },
  };
</script>
