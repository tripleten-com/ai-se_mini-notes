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

function getTypeName(typeNode) {
  if (!typeNode) return null;
  if (typeNode.type === "TSTypeReference") {
    const name =
      typeNode.typeName?.name ?? typeNode.typeName?.right?.name ?? null;
    const params = (typeNode.typeParameters?.params ?? []).map(getTypeName);
    if (params.length) return `${name}<${params.join(",")}>`;
    return name;
  }
  if (typeNode.type === "TSAnyKeyword") return "any";
  if (typeNode.type === "TSArrayType") {
    return `${getTypeName(typeNode.elementType)}[]`;
  }
  if (typeNode.type === "TSTypeParameter") return typeNode.name;
  return typeNode.type;
}

function findFunction(ast, name) {
  return (
    findQuerySelector(ast, `FunctionDeclaration[id.name="${name}"]`)[0] ?? null
  );
}

function getTypeParameters(fnNode) {
  return (fnNode?.typeParameters?.params ?? []).map((p) => p.name);
}

function getParamType(fnNode, index = 0) {
  return fnNode?.params?.[index]?.typeAnnotation?.typeAnnotation ?? null;
}

function getReturnType(fnNode) {
  return fnNode?.returnType?.typeAnnotation ?? null;
}

console.log("\nLesson 02: Generic Helper Functions\n");

const paginatePath = join(root, "server/src/utils/paginate.ts");
const paginateSrc = read("server/src/utils/paginate.ts");
const paginateAst = parseFileContent(paginatePath);

test("paginate.ts exists", () => {
  assert(paginateSrc !== null, "server/src/utils/paginate.ts not found");
});

test("paginate defines a generic parameter <T>", () => {
  assert(paginateAst !== null, "could not parse paginate.ts");
  const fn = findFunction(paginateAst, "paginate");
  assert(fn !== null, "paginate function not found");

  const typeParams = getTypeParameters(fn);
  assert(
    typeParams.length === 1,
    "paginate should declare a type parameter (e.g. paginate<T>)",
  );
  assert(typeParams[0] === "T", `Expected type parameter T, found ${typeParams[0]}`);
});

test("paginate items parameter is typed as T[]", () => {
  const fn = findFunction(paginateAst, "paginate");
  assert(fn !== null, "paginate function not found");

  const itemsType = getParamType(fn, 0);
  assert(itemsType !== null, "items parameter is missing a type");
  assert(
    getTypeName(itemsType) !== "any[]",
    "items is still typed as any[] — use T[]",
  );
  assert(
    getTypeName(itemsType) === "T[]",
    `Expected items: T[], found ${getTypeName(itemsType)}`,
  );
});

test("paginate returns Paginated<T>", () => {
  const fn = findFunction(paginateAst, "paginate");
  assert(fn !== null, "paginate function not found");

  const returnType = getReturnType(fn);
  assert(returnType !== null, "paginate is missing an explicit return type");
  assert(
    getTypeName(returnType) !== "Paginated<any>",
    "paginate still returns Paginated<any>",
  );
  assert(
    getTypeName(returnType) === "Paginated<T>",
    `Expected Paginated<T>, found ${getTypeName(returnType)}`,
  );
});

test("paginate.ts contains no any", () => {
  const normalized = normalize(paginateSrc) ?? "";
  assert(!/\bany\b/.test(normalized), "Remove all any usages from paginate.ts");
});

test("npm run typecheck passes", () => {
  const result = checkTypecheck();
  assert(result.ok, result.output || "npm run typecheck failed");
});

summary("TDRuWDlrUDJt");
