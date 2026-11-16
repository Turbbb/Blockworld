import {
  Router,
  type IRouter,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { getAuth } from "@clerk/express";
import {
  AnalyzeBlueprintFromImageBody,
  AnalyzeBlueprintFromImageResponse,
} from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

const MAX_IMAGE_BYTES = 6_000_000;
const MAX_BLOCKS = 900;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const USER_WINDOW_LIMIT = 5;
const IP_WINDOW_LIMIT = 12;
const USER_DAILY_LIMIT = 30;
interface RateBucket {
  startedAt: number;
  count: number;
}
const rateBuckets = new Map<string, RateBucket>();
const ALLOWED_TYPES = new Set([
  "wood",
  "stone",
  "brick",
  "glass",
  "sand",
  "leaf",
  "dirt",
  "grass",
]);

function decodeImageSize(imageData: string): number {
  const padding = imageData.endsWith("==") ? 2 : imageData.endsWith("=") ? 1 : 0;
  return Math.floor((imageData.length * 3) / 4) - padding;
}

function hasExpectedImageSignature(imageData: string, mimeType: string): boolean {
  const bytes = Buffer.from(imageData.slice(0, 32), "base64");
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") {
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

function cleanJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(withoutFence);
}

function requireBlueprintAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Für Kamera-Blaupausen musst du angemeldet sein." });
    return;
  }
  (req as Request & { userId: string }).userId = String(userId);
  next();
}

function consumeRateLimit(key: string, limit: number, durationMs: number): number {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= durationMs) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return 0;
  }
  if (bucket.count >= limit) {
    return Math.max(1, Math.ceil((durationMs - (now - bucket.startedAt)) / 1000));
  }
  bucket.count += 1;
  return 0;
}

function limitBlueprintRequests(req: Request, res: Response, next: NextFunction): void {
  const userId = (req as Request & { userId: string }).userId;
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const retries = [
    consumeRateLimit(`user-window:${userId}`, USER_WINDOW_LIMIT, RATE_WINDOW_MS),
    consumeRateLimit(`ip-window:${ip}`, IP_WINDOW_LIMIT, RATE_WINDOW_MS),
    consumeRateLimit(`user-day:${userId}`, USER_DAILY_LIMIT, DAILY_WINDOW_MS),
  ];
  const retryAfter = Math.max(...retries);
  if (retryAfter > 0) {
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Zu viele Scans. Bitte warte vor dem nächsten Foto." });
    return;
  }
  next();
}

router.post(
  "/blueprint/from-image",
  requireBlueprintAuth,
  limitBlueprintRequests,
  async (req, res): Promise<void> => {
  const input = AnalyzeBlueprintFromImageBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "Das Fotoformat ist ungültig." });
    return;
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.data.imageData)) {
    res.status(400).json({ error: "Das Foto konnte nicht gelesen werden." });
    return;
  }
  if (!hasExpectedImageSignature(input.data.imageData, input.data.mimeType)) {
    res.status(400).json({ error: "Die Datei ist kein unterstütztes Foto." });
    return;
  }
  if (decodeImageSize(input.data.imageData) > MAX_IMAGE_BYTES) {
    res.status(413).json({ error: "Das Foto ist zu groß. Bitte erneut aufnehmen." });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze the single main physical object in this photograph and approximate it as a compact Minecraft-like voxel model.

Return JSON only with this exact shape:
{"description":"short German object name","width":1,"height":1,"depth":1,"blocks":[{"x":0,"y":0,"z":0,"type":"wood"}]}

Rules:
- Dimensions must each be integers from 1 to 12.
- Use at most ${MAX_BLOCKS} blocks and only these types: wood, stone, brick, glass, sand, leaf, dirt, grass.
- Coordinates start at 0 and must stay inside width, height and depth.
- Keep recognizable silhouette and major color areas, but simplify aggressively.
- The model must rest on y=0 and be connected enough to build.
- Do not include background, floor, hands, people, text or shadows.
- If no clear single object is visible, return {"error":"Kein eindeutiges Objekt erkannt"} instead.`,
            },
            {
              inlineData: {
                mimeType: input.data.mimeType,
                data: input.data.imageData,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });

    const raw = cleanJson(response.text ?? "");
    if (
      typeof raw === "object" &&
      raw !== null &&
      "error" in raw &&
      typeof raw.error === "string"
    ) {
      res.status(400).json({ error: raw.error });
      return;
    }

    const candidate = AnalyzeBlueprintFromImageResponse.safeParse(raw);
    if (!candidate.success) {
      req.log.warn({ errors: candidate.error.message }, "Invalid AI blueprint response");
      res.status(502).json({ error: "Das erkannte Objekt ergab keine gültige Blaupause." });
      return;
    }

    const width = Math.trunc(candidate.data.width);
    const height = Math.trunc(candidate.data.height);
    const depth = Math.trunc(candidate.data.depth);
    const seen = new Set<string>();
    const blocks = candidate.data.blocks
      .map((block) => ({
        x: Math.trunc(block.x),
        y: Math.trunc(block.y),
        z: Math.trunc(block.z),
        type: block.type,
      }))
      .filter((block) => {
        if (
          block.x < 0 ||
          block.x >= width ||
          block.y < 0 ||
          block.y >= height ||
          block.z < 0 ||
          block.z >= depth ||
          !ALLOWED_TYPES.has(block.type)
        ) {
          return false;
        }
        const key = `${block.x},${block.y},${block.z}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_BLOCKS);

    if (blocks.length === 0 || !blocks.some((block) => block.y === 0)) {
      res.status(400).json({ error: "Das Objekt konnte nicht stabil aus Blöcken gebaut werden." });
      return;
    }

    res.json(
      AnalyzeBlueprintFromImageResponse.parse({
        description: candidate.data.description.slice(0, 80),
        width,
        height,
        depth,
        blocks,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Blueprint image analysis failed");
    res.status(502).json({ error: "Die Bilderkennung ist gerade nicht erreichbar." });
  }
  },
);

export default router;