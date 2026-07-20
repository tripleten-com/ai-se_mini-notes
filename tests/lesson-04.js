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
  if (typeNode.type === "TSStringKeyword") return "string";
  return typeNode.type;
}

function findTypeAlias(ast, name) {
  return (
    findQuerySelector(ast, `TSTypeAliasDeclaration[id.name="${name}"]`)[0] ??
    null
  );
}

function getProperty(typeAlias, name) {
  const members = typeAlias?.typeAnnotation?.members ?? [];
  return (
    members.find(
      (m) => m.type === "TSPropertySignature" && m.key?.name === name,
    ) ?? null
  );
}

function findVisibilitySchemaProperty(ast) {
  const objects = findQuerySelector(ast, "ObjectExpression");
  for (const obj of objects) {
    const visibility = (obj.properties ?? []).find(
      (p) =>
        p.type === "ObjectProperty" &&
        p.key?.type === "Identifier" &&
        p.key.name === "visibility" &&
        p.value?.type === "ObjectExpression",
    );
    if (visibility) return visibility.value;
  }
  return null;
}

function schemaHasEnumNoteVisibilities(schemaObj) {
  return (schemaObj?.properties ?? []).some(
    (p) =>
      p.type === "ObjectProperty" &&
      p.key?.type === "Identifier" &&
      p.key.name === "enum" &&
      p.value?.type === "Identifier" &&
      p.value.name === "NOTE_VISIBILITIES",
  );
}

function hasValueImport(ast, name, fromModule) {
  const imports = findQuerySelector(ast, "ImportDeclaration");
  return imports.some((node) => {
    if (fromModule && node.source?.value !== fromModule) return false;
    if (node.importKind === "type") return false;
    return (node.specifiers ?? []).some(
      (spec) =>
        spec.type === "ImportSpecifier" &&
        spec.importKind !== "type" &&
        (spec.imported?.name === name || spec.local?.name === name),
    );
  });
}

function visibilitySelectHasCast(ast) {
  const openings = findQuerySelector(
    ast,
    'JSXOpeningElement[name.name="VisibilitySelect"]',
  );
  if (!openings.length) return null;
  const valueAttr = openings[0].attributes.find(
    (attr) => attr.type === "JSXAttribute" && attr.name?.name === "value",
  );
  if (!valueAttr) return null;
  const expr = valueAttr.value?.expression ?? valueAttr.value;
  return expr?.type === "TSAsExpression";
}

console.log("\nLesson 04: Constrained Values in Shared Models\n");

const sharedPath = join(root, "shared/types.ts");
const modelPath = join(root, "server/src/models/Note.ts");
const formPath = join(root, "client/src/components/NoteForm.tsx");
const sharedSrc = read("shared/types.ts");
const modelSrc = read("server/src/models/Note.ts");
const formSrc = read("client/src/components/NoteForm.tsx");
const sharedAst = parseFileContent(sharedPath);
const modelAst = parseFileContent(modelPath);
const formAst = parseFileContent(formPath);

test("shared types, Note model, and NoteForm exist", () => {
  assert(sharedSrc !== null, "shared/types.ts not found");
  assert(modelSrc !== null, "server/src/models/Note.ts not found");
  assert(formSrc !== null, "client/src/components/NoteForm.tsx not found");
});

test("Note.visibility uses the NoteVisibility union", () => {
  assert(sharedAst !== null, "could not parse shared/types.ts");
  const noteType = findTypeAlias(sharedAst, "Note");
  assert(noteType !== null, "Note type alias not found");

  const visibility = getProperty(noteType, "visibility");
  assert(visibility !== null, "Note.visibility property not found");
  assert(
    getTypeName(visibility.typeAnnotation?.typeAnnotation) !== "string",
    "Note.visibility is still typed as string — use NoteVisibility",
  );
  assert(
    getTypeName(visibility.typeAnnotation?.typeAnnotation) === "NoteVisibility",
    `Expected Note.visibility: NoteVisibility, found ${getTypeName(visibility.typeAnnotation?.typeAnnotation)}`,
  );
});

test("Mongoose visibility schema uses enum: NOTE_VISIBILITIES", () => {
  assert(modelAst !== null, "could not parse Note.ts");
  assert(
    hasValueImport(modelAst, "NOTE_VISIBILITIES", "../../../shared/types"),
    "NOTE_VISIBILITIES must be imported as a value from shared/types",
  );

  const visibilitySchema = findVisibilitySchemaProperty(modelAst);
  assert(visibilitySchema !== null, "visibility field missing from noteSchema");
  assert(
    schemaHasEnumNoteVisibilities(visibilitySchema),
    "visibility schema should include enum: NOTE_VISIBILITIES",
  );
});

test("NoteForm no longer casts visibility as NoteVisibility", () => {
  assert(formAst !== null, "could not parse NoteForm.tsx");
  const cast = visibilitySelectHasCast(formAst);
  assert(cast !== null, "<VisibilitySelect> value prop not found");
  assert(
    cast === false,
    "Remove `as NoteVisibility` from VisibilitySelect value prop",
  );

  const normalized = normalize(formSrc) ?? "";
  assert(
    !/form\.visibility\s+as\s+NoteVisibility/.test(normalized),
    "NoteForm still casts form.visibility as NoteVisibility",
  );
});

test("npm run typecheck passes", () => {
  const result = checkTypecheck();
  assert(result.ok, result.output || "npm run typecheck failed");
});

summary("TjNiWTZoSjRz");
