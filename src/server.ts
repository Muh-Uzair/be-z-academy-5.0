import { env } from "@src/config/env";
import { connectDB } from "@src/config/db";
import app from "@src/app";

const PORT = env.PORT;

const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`Server (${env.APP_NAME}) is running on port ${PORT}`);
  });
};

startServer();



