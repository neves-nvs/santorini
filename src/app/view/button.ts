import { Mesh } from "three";

import Play from "./messages";
import { ButtonType } from "../common/objects";

export default interface Button {
  mesh: Mesh;
  type: ButtonType;

  clearPlay(): void;
  setPlay(play: Play): void;

  hover(): void;
  reset(): void;
}
