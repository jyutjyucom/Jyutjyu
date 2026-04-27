import { setHeader } from "h3";

import { shouldApplyMainlandModeration } from "../../utils/moderation";

export default defineEventHandler((event) => {
  setHeader(event, "cache-control", "private, no-store");
  setHeader(event, "vary", "CF-IPCountry");

  return {
    success: true,
    applies: shouldApplyMainlandModeration(event),
  };
});
