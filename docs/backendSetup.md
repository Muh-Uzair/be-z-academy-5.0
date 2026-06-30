# Backend Setup Steps (TypeScript)

This document outlines the step-by-step process for setting up the backend project using Node.js, Express, and TypeScript.

## Step 1: Create a `package.json` file

**Action:** Initialize the project to manage dependencies and scripts.

**Details:**
To start any Node.js project, we need a `package.json` file. This file acts as the heart of our project, keeping track of all the libraries (dependencies) we install, the versions we are using, and custom scripts for running, building, and testing our application.

Since we are using TypeScript, we will eventually add specific scripts to this file to compile our TypeScript code into standard JavaScript.

**Command to run:**
```bash
npm init -y
```
*(The `-y` flag automatically answers "yes" to all the default prompts, quickly generating a standard `package.json` file.)*

## Step 2: Implement TypeScript Setup

**Action:** Install TypeScript dependencies and initialize `tsconfig.json`.

**Details:**
Node.js cannot execute TypeScript directly, so we need a compiler to convert it to standard JavaScript. We install `typescript` as a development dependency. We also install `@types/node` so TypeScript understands Node.js built-in modules, and `ts-node-dev` which automatically restarts the server when code changes during development. 

After installing the packages, we configure the compiler options in a `tsconfig.json` file, specifying that our source code is in `src/` and the compiled JavaScript should go into `dist/`.

**Commands to run:**
```bash
npm install -D typescript @types/node ts-node-dev
```

**`tsconfig.json` configuration:**
```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

## Step 3: Set up Express and Modular Server

**Action:** Install Express, set up `app.ts` (Express specific logic), `server.ts` (Server specific logic), and configure `tsconfig.json` for path aliases.

**Details:**
We install `express` along with its TypeScript definitions (`@types/express`). We also install `tsconfig-paths` to resolve absolute path imports during development.

We configure `tsconfig.json` with `baseUrl: "."` and `paths: { "@src/*": ["src/*"] }` so we can import files cleanly like `import app from '@src/app'` instead of using relative paths (e.g., `../../app`).

In `src/app.ts`, we initialize our Express instance, handle standard JSON parsing middleware, and expose a base `GET /` endpoint that returns a welcome JSON payload. We then export this Express app instance using ES module `export default` syntax.

In `src/server.ts`, we import this `app` instance and start listening on a defined port (default 5000). 

Finally, we update `package.json` with a `"dev"` script leveraging `ts-node-dev` (and `tsconfig-paths/register`). This script runs and automatically restarts our TypeScript server on every file change, replacing the need for tools like `nodemon`.

**Commands to run:**
```bash
npm install express dotenv
npm install -D @types/express tsconfig-paths
```

## Step 4: Middleware, Logging, Linting, and Environment Validation

**Action:** Set up Morgan for logging, ESLint for code quality, and Zod for strict environment variable validation.

**Details:**
To improve the development experience, we add `morgan` as an Express middleware to log incoming HTTP requests automatically. 

We also configure ESLint with the latest flat configuration format (`eslint.config.mjs`) specifically for TypeScript to catch unused imports and potential bugs in real-time. We integrate this into our `npm run dev` script to ensure we get immediate terminal warnings.

For environment variables, we transition from reading `process.env` directly to using `zod` in `src/config/env.ts`. This allows us to define a strict schema. If variables (like `PORT` or `APP_NAME`) are missing or of incorrect types, Zod will throw an error and crash the server on startup, rather than using default values or silently failing later in the app's lifecycle. We then import this strictly typed `env` object across our application.

**Commands to run:**
```bash
npm install morgan zod
npm install -D @types/morgan eslint @eslint/js typescript-eslint
```

## Step 5: Database Connection

**Action:** Add MongoDB connection string to environment variables and connect via Mongoose.

**Details:**
We introduce MongoDB to our application by first installing `mongoose`, a popular Object Data Modeling (ODM) library for MongoDB and Node.js. 

We added our MongoDB connection string and credentials into the `.env` file and strictly typed them in our Zod schema (`src/config/env.ts`). Then, we created a dedicated database configuration file `src/config/db.ts` which handles the connection logic to connect to the provided URI string.

Finally, we updated `src/server.ts` to ensure the database connection is established successfully before starting the Express server to listen for incoming requests.

**Commands to run:**
```bash
npm install mongoose
```

## Step 6: Defining Data Models with Mongoose and TypeScript

**Action:** Create Mongoose models and dynamically infer TypeScript types.

**Details:**
To effectively integrate Mongoose with TypeScript, we define our database schemas using Mongoose's `Schema` class, and then utilize the `InferSchemaType` generic to automatically extract a strictly-typed TypeScript definition based on the schema's structure.

This approach eliminates the need to manually create and maintain separate TypeScript interfaces that mirror the schema fields, ensuring a single source of truth and full static type safety when querying the database.

**Example Implementation (e.g., `src/models/enrollmentModel.ts`):**
```typescript
import { model, models, Schema, type InferSchemaType } from "mongoose";

const enrollmentSchema = new Schema(
  {
    // ... schema definition (e.g., student, course, timestamps, etc.)
  },
  { timestamps: true }
);

// Dynamically extract the TypeScript type from the Mongoose schema
type EnrollmentType = InferSchemaType<typeof enrollmentSchema>;

// Compile the model, preventing recompilation errors
const EnrollmentModel =
  models.Enrollment || model<EnrollmentType>("Enrollment", enrollmentSchema);

export default EnrollmentModel;
export type { EnrollmentType };
```

## Step 7: Writing APIs

*(This step covers implementing business logic, routes, and controllers.)*

## Step 8: Security

**Action:** Implement security headers, rate limiting, and body parsing limits to protect the application.

**Details:**
To prevent brute-force attacks and abuse of our API, we implement rate limiting using the `express-rate-limit` middleware. We configured it to limit each IP address to a maximum of 100 requests per hour specifically for routes starting with `/api`. If an IP exceeds this limit, a `429 Too Many Requests` error with a custom message is returned.

We also use `helmet` to automatically set various HTTP headers for robust security (e.g., hiding the `X-Powered-By` header, setting XSS protection, etc.). 

To prevent Denial of Service (DoS) attacks where attackers could send excessively large JSON payloads that consume memory, we update our `express.json()` middleware to enforce a maximum body size of `10kb`.

Finally, we apply data sanitization to clean incoming data. We use `express-mongo-sanitize` to remove any keys containing `$` or `.` from the request, protecting against NoSQL query injection. We also use `xss-clean` to filter out malicious HTML and scripts, protecting against Cross-Site Scripting (XSS) attacks. These middlewares are placed immediately after the body parser.

Furthermore, we use `hpp` (HTTP Parameter Pollution) to protect our backend from crashing due to duplicate query parameters. It ensures our application logic always receives simple strings instead of unexpected arrays, with an option to whitelist specific fields.

**Commands to run:**
```bash
npm install express-rate-limit helmet express-mongo-sanitize xss-clean hpp
npm install -D @types/hpp
```

---

## Conclusion
With these steps, our initial backend setup is complete! From here on, our focus will shift toward building out the application's APIs, handling business logic, and creating our routes and controllers.
