import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, gameSavesTable } from "@workspace/db";
import {
  GetSaveResponse,
  PutSaveBody,
  PutSaveResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Nicht angemeldet" });
    return;
  }
  (req as Request & { userId: string }).userId = String(userId);
  next();
}

router.get("/save", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;

  const [save] = await db
    .select()
    .from(gameSavesTable)
    .where(eq(gameSavesTable.userId, userId));

  if (!save) {
    res.status(404).json({ error: "Kein Spielstand gefunden" });
    return;
  }

  res.json(
    GetSaveResponse.parse({
      data: save.data,
      updatedAt: save.updatedAt.toISOString(),
    }),
  );
});

router.put("/save", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;

  const parsed = PutSaveBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid save body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [save] = await db
    .insert(gameSavesTable)
    .values({ userId, data: parsed.data.data })
    .onConflictDoUpdate({
      target: gameSavesTable.userId,
      set: { data: parsed.data.data, updatedAt: new Date() },
    })
    .returning();

  res.json(
    PutSaveResponse.parse({
      data: save.data,
      updatedAt: save.updatedAt.toISOString(),
    }),
  );
});

export default router;
