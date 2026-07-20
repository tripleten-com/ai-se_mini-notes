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
  return typeNode.type;
}

function getParamTypeAnnotation(fnNode) {
  const param = fnNode?.params?.[0];
  return param?.typeAnnotation?.typeAnnotation ?? null;
}

function findTypeAlias(ast, name) {
  const aliases = findQuerySelector(ast, `TSTypeAliasDeclaration[id.name="${name}"]`);
  return aliases[0] ?? null;
}

function getPropertySignatures(typeAlias) {
  const members = typeAlias?.typeAnnotation?.members ?? [];
  return members.filter((m) => m.type === "TSPropertySignature");
}

function getProperty(typeAlias, name) {
  return getPropertySignatures(typeAlias).find((m) => m.key?.name === name) ?? null;
}

console.log("\nLesson 01: Strengthening React Prop Contracts\n");

const noteCardPath = join(root, "client/src/components/NoteCard.tsx");
const notesPagePath = join(root, "client/src/pages/NotesPage.tsx");
const noteCardSrc = read("client/src/components/NoteCard.tsx");
const notesPageSrc = read("client/src/pages/NotesPage.tsx");
const noteCardAst = parseFileContent(noteCardPath);
const notesPageAst = parseFileContent(notesPagePath);

test("NoteCard.tsx exists", () => {
  assert(noteCardSrc !== null, "client/src/components/NoteCard.tsx not found");
});

test("NoteCardProps type alias is defined", () => {
  assert(noteCardAst !== null, "could not parse NoteCard.tsx");
  const propsType = findTypeAlias(noteCardAst, "NoteCardProps");
  assert(propsType !== null, "NoteCardProps type alias not found");
});

test("NoteCardProps.note uses the Note type", () => {
  const propsType = findTypeAlias(noteCardAst, "NoteCardProps");
  assert(propsType !== null, "NoteCardProps type alias not found");

  const noteProp = getProperty(propsType, "note");
  assert(noteProp !== null, "note prop missing from NoteCardProps");
  assert(noteProp.optional !== true, "note should be a required prop");
  assert(
    getTypeName(noteProp.typeAnnotation?.typeAnnotation) === "Note",
    "note prop should be typed as Note (import from shared/types)",
  );
});

test("NoteCardProps.onArchive is an optional (noteId: string) => void callback", () => {
  const propsType = findTypeAlias(noteCardAst, "NoteCardProps");
  assert(propsType !== null, "NoteCardProps type alias not found");

  const onArchive = getProperty(propsType, "onArchive");
  assert(onArchive !== null, "onArchive prop missing from NoteCardProps");
  assert(onArchive.optional === true, "onArchive should be optional");

  const fnType = onArchive.typeAnnotation?.typeAnnotation;
  assert(fnType?.type === "TSFunctionType", "onArchive should be a function type");

  const params = fnType.parameters ?? [];
  assert(params.length === 1, "onArchive should accept exactly one parameter");
  assert(
    getTypeName(params[0].typeAnnotation?.typeAnnotation) === "StringKeyword" ||
      params[0].typeAnnotation?.typeAnnotation?.type === "TSStringKeyword",
    "onArchive parameter should be typed as string",
  );
  assert(
    fnType.typeAnnotation?.typeAnnotation?.type === "TSVoidKeyword",
    "onArchive should return void",
  );
});

test("NoteCard uses NoteCardProps instead of any", () => {
  const fns = findQuerySelector(noteCardAst, 'FunctionDeclaration[id.name="NoteCard"]');
  assert(fns.length === 1, "NoteCard function declaration not found");

  const annotation = getParamTypeAnnotation(fns[0]);
  assert(annotation !== null, "NoteCard parameters have no type annotation");
  assert(
    getTypeName(annotation) !== "any" && annotation.type !== "TSAnyKeyword",
    "NoteCard props are still typed as any — replace any with NoteCardProps",
  );
  assert(
    getTypeName(annotation) === "NoteCardProps",
    `Expected NoteCard props to use NoteCardProps, found ${getTypeName(annotation)}`,
  );
});

test("No NoteCard prop is typed as any", () => {
  const fns = findQuerySelector(noteCardAst, 'FunctionDeclaration[id.name="NoteCard"]');
  const annotation = getParamTypeAnnotation(fns[0]);
  assert(
    annotation?.type !== "TSAnyKeyword",
    "NoteCard props must not use any",
  );

  const normalized = normalize(noteCardSrc) ?? "";
  assert(
    !/function NoteCard\s*\([^)]*:\s*any\s*\)/.test(normalized),
    "NoteCard signature still contains any",
  );
});

test("NotesPage passes note and onArchive to NoteCard", () => {
  assert(notesPageSrc !== null, "client/src/pages/NotesPage.tsx not found");
  assert(notesPageAst !== null, "could not parse NotesPage.tsx");

  const openings = findQuerySelector(
    notesPageAst,
    'JSXOpeningElement[name.name="NoteCard"]',
  );
  assert(openings.length > 0, "NotesPage does not render <NoteCard />");

  const attrNames = openings[0].attributes
    .filter((attr) => attr.type === "JSXAttribute")
    .map((attr) => attr.name?.name);

  assert(attrNames.includes("note"), "<NoteCard /> is missing the note prop");
  assert(
    attrNames.includes("onArchive"),
    "<NoteCard /> is missing the onArchive prop",
  );
});

test("npm run typecheck passes", () => {
  const result = checkTypecheck();
  assert(result.ok, result.output || "npm run typecheck failed");
});

summary("TUpCNWo2NTJW");
