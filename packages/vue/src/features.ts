export type FeatureConfig = {
  enableDataChannel?: boolean;
  enableScreenShare?: boolean;
  enableWaitingRoom?: boolean;
  enableHostControls?: boolean;
  enableActiveSpeaker?: boolean;
};

export function mergeFeatures(
  defaultConfig: FeatureConfig,
  userConfig?: FeatureConfig
): FeatureConfig {
  return {
    ...defaultConfig,
    ...userConfig,
  };
}
