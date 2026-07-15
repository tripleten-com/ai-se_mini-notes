import { execSync } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  test,
  assert,
  summary,
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

function isStringConstructorCall(node) {
  return (
    node?.type === "CallExpression" &&
    node.callee?.type === "Identifier" &&
    node.callee.name === "String"
  );
}

function isToStringCall(node) {
  return (
    node?.type === "CallExpression" &&
    node.callee?.type === "MemberExpression" &&
    node.callee.property?.name === "toString"
  );
}

function isDirectDocumentVisibility(node) {
  return (
    node?.type === "MemberExpression" &&
    node.object?.name === "document" &&
    node.property?.name === "visibility" &&
    !node.computed
  );
}

console.log("\nLesson 03: Aligning Mongoose Models with Application Types\n");

const mapperPath = join(root, "server/src/mappers/noteMapper.ts");
const mapperSrc = read("server/src/mappers/noteMapper.ts");
const mapperAst = parseFileContent(mapperPath);

test("noteMapper.ts exists", () => {
  assert(mapperSrc !== null, "server/src/mappers/noteMapper.ts not found");
});

test("visibility is passed through without String()", () => {
  assert(mapperAst !== null, "could not parse noteMapper.ts");
  const ret = findMapNoteReturn(mapperAst);
  assert(ret !== null, "mapNote return object not found");

  const visibility = findObjectProperty(ret, "visibility");
  assert(visibility !== null, "visibility field missing from mapNote return");
  assert(
    !isStringConstructorCall(visibility.value),
    "visibility still uses String(document.visibility) — pass document.visibility directly",
  );
  assert(
    isDirectDocumentVisibility(visibility.value),
    "visibility should be mapped as document.visibility",
  );
});

test("intentional id and ownerId toString conversions remain", () => {
  const ret = findMapNoteReturn(mapperAst);
  assert(ret !== null, "mapNote return object not found");

  const id = findObjectProperty(ret, "id");
  assert(id !== null, "id field missing from mapNote return");
  assert(isToStringCall(id.value), "id should still use document._id.toString()");

  const ownerId = findObjectProperty(ret, "ownerId");
  assert(ownerId !== null, "ownerId field missing from mapNote return");
  assert(
    isToStringCall(ownerId.value),
    "ownerId should still use document.ownerId.toString()",
  );
});

test("unrelated mapped fields remain intact", () => {
  const ret = findMapNoteReturn(mapperAst);
  assert(ret !== null, "mapNote return object not found");

  for (const name of [
    "title",
    "body",
    "tags",
    "comments",
    "archived",
    "pinned",
    "createdAt",
    "updatedAt",
  ]) {
    assert(
      findObjectProperty(ret, name) !== null,
      `mapNote is missing the ${name} field`,
    );
  }
});

test("npm run typecheck passes", () => {
  const result = checkTypecheck();
  assert(result.ok, result.output || "npm run typecheck failed");
});

summary("TTdxUjJ2Vzh0");
