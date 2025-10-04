declare module "next-auth" {
  import type { JWT } from "next-auth/jwt";
  import type { AdapterUser } from "next-auth/adapters";

  export interface User {
    id: string;
    email?: string | null;
    role?: string | null;
    [key: string]: unknown;
  }

  export interface Session {
    user?: User & {
      id?: string;
      email?: string | null;
      role?: string | null;
    };
    expires?: string;
    [key: string]: unknown;
  }

  export interface NextAuthConfig {
    trustHost?: boolean;
    secret?: string;
    session?: {
      strategy?: string;
    };
    pages?: {
      signIn?: string;
      [key: string]: string | undefined;
    };
    providers?: Array<unknown>;
    callbacks?: {
      jwt?: (context: { token: JWT; user?: AdapterUser | User | null }) =>
        | Promise<JWT>
        | JWT;
      session?: (context: {
        session: Session;
        token: JWT;
        user?: AdapterUser | User | null;
      }) => Promise<Session> | Session;
    };
  }

  export type NextAuthOptions = NextAuthConfig;

  export default function NextAuth(
    config: NextAuthConfig
  ): {
    GET: (request: Request) => Promise<Response> | Response;
    POST: (request: Request) => Promise<Response> | Response;
  } & ((request: Request) => Promise<Response> | Response);
}

declare module "next-auth/react" {
  import type { Session } from "next-auth";

  export interface SignInResponse {
    error?: string | null;
    ok?: boolean;
    status?: number;
    url?: string | null;
      }

  export type SignInOptions = Record<string, unknown> & {
    callbackUrl?: string;
    redirect?: boolean;
    email?: string;
    password?: string;
  };

  export function signIn(
    provider: string,
    options?: SignInOptions,
    authorizationParams?: Record<string, unknown>
  ): Promise<SignInResponse | undefined>;

  export function signOut(options?: { callbackUrl?: string }): Promise<void>;


  export function useSession(): { data: Session | null; status: "loading" | "authenticated" | "unauthenticated" };

}

declare module "next-auth/providers/credentials" {
  import type { NextAuthConfig } from "next-auth";

  export type CredentialsConfig = {
    name?: string;
    credentials?: Record<string, { label?: string; type?: string }>;
    authorize?: (credentials: Record<string, unknown>) =>
      | Record<string, unknown>
      | null
      | Promise<Record<string, unknown> | null>;
  };

  export default function Credentials(
    options: CredentialsConfig
  ): NextAuthConfig["providers"] extends Array<infer Provider>
    ? Provider
    : unknown;
}

declare module "next-auth/adapters" {
  export interface AdapterUser {
    id: string;
    email?: string | null;
    emailVerified?: Date | null;
    name?: string | null;
    image?: string | null;
    [key: string]: unknown;
  }
}

declare module "next-auth/jwt" {
  export interface JWT {
    id?: string | number;
    email?: string | null;
    role?: string | null;
    name?: string | null;
    picture?: string | null;
    [key: string]: unknown;
  }
  export interface GetTokenParams {
    req: Request & { cookies?: Record<string, string> };
    secret?: string;
  }

  export function getToken(params: GetTokenParams): Promise<JWT | null>;
}

declare module "bcrypt" {
  export function hash(data: string, saltOrRounds: string | number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function genSalt(rounds?: number): Promise<string>;
  export default {
    hash,
    compare,
    genSalt,
  };
}
