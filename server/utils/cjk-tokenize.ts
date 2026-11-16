/**
 * CJK 分詞（給 D1 FTS5 用）
 *
 * FTS5 內建分詞器對中文不友好：unicode61 會把整段中文當成一個 token，
 * trigram 只支援 >=3 字。這裡在寫入與查詢時都把中文切成「單字 + 相鄰雙字」，
 * 讓 1~2 字的粵語查詢也能精確命中。
 */

const CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u;

/**
 * 把文字切成以空格分隔的 token。
 */
export const tokenizeCjk = (text: string): string => {
  const out: string[] = [];
  let cjk: string[] = [];
  let latin = "";

  const flushCjk = () => {
    if (cjk.length === 0) return;
    for (const ch of cjk) out.push(ch);
    for (let i = 0; i < cjk.length - 1; i += 1) out.push(cjk[i] + cjk[i + 1]);
    cjk = [];
  };

  const flushLatin = () => {
    const trimmed = latin.trim().toLowerCase();
    if (trimmed) {
      for (const part of trimmed.split(/[^a-z0-9']+/)) {
        if (part) out.push(part);
      }
    }
    latin = "";
  };

  for (const ch of String(text || "")) {
    if (CJK_RE.test(ch)) {
      flushLatin();
      cjk.push(ch);
    } else if (/\s/.test(ch)) {
      flushCjk();
      flushLatin();
    } else {
      flushCjk();
      latin += ch;
    }
  }
  flushCjk();
  flushLatin();

  return out.join(" ");
};

/**
 * 把使用者輸入轉成 FTS5 MATCH 表達式。
 */
export const buildMatchExpression = (
  query: string,
  column: string,
  operator: "AND" | "OR" = "AND",
): string | null => {
  const tokens = tokenizeCjk(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens.map((token) => column + ':"' + token + '"').join(" " + operator + " ");
};
