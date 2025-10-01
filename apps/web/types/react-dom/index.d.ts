declare module "react-dom" {
  export function createPortal(children: any, container: any, key?: any): any;
  interface ReactDOMRoot {
    render(children: any): void;
    unmount(): void;
  }
  export function createRoot(container: any): ReactDOMRoot;
  const ReactDOM: {
    createPortal: typeof createPortal;
    createRoot: typeof createRoot;
  };
  export default ReactDOM;
}