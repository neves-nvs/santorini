// Atlas - Titan Shouldering the Heavens
// Power: Your Worker may build a dome at any level.

import { GameContext, GameHook, Play } from '../gameEngine';

export class AtlasHook implements GameHook {
  name = "Atlas";
  priority = 10;

  modifyBuildingMoves(moves: Play[], _context: GameContext): Play[] {
    // Atlas can build domes at any level, so add dome options to all building positions
    const enhancedMoves = [...moves];

    // For each regular building move, add a dome option
    moves.forEach(move => {
      if (move.type === "build_block" && move.position) {
        enhancedMoves.push({
          type: "build_dome",
          position: move.position,
          // Atlas can build dome at any level
          buildingType: "dome"
        });
      }
    });

    return enhancedMoves;
  }
}
