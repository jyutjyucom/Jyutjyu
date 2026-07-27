import { defineEventHandler, readBody, createError } from "h3";

const ALLOWED_FEEDBACK_TYPES = ["bug", "feature", "entry-error"] as const;
type FeedbackType = (typeof ALLOWED_FEEDBACK_TYPES)[number];

interface FeedbackRequestBody {
  title: string;
  description: string;
  feedbackType: FeedbackType;
  entryWord?: string;
  entrySource?: string;
  entryId?: string;
  contact?: string;
}

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_OPTIONAL_FIELD_LENGTH = 200;

const escapeMarkdown = (value: string): string => {
  // Escape all ASCII punctuation with Markdown meaning, including "@"
  // (mention autolink) and "["/"]"/"(" (link construction), so user
  // input cannot inject links, mentions, or formatting into the issue.
  return value.replace(/[\\`*_[\]{}()<>#+.!|@~-]/g, "\\$&");
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const token = config.githubToken;
  const repo = config.githubRepo;

  if (!token || !repo) {
    throw createError({
      statusCode: 500,
      message: "GitHub configuration is missing",
    });
  }

  const body = await readBody<FeedbackRequestBody>(event);
  if (
    !body ||
    typeof body.title !== "string" ||
    typeof body.description !== "string" ||
    typeof body.feedbackType !== "string" ||
    !body.title ||
    !body.description ||
    !body.feedbackType
  ) {
    throw createError({
      statusCode: 400,
      message: "Invalid payload",
    });
  }

  if (!ALLOWED_FEEDBACK_TYPES.includes(body.feedbackType)) {
    throw createError({
      statusCode: 400,
      message: "Invalid feedback type",
    });
  }

  if (body.title.length > MAX_TITLE_LENGTH) {
    throw createError({
      statusCode: 400,
      message: `Title exceeds maximum length of ${MAX_TITLE_LENGTH} characters`,
    });
  }
  if (body.description.length > MAX_DESCRIPTION_LENGTH) {
    throw createError({
      statusCode: 400,
      message: `Description exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`,
    });
  }
  const optionalFields: Array<
    ["entryWord" | "entrySource" | "entryId" | "contact", string | undefined]
  > = [
    ["entryWord", body.entryWord],
    ["entrySource", body.entrySource],
    ["entryId", body.entryId],
    ["contact", body.contact],
  ];
  for (const [name, value] of optionalFields) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string") {
      throw createError({ statusCode: 400, message: `${name} must be a string` });
    }
    if (value.length > MAX_OPTIONAL_FIELD_LENGTH) {
      throw createError({ statusCode: 400, message: `${name} too long` });
    }
  }

  const labelMap: Record<FeedbackType, string> = {
    bug: "bug",
    feature: "enhancement",
    "entry-error": "entry-error",
  };

  const issueLabels = [labelMap[body.feedbackType]];

  const issueBody = buildIssueBody(body);

  const apiUrl = `https://api.github.com/repos/${repo}/issues`;

  const res = await $fetch<{ html_url: string; number: number }>(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "jyutjyu-feedback",
    },
    body: {
      title: body.title,
      body: issueBody,
      labels: issueLabels,
    },
  });

  return {
    url: res.html_url,
    number: res.number,
  };
});

const buildIssueBody = (payload: FeedbackRequestBody) => {
  const typeLabels: Record<FeedbackType, string> = {
    bug: "Bug Report",
    feature: "Feature Request",
    "entry-error": "Entry Correction",
  };

  const safeDescription = escapeMarkdown(payload.description);
  const safeEntryWord = escapeMarkdown(payload.entryWord || "N/A");
  const safeEntrySource = escapeMarkdown(payload.entrySource || "N/A");
  const safeEntryId = escapeMarkdown(payload.entryId || "N/A");
  const safeContact = payload.contact ? escapeMarkdown(payload.contact) : "";

  let body = `## ${typeLabels[payload.feedbackType]}

**Description:**
${safeDescription}
`;

  if (payload.feedbackType === "entry-error") {
    body += `
**Entry Details:**
- Headword: ${safeEntryWord}
- Source Book: ${safeEntrySource}
- Entry ID: ${safeEntryId}
`;
  }

  if (safeContact) {
    body += `
**Contact:**
${safeContact}
`;
  }

  body += `
---
*Submitted via Jyutjyu feedback form*`;

  return body;
};
