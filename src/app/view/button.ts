import { Mesh } from "three";

import { Clickable } from "../model/model";
import { Play } from "../model/gameManager";

export default interface Button {
  mesh: Mesh;
  play?: Play;
  sel_type?: Clickable;
  visible: boolean;

  clear(): void;
  setPlay(play: Play): void;

  click(): Play | undefined;
  hover(): void;
  reset(): void;
}
