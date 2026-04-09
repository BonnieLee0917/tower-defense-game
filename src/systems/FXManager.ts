import Phaser from 'phaser';

/**
 * FXManager — lightweight visual effects for Tower Storm.
 * No particle plugin needed; uses Graphics + Tweens.
 */
export class FXManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Arrow/projectile hit — subtle hit marker */
  hitFlash(x: number, y: number, color = 0xFFFFFF) {
    if (isNaN(x) || isNaN(y) || (x === 0 && y === 0)) return;
    // Tiny quick fade, no expanding white circle
    const gfx = this.scene.add.graphics().setDepth(50);
    gfx.fillStyle(color, 0.3);
    gfx.fillCircle(x, y, 3);
    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 80,
      onComplete: () => gfx.destroy(),
    });
  }

  /** Cannon/splash explosion — orange expanding ring */
  explosion(x: number, y: number, radius: number) {
    const gfx = this.scene.add.graphics().setDepth(50);
    const proxy = { r: 8 };
    this.scene.tweens.add({
      targets: proxy,
      r: radius,
      duration: 250,
      onUpdate: () => {
        gfx.clear();
        const alpha = 0.7 * (1 - proxy.r / radius);
        gfx.fillStyle(0xFF6600, alpha);
        gfx.fillCircle(x, y, proxy.r);
        gfx.lineStyle(2, 0xFF9800, alpha + 0.1);
        gfx.strokeCircle(x, y, proxy.r);
      },
      onComplete: () => gfx.destroy(),
    });
  }

  /** Magic hit — purple sparkle burst */
  magicHit(x: number, y: number) {
    const colors = [0xE040FB, 0xB388FF, 0x7C4DFF];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 12 + Math.random() * 16;
      const px = x + Math.cos(angle) * 4;
      const py = y + Math.sin(angle) * 4;
      const gfx = this.scene.add.graphics().setDepth(50);
      const c = colors[i % colors.length];
      gfx.fillStyle(c, 0.9);
      gfx.fillCircle(px, py, 3);
      this.scene.tweens.add({
        targets: gfx,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        alpha: 0,
        duration: 300 + Math.random() * 100,
        onComplete: () => gfx.destroy(),
      });
    }
  }

  /** Enemy death — fade out + small particles */
  enemyDeath(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const gfx = this.scene.add.graphics().setDepth(50);
      gfx.fillStyle(0xFF4444, 0.7);
      gfx.fillCircle(x, y, 4);
      this.scene.tweens.add({
        targets: gfx,
        x: Math.cos(angle) * 20,
        y: Math.sin(angle) * 20 - 10,
        alpha: 0,
        duration: 400,
        delay: i * 30,
        onComplete: () => gfx.destroy(),
      });
    }
  }

  /** Tower upgrade — golden sparkle ring */
  upgradeEffect(x: number, y: number) {
    const gfx = this.scene.add.graphics().setDepth(50);
    const proxy = { r: 5 };
    this.scene.tweens.add({
      targets: proxy,
      r: 30,
      duration: 400,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        gfx.clear();
        const alpha = 0.8 * (1 - proxy.r / 30);
        gfx.lineStyle(2, 0xFFD600, alpha);
        gfx.strokeCircle(x, y, proxy.r);
        // Sparkle dots
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const sx = x + Math.cos(a) * proxy.r;
          const sy = y + Math.sin(a) * proxy.r;
          gfx.fillStyle(0xFFD600, alpha);
          gfx.fillCircle(sx, sy, 2);
        }
      },
      onComplete: () => gfx.destroy(),
    });
  }

  /** Slow effect applied — blue ring pulse */
  slowEffect(x: number, y: number) {
    const gfx = this.scene.add.graphics().setDepth(49);
    gfx.fillStyle(0x42A5F5, 0.3);
    gfx.fillCircle(x, y, 10);
    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      scaleX: 1.5, scaleY: 1.5,
      duration: 300,
      onComplete: () => gfx.destroy(),
    });
  }

  /** Gold earned — floating coin effect */
  goldEarned(x: number, y: number, amount: number) {
    const txt = this.scene.add.text(x, y, `+${amount}g`, {
      fontSize: '13px', color: '#FFD600', fontFamily: 'Arial', fontStyle: 'bold',
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true, stroke: false },
    }).setOrigin(0.5).setDepth(60);

    this.scene.tweens.add({
      targets: txt,
      y: y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => txt.destroy(),
    });
  }
}
