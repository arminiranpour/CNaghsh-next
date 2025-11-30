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
| `ageMin` | number | `1..120` | `?ageMin=18` |
| `ageMax` | number | `1..120` | `?ageMax=35` |
| `gender` | enum[] | `male`, `female`, `other` | `?gender=other` |
| `edu` | enum[] | `diploma`, `associate`, `bachelor`, `master`, `phd`, `other` | `?edu=bachelor` |
| `skills` | string[] | Skill keys from taxonomy | `?skills=lighting,directing` |
| `lang` | string[] | Language keys or labels | `?lang=fa,en` |
| `accent` | string[] | Accent labels | `?accent=تهرانی` |
| `sort` | enum | `relevance`, `newest`, `alpha` | `?sort=newest` |
| `page` | number | `1..n` | `?page=2` |

## `/jobs`

| Parameter | Type | Allowed values | Example |
| --- | --- | --- | --- |
| `query` | string | free text | `?query=producer` |
| `city` | string | City identifier | `?city=tehran` |
| `skills` | string[] | Skill keys from taxonomy | `?skills=editing,color-grading` |
| `sort` | enum | `relevance`, `newest`, `featured`, `expiry` | `?sort=featured` |
| `page` | number | `1..n` | `?page=3` |
| `remote` | boolean | `true`, `false` | `?remote=false` |
| `category` | string | Casting or crew category | `?category=cinematography` |
| `payType` | enum | `paid`, `unpaid`, `negotiable` | `?payType=negotiable` |
| `featured` | boolean | `true`, `false` | `?featured=false` |
