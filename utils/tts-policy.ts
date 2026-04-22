import type { DictionaryEntry } from "../types/dictionary.ts";

export const TTS_SKIPPED_DICTIONARY_IDS = [
  "qz-jyutping",
  "kp-dialect",
  "ts-english-dict",
] as const;

export const TTS_SKIPPED_SOURCE_BOOKS = [
  "欽州粵拼",
  "开平方言",
  "開平方言",
  "台山話英文字典",
] as const;

const skippedDictionaryIds = new Set<string>(TTS_SKIPPED_DICTIONARY_IDS);
const skippedSourceBooks = new Set<string>(TTS_SKIPPED_SOURCE_BOOKS);

export const isTtsSkippedDictionaryId = (dictionaryId?: string | null) => {
  const normalized = dictionaryId?.trim();
  return normalized ? skippedDictionaryIds.has(normalized) : false;
};

export const isTtsSupportedDictionaryId = (dictionaryId?: string | null) => {
  const normalized = dictionaryId?.trim();
  return normalized ? !skippedDictionaryIds.has(normalized) : false;
};

export const isTtsSkippedSourceBook = (sourceBook?: string | null) => {
  const normalized = sourceBook?.trim();
  return normalized ? skippedSourceBooks.has(normalized) : false;
};

export const isTtsSupportedSourceBook = (sourceBook?: string | null) => {
  const normalized = sourceBook?.trim();
  return normalized ? !skippedSourceBooks.has(normalized) : false;
};

export const isTtsSupportedEntry = (
  entry: Pick<DictionaryEntry, "source_book">,
) => {
  return isTtsSupportedSourceBook(entry?.source_book);
};
