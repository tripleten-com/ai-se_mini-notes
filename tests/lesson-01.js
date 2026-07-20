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
  if (typeNode.type === "TSNeverKeyword") return "never";
  if (typeNode.type === "TSStringKeyword") return "string";
  if (typeNode.type === "TSUnionType") {
    return typeNode.types.map(getTypeName).sort().join("|");
  }
  if (typeNode.type === "TSTypeLiteral") {
    const members = (typeNode.members ?? [])
      .filter((m) => m.type === "TSPropertySignature")
      .map((m) => {
        const key = m.key?.name ?? "?";
        const value = getTypeName(m.typeAnnotation?.typeAnnotation);
        return `${key}:${value}`;
      })
      .sort();
    return `{${members.join(",")}}`;
  }
  return typeNode.type;
}

function findTypeAlias(ast, name) {
  return (
    findQuerySelector(ast, `TSTypeAliasDeclaration[id.name="${name}"]`)[0] ??
    null
  );
}

function getAliasType(alias) {
  return alias?.typeAnnotation ?? null;
}

function getRequestTypeArgs(alias) {
  const typeNode = getAliasType(alias);
  if (typeNode?.type !== "TSTypeReference") return null;
  if ((typeNode.typeName?.name ?? null) !== "Request") return null;
  return typeNode.typeParameters?.params ?? null;
}

function findFunction(ast, name) {
  return (
    findQuerySelector(ast, `FunctionDeclaration[id.name="${name}"]`)[0] ?? null
  );
}

function getParamTypeByName(fnNode, paramName) {
  const param = (fnNode?.params ?? []).find((p) => p.name === paramName);
  return param?.typeAnnotation?.typeAnnotation ?? null;
}

function importsNamedType(ast, typeName) {
  const imports = findQuerySelector(ast, "ImportDeclaration");
  return imports.some((node) =>
    (node.specifiers ?? []).some(
      (spec) =>
        spec.type === "ImportSpecifier" &&
        (spec.imported?.name === typeName || spec.local?.name === typeName),
    ),
  );
}

console.log("\nLesson 01: Strengthening Express Route Contracts\n");

const controllerPath = join(root, "server/src/controllers/noteController.ts");
const routesPath = join(root, "server/src/routes/notes.ts");
const controllerSrc = read("server/src/controllers/noteController.ts");
const routesSrc = read("server/src/routes/notes.ts");
const controllerAst = parseFileContent(controllerPath);
const routesAst = parseFileContent(routesPath);

test("noteController.ts and notes routes exist", () => {
  assert(
    controllerSrc !== null,
    "server/src/controllers/noteController.ts not found",
  );
  assert(routesSrc !== null, "server/src/routes/notes.ts not found");
});

test("PATCH route declares the noteId param", () => {
  assert(routesAst !== null, "could not parse notes.ts");
  const normalized = normalize(routesSrc) ?? "";
  assert(
    /patch\s*\(\s*["'`]\/:noteId["'`]/.test(normalized),
    'Expected notesRouter.patch("/:noteId", ...)',
  );
});

test("CreateNoteRequest types params, response, and CreateNotePayload body", () => {
  assert(controllerAst !== null, "could not parse noteController.ts");
  const alias = findTypeAlias(controllerAst, "CreateNoteRequest");
  assert(alias !== null, "CreateNoteRequest type alias not found");

  const args = getRequestTypeArgs(alias);
  assert(
    args !== null && args.length >= 3,
    "CreateNoteRequest should be Request<Params, ResBody, ReqBody>",
  );
  assert(
    getTypeName(args[0]) === "Record<string,never>",
    `CreateNoteRequest Params should be Record<string, never>, found ${getTypeName(args[0])}`,
  );
  assert(
    getTypeName(args[1]) === "ApiResponse<Note>",
    `CreateNoteRequest ResBody should be ApiResponse<Note>, found ${getTypeName(args[1])}`,
  );
  assert(
    getTypeName(args[2]) === "CreateNotePayload",
    `CreateNoteRequest ReqBody should be CreateNotePayload, found ${getTypeName(args[2])}`,
  );
});

test("NoteErrorResponse is defined as { message: string }", () => {
  const alias = findTypeAlias(controllerAst, "NoteErrorResponse");
  assert(alias !== null, "NoteErrorResponse type alias not found");
  assert(
    getTypeName(getAliasType(alias)) === "{message:string}",
    `Expected NoteErrorResponse = { message: string }, found ${getTypeName(getAliasType(alias))}`,
  );
});

test("UpdateNoteRequest types noteId param and UpdateNotePayload body", () => {
  assert(
    importsNamedType(controllerAst, "UpdateNotePayload"),
    "UpdateNotePayload should be imported from shared/types",
  );

  const alias = findTypeAlias(controllerAst, "UpdateNoteRequest");
  assert(alias !== null, "UpdateNoteRequest type alias not found");

  const args = getRequestTypeArgs(alias);
  assert(
    args !== null && args.length >= 3,
    "UpdateNoteRequest should be Request<Params, ResBody, ReqBody>",
  );
  assert(
    getTypeName(args[0]) === "{noteId:string}",
    `UpdateNoteRequest Params should be { noteId: string }, found ${getTypeName(args[0])}`,
  );
  assert(
    getTypeName(args[1]) === "ApiResponse<Note|NoteErrorResponse>",
    `UpdateNoteRequest ResBody should be ApiResponse<Note | NoteErrorResponse>, found ${getTypeName(args[1])}`,
  );
  assert(
    getTypeName(args[2]) === "UpdateNotePayload",
    `UpdateNoteRequest ReqBody should be UpdateNotePayload, found ${getTypeName(args[2])}`,
  );
});

test("patchNote res uses Response<ApiResponse<Note | NoteErrorResponse>>", () => {
  const fn = findFunction(controllerAst, "patchNote");
  assert(fn !== null, "patchNote function not found");

  const resType = getParamTypeByName(fn, "res");
  assert(resType !== null, "patchNote res parameter is missing a type");
  assert(
    getTypeName(resType) === "Response<ApiResponse<Note|NoteErrorResponse>>",
    `Expected Response<ApiResponse<Note | NoteErrorResponse>>, found ${getTypeName(resType)}`,
  );
});

test("Request aliases are no longer plain Request", () => {
  const normalized = normalize(controllerSrc) ?? "";
  assert(
    !/type CreateNoteRequest\s*=\s*Request\s*;/.test(normalized),
    "CreateNoteRequest is still an untyped Request alias",
  );
  assert(
    !/type UpdateNoteRequest\s*=\s*Request\s*;/.test(normalized),
    "UpdateNoteRequest is still an untyped Request alias",
  );
});

test("npm run typecheck passes", () => {
  const result = checkTypecheck();
  assert(result.ok, result.output || "npm run typecheck failed");
});

summary("SzhtUTNuUjd3");
