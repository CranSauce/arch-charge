import * as Phaser from "phaser";
import BlastNode from "../entities/BlastNode";
import Enemy from "../entities/Enemy";

export default class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private arena!: Phaser.GameObjects.Arc;
  private chargeText!: Phaser.GameObjects.Text;
  private dragLine!: Phaser.GameObjects.Graphics;

  private isCharging = false;
  private chargeStartTime = 0;

  private pointerDownPos = new Phaser.Math.Vector2();
  private currentPointerPos = new Phaser.Math.Vector2();

  private blastNodes: BlastNode[] = [];

  private enemies: Enemy[] = [];
  private spawnTimer = 0;

  private centerX = 0;
  private centerY = 0;

  private arenaRadius = 160;
  private maxDragDistance = 160;

  private worldOffset = new Phaser.Math.Vector2(0, 0);

  constructor() {
    super("GameScene");
  }

  create(): void {
    const { width, height } = this.scale;

    this.centerX = width / 2;
    this.centerY = height / 2;

    this.add.rectangle(width / 2, height / 2, width, height, 0x10131c);

    this.arena = this.add
      .circle(this.centerX, this.centerY, this.arenaRadius, 0x000000, 0)
      .setStrokeStyle(2, 0x2a3142, 1);

    this.player = this.add.circle(this.centerX, this.centerY, 18, 0x7c5cff);

    this.chargeText = this.add.text(16, 16, "Charge: 0", {
      fontSize: "20px",
      color: "#ffffff",
    });

    this.dragLine = this.add.graphics();

    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerup", this.handlePointerUp, this);
  }

  update(_time: number, delta: number): void {
    // ===== CHARGE + DRAG =====
    if (this.isCharging) {
      const chargeDuration =
        ((this.time.now - this.chargeStartTime) / 1000) * 1.5;
      const chargeAmount = Math.min(chargeDuration, 3);

      this.chargeText.setText(`Charge: ${chargeAmount.toFixed(2)}`);
      this.drawDragIndicator(chargeAmount);
    }

    // ===== BLAST NODES =====
    this.blastNodes = this.blastNodes.filter((node) => {
      if (!node.active) return false;
      node.update(delta);
      return node.active;
    });

    // ===== ENEMY SPAWNING =====
    this.spawnTimer += delta;

    if (this.spawnTimer > 1000) {
      this.spawnTimer = 0;

      const { width, height } = this.scale;
      const side = Phaser.Math.Between(0, 3);

      let x = 0;
      let y = 0;

      if (side === 0) {
        x = Phaser.Math.Between(0, width);
        y = -20;
      }

      if (side === 1) {
        x = Phaser.Math.Between(0, width);
        y = height + 20;
      }

      if (side === 2) {
        x = -20;
        y = Phaser.Math.Between(0, height);
      }

      if (side === 3) {
        x = width + 20;
        y = Phaser.Math.Between(0, height);
      }

      const enemy = new Enemy(this, x, y);
      this.enemies.push(enemy);
    }

    // ===== ENEMY MOVEMENT =====
    this.enemies.forEach((enemy) => {
      enemy.update(this.centerX, this.centerY);
    });

    // ===== ENEMY COLLISION (KILL) =====
    this.enemies = this.enemies.filter((enemy) => {
      for (const node of this.blastNodes) {
        const dist = Phaser.Math.Distance.Between(
          enemy.x,
          enemy.y,
          node.x,
          node.y,
        );

        if (dist < node.radius) {
          enemy.destroy();
          return false;
        }
      }
      return true;
    });
  }
  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.isCharging = true;
    this.chargeStartTime = this.time.now;

    this.pointerDownPos.set(this.centerX, this.centerY);

    const dx = pointer.x - this.centerX;
    const dy = pointer.y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= this.maxDragDistance) {
      this.currentPointerPos.set(pointer.x, pointer.y);
    } else {
      const angle = Math.atan2(dy, dx);
      this.currentPointerPos.set(
        this.centerX + Math.cos(angle) * this.maxDragDistance,
        this.centerY + Math.sin(angle) * this.maxDragDistance,
      );
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isCharging) return;

    const dx = pointer.x - this.centerX;
    const dy = pointer.y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= this.maxDragDistance) {
      this.currentPointerPos.set(pointer.x, pointer.y);
    } else {
      const angle = Math.atan2(dy, dx);
      this.currentPointerPos.set(
        this.centerX + Math.cos(angle) * this.maxDragDistance,
        this.centerY + Math.sin(angle) * this.maxDragDistance,
      );
    }
  }

  private handlePointerUp(): void {
    if (!this.isCharging) return;

    const chargeDuration = (this.time.now - this.chargeStartTime) / 1000;
    const chargeAmount = Math.min(chargeDuration, 3);

    const dx = this.currentPointerPos.x - this.centerX;
    const dy = this.currentPointerPos.y - this.centerY;

    const dragVector = new Phaser.Math.Vector2(dx, dy);
    const dragDistance = Math.min(dragVector.length(), this.maxDragDistance);

    if (dragDistance > 0) {
      const direction = dragVector.normalize();
      const shakeDuration = 80 + chargeAmount * 55;
      const shakeIntensity = 0.003 + chargeAmount * 0.0035;

      const destinationX = this.centerX + direction.x * dragDistance;
      const destinationY = this.centerY + direction.y * dragDistance;

      this.spawnBlastTrail(
        this.centerX,
        this.centerY,
        destinationX,
        destinationY,
        chargeAmount,
      );

      this.spawnFlash(this.centerX, this.centerY, 16, 0.45);
      this.spawnFlash(destinationX, destinationY, 28 + chargeAmount * 6, 0.85);

      this.cameras.main.shake(shakeDuration, shakeIntensity);

      this.worldOffset.x -= direction.x * dragDistance;
      this.worldOffset.y -= direction.y * dragDistance;
    }

    this.isCharging = false;
    this.chargeText.setText("Charge: 0");
    this.dragLine.clear();
  }

  private drawDragIndicator(chargeAmount: number): void {
    this.dragLine.clear();

    const dx = this.currentPointerPos.x - this.centerX;
    const dy = this.currentPointerPos.y - this.centerY;

    const dragDistance = Math.sqrt(dx * dx + dy * dy);
    const cappedDistance = Math.min(dragDistance, this.maxDragDistance);

    if (cappedDistance <= 0) return;

    const angle = Math.atan2(dy, dx);

    const endX = this.centerX + Math.cos(angle) * cappedDistance;
    const endY = this.centerY + Math.sin(angle) * cappedDistance;

    const chargeProgress = Phaser.Math.Clamp(chargeAmount / 3, 0, 1);

    const lineWidth = 2 + chargeAmount * 2;
    const lineColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x66e0ff),
      Phaser.Display.Color.ValueToColor(0xffffff),
      100,
      chargeProgress * 100,
    );

    const glowColor = Phaser.Display.Color.GetColor(
      lineColor.r,
      lineColor.g,
      lineColor.b,
    );

    this.dragLine.lineStyle(lineWidth + 4, glowColor, 0.18);
    this.dragLine.beginPath();
    this.dragLine.moveTo(this.centerX, this.centerY);
    this.dragLine.lineTo(endX, endY);
    this.dragLine.strokePath();

    this.dragLine.lineStyle(lineWidth, glowColor, 0.95);
    this.dragLine.beginPath();
    this.dragLine.moveTo(this.centerX, this.centerY);
    this.dragLine.lineTo(endX, endY);
    this.dragLine.strokePath();

    this.dragLine.fillStyle(glowColor, 0.95);
    this.dragLine.fillCircle(endX, endY, 6 + chargeAmount * 2.5);

    this.dragLine.lineStyle(2, 0xffffff, 0.75);
    this.dragLine.strokeCircle(endX, endY, 10 + chargeAmount * 2);
  }

  private spawnBlastTrail(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    chargeAmount: number,
  ): void {
    const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);

    const spacing = Math.max(18, 30 - chargeAmount * 4);
    const count = Math.max(1, Math.floor(distance / spacing));

    for (let i = 0; i <= count; i++) {
      const t = i / count;

      const x = Phaser.Math.Linear(startX, endX, t);
      const y = Phaser.Math.Linear(startY, endY, t);

      const radius = 6 + chargeAmount * 10;

      const node = new BlastNode(this, x, y, radius);
      this.blastNodes.push(node);
    }
  }

  private spawnFlash(x: number, y: number, radius: number, alpha = 0.8): void {
    const flash = this.add.circle(x, y, radius, 0xffffff, alpha);

    this.tweens.add({
      targets: flash,
      scale: 1.8,
      alpha: 0,
      duration: 140,
      ease: "Quad.easeOut",
      onComplete: () => {
        flash.destroy();
      },
    });
  }
}
