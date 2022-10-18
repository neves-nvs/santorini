import {Mesh} from "three";


export interface Selectable{
    mesh: Mesh
    x: number
    y: number
    sel_type: SelectableType;

    highlight(): void;
    
    normal(): void;

    reset(): void;


    /**
     * if class is supposed to be selected, onClick() return itself, undefined otherwise
     */
}

export enum SelectableType {
    Builder,
    Space,
    Block
}