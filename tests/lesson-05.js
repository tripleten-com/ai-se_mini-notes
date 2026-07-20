import { execSync } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  test,
  assert,
  summary,
  normalize,
  parseFileContent,
  findQuerySelector,
} from "./lib/utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function read(relPath) {
  try {
    return readFileSync(join(root, relPath), "utf8");
  } catch {
    return null;
  }
}

function checkTypecheck() {
  try {
    execSync("npm run typecheck", { cwd: root, stdio: "pipe" });
    return { ok: true, output: "" };
  } catch (err) {
    const output =
      err.stderr?.toString() || err.stdout?.toString() || "(no output)";
    return { ok: false, output };
  }
}

function findMapNoteReturn(ast) {
  const fn = findQuerySelector(
    ast,
    'FunctionDeclaration[id.name="mapNote"]',
  )[0];
  if (!fn) return null;
  return findQuerySelector(fn, "ReturnStatement")[0]?.argument ?? null;
}

function findObjectProperty(objectExpr, name) {
  if (!objectExpr || objectExpr.type !== "ObjectExpression") return null;
  return (
    (objectExpr.properties ?? []).find(
      (p) =>
        p.type === "ObjectProperty" &&
        ((p.key?.type === "Identifier" && p.key.name === name) ||
          (p.key?.type === "StringLiteral" && p.key.value === name)),
    ) ?? null
  );
}

function isToISOStringCall(node, dateProperty) {
  return (
    node?.type === "CallExpression" &&
    node.callee?.type === "MemberExpression" &&
    node.callee.property?.name === "toISOString" &&
    node.callee.object?.type === "MemberExpression" &&
    node.callee.object.object?.name === "document" &&
    node.callee.object.property?.name === dateProperty
  );
}

function isStringConstructorCall(node) {
  return (
    node?.type === "CallExpression" &&
    node.callee?.type === "Identifier" &&
    node.callee.name === "String"
  );
}

console.log("\nLesson 05: Handling Dates, Timestamps, and Time-Based Data\n");

const mapperPath = join(root, "server/src/mappers/noteMapper.ts");
const mapperSrc = read("server/src/mappers/noteMapper.ts");
const mapperAst = parseFileContent(mapperPath);

test("noteMapper.ts exists", () => {
  assert(mapperSrc !== null, "server/src/mappers/noteMapper.ts not found");
});

test("createdAt uses toISOString()", () => {
  assert(mapperAst !== null, "could not parse noteMapper.ts");
  const ret = findMapNoteReturn(mapperAst);
  assert(ret !== null, "mapNote return object not found");

  const createdAt = findObjectProperty(ret, "createdAt");
  assert(createdAt !== null, "createdAt field missing from mapNote return");
  assert(
    !isStringConstructorCall(createdAt.value),
    "createdAt still uses String(...) — use document.createdAt.toISOString()",
  );
  assert(
    isToISOStringCall(createdAt.value, "createdAt"),
    "createdAt should be document.createdAt.toISOString()",
  );
});

test("updatedAt still uses toISOString()", () => {
  const ret = findMapNoteReturn(mapperAst);
  assert(ret !== null, "mapNote return object not found");

  const updatedAt = findObjectProperty(ret, "updatedAt");
  assert(updatedAt !== null, "updatedAt field missing from mapNote return");
  assert(
    isToISOStringCall(updatedAt.value, "updatedAt"),
    "updatedAt should remain document.updatedAt.toISOString()",
  );
});

test("mapper does not introduce display-only date formats", () => {
  const normalized = normalize(mapperSrc) ?? "";
  assert(
    !/toLocaleDateString|toLocaleString|MM\/DD\/YYYY|DD\/MM\/YYYY/.test(
      normalized,
    ),
    "Do not add display-only date formatting in the backend mapper",
  );
});

test("npm run typecheck passes", () => {
  const result = checkTypecheck();
  assert(result.ok, result.output || "npm run typecheck failed");
});

summary("UDljRjFkSzV6");
