import * as Phaser from "phaser";

export default class BlastNode extends Phaser.GameObjects.Arc {
  private life = 200;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number) {
    super(scene, x, y, radius, 0, 360, false, 0x66e0ff, 0.7);

    scene.add.existing(this);

    this.setStrokeStyle(2, 0xffffff, 0.9);
  }

  update(delta: number): void {
    this.life -= delta;

    const progress = Phaser.Math.Clamp(this.life / 200, 0, 1);
    this.setAlpha(progress);
    this.setScale(1 + (1 - progress) * 0.5);

    if (this.life <= 0) {
      this.destroy();
    }
  }
}