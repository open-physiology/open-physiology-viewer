import {THREE} from '../utils';

//This is an unused class that we may need rto replace SpriteText2D for drawing labels after three.js upgrade
// (the current version is obsolete)

export class SpriteText2D extends THREE.Sprite {
  constructor(text, fontParams = {}) {
    super();
    // Default font parameters
    const fontParts = (fontParams.font || '24px Arial').split(' ');
    let fontSize = 24;
    let fontFamily = 'Arial';
    if (fontParts.length >= 2) {
      fontSize = parseInt(fontParts[0]) || 24;
      fontFamily = fontParts.slice(1).join(' ');
    }

    this.fontParams = {
      fontFamily: fontParams.fontFamily || fontFamily,
      fontSize: fontParams.fontSize || fontSize,
      fontWeight: fontParams.fontWeight || 'normal',
      color: fontParams.color || fontParams.fillStyle || '#000000',
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
    this.updateSprite();
  }

  updateSprite() {
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
    if (this.material && this.material.map) {
        this.material.map.dispose();
    }
    const texture = new THREE.CanvasTexture(this.canvas);
    texture.colorSpace = THREE.SRGBColorSpace; // render canvas colors correctly under sRGB output (three r152+)
    texture.needsUpdate = true;

    // Create or update sprite material
    if (this.material && this.material.isSpriteMaterial) {
        this.material.map = texture;
        this.material.needsUpdate = true;
    } else {
        const oldAlphaTest = (this.material && this.material.alphaTest) || 0;
        this.material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            alphaTest: oldAlphaTest
        });
        this.renderOrder = 999;
    }

    // Scale sprite to maintain aspect ratio.
    // Sprites are sized in WORLD units, not pixels. baseScale must be proportional to the
    // rendered canvas height (tens of units) so the label is visible in a scaleFactor-scaled
    // scene (objects span ~100*scaleFactor units). This restores the legacy three-text2d
    // behaviour that labelRelSize (~0.1-4) was tuned to multiply; normalizing to ~1 unit
    // (fontSize/32) made every label sub-pixel and effectively invisible.
    this.aspect = this.canvas.width / this.canvas.height;
    this.baseScale = this.canvas.height; // intrinsic label height in world units
    this.scale.set(this.aspect * this.baseScale, this.baseScale, 1);
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
    this.updateSprite();
  }

  // Update font parameters
  setFontParams(newParams) {
    this.fontParams = { ...this.fontParams, ...newParams };
    this.updateSprite();
  }

  // Position the sprite in 3D space
  setPosition(x, y, z) {
    this.position.set(x, y, z);
  }

  // Get the Three.js sprite object
  getSprite() {
    return this;
  }

  // Dispose of resources
  dispose() {
    if (this.material) {
      if (this.material.map) {
        this.material.map.dispose();
      }
      this.material.dispose();
    }
  }
}