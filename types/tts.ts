export interface TtsManifestV1 {
  version: 1;
  voiceId: string;
  voiceVersion: string;
  baseUrl: string;
  items: Record<string, string>;
}

export interface PronunciationDisplayItem {
  label: string;
  normalized: string;
  ttsEligible: boolean;
}

export interface EntryPronunciationDisplayItem extends PronunciationDisplayItem {
  original: string | null;
}
