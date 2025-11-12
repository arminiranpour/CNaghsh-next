const TARGET_COMPONENTS = new Set([
  "DialogTrigger",
  "AlertDialogTrigger",
  "DropdownMenuTrigger",
  "PopoverTrigger",
  "SheetTrigger",
  "HoverCardTrigger",
  "ContextMenuTrigger",
]);

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "ensure Radix Slot triggers receive exactly one React element child",
    },
    schema: [],
    messages: {
      missing: "{{trigger}} must render exactly one React element child.",
      multiple: "{{trigger}} must render exactly one React element child; found multiple nodes.",
      invalid: "{{trigger}} must render exactly one React element child; {{kind}} is not supported.",
    },
  },
  create(context) {
    return {
      JSXElement(node) {
        const opening = node.openingElement;
        const name = getElementName(opening.name);
        if (!name) {
          return;
        }

        const { hasAsChild, attribute } = findAsChildAttribute(opening.attributes);
        if (!hasAsChild && !TARGET_COMPONENTS.has(name)) {
          return;
        }

        if (attribute && attributeIsExplicitlyFalse(attribute)) {
          return;
        }

        const meaningfulChildren = getMeaningfulChildren(node.children);
        const triggerLabel = hasAsChild ? `${name} asChild` : name;

        if (meaningfulChildren.length === 0) {
          context.report({ node: opening, messageId: "missing", data: { trigger: triggerLabel } });
          return;
        }

        if (meaningfulChildren.length > 1) {
          context.report({ node: meaningfulChildren[1], messageId: "multiple", data: { trigger: triggerLabel } });
          return;
        }

        const child = meaningfulChildren[0];
        const issue = analyzeChild(child);
        if (!issue) {
          return;
        }

        context.report({
          node: issue.node || child,
          messageId: issue.messageId,
          data: { trigger: triggerLabel, kind: issue.kind },
        });
      },
    };
  },
};

function getElementName(nameNode) {
  if (!nameNode) {
    return null;
  }
  if (nameNode.type === "JSXIdentifier") {
    return nameNode.name;
  }
  if (nameNode.type === "JSXMemberExpression") {
    return getElementName(nameNode.object);
  }
  return null;
}

function findAsChildAttribute(attributes) {
  for (const attribute of attributes) {
    if (attribute.type === "JSXAttribute" && attribute.name && attribute.name.name === "asChild") {
      return { hasAsChild: true, attribute };
    }
  }
  return { hasAsChild: false, attribute: null };
}

function attributeIsExplicitlyFalse(attribute) {
  const value = attribute.value;
  if (!value) {
    return false;
  }
  if (value.type === "Literal") {
    return value.value === false || value.value === 0 || value.value === "false" || value.value === "0";
  }
  if (value.type === "JSXExpressionContainer") {
    const expression = value.expression;
    if (!expression) {
      return false;
    }
    if (expression.type === "Literal") {
      return expression.value === false || expression.value === 0 || expression.value === "false" || expression.value === "0";
    }
    if (expression.type === "Identifier" && expression.name === "false") {
      return true;
    }
  }
  return false;
}

function getMeaningfulChildren(children) {
  return children.filter((child) => {
    if (child.type === "JSXText") {
      return child.value.trim().length > 0;
    }
    if (child.type === "JSXExpressionContainer") {
      return child.expression != null;
    }
    return true;
  });
}

function analyzeChild(child) {
  switch (child.type) {
    case "JSXElement":
      return null;
    case "JSXFragment":
      return analyzeFragment(child);
    case "JSXText":
      return { messageId: "invalid", kind: "text node" };
    case "JSXExpressionContainer":
      return analyzeExpression(child.expression, child);
    default:
      return { messageId: "invalid", kind: child.type.toLowerCase() };
  }
}

function analyzeFragment(fragment) {
  const meaningful = getMeaningfulChildren(fragment.children);
  if (meaningful.length === 0) {
    return { messageId: "invalid", kind: "empty fragment", node: fragment };
  }
  if (meaningful.length === 1) {
    const inner = meaningful[0];
    if (inner.type === "JSXElement" || inner.type === "JSXSelfClosingElement") {
      return null;
    }
    if (inner.type === "JSXExpressionContainer") {
      return analyzeExpression(inner.expression, inner);
    }
    if (inner.type === "JSXText") {
      return { messageId: "invalid", kind: "fragment text", node: inner };
    }
  }
  return { messageId: "invalid", kind: "fragment with multiple nodes", node: fragment };
}

function analyzeExpression(expression, container) {
  if (!expression) {
    return { messageId: "invalid", kind: "empty expression", node: container };
  }
  if (expression.type === "JSXElement") {
    return null;
  }
  if (expression.type === "JSXFragment") {
    return analyzeFragment(expression);
  }
  if (expression.type === "ConditionalExpression") {
    const trueIssue = analyzeExpression(expression.consequent, expression);
    const falseIssue = analyzeExpression(expression.alternate, expression);
    if (!trueIssue && !falseIssue) {
      return null;
    }
    return trueIssue || falseIssue;
  }
  if (expression.type === "LogicalExpression") {
    return { messageId: "invalid", kind: "logical expression", node: expression };
  }
  if (expression.type === "ArrayExpression") {
    return { messageId: "invalid", kind: "array expression", node: expression };
  }
  if (expression.type === "Literal") {
    return { messageId: "invalid", kind: typeof expression.value === "string" ? "text literal" : "literal", node: container };
  }
  if (expression.type === "TemplateLiteral") {
    return { messageId: "invalid", kind: "template literal", node: container };
  }
  if (expression.type === "Identifier" && (expression.name === "null" || expression.name === "undefined")) {
    return { messageId: "invalid", kind: expression.name, node: container };
  }
  return null;
}
