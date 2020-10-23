// webp -> https://caniuse.com/#search=webp  no es compatible con muchos navegadores
// whammy -> https://github.com/antimatter15/whammy  cuando webp sea compatible nos genera los vídeos
// artículo bueno -> https://ericbidelman.tumblr.com/post/31486670538/creating-webm-video-from-getusermedia
// modernos... https://github.com/muaz-khan/WebRTC-Experiment/tree/master/RecordRTC

export default class BrowserCamera {
  constructor({ size, element, format }) {
    this._size = size;
    this._baseElement = element;
    this._video = this._getVideo();
    this._workContext = null;
    this._workCanvas = this._getCanvas();
    this._stream = null;
    this._canvasStream = null;
    this._drawSize = null;
    this._format = format;
    this._cameraRunning = false;
    this._deviceResolutions = { front : null, rear : null };
    this._resolutions = [
      { width : 4032, height : 3024 },
      { width : 3264, height : 2448 },
      { width : 3264, height : 1836 },
      { width : 3088, height : 2320 },
      { width : 1920, height : 1080 },
      { width : 1280, height : 720 },
      { width : 1000, height : 600 },
      { width : 0, height : 0 } // que conecte sí o sí. Si no se quiere conectar sí o sí quitar
    ];
  }

  _getVideo() {
    if (this._video === undefined) {
      const size = this._getSize();
      const element = this._baseElement;
      this._video = document.createElement('video');
      this._video.width = 1;
      this._video.height = size.height;
      this._video.setAttribute('webkit-playsinline', 'webkit-playsinline');
      this._video.setAttribute('autoplay', 'autoplay');
      this._video.setAttribute('muted', 'muted');
      this._video.setAttribute('playsinline', 'playsinline');
      element.insertBefore(this._video, element.firstChild);
      //element.prependChild(this._video);
    }
    return this._video;
  }

  _getCanvas() {
    const size = this._getSize();
    this._workCanvas = document.createElement('canvas');
    this._workCanvas.width = size.width;
    this._workCanvas.height = size.height;
    this._workContext = this._workCanvas.getContext('2d');
    return this._workCanvas;
  }

  _getSize() {
    return this._size;
  }

  _isPortrait() {
    const size = this._getSize();
  }

  _modernStartAux(camera, resolutions, cb) {
    try {
      const self = this;
      const resolution = resolutions.shift();
      const info = {
        audio : false,
        video : {
          facingMode: (camera === 'rear') ? 'environment' : 'user'
        }
      };
      // if (resolution.width !== 0 && resolution.height !== 0) {
      //   info.video.width = { min : resolution.width };
      //   info.video.height = { min : resolution.height };
      // }
      navigator.mediaDevices.getUserMedia(info).then((stream) => {
        console.info('Connection camera with resolution', info.video);
        cb(null, { stream, resolution });
      }).catch((err) => {
        console.error('no va con modern', info, err);
        if (resolutions.length !== 0) {
          self._modernStartAux(camera, resolutions, cb);
        } else {
          cb(err);
        }
      });
    } catch (e) {
      cb(e);
    }
  }

  _modernStart(camera, cb) {
    const self = this;
    try {
      const currentResolution = this._deviceResolutions[camera];
      let resolutions;
      if (currentResolution !== null) {
        resolutions = [currentResolution];
      } else {
        resolutions = JSON.parse(JSON.stringify(this._resolutions));
      }
      this._modernStartAux(camera, resolutions, (err, data) => {
        if (err !== null) {
          cb(err);
        } else {
          console.info('Modern Browsers camera connection');
          self._video.srcObject = data.stream;
          self._deviceResolutions[camera] = data.resolution;
          cb(null, data.stream);
        }
      });
    } catch (e) {
      cb(e);
    }
  }

