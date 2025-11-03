import fs from "fs";
import path from "path";
import ts from "typescript";

const TARGET_COMPONENTS = new Set([
  "DialogTrigger",
  "AlertDialogTrigger",
  "DropdownMenuTrigger",
  "PopoverTrigger",
  "SheetTrigger",
  "HoverCardTrigger",
  "ContextMenuTrigger",
]);

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  ".turbo",
  ".git",
  "dist",
  "build",
  "out",
]);

export type Severity = "error" | "suggestion";

export interface FixEdit {
  start: number;
  end: number;
  newText: string;
  description: string;
}

export interface Violation {
  filePath: string;
  line: number;
  column: number;
  triggerLabel: string;
  componentName: string;
  childKind: string;
  message: string;
  preview: string;
  severity: Severity;
  fixable: boolean;
  applyFix?: (collector: FixCollector) => void;
}

export interface RunAnalysisResult {
  violations: Violation[];
  filesScanned: number;
}

export interface CheckOptions {
  include: string[];
  projectRoot?: string;
}

export class FixCollector {
  private readonly edits = new Map<string, FixEdit[]>();
  private readonly summaries: { filePath: string; description: string }[] = [];

  addEdit(filePath: string, edit: FixEdit) {
    const list = this.edits.get(filePath);
    if (list) {
      list.push(edit);
    } else {
      this.edits.set(filePath, [edit]);
    }
    this.summaries.push({ filePath, description: edit.description });
  }

  getEdits() {
    return this.edits;
  }

  getSummaries() {
    return this.summaries;
  }

  hasEdits() {
    return this.edits.size > 0;
  }
}
export function collectSourceFiles({ include, projectRoot = process.cwd() }: CheckOptions): string[] {
  const resolved: string[] = [];
  const seen = new Set<string>();

  const visit = (target: string) => {
    const absolute = path.resolve(projectRoot, target);
    if (seen.has(absolute)) {
      return;
    }
    seen.add(absolute);

    if (!fs.existsSync(absolute)) {
      return;
    }

    const stat = fs.statSync(absolute);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolute)) {
        if (IGNORED_DIRECTORIES.has(entry)) {
          continue;
        }
        visit(path.join(absolute, entry));
      }
      return;
    }

    if (stat.isFile() && isJsxFile(absolute)) {
      resolved.push(absolute);
    }
  };

  for (const target of include) {
    visit(target);
  }

  resolved.sort();
  return resolved;
}

function isJsxFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".tsx" || ext === ".jsx";
}

function getScriptKind(): ts.ScriptKind {
  return ts.ScriptKind.TSX;
}

function getLineText(sourceText: string, line: number) {
  const lines = sourceText.split(/\r?\n/);
  return lines[line - 1] ?? "";
}

function getIndentation(sourceText: string, position: number) {
  let index = position - 1;
  while (index >= 0) {
    const ch = sourceText[index];
    if (ch === "\n" || ch === "\r") {
      break;
    }
    index -= 1;
  }
  const lineStart = index + 1;
  const lineSegment = sourceText.slice(lineStart, position);
  const match = /^(\s*)/.exec(lineSegment);
  return match ? match[1] : "";
}

function truncate(value: string, max = 96) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}

function attributeIsExplicitlyFalse(attribute: ts.JsxAttribute) {
  const initializer = attribute.initializer;
  if (!initializer) {
    return false;
  }

  if (ts.isStringLiteral(initializer)) {
    return initializer.text === "false" || initializer.text === "0";
  }

  if (ts.isJsxExpression(initializer)) {
    const expression = initializer.expression;
    if (!expression) {
      return false;
    }

    if (
      expression.kind === ts.SyntaxKind.FalseKeyword ||
      expression.kind === ts.SyntaxKind.NullKeyword ||
      expression.kind === ts.SyntaxKind.UndefinedKeyword
    ) {
      return true;
    }

    if (ts.isNumericLiteral(expression) && Number(expression.text) === 0) {
      return true;
    }

    if (ts.isStringLiteral(expression) && (expression.text === "false" || expression.text === "0")) {
      return true;
    }
  }

  return false;
}

function isMeaningfulJsxChild(child: ts.JsxChild) {
  if (ts.isJsxText(child)) {
    return child.getText().trim().length > 0;
  }
  if (ts.isJsxExpression(child)) {
    return Boolean(child.expression);
  }
  return true;
}

