// src/compiler/errors.ts
var CompilerError = class extends Error {
  span;
  severity;
  constructor(message, span, severity = "error" /* Error */) {
    super(message);
    this.name = "CompilerError";
    this.span = span;
    this.severity = severity;
  }
};

// src/compiler/compiler.ts
var LAZY_METHODS = /* @__PURE__ */ new Set(["filter", "map", "find", "some", "every", "flatMap"]);
var Compiler = class _Compiler {
  instructions = [];
  compile(expression) {
    this.compileExpression(expression);
    return this.instructions;
  }
  compileExpression(expression) {
    switch (expression.type) {
      case "Literal":
        this.compileLiteral(expression);
        return;
      case "Identifier":
        this.compileIdentifier(expression);
        return;
      case "List":
        this.compileList(expression);
        return;
      case "Unary":
        this.compileUnary(expression);
        return;
      case "Binary":
        this.compileBinary(expression);
        return;
      case "Member":
        this.compileMember(expression);
        return;
      case "Index":
        this.compileIndex(expression);
        return;
      case "Call":
        this.compileCall(expression);
        return;
    }
  }
  compileLiteral(expression) {
    this.emit({ type: "Const", value: expression.value });
  }
  compileIdentifier(expression) {
    this.emit({ type: "Ident", name: expression.name });
  }
  compileList(expression) {
    for (const element of expression.elements) {
      this.compileExpression(element);
    }
    this.emit({ type: "List", count: expression.elements.length });
  }
  compileUnary(expression) {
    this.compileExpression(expression.argument);
    this.emit({ type: "Unary", operator: expression.operator });
  }
  compileBinary(expression) {
    if (expression.operator === "&&" || expression.operator === "||") {
      this.compileLogical(expression);
      return;
    }
    this.compileExpression(expression.left);
    this.compileExpression(expression.right);
    this.emit({ type: "Binary", operator: expression.operator });
  }
  compileLogical(expression) {
    const operator = expression.operator;
    this.compileExpression(expression.left);
    this.emit({ type: "ToBool" });
    if (operator === "&&") {
      const jumpFalse = this.emit({ type: "JumpIfFalse", offset: 0 });
      this.compileExpression(expression.right);
      this.emit({ type: "ToBool" });
      const jumpEnd2 = this.emit({ type: "Jump", offset: 0 });
      const falseIndex = this.instructions.length;
      this.emit({ type: "Const", value: false });
      const endIndex2 = this.instructions.length;
      this.patchJump(jumpFalse, falseIndex);
      this.patchJump(jumpEnd2, endIndex2);
      return;
    }
    const jumpTrue = this.emit({ type: "JumpIfTrue", offset: 0 });
    this.compileExpression(expression.right);
    this.emit({ type: "ToBool" });
    const jumpEnd = this.emit({ type: "Jump", offset: 0 });
    const trueIndex = this.instructions.length;
    this.emit({ type: "Const", value: true });
    const endIndex = this.instructions.length;
    this.patchJump(jumpTrue, trueIndex);
    this.patchJump(jumpEnd, endIndex);
  }
  compileMember(expression) {
    if (expression.object.type === "Identifier" && expression.object.name === "formula" && expression.property) {
      this.emit({ type: "LoadFormula", name: expression.property });
      return;
    }
    this.compileExpression(expression.object);
    this.emit({ type: "Member", name: expression.property });
  }
  compileIndex(expression) {
    this.compileExpression(expression.object);
    this.compileExpression(expression.index);
    this.emit({ type: "Index" });
  }
  compileCall(expression) {
    if (expression.callee.type === "Identifier" && expression.callee.name === "if") {
      this.compileIfExpression(expression.args);
      return;
    }
    if (expression.callee.type === "Identifier") {
      for (const arg of expression.args) {
        this.compileExpression(arg);
      }
      this.emit({
        type: "CallGlobal",
        name: expression.callee.name,
        argc: expression.args.length
      });
      return;
    }
    if (expression.callee.type === "Member") {
      if (LAZY_METHODS.has(expression.callee.property)) {
        this.compileExpression(expression.callee.object);
        const argPrograms = [];
        for (const arg of expression.args) {
          const subCompiler = new _Compiler();
          argPrograms.push(subCompiler.compile(arg));
        }
        this.emit({
          type: "CallMethodLazy",
          name: expression.callee.property,
          argPrograms
        });
        return;
      }
      this.compileExpression(expression.callee.object);
      for (const arg of expression.args) {
        this.compileExpression(arg);
      }
      this.emit({
        type: "CallMethod",
        name: expression.callee.property,
        argc: expression.args.length
      });
      return;
    }
    throw new CompilerError("Unsupported call target", expression.span);
  }
  compileIfExpression(args) {
    const condition = args[0];
    const whenTrue = args[1];
    const whenFalse = args[2];
    if (!condition) {
      this.emit({ type: "Const", value: void 0 });
      return;
    }
    this.compileExpression(condition);
    this.emit({ type: "ToBool" });
    const jumpFalse = this.emit({ type: "JumpIfFalse", offset: 0 });
    if (whenTrue) {
      this.compileExpression(whenTrue);
    } else {
      this.emit({ type: "Const", value: void 0 });
    }
    const jumpEnd = this.emit({ type: "Jump", offset: 0 });
    const falseIndex = this.instructions.length;
    if (whenFalse) {
      this.compileExpression(whenFalse);
    } else {
      this.emit({ type: "Const", value: void 0 });
    }
    const endIndex = this.instructions.length;
    this.patchJump(jumpFalse, falseIndex);
    this.patchJump(jumpEnd, endIndex);
  }
  emit(instruction) {
    this.instructions.push(instruction);
    return this.instructions.length - 1;
  }
  patchJump(index, target) {
    const instruction = this.instructions[index];
    if (!instruction) {
      throw new CompilerError("Invalid jump patch", { start: 0, end: 0 });
    }
    if (instruction.type === "Jump") {
      this.instructions[index] = { ...instruction, offset: target - index };
      return;
    }
    if (instruction.type === "JumpIfFalse") {
      this.instructions[index] = { ...instruction, offset: target - index };
      return;
    }
    if (instruction.type === "JumpIfTrue") {
      this.instructions[index] = { ...instruction, offset: target - index };
      return;
    }
    throw new CompilerError("Cannot patch non-jump instruction", { start: 0, end: 0 });
  }
};
function compileAst(expression) {
  const compiler = new Compiler();
  const instructions = compiler.compile(expression);
  return { ast: expression, instructions };
}

// src/compiler/lexer.ts
var KEYWORDS = /* @__PURE__ */ new Map([
  ["true", "True" /* True */],
  ["false", "False" /* False */],
  ["null", "Null" /* Null */],
  ["and", "And" /* And */],
  ["or", "Or" /* Or */],
  ["not", "Not" /* Not */]
]);
function isWhitespace(ch) {
  return ch === " " || ch === "	" || ch === "\n" || ch === "\r";
}
function isDigit(ch) {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return code >= 48 && code <= 57;
}
function isAlpha(ch) {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return code >= 65 && code <= 90 || code >= 97 && code <= 122;
}
function isIdentifierStart(ch) {
  return isAlpha(ch) || ch === "_" || ch === "$";
}
function isIdentifierPart(ch) {
  return isIdentifierStart(ch) || isDigit(ch);
}
var Lexer = class {
  input;
  index = 0;
  constructor(input) {
    this.input = input;
  }
  tokenize() {
    const tokens = [];
    while (!this.isAtEnd()) {
      const ch = this.peek();
      if (isWhitespace(ch)) {
        this.advance();
        continue;
      }
      if (isDigit(ch)) {
        tokens.push(this.readNumber());
        continue;
      }
      if (isIdentifierStart(ch)) {
        tokens.push(this.readIdentifier());
        continue;
      }
      if (ch === '"' || ch === "'") {
        tokens.push(this.readString());
        continue;
      }
      tokens.push(this.readSymbol());
    }
    tokens.push({
      type: "EOF" /* EOF */,
      value: "",
      span: { start: this.index, end: this.index }
    });
    return tokens;
  }
  readNumber() {
    const start = this.index;
    while (isDigit(this.peek())) {
      this.advance();
    }
    if (this.peek() === "." && isDigit(this.peekNext())) {
      this.advance();
      while (isDigit(this.peek())) {
        this.advance();
      }
    }
    const value = this.input.slice(start, this.index);
    return this.makeToken("Number" /* Number */, value, start, this.index);
  }
  readIdentifier() {
    const start = this.index;
    while (isIdentifierPart(this.peek())) {
      this.advance();
    }
    const value = this.input.slice(start, this.index);
    const keyword = KEYWORDS.get(value);
    if (keyword) {
      return this.makeToken(keyword, value, start, this.index);
    }
    return this.makeToken("Identifier" /* Identifier */, value, start, this.index);
  }
  readString() {
    const start = this.index;
    const quote = this.advance();
    let value = "";
    while (!this.isAtEnd()) {
      const ch = this.advance();
      if (ch === quote) {
        return this.makeToken("String" /* String */, value, start, this.index);
      }
      if (ch === "\\") {
        if (this.isAtEnd()) break;
        const escaped = this.advance();
        value += this.decodeEscape(escaped);
        continue;
      }
      value += ch;
    }
    throw new CompilerError("Unterminated string literal", { start, end: this.index });
  }
  readSymbol() {
    const start = this.index;
    const ch = this.advance();
    if (ch === "+") return this.makeToken("Plus" /* Plus */, ch, start, this.index);
    if (ch === "-") return this.makeToken("Minus" /* Minus */, ch, start, this.index);
    if (ch === "*") return this.makeToken("Star" /* Star */, ch, start, this.index);
    if (ch === "/") return this.makeToken("Slash" /* Slash */, ch, start, this.index);
    if (ch === "%") return this.makeToken("Percent" /* Percent */, ch, start, this.index);
    if (ch === "(") return this.makeToken("LeftParen" /* LeftParen */, ch, start, this.index);
    if (ch === ")") return this.makeToken("RightParen" /* RightParen */, ch, start, this.index);
    if (ch === "[") return this.makeToken("LeftBracket" /* LeftBracket */, ch, start, this.index);
    if (ch === "]") return this.makeToken("RightBracket" /* RightBracket */, ch, start, this.index);
    if (ch === ",") return this.makeToken("Comma" /* Comma */, ch, start, this.index);
    if (ch === ".") return this.makeToken("Dot" /* Dot */, ch, start, this.index);
    if (ch === "!") {
      if (this.match("=")) {
        return this.makeToken("BangEquals" /* BangEquals */, "!=", start, this.index);
      }
      return this.makeToken("Bang" /* Bang */, ch, start, this.index);
    }
    if (ch === "=") {
      if (this.match("=")) {
        return this.makeToken("EqualsEquals" /* EqualsEquals */, "==", start, this.index);
      }
      throw new CompilerError("Unexpected '='", { start, end: this.index });
    }
    if (ch === ">") {
      if (this.match("=")) {
        return this.makeToken("GreaterEqual" /* GreaterEqual */, ">=", start, this.index);
      }
      return this.makeToken("Greater" /* Greater */, ch, start, this.index);
    }
    if (ch === "<") {
      if (this.match("=")) {
        return this.makeToken("LessEqual" /* LessEqual */, "<=", start, this.index);
      }
      return this.makeToken("Less" /* Less */, ch, start, this.index);
    }
    if (ch === "&") {
      if (this.match("&")) {
        return this.makeToken("AndAnd" /* AndAnd */, "&&", start, this.index);
      }
      throw new CompilerError("Unexpected '&'", { start, end: this.index });
    }
    if (ch === "|") {
      if (this.match("|")) {
        return this.makeToken("OrOr" /* OrOr */, "||", start, this.index);
      }
      throw new CompilerError("Unexpected '|'", { start, end: this.index });
    }
    throw new CompilerError(`Unexpected character '${ch}'`, { start, end: this.index });
  }
  decodeEscape(ch) {
    if (ch === "n") return "\n";
    if (ch === "r") return "\r";
    if (ch === "t") return "	";
    if (ch === "\\") return "\\";
    if (ch === '"') return '"';
    if (ch === "'") return "'";
    return ch;
  }
  makeToken(type, value, start, end) {
    const span = { start, end };
    return { type, value, span };
  }
  match(expected) {
    if (this.peek() !== expected) return false;
    this.advance();
    return true;
  }
  peek() {
    return this.input[this.index] ?? "";
  }
  peekNext() {
    return this.input[this.index + 1] ?? "";
  }
  advance() {
    const ch = this.input[this.index] ?? "";
    this.index += 1;
    return ch;
  }
  isAtEnd() {
    return this.index >= this.input.length;
  }
};
function lex(input) {
  const lexer = new Lexer(input);
  return lexer.tokenize();
}

// src/compiler/parser.ts
var Parser = class {
  tokens;
  index = 0;
  constructor(tokens) {
    this.tokens = tokens;
  }
  parseExpression(precedence = 0 /* Lowest */) {
    let left = this.parsePrefix();
    while (!this.isAtEnd() && precedence < this.getPrecedence(this.peek())) {
      left = this.parseInfix(left);
    }
    return left;
  }
  parsePrefix() {
    const token = this.advance();
    switch (token.type) {
      case "Number" /* Number */: {
        const value = Number(token.value);
        if (Number.isNaN(value)) {
          throw new CompilerError("Invalid number literal", token.span);
        }
        return { type: "Literal", value, span: token.span };
      }
      case "String" /* String */:
        return { type: "Literal", value: token.value, span: token.span };
      case "True" /* True */:
        return { type: "Literal", value: true, span: token.span };
      case "False" /* False */:
        return { type: "Literal", value: false, span: token.span };
      case "Null" /* Null */:
        return { type: "Literal", value: null, span: token.span };
      case "Identifier" /* Identifier */:
        return { type: "Identifier", name: token.value, span: token.span };
      case "Bang" /* Bang */:
      case "Not" /* Not */:
      case "Minus" /* Minus */: {
        const operator = this.toUnaryOperator(token);
        const argument = this.parseExpression(7 /* Unary */);
        const span = this.mergeSpan(token.span, argument.span);
        return { type: "Unary", operator, argument, span };
      }
      case "LeftParen" /* LeftParen */: {
        const expression = this.parseExpression();
        this.expect("RightParen" /* RightParen */, "Expected ')' after expression");
        return expression;
      }
      case "LeftBracket" /* LeftBracket */:
        return this.parseList(token.span);
      default:
        throw new CompilerError("Unexpected token", token.span);
    }
  }
  parseInfix(left) {
    const token = this.peek();
    if (token.type === "LeftParen" /* LeftParen */) {
      this.advance();
      return this.parseCall(left);
    }
    if (token.type === "Dot" /* Dot */) {
      this.advance();
      return this.parseMember(left);
    }
    if (token.type === "LeftBracket" /* LeftBracket */) {
      this.advance();
      return this.parseIndex(left);
    }
    const operator = this.toBinaryOperator(token);
    const precedence = this.getPrecedence(token);
    this.advance();
    const right = this.parseExpression(precedence);
    const span = this.mergeSpan(left.span, right.span);
    return { type: "Binary", operator, left, right, span };
  }
  parseCall(callee) {
    const args = [];
    if (!this.check("RightParen" /* RightParen */)) {
      do {
        args.push(this.parseExpression());
      } while (this.match("Comma" /* Comma */));
    }
    const endToken = this.expect("RightParen" /* RightParen */, "Expected ')' after arguments");
    const span = this.mergeSpan(callee.span, endToken.span);
    return { type: "Call", callee, args, span };
  }
  parseMember(object) {
    const propertyToken = this.expect("Identifier" /* Identifier */, "Expected property name after '.'");
    const span = this.mergeSpan(object.span, propertyToken.span);
    return { type: "Member", object, property: propertyToken.value, span };
  }
  parseIndex(object) {
    const index = this.parseExpression();
    const endToken = this.expect("RightBracket" /* RightBracket */, "Expected ']' after index");
    const span = this.mergeSpan(object.span, endToken.span);
    return { type: "Index", object, index, span };
  }
  parseList(startSpan) {
    const elements = [];
    if (!this.check("RightBracket" /* RightBracket */)) {
      do {
        elements.push(this.parseExpression());
      } while (this.match("Comma" /* Comma */));
    }
    const endToken = this.expect("RightBracket" /* RightBracket */, "Expected ']' after list");
    const span = this.mergeSpan(startSpan, endToken.span);
    return { type: "List", elements, span };
  }
  toUnaryOperator(token) {
    if (token.type === "Bang" /* Bang */ || token.type === "Not" /* Not */) return "!";
    if (token.type === "Minus" /* Minus */) return "-";
    throw new CompilerError("Unsupported unary operator", token.span);
  }
  toBinaryOperator(token) {
    switch (token.type) {
      case "Plus" /* Plus */:
        return "+";
      case "Minus" /* Minus */:
        return "-";
      case "Star" /* Star */:
        return "*";
      case "Slash" /* Slash */:
        return "/";
      case "Percent" /* Percent */:
        return "%";
      case "EqualsEquals" /* EqualsEquals */:
        return "==";
      case "BangEquals" /* BangEquals */:
        return "!=";
      case "Greater" /* Greater */:
        return ">";
      case "GreaterEqual" /* GreaterEqual */:
        return ">=";
      case "Less" /* Less */:
        return "<";
      case "LessEqual" /* LessEqual */:
        return "<=";
      case "AndAnd" /* AndAnd */:
      case "And" /* And */:
        return "&&";
      case "OrOr" /* OrOr */:
      case "Or" /* Or */:
        return "||";
      default:
        throw new CompilerError("Unsupported binary operator", token.span);
    }
  }
  getPrecedence(token) {
    switch (token.type) {
      case "OrOr" /* OrOr */:
      case "Or" /* Or */:
        return 1 /* Or */;
      case "AndAnd" /* AndAnd */:
      case "And" /* And */:
        return 2 /* And */;
      case "EqualsEquals" /* EqualsEquals */:
      case "BangEquals" /* BangEquals */:
        return 3 /* Equality */;
      case "Greater" /* Greater */:
      case "GreaterEqual" /* GreaterEqual */:
      case "Less" /* Less */:
      case "LessEqual" /* LessEqual */:
        return 4 /* Comparison */;
      case "Plus" /* Plus */:
      case "Minus" /* Minus */:
        return 5 /* Term */;
      case "Star" /* Star */:
      case "Slash" /* Slash */:
      case "Percent" /* Percent */:
        return 6 /* Factor */;
      case "LeftParen" /* LeftParen */:
      case "LeftBracket" /* LeftBracket */:
      case "Dot" /* Dot */:
        return 8 /* Call */;
      default:
        return 0 /* Lowest */;
    }
  }
  mergeSpan(start, end) {
    return { start: start.start, end: end.end };
  }
  check(type) {
    return this.peek().type === type;
  }
  match(type) {
    if (!this.check(type)) return false;
    this.advance();
    return true;
  }
  expect(type, message) {
    const token = this.peek();
    if (token.type === type) {
      return this.advance();
    }
    throw new CompilerError(message, token.span);
  }
  advance() {
    const token = this.peek();
    this.index += 1;
    return token;
  }
  peek() {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1] ?? {
      type: "EOF" /* EOF */,
      value: "",
      span: { start: 0, end: 0 }
    };
  }
  isAtEnd() {
    return this.peek().type === "EOF" /* EOF */;
  }
  finish() {
    this.expect("EOF" /* EOF */, "Unexpected token after expression");
  }
};
function parse(tokens) {
  const parser = new Parser(tokens);
  const expression = parser.parseExpression();
  parser.finish();
  return expression;
}

