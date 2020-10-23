<template>
  <v-layout align-center justify-center row fill-height>
      <div class="cam-wrapper">
        <div ref="camera"></div>
        <div class="cam-buttons" v-if="detector !== true">
            <v-btn v-if="face !== true" fab dark large color="red" @click="takePhoto">
                <v-icon dark>mdi-camera</v-icon>
            </v-btn>
            <v-btn fab dark large color="blue" @click="switchCamera">
                <v-icon dark>mdi-camera-switch-outline</v-icon>
            </v-btn>
        </div>
      </div>
  </v-layout>
</template>

<script>
import { mapActions } from 'vuex';

export default {
    props: ['face', 'detector', 'fullSize', 'seconds'],
    data () {
        return {
            camera: null,
            type: 'front',
            width: 0,
            height: 0
        }
    },
    computed: {
        //...mapState('app', ['loading'])
    },
    methods: {
        ...mapActions(['loading', 'alert']),
        async init () {
            this.camera = new this.$FaceCam({ element: this.$refs.camera, width: this.width, height: this.height, format: 'jpeg' });
            await this.startCamera();
            this.startDetection();
        },
        async startDetection () {
            const self = this;
            if (this.face === true) {
                await this.detectFace();
                const photo = await this.photo();
                this.$emit('face', photo);
                if (this.detector === true) {
                    setTimeout(() => self.startDetection(), 600);
                }
            }
        },
        async switchCamera () {
            try {
                this.type = this.type === 'front' ? 'rear' : 'front';
                await this.stopCamera();
                return this.startCamera();
            } catch (e) {
                this.alert(e.message);
            }
        },
        async takePhoto () {
            const photo = await this.photo();
            this.$emit('photo', photo);
        },
        startCamera () {
            const self = this;
            return new Promise((resolve, reject) => {
                self.camera.startCamera(self.type, (err) => {
                    return err ? reject(err) : resolve();
                });
            });
        },
        stopCamera () {
            const self = this;
            return new Promise((resolve, reject) => {
                self.camera.stopCamera((err) => {
                    return err ? reject(err) : resolve();
                });
            });
        },
        photo () {
            const self = this;
            return new Promise((resolve, reject) => {
                self.camera.takePhoto((err, data) => {
                    return err ? reject(err) : resolve(data.src);
                })
            });
        },
        detectFace () {
            const self = this;
            return new Promise((resolve, reject) => {
                self.camera.startFaceDetectionSeconds(this.seconds || 0.2, (err) => {
                    return err ? reject(err) : resolve();
                })
            });
        },
        setSize () {
            if (this.fullSize === true) {
                this.width = window.innerWidth;
                this.height = window.innerHeight;
            } else {
                this.width = window.innerWidth;
                if (this.detector === true) {
                    this.height = window.innerHeight;
                } else {
                    const maxWidth = 450;
                    const prop = 1.3;
                    if (this.width > maxWidth) {
                        this.width = maxWidth;
                    }
                    this.height = this.width * prop;
                }
            }
        }
    },
    async beforeDestroy () {
        await this.stopCamera();
    },
    async mounted () {
        this.setSize();
        this.loading(false);
        await this.init();
    }
};
</script>
<style lang="scss">
.cam-wrapper {
    position: relative;
    .cam-buttons {
        position: absolute;
        bottom: 20px;
        left: 0;
        width: 100%;
        z-index: 3;
        color: white;
        text-align: center;
    }
}
.das-nano-wrapper {
    position: relative;
    display: inline-block;
    canvas {
        position: absolute;
        left: 0;
        top: 0px;
        z-index: 2;
    }
    video {
        position: absolute;
        top: 0;
        left: 50%;
        z-index: 1;
    }
}
</style>
