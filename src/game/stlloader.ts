import {BufferGeometry} from "three";

import {STLLoader} from "three/examples/jsm/loaders/STLLoader";

export {builderGeometry, baseGeometry, midGeometry, topGeometry}


const stlloader: STLLoader = new STLLoader();

async function loadSTL(filePath: string): Promise<BufferGeometry> {
    return await stlloader.loadAsync(filePath);
}

/*TODO make STL file loading concurrent
const loadSTL_concurrentTest = async(filePath: string) => {
    await delay(1000);
    return stlloader.loadAsync(filePath);
};
function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}
*/

const ASSETS_FOLDER: string = "assets/";

const builderFileLocation: string = ASSETS_FOLDER.concat("Builder.stl");

const baseFileLocation: string = ASSETS_FOLDER.concat("Base.stl");

const midFileLocation: string = ASSETS_FOLDER.concat("Mid.stl");

const topFileLocation: string = ASSETS_FOLDER.concat("Top.stl");

/**
 *
 */
const builderGeometry:BufferGeometry = await loadSTL(builderFileLocation);

const baseGeometry: BufferGeometry = await loadSTL(baseFileLocation);

const midGeometry: BufferGeometry = await loadSTL(midFileLocation);

const topGeometry: BufferGeometry = await loadSTL(topFileLocation);




