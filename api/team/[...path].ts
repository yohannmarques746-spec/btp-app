// ============================================================================
// api/team/[...path].ts
//
// Dispatcher unique pour TOUS les endpoints /api/team/*.
// Remplace les 17 fichiers serverless individuels par UN seul, pour rester
// sous la limite Vercel Hobby de 12 serverless functions par déploiement.
//
// Routing :
//   GET    /api/team/csrf-token
//   POST   /api/team/login-pin (+ alias /login)
//   POST   /api/team/login-invite
//   POST   /api/team/logout
//   GET    /api/team/me (+ alias /session)
//   GET    /api/team/notes
//   POST   /api/team/notes
//   GET    /api/team/co-owners
//   POST   /api/team/co-owners
//   DELETE /api/team/co-owners/:userId
//   GET    /api/team/members
//   POST   /api/team/members
//   POST   /api/team/members/me/set-pin
//   GET    /api/team/members/:id
//   DELETE /api/team/members/:id
//   POST   /api/team/members/:id/confirm
//   POST   /api/team/members/:id/refuse
//   PATCH  /api/team/members/:id/pin
//   PATCH  /api/team/members/:id/permissions
//   PATCH  /api/team/members/:id/status
// ============================================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  withCors,
  extractBearer,
  requireCsrf,
  requireRateLimit,
} from "../../shared/auth/serverlessHelpers";
import { requireAuth, requireOwnerOrCoOwner } from "../../shared/auth/middleware";
import { generateCsrfToken } from "../../shared/auth/csrf";
import {
  loginPin,
  loginInvite,
  logoutMember,
  getMemberSession,
} from "../../shared/team/auth";
import {
  listMembers,
  getMember,
  createMember,
  updateMemberPin,
  confirmMember,
  refuseMember,
  updatePermissions,
  updateStatus,
  deleteMember,
  setOwnPin,
} from "../../shared/team/members";
import { listNotes, createNote } from "../../shared/team/notes";
import { listCoOwners, addCoOwner, removeCoOwner } from "../../shared/team/coOwners";

type Result = { status: number; body: unknown };

function send(res: VercelResponse, result: Result): void {
  res.status(result.status).json(result.body);
}

function methodNotAllowed(res: VercelResponse): void {
  res.status(405).json({ error: "Method Not Allowed" });
}

function notFound(res: VercelResponse): void {
  res.status(404).json({ error: "Route introuvable" });
}