  _basicStart(cb) {
    const self = this;
    try {
      const data = { video : true, audio : false };
      if (navigator.getUserMedia) {
        navigator.getUserMedia(data, (stream) => {
          console.info('Old Browsers camera connection');
          self._video.src = compatibility.URL.createObjectURL(stream);
          cb(null, stream);
        }, cb);
      } else if (navigator.webkitGetUserMedia) {
        navigator.webkitGetUserMedia(data, (stream) => {
          console.info('Old Browsers camera connection');
          self._video.src = window.webkitURL.createObjectURL(stream);
          cb(null, stream);
        }, cb);
      } else if (navigator.mozGetUserMedia) {
        navigator.mozGetUserMedia(data, (stream) => {
          console.info('Old Browsers camera connection');
          self._video.mozSrcObject = stream;
          cb(null, stream);
        }, cb);
      } else {
        cb(new Error('Camera not available'));
      }
    } catch (e) {
      cb(e);
    }
  }

  _connectCamera(camera, callback) {
    const self = this;
    this._modernStart(camera, (err, stream) => {
      if (err) {
        self._basicStart((err, stream) => {
          if (err) {
            callback(err);
          } else {
            self._stream = stream;
            self._video.play();
            callback();
          }
        });
      } else {
        self._stream = stream;
        self._video.play();
        callback();
      }
    })
  }

  _stopStream(type, stream) {
    const streams = stream !== undefined ?  stream.getTracks() : this._stream.getTracks();
    streams.forEach((stream) => {
      if (stream.kind === type) {
        stream.stop();
      }
    });
  }

  _getDrawSize() {
    const size = this._getSize();
    const srcSize = this.getCameraResolution();
    if (srcSize && srcSize.width === 0) { // aún no hay vídeo
      return false;
    }
    if (this._drawSize === null) {
      const base = { x: srcSize.width, y: srcSize.height, offsetX: 0, offsetY: 0 };
      const mult = Math.max(size.width/base.x, size.height/base.y);
      base.dx = base.x * mult;
      base.dy = base.y * mult;
      base.offsetX = -0.5 * (base.dx - size.width);
      base.offsetY =  -0.5 * (base.dy - size.height);
      this._drawSize = base;
    }
    return this._drawSize;
  }

  _drawWorkContext(size) {
    if (size !== false) {
      this._workContext.drawImage(this._video, 0, 0, size.x, size.y, size.offsetX, size.offsetY, size.dx, size.dy);
    }
  }

  videoFrame() {
    const size = this._getDrawSize();
    this._drawWorkContext(size);
  }

  startCamera(camera, callback) {
    const self = this;
    if (this._cameraRunning === false) {
      this._cameraRunning = true;
      this._connectCamera(camera, (err) => {
        if (err) {
          self._cameraRunning = false;
          callback(err);
        } else {
          callback();
        }
      });
    } else {
      callback(new Error('Camera is running'));
    }
  }

  stopCamera(callback) {
    const self = this;
    if (this._cameraRunning === true) {
      this._cameraRunning = false;
      try {
        this._video.pause();
        this._video.src = '';
        this._stopStream('video');
        callback();
      } catch (e) {
        callback(e);
      }
    } else {
      callback(new Error('Camera is not running'));
    }
  }

  getCanvas() {
    return this._workCanvas;
  }

  takePhoto(callback) {
    if (this._cameraRunning === true) {
      try {
        const video = this._video;
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.canvas.width = video.videoWidth;
        ctx.canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const src = (this._format === 'png') ? ctx.canvas.toDataURL() : ctx.canvas.toDataURL('image/jpeg', 0.7);
        callback(null, { src });
      } catch (e) {
        callback(e);
      }
    } else {
      callback(new Error('Camera is not running'));
    }
  }

  requestAnimationFrame(fn) {
    return compatibility.requestAnimationFrame(() => fn());
  }

  setSize(size) {
    this._size = size;
    this._workCanvas.width = size.width;
    this._workCanvas.height = size.height;
    this._video.height = size.height + 'px';
    this._drawSize = null;
  }

  multipleCameras(cb) {
    if (this._cameraRunning === true) {
      try {
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          const video = devices.filter((a) => a.kind === 'videoinput');
          cb(null, video.length > 1);
        }, cb);
      } catch (e) {
        cb(e);
      }
    } else {
      cb(new Error('Camera is not running'));
    }
  }

  getCameraResolution() {
    if (this._cameraRunning === true) {
      return { width : this._video.videoWidth, height : this._video.videoHeight };
    } else {
      throw new Error('Camera is not running');
    }
  }

}
