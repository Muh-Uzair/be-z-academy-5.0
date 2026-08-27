import mongoose from "mongoose";
import { env } from "./env";

mongoose.plugin((schema) => {
  schema.set("versionKey", false);
});

let connectionPromise: Promise<void> | undefined;

export const connectDB = (): Promise<void> => {
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.DB_CONNECTION_STRING, {
      family: 4,
      })
      .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
};
