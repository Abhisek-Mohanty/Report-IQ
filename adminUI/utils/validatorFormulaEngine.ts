import { SheetData } from "@/types";
import {
  ManualRuleConfig,
  RuleEvaluationResult,
  ValidationOutcome,
  ValidationSuiteSummary,
} from "@/types/validator";

/**
 * Restricted AST Expression Engine
 * Zero eval, zero new Function, strictly sandboxed recursive-descent parser.
 */

export type ASTNode =
  | { type: "NumberLiteral"; value: number }
  | { type: "StringLiteral"; value: string }
  | { type: "BooleanLiteral"; value: boolean }
  | { type: "NullLiteral" }
  | { type: "ColumnRef"; name: string }
  | {
      type: "BinaryOp";
      operator: string;
      left: ASTNode;
      right: ASTNode;
    }
  | {
      type: "UnaryOp";
      operator: string;
      argument: ASTNode;
    }
  | {
      type: "FunctionCall";
      name: string;
      args: ASTNode[];
    };

/**
 * Tokenizer for formula strings
 */
interface Token {
  type:
    | "NUMBER"
    | "STRING"
    | "IDENTIFIER"
    | "COLUMN"
    | "OPERATOR"
    | "LPAREN"
    | "RPAREN"
    | "COMMA"
    | "EOF";
  value: string;
  position: number;
}

export function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = expression.length;

  while (i < n) {
    const ch = expression[i];

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Bracketed column reference: [Column Name]
    if (ch === "[") {
      const start = i;
      i++;
      let colName = "";
      while (i < n && expression[i] !== "]") {
        colName += expression[i];
        i++;
      }
      if (i >= n) {
        throw new Error(`Unclosed column bracket '[' starting at position ${start}`);
      }
      i++; // consume ']'
      tokens.push({
        type: "COLUMN",
        value: colName.trim(),
        position: start,
      });
      continue;
    }

    // String literals: "string" or 'string'
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      i++;
      let str = "";
      while (i < n && expression[i] !== quote) {
        if (expression[i] === "\\" && i + 1 < n) {
          str += expression[i + 1];
          i += 2;
        } else {
          str += expression[i];
          i++;
        }
      }
      if (i >= n) {
        throw new Error(`Unterminated string literal at position ${start}`);
      }
      i++; // consume quote
      tokens.push({
        type: "STRING",
        value: str,
        position: start,
      });
      continue;
    }

    // Number literals: 123, 45.67
    if (/[0-9]/.test(ch) || (ch === "." && i + 1 < n && /[0-9]/.test(expression[i + 1]))) {
      const start = i;
      let numStr = "";
      while (i < n && /[0-9.]/.test(expression[i])) {
        numStr += expression[i];
        i++;
      }
      tokens.push({
        type: "NUMBER",
        value: numStr,
        position: start,
      });
      continue;
    }

    // Punctuation
    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: "(", position: i++ });
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ")", position: i++ });
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "COMMA", value: ",", position: i++ });
      continue;
    }

    // Two-character operators: ==, !=, <=, >=, &&, ||, <>
    const next2 = expression.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", "&&", "||", "<>"].includes(next2)) {
      tokens.push({ type: "OPERATOR", value: next2 === "<>" ? "!=" : next2, position: i });
      i += 2;
      continue;
    }

    // Single-character operators: +, -, *, /, %, ^, <, >, !
    if (["+", "-", "*", "/", "%", "^", "<", ">", "!"].includes(ch)) {
      tokens.push({ type: "OPERATOR", value: ch, position: i++ });
      continue;
    }

    // Word identifiers & keywords: AND, OR, NOT, IF, TRUE, FALSE, NULL, column names without brackets
    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      let ident = "";
      while (i < n && /[a-zA-Z0-9_]/.test(expression[i])) {
        ident += expression[i];
        i++;
      }
      const upper = ident.toUpperCase();
      if (upper === "AND") {
        tokens.push({ type: "OPERATOR", value: "&&", position: start });
      } else if (upper === "OR") {
        tokens.push({ type: "OPERATOR", value: "||", position: start });
      } else if (upper === "NOT") {
        tokens.push({ type: "OPERATOR", value: "!", position: start });
      } else {
        tokens.push({ type: "IDENTIFIER", value: ident, position: start });
      }
      continue;
    }

    throw new Error(`Unexpected character '${ch}' at position ${i}`);
  }

  tokens.push({ type: "EOF", value: "", position: n });
  return tokens;
}

