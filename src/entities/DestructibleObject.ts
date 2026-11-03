// ============================================================
//  NarutoSurvivor — Destructible Interactive World Objects
//  Training logs and ninja crates that drop rewards when broken
// ============================================================

import { Container, Graphics } from 'pixi.js';

export type DestructibleType = 'training_log' | 'ninja_crate';

export class DestructibleObject {
  readonly container: Container;
  private readonly body: Graphics;

  id: number;
  x: number;
  y: number;
  hp = 25;
  maxHp = 25;
  type: DestructibleType;
  isBroken = false;
  radius = 16;

  private static _idCounter = 0;

  constructor(x: number, y: number, type: DestructibleType = 'training_log') {
    this.id = ++DestructibleObject._idCounter;
    this.x = x;
    this.y = y;
    this.type = type;

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    this.body = new Graphics();
    this.drawGraphic();
    this.container.addChild(this.body);
  }

  private drawGraphic(): void {
    const g = this.body;
    g.clear();

    if (this.type === 'training_log') {
      // Wood training post / Substitution log (Tronco di Sostituzione)
      g.roundRect(-10, -18, 20, 36, 4);
      g.fill({ color: 0x78350F });
      g.stroke({ color: 0x451A03, width: 1.5 });

      // Tree rings on top
      g.ellipse(0, -18, 10, 4);
      g.fill({ color: 0xB45309 });

      // Straw rope
      g.rect(-10, -3, 20, 6);
      g.fill({ color: 0xFDE68A });

      // Leaf symbol
      g.circle(0, 8, 3.5);
      g.fill({ color: 0x15803D });
    } else {
      // Ninja crate
      g.roundRect(-12, -12, 24, 24, 4);
      g.fill({ color: 0x92400E });
      g.stroke({ color: 0x451A03, width: 2 });
      g.rect(-12, -2, 24, 4);
      g.fill({ color: 0x78350F });
      g.rect(-2, -12, 4, 24);
      g.fill({ color: 0x78350F });
    }
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isBroken = true;
    }
    this.body.tint = 0xFCA5A5;
    setTimeout(() => { if (this.body) this.body.tint = 0xffffff; }, 80);
  }
}
