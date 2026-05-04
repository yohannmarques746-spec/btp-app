import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors } from "../../shared/auth/serverlessHelpers";
import { generateCsrfToken } from "../../shared/auth/csrf";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;

  res.status(200).json({ token: generateCsrfToken() });
}