/**
 * Recursive-descent parser building AST
 */
export class FormulaParser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: "EOF", value: "", position: -1 };
  }

  private consume(expectedType?: string): Token {
    const token = this.peek();
    if (expectedType && token.type !== expectedType) {
      throw new Error(
        `Expected ${expectedType} but found '${token.value}' at position ${token.position}`
      );
    }
    this.pos++;
    return token;
  }

  public parse(): ASTNode {
    const node = this.parseLogicalOr();
    if (this.peek().type !== "EOF") {
      throw new Error(`Unexpected token '${this.peek().value}' after valid expression`);
    }
    return node;
  }

  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();
    while (this.peek().value === "||") {
      this.consume();
      const right = this.parseLogicalAnd();
      left = { type: "BinaryOp", operator: "||", left, right };
    }
    return left;
  }

  private parseLogicalAnd(): ASTNode {
    let left = this.parseEquality();
    while (this.peek().value === "&&") {
      this.consume();
      const right = this.parseEquality();
      left = { type: "BinaryOp", operator: "&&", left, right };
    }
    return left;
  }

  private parseEquality(): ASTNode {
    let left = this.parseRelational();
    while (["==", "!="].includes(this.peek().value)) {
      const op = this.consume().value;
      const right = this.parseRelational();
      left = { type: "BinaryOp", operator: op, left, right };
    }
    return left;
  }

  private parseRelational(): ASTNode {
    let left = this.parseAdditive();
    while (["<", "<=", ">", ">="].includes(this.peek().value)) {
      const op = this.consume().value;
      const right = this.parseAdditive();
      left = { type: "BinaryOp", operator: op, left, right };
    }
    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    while (["+", "-"].includes(this.peek().value)) {
      const op = this.consume().value;
      const right = this.parseMultiplicative();
      left = { type: "BinaryOp", operator: op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parsePower();
    while (["*", "/", "%"].includes(this.peek().value)) {
      const op = this.consume().value;
      const right = this.parsePower();
      left = { type: "BinaryOp", operator: op, left, right };
    }
    return left;
  }

  private parsePower(): ASTNode {
    let left = this.parseUnary();
    if (this.peek().value === "^") {
      this.consume();
      const right = this.parsePower(); // Right-associative
      left = { type: "BinaryOp", operator: "^", left, right };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (["-", "!"].includes(this.peek().value)) {
      const op = this.consume().value;
      const arg = this.parseUnary();
      return { type: "UnaryOp", operator: op, argument: arg };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();

    if (token.type === "NUMBER") {
      this.consume();
      return { type: "NumberLiteral", value: parseFloat(token.value) };
    }

    if (token.type === "STRING") {
      this.consume();
      return { type: "StringLiteral", value: token.value };
    }

    if (token.type === "COLUMN") {
      this.consume();
      return { type: "ColumnRef", name: token.value };
    }

    if (token.type === "IDENTIFIER") {
      const name = token.value;
      const upper = name.toUpperCase();

      if (upper === "TRUE") {
        this.consume();
        return { type: "BooleanLiteral", value: true };
      }
      if (upper === "FALSE") {
        this.consume();
        return { type: "BooleanLiteral", value: false };
      }
      if (upper === "NULL") {
        this.consume();
        return { type: "NullLiteral" };
      }

      this.consume();

      // Check if it's a function call with parens
      if (this.peek().type === "LPAREN") {
        this.consume("LPAREN");
        const args: ASTNode[] = [];
        if (this.peek().type !== "RPAREN") {
          args.push(this.parseLogicalOr());
          while (this.peek().type === "COMMA") {
            this.consume("COMMA");
            args.push(this.parseLogicalOr());
          }
        }
        this.consume("RPAREN");
        return { type: "FunctionCall", name: upper, args };
      }

      // Standalone identifier treated as column reference
      return { type: "ColumnRef", name };
    }

    if (token.type === "LPAREN") {
      this.consume("LPAREN");
      const expr = this.parseLogicalOr();
      this.consume("RPAREN");
      return expr;
    }

    throw new Error(`Unexpected token '${token.value}' at position ${token.position}`);
  }
}

/**
 * High precision financial rounding to avoid floating point anomalies (0.1 + 0.2 === 0.30000000000000004)
 */
export function roundFinancial(val: number, decimals: number = 2): number {
  if (isNaN(val) || !isFinite(val)) return val;
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

/**
 * AST Evaluator executing securely on a data row
 */
export function evaluateAST(
  node: ASTNode,
  row: Record<string, any>
): { value: any; isMissingDependency?: boolean; missingColumn?: string } {
  switch (node.type) {
    case "NumberLiteral":
      return { value: node.value };
    case "StringLiteral":
      return { value: node.value };
    case "BooleanLiteral":
      return { value: node.value };
    case "NullLiteral":
      return { value: null };

    case "ColumnRef": {
      const rawVal = row[node.name];
      if (rawVal === undefined || rawVal === null || rawVal === "" || String(rawVal).trim().toUpperCase() === "NA") {
        return { value: null, isMissingDependency: true, missingColumn: node.name };
      }
      // If numeric string, convert to number
      if (typeof rawVal === "string" && !isNaN(Number(rawVal)) && rawVal.trim() !== "") {
        return { value: Number(rawVal) };
      }
      return { value: rawVal };
    }

    case "UnaryOp": {
      const argRes = evaluateAST(node.argument, row);
      if (argRes.isMissingDependency) return argRes;

      if (node.operator === "-") {
        if (typeof argRes.value !== "number") {
          throw new Error(`Unary minus expected number, received '${argRes.value}'`);
        }
        return { value: -argRes.value };
      }
      if (node.operator === "!") {
        return { value: !argRes.value };
      }
      throw new Error(`Unsupported unary operator: ${node.operator}`);
    }

    case "BinaryOp": {
      const leftRes = evaluateAST(node.left, row);
      const rightRes = evaluateAST(node.right, row);

      if (leftRes.isMissingDependency) return leftRes;
      if (rightRes.isMissingDependency) return rightRes;

      const l = leftRes.value;
      const r = rightRes.value;

      switch (node.operator) {
        case "+": {
          if (typeof l === "number" && typeof r === "number") {
            return { value: roundFinancial(l + r, 6) };
          }
          // String concatenation
          return { value: String(l) + String(r) };
        }
        case "-": {
          if (typeof l !== "number" || typeof r !== "number") {
            throw new Error(`Subtraction requires numbers, received '${l}' and '${r}'`);
          }
          return { value: roundFinancial(l - r, 6) };
        }
        case "*": {
          if (typeof l !== "number" || typeof r !== "number") {
            throw new Error(`Multiplication requires numbers, received '${l}' and '${r}'`);
          }
          return { value: roundFinancial(l * r, 6) };
        }
        case "/": {
          if (typeof l !== "number" || typeof r !== "number") {
            throw new Error(`Division requires numbers, received '${l}' and '${r}'`);
          }
          if (r === 0) {
            throw new Error("Division by zero");
          }
          return { value: roundFinancial(l / r, 6) };
        }
        case "%": {
          if (typeof l !== "number" || typeof r !== "number") {
            throw new Error(`Modulo requires numbers, received '${l}' and '${r}'`);
          }
          if (r === 0) {
            throw new Error("Modulo by zero");
          }
          return { value: l % r };
        }
        case "^": {
          if (typeof l !== "number" || typeof r !== "number") {
            throw new Error(`Power requires numbers, received '${l}' and '${r}'`);
          }
          return { value: Math.pow(l, r) };
        }
        case "==":
          return { value: l === r };
        case "!=":
          return { value: l !== r };
        case "<":
          return { value: l < r };
        case "<=":
          return { value: l <= r };
        case ">":
          return { value: l > r };
        case ">=":
          return { value: l >= r };
        case "&&":
          return { value: Boolean(l) && Boolean(r) };
        case "||":
          return { value: Boolean(l) || Boolean(r) };
        default:
          throw new Error(`Unsupported binary operator: ${node.operator}`);
      }
    }

    case "FunctionCall": {
      const fn = node.name.toUpperCase();

      // IF(condition, trueVal, falseVal)
      if (fn === "IF") {
        if (node.args.length !== 3) {
          throw new Error(`IF function expects 3 arguments, received ${node.args.length}`);
        }
        const condRes = evaluateAST(node.args[0], row);
        if (condRes.isMissingDependency) return condRes;
        if (Boolean(condRes.value)) {
          return evaluateAST(node.args[1], row);
        } else {
          return evaluateAST(node.args[2], row);
        }
      }

      // ISBLANK(val) / ISNULL(val)
      if (fn === "ISBLANK" || fn === "ISNULL") {
        if (node.args.length !== 1) {
          throw new Error(`${fn} expects 1 argument`);
        }
        const argRes = evaluateAST(node.args[0], row);
        return {
          value: argRes.value === null || argRes.value === undefined || argRes.value === "",
        };
      }

      // COALESCE(a, b, ...)
      if (fn === "COALESCE") {
        for (const argNode of node.args) {
          const res = evaluateAST(argNode, row);
          if (res.value !== null && res.value !== undefined && res.value !== "") {
            return res;
          }
        }
        return { value: null };
      }

      // Evaluate all arguments for standard functions
      const evaluatedArgs: any[] = [];
      for (const argNode of node.args) {
        const res = evaluateAST(argNode, row);
        if (res.isMissingDependency) return res;
        evaluatedArgs.push(res.value);
      }

      if (fn === "ABS") {
        const val = Number(evaluatedArgs[0]);
        if (isNaN(val)) throw new Error("ABS requires a numeric value");
        return { value: Math.abs(val) };
      }

      if (fn === "ROUND") {
        const val = Number(evaluatedArgs[0]);
        const dec = evaluatedArgs[1] !== undefined ? Number(evaluatedArgs[1]) : 0;
        if (isNaN(val) || isNaN(dec)) throw new Error("ROUND requires numbers");
        return { value: roundFinancial(val, dec) };
      }

      if (fn === "CEIL" || fn === "CEILING") {
        const val = Number(evaluatedArgs[0]);
        if (isNaN(val)) throw new Error("CEIL requires a number");
        return { value: Math.ceil(val) };
      }

      if (fn === "FLOOR") {
        const val = Number(evaluatedArgs[0]);
        if (isNaN(val)) throw new Error("FLOOR requires a number");
        return { value: Math.floor(val) };
      }

      if (fn === "MIN") {
        const nums = evaluatedArgs.map(Number).filter((n) => !isNaN(n));
        if (nums.length === 0) throw new Error("MIN requires numbers");
        return { value: Math.min(...nums) };
      }

      if (fn === "MAX") {
        const nums = evaluatedArgs.map(Number).filter((n) => !isNaN(n));
        if (nums.length === 0) throw new Error("MAX requires numbers");
        return { value: Math.max(...nums) };
      }

      if (fn === "LEN" || fn === "LENGTH") {
        return { value: String(evaluatedArgs[0] ?? "").length };
      }

      if (fn === "UPPER") {
        return { value: String(evaluatedArgs[0] ?? "").toUpperCase() };
      }

      if (fn === "LOWER") {
        return { value: String(evaluatedArgs[0] ?? "").toLowerCase() };
      }

      if (fn === "TRIM") {
        return { value: String(evaluatedArgs[0] ?? "").trim() };
      }

      throw new Error(`Unknown function: ${fn}`);
    }
  }
}

/**
 * Compiles a formula string into an AST with syntax validation
 */
export function compileFormula(expression: string): { ast: ASTNode | null; error: string | null } {
  if (!expression || !expression.trim()) {
    return { ast: null, error: "Formula expression is empty" };
  }
  try {
    const tokens = tokenize(expression);
    const parser = new FormulaParser(tokens);
    const ast = parser.parse();
    return { ast, error: null };
  } catch (err: any) {
    return { ast: null, error: err.message || "Invalid formula syntax" };
  }
}

/**
 * Evaluates a single rule on a single row
 */
export function evaluateRuleOnRow(
  rule: ManualRuleConfig,
  row: Record<string, any>,
  rowId: number,
  compiledAST?: ASTNode | null
): RuleEvaluationResult {
  const targetVal = row[rule.targetColumn];
  const isBlank =
    targetVal === null ||
    targetVal === undefined ||
    targetVal === "" ||
    String(targetVal).trim().toUpperCase() === "NA";

  // 1. TEMPLATE: REQUIRED VALUE
  if (rule.templateType === "required") {
    if (isBlank) {
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "validation",
        targetColumn: rule.targetColumn,
        actualValue: targetVal ?? "null",
        expectedValue: "Non-empty value",
        outcome: "fail",
        reason: `Cell in column '${rule.targetColumn}' is blank or empty`,
        timestamp: Date.now(),
      };
    }
    return {
      rowId,
      ruleId: rule.id,
      ruleName: rule.name,
      category: "validation",
      targetColumn: rule.targetColumn,
      actualValue: targetVal,
      expectedValue: "Non-empty value",
      outcome: "pass",
      reason: "Valid value present",
      timestamp: Date.now(),
    };
  }

  // 2. TEMPLATE: VALUE WITHIN A RANGE
  if (rule.templateType === "range") {
    if (isBlank) {
      if (rule.allowBlank) {
        return {
          rowId,
          ruleId: rule.id,
          ruleName: rule.name,
          category: "validation",
          targetColumn: rule.targetColumn,
          actualValue: "blank",
          expectedValue: `[${rule.minBound ?? "-∞"}, ${rule.maxBound ?? "+∞"}]`,
          outcome: "pass",
          reason: "Blank value permitted by rule configuration",
          timestamp: Date.now(),
        };
      }
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "validation",
        targetColumn: rule.targetColumn,
        actualValue: "blank",
        expectedValue: `[${rule.minBound ?? "-∞"}, ${rule.maxBound ?? "+∞"}]`,
        outcome: "cannot_validate",
        reason: `Target cell in column '${rule.targetColumn}' is missing or blank`,
        timestamp: Date.now(),
      };
    }

    const num = Number(targetVal);
    if (isNaN(num)) {
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "validation",
        targetColumn: rule.targetColumn,
        actualValue: targetVal,
        expectedValue: "Numeric value",
        outcome: "error",
        reason: `Value '${targetVal}' is not numeric`,
        timestamp: Date.now(),
      };
    }

    const min = rule.minBound ?? -Infinity;
    const max = rule.maxBound ?? Infinity;
    const inclusive = rule.inclusiveBounds !== false;

    const inRange = inclusive ? num >= min && num <= max : num > min && num < max;

    if (inRange) {
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "validation",
        targetColumn: rule.targetColumn,
        actualValue: num,
        expectedValue: `${inclusive ? "[" : "("}${min}, ${max}${inclusive ? "]" : ")"}`,
        outcome: "pass",
        reason: `Value ${num} is within boundary limits`,
        timestamp: Date.now(),
      };
    }

    return {
      rowId,
      ruleId: rule.id,
      ruleName: rule.name,
      category: "validation",
      targetColumn: rule.targetColumn,
      actualValue: num,
      expectedValue: `${inclusive ? "[" : "("}${min}, ${max}${inclusive ? "]" : ")"}`,
      outcome: "fail",
      reason: `Value ${num} exceeds range bounds [${min}, ${max}]`,
      timestamp: Date.now(),
    };
  }

  // 3. TEMPLATE: MATCH ANOTHER COLUMN
  if (rule.templateType === "match_column") {
    const secondaryCol = rule.secondaryColumn || "";
    const secondVal = row[secondaryCol];
    const isSecondBlank =
      secondVal === null ||
      secondVal === undefined ||
      secondVal === "" ||
      String(secondVal).trim().toUpperCase() === "NA";

    if (isBlank && isSecondBlank) {
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "validation",
        targetColumn: rule.targetColumn,
        actualValue: "blank",
        expectedValue: "blank",
        outcome: "cannot_validate",
        reason: "Both compared columns contain blank cells",
        timestamp: Date.now(),
      };
    }

    if (isBlank || isSecondBlank) {
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "validation",
        targetColumn: rule.targetColumn,
        actualValue: targetVal ?? "blank",
        expectedValue: secondVal ?? "blank",
        outcome: "fail",
        reason: `Mismatch: '${rule.targetColumn}' is ${isBlank ? "blank" : "populated"} while '${secondaryCol}' is ${isSecondBlank ? "blank" : "populated"}`,
        timestamp: Date.now(),
      };
    }

    // Compare values
    const match =
      typeof targetVal === "number" && typeof secondVal === "number"
        ? Math.abs(targetVal - secondVal) < 1e-6
        : String(targetVal).trim().toLowerCase() === String(secondVal).trim().toLowerCase();

    return {
      rowId,
      ruleId: rule.id,
      ruleName: rule.name,
      category: "validation",
      targetColumn: rule.targetColumn,
      actualValue: targetVal,
      expectedValue: secondVal,
      outcome: match ? "pass" : "fail",
      reason: match
        ? `Matched column '${secondaryCol}'`
        : `Value '${targetVal}' does not match '${secondVal}' in column '${secondaryCol}'`,
      timestamp: Date.now(),
    };
  }

  // 4. TEMPLATE: CALCULATE AN EXPECTED VALUE (Calculation Only)
  if (rule.templateType === "calculate") {
    if (!compiledAST) {
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "calculation",
        targetColumn: rule.targetColumn,
        actualValue: null,
        expectedValue: null,
        calculatedValue: null,
        outcome: "error",
        reason: "Formula expression missing or invalid syntax",
        timestamp: Date.now(),
      };
    }

    try {
      const evalRes = evaluateAST(compiledAST, row);
      if (evalRes.isMissingDependency) {
        return {
          rowId,
          ruleId: rule.id,
          ruleName: rule.name,
          category: "calculation",
          targetColumn: rule.targetColumn,
          actualValue: null,
          expectedValue: null,
          calculatedValue: null,
          outcome: "cannot_validate",
          reason: `Missing input cell in column '${evalRes.missingColumn}'`,
          timestamp: Date.now(),
        };
      }

      const calculated =
        typeof evalRes.value === "number"
          ? roundFinancial(evalRes.value, rule.roundingDecimals ?? 2)
          : evalRes.value;

      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "calculation",
        targetColumn: rule.targetColumn,
        actualValue: calculated,
        expectedValue: calculated,
        calculatedValue: calculated,
        outcome: "pass",
        reason: `Calculated successfully: ${calculated}`,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "calculation",
        targetColumn: rule.targetColumn,
        actualValue: null,
        expectedValue: null,
        calculatedValue: null,
        outcome: "error",
        reason: err.message || "Calculation error",
        timestamp: Date.now(),
      };
    }
  }

  // 5. TEMPLATE: COMPARE CALCULATED VALUE WITH EXISTING COLUMN (Validation)
  if (rule.templateType === "compare_calculated") {
    if (!compiledAST) {
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "validation",
        targetColumn: rule.targetColumn,
        actualValue: targetVal,
        expectedValue: null,
        outcome: "error",
        reason: "Formula expression missing or invalid syntax",
        timestamp: Date.now(),
      };
    }

    if (isBlank) {
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "validation",
        targetColumn: rule.targetColumn,
        actualValue: "blank",
        expectedValue: "Calculated value",
        outcome: "cannot_validate",
        reason: `Recorded cell in column '${rule.targetColumn}' is blank`,
        timestamp: Date.now(),
      };
    }

    try {
      const evalRes = evaluateAST(compiledAST, row);
      if (evalRes.isMissingDependency) {
        return {
          rowId,
          ruleId: rule.id,
          ruleName: rule.name,
          category: "validation",
          targetColumn: rule.targetColumn,
          actualValue: targetVal,
          expectedValue: null,
          outcome: "cannot_validate",
          reason: `Missing input cell in column '${evalRes.missingColumn}' for expected formula`,
          timestamp: Date.now(),
        };
      }

      const expected = evalRes.value;
      const actualNum = Number(targetVal);
      const expectedNum = Number(expected);
      const tolerance = rule.numericTolerance ?? 0.01;

      if (!isNaN(actualNum) && !isNaN(expectedNum)) {
        const diff = Math.abs(actualNum - expectedNum);
        const match = diff <= tolerance;

        return {
          rowId,
          ruleId: rule.id,
          ruleName: rule.name,
          category: "validation",
          targetColumn: rule.targetColumn,
          actualValue: actualNum,
          expectedValue: roundFinancial(expectedNum, rule.roundingDecimals ?? 2),
          calculatedValue: expectedNum,
          outcome: match ? "pass" : "fail",
          reason: match
            ? `Recorded value ${actualNum} matches calculated formula (variance ${diff.toFixed(4)} <= ${tolerance})`
            : `Recorded value ${actualNum} deviates from calculated ${expectedNum.toFixed(2)} (variance: ${diff.toFixed(2)} > ${tolerance})`,
          timestamp: Date.now(),
        };
      }

      // Non-numeric match
      const strMatch = String(targetVal).trim() === String(expected).trim();
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "validation",
        targetColumn: rule.targetColumn,
        actualValue: targetVal,
        expectedValue: expected,
        calculatedValue: expected,
        outcome: strMatch ? "pass" : "fail",
        reason: strMatch ? "Values match" : `Recorded '${targetVal}' does not match expected '${expected}'`,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "validation",
        targetColumn: rule.targetColumn,
        actualValue: targetVal,
        expectedValue: null,
        outcome: "error",
        reason: err.message || "Formula execution error",
        timestamp: Date.now(),
      };
    }
  }

  // 6. TEMPLATE: ADVANCED CUSTOM FORMULA (Evaluates boolean expression)
  if (rule.templateType === "custom_formula") {
    if (!compiledAST) {
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "validation",
        targetColumn: rule.targetColumn || "Condition",
        actualValue: null,
        expectedValue: true,
        outcome: "error",
        reason: "Custom formula missing or syntax error",
        timestamp: Date.now(),
      };
    }

    try {
      const evalRes = evaluateAST(compiledAST, row);
      if (evalRes.isMissingDependency) {
        return {
          rowId,
          ruleId: rule.id,
          ruleName: rule.name,
          category: "validation",
          targetColumn: rule.targetColumn || "Condition",
          actualValue: null,
          expectedValue: true,
          outcome: "cannot_validate",
          reason: `Missing cell in dependent column '${evalRes.missingColumn}'`,
          timestamp: Date.now(),
        };
      }

      const passed = Boolean(evalRes.value);
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "validation",
        targetColumn: rule.targetColumn || "Condition",
        actualValue: evalRes.value,
        expectedValue: true,
        outcome: passed ? "pass" : "fail",
        reason: passed ? "Custom condition satisfied" : "Custom expression evaluated to false",
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        rowId,
        ruleId: rule.id,
        ruleName: rule.name,
        category: "validation",
        targetColumn: rule.targetColumn || "Condition",
        actualValue: null,
        expectedValue: true,
        outcome: "error",
        reason: err.message || "Expression error",
        timestamp: Date.now(),
      };
    }
  }

  // Fallback
  return {
    rowId,
    ruleId: rule.id,
    ruleName: rule.name,
    category: "validation",
    targetColumn: rule.targetColumn,
    actualValue: targetVal,
    expectedValue: null,
    outcome: "cannot_validate",
    reason: "Unknown rule type",
    timestamp: Date.now(),
  };
}

