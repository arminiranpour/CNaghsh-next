# Web App Setup

This application uses Prisma with a PostgreSQL database connection.

## Database configuration

Create a `.env` file in `apps/web` (or export the variable in your shell) with the following content, adjusting the connection string if needed:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/casting"
```

After setting the environment variable you can run the Prisma commands:

```bash
pnpm --filter @app/web prisma migrate dev -n init
pnpm --filter @app/web prisma generate
```
