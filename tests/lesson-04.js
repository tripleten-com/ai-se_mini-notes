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
  if (typeNode.type === "TSNullKeyword") return "null";
  if (typeNode.type === "TSUnionType") {
    return typeNode.types.map(getTypeName).sort().join("|");
  }
  return typeNode.type;
}

function findCreateContextCall(ast) {
  const calls = findQuerySelector(ast, 'CallExpression[callee.name="createContext"]');
  return calls[0] ?? null;
}

function findFunction(ast, name) {
  const decls = findQuerySelector(ast, `FunctionDeclaration[id.name="${name}"]`);
  return decls[0] ?? null;
}

function getReturnType(fnNode) {
  return fnNode?.returnType?.typeAnnotation ?? null;
}

function throwsUseAuthError(fnNode) {
  const throws = findQuerySelector(fnNode, "ThrowStatement");
  return throws.some((node) => {
    const arg = node.argument;
    if (arg?.type !== "NewExpression" || arg.callee?.name !== "Error") {
      return false;
    }
    const msg = arg.arguments?.[0];
    return (
      msg?.type === "StringLiteral" &&
      msg.value === "useAuth must be used inside AuthProvider"
    );
  });
}

function hasFalsyValueGuard(fnNode) {
  const ifs = findQuerySelector(fnNode, "IfStatement");
  return ifs.some((node) => {
    const test = node.test;
    return (
      test?.type === "UnaryExpression" &&
      test.operator === "!" &&
      test.argument?.type === "Identifier" &&
      test.argument.name === "value"
    );
  });
}

console.log("\nLesson 04: Typing the React Context\n");

const authPath = join(root, "client/src/context/AuthContext.tsx");
const authSrc = read("client/src/context/AuthContext.tsx");
const authAst = parseFileContent(authPath);

test("AuthContext.tsx exists", () => {
  assert(authSrc !== null, "client/src/context/AuthContext.tsx not found");
});

test("AuthContext is created with AuthContextValue | null", () => {
  assert(authAst !== null, "could not parse AuthContext.tsx");
  const call = findCreateContextCall(authAst);
  assert(call !== null, "createContext call not found");

  const typeArg = call.typeParameters?.params?.[0] ?? null;
  assert(typeArg !== null, "createContext is missing a type argument");
  assert(
    getTypeName(typeArg) !== "any",
    "AuthContext still uses createContext<any> — use AuthContextValue | null",
  );
  assert(
    getTypeName(typeArg) === "AuthContextValue|null",
    `Expected createContext<AuthContextValue | null>, found createContext<${getTypeName(typeArg)}>`,
  );
});

test("useAuth explicitly returns AuthContextValue", () => {
  const fn = findFunction(authAst, "useAuth");
  assert(fn !== null, "useAuth function not found");

  const returnType = getReturnType(fn);
  assert(
    returnType !== null,
    "useAuth is missing an explicit return type — add : AuthContextValue",
  );
  assert(
    getTypeName(returnType) === "AuthContextValue",
    `Expected useAuth(): AuthContextValue, found ${getTypeName(returnType)}`,
  );
});

test("useAuth checks for null and throws a descriptive error", () => {
  const fn = findFunction(authAst, "useAuth");
  assert(fn !== null, "useAuth function not found");
  assert(
    hasFalsyValueGuard(fn),
    'useAuth should guard with if (!value) before returning',
  );
  assert(
    throwsUseAuthError(fn),
    'useAuth should throw new Error("useAuth must be used inside AuthProvider")',
  );
});

test("AuthContext no longer uses any", () => {
  const normalized = normalize(authSrc) ?? "";
  assert(
    !/createContext\s*<\s*any\s*>/.test(normalized),
    "createContext still uses <any>",
  );
});

test("npm run typecheck passes", () => {
  const result = checkTypecheck();
  assert(result.ok, result.output || "npm run typecheck failed");
});

summary("UnlKTURFVVJN");
