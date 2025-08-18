// Factory function to create god power hooks

import { GameHook } from '../gameEngine';

// Import all god powers
import { ApolloHook } from './apollo';
import { ArtemisHook } from './artemis';
import { AtlasHook } from './atlas';
import { DemeterHook } from './demeter';
import { HermesHook } from './hermes';
import { ChronusHook } from './chronus';
import { HeraHook } from './hera';

// Import examples
import { ExtraTurnHook } from './examples/extraTurn';
import { PlacementRestrictionHook } from './examples/placementRestriction';

export function createGodPowerHook(godPowerName: string): GameHook | null {
  switch (godPowerName.toLowerCase()) {
    case 'apollo':
      return new ApolloHook();
    case 'artemis':
      return new ArtemisHook();
    case 'atlas':
      return new AtlasHook();
    case 'demeter':
      return new DemeterHook();
    case 'hermes':
      return new HermesHook();
    case 'chronus':
      return new ChronusHook();
    case 'hera':
      return new HeraHook();
    case 'extraturn':
      return new ExtraTurnHook();
    case 'placementrestriction':
      return new PlacementRestrictionHook();
    default:
      return null;
  }
}
