import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import ts from "typescript";

test("native containers never receive literal text, including explicit JSX spaces", () => {
  const failures: string[] = [];
  const containers = new Set([
    "View",
    "Pressable",
    "ScrollView",
    "SafeAreaView",
    "KeyboardAvoidingView",
  ]);
  function directory(folder: string) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const file = join(folder, entry.name);
      if (entry.isDirectory()) directory(file);
      else if (entry.name.endsWith(".tsx")) {
        const source = ts.createSourceFile(
          file,
          readFileSync(file, "utf8"),
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        );
        function inspect(node: ts.Node) {
          if (
            ts.isJsxElement(node) &&
            containers.has(node.openingElement.tagName.getText(source))
          ) {
            function child(item: ts.JsxChild) {
              const text = ts.isJsxText(item)
                ? /\S/.test(item.text)
                : ts.isJsxExpression(item) &&
                  item.expression &&
                  (ts.isStringLiteral(item.expression) ||
                    ts.isNoSubstitutionTemplateLiteral(item.expression));
              if (text)
                failures.push(
                  `${relative(process.cwd(), file)}:${source.getLineAndCharacterOfPosition(item.pos).line + 1}`,
                );
              if (ts.isJsxFragment(item)) item.children.forEach(child);
            }
            node.children.forEach(child);
          }
          ts.forEachChild(node, inspect);
        }
        inspect(source);
      }
    }
  }
  directory("src");
  assert.deepEqual(
    failures,
    [],
    "Wrap native text in Text/Body; use gap or padding for spacing",
  );
});
