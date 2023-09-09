// import { AxesHelper, GridHelper, Scene } from "three";

// import Board3D from "./Board3D";

// import Player from "../../../server/src/model/Player";

// import Button from "../Button";
// import Play, { PlayType } from "../common/messages";
// import Position from "../common/position";

// export default class Game {
//   scene: Scene;

//   board: Board3D;

//   axesHelper = new AxesHelper(5);
//   gridHelper = new GridHelper(11, 11);

//   constructor(scene: Scene) {
//     this.scene = scene;

//     this.board = new Board3D();
//     this.scene.add(this.board);

//     this.scene.add(this.gridHelper);

//     this.scene.add(this.axesHelper);

//     this.gameManager = new OfflineGameManager();
//     this.gameManager.addPlayer(new Player("Miguel"));
//     this.gameManager.addPlayer(new Player("Afonso"));
//     this.gameManager.start();

//     let plays: Play[] = this.gameManager.getPlays();
//     plays.forEach((p) => this.showPlay(p));
//   }

//   getSelectableButtons(): Button[] {
//     let selectable: Button[] = [];
//     this.board.spaces
//       .flat() // list of all spaces
//       .map((space) => space.getActiveButtons()) // map each space into the list of its selectable pisces
//       .flat()
//       .forEach((b) => selectable.push(b)); // add to return
//     this.board.spaces
//       .flat() // all spaces
//       //.filter(b => b.play != undefined) // filter to only spaces with plays
//       .forEach((space) => selectable.push(space)); // add to return
//     return selectable;
//   }

//   update(delta: number) {
//     this.board.update(delta);
//   }

//   onClick() {
//     // let play: Play | undefined = button.play;
//     //if (play == undefined) throw Error('Error');
//     //console.log(`${play.type} from ${play.source.destructure()} to ${play.destiny?.destructure()}`);

//     try {
//       // play on game manager
//       //this.gameManager.play(play);
//     } catch (e) {
//       throw Error("Error");
//     }

//     // apply to 3D Model
//     //this.apply(play.type, play.source, play.destiny);
//     // clear remaining plays
//     //this.board.spaces.flat().forEach(b => b.clearPlay());

//     // get next play
//     let plays = this.gameManager.getPlays();
//     // plays.forEach(p => this.showPlay(p));
//     console.log(plays);
//   }

//   showPlay(play: Play) {
//     switch (play.type) {
//       case "PLACE":
//         this.spaceShowPlay(play);
//         break;
//       case "MOVE":
//         // this.builderShowPlay(play);
//         break;
//       case "BUILD":
//         break;
//     }
//   }

//   spaceShowPlay(play: Play) {
//     let space = this.board.getSpace(play.source);
//     //space.setPlay(play);
//   }

//   apply(type: PlayType, source: Position, destiny?: Position) {
//     switch (type) {
//       case "PLACE":
//         // this.board.placeBuilder(source);
//         break;
//       case "MOVE":
//         if (destiny == undefined) throw Error("Error");
//         // this.board.move(source, destiny); //TODO
//         break;
//       case "BUILD":
//         // this.board.build(source);
//         break;
//     }
//   }
// }