// ../../node_modules/github-slugger/regex.js
var regex = /[\0-\x1F!-,\.\/:-@\[-\^`\{-\xA9\xAB-\xB4\xB6-\xB9\xBB-\xBF\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0378\u0379\u037E\u0380-\u0385\u0387\u038B\u038D\u03A2\u03F6\u0482\u0530\u0557\u0558\u055A-\u055F\u0589-\u0590\u05BE\u05C0\u05C3\u05C6\u05C8-\u05CF\u05EB-\u05EE\u05F3-\u060F\u061B-\u061F\u066A-\u066D\u06D4\u06DD\u06DE\u06E9\u06FD\u06FE\u0700-\u070F\u074B\u074C\u07B2-\u07BF\u07F6-\u07F9\u07FB\u07FC\u07FE\u07FF\u082E-\u083F\u085C-\u085F\u086B-\u089F\u08B5\u08C8-\u08D2\u08E2\u0964\u0965\u0970\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA\u09BB\u09C5\u09C6\u09C9\u09CA\u09CF-\u09D6\u09D8-\u09DB\u09DE\u09E4\u09E5\u09F2-\u09FB\u09FD\u09FF\u0A00\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A\u0A3B\u0A3D\u0A43-\u0A46\u0A49\u0A4A\u0A4E-\u0A50\u0A52-\u0A58\u0A5D\u0A5F-\u0A65\u0A76-\u0A80\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA\u0ABB\u0AC6\u0ACA\u0ACE\u0ACF\u0AD1-\u0ADF\u0AE4\u0AE5\u0AF0-\u0AF8\u0B00\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A\u0B3B\u0B45\u0B46\u0B49\u0B4A\u0B4E-\u0B54\u0B58-\u0B5B\u0B5E\u0B64\u0B65\u0B70\u0B72-\u0B81\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BBD\u0BC3-\u0BC5\u0BC9\u0BCE\u0BCF\u0BD1-\u0BD6\u0BD8-\u0BE5\u0BF0-\u0BFF\u0C0D\u0C11\u0C29\u0C3A-\u0C3C\u0C45\u0C49\u0C4E-\u0C54\u0C57\u0C5B-\u0C5F\u0C64\u0C65\u0C70-\u0C7F\u0C84\u0C8D\u0C91\u0CA9\u0CB4\u0CBA\u0CBB\u0CC5\u0CC9\u0CCE-\u0CD4\u0CD7-\u0CDD\u0CDF\u0CE4\u0CE5\u0CF0\u0CF3-\u0CFF\u0D0D\u0D11\u0D45\u0D49\u0D4F-\u0D53\u0D58-\u0D5E\u0D64\u0D65\u0D70-\u0D79\u0D80\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DC9\u0DCB-\u0DCE\u0DD5\u0DD7\u0DE0-\u0DE5\u0DF0\u0DF1\u0DF4-\u0E00\u0E3B-\u0E3F\u0E4F\u0E5A-\u0E80\u0E83\u0E85\u0E8B\u0EA4\u0EA6\u0EBE\u0EBF\u0EC5\u0EC7\u0ECE\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F01-\u0F17\u0F1A-\u0F1F\u0F2A-\u0F34\u0F36\u0F38\u0F3A-\u0F3D\u0F48\u0F6D-\u0F70\u0F85\u0F98\u0FBD-\u0FC5\u0FC7-\u0FFF\u104A-\u104F\u109E\u109F\u10C6\u10C8-\u10CC\u10CE\u10CF\u10FB\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B\u135C\u1360-\u137F\u1390-\u139F\u13F6\u13F7\u13FE-\u1400\u166D\u166E\u1680\u169B-\u169F\u16EB-\u16ED\u16F9-\u16FF\u170D\u1715-\u171F\u1735-\u173F\u1754-\u175F\u176D\u1771\u1774-\u177F\u17D4-\u17D6\u17D8-\u17DB\u17DE\u17DF\u17EA-\u180A\u180E\u180F\u181A-\u181F\u1879-\u187F\u18AB-\u18AF\u18F6-\u18FF\u191F\u192C-\u192F\u193C-\u1945\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DA-\u19FF\u1A1C-\u1A1F\u1A5F\u1A7D\u1A7E\u1A8A-\u1A8F\u1A9A-\u1AA6\u1AA8-\u1AAF\u1AC1-\u1AFF\u1B4C-\u1B4F\u1B5A-\u1B6A\u1B74-\u1B7F\u1BF4-\u1BFF\u1C38-\u1C3F\u1C4A-\u1C4C\u1C7E\u1C7F\u1C89-\u1C8F\u1CBB\u1CBC\u1CC0-\u1CCF\u1CD3\u1CFB-\u1CFF\u1DFA\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FBD\u1FBF-\u1FC1\u1FC5\u1FCD-\u1FCF\u1FD4\u1FD5\u1FDC-\u1FDF\u1FED-\u1FF1\u1FF5\u1FFD-\u203E\u2041-\u2053\u2055-\u2070\u2072-\u207E\u2080-\u208F\u209D-\u20CF\u20F1-\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F-\u215F\u2189-\u24B5\u24EA-\u2BFF\u2C2F\u2C5F\u2CE5-\u2CEA\u2CF4-\u2CFF\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D70-\u2D7E\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF\u2E00-\u2E2E\u2E30-\u3004\u3008-\u3020\u3030\u3036\u3037\u303D-\u3040\u3097\u3098\u309B\u309C\u30A0\u30FB\u3100-\u3104\u3130\u318F-\u319F\u31C0-\u31EF\u3200-\u33FF\u4DC0-\u4DFF\u9FFD-\u9FFF\uA48D-\uA4CF\uA4FE\uA4FF\uA60D-\uA60F\uA62C-\uA63F\uA673\uA67E\uA6F2-\uA716\uA720\uA721\uA789\uA78A\uA7C0\uA7C1\uA7CB-\uA7F4\uA828-\uA82B\uA82D-\uA83F\uA874-\uA87F\uA8C6-\uA8CF\uA8DA-\uA8DF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA954-\uA95F\uA97D-\uA97F\uA9C1-\uA9CE\uA9DA-\uA9DF\uA9FF\uAA37-\uAA3F\uAA4E\uAA4F\uAA5A-\uAA5F\uAA77-\uAA79\uAAC3-\uAADA\uAADE\uAADF\uAAF0\uAAF1\uAAF7-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F\uAB5B\uAB6A-\uAB6F\uABEB\uABEE\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uD7FF\uE000-\uF8FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB29\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBB2-\uFBD2\uFD3E-\uFD4F\uFD90\uFD91\uFDC8-\uFDEF\uFDFC-\uFDFF\uFE10-\uFE1F\uFE30-\uFE32\uFE35-\uFE4C\uFE50-\uFE6F\uFE75\uFEFD-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF3E\uFF40\uFF5B-\uFF65\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFFF]|\uD800[\uDC0C\uDC27\uDC3B\uDC3E\uDC4E\uDC4F\uDC5E-\uDC7F\uDCFB-\uDD3F\uDD75-\uDDFC\uDDFE-\uDE7F\uDE9D-\uDE9F\uDED1-\uDEDF\uDEE1-\uDEFF\uDF20-\uDF2C\uDF4B-\uDF4F\uDF7B-\uDF7F\uDF9E\uDF9F\uDFC4-\uDFC7\uDFD0\uDFD6-\uDFFF]|\uD801[\uDC9E\uDC9F\uDCAA-\uDCAF\uDCD4-\uDCD7\uDCFC-\uDCFF\uDD28-\uDD2F\uDD64-\uDDFF\uDF37-\uDF3F\uDF56-\uDF5F\uDF68-\uDFFF]|\uD802[\uDC06\uDC07\uDC09\uDC36\uDC39-\uDC3B\uDC3D\uDC3E\uDC56-\uDC5F\uDC77-\uDC7F\uDC9F-\uDCDF\uDCF3\uDCF6-\uDCFF\uDD16-\uDD1F\uDD3A-\uDD7F\uDDB8-\uDDBD\uDDC0-\uDDFF\uDE04\uDE07-\uDE0B\uDE14\uDE18\uDE36\uDE37\uDE3B-\uDE3E\uDE40-\uDE5F\uDE7D-\uDE7F\uDE9D-\uDEBF\uDEC8\uDEE7-\uDEFF\uDF36-\uDF3F\uDF56-\uDF5F\uDF73-\uDF7F\uDF92-\uDFFF]|\uD803[\uDC49-\uDC7F\uDCB3-\uDCBF\uDCF3-\uDCFF\uDD28-\uDD2F\uDD3A-\uDE7F\uDEAA\uDEAD-\uDEAF\uDEB2-\uDEFF\uDF1D-\uDF26\uDF28-\uDF2F\uDF51-\uDFAF\uDFC5-\uDFDF\uDFF7-\uDFFF]|\uD804[\uDC47-\uDC65\uDC70-\uDC7E\uDCBB-\uDCCF\uDCE9-\uDCEF\uDCFA-\uDCFF\uDD35\uDD40-\uDD43\uDD48-\uDD4F\uDD74\uDD75\uDD77-\uDD7F\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDFF\uDE12\uDE38-\uDE3D\uDE3F-\uDE7F\uDE87\uDE89\uDE8E\uDE9E\uDEA9-\uDEAF\uDEEB-\uDEEF\uDEFA-\uDEFF\uDF04\uDF0D\uDF0E\uDF11\uDF12\uDF29\uDF31\uDF34\uDF3A\uDF45\uDF46\uDF49\uDF4A\uDF4E\uDF4F\uDF51-\uDF56\uDF58-\uDF5C\uDF64\uDF65\uDF6D-\uDF6F\uDF75-\uDFFF]|\uD805[\uDC4B-\uDC4F\uDC5A-\uDC5D\uDC62-\uDC7F\uDCC6\uDCC8-\uDCCF\uDCDA-\uDD7F\uDDB6\uDDB7\uDDC1-\uDDD7\uDDDE-\uDDFF\uDE41-\uDE43\uDE45-\uDE4F\uDE5A-\uDE7F\uDEB9-\uDEBF\uDECA-\uDEFF\uDF1B\uDF1C\uDF2C-\uDF2F\uDF3A-\uDFFF]|\uD806[\uDC3B-\uDC9F\uDCEA-\uDCFE\uDD07\uDD08\uDD0A\uDD0B\uDD14\uDD17\uDD36\uDD39\uDD3A\uDD44-\uDD4F\uDD5A-\uDD9F\uDDA8\uDDA9\uDDD8\uDDD9\uDDE2\uDDE5-\uDDFF\uDE3F-\uDE46\uDE48-\uDE4F\uDE9A-\uDE9C\uDE9E-\uDEBF\uDEF9-\uDFFF]|\uD807[\uDC09\uDC37\uDC41-\uDC4F\uDC5A-\uDC71\uDC90\uDC91\uDCA8\uDCB7-\uDCFF\uDD07\uDD0A\uDD37-\uDD39\uDD3B\uDD3E\uDD48-\uDD4F\uDD5A-\uDD5F\uDD66\uDD69\uDD8F\uDD92\uDD99-\uDD9F\uDDAA-\uDEDF\uDEF7-\uDFAF\uDFB1-\uDFFF]|\uD808[\uDF9A-\uDFFF]|\uD809[\uDC6F-\uDC7F\uDD44-\uDFFF]|[\uD80A\uD80B\uD80E-\uD810\uD812-\uD819\uD824-\uD82B\uD82D\uD82E\uD830-\uD833\uD837\uD839\uD83D\uD83F\uD87B-\uD87D\uD87F\uD885-\uDB3F\uDB41-\uDBFF][\uDC00-\uDFFF]|\uD80D[\uDC2F-\uDFFF]|\uD811[\uDE47-\uDFFF]|\uD81A[\uDE39-\uDE3F\uDE5F\uDE6A-\uDECF\uDEEE\uDEEF\uDEF5-\uDEFF\uDF37-\uDF3F\uDF44-\uDF4F\uDF5A-\uDF62\uDF78-\uDF7C\uDF90-\uDFFF]|\uD81B[\uDC00-\uDE3F\uDE80-\uDEFF\uDF4B-\uDF4E\uDF88-\uDF8E\uDFA0-\uDFDF\uDFE2\uDFE5-\uDFEF\uDFF2-\uDFFF]|\uD821[\uDFF8-\uDFFF]|\uD823[\uDCD6-\uDCFF\uDD09-\uDFFF]|\uD82C[\uDD1F-\uDD4F\uDD53-\uDD63\uDD68-\uDD6F\uDEFC-\uDFFF]|\uD82F[\uDC6B-\uDC6F\uDC7D-\uDC7F\uDC89-\uDC8F\uDC9A-\uDC9C\uDC9F-\uDFFF]|\uD834[\uDC00-\uDD64\uDD6A-\uDD6C\uDD73-\uDD7A\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDE41\uDE45-\uDFFF]|\uD835[\uDC55\uDC9D\uDCA0\uDCA1\uDCA3\uDCA4\uDCA7\uDCA8\uDCAD\uDCBA\uDCBC\uDCC4\uDD06\uDD0B\uDD0C\uDD15\uDD1D\uDD3A\uDD3F\uDD45\uDD47-\uDD49\uDD51\uDEA6\uDEA7\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3\uDFCC\uDFCD]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85-\uDE9A\uDEA0\uDEB0-\uDFFF]|\uD838[\uDC07\uDC19\uDC1A\uDC22\uDC25\uDC2B-\uDCFF\uDD2D-\uDD2F\uDD3E\uDD3F\uDD4A-\uDD4D\uDD4F-\uDEBF\uDEFA-\uDFFF]|\uD83A[\uDCC5-\uDCCF\uDCD7-\uDCFF\uDD4C-\uDD4F\uDD5A-\uDFFF]|\uD83B[\uDC00-\uDDFF\uDE04\uDE20\uDE23\uDE25\uDE26\uDE28\uDE33\uDE38\uDE3A\uDE3C-\uDE41\uDE43-\uDE46\uDE48\uDE4A\uDE4C\uDE50\uDE53\uDE55\uDE56\uDE58\uDE5A\uDE5C\uDE5E\uDE60\uDE63\uDE65\uDE66\uDE6B\uDE73\uDE78\uDE7D\uDE7F\uDE8A\uDE9C-\uDEA0\uDEA4\uDEAA\uDEBC-\uDFFF]|\uD83C[\uDC00-\uDD2F\uDD4A-\uDD4F\uDD6A-\uDD6F\uDD8A-\uDFFF]|\uD83E[\uDC00-\uDFEF\uDFFA-\uDFFF]|\uD869[\uDEDE-\uDEFF]|\uD86D[\uDF35-\uDF3F]|\uD86E[\uDC1E\uDC1F]|\uD873[\uDEA2-\uDEAF]|\uD87A[\uDFE1-\uDFFF]|\uD87E[\uDE1E-\uDFFF]|\uD884[\uDF4B-\uDFFF]|\uDB40[\uDC00-\uDCFF\uDDF0-\uDFFF]/g;

// ../../node_modules/github-slugger/index.js
var own = Object.hasOwnProperty;
function slug(value, maintainCase) {
  if (typeof value !== "string") return "";
  if (!maintainCase) value = value.toLowerCase();
  return value.replace(regex, "").replace(/ /g, "-");
}

// ../../node_modules/@quartz-community/utils/dist/index.js
import { jsxs, jsx, Fragment } from "preact/jsx-runtime";
import { h } from "preact";
function simplifySlug(fp) {
  const res = stripSlashes(trimSuffix(fp, "index"), true);
  return res.length === 0 ? "/" : res;
}
function slugifyFilePath(fp, excludeExt) {
  fp = stripSlashes(fp);
  const ext = getFileExtension(fp);
  const withoutFileExt = fp.replace(new RegExp(ext + "$"), "");
  const finalExt = excludeExt || [".md", ".html", void 0].includes(ext) ? "" : ext;
  let slug2 = _sluggify(withoutFileExt);
  if (endsWith(slug2, "_index")) {
    slug2 = slug2.replace(/_index$/, "index");
  }
  const segments = slug2.split("/");
  if (segments.length >= 2 && segments[segments.length - 1] === segments[segments.length - 2]) {
    segments[segments.length - 1] = "index";
    slug2 = segments.join("/");
  }
  return slug2 + (finalExt ?? "");
}
function joinSegments(...args) {
  if (args.length === 0) {
    return "";
  }
  let joined = args.filter((segment) => segment !== "" && segment !== "/").map((segment) => stripSlashes(segment)).join("/");
  const first = args[0];
  const last = args[args.length - 1];
  if (first?.startsWith("/")) {
    joined = "/" + joined;
  }
  if (last?.endsWith("/")) {
    joined = joined + "/";
  }
  return joined;
}
function endsWith(s, suffix) {
  return s === suffix || s.endsWith("/" + suffix);
}
function trimSuffix(s, suffix) {
  if (endsWith(s, suffix)) {
    s = s.slice(0, -suffix.length);
  }
  return s;
}
function stripSlashes(s, onlyStripPrefix) {
  if (s.startsWith("/")) {
    s = s.substring(1);
  }
  if (!onlyStripPrefix && s.endsWith("/")) {
    s = s.slice(0, -1);
  }
  return s;
}
function getFileExtension(s) {
  return s.match(/\.[A-Za-z0-9]+$/)?.[0];
}
function isFolderPath(fplike) {
  return fplike.endsWith("/") || endsWith(fplike, "index") || endsWith(fplike, "index.md") || endsWith(fplike, "index.html");
}
function pathToRoot(slug2) {
  let rootPath = slug2.split("/").filter((x) => x !== "").slice(0, -1).map((_) => "..").join("/");
  if (rootPath.length === 0) {
    rootPath = ".";
  }
  return rootPath;
}
function resolveRelative(current, target) {
  const res = joinSegments(pathToRoot(current), simplifySlug(target));
  return res;
}
function splitAnchor(link) {
  const [fp, anchor] = link.split("#", 2);
  if (fp.endsWith(".pdf")) {
    return [fp, anchor === void 0 ? "" : `#${anchor}`];
  }
  if (anchor === void 0) {
    return [fp, ""];
  }
  const bare = anchor.startsWith("^") ? anchor.slice(1) : anchor;
  const slugged = "#" + slug(bare);
  return [fp, slugged];
}
function transformInternalLink(link) {
  const [fplike, anchor] = splitAnchor(decodeURI(link));
  const segments = fplike.split("/").filter((x) => x.length > 0);
  const prefix = segments.filter(_isRelativeSegment).join("/");
  const fp = segments.filter((seg) => !_isRelativeSegment(seg) && seg !== "").join("/");
  const slugged = slugifyFilePath(fp);
  const simpleSlug = simplifySlug(slugged);
  const folderPath = isFolderPath(fplike) || isFolderPath(slugged);
  const joined = joinSegments(stripSlashes(prefix), stripSlashes(simpleSlug));
  const trail = folderPath ? "/" : "";
  const res = _addRelativeToStart(joined) + trail + anchor;
  return res;
}
function transformLink(src, target, opts) {
  const targetSlug = transformInternalLink(target);
  if (opts.strategy === "relative") {
    return targetSlug;
  } else {
    const effectiveSrc = !endsWith(src, "index") && opts.allSlugs.includes(`${src}/index`) ? `${src}/index` : src;
    const folderTail = isFolderPath(targetSlug) ? "/" : "";
    const canonicalSlug = stripSlashes(targetSlug.slice(".".length));
    const [targetCanonical, targetAnchor] = splitAnchor(canonicalSlug);
    if (opts.strategy === "shortest") {
      const isMultiSegment = targetCanonical.includes("/");
      const isFolderTarget = isFolderPath(targetSlug);
      const matchingFileNames = opts.allSlugs.filter((slug2) => {
        if (isMultiSegment) {
          if (slug2 === targetCanonical || slug2.endsWith("/" + targetCanonical)) {
            return true;
          }
          if (isFolderTarget) {
            const withIndex = targetCanonical + "/index";
            return slug2 === withIndex || slug2.endsWith("/" + withIndex);
          }
          return false;
        }
        const parts = slug2.split("/");
        const fileName = parts.at(-1);
        return targetCanonical === fileName;
      });
      if (matchingFileNames.length === 1) {
        const matchedSlug = matchingFileNames[0];
        return resolveRelative(effectiveSrc, matchedSlug) + targetAnchor;
      }
    }
    return joinSegments(pathToRoot(effectiveSrc), canonicalSlug) + folderTail;
  }
}
function slugifyPath(s) {
  return s.split("/").map(
    (segment) => segment.replace(/\s/g, "-").replace(/&/g, "-and-").replace(/%/g, "-percent").replace(/\?/g, "").replace(/#/g, "").replace(/[<>:"|*]/g, "").toLowerCase()
  ).join("/").replace(/\/$/, "");
}
function _sluggify(s) {
  return slugifyPath(s);
}
function _isRelativeSegment(s) {
  return /^\.{0,2}$/.test(s);
}
function _addRelativeToStart(s) {
  if (s === "") {
    s = ".";
  }
  if (!s.startsWith(".")) {
    s = joinSegments(".", s);
  }
  return s;
}
var U200D = String.fromCharCode(8205);

// src/compiler/functions.ts
var globalFunctions = /* @__PURE__ */ new Map();
var methodFunctions = /* @__PURE__ */ new Map();
function getGlobalFunction(name) {
  return globalFunctions.get(name);
}
function getMethodFunction(name, target) {
  const category = getMethodTarget(target);
  if (!category) return void 0;
  return methodFunctions.get(category)?.get(name);
}
function registerGlobalFunction(name, fn) {
  globalFunctions.set(name, fn);
}
function registerMethodFunction(target, name, fn) {
  const group = methodFunctions.get(target) ?? /* @__PURE__ */ new Map();
  group.set(name, fn);
  methodFunctions.set(target, group);
}
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function toStringValue(value) {
  if (value === void 0 || value === null) return "";
  return String(value);
}
function toNumber(value) {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return null;
}
function toInteger(value, fallback) {
  const numberValue = toNumber(value);
  if (numberValue === null) return fallback;
  return Math.trunc(numberValue);
}
function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
function flattenArgs(args) {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}
function collectNumericArgs(args) {
  const values = flattenArgs(args);
  const numbers = [];
  for (const value of values) {
    const numberValue = toNumber(value);
    if (numberValue !== null) numbers.push(numberValue);
  }
  return numbers;
}
function isFileValue(value) {
  if (!isRecord(value)) return false;
  return typeof value.name === "string" && typeof value.path === "string" && typeof value.folder === "string" && typeof value.ext === "string" && Array.isArray(value.tags) && Array.isArray(value.links) && typeof value.basename === "string";
}
function resolveSelfName(value) {
  if (!isRecord(value)) return null;
  if (isRecord(value.file) && typeof value.file.name === "string") {
    return value.file.name;
  }
  if (typeof value.name === "string" && typeof value.path === "string") {
    return value.basename || value.name;
  }
  return null;
}
function resolveSelfPath(value) {
  if (!isRecord(value)) return null;
  if (isRecord(value.file) && typeof value.file.path === "string") {
    return value.file.path;
  }
  if (typeof value.path === "string") {
    return value.path;
  }
  return null;
}
function listContainsName(list, name, selfPath) {
  const slugName = slugifyPath(name);
  const selfSlug = selfPath ? slugifyFilePath(selfPath) : null;
  return list.some((item) => {
    if (typeof item !== "string") return false;
    const match = item.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
    if (match?.[1]) {
      return match[1] === name || match[1].endsWith(`/${name}`);
    }
    if (item === name) return true;
    const slugItem = slugifyPath(item);
    if (slugItem === slugName || slugItem.endsWith(`/${slugName}`)) return true;
    if (item === slugName || item.endsWith(`/${slugName}`)) return true;
    if (selfSlug && (item === selfSlug || selfSlug.endsWith(`/${item}`) || item.endsWith(`/${selfSlug}`)))
      return true;
    return false;
  });
}
function isDateValue(value) {
  return value instanceof Date;
}
function isAlpha2(ch) {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return code >= 65 && code <= 90 || code >= 97 && code <= 122;
}
function isDigit2(ch) {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return code >= 48 && code <= 57;
}
function parseDuration(value) {
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  const multipliers = {
    ms: 1,
    millisecond: 1,
    milliseconds: 1,
    s: 1e3,
    sec: 1e3,
    second: 1e3,
    seconds: 1e3,
    m: 6e4,
    min: 6e4,
    minute: 6e4,
    minutes: 6e4,
    h: 36e5,
    hr: 36e5,
    hour: 36e5,
    hours: 36e5,
    d: 864e5,
    day: 864e5,
    days: 864e5,
    w: 6048e5,
    week: 6048e5,
    weeks: 6048e5,
    mo: 2592e6,
    month: 2592e6,
    months: 2592e6,
    y: 31536e6,
    year: 31536e6,
    years: 31536e6
  };
  let index = 0;
  let total = 0;
  while (index < trimmed.length) {
    while (trimmed[index] === " " || trimmed[index] === "	") {
      index += 1;
    }
    if (index >= trimmed.length) break;
    const start = index;
    let hasDot = false;
    while (index < trimmed.length) {
      const ch = trimmed[index] ?? "";
      if (isDigit2(ch)) {
        index += 1;
        continue;
      }
      if (ch === "." && !hasDot) {
        hasDot = true;
        index += 1;
        continue;
      }
      break;
    }
    if (start === index) return void 0;
    const amount = Number(trimmed.slice(start, index));
    if (Number.isNaN(amount)) return void 0;
    while (index < trimmed.length && (trimmed[index] === " " || trimmed[index] === "	")) {
      index += 1;
    }
    const unitStart = index;
    while (index < trimmed.length && isAlpha2(trimmed[index] ?? "")) {
      index += 1;
    }
    const unit = trimmed.slice(unitStart, index).toLowerCase();
    const multiplier = unit ? multipliers[unit] : 1;
    if (unit && multiplier === void 0) return void 0;
    total += amount * (multiplier ?? 1);
  }
  return total;
}
function parseDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? void 0 : date;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return void 0;
    return new Date(parsed);
  }
  return void 0;
}
function buildFileValue(path) {
  const normalized = path.trim();
  const lastSlash = normalized.lastIndexOf("/");
  const fileName = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  const lastDot = fileName.lastIndexOf(".");
  const basename = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  const ext = lastDot > 0 ? fileName.slice(lastDot + 1) : "";
  const folder = lastSlash >= 0 ? normalized.slice(0, lastSlash) : "";
  return {
    name: fileName || normalized,
    basename: basename || fileName || normalized,
    path: normalized,
    folder,
    ext,
    tags: [],
    links: []
  };
}
function getMethodTarget(value) {
  if (typeof value === "string") return "string";
  if (typeof value === "number" && !Number.isNaN(value)) return "number";
  if (isDateValue(value)) return "date";
  if (Array.isArray(value)) return "list";
  if (isFileValue(value)) return "file";
  if (isRecord(value)) return "object";
  return void 0;
}
registerGlobalFunction("if", ([cond, whenTrue, whenFalse]) => {
  return cond ? whenTrue : whenFalse;
});
registerGlobalFunction("contains", ([haystack, needle]) => {
  if (Array.isArray(haystack)) {
    if (haystack.includes(needle)) return true;
    const name = resolveSelfName(needle);
    return name ? listContainsName(haystack, name, resolveSelfPath(needle)) : false;
  }
  if (typeof haystack === "string") return haystack.includes(toStringValue(needle));
  return false;
});
registerGlobalFunction("date", ([value]) => parseDate(value));
registerGlobalFunction("duration", ([value]) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseDuration(value);
  return void 0;
});
registerGlobalFunction("now", () => /* @__PURE__ */ new Date());
registerGlobalFunction("today", () => {
  const now = /* @__PURE__ */ new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
});
registerGlobalFunction("number", ([value]) => {
  const numberValue = toNumber(value);
  return numberValue === null ? void 0 : numberValue;
});
registerGlobalFunction("min", (args) => {
  const numbers = collectNumericArgs(args);
  if (numbers.length === 0) return void 0;
  return Math.min(...numbers);
});
registerGlobalFunction("max", (args) => {
  const numbers = collectNumericArgs(args);
  if (numbers.length === 0) return void 0;
  return Math.max(...numbers);
});
registerGlobalFunction("list", ([value]) => {
  if (value === void 0 || value === null) return [];
  if (Array.isArray(value)) return value;
  return [value];
});
registerGlobalFunction("link", ([path, display]) => {
  const target = isFileValue(path) ? path.path.replace(/\.md$/, "") : toStringValue(path);
  if (!target) return "";
  const label = isFileValue(display) ? display.basename : toStringValue(display);
  return label ? `[[${target}|${label}]]` : `[[${target}]]`;
});
registerGlobalFunction("image", ([path]) => {
  const target = isFileValue(path) ? path.path.replace(/\.md$/, "") : toStringValue(path);
  if (!target) return "";
  return `![[${target}]]`;
});
registerGlobalFunction("icon", ([name]) => {
  const value = toStringValue(name);
  if (!value) return "";
  return `:${value}:`;
});
registerGlobalFunction("html", ([value]) => toStringValue(value));
registerGlobalFunction("escapeHTML", ([value]) => {
  const text = toStringValue(value);
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
});
registerGlobalFunction("file", ([path]) => {
  if (typeof path !== "string") return void 0;
  if (!path.trim()) return void 0;
  return buildFileValue(path);
});
registerMethodFunction("file", "hasTag", (target, args) => {
  if (!isFileValue(target)) return false;
  if (args.length === 0) return false;
  return args.every((tag) => {
    const value = toStringValue(tag)?.toLowerCase();
    if (!value) return false;
    const prefix = value.endsWith("/") ? value : `${value}/`;
    return target.tags.some((t) => {
      const lower = t.toLowerCase();
      return lower === value || lower.startsWith(prefix);
    });
  });
});
registerMethodFunction("file", "hasLink", (target, [link]) => {
  if (!isFileValue(target)) return false;
  const value = toStringValue(link);
  if (!value) return false;
  return target.links.includes(value);
});
registerMethodFunction("file", "inFolder", (target, [folder]) => {
  if (!isFileValue(target)) return false;
  const value = toStringValue(folder);
  if (!value) return false;
  const normalized = value.endsWith("/") ? value.slice(0, -1) : value;
  return target.folder === normalized || target.folder.startsWith(`${normalized}/`);
});
registerMethodFunction("file", "hasProperty", (_target, [prop], context) => {
  const value = toStringValue(prop);
  if (!value) return false;
  const parts = value.split(".");
  let target = context.note;
  for (const part of parts) {
    if (!isRecord(target)) return false;
    if (!Object.hasOwn(target, part)) return false;
    target = target[part];
  }
  return true;
});
registerMethodFunction("string", "contains", (target, [needle]) => {
  const value = toStringValue(target);
  return value.includes(toStringValue(needle));
});
registerMethodFunction("string", "startsWith", (target, [prefix]) => {
  const value = toStringValue(target);
  return value.startsWith(toStringValue(prefix));
});
registerMethodFunction("string", "endsWith", (target, [suffix]) => {
  const value = toStringValue(target);
  return value.endsWith(toStringValue(suffix));
});
registerMethodFunction("string", "lower", (target) => toStringValue(target).toLowerCase());
registerMethodFunction("string", "upper", (target) => toStringValue(target).toUpperCase());
registerMethodFunction("string", "trim", (target) => toStringValue(target).trim());
registerMethodFunction("string", "replace", (target, [search, replacement]) => {
  const source = toStringValue(target);
  const needle = toStringValue(search);
  if (!needle) return source;
  const replacementText = toStringValue(replacement);
  return source.split(needle).join(replacementText);
});
registerMethodFunction("string", "slice", (target, [start, end]) => {
  const source = toStringValue(target);
  const startIndex = toInteger(start, 0);
  if (end === void 0) return source.slice(startIndex);
  const endIndex = toInteger(end, source.length);
  return source.slice(startIndex, endIndex);
});
registerMethodFunction("string", "isEmpty", (target) => toStringValue(target).length === 0);
registerMethodFunction("string", "repeat", (target, [count]) => {
  const source = toStringValue(target);
  const times = toInteger(count, 0);
  if (times <= 0) return "";
  return source.repeat(times);
});
registerMethodFunction(
  "string",
  "reverse",
  (target) => toStringValue(target).split("").reverse().join("")
);
registerMethodFunction("number", "toFixed", (target, [digits]) => {
  const value = toNumber(target);
  if (value === null) return void 0;
  const decimals = toInteger(digits, 0);
  return value.toFixed(decimals);
});
registerMethodFunction("number", "round", (target, [digits]) => {
  const value = toNumber(target);
  if (value === null) return void 0;
  const decimals = toInteger(digits, 0);
  return roundTo(value, decimals);
});
registerMethodFunction("number", "floor", (target) => {
  const value = toNumber(target);
  if (value === null) return void 0;
  return Math.floor(value);
});
registerMethodFunction("number", "ceil", (target) => {
  const value = toNumber(target);
  if (value === null) return void 0;
  return Math.ceil(value);
});
registerMethodFunction("number", "abs", (target) => {
  const value = toNumber(target);
  if (value === null) return void 0;
  return Math.abs(value);
});
var MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
var MONTH_NAMES_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
function formatDateToken(date, token) {
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  const y = date.getFullYear();
  const M = date.getMonth() + 1;
  const d = date.getDate();
  const H = date.getHours();
  const h2 = H % 12 || 12;
  const m = date.getMinutes();
  const s = date.getSeconds();
  const A = H < 12 ? "AM" : "PM";
  switch (token) {
    case "YYYY":
      return String(y);
    case "YY":
      return String(y).slice(-2);
    case "MMMM":
      return MONTH_NAMES_FULL[date.getMonth()];
    case "MMM":
      return MONTH_NAMES_SHORT[date.getMonth()];
    case "MM":
      return pad(M);
    case "M":
      return String(M);
    case "DD":
      return pad(d);
    case "D":
      return String(d);
    case "HH":
      return pad(H);
    case "H":
      return String(H);
    case "hh":
      return pad(h2);
    case "h":
      return String(h2);
    case "mm":
      return pad(m);
    case "m":
      return String(m);
    case "ss":
      return pad(s);
    case "s":
      return String(s);
    case "A":
      return A;
    case "a":
      return A.toLowerCase();
    default:
      return token;
  }
}
function formatDate(date, format) {
  const tokenPattern = /YYYY|YY|MMMM|MMM|MM|M|DD|D|HH|H|hh|h|mm|m|ss|s|A|a/g;
  let result = "";
  let lastIndex = 0;
  let match = tokenPattern.exec(format);
  while (match !== null) {
    result += format.slice(lastIndex, match.index);
    result += formatDateToken(date, match[0]);
    lastIndex = tokenPattern.lastIndex;
    match = tokenPattern.exec(format);
  }
  result += format.slice(lastIndex);
  return result;
}
registerMethodFunction("date", "format", (target, [format]) => {
  if (!isDateValue(target)) return void 0;
  const timestamp = target.getTime();
  if (Number.isNaN(timestamp)) return "";
  if (typeof format === "string" && format) {
    return formatDate(target, format);
  }
  return target.toISOString();
});
registerMethodFunction(
  "date",
  "year",
  (target) => isDateValue(target) ? target.getFullYear() : void 0
);
registerMethodFunction(
  "date",
  "month",
  (target) => isDateValue(target) ? target.getMonth() + 1 : void 0
);
registerMethodFunction(
  "date",
  "day",
  (target) => isDateValue(target) ? target.getDate() : void 0
);
registerMethodFunction("date", "date", (target) => {
  if (!isDateValue(target)) return void 0;
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
});
registerMethodFunction("date", "time", (target) => {
  if (!isDateValue(target)) return void 0;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(target.getHours())}:${pad(target.getMinutes())}:${pad(target.getSeconds())}`;
});
registerMethodFunction("date", "relative", (target) => {
  if (!isDateValue(target)) return void 0;
  const time = target.getTime();
  if (Number.isNaN(time)) return "";
  const diff = time - Date.now();
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 6e4);
  const hours = Math.round(abs / 36e5);
  const days = Math.round(abs / 864e5);
  if (days >= 1) return diff < 0 ? `${days}d ago` : `in ${days}d`;
  if (hours >= 1) return diff < 0 ? `${hours}h ago` : `in ${hours}h`;
  if (minutes >= 1) return diff < 0 ? `${minutes}m ago` : `in ${minutes}m`;
  return diff < 0 ? "just now" : "soon";
});
registerMethodFunction("date", "isEmpty", (target) => {
  if (!isDateValue(target)) return true;
  return Number.isNaN(target.getTime());
});
registerMethodFunction("list", "sum", (target) => {
  if (!Array.isArray(target)) return void 0;
  return target.reduce((total, item) => {
    const value = toNumber(item);
    return value === null ? total : total + value;
  }, 0);
});
registerMethodFunction("list", "mean", (target) => {
  if (!Array.isArray(target)) return void 0;
  const numbers = collectNumericArgs(target);
  if (numbers.length === 0) return void 0;
  const sum = numbers.reduce((total, value) => total + value, 0);
  return sum / numbers.length;
});
registerMethodFunction("list", "count", (target) => Array.isArray(target) ? target.length : 0);
registerMethodFunction("list", "min", (target) => {
  if (!Array.isArray(target)) return void 0;
  const numbers = collectNumericArgs(target);
  if (numbers.length === 0) return void 0;
  return Math.min(...numbers);
});
registerMethodFunction("list", "max", (target) => {
  if (!Array.isArray(target)) return void 0;
  const numbers = collectNumericArgs(target);
  if (numbers.length === 0) return void 0;
  return Math.max(...numbers);
});
registerMethodFunction("list", "round", (target, [digits]) => {
  if (!Array.isArray(target)) return void 0;
  const decimals = toInteger(digits, 0);
  return target.map((item) => {
    const numberValue = toNumber(item);
    if (numberValue === null) return item;
    return roundTo(numberValue, decimals);
  });
});
registerMethodFunction("file", "asLink", (target, args) => {
  if (!isFileValue(target)) return "";
  const path = target.path.replace(/\.md$/, "");
  const display = args.length > 0 ? toStringValue(args[0]) : "";
  return display ? `[[${path}|${display}]]` : `[[${path}]]`;
});
registerMethodFunction("string", "containsAll", (target, args) => {
  const value = toStringValue(target);
  return args.every((needle) => value.includes(toStringValue(needle)));
});
registerMethodFunction("string", "containsAny", (target, args) => {
  const value = toStringValue(target);
  return args.some((needle) => value.includes(toStringValue(needle)));
});
registerMethodFunction("string", "split", (target, [separator]) => {
  const value = toStringValue(target);
  const sep = toStringValue(separator);
  return value.split(sep);
});
registerMethodFunction("string", "title", (target) => {
  const value = toStringValue(target);
  return value.replace(/\b\w/g, (ch) => ch.toUpperCase());
});
registerMethodFunction("string", "asFile", (target, _args, context) => {
  const path = toStringValue(target);
  if (!path) return void 0;
  const lookup = context._fileLookup;
  if (lookup) {
    const normalized = path.trim();
    const found = lookup.get(normalized) ?? lookup.get(normalized.replace(/\.md$/, "")) ?? (!normalized.endsWith(".md") ? lookup.get(`${normalized}.md`) : void 0);
    if (found) return { ...found };
    const suffix = `/${normalized}`;
    const suffixMd = `/${normalized}.md`;
    for (const [key, value] of lookup) {
      if (key.endsWith(suffix) || key.endsWith(suffixMd)) {
        return { ...value };
      }
    }
  }
  return buildFileValue(path);
});
registerMethodFunction("list", "contains", (target, [needle]) => {
  if (!Array.isArray(target)) return false;
  if (target.includes(needle)) return true;
  if (typeof needle === "string") {
    const slugNeedle = slugifyPath(needle);
    if (target.some((item) => typeof item === "string" && slugifyPath(item) === slugNeedle))
      return true;
  }
  const name = resolveSelfName(needle);
  return name ? listContainsName(target, name, resolveSelfPath(needle)) : false;
});
registerMethodFunction("list", "containsAll", (target, args) => {
  if (!Array.isArray(target)) return false;
  return args.every((needle) => target.includes(needle));
});
registerMethodFunction("list", "containsAny", (target, args) => {
  if (!Array.isArray(target)) return false;
  return args.some((needle) => target.includes(needle));
});
registerMethodFunction("list", "flat", (target) => {
  if (!Array.isArray(target)) return void 0;
  return target.flat();
});
registerMethodFunction("list", "isEmpty", (target) => {
  if (!Array.isArray(target)) return true;
  return target.length === 0;
});
registerMethodFunction("list", "join", (target, [separator]) => {
  if (!Array.isArray(target)) return "";
  const sep = separator === void 0 ? ", " : toStringValue(separator);
  return target.map((item) => toStringValue(item)).join(sep);
});
registerMethodFunction("list", "reverse", (target) => {
  if (!Array.isArray(target)) return void 0;
  return [...target].reverse();
});
registerMethodFunction("list", "slice", (target, [start, end]) => {
  if (!Array.isArray(target)) return void 0;
  const startIndex = toInteger(start, 0);
  if (end === void 0) return target.slice(startIndex);
  const endIndex = toInteger(end, target.length);
  return target.slice(startIndex, endIndex);
});
registerMethodFunction("list", "sort", (target) => {
  if (!Array.isArray(target)) return void 0;
  return [...target].sort((a, b) => {
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b));
  });
});
registerMethodFunction("list", "unique", (target) => {
  if (!Array.isArray(target)) return void 0;
  return [...new Set(target)];
});
registerMethodFunction("number", "isEmpty", (target) => {
  const value = toNumber(target);
  return value === null || Number.isNaN(value);
});
registerMethodFunction("object", "isEmpty", (target) => {
  if (!isRecord(target)) return true;
  return Object.keys(target).length === 0;
});
registerMethodFunction("object", "keys", (target) => {
  if (!isRecord(target)) return [];
  return Object.keys(target);
});
registerMethodFunction("object", "values", (target) => {
  if (!isRecord(target)) return [];
  return Object.values(target);
});
function registerAnyMethod(name, fn) {
  const targets = ["string", "number", "date", "list", "file", "object"];
  for (const target of targets) {
    registerMethodFunction(target, name, fn);
  }
}
registerAnyMethod("isTruthy", (target) => Boolean(target));
registerAnyMethod("isType", (target, [typeName]) => {
  const expected = toStringValue(typeName).toLowerCase();
  if (typeof target === "string") return expected === "string";
  if (typeof target === "number") return expected === "number";
  if (isDateValue(target)) return expected === "date";
  if (Array.isArray(target)) return expected === "list" || expected === "array";
  if (isFileValue(target)) return expected === "file";
  if (isRecord(target)) return expected === "object";
  return false;
});
registerAnyMethod("toString", (target) => {
  if (isDateValue(target)) return target.toISOString();
  if (Array.isArray(target)) return target.map((item) => toStringValue(item)).join(", ");
  if (isRecord(target)) return JSON.stringify(target);
  return toStringValue(target);
});

// src/compiler/interpreter.ts
function isRecord2(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function toBoolean(value) {
  return Boolean(value);
}
function toNumber2(value) {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return null;
}
function toStringValue2(value) {
  if (value === void 0 || value === null) return "";
  return String(value);
}
function compareValues(left, right, operator) {
  if (operator === "==") {
    if (isDateValue2(left) && isDateValue2(right)) return left.getTime() === right.getTime();
    return left === right;
  }
  if (operator === "!=") {
    if (isDateValue2(left) && isDateValue2(right)) return left.getTime() !== right.getTime();
    return left !== right;
  }
  if (isDateValue2(left) && isDateValue2(right)) {
    const leftMs = left.getTime();
    const rightMs = right.getTime();
    if (operator === ">") return leftMs > rightMs;
    if (operator === "<") return leftMs < rightMs;
    if (operator === ">=") return leftMs >= rightMs;
    if (operator === "<=") return leftMs <= rightMs;
  }
  const leftNum = toNumber2(left);
  const rightNum = toNumber2(right);
  if (leftNum !== null && rightNum !== null) {
    if (operator === ">") return leftNum > rightNum;
    if (operator === "<") return leftNum < rightNum;
    if (operator === ">=") return leftNum >= rightNum;
    if (operator === "<=") return leftNum <= rightNum;
  }
  const leftStr = toStringValue2(left);
  const rightStr = toStringValue2(right);
  if (operator === ">") return leftStr > rightStr;
  if (operator === "<") return leftStr < rightStr;
  if (operator === ">=") return leftStr >= rightStr;
  if (operator === "<=") return leftStr <= rightStr;
  return false;
}
function isDateValue2(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
function applyBinary(operator, left, right) {
  if (operator === "+") {
    if (isDateValue2(left) && typeof right === "number") {
      return new Date(left.getTime() + right);
    }
    if (typeof left === "number" && isDateValue2(right)) {
      return new Date(right.getTime() + left);
    }
    if (typeof left === "string" || typeof right === "string") {
      return `${toStringValue2(left)}${toStringValue2(right)}`;
    }
    const leftNum = toNumber2(left);
    const rightNum = toNumber2(right);
    if (leftNum === null || rightNum === null) return void 0;
    return leftNum + rightNum;
  }
  if (operator === "-") {
    if (isDateValue2(left) && typeof right === "number") {
      return new Date(left.getTime() - right);
    }
    if (isDateValue2(left) && isDateValue2(right)) {
      return left.getTime() - right.getTime();
    }
    const leftNum = toNumber2(left);
    const rightNum = toNumber2(right);
    if (leftNum === null || rightNum === null) return void 0;
    return leftNum - rightNum;
  }
  if (operator === "*") {
    const leftNum = toNumber2(left);
    const rightNum = toNumber2(right);
    if (leftNum === null || rightNum === null) return void 0;
    return leftNum * rightNum;
  }
  if (operator === "/") {
    const leftNum = toNumber2(left);
    const rightNum = toNumber2(right);
    if (leftNum === null || rightNum === null) return void 0;
    return rightNum === 0 ? 0 : leftNum / rightNum;
  }
  if (operator === "%") {
    const leftNum = toNumber2(left);
    const rightNum = toNumber2(right);
    if (leftNum === null || rightNum === null) return void 0;
    return rightNum === 0 ? 0 : leftNum % rightNum;
  }
  return compareValues(left, right, operator);
}
function getNestedValue(target, path) {
  let current = target;
  for (const part of path) {
    if (!part) continue;
    if (Array.isArray(current)) {
      const index = Number(part);
      if (Number.isNaN(index)) return void 0;
      current = current[index];
      continue;
    }
    if (!isRecord2(current)) return void 0;
    current = current[part];
  }
  return current;
}
function resolvePropertyValue(path, context) {
  if (typeof path !== "string") return void 0;
  const trimmed = path.trim();
  if (!trimmed) return void 0;
  if (trimmed.startsWith("this.")) {
    return getNestedValue(context.self ?? {}, trimmed.slice(5).split("."));
  }
  if (trimmed.startsWith("note.")) {
    return getNestedValue(context.note, trimmed.slice(5).split("."));
  }
  if (trimmed.startsWith("file.")) {
    return getNestedValue(context.file, trimmed.slice(5).split("."));
  }
  if (trimmed.startsWith("formula.")) {
    return getNestedValue(context.formula, trimmed.slice(8).split("."));
  }
  return getNestedValue(context.note, trimmed.split("."));
}
function resolveIdentifier(name, context) {
  if (name.includes(".")) return resolvePropertyValue(name, context);
  if (name === "this") return context.self ?? {};
  if (name === "note") return context.note;
  if (name === "file") return context.file;
  if (name === "formula") return context.formula;
  if (name === "value") return context._lambdaValue;
  return context.note[name];
}
function resolveMember(target, name) {
  if (target === void 0 || target === null) return void 0;
  if (isDateValue2(target)) {
    switch (name) {
      case "year":
        return target.getFullYear();
      case "month":
        return target.getMonth() + 1;
      case "day":
        return target.getDate();
      case "hour":
        return target.getHours();
      case "minute":
        return target.getMinutes();
      case "second":
        return target.getSeconds();
      default:
        return void 0;
    }
  }
  if (Array.isArray(target)) {
    if (name === "length") return target.length;
    const index = Number(name);
    if (Number.isNaN(index)) return void 0;
    return target[index];
  }
  if (typeof target === "string") {
    if (name === "length") return target.length;
    const index = Number(name);
    if (Number.isNaN(index)) return void 0;
    return target.charAt(index);
  }
  if (isRecord2(target)) return target[name];
  return void 0;
}
function resolveIndex(target, indexValue) {
  if (target === void 0 || target === null) return void 0;
  if (Array.isArray(target)) {
    const index = toNumber2(indexValue);
    if (index === null) return void 0;
    return target[Math.trunc(index)];
  }
  if (typeof target === "string") {
    const index = toNumber2(indexValue);
    if (index === null) return void 0;
    return target.charAt(Math.trunc(index));
  }
  if (isRecord2(target)) {
    if (typeof indexValue === "string" || typeof indexValue === "number") {
      return target[String(indexValue)];
    }
  }
  return void 0;
}
function popArgs(stack, count) {
  const args = new Array(count);
  for (let i = count - 1; i >= 0; i -= 1) {
    args[i] = stack.pop();
  }
  return args;
}
function evaluateLambda(program, elementValue, context) {
  const lambdaContext = { ...context, _lambdaValue: elementValue };
  return interpret(program, lambdaContext);
}
function executeLazyMethod(name, target, argPrograms, context) {
  if (!Array.isArray(target)) return void 0;
  const body = argPrograms[0];
  if (!body) return void 0;
  switch (name) {
    case "filter":
      return target.filter((element) => {
        const result = evaluateLambda(body, element, context);
        return Boolean(result);
      });
    case "map":
      return target.map((element) => evaluateLambda(body, element, context));
    case "flatMap": {
      const mapped = target.map((element) => evaluateLambda(body, element, context));
      return mapped.flat();
    }
    case "find":
      return target.find((element) => {
        const result = evaluateLambda(body, element, context);
        return Boolean(result);
      });
    case "some":
      return target.some((element) => {
        const result = evaluateLambda(body, element, context);
        return Boolean(result);
      });
    case "every":
      return target.every((element) => {
        const result = evaluateLambda(body, element, context);
        return Boolean(result);
      });
    default:
      return void 0;
  }
}
function interpret(instructions, context) {
  const stack = [];
  let ip = 0;
  while (ip < instructions.length) {
    const instruction = instructions[ip];
    if (!instruction) break;
    switch (instruction.type) {
      case "Const":
        stack.push(instruction.value);
        ip += 1;
        break;
      case "Ident":
        stack.push(resolveIdentifier(instruction.name, context));
        ip += 1;
        break;
      case "LoadFormula":
        stack.push(context.formula[instruction.name]);
        ip += 1;
        break;
      case "Member": {
        const target = stack.pop();
        stack.push(resolveMember(target, instruction.name));
        ip += 1;
        break;
      }
      case "Index": {
        const indexValue = stack.pop();
        const target = stack.pop();
        stack.push(resolveIndex(target, indexValue));
        ip += 1;
        break;
      }
      case "List": {
        const items = popArgs(stack, instruction.count);
        stack.push(items);
        ip += 1;
        break;
      }
      case "Unary": {
        const value = stack.pop();
        if (instruction.operator === "!") {
          stack.push(!toBoolean(value));
        } else if (instruction.operator === "-") {
          const numberValue = toNumber2(value);
          stack.push(numberValue === null ? void 0 : -numberValue);
        } else {
          stack.push(void 0);
        }
        ip += 1;
        break;
      }
      case "Binary": {
        const right = stack.pop();
        const left = stack.pop();
        stack.push(applyBinary(instruction.operator, left, right));
        ip += 1;
        break;
      }
      case "ToBool": {
        const value = stack.pop();
        stack.push(toBoolean(value));
        ip += 1;
        break;
      }
      case "CallGlobal": {
        const args = popArgs(stack, instruction.argc);
        const fn = getGlobalFunction(instruction.name);
        if (!fn) {
          stack.push(void 0);
          ip += 1;
          break;
        }
        try {
          stack.push(fn(args, context));
        } catch {
          stack.push(void 0);
        }
        ip += 1;
        break;
      }
      case "CallMethod": {
        const args = popArgs(stack, instruction.argc);
        const target = stack.pop();
        if ((target === null || target === void 0) && instruction.name === "isEmpty") {
          stack.push(true);
          ip += 1;
          break;
        }
        const fn = getMethodFunction(instruction.name, target);
        if (!fn) {
          stack.push(void 0);
          ip += 1;
          break;
        }
        try {
          stack.push(fn(target, args, context));
        } catch {
          stack.push(void 0);
        }
        ip += 1;
        break;
      }
      case "CallMethodLazy": {
        const target = stack.pop();
        const result = executeLazyMethod(
          instruction.name,
          target,
          instruction.argPrograms,
          context
        );
        stack.push(result);
        ip += 1;
        break;
      }
      case "Jump":
        ip += instruction.offset;
        break;
      case "JumpIfFalse": {
        const value = stack.pop();
        if (!toBoolean(value)) {
          ip += instruction.offset;
        } else {
          ip += 1;
        }
        break;
      }
      case "JumpIfTrue": {
        const value = stack.pop();
        if (toBoolean(value)) {
          ip += instruction.offset;
        } else {
          ip += 1;
        }
        break;
      }
      default:
        ip += 1;
        break;
    }
  }
  return stack.pop();
}

// src/compiler/index.ts
function compile(expression) {
  const tokens = lex(expression);
  const ast = parse(tokens);
  return compileAst(ast);
}
function evaluate(expression, context) {
  try {
    const compiled = compile(expression);
    return interpret(compiled.instructions, context);
  } catch {
    return void 0;
  }
}
function evaluateFilter(node, context) {
  if (!node) return true;
  if (typeof node === "string") {
    return Boolean(evaluate(node, context));
  }
  if ("and" in node) {
    return node.and.every((child) => evaluateFilter(child, context));
  }
  if ("or" in node) {
    return node.or.some((child) => evaluateFilter(child, context));
  }
  if ("not" in node) {
    return !node.not.every((child) => evaluateFilter(child, context));
  }
  return true;
}

// src/resolver.ts
function normalizeStringArray(values) {
  if (!Array.isArray(values)) return [];
  return values.filter((value) => typeof value === "string");
}
function getFilePath(fileData, slug2) {
  if (typeof fileData.relativePath === "string") return fileData.relativePath;
  if (typeof fileData.filePath === "string") return fileData.filePath;
  return slug2 ? `${slug2}.md` : "";
}
function getFileName(path) {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
}
function getBaseName(path) {
  const fileName = getFileName(path);
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}
function toDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }
  return void 0;
}
function buildFileProperties(fileData, slug2, frontmatter) {
  const filePath = getFilePath(fileData, slug2);
  const baseName = filePath ? getBaseName(filePath) : getBaseName(slug2);
  const name = baseName || slug2.split("/").pop() || "Untitled";
  const basename = baseName || slug2.split("/").pop() || "Untitled";
  const lastSlash = filePath.lastIndexOf("/");
  const folder = lastSlash >= 0 ? filePath.slice(0, lastSlash) : "";
  const lastDot = filePath.lastIndexOf(".");
  const ext = lastDot >= 0 ? filePath.slice(lastDot + 1) : "";
  const tags = normalizeStringArray(frontmatter.tags);
  const links = normalizeStringArray(fileData.links ?? fileData.outgoingLinks);
  const embeds = normalizeStringArray(fileData.embeds);
  const dates = fileData.dates;
  const ctime = toDate(dates?.created);
  const mtime = toDate(dates?.modified);
  return {
    name,
    basename,
    path: filePath,
    folder,
    ext,
    tags,
    links,
    embeds,
    created: ctime?.toISOString(),
    modified: mtime?.toISOString(),
    ctime,
    mtime
  };
}
function compareSort(a, b) {
  if (a === b) return 0;
  if (a === void 0 || a === null) return 1;
  if (b === void 0 || b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const dateA = typeof a === "string" ? Date.parse(a) : NaN;
  const dateB = typeof b === "string" ? Date.parse(b) : NaN;
  if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) return dateA - dateB;
  return String(a).localeCompare(String(b));
}
function buildSortKeys(view) {
  if (view?.sort && view.sort.length > 0) return view.sort;
  if (view?.groupBy?.property) {
    return [{ property: view.groupBy.property, direction: view.groupBy.direction ?? "ASC" }];
  }
  if (view?.order && view.order.length > 0) {
    return view.order.map((property) => ({ property, direction: "ASC" }));
  }
  return [];
}
function sortEntries(entries, view) {
  const sortKeys = buildSortKeys(view);
  if (sortKeys.length === 0) return entries;
  return [...entries].sort((left, right) => {
    for (const key of sortKeys) {
      const sign = key.direction === "DESC" ? -1 : 1;
      const leftValue = resolvePropertyValue(key.property, {
        note: left.properties,
        file: left.fileProperties,
        formula: left.formulaValues
      });
      const rightValue = resolvePropertyValue(key.property, {
        note: right.properties,
        file: right.fileProperties,
        formula: right.formulaValues
      });
      const cmp = compareSort(leftValue, rightValue);
      if (cmp !== 0) return sign * cmp;
    }
    return 0;
  });
}
function resolveBasesEntries(basesData, allFiles, view, selfContext) {
  const entries = [];
  const formulas = basesData.formulas ?? {};
  const fileLookup = /* @__PURE__ */ new Map();
  for (const fd of allFiles) {
    if (fd.unlisted === true) continue;
    const fdSlug = typeof fd.slug === "string" ? fd.slug : "";
    if (!fdSlug) continue;
    const fdPath = getFilePath(fd, fdSlug);
    const fm = fd.frontmatter ?? {};
    const fp = buildFileProperties(fd, fdSlug, fm);
    const fileValue = { ...fp, properties: fm };
    fileLookup.set(fdPath, fileValue);
    const withoutExt = fdPath.replace(/\.md$/, "");
    if (withoutExt !== fdPath) fileLookup.set(withoutExt, fileValue);
    if (fdSlug && !fileLookup.has(fdSlug)) {
      fileLookup.set(fdSlug, fileValue);
    }
    const base = getBaseName(fdPath);
    if (base && !fileLookup.has(base)) {
      fileLookup.set(base, fileValue);
    }
  }
  for (const fileData of allFiles) {
    if (fileData.unlisted === true) continue;
    const slug2 = typeof fileData.slug === "string" ? fileData.slug : "";
    if (!slug2) continue;
    const filePath = typeof fileData.filePath === "string" ? fileData.filePath : "";
    if (filePath.endsWith(".base") || slug2.endsWith(".base")) continue;
    const frontmatter = fileData.frontmatter ?? {};
    const fileProperties = buildFileProperties(fileData, slug2, frontmatter);
    const context = {
      note: frontmatter,
      file: { ...fileProperties, properties: frontmatter },
      formula: {},
      self: selfContext,
      _fileLookup: fileLookup
    };
    for (const [name, expr] of Object.entries(formulas)) {
      context.formula[name] = evaluate(expr, context);
    }
    if (!evaluateFilter(basesData.filters, context)) continue;
    if (view?.filters && !evaluateFilter(view.filters, context)) continue;
    const title = typeof frontmatter.title === "string" ? frontmatter.title : fileProperties.basename || slug2.split("/").pop() || "Untitled";
    entries.push({
      slug: slug2,
      title,
      properties: frontmatter,
      fileProperties,
      formulaValues: context.formula
    });
  }
  const total = entries.length;
  const sorted = sortEntries(entries, view);
  const limited = view?.limit ? sorted.slice(0, view.limit) : sorted;
  return { entries: limited, total };
}

// src/i18n/locales/en-US.ts
var en_US_default = {
  components: {
    bases: {
      title: "Base",
      noData: "No data found.",
      noViews: "No views defined.",
      mapPlaceholder: "Map view is not available in static builds.",
      allNotes: "All notes",
      allEntries: "All entries",
      galleryView: "Gallery",
      boardView: "Board",
      noImage: "No image available",
      uncategorized: "Uncategorized",
      showingCount: "Showing {count} of {total} entries",
      today: "Today",
      unscheduled: "Unscheduled ({count})"
    }
  }
};

// src/i18n/index.ts
var locales = {
  "en-US": en_US_default
};
function i18n(locale) {
  return locales[locale] || en_US_default;
}

// src/registry.ts
var REGISTRY_KEY = /* @__PURE__ */ Symbol.for("@quartz-community/bases-page/viewRegistry");
var ViewRegistry = class {
  views = /* @__PURE__ */ new Map();
  /**
   * Register a view type. If a view with the same ID already exists it is
   * silently replaced — this lets config-level `customViews` override built-in
   * renderers for the same type.
   */
  register(registration) {
    this.views.set(registration.id, registration);
  }
  /** Look up a registered view type by ID. */
  get(id) {
    return this.views.get(id);
  }
  /** Return all registered view types (insertion order). */
  getAll() {
    return Array.from(this.views.values());
  }
  /** Check whether a view type is registered. */
  has(id) {
    return this.views.has(id);
  }
  /** Remove a view type registration. Returns true if it existed. */
  unregister(id) {
    return this.views.delete(id);
  }
};
var g = globalThis;
var viewRegistry = g[REGISTRY_KEY] ??= new ViewRegistry();
function registerCustomViews(customs) {
  for (const [id, render] of Object.entries(customs)) {
    viewRegistry.register({ id, name: id, render });
  }
}

// src/components/ViewSelector.tsx
import { jsx as jsx2 } from "preact/jsx-runtime";
function ViewSelector({ views, activeIndex }) {
  if (views.length <= 1) return null;
  return /* @__PURE__ */ jsx2("div", { class: "bases-view-tabs", role: "tablist", children: views.map((view, index) => /* @__PURE__ */ jsx2(
    "button",
    {
      type: "button",
      class: index === activeIndex ? "is-active" : "",
      "data-view-index": index,
      children: view.name ?? view.type
    }
  )) });
}

// src/components/shared/links.tsx
import { jsx as jsx3 } from "preact/jsx-runtime";
var WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
var MDLINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
var URL_RE = /https?:\/\/[^\s<>]+/g;
function renderTextWithLinks(text, ctx) {
  const segments = [];
  const transformOpts = {
    strategy: ctx.linkResolution,
    allSlugs: ctx.allSlugs
  };
  for (const match of text.matchAll(WIKILINK_RE)) {
    const target = match[1] ?? "";
    const display = match[2] ?? target;
    const href = transformLink(ctx.slug, target, transformOpts);
    segments.push({
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      node: /* @__PURE__ */ jsx3("a", { href, class: "internal internal-link", children: display })
    });
  }
  for (const match of text.matchAll(MDLINK_RE)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const overlaps = segments.some((segment) => start < segment.end && end > segment.start);
    if (overlaps) continue;
    const display = match[1] ?? "";
    const href = match[2] ?? "";
    const isExternal = href.startsWith("http://") || href.startsWith("https://");
    const resolvedHref = isExternal ? href : String(transformLink(ctx.slug, href, transformOpts));
    segments.push({
      start,
      end,
      node: /* @__PURE__ */ jsx3(
        "a",
        {
          href: resolvedHref,
          class: isExternal ? "external external-link" : "internal internal-link",
          ...isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {},
          children: display || href
        }
      )
    });
  }
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const overlaps = segments.some((segment) => start < segment.end && end > segment.start);
    if (overlaps) continue;
    segments.push({
      start,
      end,
      node: /* @__PURE__ */ jsx3("a", { href: match[0], class: "external external-link", target: "_blank", rel: "noopener noreferrer", children: match[0] })
    });
  }
  if (segments.length === 0) return [text];
  segments.sort((a, b) => a.start - b.start);
  const result = [];
  let cursor = 0;
  for (const segment of segments) {
    if (segment.start > cursor) {
      result.push(text.slice(cursor, segment.start));
    }
    result.push(segment.node);
    cursor = segment.end;
  }
  if (cursor < text.length) {
    result.push(text.slice(cursor));
  }
  return result;
}

// src/components/shared/cell.tsx
import { Fragment as Fragment2, jsx as jsx4, jsxs as jsxs2 } from "preact/jsx-runtime";
function isFileValue2(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value;
  return typeof record.name === "string" && typeof record.basename === "string" && typeof record.path === "string" && typeof record.folder === "string" && typeof record.ext === "string";
}
function formatValue(value) {
  if (value === void 0 || value === null) return "";
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function isTagColumn(columnId) {
  if (!columnId) return false;
  const normalized = columnId.replace(/^note\./, "").replace(/^file\./, "").toLowerCase();
  return normalized === "tags" || normalized === "tag";
}
function renderTagValue(value, ctx) {
  const tag = String(value).replace(/^#/, "");
  const slugged = slugifyPath(tag);
  const href = transformLink(ctx.slug, `tags/${slugged}`, {
    strategy: ctx.linkResolution,
    allSlugs: ctx.allSlugs
  });
  return /* @__PURE__ */ jsx4("a", { href, class: "internal internal-link tag-link", children: tag });
}
function renderCellValue(value, ctx, columnId) {
  if (value === null || value === void 0) {
    return /* @__PURE__ */ jsx4("span", { class: "bases-empty", children: "\u2014" });
  }
  if (typeof value === "boolean") {
    return /* @__PURE__ */ jsx4("input", { type: "checkbox", checked: value, disabled: true });
  }
  if (typeof value === "number") {
    return /* @__PURE__ */ jsx4("span", { class: "bases-number", children: value });
  }
  if (typeof value === "string") {
    if (isTagColumn(columnId)) {
      return renderTagValue(value, ctx);
    }
    const parts = renderTextWithLinks(value, ctx);
    return /* @__PURE__ */ jsx4("span", { class: "bases-text", children: parts });
  }
  if (Array.isArray(value)) {
    const items = value.map((item, index) => /* @__PURE__ */ jsxs2(Fragment2, { children: [
      index > 0 && /* @__PURE__ */ jsx4("span", { class: "bases-separator", children: ", " }),
      renderCellValue(item, ctx, columnId)
    ] }));
    return /* @__PURE__ */ jsx4("span", { class: "bases-list", children: items });
  }
  if (typeof value === "object") {
    if (isFileValue2(value)) {
      const href = transformLink(
        ctx.slug,
        slugifyPath(value.path.replace(/\.md$/, "")),
        {
          strategy: ctx.linkResolution,
          allSlugs: ctx.allSlugs
        }
      );
      return /* @__PURE__ */ jsx4("a", { href, class: "internal internal-link", children: value.basename });
    }
    return /* @__PURE__ */ jsx4("code", { children: JSON.stringify(value) });
  }
  return String(value);
}
function isEmptyValue(value) {
  if (value === void 0 || value === null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}
function getColumnLabel(column, basesData) {
  const config = basesData.properties?.[column];
  if (config?.displayName) return config.displayName;
  const segment = column.split(".").pop() ?? column;
  return segment.split("_").map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : part).join(" ");
}
var DEFAULT_HIDDEN_COLUMNS = /* @__PURE__ */ new Set(["publish"]);
function getColumns(view, basesData, entries) {
  if (view.order && view.order.length > 0) return view.order;
  const columns = /* @__PURE__ */ new Set();
  columns.add("file.name");
  const propertyKeys = basesData.properties ? Object.keys(basesData.properties) : [];
  if (propertyKeys.length > 0) {
    propertyKeys.forEach((key) => {
      columns.add(key);
    });
  } else if (entries.length > 0) {
    const firstEntry = entries[0];
    if (firstEntry) {
      Object.keys(firstEntry.properties).forEach((key) => {
        columns.add(key);
      });
    }
  }
  DEFAULT_HIDDEN_COLUMNS.forEach((key) => columns.delete(key));
  return Array.from(columns);
}
function getNestedValue2(value, path) {
  let current = value;
  for (const segment of path) {
    if (segment === "") continue;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (Number.isNaN(index)) return void 0;
      current = current[index];
      continue;
    }
    if (current && typeof current === "object") {
      const record = current;
      current = record[segment];
      continue;
    }
    return void 0;
  }
  return current;
}
function resolveEntryPropertyValue(column, entry) {
  if (column.startsWith("note.")) {
    return getNestedValue2(entry.properties, column.slice(5).split("."));
  }
  if (column.startsWith("file.")) {
    return getNestedValue2(entry.fileProperties, column.slice(5).split("."));
  }
  if (column.startsWith("formula.")) {
    return getNestedValue2(entry.formulaValues, column.slice(8).split("."));
  }
  return getNestedValue2(entry.properties, column.split("."));
}

// src/components/views/board.tsx
import { jsx as jsx5, jsxs as jsxs3 } from "preact/jsx-runtime";
function formatMessage(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template
  );
}
var BoardView = ({
  entries,
  view,
  basesData,
  total,
  locale,
  slug: slug2,
  allSlugs,
  linkResolution
}) => {
  const localeStrings = i18n(locale).components.bases;
  const groupProperty = view.groupBy?.property ?? view.boardProperty;
  const columns = getColumns(view, basesData, entries).filter((column) => column !== groupProperty);
  const groups = /* @__PURE__ */ new Map();
  const emptyLabel = groupProperty ? localeStrings.uncategorized : localeStrings.allEntries;
  const transformOpts = { strategy: linkResolution, allSlugs };
  for (const entry of entries) {
    const rawValue = groupProperty ? resolveEntryPropertyValue(groupProperty, entry) : void 0;
    const label = isEmptyValue(rawValue) ? emptyLabel : formatValue(rawValue);
    const key = label || emptyLabel;
    const existing = groups.get(key);
    if (existing) {
      existing.entries.push(entry);
    } else {
      groups.set(key, { label: key, entries: [entry] });
    }
  }
  if (groups.size === 0) {
    groups.set(localeStrings.allEntries, { label: localeStrings.allEntries, entries });
  }
  return /* @__PURE__ */ jsxs3("div", { class: "bases-board-wrapper", children: [
    /* @__PURE__ */ jsx5("div", { class: "bases-view-meta", children: formatMessage(localeStrings.showingCount, {
      count: entries.length,
      total
    }) }),
    /* @__PURE__ */ jsx5("div", { class: "bases-board", children: Array.from(groups.values()).map((group) => /* @__PURE__ */ jsxs3("div", { class: "bases-board-column", children: [
      /* @__PURE__ */ jsxs3("div", { class: "bases-board-column-header", children: [
        /* @__PURE__ */ jsx5("span", { children: group.label }),
        /* @__PURE__ */ jsx5("span", { class: "bases-board-count", children: group.entries.length })
      ] }),
      /* @__PURE__ */ jsx5("div", { class: "bases-board-column-body", children: group.entries.map((entry) => {
        const ctx = { slug: slug2, allSlugs, linkResolution };
        return /* @__PURE__ */ jsxs3("div", { class: "bases-board-card", children: [
          /* @__PURE__ */ jsx5(
            "a",
            {
              href: transformLink(slug2, entry.slug, transformOpts),
              class: "internal internal-link",
              "data-slug": entry.slug,
              children: entry.title
            }
          ),
          columns.length > 0 && /* @__PURE__ */ jsx5("div", { class: "bases-board-card-meta", children: columns.map((column) => {
            const value = resolveEntryPropertyValue(column, entry);
            if (isEmptyValue(value)) return null;
            return /* @__PURE__ */ jsxs3("div", { class: "bases-board-card-row", children: [
              /* @__PURE__ */ jsx5("span", { class: "bases-board-card-label", children: getColumnLabel(column, basesData) }),
              /* @__PURE__ */ jsx5("span", { class: "bases-board-card-value", children: renderCellValue(value, ctx, column) })
            ] });
          }) })
        ] });
      }) })
    ] })) })
  ] });
};
var boardViewRegistration = {
  id: "board",
  name: "Board",
  icon: "columns",
  render: BoardView
};

// src/components/scripts/calendar.inline.ts
var calendar_inline_default = `var M=["January","February","March","April","May","June","July","August","September","October","November","December"];function h(e){return String(e).padStart(2,"0")}function D(e,t){return new Date(e,t+1,0).getDate()}function N(e,t){return new Date(e,t,1).getDay()}function w(e,t,n){let c=document.createElement("div");c.className="bases-calendar-day"+(t?" is-today":"");let d=document.createElement("span");if(d.className="bases-calendar-daynum",d.textContent=String(e),c.appendChild(d),n&&n.length>0){let a=document.createElement("div");a.className="bases-calendar-entries",n.forEach(s=>{let r=document.createElement("a");r.href=s.href,r.className="internal internal-link bases-calendar-chip",r.dataset.slug=s.slug,r.title=s.tooltip,r.textContent=s.title,a.appendChild(r)}),c.appendChild(a)}return c}function E(e,t,n,c,d){let a=e.querySelector(".bases-calendar-days"),s=e.querySelector(".bases-calendar-label");if(!a||!s)return;a.innerHTML="";let r=N(t,n),m=D(t,n),y=Math.ceil((r+m)/7)*7,o=document.createDocumentFragment();for(let i=0;i<y;i++){let l=i-r+1;if(l<1||l>m){let p=document.createElement("div");p.className="bases-calendar-day is-outside",o.appendChild(p);continue}let u=t+"-"+h(n+1)+"-"+h(l);o.appendChild(w(l,u===d,c[u]))}a.appendChild(o),s.textContent=M[n]+" "+t,e.dataset.currentYear=String(t),e.dataset.currentMonth=String(n),document.dispatchEvent(new CustomEvent("render"))}function L(e,t){if(e.dataset.calendarReady==="1")return;e.dataset.calendarReady="1";let n=e.querySelector('script[type="application/json"]');if(!n)return;let c;try{c=JSON.parse(n.textContent)}catch{return}let d=c.byDay||{},a=new Date,s=a.getFullYear()+"-"+h(a.getMonth()+1)+"-"+h(a.getDate()),r=Number(e.dataset.initialYear),m=Number(e.dataset.initialMonth);e.dataset.currentYear=String(r),e.dataset.currentMonth=String(m);let y=g=>{let S=Number(e.dataset.currentYear),C=Number(e.dataset.currentMonth),v=new Date(S,C+g,1);E(e,v.getFullYear(),v.getMonth(),d,s)},o=e.querySelector(".bases-calendar-prev"),i=e.querySelector(".bases-calendar-next"),l=e.querySelector(".bases-calendar-today-btn"),u=()=>y(-1),p=()=>y(1),f=()=>E(e,a.getFullYear(),a.getMonth(),d,s);o&&(o.addEventListener("click",u),t.push(()=>o.removeEventListener("click",u))),i&&(i.addEventListener("click",p),t.push(()=>i.removeEventListener("click",p))),l&&(l.addEventListener("click",f),t.push(()=>l.removeEventListener("click",f)))}function b(){let e=document.querySelectorAll(".bases-calendar");if(e.length===0)return;let t=[];e.forEach(n=>{L(n,t)}),window.addCleanup&&window.addCleanup(()=>{t.forEach(n=>{n()})})}document.addEventListener("nav",()=>{b()});document.addEventListener("render",()=>{b()});b();
`;

// src/components/views/calendar.tsx
import { jsx as jsx6, jsxs as jsxs4 } from "preact/jsx-runtime";
function formatMessage2(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template
  );
}
var WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
var MAX_SPAN_DAYS = 60;
function pad2(n) {
  return String(n).padStart(2, "0");
}
function parseDateParts(value) {
  if (value === null || value === void 0 || value === "") return void 0;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return void 0;
    return { year: value.getUTCFullYear(), month: value.getUTCMonth(), day: value.getUTCDate() };
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return void 0;
    return { year: parsed.getUTCFullYear(), month: parsed.getUTCMonth(), day: parsed.getUTCDate() };
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return void 0;
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (dateOnly) {
      const [, y, m, d] = dateOnly;
      return { year: Number(y), month: Number(m) - 1, day: Number(d) };
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return void 0;
    return { year: parsed.getFullYear(), month: parsed.getMonth(), day: parsed.getDate() };
  }
  return void 0;
}
function dayKey(parts) {
  return `${parts.year}-${pad2(parts.month + 1)}-${pad2(parts.day)}`;
}
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function firstWeekday(year, month) {
  return new Date(year, month, 1).getDay();
}
function renderGrid(year, month0, dayInfoMap, today) {
  const leading = firstWeekday(year, month0);
  const totalDays = daysInMonth(year, month0);
  const cellCount = Math.ceil((leading + totalDays) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, i) => i - leading + 1);
  return cells.map((dayNum) => {
    if (dayNum < 1 || dayNum > totalDays) {
      return /* @__PURE__ */ jsx6("div", { class: "bases-calendar-day is-outside" });
    }
    const dayEntries = dayInfoMap.get(dayKey({ year, month: month0, day: dayNum })) ?? [];
    const isToday = year === today.year && month0 === today.month && dayNum === today.day;
    return /* @__PURE__ */ jsxs4("div", { class: `bases-calendar-day${isToday ? " is-today" : ""}`, children: [
      /* @__PURE__ */ jsx6("span", { class: "bases-calendar-daynum", children: dayNum }),
      dayEntries.length > 0 && /* @__PURE__ */ jsx6("div", { class: "bases-calendar-entries", children: dayEntries.map((e) => /* @__PURE__ */ jsx6("a", { href: e.href, class: "internal internal-link bases-calendar-chip", "data-slug": e.slug, title: e.tooltip, children: e.title })) })
    ] });
  });
}
var CalendarView = ({
  entries,
  view,
  basesData,
  total,
  locale,
  slug: slug2,
  allSlugs,
  linkResolution
}) => {
  const localeStrings = i18n(locale).components.bases;
  const startProp = typeof view.startDate === "string" && view.startDate || typeof view.date === "string" && view.date || typeof view.dateField === "string" && view.dateField || typeof view.dateProperty === "string" && view.dateProperty || void 0;
  const endProp = typeof view.endDate === "string" ? view.endDate : void 0;
  const orderColumns = (view.order && view.order.length > 0 ? view.order : []).filter(
    (column) => column !== startProp && column !== endProp && column !== "file.name"
  );
  const transformOpts = { strategy: linkResolution, allSlugs };
  const byDay = /* @__PURE__ */ new Map();
  const unscheduled = [];
  const addToDay = (parts, entry) => {
    const key = dayKey(parts);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(entry);
    else byDay.set(key, [entry]);
  };
  for (const entry of entries) {
    const startValue = startProp ? resolveEntryPropertyValue(startProp, entry) : void 0;
    const startParts = parseDateParts(startValue);
    if (!startParts) {
      unscheduled.push(entry);
      continue;
    }
    const endValue = endProp ? resolveEntryPropertyValue(endProp, entry) : void 0;
    const endParts = parseDateParts(endValue);
    if (!endParts) {
      addToDay(startParts, entry);
      continue;
    }
    let cursor = new Date(startParts.year, startParts.month, startParts.day);
    const end = new Date(endParts.year, endParts.month, endParts.day);
    let guard = 0;
    while (cursor.getTime() <= end.getTime() && guard < MAX_SPAN_DAYS) {
      addToDay({ year: cursor.getFullYear(), month: cursor.getMonth(), day: cursor.getDate() }, entry);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      guard += 1;
    }
  }
  const dayInfoMap = /* @__PURE__ */ new Map();
  for (const [key, dayEntries] of byDay) {
    dayInfoMap.set(
      key,
      dayEntries.map((entry) => {
        const tooltipParts = orderColumns.map((column) => {
          const value = resolveEntryPropertyValue(column, entry);
          if (isEmptyValue(value)) return void 0;
          return `${getColumnLabel(column, basesData)}: ${Array.isArray(value) ? value.join(", ") : String(value)}`;
        }).filter((part) => Boolean(part));
        return {
          title: entry.title,
          href: String(transformLink(slug2, entry.slug, transformOpts)),
          slug: entry.slug,
          tooltip: [entry.title, ...tooltipParts].join(" \xB7 ")
        };
      })
    );
  }
  const now = /* @__PURE__ */ new Date();
  const today = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  const payloadJson = JSON.stringify({ byDay: Object.fromEntries(dayInfoMap) }).replace(
    /<\/script/gi,
    "<\\/script"
  );
  return /* @__PURE__ */ jsxs4("div", { class: "bases-calendar-wrapper", children: [
    /* @__PURE__ */ jsx6("div", { class: "bases-view-meta", children: formatMessage2(localeStrings.showingCount, { count: entries.length, total }) }),
    /* @__PURE__ */ jsxs4("div", { class: "bases-calendar", "data-initial-year": today.year, "data-initial-month": today.month, children: [
      /* @__PURE__ */ jsx6("script", { type: "application/json", class: "bases-calendar-data", dangerouslySetInnerHTML: { __html: payloadJson } }),
      /* @__PURE__ */ jsxs4("div", { class: "bases-calendar-nav", children: [
        /* @__PURE__ */ jsx6("button", { type: "button", class: "bases-calendar-nav-btn bases-calendar-prev", "aria-label": "Previous month", children: "\u2039" }),
        /* @__PURE__ */ jsxs4("span", { class: "bases-calendar-label", children: [
          MONTH_LABELS[today.month],
          " ",
          today.year
        ] }),
        /* @__PURE__ */ jsx6("button", { type: "button", class: "bases-calendar-nav-btn bases-calendar-today-btn", children: localeStrings.today }),
        /* @__PURE__ */ jsx6("button", { type: "button", class: "bases-calendar-nav-btn bases-calendar-next", "aria-label": "Next month", children: "\u203A" })
      ] }),
      /* @__PURE__ */ jsx6("div", { class: "bases-calendar-weekdays", children: WEEKDAY_LABELS.map((label) => /* @__PURE__ */ jsx6("span", { children: label })) }),
      /* @__PURE__ */ jsx6("div", { class: "bases-calendar-days", children: renderGrid(today.year, today.month, dayInfoMap, today) })
    ] }),
    unscheduled.length > 0 && /* @__PURE__ */ jsxs4("div", { class: "bases-calendar-unscheduled", children: [
      /* @__PURE__ */ jsx6("div", { class: "bases-calendar-unscheduled-title", children: formatMessage2(localeStrings.unscheduled, { count: unscheduled.length }) }),
      /* @__PURE__ */ jsx6("div", { class: "bases-list", children: unscheduled.map((entry) => /* @__PURE__ */ jsx6(
        "a",
        {
          href: transformLink(slug2, entry.slug, transformOpts),
          class: "internal internal-link bases-calendar-chip",
          "data-slug": entry.slug,
          children: entry.title
        }
      )) })
    ] })
  ] });
};
var calendarViewRegistration = {
  id: "calendar",
  name: "Calendar",
  icon: "calendar",
  render: CalendarView,
  afterDOMLoaded: calendar_inline_default
};

// src/components/views/cards.tsx
import { jsx as jsx7, jsxs as jsxs5 } from "preact/jsx-runtime";
function formatMessage3(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template
  );
}
var HEX_COLOR_RE = /^#(?:[0-9a-f]{3}){1,2}$/i;
var WIKILINK_RE2 = /^\[\[(.+?)(?:\|.*)?\]\]$/;
function resolveImageSrc(raw, opts) {
  if (!raw) return { src: "", isColor: false };
  if (HEX_COLOR_RE.test(raw)) {
    return { src: raw, isColor: true };
  }
  const wikiMatch = WIKILINK_RE2.exec(raw);
  if (wikiMatch?.[1]) {
    const target = wikiMatch[1].trim();
    const resolved = transformLink(opts.slug, target, {
      strategy: opts.linkResolution,
      allSlugs: opts.allSlugs
    });
    return { src: String(resolved), isColor: false };
  }
  return { src: raw, isColor: false };
}
var CardsView = ({
  entries,
  view,
  basesData,
  total,
  locale,
  slug: slug2,
  allSlugs,
  linkResolution
}) => {
  const imageProperty = typeof view.image === "string" ? view.image : void 0;
  const cardMetaColumns = view.order && view.order.length > 0 ? view.order.filter((column) => column !== imageProperty && column !== "file.name") : [];
  const localeStrings = i18n(locale).components.bases;
  const cardSize = view.cardSize;
  const aspectRatio = view.imageAspectRatio ?? view.cardAspect;
  const imageFit = view.imageFit === "contain" ? "contain" : "cover";
  const gridStyle = typeof cardSize === "number" && cardSize > 0 ? { gridTemplateColumns: `repeat(auto-fit, minmax(${cardSize}px, 1fr))` } : void 0;
  const imageOpts = { slug: slug2, allSlugs, linkResolution };
  const transformOpts = { strategy: linkResolution, allSlugs };
  return /* @__PURE__ */ jsxs5("div", { class: "bases-cards-wrapper", children: [
    /* @__PURE__ */ jsx7("div", { class: "bases-view-meta", children: formatMessage3(localeStrings.showingCount, {
      count: entries.length,
      total
    }) }),
    /* @__PURE__ */ jsx7("div", { class: "bases-cards", style: gridStyle, children: entries.map((entry) => {
      const ctx = { slug: slug2, allSlugs, linkResolution };
      const imageValue = imageProperty ? resolveEntryPropertyValue(imageProperty, entry) : void 0;
      const rawImage = imageValue ? String(imageValue) : "";
      const { src: imageSrc, isColor } = resolveImageSrc(rawImage, imageOpts);
      const imageAspect = typeof aspectRatio === "number" && aspectRatio > 0 ? { aspectRatio: String(aspectRatio) } : void 0;
      const href = transformLink(slug2, entry.slug, transformOpts);
      return /* @__PURE__ */ jsxs5("a", { href, class: "internal internal-link bases-card", "data-slug": entry.slug, children: [
        imageSrc && !isColor && /* @__PURE__ */ jsx7("div", { class: "bases-card-image", style: imageAspect, children: /* @__PURE__ */ jsx7(
          "img",
          {
            src: imageSrc,
            alt: entry.title,
            loading: "lazy",
            style: { objectFit: imageFit }
          }
        ) }),
        imageSrc && isColor && /* @__PURE__ */ jsx7(
          "div",
          {
            class: "bases-card-image bases-card-color",
            style: { ...imageAspect, backgroundColor: imageSrc }
          }
        ),
        /* @__PURE__ */ jsxs5("div", { class: "bases-card-body", children: [
          /* @__PURE__ */ jsx7("span", { class: "bases-card-title", children: entry.title }),
          /* @__PURE__ */ jsx7("div", { class: "bases-card-meta", children: cardMetaColumns.map((column) => {
            const value = resolveEntryPropertyValue(column, entry);
            if (isEmptyValue(value)) return null;
            return /* @__PURE__ */ jsxs5("div", { class: "bases-card-row", children: [
              /* @__PURE__ */ jsx7("span", { class: "bases-card-label", children: getColumnLabel(column, basesData) }),
              /* @__PURE__ */ jsx7("span", { class: "bases-card-value", children: renderCellValue(value, ctx, column) })
            ] });
          }) })
        ] })
      ] });
    }) })
  ] });
};
var cardsViewRegistration = {
  id: "cards",
  name: "Cards",
  icon: "layout-grid",
  render: CardsView
};

// src/components/views/gallery.tsx
import { jsx as jsx8, jsxs as jsxs6 } from "preact/jsx-runtime";
function formatMessage4(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template
  );
}
var GalleryView = ({
  entries,
  view,
  total,
  locale,
  slug: slug2,
  allSlugs,
  linkResolution
}) => {
  const imageProperty = typeof view.image === "string" ? view.image : void 0;
  const localeStrings = i18n(locale).components.bases;
  const columns = typeof view.cardSize === "number" && view.cardSize > 0 ? Math.round(view.cardSize) : 3;
  const gridStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
  const imageOpts = { slug: slug2, allSlugs, linkResolution };
  const transformOpts = { strategy: linkResolution, allSlugs };
  return /* @__PURE__ */ jsxs6("div", { class: "bases-gallery-wrapper", children: [
    /* @__PURE__ */ jsx8("div", { class: "bases-view-meta", children: formatMessage4(localeStrings.showingCount, {
      count: entries.length,
      total
    }) }),
    /* @__PURE__ */ jsx8("div", { class: "bases-gallery", style: gridStyle, children: entries.map((entry) => {
      const imageValue = imageProperty ? resolveEntryPropertyValue(imageProperty, entry) : void 0;
      const rawImage = imageValue ? String(imageValue) : "";
      const { src: imageSrc, isColor } = resolveImageSrc(rawImage, imageOpts);
      return /* @__PURE__ */ jsxs6("div", { class: "bases-gallery-item", children: [
        /* @__PURE__ */ jsx8("div", { class: "bases-gallery-image", children: imageSrc && !isColor ? /* @__PURE__ */ jsx8("img", { src: imageSrc, alt: entry.title, loading: "lazy" }) : imageSrc && isColor ? /* @__PURE__ */ jsx8("span", { class: "bases-gallery-placeholder", style: { background: imageSrc } }) : /* @__PURE__ */ jsx8(
          "span",
          {
            class: "bases-gallery-placeholder",
            role: "img",
            "aria-label": localeStrings.noImage
          }
        ) }),
        /* @__PURE__ */ jsx8("div", { class: "bases-gallery-title", children: /* @__PURE__ */ jsx8(
          "a",
          {
            href: transformLink(slug2, entry.slug, transformOpts),
            class: "internal internal-link",
            "data-slug": entry.slug,
            children: entry.title
          }
        ) })
      ] });
    }) })
  ] });
};
var galleryViewRegistration = {
  id: "gallery",
  name: "Gallery",
  icon: "image",
  render: GalleryView
};

// src/components/views/list.tsx
import { Fragment as Fragment3, jsx as jsx9, jsxs as jsxs7 } from "preact/jsx-runtime";
function formatMessage5(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template
  );
}
var ListView = ({
  entries,
  view,
  basesData,
  total,
  locale,
  slug: slug2,
  allSlugs,
  linkResolution
}) => {
  const columns = getColumns(view, basesData, entries);
  const localeStrings = i18n(locale).components.bases;
  const transformOpts = { strategy: linkResolution, allSlugs };
  return /* @__PURE__ */ jsxs7("div", { class: "bases-list-wrapper", children: [
    /* @__PURE__ */ jsx9("div", { class: "bases-view-meta", children: formatMessage5(localeStrings.showingCount, {
      count: entries.length,
      total
    }) }),
    /* @__PURE__ */ jsx9("div", { class: "bases-list-group", children: /* @__PURE__ */ jsx9("div", { class: "bases-list-group-list", children: entries.map((entry) => {
      const ctx = { slug: slug2, allSlugs, linkResolution };
      const primaryColumn = columns[0] ?? "file.name";
      const secondaryColumns = columns.slice(1);
      const primaryValue = primaryColumn === "file.name" ? /* @__PURE__ */ jsx9(
        "a",
        {
          href: transformLink(slug2, entry.slug, transformOpts),
          class: "internal internal-link",
          "data-slug": entry.slug,
          children: entry.title
        }
      ) : renderCellValue(resolveEntryPropertyValue(primaryColumn, entry), ctx, primaryColumn);
      const secondaryItems = [];
      for (const column of secondaryColumns) {
        const value = resolveEntryPropertyValue(column, entry);
        if (isEmptyValue(value)) continue;
        secondaryItems.push(
          /* @__PURE__ */ jsx9("span", { class: "bases-list-property", children: /* @__PURE__ */ jsx9("span", { class: "bases-rendered-value", children: renderCellValue(value, ctx, column) }) })
        );
      }
      return /* @__PURE__ */ jsx9("div", { class: "bases-list-item", children: /* @__PURE__ */ jsxs7("div", { class: "bases-list-item-properties", children: [
        /* @__PURE__ */ jsxs7("span", { class: "bases-list-property", children: [
          /* @__PURE__ */ jsx9("span", { class: "list-bullet", children: "-" }),
          /* @__PURE__ */ jsx9("span", { class: "bases-rendered-value", children: primaryValue })
        ] }),
        secondaryItems.map((item) => /* @__PURE__ */ jsxs7(Fragment3, { children: [
          /* @__PURE__ */ jsx9("span", { class: "bases-list-separator", children: ", " }),
          item
        ] }))
      ] }) });
    }) }) })
  ] });
};
var listViewRegistration = {
  id: "list",
  name: "List",
  icon: "list",
  render: ListView
};

// src/components/shared/summary.tsx
function computeSummary(values, summary) {
  const nonEmpty = values.filter((value) => value !== void 0 && value !== null && value !== "");
  if (summary === "Empty") return String(values.length - nonEmpty.length);
  if (summary === "Filled") return String(nonEmpty.length);
  if (summary === "Checked") return String(values.filter((value) => value === true).length);
  if (summary === "Unchecked") return String(values.filter((value) => value === false).length);
  if (summary === "Unique") return String(new Set(values.map((value) => String(value))).size);
  const numeric = nonEmpty.map((value) => typeof value === "number" ? value : Number(value)).filter((value) => !Number.isNaN(value));
  if (numeric.length === 0) return summary;
  if (summary === "Sum") return String(numeric.reduce((acc, value) => acc + value, 0));
  if (summary === "Average")
    return String(numeric.reduce((acc, value) => acc + value, 0) / numeric.length);
  if (summary === "Min") return String(Math.min(...numeric));
  if (summary === "Max") return String(Math.max(...numeric));
  if (summary === "Range") return String(Math.max(...numeric) - Math.min(...numeric));
  if (summary === "Median") {
    const sorted = [...numeric].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const upper = sorted[mid] ?? 0;
    const lower = sorted[mid - 1] ?? upper;
    const median = sorted.length % 2 === 0 ? (lower + upper) / 2 : upper;
    return String(median);
  }
  if (summary === "Stddev") {
    const mean = numeric.reduce((acc, value) => acc + value, 0) / numeric.length;
    const variance = numeric.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / numeric.length;
    return String(Math.sqrt(variance));
  }
  return summary;
}

// src/components/views/table.tsx
import { Fragment as Fragment4, jsx as jsx10, jsxs as jsxs8 } from "preact/jsx-runtime";
function formatMessage6(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template
  );
}
function groupEntries(entries, groupProperty, emptyLabel) {
  if (!groupProperty) return null;
  const groups = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const rawValue = resolveEntryPropertyValue(groupProperty, entry);
    const label = isEmptyValue(rawValue) ? emptyLabel : formatValue(rawValue);
    const key = label || emptyLabel;
    const existing = groups.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }
  return groups.size > 0 ? groups : null;
}
function renderRow(entry, columns, view, slug2, allSlugs, linkResolution) {
  const transformOpts = { strategy: linkResolution, allSlugs };
  const ctx = { slug: slug2, allSlugs, linkResolution };
  return /* @__PURE__ */ jsx10("tr", { children: columns.map((column) => {
    const value = resolveEntryPropertyValue(column, entry);
    const display = formatValue(value);
    const isPrimary = column === "file.name" || column === "title";
    const columnWidth = view.columnSize?.[column];
    const style = columnWidth ? { width: `${columnWidth}px`, minWidth: `${columnWidth}px` } : void 0;
    return /* @__PURE__ */ jsx10("td", { "data-value": display, style, children: isPrimary ? /* @__PURE__ */ jsx10(
      "a",
      {
        href: transformLink(slug2, entry.slug, transformOpts),
        class: "internal internal-link",
        "data-slug": entry.slug,
        children: display || entry.title
      }
    ) : renderCellValue(value, ctx, column) });
  }) });
}
var TableView = ({
  entries,
  view,
  basesData,
  total,
  locale,
  slug: slug2,
  allSlugs,
  linkResolution
}) => {
  const columns = getColumns(view, basesData, entries);
  const summaries = view.summaries ?? {};
  const hasSummary = Object.keys(summaries).length > 0;
  const localeStrings = i18n(locale).components.bases;
  const groupProperty = view.groupBy?.property;
  const groupPropertyLabel = groupProperty ? getColumnLabel(groupProperty, basesData) : "";
  const groups = groupEntries(entries, groupProperty, localeStrings.uncategorized);
  return /* @__PURE__ */ jsxs8("div", { class: "bases-table-wrapper", children: [
    /* @__PURE__ */ jsx10("div", { class: "bases-view-meta", children: formatMessage6(localeStrings.showingCount, {
      count: entries.length,
      total
    }) }),
    /* @__PURE__ */ jsxs8("table", { class: "bases-table", "data-view-type": "table", children: [
      /* @__PURE__ */ jsx10("thead", { children: /* @__PURE__ */ jsx10("tr", { children: columns.map((column) => {
        const columnWidth = view.columnSize?.[column];
        const style = columnWidth ? { width: `${columnWidth}px`, minWidth: `${columnWidth}px` } : void 0;
        return /* @__PURE__ */ jsxs8("th", { "data-column": column, "data-sortable": "true", style, children: [
          /* @__PURE__ */ jsx10("span", { class: "bases-table-header", children: getColumnLabel(column, basesData) }),
          /* @__PURE__ */ jsx10("span", { class: "bases-table-header-sort", "aria-hidden": "true" })
        ] });
      }) }) }),
      /* @__PURE__ */ jsx10("tbody", { children: groups ? Array.from(groups.entries()).map(([label, groupEntries2]) => /* @__PURE__ */ jsxs8(Fragment4, { children: [
        /* @__PURE__ */ jsx10("tr", { class: "bases-table-group-header", children: /* @__PURE__ */ jsxs8("td", { colSpan: columns.length, children: [
          groupPropertyLabel && /* @__PURE__ */ jsxs8("span", { class: "bases-table-group-property", children: [
            groupPropertyLabel,
            " "
          ] }),
          /* @__PURE__ */ jsx10("span", { class: "bases-table-group-label", children: label }),
          /* @__PURE__ */ jsx10("span", { class: "bases-table-group-count", children: groupEntries2.length })
        ] }) }),
        groupEntries2.map(
          (entry) => renderRow(entry, columns, view, slug2, allSlugs, linkResolution)
        )
      ] })) : entries.map(
        (entry) => renderRow(entry, columns, view, slug2, allSlugs, linkResolution)
      ) }),
      hasSummary && /* @__PURE__ */ jsx10("tfoot", { children: /* @__PURE__ */ jsx10("tr", { class: "bases-summary-row", children: columns.map((column) => {
        const summary = summaries[column];
        if (!summary) return /* @__PURE__ */ jsx10("td", {});
        const values = entries.map((entry) => resolveEntryPropertyValue(column, entry));
        return /* @__PURE__ */ jsx10("td", { children: computeSummary(values, summary) });
      }) }) })
    ] })
  ] });
};
var tableViewRegistration = {
  id: "table",
  name: "Table",
  icon: "table",
  render: TableView
};

// src/components/views/index.ts
function registerBuiltinViews() {
  viewRegistry.register(tableViewRegistration);
  viewRegistry.register(listViewRegistration);
  viewRegistry.register(cardsViewRegistration);
  viewRegistry.register(galleryViewRegistration);
  viewRegistry.register(boardViewRegistration);
  viewRegistry.register(calendarViewRegistration);
}

// src/components/styles/bases.scss
var bases_default = ".bases-page {\n  width: 100%;\n  max-width: 100%;\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n  overflow: hidden;\n}\n\n.bases-view-tabs {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n}\n.bases-view-tabs button {\n  border: 1px solid var(--lightgray);\n  background: var(--light);\n  color: var(--darkgray);\n  padding: 6px 12px;\n  border-radius: 999px;\n  cursor: pointer;\n  font-size: 0.9rem;\n}\n.bases-view-tabs button.is-active {\n  background: var(--secondary);\n  color: var(--light);\n  border-color: var(--secondary);\n}\n\n.bases-view-container {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n\n.bases-view {\n  display: none;\n}\n.bases-view.is-active {\n  display: block;\n}\n\n.bases-view-meta {\n  font-size: 0.85rem;\n  color: var(--gray);\n  margin-bottom: 8px;\n}\n\n.bases-table-wrapper {\n  width: 100%;\n  overflow-x: auto;\n}\n\n.bases-table {\n  width: 100%;\n  border-collapse: collapse;\n  border: 1px solid var(--lightgray);\n  border-radius: 8px;\n  overflow: hidden;\n}\n.bases-table th,\n.bases-table td {\n  padding: 10px 12px;\n  text-align: left;\n  border-bottom: 1px solid var(--lightgray);\n  font-size: 0.9rem;\n}\n.bases-table thead th {\n  position: sticky;\n  top: 0;\n  background: var(--light);\n  color: var(--dark);\n  font-weight: 600;\n  cursor: pointer;\n}\n.bases-table td .bases-empty {\n  padding: 0;\n  border: 0;\n  background: none;\n  color: var(--gray);\n  display: inline;\n}\n.bases-table td code {\n  font-size: 0.85em;\n  padding: 0.1rem 0.3rem;\n  border-radius: 3px;\n  background: var(--highlight);\n  word-break: break-all;\n}\n.bases-table td .bases-list {\n  flex-direction: row;\n  flex-wrap: wrap;\n  gap: 4px;\n}\n.bases-table td input[type=checkbox] {\n  margin-inline: 0;\n}\n\n.bases-table-header-sort {\n  position: absolute;\n  right: 8px;\n  top: calc(50% - 4px);\n  display: inline-block;\n  width: 8px;\n  height: 8px;\n  margin-left: 6px;\n  border-right: 2px solid transparent;\n  border-bottom: 2px solid transparent;\n}\n\nth.is-sorted-asc .bases-table-header-sort {\n  border-right-color: var(--darkgray);\n  border-bottom-color: var(--darkgray);\n  transform: rotate(-45deg);\n}\n\nth.is-sorted-desc .bases-table-header-sort {\n  border-right-color: var(--darkgray);\n  border-bottom-color: var(--darkgray);\n  transform: rotate(135deg);\n}\n\n.bases-summary-row td {\n  background: var(--light);\n  font-weight: 600;\n  color: var(--darkgray);\n}\n\n.bases-table-group-header td {\n  background: var(--lightgray);\n  font-weight: 600;\n  padding: 8px 12px;\n  border-bottom: 2px solid var(--gray);\n}\n\n.bases-table-group-property {\n  color: var(--gray);\n  font-weight: 400;\n}\n\n.bases-table-group-label {\n  margin-right: 8px;\n}\n\n.bases-table-group-count {\n  background: var(--light);\n  color: var(--darkgray);\n  border-radius: 999px;\n  padding: 2px 8px;\n  font-size: 0.75rem;\n  font-weight: 400;\n}\n\n.bases-separator {\n  color: var(--gray);\n}\n\n.bases-number {\n  font-variant-numeric: tabular-nums;\n}\n\n.bases-list {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 4px;\n}\n\n.bases-list-group {\n  width: 100%;\n}\n\n.bases-list-group-list {\n  display: flex;\n  flex-direction: column;\n}\n\n.bases-list-item {\n  padding: 2px 0;\n}\n\n.bases-list-item-properties {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: baseline;\n  gap: 0;\n}\n\n.bases-list-property {\n  display: inline-flex;\n  align-items: baseline;\n  gap: 4px;\n}\n\n.list-bullet {\n  color: var(--darkgray);\n  user-select: none;\n}\n\n.bases-list-separator {\n  color: var(--gray);\n  margin-right: 4px;\n}\n\n.bases-rendered-value {\n  display: inline;\n}\n\n.bases-cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));\n  gap: 16px;\n}\n\n.bases-card {\n  border: 1px solid var(--lightgray);\n  border-radius: 12px;\n  overflow: hidden;\n  background: var(--light);\n  display: flex;\n  flex-direction: column;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);\n  color: inherit;\n  text-decoration: none;\n  transition: box-shadow 0.15s ease;\n}\n.bases-card:hover {\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);\n}\n\n.bases-card-image {\n  overflow: hidden;\n  background: var(--lightgray);\n}\n.bases-card-image img {\n  width: 100%;\n  height: 100%;\n  display: block;\n  object-fit: cover;\n}\n\n.bases-card-color {\n  min-height: 60px;\n}\n\n.bases-card-title {\n  font-weight: 600;\n  color: var(--dark);\n}\n\n.bases-card-body {\n  padding: 12px;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.bases-card-meta {\n  display: grid;\n  gap: 4px;\n}\n\n.bases-card-row {\n  display: flex;\n  justify-content: space-between;\n  font-size: 0.8rem;\n  color: var(--darkgray);\n}\n\n.bases-card-label {\n  color: var(--gray);\n}\n\n.bases-map-placeholder {\n  padding: 24px;\n  border: 1px dashed var(--lightgray);\n  border-radius: 12px;\n  background: var(--light);\n}\n\n.bases-map-message {\n  color: var(--darkgray);\n  margin-top: 12px;\n}\n\n.bases-empty {\n  padding: 24px;\n  text-align: center;\n  color: var(--darkgray);\n  border: 1px dashed var(--lightgray);\n  border-radius: 12px;\n  background: var(--light);\n}\n\n.bases-gallery {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));\n  gap: 16px;\n}\n\n.bases-gallery-item {\n  position: relative;\n  border-radius: 12px;\n  overflow: hidden;\n  border: 1px solid var(--lightgray);\n  background: var(--light);\n}\n\n.bases-gallery-image {\n  aspect-ratio: 4/3;\n  overflow: hidden;\n  background: var(--lightgray);\n}\n\n.bases-gallery-image img,\n.bases-gallery-placeholder {\n  width: 100%;\n  height: 100%;\n  display: block;\n  object-fit: cover;\n}\n\n.bases-gallery-placeholder {\n  background: linear-gradient(135deg, var(--lightgray), var(--highlight));\n}\n\n.bases-gallery-title {\n  position: absolute;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  padding: 10px 12px;\n  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.65) 100%);\n  color: var(--light);\n  font-weight: 600;\n}\n\n.bases-gallery-title a {\n  color: inherit;\n}\n\n.bases-board {\n  display: flex;\n  gap: 16px;\n  overflow-x: auto;\n  padding-bottom: 4px;\n}\n\n.bases-board-column {\n  min-width: min(250px, 80vw);\n  flex-shrink: 0;\n  border: 1px solid var(--lightgray);\n  border-radius: 12px;\n  background: var(--light);\n  display: flex;\n  flex-direction: column;\n}\n\n.bases-board-column-header {\n  position: sticky;\n  top: 0;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  padding: 10px 12px;\n  font-weight: 600;\n  background: var(--light);\n  border-bottom: 1px solid var(--lightgray);\n  border-radius: 12px 12px 0 0;\n  z-index: 1;\n}\n\n.bases-board-count {\n  background: var(--lightgray);\n  color: var(--darkgray);\n  border-radius: 999px;\n  padding: 2px 8px;\n  font-size: 0.75rem;\n}\n\n.bases-board-column-body {\n  padding: 8px;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.bases-board-card {\n  border: 1px solid var(--lightgray);\n  border-radius: 10px;\n  background: var(--light);\n  padding: 10px 12px;\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);\n}\n\n.bases-board-card-meta {\n  display: grid;\n  gap: 4px;\n  font-size: 0.8rem;\n  color: var(--darkgray);\n}\n\n.bases-board-card-row {\n  display: flex;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.bases-board-card-label {\n  color: var(--gray);\n}\n\n.bases-calendar-wrapper {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n\n.bases-calendar-nav {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 12px;\n  margin-bottom: 12px;\n}\n\n.bases-calendar-label {\n  font-weight: 600;\n  color: var(--dark);\n  min-width: 10ch;\n  text-align: center;\n}\n\n.bases-calendar-nav-btn {\n  border: 1px solid var(--lightgray);\n  background: var(--light);\n  color: var(--darkgray);\n  padding: 4px 10px;\n  border-radius: 999px;\n  cursor: pointer;\n  font-size: 0.85rem;\n}\n.bases-calendar-nav-btn:disabled {\n  opacity: 0.4;\n  cursor: default;\n}\n.bases-calendar-nav-btn:not(:disabled):hover {\n  background: var(--lightgray);\n}\n\n.bases-calendar-today-btn {\n  font-weight: 600;\n}\n\n.bases-calendar-weekdays {\n  display: grid;\n  grid-template-columns: repeat(7, 1fr);\n  gap: 4px;\n  margin-bottom: 4px;\n}\n.bases-calendar-weekdays span {\n  text-align: center;\n  font-size: 0.75rem;\n  font-weight: 600;\n  color: var(--gray);\n  text-transform: uppercase;\n}\n\n.bases-calendar-days {\n  display: grid;\n  grid-template-columns: repeat(7, 1fr);\n  grid-auto-rows: minmax(72px, auto);\n  gap: 4px;\n}\n\n.bases-calendar-day {\n  border: 1px solid var(--lightgray);\n  border-radius: 8px;\n  padding: 4px;\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  overflow: hidden;\n}\n.bases-calendar-day.is-outside {\n  border-color: transparent;\n  background: none;\n}\n.bases-calendar-day.is-today {\n  border-color: var(--secondary);\n  background: var(--highlight);\n}\n\n.bases-calendar-daynum {\n  font-size: 0.75rem;\n  color: var(--gray);\n  align-self: flex-end;\n}\n\n.bases-calendar-day.is-today .bases-calendar-daynum {\n  color: var(--secondary);\n  font-weight: 700;\n}\n\n.bases-calendar-entries {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  overflow-y: auto;\n}\n\n.bases-calendar-chip {\n  display: block;\n  font-size: 0.75rem;\n  padding: 2px 6px;\n  border-radius: 6px;\n  background: var(--lightgray);\n  color: var(--dark);\n  text-decoration: none;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.bases-calendar-chip:hover {\n  background: var(--secondary);\n  color: var(--light);\n}\n\n.bases-calendar-unscheduled {\n  border-top: 1px solid var(--lightgray);\n  padding-top: 12px;\n}\n\n.bases-calendar-unscheduled-title {\n  font-size: 0.85rem;\n  font-weight: 600;\n  color: var(--darkgray);\n  margin-bottom: 8px;\n}\n\n@media (max-width: 600px) {\n  .bases-calendar-days {\n    grid-auto-rows: minmax(44px, auto);\n  }\n  .bases-calendar-chip {\n    font-size: 0.65rem;\n  }\n}";

// src/components/scripts/bases.inline.ts
var bases_inline_default = `function f(e,s){let n=e.querySelectorAll(".bases-view-tabs button"),r=e.querySelectorAll(".bases-view");n.forEach(t=>{t.classList.toggle("is-active",t.dataset.viewIndex===String(s))}),r.forEach(t=>{t.classList.toggle("is-active",t.dataset.viewIndex===String(s))})}function p(e,s){let n=Number(e),r=Number(s);return!Number.isNaN(n)&&!Number.isNaN(r)?n-r:String(e).localeCompare(String(s))}function h(e,s,n){return e.length===0||(e.sort((r,t)=>{let i=r.children[s],o=t.children[s],c=i?.dataset?.value??i?.textContent??"",a=o?.dataset?.value??o?.textContent??"";return p(c,a)}),n==="desc"&&e.reverse()),e}function v(e,s,n){let r=e.querySelector("tbody");if(!r)return;let t=Array.from(r.querySelectorAll("tr"));if(n==="none"){let o=e._originalOrder;o&&o.forEach(c=>r.appendChild(c));return}if(e._originalOrder||(e._originalOrder=Array.from(t)),t.some(o=>o.classList.contains("bases-table-group-header"))){let o=[],c=null;for(let a of t)a.classList.contains("bases-table-group-header")?(c={header:a,rows:[]},o.push(c)):c?c.rows.push(a):(c={header:null,rows:[a]},o.push(c));for(let a of o)h(a.rows,s,n);for(let a of o)a.header&&r.appendChild(a.header),a.rows.forEach(l=>r.appendChild(l))}else h(t,s,n),t.forEach(o=>r.appendChild(o))}function b(e,s){e.querySelectorAll(".bases-table").forEach(r=>{let t=r.querySelectorAll("th[data-sortable='true']");t.forEach((i,o)=>{let c=()=>{let a=i.dataset.sortDirection||"none",l=a==="asc"?"desc":a==="desc"?"none":"asc";t.forEach(u=>{u!==i&&(u.dataset.sortDirection="none"),u.classList.remove("is-sorted-asc","is-sorted-desc")}),i.dataset.sortDirection=l,i.classList.toggle("is-sorted-asc",l==="asc"),i.classList.toggle("is-sorted-desc",l==="desc"),v(r,o,l)};i.addEventListener("click",c),s.push(()=>i.removeEventListener("click",c))})})}function g(e,s){let n=e.querySelectorAll(".bases-view-tabs button");if(n.length===0)return;let r=parseInt(e.dataset.initialView||"0",10);f(e,Number.isNaN(r)?0:r),n.forEach(t=>{let i=()=>{let o=parseInt(t.dataset.viewIndex||"0",10);f(e,Number.isNaN(o)?0:o)};t.addEventListener("click",i),s.push(()=>t.removeEventListener("click",i))})}function d(){let e=document.querySelectorAll(".bases-page");if(e.length===0)return;let s=[];e.forEach(n=>{g(n,s),b(n,s)}),window.addCleanup&&window.addCleanup(()=>{s.forEach(n=>{n()})})}document.addEventListener("nav",()=>{d()});document.addEventListener("render",()=>{d()});d();
`;

// src/util/lang.ts
function wrapScripts(scripts) {
  return scripts.map((s) => `(function () {${s}})();`).join("\n").replace(/<\/script/gi, "<\\/script");
}

// src/components/BasesBody.tsx
import { jsx as jsx11, jsxs as jsxs9 } from "preact/jsx-runtime";
var builtinViewsRegistered = false;
var BasesBody_default = ((opts) => {
  const Component = (props) => {
    const locale = props.cfg?.locale ?? "en-US";
    const localeStrings = i18n(locale).components.bases;
    const fileData = props.fileData;
    const basesData = fileData.basesData;
    const basesOptions = fileData.basesOptions ?? opts;
    const basesSelfContext = fileData.basesSelfContext;
    const slug2 = props.fileData.slug ?? "";
    const rawSlugs = props.ctx?.allSlugs ?? [];
    const baseSlugs = new Set(rawSlugs.filter((s) => s.endsWith(".base")));
    const baseAliases = new Set([...baseSlugs].map((s) => s.replace(/\.base$/, "")));
    const allSlugs = rawSlugs.filter((s) => !baseSlugs.has(s) && !baseAliases.has(s));
    const linkResolution = basesOptions?.linkResolution ?? "shortest";
    if (!basesData) {
      return /* @__PURE__ */ jsx11("div", { class: "bases-page bases-empty", children: localeStrings.noData });
    }
    const views = basesData.views ?? [];
    if (views.length === 0) {
      return /* @__PURE__ */ jsx11("div", { class: "bases-page bases-empty", children: localeStrings.noViews });
    }
    const preferredType = basesOptions?.defaultViewType ?? "table";
    const initialIndex = Math.max(
      0,
      views.findIndex((view) => view.type === preferredType)
    );
    if (!builtinViewsRegistered) {
      registerBuiltinViews();
      builtinViewsRegistered = true;
    }
    if (basesOptions?.customViews) {
      registerCustomViews(basesOptions.customViews);
    }
    const activeTypes = new Set(views.map((v) => v.type));
    const viewCssChunks = [];
    const viewScriptChunks = [];
    for (const typeId of activeTypes) {
      const reg = viewRegistry.get(typeId);
      if (reg?.css) viewCssChunks.push(reg.css);
      if (reg?.afterDOMLoaded) viewScriptChunks.push(reg.afterDOMLoaded);
    }
    return /* @__PURE__ */ jsxs9("div", { class: "bases-page", "data-initial-view": initialIndex, children: [
      viewCssChunks.length > 0 && /* @__PURE__ */ jsx11("style", { dangerouslySetInnerHTML: { __html: viewCssChunks.join("\n") } }),
      /* @__PURE__ */ jsx11(ViewSelector, { views, activeIndex: initialIndex, locale }),
      /* @__PURE__ */ jsx11("div", { class: "bases-view-container", children: views.map((view, index) => {
        const { entries, total } = resolveBasesEntries(
          basesData,
          props.allFiles,
          view,
          basesSelfContext
        );
        const registration = viewRegistry.get(view.type);
        const Renderer = registration?.render;
        return /* @__PURE__ */ jsx11(
          "div",
          {
            class: `bases-view ${index === initialIndex ? "is-active" : ""}`,
            "data-view-index": index,
            "data-view-type": view.type,
            children: entries.length === 0 ? /* @__PURE__ */ jsx11("div", { class: "bases-empty", children: localeStrings.noData }) : Renderer ? /* @__PURE__ */ jsx11(
              Renderer,
              {
                entries,
                view,
                basesData,
                total,
                locale,
                slug: slug2,
                allSlugs,
                linkResolution,
                options: registration.options
              }
            ) : /* @__PURE__ */ jsxs9("div", { class: "bases-empty", children: [
              "Unknown view type: ",
              view.type
            ] })
          }
        );
      }) }),
      /* @__PURE__ */ jsx11(
        "script",
        {
          dangerouslySetInnerHTML: { __html: wrapScripts([bases_inline_default, ...viewScriptChunks]) }
        }
      )
    ] });
  };
  Component.css = bases_default;
  return Component;
});
export {
  BasesBody_default as BasesBody,
  ViewSelector
};
