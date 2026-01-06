import {THREE} from '../utils';

//This is an unused class that we may need rto replace SpriteText2D for drawing labels after three.js upgrade
// (the current version is obsolete)

export class SpriteText2D {
  constructor(text, fontParams = {}) {
    // Default font parameters
    this.fontParams = {
      fontFamily: fontParams.fontFamily || 'Arial',
      fontSize: fontParams.fontSize || 32,
      fontWeight: fontParams.fontWeight || 'normal',
      color: fontParams.color || '#ffffff',
      backgroundColor: fontParams.backgroundColor || 'transparent',
      padding: fontParams.padding || 10,
      borderRadius: fontParams.borderRadius || 0,
      borderWidth: fontParams.borderWidth || 0,
      borderColor: fontParams.borderColor || '#000000'
    };

    this.text = text;
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');

    // Create the sprite
    this.sprite = null;
    this.createSprite();
  }

  createSprite() {
    // Measure text to determine canvas size
    this.context.font = `${this.fontParams.fontWeight} ${this.fontParams.fontSize}px ${this.fontParams.fontFamily}`;
    const metrics = this.context.measureText(this.text);
    const textWidth = metrics.width;
    const textHeight = this.fontParams.fontSize;

    // Set canvas size with padding
    const padding = this.fontParams.padding;
    this.canvas.width = textWidth + padding * 2;
    this.canvas.height = textHeight + padding * 2;

    // Redraw with proper size (canvas resize clears it)
    this.context.font = `${this.fontParams.fontWeight} ${this.fontParams.fontSize}px ${this.fontParams.fontFamily}`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';

    // Draw background
    if (this.fontParams.backgroundColor !== 'transparent') {
      this.context.fillStyle = this.fontParams.backgroundColor;
      if (this.fontParams.borderRadius > 0) {
        this.roundRect(
          0, 0,
          this.canvas.width,
          this.canvas.height,
          this.fontParams.borderRadius
        );
        this.context.fill();
      } else {
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    // Draw border
    if (this.fontParams.borderWidth > 0) {
      this.context.strokeStyle = this.fontParams.borderColor;
      this.context.lineWidth = this.fontParams.borderWidth;
      if (this.fontParams.borderRadius > 0) {
        this.roundRect(
          this.fontParams.borderWidth / 2,
          this.fontParams.borderWidth / 2,
          this.canvas.width - this.fontParams.borderWidth,
          this.canvas.height - this.fontParams.borderWidth,
          this.fontParams.borderRadius
        );
        this.context.stroke();
      } else {
        this.context.strokeRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    // Draw text
    this.context.fillStyle = this.fontParams.color;
    this.context.fillText(
      this.text,
      this.canvas.width / 2,
      this.canvas.height / 2
    );

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(this.canvas);
    texture.needsUpdate = true;

    // Create sprite material
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });

    // Create sprite
    this.sprite = new THREE.Sprite(material);

    // Scale sprite to maintain aspect ratio
    const aspect = this.canvas.width / this.canvas.height;
    this.sprite.scale.set(aspect, 1, 1);

    return this.sprite;
  }

  roundRect(x, y, width, height, radius) {
    this.context.beginPath();
    this.context.moveTo(x + radius, y);
    this.context.lineTo(x + width - radius, y);
    this.context.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.context.lineTo(x + width, y + height - radius);
    this.context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.context.lineTo(x + radius, y + height);
    this.context.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.context.lineTo(x, y + radius);
    this.context.quadraticCurveTo(x, y, x + radius, y);
    this.context.closePath();
  }

  // Update text content
  setText(newText) {
    this.text = newText;
    this.createSprite();
  }

  // Update font parameters
  setFontParams(newParams) {
    this.fontParams = { ...this.fontParams, ...newParams };
    this.createSprite();
  }

  // Position the sprite in 3D space
  setPosition(x, y, z) {
    if (this.sprite) {
      this.sprite.position.set(x, y, z);
    }
  }

  // Get the Three.js sprite object
  getSprite() {
    return this.sprite;
  }

  // Dispose of resources
  dispose() {
    if (this.sprite && this.sprite.material) {
      if (this.sprite.material.map) {
        this.sprite.material.map.dispose();
      }
      this.sprite.material.dispose();
    }
  }
}