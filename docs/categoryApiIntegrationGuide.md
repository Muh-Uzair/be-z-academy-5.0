# Category API Integration Guide

This guide is the frontend contract for the category-management APIs currently implemented by the backend. All paths below are relative to the backend origin.

Base path: `/api/v1/categories`

## Integration rules

- `GET /` and `GET /:id` are public — no `accessToken` cookie required. Every other route in this guide requires an authenticated session: send the `accessToken` cookie with credentials enabled (`fetch`: `credentials: "include"`; Axios: `withCredentials: true`).
- Success, validation, and application-error responses use `{ status, message, data }`, the same envelope as the auth APIs. See [`authApiIntegrationGuide.md`](./authApiIntegrationGuide.md) for the full envelope and status-code reference — it applies here unchanged.
- Strict validation is used: do not send fields that are not documented for that request. Body and query fields are validated separately; an undocumented field in either causes `400 Validation failed`.
- JSON request bodies are limited to 10 KB.
- Requests under `/api` are limited to 100 per IP per hour.
- Categories don't store raw images. Uploading a category image is a two-step flow: get a presigned S3 upload URL from this API (API 1), upload the file directly to S3 from the browser, then send the resulting object key as `imageKey` when creating/updating a category (API 2 / API 5).

## Roles and access

| Route | Allowed caller |
| --- | --- |
| `POST /upload-image` | Admin only |
| `POST /` | Admin only |
| `GET /` | Public (no auth required) |
| `GET /:id` | Public (no auth required) |
| `PATCH /:id` | Admin only |
| `DELETE /:id` | Admin only |

A caller with the wrong role receives `403 You do not have permission to perform this action`. A missing/invalid/expired `accessToken` cookie receives the same `401` errors documented for `/auth/me`.

## Category shape

Every category object returned by these APIs looks like:

```json
{
  "_id": "66d1a1b2c3d4e5f678901234",
  "name": "Web Development",
  "description": "Courses covering frontend, backend, and full-stack web development.",
  "imageUrl": "https://<bucket>.s3.<region>.amazonaws.com/categories/....jpg",
  "createdAt": "2026-08-25T10:00:00.000Z",
  "updatedAt": "2026-08-25T10:00:00.000Z"
}
```

The raw `imageKey` is never exposed in responses — only the derived, publicly-readable `imageUrl`.

## API 1 — Get category image upload URL

`POST /api/v1/categories/upload-image`

Admin only. Generates a presigned S3 POST policy for uploading a category image directly from the browser.

### Request body

```json
{
  "fileName": "web-dev.jpg",
  "fileType": "image/jpeg"
}
```

