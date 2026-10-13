# Stats API Integration Guide

This guide details the `/api/v1/stats` endpoint, used to fetch global platform statistics.

## Base URL

```
http://localhost:8000
```

## Roles and access

| Route | Allowed caller |
| --- | --- |
| `GET /` | No authentication required |

## API 1 — Get platform stats

`GET /api/v1/stats`

No authentication required. Returns the total count of active students (students with at least 1 course enrollment) and the total count of verified courses.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Platform stats fetched successfully",
  "data": {
    "totalStudents": 1542,
    "totalCourses": 120
  }
}
```

### Possible errors

(None specific to this route, standard 500 on server error)
