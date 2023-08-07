import { Mesh } from "three";

import { ButtonType } from "../common/objects";

export default interface Button {
  mesh: Mesh;
  type: ButtonType;
  active: boolean; 

  hover(): void;
  reset(): void;
}
