import * as Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private chargeText!: Phaser.GameObjects.Text;
  private dragLine!: Phaser.GameObjects.Graphics;

  private isCharging = false;
  private chargeStartTime = 0;

  private pointerDownPos = new Phaser.Math.Vector2();
  private currentPointerPos = new Phaser.Math.Vector2();

  constructor() {
    super("GameScene");
  }

  create(): void {
    const { width, height } = this.scale;

    // Background arena feel
    this.add.rectangle(width / 2, height / 2, width, height, 0x10131c);

    // Optional subtle arena border
    this.add.circle(width / 2, height / 2, 160, 0x000000, 0).setStrokeStyle(2, 0x2a3142, 1);

    // Player node
    this.player = this.add.circle(width / 2, height / 2, 18, 0x7c5cff);

    // Charge status text
    this.chargeText = this.add.text(16, 16, "Charge: 0", {
      fontSize: "20px",
      color: "#ffffff",
    });

    // Drag line graphics
    this.dragLine = this.add.graphics();

    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerup", this.handlePointerUp, this);
  }

  update(): void {
    if (!this.isCharging) return;

    const chargeDuration = (this.time.now - this.chargeStartTime) / 1000;
    const chargeAmount = Math.min(chargeDuration, 3);

    this.chargeText.setText(`Charge: ${chargeAmount.toFixed(2)}`);

    this.drawDragIndicator(chargeAmount);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.isCharging = true;
    this.chargeStartTime = this.time.now;

    this.pointerDownPos.set(pointer.x, pointer.y);
    this.currentPointerPos.set(pointer.x, pointer.y);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isCharging) return;

    this.currentPointerPos.set(pointer.x, pointer.y);
  }

  private handlePointerUp(): void {
    this.isCharging = false;
    this.chargeText.setText("Charge: 0");
    this.dragLine.clear();
  }

  private drawDragIndicator(chargeAmount: number): void {
    this.dragLine.clear();

    const dx = this.currentPointerPos.x - this.pointerDownPos.x;
    const dy = this.currentPointerPos.y - this.pointerDownPos.y;

    const dragDistance = Phaser.Math.Distance.Between(
      this.pointerDownPos.x,
      this.pointerDownPos.y,
      this.currentPointerPos.x,
      this.currentPointerPos.y
    );

    const cappedDistance = Math.min(dragDistance, 140);

    const angle = Math.atan2(dy, dx);

    const endX = this.player.x + Math.cos(angle) * cappedDistance;
    const endY = this.player.y + Math.sin(angle) * cappedDistance;

    const lineWidth = 2 + chargeAmount * 2;

    this.dragLine.lineStyle(lineWidth, 0x66e0ff, 0.95);
    this.dragLine.beginPath();
    this.dragLine.moveTo(this.player.x, this.player.y);
    this.dragLine.lineTo(endX, endY);
    this.dragLine.strokePath();

    // little aiming circle at the end
    this.dragLine.fillStyle(0xffffff, 0.9);
    this.dragLine.fillCircle(endX, endY, 6 + chargeAmount * 2);
  }
}