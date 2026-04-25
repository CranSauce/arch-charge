import * as Phaser from "phaser";

export default class Enemy extends Phaser.GameObjects.Rectangle {
  private speed = 0.2;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 20, 20, 0xff5c5c);

    scene.add.existing(this);
  }

  update(targetX: number, targetY: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;

    const direction = new Phaser.Math.Vector2(dx, dy);

    if (direction.length() === 0) return;

    direction.normalize();

    this.x += direction.x * this.speed;
    this.y += direction.y * this.speed;
  }
}