function badRequest(res: VercelResponse, message: string): void {
  res.status(400).json({ error: message });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (withCors(req, res)) return;

  // req.query.path est un tableau de segments d'URL après /api/team/
  // Ex: /api/team/members/abc-123/confirm → path = ["members", "abc-123", "confirm"]
  const rawPath = req.query.path;
  const segments: string[] = Array.isArray(rawPath)
    ? rawPath
    : typeof rawPath === "string"
      ? [rawPath]
      : [];

  const method = req.method ?? "GET";
  const [a, b, c] = segments;

  // ─── /api/team/csrf-token ─────────────────────────────────────────────────
  if (a === "csrf-token" && segments.length === 1) {
    if (method !== "GET") return methodNotAllowed(res);
    res.status(200).json({ token: generateCsrfToken() });
    return;
  }

  // ─── /api/team/login-pin (+ alias /login) ─────────────────────────────────
  if ((a === "login-pin" || a === "login") && segments.length === 1) {
    if (method !== "POST") return methodNotAllowed(res);
    if (!requireCsrf(req, res)) return;

    const body = (req.body ?? {}) as { pin?: string; ownerId?: string };
    if (!body.pin || !body.ownerId) {
      return badRequest(res, "PIN et ownerId requis");
    }
    if (!requireRateLimit(req, res, body.ownerId)) return;

    return send(res, await loginPin(body.pin, body.ownerId));
  }

  // ─── /api/team/login-invite ───────────────────────────────────────────────
  if (a === "login-invite" && segments.length === 1) {
    if (method !== "POST") return methodNotAllowed(res);
    if (!requireCsrf(req, res)) return;

    const body = (req.body ?? {}) as { token?: string; pin?: string };
    if (!body.token || !body.pin) {
      return badRequest(res, "token et pin requis");
    }
    if (!requireRateLimit(req, res, "invite")) return;

    return send(res, await loginInvite(body.token, body.pin));
  }

  // ─── /api/team/logout ─────────────────────────────────────────────────────
  if (a === "logout" && segments.length === 1) {
    if (method !== "POST") return methodNotAllowed(res);
    if (!requireCsrf(req, res)) return;

    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({ error: "Token manquant" });
      return;
    }
    return send(res, await logoutMember(token));
  }

  // ─── /api/team/me et /api/team/session ────────────────────────────────────
  if ((a === "me" || a === "session") && segments.length === 1) {
    if (method !== "GET") return methodNotAllowed(res);

    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({ error: "Token manquant" });
      return;
    }
    return send(res, await getMemberSession(token));
  }

  // ─── /api/team/notes (GET + POST) ─────────────────────────────────────────
  if (a === "notes" && segments.length === 1) {
    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({ error: "Token manquant" });
      return;
    }

    if (method === "GET") {
      return send(res, await listNotes(token));
    }
    if (method === "POST") {
      if (!requireCsrf(req, res)) return;
      const body = (req.body ?? {}) as { chantierId?: string; content?: string };
      if (!body.chantierId || !body.content?.trim()) {
        return badRequest(res, "chantierId et content requis");
      }
      return send(res, await createNote(token, body.chantierId, body.content.trim()));
    }
    return methodNotAllowed(res);
  }

  // ─── /api/team/co-owners (GET + POST) et /co-owners/:userId (DELETE) ──────
  if (a === "co-owners") {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    // /api/team/co-owners
    if (segments.length === 1) {
      if (method === "GET") {
        const ownerId = req.query.ownerId as string | undefined;
        if (!ownerId) return badRequest(res, "ownerId requis");
        if (!(await requireOwnerOrCoOwner(auth.user.id, ownerId, res))) return;
        return send(res, await listCoOwners(ownerId));
      }
      if (method === "POST") {
        if (!requireCsrf(req, res)) return;
        const body = (req.body ?? {}) as { email?: string; ownerId?: string };
        if (!body.email?.trim() || !body.ownerId) {
          return badRequest(res, "Email et ownerId requis");
        }
        if (!(await requireOwnerOrCoOwner(auth.user.id, body.ownerId, res))) return;
        return send(res, await addCoOwner(body.ownerId, body.email, auth.user.email ?? ""));
      }
      return methodNotAllowed(res);
    }

    // /api/team/co-owners/:userId
    if (segments.length === 2) {
      if (method !== "DELETE") return methodNotAllowed(res);
      if (!requireCsrf(req, res)) return;

      const userId = b;
      const body = (req.body ?? {}) as { ownerId?: string };
      if (!body.ownerId) return badRequest(res, "ownerId requis");
      if (!(await requireOwnerOrCoOwner(auth.user.id, body.ownerId, res))) return;
      return send(res, await removeCoOwner(body.ownerId, userId));
    }

    return notFound(res);
  }

  // ─── /api/team/members et sous-routes ─────────────────────────────────────
  if (a === "members") {
    // /api/team/members (GET + POST)
    if (segments.length === 1) {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      if (method === "GET") {
        const ownerId = req.query.ownerId as string | undefined;
        const status = req.query.status as string | undefined;
        if (!ownerId) return badRequest(res, "ownerId requis");
        if (!(await requireOwnerOrCoOwner(auth.user.id, ownerId, res))) return;
        return send(res, await listMembers(ownerId, status));
      }
      if (method === "POST") {
        if (!requireCsrf(req, res)) return;
        const body = (req.body ?? {}) as {
          name?: string;
          pin?: string;
          role?: string;
          ownerId?: string;
        };
        if (!body.name || !body.pin || !body.ownerId) {
          return badRequest(res, "name, pin et ownerId requis");
        }
        if (!(await requireOwnerOrCoOwner(auth.user.id, body.ownerId, res))) return;
        return send(
          res,
          await createMember(body.ownerId, body.name, body.pin, body.role ?? "member"),
        );
      }
      return methodNotAllowed(res);
    }

    // /api/team/members/me/set-pin
    if (segments.length === 3 && b === "me" && c === "set-pin") {
      if (method !== "POST") return methodNotAllowed(res);
      if (!requireCsrf(req, res)) return;

      const memberToken = extractBearer(req);
      if (!memberToken) {
        res.status(401).json({ error: "Token manquant" });
        return;
      }
      const body = (req.body ?? {}) as { pin?: string; oldPin?: string };
      if (!body.pin) return badRequest(res, "PIN invalide — 6 chiffres requis");
      return send(res, await setOwnPin(memberToken, body.pin, body.oldPin ?? null));
    }

    // /api/team/members/:id (GET + DELETE)
    if (segments.length === 2) {
      const auth = await requireAuth(req, res);
      if (!auth) return;
      const id = b;

      if (method === "GET") {
        const ownerId = req.query.ownerId as string | undefined;
        if (!ownerId) return badRequest(res, "ownerId requis");
        const isOwner = auth.user.id === ownerId;
        if (!(await requireOwnerOrCoOwner(auth.user.id, ownerId, res))) return;
        return send(res, await getMember(id, ownerId, isOwner));
      }
      if (method === "DELETE") {
        if (!requireCsrf(req, res)) return;
        const body = (req.body ?? {}) as { ownerId?: string };
        if (!body.ownerId) return badRequest(res, "ownerId requis");
        if (auth.user.id !== body.ownerId) {
          res.status(403).json({ error: "Seul le patron peut supprimer définitivement" });
          return;
        }
        return send(res, await deleteMember(id, body.ownerId));
      }
      return methodNotAllowed(res);
    }

    // /api/team/members/:id/{confirm,refuse,pin,permissions,status}
    if (segments.length === 3) {
      const auth = await requireAuth(req, res);
      if (!auth) return;
      const id = b;
      const action = c;

      if (action === "confirm") {
        if (method !== "POST") return methodNotAllowed(res);
        if (!requireCsrf(req, res)) return;
        const body = (req.body ?? {}) as { ownerId?: string; role?: string; pin?: string };
        if (!body.ownerId || !body.role) return badRequest(res, "ownerId et role requis");
        if (!(await requireOwnerOrCoOwner(auth.user.id, body.ownerId, res))) return;
        return send(res, await confirmMember(id, body.ownerId, body.role, body.pin ?? null));
      }

      if (action === "refuse") {
        if (method !== "POST") return methodNotAllowed(res);
        if (!requireCsrf(req, res)) return;
        const body = (req.body ?? {}) as { ownerId?: string };
        if (!body.ownerId) return badRequest(res, "ownerId requis");
        if (!(await requireOwnerOrCoOwner(auth.user.id, body.ownerId, res))) return;
        return send(res, await refuseMember(id, body.ownerId));
      }

      if (action === "pin") {
        if (method !== "PATCH") return methodNotAllowed(res);
        if (!requireCsrf(req, res)) return;
        const body = (req.body ?? {}) as { pin?: string; ownerId?: string };
        if (!body.pin || !body.ownerId) return badRequest(res, "pin et ownerId requis");
        if (!(await requireOwnerOrCoOwner(auth.user.id, body.ownerId, res))) return;
        return send(res, await updateMemberPin(id, body.ownerId, body.pin));
      }

      if (action === "permissions") {
        if (method !== "PATCH") return methodNotAllowed(res);
        if (!requireCsrf(req, res)) return;
        const body = (req.body ?? {}) as { ownerId?: string; permissions?: object };
        if (!body.ownerId || !body.permissions) {
          return badRequest(res, "ownerId et permissions requis");
        }
        const isOwner = auth.user.id === body.ownerId;
        if (!(await requireOwnerOrCoOwner(auth.user.id, body.ownerId, res))) return;
        return send(res, await updatePermissions(id, body.ownerId, body.permissions, isOwner));
      }

      if (action === "status") {
        if (method !== "PATCH") return methodNotAllowed(res);
        if (!requireCsrf(req, res)) return;
        const body = (req.body ?? {}) as { ownerId?: string; status?: string };
        if (!body.ownerId || !body.status) return badRequest(res, "ownerId et status requis");
        const isOwner = auth.user.id === body.ownerId;
        if (!(await requireOwnerOrCoOwner(auth.user.id, body.ownerId, res))) return;
        return send(res, await updateStatus(id, body.ownerId, body.status, isOwner));
      }

      return notFound(res);
    }

    return notFound(res);
  }

  return notFound(res);
}
