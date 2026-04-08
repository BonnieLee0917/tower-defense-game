import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // Grass tiles (GREEN) - verified by Vivian's color analysis
    this.load.image('grass1', 'assets/tiles/kenney/towerDefense_tile024.png'); // pure green
    this.load.image('grass2', 'assets/tiles/kenney/towerDefense_tile069.png'); // grass variant
    this.load.image('grass3', 'assets/tiles/kenney/towerDefense_tile070.png'); // grass variant
    this.load.image('grass4', 'assets/tiles/kenney/towerDefense_tile249.png'); // green ground
    this.load.image('grass5', 'assets/tiles/kenney/towerDefense_tile038.png'); // grass variant
    this.load.image('grass6', 'assets/tiles/kenney/towerDefense_tile071.png'); // grass variant
    // Path tiles (BROWN/SAND)
    this.load.image('path1', 'assets/tiles/kenney/towerDefense_tile046.png'); // pure brown sand, uniform brightness

    // --- Tower sprites (archer only) ---
    // 1.png = 70x130 single frame, 3.png = 280x130 (4 frames), 5.png = 420x130 (6 frames)
    this.load.image('archer_lv1', 'assets/towers/archer_lv1.png');
    this.load.spritesheet('archer_lv2', 'assets/towers/archer_lv2.png', {
      frameWidth: 70,
      frameHeight: 130,
    });
    this.load.spritesheet('archer_lv3', 'assets/towers/archer_lv3.png', {
      frameWidth: 70,
      frameHeight: 130,
    });

    // --- Enemy walk spritesheets: 288x48, 6 frames of 48x48 ---
    this.load.spritesheet('enemy_normal_walk', 'assets/enemies/normal_walk.png?v=4', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('enemy_fast_walk', 'assets/enemies/fast_walk.png?v=4', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('enemy_heavy_walk', 'assets/enemies/heavy_walk.png?v=4', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('enemy_flying_walk', 'assets/enemies/flying_walk.png?v=4', {
      frameWidth: 48,
      frameHeight: 48,
    });
  }

  create() {
    // Set NEAREST filter on all loaded textures for pixel-perfect rendering
    [
      'grass1', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6', 'path1',
      'archer_lv1',
      'archer_lv2',
      'archer_lv3',
      'enemy_normal_walk',
      'enemy_fast_walk',
      'enemy_heavy_walk',
      'enemy_flying_walk',
    ].forEach((key) => {
      const texture = this.textures.get(key);
      texture?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    });

    // Create enemy walk animations
    const enemyTypes = ['normal', 'fast', 'heavy', 'flying'];
    for (const type of enemyTypes) {
      this.anims.create({
        key: `enemy_${type}_walk_anim`,
        frames: this.anims.generateFrameNumbers(`enemy_${type}_walk`, { start: 0, end: 5 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    // Create archer idle animations for lv2 and lv3
    this.anims.create({
      key: 'archer_lv2_idle',
      frames: this.anims.generateFrameNumbers('archer_lv2', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'archer_lv3_idle',
      frames: this.anims.generateFrameNumbers('archer_lv3', { start: 0, end: 5 }),
      frameRate: 4,
      repeat: -1,
    });

    this.scene.start('MenuScene');
  }
}
