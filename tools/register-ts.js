const fs = require("fs");
const ts = require("typescript");

let registered = false;

module.exports = function registerTs() {
  if (registered) return;

  const compile = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        resolveJsonModule: true,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
      },
      fileName: filename,
    });
    return module._compile(output.outputText, filename);
  };

  require.extensions[".ts"] = compile;
  require.extensions[".tsx"] = compile;

  registered = true;
};
