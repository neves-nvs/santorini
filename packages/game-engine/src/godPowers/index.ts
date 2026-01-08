// God Powers - Main exports
// This file exports all god powers and provides the factory function

export { GameHook } from '../types';

// Individual god power exports
export { ArtemisHook } from './artemis';
export { AtlasHook } from './atlas';
export { DemeterHook } from './demeter';
export { ApolloHook } from './apollo';
export { HermesHook } from './hermes';
export { ChronusHook } from './chronus';
export { HeraHook } from './hera';

// Example/utility god powers
export { ExtraTurnHook } from './examples/extraTurn';
export { PlacementRestrictionHook } from './examples/placementRestriction';

// Factory function
export { createGodPowerHook } from './factory';
