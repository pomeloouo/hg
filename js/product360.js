/*!
 * product360.js — 自製 360° 商品旋轉檢視器
 * 用法：<div class="product-360"
 *          data-folder="img/360/"
 *          data-filename="product-{index}.jpg"
 *          data-amount="36"
 *          data-speed="60"
 *          data-drag-speed="3"
 *          data-autoplay="true">
 *       </div>
 *
 * data-folder    : 圖片資料夾路徑（含結尾 /）
 * data-filename  : 檔名樣板，{index} 會被替換為 1, 2, 3...
 * data-amount    : 圖片總張數
 * data-speed     : 自動旋轉每幀間隔（ms），預設 60
 * data-drag-speed: 拖曳靈敏度（數字越大越快），預設 3
 * data-autoplay  : 是否自動旋轉，預設 true
 */
class Product360 {
  constructor(el) {
    this.el       = el;
    this.folder   = el.dataset.folder   || '';
    this.filename = el.dataset.filename || 'frame-{index}.jpg';
    this.amount   = parseInt(el.dataset.amount)    || 36;
    this.speed    = parseInt(el.dataset.speed)     || 60;
    this.dragSpd  = parseFloat(el.dataset.dragSpeed) || 3;
    this.autoplay = el.dataset.autoplay !== 'false';

    this.idx      = 0;
    this.images   = new Array(this.amount);
    this.loaded   = 0;
    this.dragging = false;
    this.lastX    = 0;
    this.timer    = null;

    this._build();
    this._preload();
    this._bind();
  }

  /* ── DOM ── */
  _build() {
    this.el.style.position = 'relative';
    this.el.style.userSelect = 'none';

    // canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;width:100%;cursor:grab;touch-action:none;';
    this.el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // loading bar
    this.bar = document.createElement('div');
    this.bar.style.cssText =
      'position:absolute;bottom:0;left:0;height:3px;width:0%;' +
      'background:#00c8c8;transition:width .1s;border-radius:2px;';
    this.el.appendChild(this.bar);
  }

  /* ── 預載圖片 ── */
  _preload() {
    for (let i = 0; i < this.amount; i++) {
      const img = new Image();
      const src = this.folder + this.filename.replace('{index}', i + 1);
      img.onload = () => {
        this.loaded++;
        this.bar.style.width = (this.loaded / this.amount * 100) + '%';
        if (i === 0) { this._resize(img); this._draw(); }
        if (this.loaded === this.amount) {
          this.bar.style.opacity = '0';
          if (this.autoplay) this._startAuto();
        }
      };
      img.onerror = () => { this.loaded++; };
      img.src = src;
      this.images[i] = img;
    }
  }

  /* ── 調整 canvas 尺寸（依第一張圖比例）── */
  _resize(img) {
    const w = this.el.offsetWidth || 500;
    this.canvas.width  = w;
    this.canvas.height = img.height ? Math.round(w * img.height / img.width) : w;
  }

  /* ── 繪製目前幀 ── */
  _draw() {
    const img = this.images[this.idx];
    if (!img || !img.complete || !img.naturalWidth) return;
    const cw = this.canvas.width, ch = this.canvas.height;
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }

  /* ── 自動旋轉 ── */
  _startAuto() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.idx = (this.idx + 1) % this.amount;
      this._draw();
    }, this.speed);
  }
  _stopAuto() { clearInterval(this.timer); this.timer = null; }

  /* ── 移動到指定幀 ── */
  _moveTo(deltaX) {
    const frames = Math.round(deltaX * this.dragSpd * this.amount / this.canvas.offsetWidth);
    this.idx = ((this.idx - frames) % this.amount + this.amount) % this.amount;
    this._draw();
  }

  /* ── 事件綁定 ── */
  _bind() {
    const c = this.canvas;

    // Mouse
    c.addEventListener('mousedown', e => {
      this.dragging = true; this.lastX = e.clientX;
      this._stopAuto(); c.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', e => {
      if (!this.dragging) return;
      this._moveTo(e.clientX - this.lastX);
      this.lastX = e.clientX;
    });
    document.addEventListener('mouseup', () => {
      if (!this.dragging) return;
      this.dragging = false; c.style.cursor = 'grab';
      if (this.autoplay) this._startAuto();
    });

    // Touch
    c.addEventListener('touchstart', e => {
      this.dragging = true; this.lastX = e.touches[0].clientX;
      this._stopAuto(); e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchmove', e => {
      if (!this.dragging) return;
      this._moveTo(e.touches[0].clientX - this.lastX);
      this.lastX = e.touches[0].clientX;
      e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchend', () => {
      if (!this.dragging) return;
      this.dragging = false;
      if (this.autoplay) this._startAuto();
    });

    // 視窗 resize
    window.addEventListener('resize', () => {
      const img = this.images[this.idx];
      if (img && img.complete) { this._resize(img); this._draw(); }
    });
  }
}

/* ── 自動初始化所有 .product-360 元素 ── */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.product-360').forEach(el => new Product360(el));
});
