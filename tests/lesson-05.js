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
  if (typeNode.type === "TSTypeParameter") return typeNode.name;
  return typeNode.type;
}

function findFunction(ast, name) {
  const decls = findQuerySelector(ast, `FunctionDeclaration[id.name="${name}"]`);
  return decls[0] ?? null;
}

function getTypeParameters(fnNode) {
  return (fnNode?.typeParameters?.params ?? []).map((p) => p.name);
}

function getParamType(fnNode) {
  return fnNode?.params?.[0]?.typeAnnotation?.typeAnnotation ?? null;
}

function getReturnType(fnNode) {
  return fnNode?.returnType?.typeAnnotation ?? null;
}

function isGenericApiResponseOf(typeNode, inner) {
  if (typeNode?.type !== "TSTypeReference") return false;
  if ((typeNode.typeName?.name ?? null) !== "ApiResponse") return false;
  const param = typeNode.typeParameters?.params?.[0] ?? null;
  return getTypeName(param) === inner;
}

console.log("\nLesson 05: Typing Async Data Flows and API Responses\n");

const httpPath = join(root, "client/src/services/http.ts");
const noteServicePath = join(root, "client/src/services/noteService.ts");
const notesPagePath = join(root, "client/src/pages/NotesPage.tsx");
const httpSrc = read("client/src/services/http.ts");
const noteServiceSrc = read("client/src/services/noteService.ts");
const notesPageSrc = read("client/src/pages/NotesPage.tsx");
const httpAst = parseFileContent(httpPath);
const noteServiceAst = parseFileContent(noteServicePath);
const notesPageAst = parseFileContent(notesPagePath);

test("http.ts and noteService.ts exist", () => {
  assert(httpSrc !== null, "client/src/services/http.ts not found");
  assert(noteServiceSrc !== null, "client/src/services/noteService.ts not found");
});

test("unwrapResponse is generic and returns T", () => {
  assert(httpAst !== null, "could not parse http.ts");
  const fn = findFunction(httpAst, "unwrapResponse");
  assert(fn !== null, "unwrapResponse not found");

  const typeParams = getTypeParameters(fn);
  assert(
    typeParams.length === 1,
    "unwrapResponse should declare a type parameter (e.g. <T>)",
  );

  const paramType = getParamType(fn);
  assert(
    isGenericApiResponseOf(paramType, typeParams[0]),
    `unwrapResponse parameter should be ApiResponse<${typeParams[0]}>`,
  );

  const returnType = getReturnType(fn);
  assert(returnType !== null, "unwrapResponse should declare an explicit return type");
  assert(
    getTypeName(returnType) === typeParams[0],
    `unwrapResponse should return ${typeParams[0]}, found ${getTypeName(returnType)}`,
  );
  assert(
    getTypeName(returnType) !== "any",
    "unwrapResponse must not return any",
  );
});

test("unwrapPaginated is generic over Paginated<T>", () => {
  const fn = findFunction(httpAst, "unwrapPaginated");
  assert(fn !== null, "unwrapPaginated not found");

  const typeParams = getTypeParameters(fn);
  assert(
    typeParams.length === 1,
    "unwrapPaginated should declare a type parameter (e.g. <T>)",
  );

  const paramType = getParamType(fn);
  assert(
    isGenericApiResponseOf(paramType, `Paginated<${typeParams[0]}>`),
    `unwrapPaginated parameter should be ApiResponse<Paginated<${typeParams[0]}>>`,
  );
  assert(
    !isGenericApiResponseOf(paramType, "Paginated<any>"),
    "unwrapPaginated still uses ApiResponse<Paginated<any>>",
  );
});

test("listNotes returns Promise<Paginated<Note>>", () => {
  assert(noteServiceAst !== null, "could not parse noteService.ts");
  const fn = findFunction(noteServiceAst, "listNotes");
  assert(fn !== null, "listNotes not found");

  const returnType = getReturnType(fn);
  assert(returnType !== null, "listNotes is missing a return type");
  assert(
    getTypeName(returnType) !== "Promise<any>",
    "listNotes still returns Promise<any>",
  );
  assert(
    getTypeName(returnType) === "Promise<Paginated<Note>>",
    `Expected Promise<Paginated<Note>>, found ${getTypeName(returnType)}`,
  );
});

test("createNote and updateNote return Promise<Note>", () => {
  for (const name of ["createNote", "updateNote"]) {
    const fn = findFunction(noteServiceAst, name);
    assert(fn !== null, `${name} not found`);

    const returnType = getReturnType(fn);
    assert(returnType !== null, `${name} is missing a return type`);
    assert(
      getTypeName(returnType) !== "Promise<any>",
      `${name} still returns Promise<any>`,
    );
    assert(
      getTypeName(returnType) === "Promise<Note>",
      `Expected ${name} to return Promise<Note>, found ${getTypeName(returnType)}`,
    );
  }
});

test("NotesPage uses result.items without casting", () => {
  assert(notesPageSrc !== null, "NotesPage.tsx not found");
  assert(notesPageAst !== null, "could not parse NotesPage.tsx");

  const normalized = normalize(notesPageSrc) ?? "";
  assert(
    /setNotes\s*\(\s*result\.items\s*\)/.test(normalized),
    "loadNotes should call setNotes(result.items)",
  );
  assert(
    !/setNotes\s*\(\s*result\.items\s+as\b/.test(normalized),
    "Do not cast result.items — rely on the Promise<Paginated<Note>> contract",
  );
  assert(
    !/as\s+Note\s*\[\]/.test(normalized),
    "Do not cast the list result to Note[]",
  );
});

test("Service helpers no longer use any in their contracts", () => {
  const httpNormalized = normalize(httpSrc) ?? "";
  const serviceNormalized = normalize(noteServiceSrc) ?? "";

  assert(
    !/unwrapResponse\s*\(\s*response:\s*ApiResponse\s*<\s*any\s*>\s*\)\s*:\s*any/.test(
      httpNormalized,
    ),
    "unwrapResponse still uses ApiResponse<any> / any",
  );
  assert(
    !/Promise\s*<\s*any\s*>/.test(serviceNormalized),
    "noteService still declares Promise<any> return types",
  );
});

test("npm run typecheck passes", () => {
  const result = checkTypecheck();
  assert(result.ok, result.output || "npm run typecheck failed");
});

summary("bTVIb2N3dWVC");
