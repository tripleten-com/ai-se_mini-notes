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
  if (typeNode.type === "TSUnionType") {
    return typeNode.types.map(getTypeName).join("|");
  }
  return typeNode.type;
}

function getTypeParams(typeNode) {
  if (typeNode?.type !== "TSTypeReference") return [];
  return (typeNode.typeParameters?.params ?? []).map(getTypeName);
}

function findFunction(ast, name) {
  const decls = findQuerySelector(ast, `FunctionDeclaration[id.name="${name}"]`);
  if (decls.length) return decls[0];

  const methods = findQuerySelector(ast, `FunctionExpression`);
  // Prefer named FunctionDeclarations; also check VariableDeclarator with matching id.
  const vars = findQuerySelector(ast, `VariableDeclarator[id.name="${name}"]`);
  for (const v of vars) {
    if (
      v.init &&
      (v.init.type === "FunctionExpression" ||
        v.init.type === "ArrowFunctionExpression")
    ) {
      return v.init;
    }
  }
  return methods.find((fn) => fn.id?.name === name) ?? null;
}

function getParamTypeAnnotation(fnNode) {
  const param = fnNode?.params?.[0];
  return param?.typeAnnotation?.typeAnnotation ?? null;
}

function importsNamedType(ast, typeName, fromModule) {
  const imports = findQuerySelector(ast, "ImportDeclaration");
  return imports.some((node) => {
    if (fromModule && node.source?.value !== fromModule) return false;
    return (node.specifiers ?? []).some(
      (spec) =>
        (spec.type === "ImportSpecifier" ||
          spec.type === "ImportDefaultSpecifier") &&
        (spec.imported?.name === typeName || spec.local?.name === typeName),
    );
  });
}

function typeParamsInclude(typeNode, expected) {
  const params = getTypeParams(typeNode);
  if (params.length !== expected.length) return false;
  return expected.every((name, i) => {
    const actual = params[i];
    if (name.includes("|")) {
      const parts = name.split("|").sort().join("|");
      return (
        typeof actual === "string" &&
        actual.split("|").sort().join("|") === parts
      );
    }
    return actual === name;
  });
}

