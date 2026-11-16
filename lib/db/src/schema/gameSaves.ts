import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gameSavesTable = pgTable("game_saves", {
  userId: text("user_id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertGameSaveSchema = createInsertSchema(gameSavesTable).omit({
  updatedAt: true,
});
export type InsertGameSave = z.infer<typeof insertGameSaveSchema>;
export type GameSave = typeof gameSavesTable.$inferSelect;
