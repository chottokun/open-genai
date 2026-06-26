import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

type DirectiveNode = {
  type: 'textDirective' | 'leafDirective' | 'containerDirective';
  name: string;
  children: Array<{ type: string; value?: string }>;
  attributes?: Record<string, string>;
  data?: Record<string, unknown>;
};

function isDirectiveNode(node: { type: string }): node is DirectiveNode {
  return (
    node.type === 'textDirective' ||
    node.type === 'leafDirective' ||
    node.type === 'containerDirective'
  );
}

function reconstructDirectiveText(node: DirectiveNode): string {
  const prefix = node.type === 'textDirective' ? ':' : node.type === 'leafDirective' ? '::' : ':::';
  return `${prefix}${node.name}`;
}

export function remarkDirectiveFilter(options?: { allowedNames?: string[] }) {
  const allowedNames = new Set(options?.allowedNames ?? []);

  return (tree: Root) => {
    visit(tree, (node, index, parent) => {
      if (!isDirectiveNode(node) || index === undefined || !parent) {
        return;
      }

      if (allowedNames.has(node.name)) {
        return;
      }

      const textValue = reconstructDirectiveText(node);
      const replacements: Array<{ type: 'text'; value: string } | (typeof node.children)[number]> =
        [{ type: 'text', value: textValue }, ...node.children];

      parent.children.splice(index, 1, ...(replacements as typeof parent.children));
    });
  };
}
