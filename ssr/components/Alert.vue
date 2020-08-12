<template>
  <v-dialog v-model="alert.show" :width="alert.width || 500">
      <v-card id="alert">
        <v-card-title class="headline grey lighten-2" primary-title>
          {{ alert.title || 'Aviso importante' }}
        </v-card-title>
        <v-card-text class="message" v-html="alert.message"></v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="hideAlert">
            {{ alert.cancelText || 'Aceptar' }}
          </v-btn>
          <v-btn v-if="alert.accept" color="danger" text @click="accept()">
            {{ alert.acceptText || 'Cancelar' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>
<style lang="scss">
  #alert {
    .message {
      margin-top: 20px;
    }
  }
</style>
<script>
import { mapState, mapActions } from 'vuex';

export default {
  data() {
    return {
    };
  },
  computed: {
    ...mapState(['alert']),
  },
  methods: {
    ...mapActions(['hideAlert']),
    accept() {
      this.hideAlert();
      if (typeof this.alert.accept === 'function') {
        this.alert.accept();
      }
    },
  },
};

</script>