function hasExplicitStringOnMapTag(src) {
  const normalized = normalize(src) ?? "";
  return /\.map\s*\(\s*\(\s*tag\s*:\s*string\s*\)/.test(normalized);
}

console.log("\nLesson 02: Typing DOM Events and Form Handlers\n");

const noteFormPath = join(root, "client/src/components/NoteForm.tsx");
const noteFormSrc = read("client/src/components/NoteForm.tsx");
const noteFormAst = parseFileContent(noteFormPath);

test("NoteForm.tsx exists", () => {
  assert(noteFormSrc !== null, "client/src/components/NoteForm.tsx not found");
});

test("ChangeEvent and FormEvent are imported from react", () => {
  assert(noteFormAst !== null, "could not parse NoteForm.tsx");
  assert(
    importsNamedType(noteFormAst, "ChangeEvent", "react"),
    "ChangeEvent must be imported from react",
  );
  assert(
    importsNamedType(noteFormAst, "FormEvent", "react"),
    "FormEvent must be imported from react",
  );
});

test("handleSubmit uses FormEvent<HTMLFormElement>", () => {
  const fn = findFunction(noteFormAst, "handleSubmit");
  assert(fn !== null, "handleSubmit not found");

  const annotation = getParamTypeAnnotation(fn);
  assert(annotation !== null, "handleSubmit event parameter has no type");
  assert(
    getTypeName(annotation) !== "any" && annotation.type !== "TSAnyKeyword",
    "handleSubmit still uses any — use FormEvent<HTMLFormElement>",
  );
  assert(
    getTypeName(annotation) === "FormEvent",
    `Expected FormEvent, found ${getTypeName(annotation)}`,
  );
  assert(
    typeParamsInclude(annotation, ["HTMLFormElement"]),
    "handleSubmit should use FormEvent<HTMLFormElement>",
  );
});

test("handleTextChange uses ChangeEvent for input and textarea", () => {
  const fn = findFunction(noteFormAst, "handleTextChange");
  assert(fn !== null, "handleTextChange not found");

  const annotation = getParamTypeAnnotation(fn);
  assert(annotation !== null, "handleTextChange event parameter has no type");
  assert(
    getTypeName(annotation) !== "any" && annotation.type !== "TSAnyKeyword",
    "handleTextChange still uses any — use ChangeEvent<HTMLInputElement | HTMLTextAreaElement>",
  );
  assert(
    getTypeName(annotation) === "ChangeEvent",
    `Expected ChangeEvent, found ${getTypeName(annotation)}`,
  );
  assert(
    typeParamsInclude(annotation, ["HTMLInputElement|HTMLTextAreaElement"]),
    "handleTextChange should use ChangeEvent<HTMLInputElement | HTMLTextAreaElement>",
  );
});

test("handleTagsChange uses ChangeEvent<HTMLInputElement>", () => {
  const fn = findFunction(noteFormAst, "handleTagsChange");
  assert(fn !== null, "handleTagsChange not found");

  const annotation = getParamTypeAnnotation(fn);
  assert(annotation !== null, "handleTagsChange event parameter has no type");
  assert(
    getTypeName(annotation) !== "any" && annotation.type !== "TSAnyKeyword",
    "handleTagsChange still uses any — use ChangeEvent<HTMLInputElement>",
  );
  assert(
    getTypeName(annotation) === "ChangeEvent",
    `Expected ChangeEvent, found ${getTypeName(annotation)}`,
  );
  assert(
    typeParamsInclude(annotation, ["HTMLInputElement"]),
    "handleTagsChange should use ChangeEvent<HTMLInputElement>",
  );
});

test("handleTagsChange map callback does not annotate tag as string", () => {
  assert(
    !hasExplicitStringOnMapTag(noteFormSrc),
    "Remove the unnecessary `: string` annotation from .map((tag: string) => ...)",
  );
});

test("Form event handlers are not typed as any", () => {
  for (const name of ["handleTextChange", "handleTagsChange", "handleSubmit"]) {
    const fn = findFunction(noteFormAst, name);
    assert(fn !== null, `${name} not found`);
    const annotation = getParamTypeAnnotation(fn);
    assert(
      annotation?.type !== "TSAnyKeyword",
      `${name} event parameter must not use any`,
    );
  }

  const normalized = normalize(noteFormSrc) ?? "";
  assert(
    !/function handle(?:TextChange|TagsChange|Submit)\s*\(\s*event\s*:\s*any\s*\)/.test(
      normalized,
    ),
    "One or more handlers still declare event: any",
  );
});

test("Handlers remain wired to the controlled form", () => {
  assert(noteFormAst !== null, "could not parse NoteForm.tsx");

  const formEl = findQuerySelector(
    noteFormAst,
    'JSXOpeningElement[name.name="form"]',
  );
  assert(formEl.length > 0, "<form> not found");
  const submitAttr = formEl[0].attributes.find(
    (attr) => attr.type === "JSXAttribute" && attr.name?.name === "onSubmit",
  );
  assert(submitAttr !== null, "form is missing onSubmit");
  assert(
    submitAttr.value?.expression?.name === "handleSubmit" ||
      submitAttr.value?.expression?.type === "Identifier",
    "form onSubmit should use handleSubmit",
  );
  assert(
    submitAttr.value?.expression?.name === "handleSubmit",
    "form onSubmit should reference handleSubmit",
  );

  const inputs = findQuerySelector(
    noteFormAst,
    'JSXOpeningElement[name.name="input"]',
  );
  const textareas = findQuerySelector(
    noteFormAst,
    'JSXOpeningElement[name.name="textarea"]',
  );

  const titleInput = inputs.find((el) =>
    el.attributes.some(
      (attr) =>
        attr.type === "JSXAttribute" &&
        attr.name?.name === "name" &&
        attr.value?.value === "title",
    ),
  );
  assert(titleInput, "title input not found");
  const titleChange = titleInput.attributes.find(
    (attr) => attr.type === "JSXAttribute" && attr.name?.name === "onChange",
  );
  assert(
    titleChange?.value?.expression?.name === "handleTextChange",
    "title input should use handleTextChange",
  );

  assert(textareas.length > 0, "body textarea not found");
  const bodyChange = textareas[0].attributes.find(
    (attr) => attr.type === "JSXAttribute" && attr.name?.name === "onChange",
  );
  assert(
    bodyChange?.value?.expression?.name === "handleTextChange",
    "body textarea should use handleTextChange",
  );

  const tagsInput = inputs.find((el) => {
    const hasName = el.attributes.some(
      (attr) =>
        attr.type === "JSXAttribute" &&
        attr.name?.name === "name" &&
        attr.value?.value === "title",
    );
    const onChange = el.attributes.find(
      (attr) => attr.type === "JSXAttribute" && attr.name?.name === "onChange",
    );
    return (
      !hasName && onChange?.value?.expression?.name === "handleTagsChange"
    );
  });
  assert(
    tagsInput,
    "tags input should use handleTagsChange",
  );
});

test("npm run typecheck passes", () => {
  const result = checkTypecheck();
  assert(result.ok, result.output || "npm run typecheck failed");
});

summary("OFpBMlVaNnFX");
