import { Audio, AudioListener, AudioLoader, PositionalAudio } from "three";

import SceneManager from "./SceneManager";

export default class AudioManager {
  private sceneManager: SceneManager;

  private listener: AudioListener;
  private globalAudio: Audio;
  private audioLoader: AudioLoader;
  private audioSources: Audio[];

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.listener = new AudioListener();
    this.sceneManager.getCamera().add(this.listener);

    this.globalAudio = new Audio(this.listener);
    this.audioLoader = new AudioLoader();

    this.audioSources = [];
  }

  // Load and add a global audio source
  loadGlobalAudio(audioFile: string) {
    this.audioLoader.load(audioFile, buffer => {
      this.globalAudio.setBuffer(buffer);
    });
  }

  // Play the global audio
  playGlobalAudio() {
    this.globalAudio.play();
  }

  // Create and add a spatial audio source
  createSpatialAudio(audioFile: string, position: THREE.Vector3) {
    const audioSource = new PositionalAudio(this.listener);
    this.audioLoader.load(audioFile, buffer => {
      audioSource.setBuffer(buffer);
      audioSource.setRefDistance(10); // Adjust the reference distance as needed
      audioSource.setRolloffFactor(2); // Adjust the rolloff factor as needed
      audioSource.position.set(position.x, position.y, position.z);
      //this.audioSources.push(audioSource);
      this.sceneManager.add(audioSource);
    });
  }

  // Play a spatial audio source
  playSpatialAudio(index: number) {
    if (index >= 0 && index < this.audioSources.length) {
      this.audioSources[index].play();
    }
  }
}
