import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuth } from "@/integrations/mongodb/auth-middleware";
import { assertAdmin } from "./admin.server";
import { saveCustomRequestFile, saveProductMediaFile } from "./upload.server";

export const uploadProductMedia = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        kind: z.enum(["image", "video"]),
        mimeType: z.string().trim().min(3).max(80),
        fileName: z.string().trim().max(200),
        dataBase64: z.string().min(1).max(30_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    const url = await saveProductMediaFile(data.kind, data.mimeType, data.dataBase64);
    return { url, kind: data.kind };
  });

export const uploadCustomRequestFile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        kind: z.enum(["model", "reference"]),
        mimeType: z.string().trim().min(3).max(80),
        fileName: z.string().trim().max(200),
        dataBase64: z.string().min(1).max(35_000_000),
        email: z.string().trim().email().max(160),
        name: z.string().trim().min(2).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const url = await saveCustomRequestFile(data.kind, data.mimeType, data.fileName, data.dataBase64);
    return { url, kind: data.kind };
  });