function getTriggerLabel(componentName: string, hasAsChild: boolean) {
  return hasAsChild ? `${componentName} asChild` : componentName;
}
interface IssuePayload {
  childKind: string;
  fixable: boolean;
  severity: Severity;
  message: string;
  applyFix?: (collector: FixCollector) => void;
}

type ChildIssue =
  | { kind: "ok" }
  | { kind: "violation"; issue: IssuePayload }
  | { kind: "suggestion"; issue: IssuePayload };

function analyzeFragment(
  fragment: ts.JsxFragment,
  sourceFile: ts.SourceFile,
  sourceText: string,
): ChildIssue {
  const meaningful = fragment.children.filter(isMeaningfulJsxChild);
  if (meaningful.length === 0) {
    return {
      kind: "violation",
      issue: {
        childKind: "fragment-empty",
        fixable: false,
        severity: "error",
        message: "Fragment child renders nothing, so the trigger receives no element.",
      },
    };
  }

  if (meaningful.length === 1) {
    const inner = meaningful[0];
    if (ts.isJsxElement(inner) || ts.isJsxSelfClosingElement(inner)) {
      return {
        kind: "suggestion",
        issue: {
          childKind: "fragment-wrapper",
          fixable: true,
          severity: "suggestion",
          message: "Fragment wraps a single element; unwrap it to avoid Radix Slot issues.",
          applyFix: (collector) => {
            const replacement = extractFragmentInnerText(fragment, sourceText);
            collector.addEdit(sourceFile.fileName, {
              start: fragment.getStart(sourceFile),
              end: fragment.getEnd(),
              newText: replacement,
              description: "Unwrapped single-child fragment used as Radix trigger child",
            });
          },
        },
      };
    }

    if (ts.isJsxExpression(inner)) {
      return analyzeExpression(inner, sourceFile, sourceText);
    }

    if (ts.isJsxText(inner)) {
      const text = inner.getText().trim();
      return {
        kind: "violation",
        issue: {
          childKind: "fragment-text",
          fixable: true,
          severity: "error",
          message: "Fragment contains plain text; wrap it in an element.",
          applyFix: (collector) => {
            collector.addEdit(sourceFile.fileName, {
              start: fragment.getStart(sourceFile),
              end: fragment.getEnd(),
              newText: `<span>${text}</span>`,
              description: "Wrapped fragment text content in a span",
            });
          },
        },
      };
    }
  }

  return {
    kind: "violation",
    issue: {
      childKind: "fragment-multiple",
      fixable: true,
      severity: "error",
      message: "Fragment contains multiple nodes; wrap them in a single element.",
      applyFix: (collector) => {
        wrapRangeWithSpan(collector, sourceFile.fileName, fragment.getStart(sourceFile), fragment.getEnd(), sourceText);
      },
    },
  };
}

function extractFragmentInnerText(fragment: ts.JsxFragment, sourceText: string) {
  const text = fragment.getText();
  if (text.startsWith("<>") && text.endsWith("</>")) {
    return text.slice(2, -3);
  }
  const start = fragment.getStart();
  const end = fragment.getEnd();
  return sourceText.slice(start, end);
}

