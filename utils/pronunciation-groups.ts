export const UNANNOTATED_PRONUNCIATION_KEY = "__no_jp__";

export const getPronunciationGroupKeys = (jyutpingList: string[]): string[] => {
  return jyutpingList.length > 0
    ? jyutpingList
    : [UNANNOTATED_PRONUNCIATION_KEY];
};

export const groupEntriesByPronunciation = <T>(
  entries: T[],
  getJyutpingList: (entry: T) => string[],
): Map<string, T[]> => {
  const groups = new Map<string, T[]>();

  entries.forEach((entry) => {
    getPronunciationGroupKeys(getJyutpingList(entry)).forEach((jpKey) => {
      const existingEntries = groups.get(jpKey);
      if (existingEntries) {
        existingEntries.push(entry);
        return;
      }

      groups.set(jpKey, [entry]);
    });
  });

  return groups;
};
