import { env } from "./src/lib/env";

const config = {
  mongodb: {
    url: env.DB_CONNECTION_STRING,
    databaseName: "",
    options: {
      family: 4,
    },
  },

  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".ts",
  useFileHash: false,
  moduleSystem: "commonjs",
};

export = config;