function analyzeExpression(expressionNode: ts.JsxExpression, sourceFile: ts.SourceFile, sourceText: string): ChildIssue {
  const expression = expressionNode.expression;
  if (!expression) {
    return {
      kind: "violation",
      issue: {
        childKind: "empty-expression",
        fixable: false,
        severity: "error",
        message: "Expression child is empty, so nothing will be rendered.",
      },
    };
  }

  if (ts.isParenthesizedExpression(expression)) {
    return analyzeExpression({ ...expressionNode, expression: expression.expression } as ts.JsxExpression, sourceFile, sourceText);
  }

  if (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression)) {
    return { kind: "ok" };
  }

  if (ts.isJsxFragment(expression)) {
    return analyzeFragment(expression, sourceFile, sourceText);
  }

  if (ts.isConditionalExpression(expression)) {
    return analyzeConditionalExpression(expression, sourceFile, sourceText);
  }

  if (ts.isBinaryExpression(expression)) {
    const operator = expression.operatorToken.kind;
    if (
      operator === ts.SyntaxKind.AmpersandAmpersandToken ||
      operator === ts.SyntaxKind.BarBarToken ||
      operator === ts.SyntaxKind.QuestionQuestionToken
    ) {
      return {
        kind: "violation",
        issue: {
          childKind: "logical-expression",
          fixable: false,
          severity: "error",
          message: "Logical expression may return non-element values; refactor to render exactly one element.",
        },
      };
    }
  }

  if (ts.isArrayLiteralExpression(expression)) {
    return {
      kind: "violation",
      issue: {
        childKind: "array-expression",
        fixable: true,
        severity: "error",
        message: "Array expression renders multiple nodes; wrap them in a single element.",
        applyFix: (collector) => {
          const text = expression.getText();
          collector.addEdit(sourceFile.fileName, {
            start: expression.getStart(sourceFile),
            end: expression.getEnd(),
            newText: `<span className="inline-flex items-center gap-2">{${text}}</span>`,
            description: "Wrapped array expression inside a span for Radix trigger",
          });
        },
      },
    };
  }

  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression) || ts.isTemplateExpression(expression)) {
    const text = expression.getText();
    return {
      kind: "violation",
      issue: {
        childKind: "text-expression",
        fixable: true,
        severity: "error",
        message: "Expression resolves to text; wrap it in an element.",
        applyFix: (collector) => {
          collector.addEdit(sourceFile.fileName, {
            start: expressionNode.getStart(sourceFile),
            end: expressionNode.getEnd(),
            newText: `<span>${text}</span>`,
            description: "Wrapped text expression in a span for Radix trigger",
          });
        },
      },
    };
  }

  if (
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword ||
    expression.kind === ts.SyntaxKind.NullKeyword ||
    expression.kind === ts.SyntaxKind.UndefinedKeyword
  ) {
    return {
      kind: "violation",
      issue: {
        childKind: "non-element",
        fixable: false,
        severity: "error",
        message: "Expression may resolve to a non-element value.",
      },
    };
  }

  return { kind: "ok" };
}
function analyzeConditionalExpression(expression: ts.ConditionalExpression, sourceFile: ts.SourceFile, sourceText: string): ChildIssue {
  const trueBranch = classifyConditionalBranch(expression.whenTrue, sourceFile, sourceText, "when-true");
  const falseBranch = classifyConditionalBranch(expression.whenFalse, sourceFile, sourceText, "when-false");

  const branchIssues = [trueBranch, falseBranch].filter((issue) => issue.kind !== "ok") as Array<
    { kind: "violation" | "suggestion"; issue: IssuePayload }
  >;

  if (branchIssues.length === 0) {
    return { kind: "ok" };
  }

  const severity: Severity = branchIssues.some((issue) => issue.issue.severity === "error") ? "error" : "suggestion";
  const fixable = branchIssues.every((issue) => issue.issue.fixable);

  return {
    kind: severity === "error" ? "violation" : "suggestion",
    issue: {
      childKind: `conditional-${branchIssues.map((issue) => issue.issue.childKind).join("-")}`,
      fixable,
      severity,
      message: branchIssues.map((issue) => issue.issue.message).join(" "),
      applyFix: fixable
        ? (collector) => {
            for (const issue of branchIssues) {
              issue.issue.applyFix?.(collector);
            }
          }
        : undefined,
    },
  };
}

