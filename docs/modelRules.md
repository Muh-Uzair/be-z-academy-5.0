# Model Rules

This file explains how models should be created in this project.

## Goal

All models should follow one simple and consistent pattern:

- use Mongoose schema-based type inference
- keep the file name plural
- export the model as `default`
- export the inferred type separately
- enable `timestamps: true`
- use `models.ModelName || model<ModelType>(...)` to avoid model overwrite errors during development

## File Naming

Based on the current project convention:

- model files should be plural
- example: `usersModel.ts`
- route files should also be plural

Examples:

- `usersModel.ts`
- `coursesModel.ts`
- `ordersModel.ts`

## File Location

All model files should be created inside:

```txt
src/models/
```

## Import Pattern

Use this import at the top of every model file:

```ts
import { model, models, Schema, type InferSchemaType } from "mongoose";
```

## Base Structure

Every model should follow this structure:

```ts
import { model, models, Schema, type InferSchemaType } from "mongoose";

const exampleSchema = new Schema(
  {
    fieldName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

type ExampleType = InferSchemaType<typeof exampleSchema>;

const ExampleModel = models.Example || model<ExampleType>("Example", exampleSchema);

export default ExampleModel;
export type { ExampleType };
```

## Schema Rules

When creating schema fields, follow these rules:

- use `String`, `Number`, `Boolean`, `Date`, or arrays/objects as needed
- use `required: true` for mandatory fields
- use `default` for optional values that should have a fallback
- use `trim: true` for text fields where extra spaces should be removed
- use `lowercase: true` for emails
- use `unique: true` only when the field must be unique, like `email`
- use validation like `minlength`, `maxlength`, `enum`, or `match` when needed

Examples:

```ts
name: {
  type: String,
  required: true,
  trim: true,
}
```

```ts
email: {
  type: String,
  required: true,
  unique: true,
  trim: true,
  lowercase: true,
}
```

```ts
avatar: {
  type: String,
  default: null,
  trim: true,
}
```

```ts
otpExpires: {
  type: Date,
  default: null,
}
```

## Required Project Pattern

In this project, keep these decisions consistent:

- schema variable name should end with `Schema`
- inferred type name should end with `Type`
- model variable name should end with `Model`
- Mongo model name should be singular inside `model("...", schema)`
- file name can stay plural even if model name is singular

Example:

- file name: `usersModel.ts`
- schema name: `userSchema`
- type name: `UserType`
- model variable: `UserModel`
- mongoose model name: `"User"`

## Why `models.X || model(...)` Is Used

Always use this pattern:

```ts
const UserModel = models.User || model<UserType>("User", userSchema);
```

This prevents Mongoose overwrite errors when the server reloads in development.

## Timestamps Rule

Always include:

```ts
{
  timestamps: true,
}
```

This automatically adds:

- `createdAt`
- `updatedAt`

## Optional and Nullable Fields

If a field is optional and should be empty at first, use `default: null`.

Examples:

- `avatar`
- `otp`
- `otpExpires`

Example:

```ts
otp: {
  type: String,
  default: null,
}
```

## Type Export Rule

Always export the inferred type so it can be reused later in:

- controllers
- services
- validation
- auth logic
- response typing

Use:

```ts
export type { UserType };
```

## Current User Model Pattern

Your current user model follows this style:

- required strings: `fullName`, `email`, `password`, `bio`, `highestEducation`
- optional/default values: `yearsOfExperience`, `avatar`, `isVerified`, `otp`, `otpExpires`
- email is unique, trimmed, and lowercased
- timestamps are enabled

## Copy-Paste Template

Use this whenever you create a new model:

```ts
import { model, models, Schema, type InferSchemaType } from "mongoose";

const itemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

type ItemType = InferSchemaType<typeof itemSchema>;

const ItemModel = models.Item || model<ItemType>("Item", itemSchema);

export default ItemModel;
export type { ItemType };
```

## Quick Checklist

Before finishing a new model, make sure:

- file is inside `src/models`
- file name is plural
- schema uses `new Schema(...)`
- `timestamps: true` is added
- inferred type is created with `InferSchemaType`
- model uses `models.Name || model<NameType>(...)`
- default export is present
- type export is present

