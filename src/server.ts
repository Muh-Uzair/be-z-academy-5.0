import { env } from "@src/config/env";
import app from "@src/app";
import { connectDB } from "@src/config/db";

const PORT = env.PORT;

const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`Server (${env.APP_NAME}) is running on port ${PORT}`);
  });
};

startServer();
