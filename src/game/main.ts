import * as Phaser from "phaser";
import config from "./config";

let game: Phaser.Game | null = null;

export const startGame = (): Phaser.Game => {
  if (!game) {
    game = new Phaser.Game(config);
  }

  return game;
};

export const destroyGame = (): void => {
  if (game) {
    game.destroy(true);
    game = null;
  }
};