declare module "next" {
  export type Metadata = Record<string, any>;
  export interface NextConfig {
    [key: string]: any;
  }
}