/* eslint-disable @typescript-eslint/consistent-type-definitions */
declare module "next-auth/jwt" {
  export type Role = "USER" | "ADMIN";

  export interface JWT {
    [key: string]: unknown;
    sub?: string;
    id?: string | number | null;
    email?: string | null;
    name?: string | null;
    picture?: string | null;
    role?: Role;
  }

  export type GetTokenParams = {
    req: unknown;
    secret?: string;
    raw?: boolean;
  };

  export function getToken(params: GetTokenParams): Promise<JWT | null>;
}

declare module "next-auth/adapters" {
  import type { Role } from "next-auth/jwt";

  export interface AdapterUser {
    id: string;
    name?: string | null;
    email?: string | null;
    emailVerified?: Date | null;
    image?: string | null;
    role?: Role;
    [key: string]: unknown;
  }
}

declare module "next-auth/react" {
  import type { Session } from "next-auth";
  import type { ReactNode } from "react";

  export type SignInOptions = Record<string, unknown> & {
    callbackUrl?: string;
    redirect?: boolean;
  };

  export type SignInResponse = {
    error?: string;
    status?: number;
    ok?: boolean;
    url?: string | null;
  };

  export function signIn(
    provider?: string,
    options?: SignInOptions,
    authorizationParams?: Record<string, string>
  ): Promise<SignInResponse | undefined>;

  export function signOut(options?: { callbackUrl?: string; redirect?: boolean }): Promise<void>;

  export function useSession(): {
    data: Session | null;
    status: "loading" | "authenticated" | "unauthenticated";
  };

  export function SessionProvider(props: {
    children?: ReactNode;
    session?: Session | null;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
    refetchWhenOffline?: boolean;
    basePath?: string;
  }): JSX.Element;
}

declare module "next-auth/providers/credentials" {
  import type { AdapterUser } from "next-auth/adapters";
  import type { Session, User } from "next-auth";

  export type Awaitable<T> = T | Promise<T>;

  export type CredentialInput = {
    label?: string;
    type?: string;
    placeholder?: string;
  };

  export interface CredentialsConfig {
    id?: string;
    name?: string;
    credentials?: Record<string, CredentialInput>;
    authorize?: (
      credentials: Record<string, unknown> | undefined,
      request?: unknown
    ) => Awaitable<User | AdapterUser | null>;
  }

  const Credentials: (config: CredentialsConfig) => unknown;
  export default Credentials;
}


declare module "next-auth" {
  import type { AdapterUser } from "next-auth/adapters";
  import type { JWT, Role } from "next-auth/jwt";
  import type { NextRequest } from "next/server";

  export type Awaitable<T> = T | Promise<T>;

  export interface SessionUser {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: Role;
    [key: string]: unknown;
  }

  export interface Session {
    user?: SessionUser | null;
    expires: string;
    [key: string]: unknown;
  }

  export interface User extends SessionUser {}

  export interface NextAuthOptions {
    secret?: string;
    trustHost?: boolean;
    session?: {
      strategy?: "jwt" | "database";
      maxAge?: number;
      updateAge?: number;
    };
    pages?: Record<string, string>;
    providers: Array<unknown>;
    callbacks?: {
      jwt?: (params: { token: JWT; user?: AdapterUser | User | null }) => Awaitable<JWT>;
      session?: (params: { session: Session; token: JWT }) => Awaitable<Session>;
      [key: string]: ((...args: any[]) => Awaitable<unknown>) | undefined;
    };
    [key: string]: unknown;
  }

  export type NextAuthRouteHandler = (
    request: NextRequest,
    context?: { params: Record<string, string | string[]> }
  ) => Awaitable<Response>;

  const NextAuth: (options: NextAuthOptions) => NextAuthRouteHandler;
    export function getServerSession(
    options?: NextAuthOptions
  ): Promise<Session | null>;
  export default NextAuth;
}
