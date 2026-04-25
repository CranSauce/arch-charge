import * as Phaser from "phaser";
import BlastNode from "../entities/BlastNode";
import Enemy from "../entities/Enemy";

export default class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private arena!: Phaser.GameObjects.Arc;
  private chargeText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private dragLine!: Phaser.GameObjects.Graphics;

  private isCharging = false;
  private chargeStartTime = 0;

  private pointerDownPos = new Phaser.Math.Vector2();
  private currentPointerPos = new Phaser.Math.Vector2();

  private blastNodes: BlastNode[] = [];
  private enemies: Enemy[] = [];
  private spawnTimer = 0;
  private killCount = 0;

  private centerX = 0;
  private centerY = 0;

  private arenaRadius = 160;
  private maxDragDistance = 160;

  private chargeSpeed = 1.5;

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

    this.killText = this.add.text(16, 50, "Kills: 0", {
      fontSize: "20px",
      color: "#ffffff",
    });

    this.dragLine = this.add.graphics();

    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerup", this.handlePointerUp, this);
  }

  update(_time: number, delta: number): void {
    if (this.isCharging) {
      const chargeDuration =
        ((this.time.now - this.chargeStartTime) / 1000) * this.chargeSpeed;
      const chargeAmount = Math.min(chargeDuration, 3);

      this.chargeText.setText(`Charge: ${chargeAmount.toFixed(2)}`);
      this.drawDragIndicator(chargeAmount);
    }

    this.blastNodes = this.blastNodes.filter((node) => {
      if (!node.active) return false;
      node.update(delta);
      return node.active;
    });

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

    this.enemies.forEach((enemy) => {
      enemy.update(this.centerX, this.centerY);
    });

    this.resolveBlastCollisions();
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
        this.centerY + Math.sin(angle) * this.maxDragDistance
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
        this.centerY + Math.sin(angle) * this.maxDragDistance
      );
    }
  }

  private handlePointerUp(): void {
    if (!this.isCharging) return;

    const chargeDuration =
      ((this.time.now - this.chargeStartTime) / 1000) * this.chargeSpeed;
    const chargeAmount = Math.min(chargeDuration, 3);

    const dx = this.currentPointerPos.x - this.centerX;
    const dy = this.currentPointerPos.y - this.centerY;

    const dragVector = new Phaser.Math.Vector2(dx, dy);
    const dragDistance = Math.min(dragVector.length(), this.maxDragDistance);

    if (dragDistance > 0) {
      const direction = dragVector.normalize();

      const dashX = direction.x * dragDistance;
      const dashY = direction.y * dragDistance;

      const destinationX = this.centerX + dashX;
      const destinationY = this.centerY + dashY;

      this.spawnBlastTrail(
        this.centerX,
        this.centerY,
        destinationX,
        destinationY,
        chargeAmount
      );

      // Damage the whole teleport line BEFORE shifting enemies for the teleport illusion.
      this.resolveBlastCollisions();

      this.spawnFlash(this.centerX, this.centerY, 16, 0.45);
      this.spawnFlash(destinationX, destinationY, 28 + chargeAmount * 6, 0.85);

      const shakeDuration = 80 + chargeAmount * 55;
      const shakeIntensity = 0.003 + chargeAmount * 0.0035;

      this.cameras.main.shake(shakeDuration, shakeIntensity);

      this.enemies.forEach((enemy) => {
        enemy.x -= dashX;
        enemy.y -= dashY;
      });
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
      chargeProgress * 100
    );

    const glowColor = Phaser.Display.Color.GetColor(
      lineColor.r,
      lineColor.g,
      lineColor.b
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
    chargeAmount: number
  ): void {
    const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);

    const radius = 6 + chargeAmount * 10;
    const spacing = Math.max(6, radius * 0.65);
    const count = Math.max(1, Math.floor(distance / spacing));

    for (let i = 0; i <= count; i++) {
      const t = i / count;

      const x = Phaser.Math.Linear(startX, endX, t);
      const y = Phaser.Math.Linear(startY, endY, t);

      const node = new BlastNode(this, x, y, radius);
      this.blastNodes.push(node);
    }
  }

  private resolveBlastCollisions(): void {
    this.enemies = this.enemies.filter((enemy) => {
      for (const node of this.blastNodes) {
        const enemyHalfWidth = enemy.width / 2;
        const enemyHalfHeight = enemy.height / 2;

        const closestX = Phaser.Math.Clamp(
          node.x,
          enemy.x - enemyHalfWidth,
          enemy.x + enemyHalfWidth
        );

        const closestY = Phaser.Math.Clamp(
          node.y,
          enemy.y - enemyHalfHeight,
          enemy.y + enemyHalfHeight
        );

        const dist = Phaser.Math.Distance.Between(
          node.x,
          node.y,
          closestX,
          closestY
        );

        if (dist <= node.radius) {
          enemy.destroy();
          this.killCount++;
          this.killText.setText(`Kills: ${this.killCount}`);
          return false;
        }
      }

      return true;
    });
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