| Field | Rules |
| --- | --- |
| `fileName` | Required, non-empty string. |
| `fileType` | Required, one of `"image/jpeg"` or `"image/png"`. |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Category image upload URL generated successfully",
  "data": {
    "uploadUrl": "https://<bucket>.s3.<region>.amazonaws.com/",
    "fields": {
      "key": "categories/<uuid>-web-dev.jpg",
      "Content-Type": "image/jpeg",
      "policy": "...",
      "x-amz-signature": "..."
    },
    "key": "categories/<uuid>-web-dev.jpg"
  }
}
```

### Using the response

1. Build a `FormData` from `data.fields`, appending the actual file last under the field name `file`.
2. POST that `FormData` directly to `data.uploadUrl` (no `accessToken` cookie needed for this S3 request — it's a different origin).
3. On success, keep `data.key` — send it as `imageKey` in API 2 or API 5.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | `fileName` missing, or `fileType` is not `image/jpeg`/`image/png`. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin. |

## API 2 — Create category

`POST /api/v1/categories`

Admin only. Creates a new category. `imageKey` must come from API 1.

### Request body

```json
{
  "name": "Web Development",
  "imageKey": "categories/<uuid>-web-dev.jpg",
  "description": "Courses covering frontend, backend, and full-stack web development."
}
```

| Field | Rules |
| --- | --- |
| `name` | Required, trimmed, 2–50 characters. Must be unique. |
| `imageKey` | Required, non-empty string (S3 object key from API 1). |
| `description` | Required, trimmed, 10–500 characters. |

### Success response

HTTP `201`

```json
{
  "status": "success",
  "message": "Category created successfully",
  "data": {
    "category": {
      "_id": "66d1a1b2c3d4e5f678901234",
      "name": "Web Development",
      "description": "Courses covering frontend, backend, and full-stack web development.",
      "imageUrl": "https://<bucket>.s3.<region>.amazonaws.com/categories/....jpg",
      "createdAt": "2026-08-25T10:00:00.000Z",
      "updatedAt": "2026-08-25T10:00:00.000Z"
    }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | A field is missing, out of length range, or an undocumented field is sent. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin. |
| 500 | `Something went wrong. Please try again later.` | `name` collides with an existing category or another unexpected error occurs. |

## API 3 — List categories

`GET /api/v1/categories`

Public. Returns a paginated, sortable, searchable list of categories.

### Query parameters

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `search` | string | — | Case-insensitive search against `name`. |
| `projection` | string | — | Comma-separated Mongo field projection. |
| `page` | number (≥1) | `1` | |
| `limit` | number (≥1) | `10` | |
| `sortBy` | string | `createdAt` | |
| `sortOrder` | `"asc" \| "desc"` | `desc` | |

All params are optional and sent as query-string values (strings); `page`/`limit` are coerced to numbers server-side.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Categories fetched successfully",
  "data": {
    "categories": [
      {
        "_id": "66d1a1b2c3d4e5f678901234",
        "name": "Web Development",
        "description": "Courses covering frontend, backend, and full-stack web development.",
        "imageUrl": "https://<bucket>.s3.<region>.amazonaws.com/categories/....jpg",
        "createdAt": "2026-08-25T10:00:00.000Z",
        "updatedAt": "2026-08-25T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalDocuments": 12,
      "totalPages": 2,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | An invalid or undocumented query param is sent. |

## API 4 — Get category details

`GET /api/v1/categories/:id`

Public. Fetches a single category by id.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (Mongo `_id`). |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Category details fetched successfully",
  "data": {
    "category": {
      "_id": "66d1a1b2c3d4e5f678901234",
      "name": "Web Development",
      "description": "Courses covering frontend, backend, and full-stack web development.",
      "imageUrl": "https://<bucket>.s3.<region>.amazonaws.com/categories/....jpg",
      "createdAt": "2026-08-25T10:00:00.000Z",
      "updatedAt": "2026-08-25T10:00:00.000Z"
    }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | `id` is missing. |
| 404 | `Category not found` | No category exists with that `id`. |

## API 5 — Update category

`PATCH /api/v1/categories/:id`

Admin only. All fields are optional, but at least one must be sent. Blocked if any course still references the category. If `imageKey` changes, the previous image is deleted from S3.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string. |

### Request body

```json
{
  "name": "Web & Mobile Development",
  "description": "Courses covering frontend, backend, full-stack, and mobile development."
}
```

| Field | Rules |
| --- | --- |
| `name` | Optional, trimmed, 2–50 characters. |
| `imageKey` | Optional, non-empty string (S3 object key from API 1). |
| `description` | Optional, trimmed, 10–500 characters. |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Category updated successfully",
  "data": {
    "category": {
      "_id": "66d1a1b2c3d4e5f678901234",
      "name": "Web & Mobile Development",
      "description": "Courses covering frontend, backend, full-stack, and mobile development.",
      "imageUrl": "https://<bucket>.s3.<region>.amazonaws.com/categories/....jpg",
      "createdAt": "2026-08-25T10:00:00.000Z",
      "updatedAt": "2026-08-31T09:00:00.000Z"
    }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | Body is empty, a field fails its shape rules, or an undocumented field is sent. |
| 400 | `Cannot update a category that has courses assigned to it` | One or more courses still reference this category. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin. |
| 404 | `Category not found` | No category exists with that `id`. |

## API 6 — Delete category

`DELETE /api/v1/categories/:id`

Admin only. Deletes the category and its S3 image. Blocked if any course still references the category.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string. |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Category deleted successfully",
  "data": null
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Cannot delete a category that has courses assigned to it` | One or more courses still reference this category. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin. |
| 404 | `Category not found` | No category exists with that `id`. |

## Frontend types

Copy [`src/response-types/categoryResponseTypes.ts`](../src/response-types/categoryResponseTypes.ts) into the frontend project. It is a pure TypeScript file with no backend imports (it reuses `SuccessApiResponse`/`ApiErrorResponse` from [`authResponseTypes.ts`](../src/response-types/authResponseTypes.ts) and `Pagination` from [`userResponseTypes.ts`](../src/response-types/userResponseTypes.ts)) and exports `Category`, `UploadCategoryImageResponse`, `CreateCategoryResponse`, `GetCategoriesResponse`, `GetCategoryDetailsResponse`, `UpdateCategoryResponse`, and `DeleteCategoryResponse`.
