import BrowserCamera from './BrowserCamera';
import BasicFaceDetector from './BasicFaceDetector';

/**
 * Esta clase controla el cotarro
 * Genera un canvas en el div proporcionado (o crea el div)
 * Le añade la clase para que sea relative por si el video es de browser
 * Si es de browser, el vídeo que genera quedará centrado para que se reproduzca en ios
 */
export default class Controller {

  constructor(options) {
    this._options = Object.assign({
      id : 'face-cam',
      proportion : 1.3,
      format: 'png',
    }, options);
    this._size = this._getSize();
    this._baseElement = this._getBaseElement();
    this._visibleContext = null;
    this._visibleCanvas = this._getVisibleCanvas();
    this._format = this._options.format;
    // COSAS DE CÁMARA / VÍDEO
    this._videoInstance = this._initCamera();
    this._cameraRunning = false;
    this._lastCameraRunning = false;
    // COSAS DE DETECCIÓN DE CARA
    this._detectingFace = false;
    this._facingListeners = [];
    this._facingInstance = new BasicFaceDetector({ size : this._size, listeners : this._facingListeners }); // si se hacen nuevos detectores....

    // INICIO
    this._frame();
  }

  _initCamera() {
    const params = { size : this._getSize(), element : this._baseElement, format: this._format, };
    return new BrowserCamera(params); // cuando haya más dispositivos se elegirá dinámicamente
  }

  _frame() {
    this._videoInstance.requestAnimationFrame(this._frame.bind(this));
    if (this._cameraRunning === true) {
      this._videoInstance.videoFrame();
      const cameraCanvas = this._videoInstance.getCanvas();
      this._updateVisibleCanvas(cameraCanvas);
      if (this._detectingFace) {
        this._facingInstance.detectFace(cameraCanvas, this._visibleContext);
      }
    }
  }

  _finishRotate(cb) {
    const self = this;
    if (this._cameraRunning === true) {
      this._videoInstance.stopCamera((err) => {
        if (err) {
          self._baseCallback(cb, err);
        } else {
          self.setSize();
          self._videoInstance.startCamera(self._lastCameraRunning, cb);
        }
      });
    } else {
      this.setSize();
      this._baseCallback(cb);
    }
  }

  _getSize(force = false) {
    if (this._size === undefined || force === true) {
      const options = this._options;
      const maxWorkSize = 160;
      const marginTop = 50;
      const proportion = options.proportion || 1.33;
      const deviceWidth =  window.innerWidth || window.outerWidth;
      const deviceHeight =  (window.innerHeight || window.outerHeight) - marginTop;
      const maxWidth = options.maxWidth || deviceWidth;
      const maxHeight = options.maxHeight || deviceHeight;
      let width, height = 0;
      if (deviceWidth > deviceHeight) { // es pantalla, usamos el alto y de ahí con el ratio
        height = options.height || maxHeight;
        width = options.width || Math.floor(height * proportion);
      } else {
        width = options.width || maxWidth;
        height = options.height || Math.floor(width * proportion);
      }
      const scale = Math.min(maxWorkSize/width, maxWorkSize/height);
      const w = (width * scale) | 0;
      const h = (height * scale) | 0;
      this._size = {
        screen : { width : deviceWidth, height : deviceHeight },
        isPortrait : (deviceHeight > deviceWidth),
        width,
        height,
        workWidth : w,
        workHeight : h,
        scale
      };
    }
    return this._size;
  }

  _getVisibleCanvas() {
    const size = this._getSize();
    const canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'cam-canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    this._baseElement.appendChild(canvas);
    this._visibleContext = canvas.getContext('2d');
    return canvas;
  }

  _getBaseElement() {
    let element = null;
    const id = this._options.id;
    if (this._options.element === null) {
      element = document.getElementById(id);
    } else {
      element = this._options.element;
    }
    const size = this._getSize();
    if (element === null) {
      const body = document.querySelector('body');
      element = document.createElement('div');
      element.setAttribute('id', id);
      body.insertBefore(element, body.firstChild);
      //body.prependChild(element);
    }
    element.setAttribute('class', 'das-nano-wrapper');
    element.style.width = size.width + 'px';
    element.style.height = size.height + 'px';
    return element;
  }

