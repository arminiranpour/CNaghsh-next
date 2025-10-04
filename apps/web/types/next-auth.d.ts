type NextRequest = unknown;

declare module "next-auth" {
  export interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }

  export interface AdapterUser extends User {
    emailVerified?: Date | null;
  }

  export interface Session {
    user?: AdapterUser;
    expires?: string;
    [key: string]: unknown;
  }

  export type JWT = Record<string, unknown> & {
    sub?: string;
    email?: string;
    name?: string;
  };

  export interface NextAuthConfig {
    providers: Array<unknown>;
    pages?: Record<string, string>;
    session?: Record<string, unknown>;
    callbacks?: Record<string, (...args: any[]) => unknown>;
    events?: Record<string, (...args: any[]) => unknown>;
    cookies?: Record<string, unknown>;
    secret?: string;
    adapter?: unknown;
    logger?: Record<string, (...args: any[]) => void>;
  }

  export function getServerSession(config: NextAuthConfig): Promise<Session | null>;
  export default function NextAuth(config: NextAuthConfig): unknown;
}

declare module "next-auth/react" {
  import type { Session } from "next-auth";

  export interface SignInOptions {
    redirect?: boolean;
    callbackUrl?: string;
    [key: string]: unknown;
  }

  export interface SignOutParams {
    redirect?: boolean;
    callbackUrl?: string;
  }

  export function signIn(provider?: string, options?: SignInOptions, authorizationParams?: Record<string, unknown>): Promise<unknown>;
  export function signOut(options?: SignOutParams): Promise<void>;
  export function useSession(): { data: Session | null; status: "authenticated" | "loading" | "unauthenticated" };
}

declare module "next-auth/providers/credentials" {
  import type { AdapterUser } from "next-auth";

  export interface CredentialsConfig {
    id?: string;
    name?: string;
    credentials?: Record<string, { label?: string; type?: string; placeholder?: string }>;
    authorize?: (credentials: Record<string, unknown> | undefined, request: Request) => Promise<AdapterUser | null> | AdapterUser | null;
  }

  export default function Credentials(config: CredentialsConfig): unknown;
}

declare module "next-auth/adapters" {
  import type { AdapterUser as BaseAdapterUser } from "next-auth";

  export interface Adapter {
    createUser(user: BaseAdapterUser): Promise<BaseAdapterUser>;
    getUser(id: string): Promise<BaseAdapterUser | null>;
    getUserByEmail(email: string): Promise<BaseAdapterUser | null>;
    getUserByAccount(provider_account_id: string): Promise<BaseAdapterUser | null>;
    updateUser(user: Partial<BaseAdapterUser> & Pick<BaseAdapterUser, "id">): Promise<BaseAdapterUser>;
    deleteUser?(userId: string): Promise<void>;
    linkAccount?(account: unknown): Promise<void>;
    unlinkAccount?(providerAccountId: string): Promise<void>;
    createSession?(session: unknown): Promise<unknown>;
    getSessionAndUser?(sessionToken: string): Promise<{ user: BaseAdapterUser; session: unknown } | null>;
    updateSession?(session: unknown): Promise<unknown>;
    deleteSession?(sessionToken: string): Promise<void>;
  }

  export type AdapterUser = BaseAdapterUser;
}

declare module "next-auth/jwt" {
  import type { JWT } from "next-auth";

  export interface GetTokenParams {
    req: NextRequest;
    secret?: string;
    raw?: boolean;
  }

  export function getToken(params: GetTokenParams): Promise<JWT | string | null>;
}
