import * as z from "zod";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const envSchema = z.object({
  PLATFORM_COMMISSION_PERCENTAGE: z.coerce.number(),
  PORT: z.coerce.number(),
  APP_NAME: z.string(),
  DB_CONNECTION_STRING: z.string(),
  DB_USER_NAME: z.string(),
  DB_PASSWORD: z.string(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "Invalid environment variables:",
    z.treeifyError(parsedEnv.error),
  );
  process.exit(1);
}

export const env = parsedEnv.data;
