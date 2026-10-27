import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { test } from "node:test";
import ts from "typescript";

test("app and viewer runtime imports are contained in this checkout", () => {
  const root = resolve("."),
    failures: string[] = [];
  function directory(folder: string) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const file = join(folder, entry.name);
      if (entry.isDirectory()) directory(file);
      else if (/\.tsx?$/.test(entry.name)) {
        const source = ts.createSourceFile(
          file,
          readFileSync(file, "utf8"),
          ts.ScriptTarget.Latest,
          true,
        );
        function inspect(node: ts.Node) {
          const specifier =
            ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
              ? node.moduleSpecifier
              : ts.isCallExpression(node) &&
                  (node.expression.getText(source) === "require" ||
                    node.expression.kind === ts.SyntaxKind.ImportKeyword)
                ? node.arguments[0]
                : undefined;
          if (
            specifier &&
            ts.isStringLiteral(specifier) &&
            specifier.text.startsWith(".")
          ) {
            const target = resolve(dirname(file), specifier.text);
            if (!target.startsWith(root + sep))
              failures.push(`${relative(root, file)}: ${specifier.text}`);
          }
          ts.forEachChild(node, inspect);
        }
        inspect(source);
      }
    }
  }
  directory("src");
  directory("viewer");
  assert.deepEqual(
    failures,
    [],
    "Runtime builds must not rely on adjacent BE/FE checkouts",
  );
});
