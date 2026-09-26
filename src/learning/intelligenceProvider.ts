import type { IntelligenceProvider } from "../core/models";

export const deterministicProvider: IntelligenceProvider = {
  id: "codingsensei.deterministic",
  mode: "deterministic",
  required: false
};

export interface IntelligenceProviderRegistry {
  readonly coreProvider: IntelligenceProvider;
  readonly optionalProviders: readonly IntelligenceProvider[];
}

export const intelligenceProviderRegistry: IntelligenceProviderRegistry = {
  coreProvider: deterministicProvider,
  optionalProviders: []
};
