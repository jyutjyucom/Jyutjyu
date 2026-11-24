import { getRequestURL, setHeader } from "h3";
import { getSecurityHeaders } from "../../utils/security-headers";

export default defineEventHandler((event) => {
  const { pathname } = getRequestURL(event);
  const headers = getSecurityHeaders(pathname);

  for (const [name, value] of Object.entries(headers)) {
    setHeader(event, name, value);
  }
});
