import * as Phaser from "phaser";


export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.add.text(95, 220, "Arch Charge", {
      fontSize: "32px",
      color: "#ffffff",
    });

    this.add.text(70, 280, "Phaser + TS Connected", {
      fontSize: "20px",
      color: "#9ca3af",
    });
  }
}