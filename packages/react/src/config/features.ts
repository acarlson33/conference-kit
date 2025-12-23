export type FeatureConfig = {
  enableDataChannel?: boolean;
  enableScreenShare?: boolean;
  enableWaitingRoom?: boolean;
  enableHostControls?: boolean;
  enableActiveSpeaker?: boolean;
};

export const defaultFeatures: Required<FeatureConfig> = {
  enableDataChannel: true,
  enableScreenShare: true,
  enableWaitingRoom: false,
  enableHostControls: false,
  enableActiveSpeaker: false,
};

export function mergeFeatures(
  features?: FeatureConfig
): Required<FeatureConfig> {
  return { ...defaultFeatures, ...(features ?? {}) };
}
