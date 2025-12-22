export type FeatureConfig = {
  enableDataChannel?: boolean;
  enableScreenShare?: boolean;
};

export const defaultFeatures: Required<FeatureConfig> = {
  enableDataChannel: true,
  enableScreenShare: true,
};

export function mergeFeatures(
  features?: FeatureConfig
): Required<FeatureConfig> {
  return { ...defaultFeatures, ...(features ?? {}) };
}
