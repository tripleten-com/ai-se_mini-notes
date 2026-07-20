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
    return typeNode.typeName?.name ?? typeNode.typeName?.right?.name ?? null;
  }
  if (typeNode.type === "TSAnyKeyword") return "any";
  if (typeNode.type === "TSBooleanKeyword") return "boolean";
  if (typeNode.type === "TSStringKeyword") return "string";
  if (typeNode.type === "TSNullKeyword") return "null";
  if (typeNode.type === "TSArrayType") {
    return `${getTypeName(typeNode.elementType)}[]`;
  }
  if (typeNode.type === "TSUnionType") {
    return typeNode.types.map(getTypeName).sort().join("|");
  }
  return typeNode.type;
}

function findHookCall(ast, hookName, variableName) {
  const declarators = findQuerySelector(
    ast,
    `VariableDeclarator[id.type="ArrayPattern"], VariableDeclarator[id.type="Identifier"]`,
  );

  for (const decl of declarators) {
    if (decl.id?.type === "ArrayPattern") {
      const first = decl.id.elements?.[0];
      if (first?.type === "Identifier" && first.name === variableName) {
        if (
          decl.init?.type === "CallExpression" &&
          decl.init.callee?.name === hookName
        ) {
          return decl.init;
        }
      }
    }
    if (
      decl.id?.type === "Identifier" &&
      decl.id.name === variableName &&
      decl.init?.type === "CallExpression" &&
      decl.init.callee?.name === hookName
    ) {
      return decl.init;
    }
  }
  return null;
}

function getCallTypeArg(call) {
  return call?.typeParameters?.params?.[0] ?? null;
}

function isAsAny(node) {
  return (
    node?.type === "TSAsExpression" &&
    node.typeAnnotation?.type === "TSAnyKeyword"
  );
}

console.log("\nLesson 03: Typing Hook State and Refs\n");

const notesPagePath = join(root, "client/src/pages/NotesPage.tsx");
const authPath = join(root, "client/src/context/AuthContext.tsx");
const notesPageSrc = read("client/src/pages/NotesPage.tsx");
const authSrc = read("client/src/context/AuthContext.tsx");
const notesPageAst = parseFileContent(notesPagePath);
const authAst = parseFileContent(authPath);

test("NotesPage.tsx exists", () => {
  assert(notesPageSrc !== null, "client/src/pages/NotesPage.tsx not found");
});

test("AuthContext.tsx exists", () => {
  assert(authSrc !== null, "client/src/context/AuthContext.tsx not found");
});

test("notes state uses useState<Note[]>", () => {
  assert(notesPageAst !== null, "could not parse NotesPage.tsx");
  const call = findHookCall(notesPageAst, "useState", "notes");
  assert(call !== null, "notes useState call not found");

  const typeArg = getCallTypeArg(call);
  assert(typeArg !== null, "notes useState is missing an explicit generic type");
  assert(
    getTypeName(typeArg) !== "any[]",
    "notes still uses useState<any[]> — replace any[] with Note[]",
  );
  assert(
    getTypeName(typeArg) === "Note[]",
    `Expected useState<Note[]>, found useState<${getTypeName(typeArg)}>`,
  );
});

test("isLoading state uses useState<boolean>", () => {
  const call = findHookCall(notesPageAst, "useState", "isLoading");
  assert(call !== null, "isLoading useState call not found");

  const typeArg = getCallTypeArg(call);
  assert(
    typeArg !== null,
    "isLoading useState is missing an explicit boolean generic",
  );
  assert(
    getTypeName(typeArg) === "boolean",
    `Expected useState<boolean>, found useState<${getTypeName(typeArg)}>`,
  );
});

test("error state uses useState<string | null>", () => {
  const call = findHookCall(notesPageAst, "useState", "error");
  assert(call !== null, "error useState call not found");

  const initArg = call.arguments?.[0];
  assert(
    !isAsAny(initArg),
    "error still uses null as any — use useState<string | null>(null)",
  );

  const typeArg = getCallTypeArg(call);
  assert(typeArg !== null, "error useState is missing an explicit generic type");
  assert(
    getTypeName(typeArg) !== "any",
    "error state must not use any",
  );
  assert(
    getTypeName(typeArg) === "null|string",
    `Expected useState<string | null>, found useState<${getTypeName(typeArg)}>`,
  );
});

test("lastActionRef uses useRef<string | null>", () => {
  assert(authAst !== null, "could not parse AuthContext.tsx");
  const call = findHookCall(authAst, "useRef", "lastActionRef");
  assert(call !== null, "lastActionRef useRef call not found");

  const typeArg = getCallTypeArg(call);
  assert(
    typeArg !== null,
    "lastActionRef useRef is missing an explicit generic — use useRef<string | null>(null)",
  );
  assert(
    getTypeName(typeArg) === "null|string",
    `Expected useRef<string | null>, found useRef<${getTypeName(typeArg)}>`,
  );
});

test("NotesPage no longer uses any for notes or error state", () => {
  const normalized = normalize(notesPageSrc) ?? "";
  assert(
    !/useState\s*<\s*any\s*\[\s*\]\s*>/.test(normalized),
    "notes still uses useState<any[]>",
  );
  assert(
    !/useState\s*\(\s*null\s+as\s+any\s*\)/.test(normalized),
    "error still uses useState(null as any)",
  );
});

test("npm run typecheck passes", () => {
  const result = checkTypecheck();
  assert(result.ok, result.output || "npm run typecheck failed");
});

summary("TjI1QUxDUEJS");
