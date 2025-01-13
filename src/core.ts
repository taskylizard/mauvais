interface BaseRule {
  name: string;
  selector: string;
  continuous?: boolean;
  batchSize?: number;
  pollingInterval?: number;
  maxRetries?: number;
}

interface HideRule extends BaseRule {
  type: "hide";
  customStyle?: string;
}

interface TextRule extends BaseRule {
  type: "text";
  textToRemove: string | RegExp;
  exact?: boolean;
}

type Rule = HideRule | TextRule;

const rules: Map<string, Rule> = new Map();
const observers: Map<string, MutationObserver> = new Map();
const styleId = "tasky:mauvais";

//#region Ignition
if (!document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  document.head.appendChild(style);
}
//#endregion

const defaultConfig = {
  batchSize: 100,
  pollingInterval: 100,
  maxRetries: 50,
  continuous: true,
  customStyle: "display: none !important;",
  exact: false,
};

function updateStyles(): void {
  const styleElement = document.getElementById(styleId) as HTMLStyleElement;
  if (!styleElement) return;

  const hideRules = Array.from(rules.values())
    .filter((rule): rule is HideRule => rule.type === "hide")
    .map((rule) => `${rule.selector} { ${rule.customStyle} }`)
    .join("\n");

  styleElement.textContent = hideRules;
}

function defineRule(
  rule:
    | (Partial<HideRule> & Pick<HideRule, "name" | "selector" | "type">)
    | (Partial<TextRule> &
      Pick<TextRule, "name" | "selector" | "type" | "textToRemove">),
): void {
  const fullRule: Rule = {
    ...defaultConfig,
    ...rule,
  } as Rule;

  rules.set(fullRule.name, fullRule);

  if (fullRule.type === "hide") {
    updateStyles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => processRule(fullRule));
  } else {
    processRule(fullRule);
  }
}

// TODO: Rework this to be a more eagerly evaluated function
function cleanTextContent(node: Node, rule: TextRule): void {
  const text = node.textContent || "";
  let newText: string;

  if (rule.textToRemove instanceof RegExp) {
    newText = text.replace(rule.textToRemove, "");
  } else if (rule.exact) {
    newText = text === rule.textToRemove ? "" : text;
  } else {
    newText = text.replace(
      new RegExp(rule.textToRemove.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      "",
    );
  }

  if (newText !== text) {
    node.textContent = newText.replace(/\s+/g, " ");
  }
}

function processTextNodes(element: Element, rule: TextRule): void {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

  const textNodes: Node[] = [];
  let node: Node | null;

  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  textNodes.forEach((node) => {
    cleanTextContent(node, rule);
  });
}

function initObserver(rule: Rule): void {
  observers.get(rule.name)?.disconnect();

  const observer = new MutationObserver((mutations) => {
    if (rule.type === "hide") {
      let hasNewElements = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          const elements = Array.from(
            // @ts-expect-error
            mutation.target.querySelectorAll(rule.selector),
          );
          if (elements.length > 0) {
            hasNewElements = true;
            break;
          }
        }
      }

      if (hasNewElements) {
        updateStyles();
      }
    } else {
      // text rule
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          const elements = Array.from(
            // @ts-expect-error
            mutation.target.querySelectorAll(rule.selector),
          );
          elements.forEach((element) => {
            // @ts-expect-error
            processTextNodes(element, rule);
          });
        } else if (mutation.type === "characterData") {
          const targetNode = mutation.target;
          const parentElement = targetNode.parentElement;
          if (parentElement?.matches(rule.selector)) {
            cleanTextContent(targetNode, rule);
          }
        }
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: rule.type === "text",
  });

  observers.set(rule.name, observer);
}

async function processRule(rule: Rule): Promise<void> {
  let retryCount = 0;

  const cleanup = async () => {
    if (retryCount >= rule.maxRetries!) return;

    const elements = document.querySelectorAll(rule.selector);

    if (elements.length > 0) {
      if (rule.type === "text") {
        elements.forEach((element) => {
          processTextNodes(element, rule);
        });
      }

      if (rule.continuous) {
        retryCount++;
        await new Promise((resolve) =>
          setTimeout(resolve, rule.pollingInterval!),
        );
        await cleanup();
      }
    }

    if (rule.continuous) {
      initObserver(rule);
    }
  };

  await cleanup();
}

export function removeRule(name: string): void {
  observers.get(name)?.disconnect();
  observers.delete(name);
  rules.delete(name);
  updateStyles();
}

export function defineRules(rules: Rule[]): void {
  rules.forEach((rule) => defineRule(rule));
}
