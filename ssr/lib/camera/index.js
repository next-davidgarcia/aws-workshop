import * as l from './libs';
import Controller from './Controller';

export default class FaceCam {

  /**
   * FaceCam Constructor (properties object).
   * Capa de pública
   * @property id: 'face-cam'
   * @property width: window width or proportion if screen width higher than screen height
   * @property height: window height or proportion if screen height higher than screen width
   * @property maxWidth: false
   * @property maxHeight: false
   * @property element: false
   * @property proportion: 1.3 proportion (width:1/height:1.3)
   */
  constructor(options = {}) {
    this._controller = new Controller(options);
  }

  /**
   * Start the camera
   * @param camera: front|rear
   * @param callback: error
   */
  startCamera(camera = 'front', callback) {
    this._controller.startCamera(camera, callback);
  }

  /**
   * Stop the camera
   * @param callback: error
   */
  stopCamera(callback) {
    this._controller.stopCamera(callback);
  }

  /**
   * Take a photo
   * @param callback: error, { src }
   */
  takePhoto(callback) {
    this._controller.takePhoto(callback);
  }

  /**
   * Start face detection
   * @param seconds: 2 Num consecutive seconds with detections
   * @param callback: error Callback called each detection until faceDetection are running
   * En siguientes fases hacer evento
   */
  startFaceDetectionSeconds(seconds = 2, callback) {
    return this._controller.startFaceDetectionSeconds(seconds, callback);
  }

  /**
   * Start face detection
   * @param detections: 20 Num consecutive detections
   * @param callback: error Callback called each detection until faceDetection are running
   * En siguientes fases hacer evento
   */
  startFaceDetection(detections = 20, callback) {
    return this._controller.startFaceDetection(detections, callback);
  }

  /**
   * Stop face detection
   * @param stopCamera: true|false
   * @param callback error
   */
  stopFaceDetection(callback) {
    this._controller.stopFaceDetection(callback);
  }

  /**
   * Upload size
   * @param width
   * @param height
   * @returns {*}
   */
  setSize(width, height) {
    width = parseFloat(width);
    height = parseFloat(height);
    if (isNaN(width) || isNaN(height)) {
      throw new Error('Width & height are required numbers');
    }
    return this._controller.setSize(width, height);
  }

  /**
   * Exists more than one camera??
   * @param cb (err|null, true|false)
   * @returns {*}
   */
  multipleCameras(cb) {
    return this._controller.multipleCameras(cb);
  }

  /**
   * Rotate and redraw component
   * @param cb
   * @returns {*}
   */
  rotate(cb) {
    return this._controller.rotate(cb);
  }

  /**
   * Return camera resolution
   * Error if camera is not running
   * 0,0 if video not started
   */
  getCameraResolution() {
    return this._controller.getCameraResolution();
  }
}