function classifyConditionalBranch(
  branch: ts.Expression,
  sourceFile: ts.SourceFile,
  sourceText: string,
  label: "when-true" | "when-false",
): ChildIssue {
  if (ts.isParenthesizedExpression(branch)) {
    return classifyConditionalBranch(branch.expression, sourceFile, sourceText, label);
  }

  if (ts.isJsxElement(branch) || ts.isJsxSelfClosingElement(branch)) {
    return { kind: "ok" };
  }

  if (ts.isJsxFragment(branch)) {
    return analyzeFragment(branch, sourceFile, sourceText);
  }

  if (ts.isArrayLiteralExpression(branch)) {
    return {
      kind: "violation",
      issue: {
        childKind: `${label}-array`,
        fixable: true,
        severity: "error",
        message: `Conditional branch ${label === "when-true" ? "(true)" : "(false)"} returns an array; wrap it in an element.`,
        applyFix: (collector) => {
          const text = branch.getText();
          collector.addEdit(sourceFile.fileName, {
            start: branch.getStart(sourceFile),
            end: branch.getEnd(),
            newText: `(<span className="inline-flex items-center gap-2">{${text}}</span>)`,
            description: `Wrapped conditional ${label} array branch in a span`,
          });
        },
      },
    };
  }

  if (ts.isStringLiteral(branch) || ts.isNoSubstitutionTemplateLiteral(branch) || ts.isTemplateExpression(branch)) {
    const text = branch.getText();
    return {
      kind: "violation",
      issue: {
        childKind: `${label}-text`,
        fixable: true,
        severity: "error",
        message: `Conditional branch ${label === "when-true" ? "(true)" : "(false)"} yields text; wrap it in an element.`,
        applyFix: (collector) => {
          collector.addEdit(sourceFile.fileName, {
            start: branch.getStart(sourceFile),
            end: branch.getEnd(),
            newText: `(<span>${text}</span>)`,
            description: `Wrapped conditional ${label} text branch in a span`,
          });
        },
      },
    };
  }

  if (
    branch.kind === ts.SyntaxKind.FalseKeyword ||
    branch.kind === ts.SyntaxKind.NullKeyword ||
    branch.kind === ts.SyntaxKind.UndefinedKeyword
  ) {
    return {
      kind: "violation",
      issue: {
        childKind: `${label}-empty`,
        fixable: false,
        severity: "error",
        message: `Conditional branch ${label === "when-true" ? "(true)" : "(false)"} can produce a non-element value.`,
      },
    };
  }

  if (ts.isConditionalExpression(branch)) {
    return analyzeConditionalExpression(branch, sourceFile, sourceText);
  }

  return { kind: "ok" };
}

function normalizeInnerLines(segment: string) {
  const trimmed = segment.trim();
  if (!trimmed) {
    return [] as string[];
  }
  const rawLines = trimmed.split(/\r?\n/);
  const nonEmpty = rawLines.filter((line) => line.trim().length > 0);
  const baseIndent = nonEmpty.length
    ? Math.min(...nonEmpty.map((line) => (line.match(/^\s*/)?.[0].length ?? 0)))
    : 0;

  return rawLines.map((line) => {
    if (line.trim().length === 0) {
      return "";
    }
    return line.slice(baseIndent);
  });
}

function wrapChildrenInSpan(
  collector: FixCollector,
  sourceFile: ts.SourceFile,
  element: ts.JsxElement,
  sourceText: string,
) {
  const start = element.openingElement.getEnd();
  const end = element.closingElement.getStart();
  const indentation = getIndentation(sourceText, start);
  const indentUnit = "  ";
  const segment = sourceText.slice(start, end);
  const innerLines = normalizeInnerLines(segment);

  const lines: string[] = [];
  lines.push("");
  if (innerLines.length === 0) {
    lines.push(`${indentation}${indentUnit}<span className="inline-flex items-center gap-2"></span>`);
    lines.push(indentation);
  } else {
    lines.push(`${indentation}${indentUnit}<span className="inline-flex items-center gap-2">`);
    innerLines.forEach((line) => {
      lines.push(line ? `${indentation}${indentUnit}${indentUnit}${line}` : "");
    });
    lines.push(`${indentation}${indentUnit}</span>`);
    lines.push(indentation);
  }

  const replacement = lines.join("\n");
  collector.addEdit(sourceFile.fileName, {
    start,
    end,
    newText: replacement,
    description: "Wrapped multiple Radix trigger children in a span",
  });
}

function wrapRangeWithSpan(
  collector: FixCollector,
  filePath: string,
  start: number,
  end: number,
  sourceText: string,
  className = "inline-flex items-center gap-2",
) {
  const indentation = getIndentation(sourceText, start);
  const indentUnit = "  ";
  const segment = sourceText.slice(start, end);
  const innerLines = normalizeInnerLines(segment);

  const classAttribute = className ? ` className="${className}"` : "";
  const lines: string[] = [];
  lines.push("");
  if (innerLines.length === 0) {
    lines.push(`${indentation}${indentUnit}<span${classAttribute}></span>`);
    lines.push(indentation);
  } else {
    lines.push(`${indentation}${indentUnit}<span${classAttribute}>`);
    innerLines.forEach((line) => {
      lines.push(line ? `${indentation}${indentUnit}${indentUnit}${line}` : "");
    });
    lines.push(`${indentation}${indentUnit}</span>`);
    lines.push(indentation);
  }

  const replacement = lines.join("\n");
  collector.addEdit(filePath, {
    start,
    end,
    newText: replacement,
    description: "Wrapped Radix trigger content inside a span",
  });
}

