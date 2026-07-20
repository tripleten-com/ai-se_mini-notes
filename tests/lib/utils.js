import { execSync } from "child_process";
import { parse } from "@babel/parser";
import esquery from "esquery";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const utilsDir = dirname(fileURLToPath(import.meta.url));
const testTsconfigPath = join(utilsDir, "..", "tsconfig.test.json");

// ============================================================
// TEST RUNNER
// ============================================================

let pass = 0;
let fail = 0;
let notRun = 0;

/**
 * Set when a gate (compile/build) fails. Once blocked, remaining tests are
 * displayed greyed-out as "not run" instead of executing.
 */
let blocked = false;

const GREY = "\x1b[90m";
const RESET = "\x1b[0m";

/** Wraps text in grey ANSI codes (skipped when output is not a terminal). */
function grey(text) {
  if (!process.stdout.isTTY) return text;
  return `${GREY}${text}${RESET}`;
}

/** Prints a greyed-out "not run" line for a test that was skipped. */
function printNotRun(label) {
  console.log(grey(`⚪ ${label} (not run)`));
  notRun++;
}

/**
 * Runs a single test. If a gate has failed (see runGates), the test is not
 * executed; it is listed in grey with a grey circle to show it was skipped.
 */
export function test(label, fn) {
  if (blocked) {
    printNotRun(label);
    return;
  }
  try {
    fn();
    console.log(`✅ ${label}`);
    pass++;
  } catch (err) {
    console.log(`❌ ${label} — ${err.message}`);
    fail++;
  }
}

/** Throws with the given message if the condition is falsy. */
export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Compiles a single TypeScript file as a gate. If it fails, error output is
 * printed, the failure is counted, and all subsequent tests are blocked
 * (displayed grey as "not run" rather than executed).
 */
export function runGates(filePath) {
  const compiled = checkCompiles(filePath);
  if (compiled.ok) {
    console.log("✅ File type-checks without errors\n");
    pass++;
  } else {
    console.log(
      "❌ TypeScript compilation failed — fix all type errors before running tests\n",
    );
    console.log(compiled.output);
    fail++;
    blocked = true;
    console.log("");
  }
}

/**
 * Prints the pass/fail/not-run totals. When everything passed, decodes and
 * prints the lesson's verification code. Exits nonzero on any failure.
 */
export function summary(encodedCode) {
  let line = `\n${pass} passed, ${fail} failed`;
  if (notRun > 0) line += grey(`, ${notRun} not run`);
  console.log(line);
  if (fail === 0 && notRun === 0) {
    const code = Buffer.from(encodedCode, "base64").toString();
    console.log(`\nVerification code: ${code}`);
  } else {
    process.exit(1);
  }
}

// ============================================================
// CHECKS
// ============================================================

/**
 * Collapses all whitespace sequences to a single space and trims the result.
 * Call this on every file read so that formatting differences don't affect
 * string matching in tests.
 */
export function normalize(content) {
  if (content === null) return null;
  return content.replace(/\s+/g, " ").trim();
}

/**
 * Type-checks TypeScript using tests/tsconfig.test.json (no JS emit) and
 * reports whether it succeeded.
 *
 * Unused-code checks (noUnusedLocals / noUnusedParameters) are disabled in the
 * test tsconfig because editors may surface them as faded "warning"-style hints
 * rather than red errors, and students shouldn't fail the check for leftover
 * unused variables. Real type errors (red squiggles) still fail.
 */
export function checkCompiles(filePath) {
  try {
    const projectRoot = join(dirname(filePath), "..");
    execSync(`npx tsc -p ${JSON.stringify(testTsconfigPath)}`, {
      cwd: projectRoot,
      stdio: "pipe",
    });
    return { ok: true, output: "" };
  } catch (err) {
    const output =
      err.stderr?.toString() || err.stdout?.toString() || "(no output)";
    return { ok: false, output };
  }
}

/**
 * Runs a vitest test file silently and returns whether all tests passed.
 */
export function checkBehavior(root, testFile) {
  try {
    execSync(`npx vitest run ${testFile}`, { cwd: root, stdio: "pipe" });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}



/**
 * Parses a file into an AST tree.
 * @param {string} filePath - The path to the file to parse.
 * @returns {Object|null} The AST tree or null if the file does not exist.
 */
export function parseFileContent(filePath) {
  try {
    const fileContent = readFileSync(filePath, "utf8");
    return parse(fileContent, { sourceType: "module", plugins: ["jsx", "typescript"] });
  } catch (error) {
    return null;
  }
}


/**
 * Finds all JSX elements in an AST tree.
 */
export function findQuerySelector(ast, selector) {
  try {
    return esquery(ast, selector);
  } catch (error) {
    return [];
  }
}

