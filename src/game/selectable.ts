import {Mesh, Vector2} from "three";

export interface Selectable{
    selectable: boolean;
    mesh: Mesh
    grid_position: Vector2;
    type: SelectableType;

    dim(): void;

    deDim(): void
}

export enum SelectableType {
    Builder,
    Space
}