function filePathRelative(filePath: string) {
  const relative = path.relative(process.cwd(), filePath);
  const normalized = relative.startsWith("..") ? path.resolve(filePath) : relative;
  return normalized.split(path.sep).join("/");
}
export function analyzeSourceFile(filePath: string): Violation[] {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, getScriptKind());
  const violations: Violation[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node)) {
      analyzeElement(node, sourceFile, sourceText, violations);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

function analyzeElement(
  element: ts.JsxElement,
  sourceFile: ts.SourceFile,
  sourceText: string,
  violations: Violation[],
) {
  const opening = element.openingElement;
  const componentName = opening.tagName.getText(sourceFile);

  let hasAsChild = false;
  let asChildAttribute: ts.JsxAttribute | undefined;

  for (const attribute of opening.attributes.properties) {
    if (ts.isJsxAttribute(attribute) && attribute.name.text === "asChild") {
      hasAsChild = true;
      asChildAttribute = attribute;
      break;
    }
  }

  const isTarget = hasAsChild || TARGET_COMPONENTS.has(componentName);
  if (!isTarget) {
    return;
  }

  if (hasAsChild && asChildAttribute && attributeIsExplicitlyFalse(asChildAttribute)) {
    return;
  }

  const meaningfulChildren = element.children.filter(isMeaningfulJsxChild);
  const triggerLabel = getTriggerLabel(componentName, hasAsChild);
  const location = sourceFile.getLineAndCharacterOfPosition(opening.getStart(sourceFile));
  const lineNumber = location.line + 1;
  const column = location.character + 1;
  const preview = truncate(getLineText(sourceText, lineNumber).trim());
  const fileRelative = filePathRelative(sourceFile.fileName);

  const pushIssue = (issue: IssuePayload) => {
    violations.push({
      filePath: fileRelative,
      line: lineNumber,
      column,
      preview,
      triggerLabel,
      componentName,
      childKind: issue.childKind,
      message: issue.message,
      severity: issue.severity,
      fixable: issue.fixable,
      applyFix: issue.applyFix ? (collector) => issue.applyFix?.(collector) : undefined,
    });
  };

  if (meaningfulChildren.length === 0) {
    pushIssue({
      childKind: "missing-child",
      fixable: false,
      severity: "error",
      message: "Radix trigger expects exactly one element child, but none were found.",
    });
    return;
  }

  if (meaningfulChildren.length > 1) {
    pushIssue({
      childKind: "multiple-children",
      fixable: true,
      severity: "error",
      message: "Radix trigger has multiple direct children; wrap them in a single element.",
      applyFix: (collector) => wrapChildrenInSpan(collector, sourceFile, element, sourceText),
    });
    return;
  }

  const child = meaningfulChildren[0];
  const analysis = analyzeSingleChild(child, sourceFile, sourceText);

  if (analysis.kind === "violation" || analysis.kind === "suggestion") {
    pushIssue(analysis.issue);
  }
}

function analyzeSingleChild(
  child: ts.JsxChild,
  sourceFile: ts.SourceFile,
  sourceText: string,
): ChildIssue {
  if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
    return { kind: "ok" };
  }

  if (ts.isJsxFragment(child)) {
    return analyzeFragment(child, sourceFile, sourceText);
  }

  if (ts.isJsxExpression(child)) {
    return analyzeExpression(child, sourceFile, sourceText);
  }

  if (ts.isJsxText(child)) {
    const text = child.getText().trim();
    return {
      kind: "violation",
      issue: {
        childKind: "text-child",
        fixable: true,
        severity: "error",
        message: "Text nodes must be wrapped in an element when using Radix Slot.",
        applyFix: (collector) => {
          collector.addEdit(sourceFile.fileName, {
            start: child.getStart(sourceFile),
            end: child.getEnd(),
            newText: `<span>${text}</span>`,
            description: "Wrapped Radix trigger text child in a span",
          });
        },
      },
    };
  }

  return {
    kind: "violation",
    issue: {
      childKind: "unknown-child",
      fixable: false,
      severity: "error",
      message: "Radix trigger child must be a single React element.",
    },
  };
}
