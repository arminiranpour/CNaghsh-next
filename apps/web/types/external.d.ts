declare module "next/link" {
  const Link: any;
  export default Link;
}

declare module "next-themes" {
  export interface ThemeProviderProps {
    children?: any;
    [key: string]: any;
  }
  export const ThemeProvider: (props: ThemeProviderProps) => any;
}

declare module "@radix-ui/react-slot" {
  export const Slot: any;
}

declare module "class-variance-authority" {
  export type VariantProps<T> = any;
  export function cva(...args: any[]): any;
}

declare module "@radix-ui/react-dialog" {
  export const Root: any;
  export const Trigger: any;
  export const Portal: any;
  export const Overlay: any;
  export const Content: any;
  export const Title: any;
  export const Description: any;
  export const Close: any;
}

declare module "@radix-ui/react-toast" {
  export const Provider: any;
  export const Root: any;
  export const Viewport: any;
  export const Title: any;
  export const Description: any;
  export const Action: any;
  export const Close: any;
}

declare module "lucide-react" {
  export const X: any;
}

declare module "clsx" {
  export type ClassValue = any;
  export function clsx(...inputs: any[]): string;
  export default clsx;
}

declare module "tailwind-merge" {
  export function twMerge(...inputs: any[]): string;
}

declare module "tailwindcss" {
  export interface Config {
    [key: string]: any;
  }
}

declare module "tailwindcss-animate" {
  const plugin: any;
  export default plugin;
}

declare module "@tailwindcss/typography" {
  const plugin: any;
  export default plugin;
}