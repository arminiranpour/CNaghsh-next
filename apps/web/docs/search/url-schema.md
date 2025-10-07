# Search URL Schema

This document defines the canonical query parameter schema for the listings pages.

## Global Rules

- Empty parameters are removed from canonical URLs.
- Multi-value parameters are expressed as comma-separated lists.
- `page` is 1-based with a default of `1` when omitted.
- Page size is fixed at `12` results per page.

## `/profiles`

| Parameter | Type | Allowed values | Example |
| --- | --- | --- | --- |
| `query` | string | free text | `?query=lighting` |
| `city` | string | City identifier | `?city=tehran` |
| `skills` | string[] | Skill keys from taxonomy | `?skills=lighting,directing` |
| `gender` | enum | `male`, `female`, `other` | `?gender=other` |
| `sort` | enum | `relevance`, `newest`, `complete`, `alpha` | `?sort=newest` |
| `page` | number | `1..n` | `?page=2` |
| `remote` | boolean | `true`, `false` | `?remote=true` |
| `category` | string | Directory category key | `?category=crew` |
| `payType` | enum | `paid`, `unpaid`, `negotiable` | `?payType=paid` |
| `featured` | boolean | `true`, `false` | `?featured=true` |

## `/jobs`

| Parameter | Type | Allowed values | Example |
| --- | --- | --- | --- |
| `query` | string | free text | `?query=producer` |
| `city` | string | City identifier | `?city=tehran` |
| `skills` | string[] | Skill keys from taxonomy | `?skills=editing,color-grading` |
| `gender` | enum | `male`, `female`, `other` | `?gender=female` |
| `sort` | enum | `relevance`, `newest`, `featured`, `expiry` | `?sort=featured` |
| `page` | number | `1..n` | `?page=3` |
| `remote` | boolean | `true`, `false` | `?remote=false` |
| `category` | string | Casting or crew category | `?category=cinematography` |
| `payType` | enum | `paid`, `unpaid`, `negotiable` | `?payType=negotiable` |
| `featured` | boolean | `true`, `false` | `?featured=false` |