/**
 * Asynchronously executes an entire validation suite in non-blocking batches.
 * Includes progress reporting and AbortSignal cancellation.
 */
export async function executeValidationSuite(
  sheet: SheetData,
  datasetId: string,
  rules: ManualRuleConfig[],
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<{ results: RuleEvaluationResult[]; summary: ValidationSuiteSummary }> {
  const startTime = Date.now();
  const enabledRules = rules.filter((r) => r.enabled);
  const rows = sheet.rows || [];
  const totalRows = rows.length;

  // Pre-compile ASTs for performance
  const compiledMap = new Map<string, ASTNode | null>();
  for (const rule of enabledRules) {
    if (rule.formulaExpression) {
      const { ast } = compileFormula(rule.formulaExpression);
      compiledMap.set(rule.id, ast);
    }
  }

  const results: RuleEvaluationResult[] = [];
  let passedCount = 0;
  let failedCount = 0;
  let cannotValidateCount = 0;
  let errorCount = 0;

  const CHUNK_SIZE = 150;
  const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);

  for (let c = 0; c < totalChunks; c++) {
    // Check cancellation
    if (abortSignal?.aborted) {
      throw new Error("Validation cancelled by user");
    }

    const startIdx = c * CHUNK_SIZE;
    const endIdx = Math.min(startIdx + CHUNK_SIZE, totalRows);

    for (let r = startIdx; r < endIdx; r++) {
      const row = rows[r];
      const rowId = r + 1; // 1-indexed

      for (const rule of enabledRules) {
        const ast = compiledMap.get(rule.id) ?? null;
        const res = evaluateRuleOnRow(rule, row, rowId, ast);
        results.push(res);

        if (res.outcome === "pass") passedCount++;
        else if (res.outcome === "fail") failedCount++;
        else if (res.outcome === "cannot_validate") cannotValidateCount++;
        else if (res.outcome === "error") errorCount++;
      }
    }

    // Report progress
    const progressPercent = Math.min(100, Math.round(((c + 1) / totalChunks) * 100));
    onProgress?.(progressPercent);

    // Yield to browser event loop
    if (c < totalChunks - 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const durationMs = Date.now() - startTime;
  const summary: ValidationSuiteSummary = {
    datasetId,
    sheetName: sheet.name,
    totalRows,
    totalEvaluations: results.length,
    passedCount,
    failedCount,
    cannotValidateCount,
    errorCount,
    executionDurationMs: durationMs,
    executedAt: new Date().toISOString(),
    isStale: false,
  };

  return { results, summary };
}
