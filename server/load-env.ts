/**
 * Doit être importé en tout premier depuis `index.ts` (effets de bord avant les autres modules).
 */
import path from "path";
import { loadAppEnv } from "../load-app-env";

loadAppEnv(path.resolve(import.meta.dirname, ".."));
