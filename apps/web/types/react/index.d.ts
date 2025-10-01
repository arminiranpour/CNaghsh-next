declare namespace React {
  type ReactNode = any;
  type ReactText = string | number;
  type ReactFragment = ReactNode[];
  type ReactPortal = any;
  type ReactElement<P = any> = any;
  interface Attributes {
    key?: any;
  }
  interface RefAttributes<T> {
    ref?: any;
  }
  interface HTMLAttributes<T> {
    className?: string;
    children?: ReactNode;
    [key: string]: any;
  }
  interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    disabled?: boolean;
    type?: string;
    onClick?: (...args: any[]) => any;
  }
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    type?: string;
    value?: any;
    defaultValue?: any;
    onChange?: (...args: any[]) => any;
  }
  type ComponentProps<T> = any;
  type ComponentPropsWithRef<T> = any;
  type ComponentPropsWithoutRef<T> = any;
  type ElementRef<T> = any;
  interface ForwardRefExoticComponent<P> {
    (props: P & { ref?: any }): ReactElement | null;
    displayName?: string;
  }
  type ForwardRefRenderFunction<T, P = {}> = (
    props: P,
    ref: any
  ) => ReactElement | null;
  type FC<P = {}> = (props: PropsWithChildren<P>) => ReactElement | null;
  type PropsWithChildren<P = {}> = P & { children?: ReactNode };
  type Dispatch<A> = (value: A) => void;
  interface MutableRefObject<T> {
    current: T;
  }
  function forwardRef<T, P = {}>(
    render: ForwardRefRenderFunction<T, P>
  ): ForwardRefExoticComponent<P>;
  function useState<S>(
    initialState: S | (() => S)
  ): [S, (value: S | ((prev: S) => S)) => void];
  function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  function useMemo<T>(factory: () => T, deps: any[]): T;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  function useRef<T>(initialValue: T | null): MutableRefObject<T | null>;
  interface Context<T> {
    Provider: any;
    Consumer: any;
  }
  function createContext<T>(defaultValue: T): Context<T>;
  function useContext<T>(context: Context<T>): T;
  const Fragment: any;
}

declare module "react" {
  export = React;
}
