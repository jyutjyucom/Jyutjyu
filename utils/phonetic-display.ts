import type { Phonetic } from "~/types/dictionary";

export interface PhoneticDisplayRow {
  jyutping: string;
  original: string | null;
}

type DisplayPhonetic = Pick<Phonetic, "jyutping" | "original">;

export const getOriginalPhoneticForIndex = (
  phonetic: DisplayPhonetic,
  idx: number,
): string | null => {
  const original = phonetic.original;
  const jyutpingArray = phonetic.jyutping || [];
  const currentJyutping = jyutpingArray[idx]?.trim();

  if (!original || (Array.isArray(original) && original.length === 0)) {
    return null;
  }

  if (Array.isArray(original)) {
    if (original.length === 1) {
      if (idx !== 0) return null;
      const singleOriginal = original[0]?.trim();
      if (!singleOriginal || singleOriginal === currentJyutping) return null;
      return singleOriginal;
    }

    const matchedOriginal = original[idx]?.trim();
    if (matchedOriginal && matchedOriginal !== currentJyutping) {
      return matchedOriginal;
    }
    return null;
  }

  const normalizedOriginal = original.trim();
  if (idx !== 0 || !normalizedOriginal || normalizedOriginal === currentJyutping) {
    return null;
  }

  if (normalizedOriginal.includes(":")) {
    const originalParts = normalizedOriginal
      .split(":")
      .map((part) => part.trim())
      .filter(Boolean);
    const jyutpingSet = new Set(jyutpingArray.map((jp) => jp.trim()).filter(Boolean));
    if (originalParts.every((part) => jyutpingSet.has(part))) {
      return null;
    }
  }

  if (normalizedOriginal.includes("(") || normalizedOriginal.includes("（")) {
    const cleanedOriginal = normalizedOriginal
      .replace(/[（(]/g, " ")
      .replace(/[）)]/g, " ")
      .replace(/[,，]/g, " ");
    const allSyllables = cleanedOriginal.split(/\s+/).filter(Boolean);
    const syllableSet = new Set(allSyllables);

    const allSyllablesInJyutping = allSyllables.every(
      (syllable) =>
        jyutpingArray.includes(syllable) ||
        jyutpingArray.some((jp) => jp.includes(syllable)),
    );

    const allJyutpingFromSyllables = jyutpingArray.every((jp) => {
      const jpSyllables = jp.split(/\s+/);
      return jpSyllables.every((syllable) => syllableSet.has(syllable));
    });

    if (allSyllablesInJyutping || allJyutpingFromSyllables) {
      return null;
    }
  }

  return normalizedOriginal;
};

export const getPhoneticDisplayRows = (
  phonetic: DisplayPhonetic,
): PhoneticDisplayRow[] => {
  const seen = new Set<string>();
  const rows: PhoneticDisplayRow[] = [];

  (phonetic.jyutping || []).forEach((jp, idx) => {
    const jyutping = jp?.trim();
    if (!jyutping) return;

    const original = getOriginalPhoneticForIndex(phonetic, idx);
    const key = `${jyutping}||${original ?? ""}`;
    if (seen.has(key)) return;

    seen.add(key);
    rows.push({ jyutping, original });
  });

  return rows;
};
