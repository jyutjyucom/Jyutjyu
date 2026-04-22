import type { DictionaryEntry } from "../types/dictionary.ts";
import type {
  EntryPronunciationDisplayItem,
  PronunciationDisplayItem,
} from "../types/tts.ts";
import { getPhoneticDisplayRows } from "./phonetic-display.ts";
import { isTtsSupportedSourceBook } from "./tts-policy.ts";

const collapseInternalWhitespace = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
};

export const normalizeTtsJyutping = (value: string): string => {
  return collapseInternalWhitespace(value).toLowerCase();
};

export const getTtsPhonemeJyutping = (value: string): string => {
  return collapseInternalWhitespace(value)
    .split(" ")
    .map((token) => token.replace(/([1-9])\*([1-9])$/u, "$2"))
    .join(" ");
};

export const getUniquePronunciationValues = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const label = collapseInternalWhitespace(value || "");
    const normalized = normalizeTtsJyutping(label);
    if (!label || !normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(label);
  });

  return result;
};

export const joinPronunciationValues = (values: string[]): string => {
  return getUniquePronunciationValues(values).join("; ");
};

export const getEntryPronunciationValues = (
  entry: Pick<DictionaryEntry, "phonetic">,
): string[] => {
  return getUniquePronunciationValues(entry?.phonetic?.jyutping || []);
};

export const getEntryPronunciationDisplayItems = (
  entry: Pick<DictionaryEntry, "phonetic" | "source_book">,
): EntryPronunciationDisplayItem[] => {
  const ttsEligible = isTtsSupportedSourceBook(entry.source_book);
  const seen = new Set<string>();
  const result: EntryPronunciationDisplayItem[] = [];

  getPhoneticDisplayRows(entry.phonetic).forEach((row) => {
    const label = collapseInternalWhitespace(row.jyutping || "");
    const normalized = normalizeTtsJyutping(label);
    if (!label || !normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push({
      label,
      normalized,
      ttsEligible,
      original: row.original,
    });
  });

  return result;
};

export const getAggregatePronunciationDisplayItems = (
  entries: Array<Pick<DictionaryEntry, "phonetic" | "source_book">>,
): PronunciationDisplayItem[] => {
  const pronunciationMap = new Map<string, PronunciationDisplayItem>();

  entries.forEach((entry) => {
    const ttsEligible = isTtsSupportedSourceBook(entry.source_book);
    getEntryPronunciationValues(entry).forEach((label) => {
      const normalized = normalizeTtsJyutping(label);
      if (!normalized) return;

      const existing = pronunciationMap.get(normalized);
      if (existing) {
        if (ttsEligible) {
          existing.ttsEligible = true;
        }
        return;
      }

      pronunciationMap.set(normalized, {
        label,
        normalized,
        ttsEligible,
      });
    });
  });

  return Array.from(pronunciationMap.values());
};
