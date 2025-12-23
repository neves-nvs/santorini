// Factory function to create god power hooks

import { ApolloHook } from './apollo';
import { ArtemisHook } from './artemis';
import { AtlasHook } from './atlas';
import { ChronusHook } from './chronus';
import { DemeterHook } from './demeter';
import { ExtraTurnHook } from './examples/extraTurn';
import { GameHook } from '../gameEngine';
import { HeraHook } from './hera';
import { HermesHook } from './hermes';
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
