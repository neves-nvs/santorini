import {BufferGeometry} from "three";

import {STLLoader} from "three/examples/jsm/loaders/STLLoader";

console.time('STL file loading');

const stlloader: STLLoader = new STLLoader();

async function loadSTL(filePath: string){
    await delay(0);
    return stlloader.loadAsync(filePath);
}

/**
 * used for testing loading times
 * @param ms
 */
export function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

const locations: string[] = [
    "assets/Builder.stl",
    "assets/Base.stl",
    "assets/Mid.stl",
    "assets/Top.stl",
    "assets/Dome.stl",
    "assets/Board.stl"
];

export let builderGeometry: BufferGeometry;
export let baseGeometry: BufferGeometry;
export let midGeometry: BufferGeometry;
export let topGeometry: BufferGeometry;
export let domeGeometry: BufferGeometry;
export let boardGeometry: BufferGeometry;

async function loadAllSTL(locations: string[]){
    const promises: Promise<BufferGeometry>[] = locations.map( location => loadSTL(location));
    await Promise.all(promises).then( geometries => {
        builderGeometry = geometries[0];
        baseGeometry = geometries[1];
        midGeometry = geometries[2];
        topGeometry = geometries[3];
        domeGeometry = geometries[4];
        boardGeometry = geometries[5];
        })
}

await loadAllSTL(locations);

console.timeEnd('STL file loading');

