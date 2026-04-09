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
    // Decoration tiles (trees/bushes)
    this.load.image('deco1', 'assets/tiles/kenney/towerDefense_tile131.png'); // tree
    this.load.image('deco2', 'assets/tiles/kenney/towerDefense_tile132.png'); // tree variant
    this.load.image('deco3', 'assets/tiles/kenney/towerDefense_tile133.png'); // bush
    this.load.image('deco4', 'assets/tiles/kenney/towerDefense_tile134.png'); // bush variant
    // Path tiles (BROWN/SAND)
    this.load.image('path1', 'assets/tiles/kenney/towerDefense_tile046.png'); // pure brown sand, uniform brightness

    // --- Tower sprites (archer only) ---
    // Tower sprites from CraftPix Pack1
    // 1.png = 70x130 single frame, 2-3.png = 280x130 (4 frames), 4-7.png = 420x130 (6 frames)
    this.load.image('archer_lv1', 'assets/towers/archer_lv1.png');
    this.load.spritesheet('archer_lv2', 'assets/towers/archer_lv2.png', {
      frameWidth: 70,
      frameHeight: 130,
    });
    this.load.spritesheet('archer_lv3', 'assets/towers/archer_lv3.png', {
      frameWidth: 70,
      frameHeight: 130,
    });
    // Cannon tower — CraftPix Catapult Tower pack
    this.load.image('cannon_lv1', 'assets/towers/catapult/idle_lv1.png');
    this.load.spritesheet('cannon_lv2', 'assets/towers/catapult/idle_lv2.png', {
      frameWidth: 70,
      frameHeight: 130,
    });
    this.load.spritesheet('cannon_lv3', 'assets/towers/catapult/idle_lv3.png', {
      frameWidth: 70,
      frameHeight: 130,
    });
    // Magic tower — CraftPix Mage Tower pack
    this.load.image('magic_lv1', 'assets/towers/mage/idle_lv1.png');
    this.load.spritesheet('magic_lv2', 'assets/towers/mage/idle_lv2.png', {
      frameWidth: 70,
      frameHeight: 130,
    });
    this.load.spritesheet('magic_lv3', 'assets/towers/mage/idle_lv3.png', {
      frameWidth: 70,
      frameHeight: 130,
    });
    // Barracks — CraftPix Guardian Tower pack
    this.load.image('barracks_lv1', 'assets/towers/guardian/idle_lv1.png');
    this.load.spritesheet('barracks_lv2', 'assets/towers/guardian/idle_lv2.png', {
      frameWidth: 70,
      frameHeight: 130,
    });
    this.load.spritesheet('barracks_lv3', 'assets/towers/guardian/idle_lv3.png', {
      frameWidth: 70,
      frameHeight: 130,
    });

    // --- Enemy walk spritesheets: 288x48, 6 frames of 48x48 ---
    this.load.spritesheet('enemy_normal_walk', 'assets/enemies/normal_walk.png?v=6', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('enemy_fast_walk', 'assets/enemies/fast_walk.png?v=6', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('enemy_heavy_walk', 'assets/enemies/heavy_walk.png?v=6', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('enemy_flying_walk', 'assets/enemies/flying_walk.png?v=6', {
      frameWidth: 48,
      frameHeight: 48,
    });
  }

  create() {
    // Set NEAREST filter on all loaded textures for pixel-perfect rendering
    [
      'grass1', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6', 'path1',
      'deco1', 'deco2', 'deco3', 'deco4',
      'archer_lv1',
      'archer_lv2',
      'archer_lv3',
      'cannon_sprite',
      'magic_lv1', 'magic_lv2', 'magic_lv3',
      'barracks_sprite',
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

    // Cannon tower animations — CraftPix Catapult pack
    // Lv1 = single image, no animation
    // Lv2 = 280×130 = 4 frames, Lv3 = 420×130 = 6 frames
    this.anims.create({
      key: 'cannon_lv2_idle',
      frames: this.anims.generateFrameNumbers('cannon_lv2', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'cannon_lv3_idle',
      frames: this.anims.generateFrameNumbers('cannon_lv3', { start: 0, end: 5 }),
      frameRate: 4,
      repeat: -1,
    });
    // Magic tower animations — CraftPix Mage pack
    // Lv1 = single image, no animation
    this.anims.create({
      key: 'magic_lv2_idle',
      frames: this.anims.generateFrameNumbers('magic_lv2', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'magic_lv3_idle',
      frames: this.anims.generateFrameNumbers('magic_lv3', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    // Barracks animations — CraftPix Guardian pack
    // Lv1 = single image, no animation
    this.anims.create({
      key: 'barracks_lv2_idle',
      frames: this.anims.generateFrameNumbers('barracks_lv2', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'barracks_lv3_idle',
      frames: this.anims.generateFrameNumbers('barracks_lv3', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });

    this.scene.start('MenuScene');
  }
}
