import type { ReactNode } from "react";

declare module "next-auth" {
  export type Session = {
    user?: {
      id?: string;
      email?: string | null;
      name?: string | null;
    } | null;
    expires?: string;
    [key: string]: unknown;
  } | null;

  export type User = {
    id: string;
    email?: string | null;
    name?: string | null;
    emailVerified?: Date | null;
    image?: string | null;
    [key: string]: unknown;
  };

  export type AdapterUser = User & {
    emailVerified?: Date | null;
  };

  export type JWT = {
    sub?: string | null;
    email?: string | null;
    name?: string | null;
    picture?: string | null;
    [key: string]: unknown;
  };

  export type NextAuthConfig = {
    providers?: unknown[];
    callbacks?: Record<string, (...args: any[]) => unknown>;
    session?: Record<string, unknown>;
    pages?: Record<string, string>;
    [key: string]: unknown;
  };

  export default function NextAuth(config: NextAuthConfig): {
    (req: Request): Promise<Response>;
    GET?: (req: Request) => Promise<Response>;
    POST?: (req: Request) => Promise<Response>;
  };

  export function getServerSession(
    ...args: any[]
  ): Promise<Session>;
}

declare module "next-auth/react" {
  import type { NextAuthConfig, Session } from "next-auth";

  export type SignInResponse = {
    error?: string;
    status?: number;
    ok: boolean;
    url?: string | null;
  };

  export function signIn(
    provider?: string,
    options?: Record<string, unknown>,
    authorizationParams?: Record<string, unknown>
  ): Promise<SignInResponse | undefined>;

  export function signOut(
    options?: Record<string, unknown>
  ): Promise<void>;

  export function useSession(): {
    data: Session;
    status: "loading" | "authenticated" | "unauthenticated";
  };

  export function getCsrfToken(): Promise<string | undefined>;

  export function getProviders(): Promise<Record<string, unknown> | null>;

  export function SessionProvider(props: {
    children: ReactNode;
    session?: Session;
    basePath?: string;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
  }): JSX.Element;
}

declare module "next-auth/providers/credentials" {
  import type { NextAuthConfig } from "next-auth";

  export type CredentialsConfig = {
    authorize?: (
      credentials: Record<string, string> | undefined,
      request: Request
    ) => Promise<Record<string, unknown> | null>;
    credentials?: Record<
      string,
      {
        label?: string;
        type?: string;
        placeholder?: string;
      }
    >;
  } & Record<string, unknown>;

  export default function CredentialsProvider(
    config: CredentialsConfig
  ): NextAuthConfig["providers"] extends Array<infer T> ? T : never;
}

declare module "next-auth/adapters" {
  import type { AdapterUser } from "next-auth";

  export type Adapter = {
    createUser: (user: AdapterUser) => Promise<AdapterUser>;
    getUser: (id: string) => Promise<AdapterUser | null>;
    getUserByEmail: (email: string) => Promise<AdapterUser | null>;
    getUserByAccount: (
      account: Record<string, unknown>
    ) => Promise<AdapterUser | null>;
    updateUser: (user: Partial<AdapterUser>) => Promise<AdapterUser>;
    deleteUser?: (userId: string) => Promise<void>;
  } & Record<string, unknown>;

  export type AdapterUser = import("next-auth").AdapterUser;
}

declare module "next-auth/jwt" {
  import type { JWT } from "next-auth";

  export type JWTOptions = {
    maxAge?: number;
    secret?: string;
  } & Record<string, unknown>;

  export function getToken(
    params: {
      req: Request;
      secret?: string;
      secureCookie?: boolean;
    }
  ): Promise<JWT | null>;
}

declare module "bcrypt" {
  export function hash(data: string | Buffer, saltOrRounds: number): Promise<string>;
  export function compare(data: string | Buffer, encrypted: string): Promise<boolean>;
  export function genSalt(rounds?: number): Promise<string>;
  export default {
    hash,
    compare,
    genSalt,
  };
}
