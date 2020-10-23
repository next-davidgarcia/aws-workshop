
export default class BasicFaceDetector {
  constructor({ size, listeners }) {
    this._size = size;
    this._count = 0;
    this._detections = 20;
    this._listeners = listeners;
    this._time = 0;
    this._workContext = null;
    this._workCanvas = this._getCanvas();
  }

  _getSize() {
    return this._size;
  }

  setSize(size) {
    this._size = size;
  }

  _getCanvas() {
    const size = this._getSize();
    this._detections = null;
    this._seconds = null;
    this._workCanvas = document.createElement('canvas');
    this._workCanvas.width = size.workWidth;
    this._workCanvas.height = size.workHeight;
    this._workContext = this._workCanvas.getContext('2d');
    return this._workCanvas;
  }

  setDetections(num) {
    this._detections = num;
  }

  setSeconds(seconds) {
    this._seconds = seconds;
  }

  reset() {
    this._detections = null;
    this._seconds = null;
  }

  detectFace(cameraCanvas, visibleContext) {
    const size = this._getSize();
    const w = size.workWidth;
    const h = size.workHeight;
    const workContext = this._workContext;
    const img_u8 = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
    const ii_sum = new Int32Array((w+1)*(h+1));
    const ii_sqsum = new Int32Array((w+1)*(h+1));
    const ii_tilted = new Int32Array((w+1)*(h+1));
    const classifier = jsfeat.haar.frontalface;
    workContext.drawImage(cameraCanvas, 0, 0, w, h);
    const imageData = workContext.getImageData(0, 0, w, h);
    jsfeat.imgproc.grayscale(imageData.data, w, h, img_u8);
    jsfeat.imgproc.compute_integral_image(img_u8, ii_sum, ii_sqsum, classifier.tilted ? ii_tilted : null);
    jsfeat.haar.edges_density = 0.5;
    let rects = jsfeat.haar.detect_multi_scale(ii_sum, ii_sqsum, ii_tilted, null, img_u8.cols, img_u8.rows, classifier, 1.2, 2);
    rects = jsfeat.haar.group_rectangles(rects, 1);
    this._drawFace(visibleContext, rects, size.width/img_u8.cols);
  }

  _drawFace(visibleContext, rects, sc) {
    visibleContext.fillStyle = "rgb(0,255,0)";
    visibleContext.strokeStyle = "rgb(0,255,0)";
    const on = rects.length;
    if(on) {
      jsfeat.math.qsort(rects, 0, 0, (a,b) => (b.confidence < a.confidence));
    }
    const n = Math.min(1, on);
    for(let i = 0; i < n; ++i) {
      const r = rects[i];
      visibleContext.strokeRect((r.x*sc)|0,(r.y*sc)|0,(r.width*sc)|0,(r.height*sc)|0);
    }
    this._check(n);
  }

  _check(rects) {
    let detected = false;
    if (rects === 1) {
      this._count++;
      if (this._time === 0) { // empezamos a contar
        this._time = new Date().getTime();
      }
    } else {
      this._count = 0;
      this._time = 0;
    }

    if ((this._seconds !== null) && (this._time !== 0)) {
      const time = this._time;
      const actual = new Date().getTime();
      if ((actual - time) >= this._seconds * 1000) {
        detected = true;
        this._time = 0;
      }
    } else if (this._detections !== null) {
      if (this._count >= this._detections) {
        this._count = 0;
        detected = true;
      }
    }
    if (detected === true) {
      const listeners = this._listeners || [];
      listeners.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.error('Error in face detection', e);
        }
      });
    }
  }

}