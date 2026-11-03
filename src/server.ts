import { env } from "./lib/env";
import { connectDB } from "./lib/db";
import app from "./app";

const PORT = env.PORT;

const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`Server (${env.APP_NAME}) is running on port ${PORT}`);
  });
};

startServer();