  _updateVisibleCanvas(cameraCanvas) {
    const size = this._getSize();
    const context = this._visibleContext;
    context.drawImage(cameraCanvas, 0, 0, size.width, size.height);
  }

  _cleanVisibleCanvas() {
    const context = this._visibleContext;
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  }

  _baseCallback(callback, err = null, data = null) {
    try {
      if (typeof callback === 'function') {
        callback(err, data);
      }
    } catch (e) {
      console.error('VideoLib: error in callback', e);
    }
  }


  /**PÚBLICOS**/

  startCamera(camera, callback) {
    const self = this;
    if (this._cameraRunning === false) {
      this._cameraRunning = true;
      this._videoInstance.startCamera(camera, (err) => {
        if (err) {
          self._cameraRunning = false;
        } else {
          self._lastCameraRunning = camera;
        }
        self._baseCallback(callback, err);
      });
    } else {
      this._baseCallback(callback, new Error('Camera is running'));
    }
  }

  stopCamera(callback) {
    const self = this;
    if (this._cameraRunning === true) {
      this._cameraRunning = false;
      this._videoInstance.stopCamera((err) => {
        if (err) {
          self._cameraRunning = true;
        } else {
          self._cleanVisibleCanvas();
        }
        self._baseCallback(callback, err);
      });
    } else {
      this._baseCallback(callback, new Error('Camera is not running'));
    }
  }

  takePhoto(callback) {
    const self = this;
    if (this._cameraRunning === true) {
      this._videoInstance.takePhoto((err, data) => {
        if (err) {
          self._baseCallback(callback, err);
        } else {
          self._baseCallback(callback, null, data);
        }
      });
    } else {
      this._baseCallback(callback, 'Camera is not running');
    }
  }

  startFaceDetectionSeconds(seconds, callback) {
    if (this._cameraRunning === true) {
      this._detectingFace = true;
      this._facingInstance.setSeconds(seconds);
      if (typeof  callback === 'function') {
        this._facingListeners.push(callback);
      }
    } else {
      this._baseCallback(callback, new Error('Camera is not running'));
    }
  }

  startFaceDetection(detections, callback) {
    if (this._cameraRunning === true) {
      this._detectingFace = true;
      this._facingInstance.setDetections(detections);
      if (typeof  callback === 'function') {
        this._facingListeners.push(callback);
      }
    } else {
      this._baseCallback(callback, new Error('Camera is not running'));
    }
  }

  stopFaceDetection(callback) {
    if (this._cameraRunning === true) {
      this._detectingFace = false;
      this._facingInstance.reset();
      this._facingListeners.splice(0, this._facingListeners.length);
      this._baseCallback(callback);
    } else {
      this._baseCallback(callback, new Error('Camera is not running'));
    }
  }

  setSize(width = false, height = false) {
    if (width && height) {
      this._options.width = width;
      this._options.height = height;
    }
    const size = this._getSize(true);
    this._baseElement.style.width = size.width + 'px';
    this._baseElement.style.height = size.height + 'px';
    this._visibleCanvas.width = size.width;
    this._visibleCanvas.height = size.height;
    this._videoInstance.setSize(size);
    this._facingInstance.setSize(size);
  }

  multipleCameras(cb) {
    return this._videoInstance.multipleCameras(cb);
  }

  /**
   * Rota la pantalla. En safari al rotar se para el vídeo, por tanto, vamos a parar la cámara.
   * Hacer el resize y encender la cámara.
   * Timeout porque el alto puede no ser el correcto. @TODO Revisar en proyecto.
   * @param cb
   */
  rotate(cb) {
    const self = this;
    setTimeout(() => {
      self._finishRotate(cb);
    }, 100);
  }

  getCameraResolution() {
    return this._videoInstance.getCameraResolution();
  }

}
