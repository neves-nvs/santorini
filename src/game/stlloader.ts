import {BufferGeometry} from "three";

import {STLLoader} from "three/examples/jsm/loaders/STLLoader";

export {builderGeometry, baseGeometry, midGeometry, topGeometry}

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
function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

const locations: string[] = [
    "assets/Builder.stl",
    "assets/Base.stl",
    "assets/Mid.stl",
    "assets/Top.stl"
];

let builderGeometry: BufferGeometry;
let baseGeometry: BufferGeometry;
let midGeometry: BufferGeometry;
let topGeometry: BufferGeometry;

async function loadAllSTL(locations: string[]){
    const promises: Promise<BufferGeometry>[] = locations.map( location => loadSTL(location));
    await Promise.all(promises).then( geometries => {
        builderGeometry = geometries[0];
        baseGeometry = geometries[1];
        midGeometry = geometries[2];
        topGeometry = geometries[3]
        })
}

await loadAllSTL(locations);

console.timeEnd('STL file loading');

