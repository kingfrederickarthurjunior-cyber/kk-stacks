/**
 * STACK ARCHITECT - JAVASCRIPT ENGINE & VISUALIZER
 * Tech Stack: Pure Vanilla JavaScript (ES6+), HTML5, CSS3
 *
 * Implements:
 *   1. Stack ADT Class (LIFO Operations)
 *   2. Syntax & Delimiter Validation Stack
 *   3. Dijkstra's Shunting-Yard Infix-to-Postfix (RPN) Algorithm
 *   4. Postfix Numerical Evaluation Stack
 *   5. Dual-Stack Undo/Redo Engine
 *   6. Dynamic Visual Renderer & Step-by-Step Stepper
 */

// ============================================================================
// 1. GENERIC STACK ABSTRACT DATA TYPE (ADT)
// ============================================================================
class Stack {
  constructor(name = "Stack") {
    this.name = name;
    this.items = [];
  }

  push(element) {
    this.items.push(element);
  }

  pop() {
    if (this.isEmpty()) {
      throw new Error(`Stack Underflow: Cannot pop from empty stack '${this.name}'`);
    }
    return this.items.pop();
  }

  peek() {
    if (this.isEmpty()) {
      return null;
    }
    return this.items[this.items.length - 1];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }

  toArray() {
    return [...this.items];
  }
}

// ============================================================================
// 2. DELIMITER / BRACKET VALIDATION STACK
// ============================================================================
class DelimiterValidator {
  static PAIRS = { ')': '(', ']': '[', '}': '{' };
  static OPENING = new Set(['(', '[', '{']);
  static CLOSING = new Set([')', ']', '}']);

  static validate(expression) {
    const stack = new Stack("BracketStack");

    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];

      if (this.OPENING.has(char)) {
        stack.push({ char, index: i });
      } else if (this.CLOSING.has(char)) {
        if (stack.isEmpty()) {
          return {
            isValid: false,
            message: `Unmatched closing '${char}' at character ${i + 1}`,
            index: i
          };
        }
        const top = stack.pop();
        if (top.char !== this.PAIRS[char]) {
          return {
            isValid: false,
            message: `Mismatched delimiter: opened with '${top.char}' (pos ${top.index + 1}) but closed with '${char}' (pos ${i + 1})`,
            index: i
          };
        }
      }
    }

    if (!stack.isEmpty()) {
      const unclosed = stack.pop();
      return {
        isValid: false,
        message: `Unclosed opening '${unclosed.char}' at character ${unclosed.index + 1}`,
        index: unclosed.index
      };
    }

    return { isValid: true, message: "Delimiters balanced and valid", index: -1 };
  }
}

// ============================================================================
// 3. SHUNTING-YARD INFIX-TO-POSTFIX (RPN) PARSER
// ============================================================================
class ShuntingYardParser {
  static OPERATORS = {
    '^': { prec: 4, assoc: 'R' },
    '*': { prec: 3, assoc: 'L' },
    '/': { prec: 3, assoc: 'L' },
    '%': { prec: 3, assoc: 'L' },
    '+': { prec: 2, assoc: 'L' },
    '-': { prec: 2, assoc: 'L' }
  };

  static FUNCTIONS = new Set(['sqrt', 'abs', 'sin', 'cos', 'tan', 'log', 'ln']);

  static tokenize(expr) {
    const tokens = [];
    let i = 0;
    const n = expr.length;
    let prevType = null;

    while (i < n) {
      const ch = expr[i];

      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Numbers (integers or decimals)
      if (/\d/.test(ch) || ch === '.') {
        let numStr = ch;
        let hasDot = (ch === '.');
        i++;
        while (i < n && (/\d/.test(expr[i]) || (expr[i] === '.' && !hasDot))) {
          if (expr[i] === '.') hasDot = true;
          numStr += expr[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
        prevType = 'NUMBER';
        continue;
      }

      // Unary minus handling (e.g., -5, 3 * -2)
      if (ch === '-') {
        const isUnary = (prevType === null || prevType === 'OPERATOR' || prevType === 'LPAREN');
        if (isUnary) {
          let j = i + 1;
          while (j < n && /\s/.test(expr[j])) j++;
          if (j < n && (/\d/.test(expr[j]) || expr[j] === '.')) {
            let numStr = '-';
            let hasDot = false;
            while (j < n && (/\d/.test(expr[j]) || (expr[j] === '.' && !hasDot))) {
              if (expr[j] === '.') hasDot = true;
              numStr += expr[j];
              j++;
            }
            tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
            prevType = 'NUMBER';
            i = j;
            continue;
          }
        }
      }

      // Identifiers / Functions
      if (/[a-zA-Z]/.test(ch)) {
        let ident = '';
        while (i < n && /[a-zA-Z]/.test(expr[i])) {
          ident += expr[i];
          i++;
        }
        ident = ident.toLowerCase();
        if (this.FUNCTIONS.has(ident)) {
          tokens.push({ type: 'FUNCTION', value: ident });
          prevType = 'FUNCTION';
        } else if (ident === 'pi') {
          tokens.push({ type: 'NUMBER', value: Math.PI });
          prevType = 'NUMBER';
        } else if (ident === 'e') {
          tokens.push({ type: 'NUMBER', value: Math.E });
          prevType = 'NUMBER';
        } else {
          throw new Error(`Unknown identifier or function: '${ident}'`);
        }
        continue;
      }

      // Parentheses & Brackets
      if (ch === '(' || ch === '[' || ch === '{') {
        tokens.push({ type: 'LPAREN', value: '(' });
        prevType = 'LPAREN';
        i++;
        continue;
      }

      if (ch === ')' || ch === ']' || ch === '}') {
        tokens.push({ type: 'RPAREN', value: ')' });
        prevType = 'RPAREN';
        i++;
        continue;
      }

      // Operators
      if (this.OPERATORS[ch]) {
        tokens.push({ type: 'OPERATOR', value: ch });
        prevType = 'OPERATOR';
        i++;
        continue;
      }

      throw new Error(`Unexpected character '${ch}' at index ${i}`);
    }

    return tokens;
  }

  static parse(tokens) {
    const operatorStack = new Stack("OperatorStack");
    const outputQueue = [];
    const steps = [];

    for (let stepIndex = 0; stepIndex < tokens.length; stepIndex++) {
      const token = tokens[stepIndex];
      const step = {
        phase: "Shunting-Yard Infix to Postfix",
        token: String(token.value),
        type: token.type,
        action: "",
        operatorStack: [],
        outputQueue: []
      };

      if (token.type === 'NUMBER') {
        outputQueue.push(token);
        step.action = `Append number '${token.value}' to Output Queue`;
      } else if (token.type === 'FUNCTION') {
        operatorStack.push(token);
        step.action = `Push function '${token.value}' onto Operator Stack`;
      } else if (token.type === 'OPERATOR') {
        const op1 = token.value;
        const prec1 = this.OPERATORS[op1].prec;
        const assoc1 = this.OPERATORS[op1].assoc;

        while (!operatorStack.isEmpty()) {
          const top = operatorStack.peek();
          if (top.type !== 'OPERATOR') break;

          const op2 = top.value;
          const prec2 = this.OPERATORS[op2].prec;

          const shouldPop = (assoc1 === 'L' && prec1 <= prec2) ||
                            (assoc1 === 'R' && prec1 < prec2);
          if (shouldPop) {
            outputQueue.push(operatorStack.pop());
          } else {
            break;
          }
        }
        operatorStack.push(token);
        step.action = `Pushed operator '${op1}' onto Operator Stack`;
      } else if (token.type === 'LPAREN') {
        operatorStack.push(token);
        step.action = `Pushed '(' onto Operator Stack`;
      } else if (token.type === 'RPAREN') {
        while (!operatorStack.isEmpty() && operatorStack.peek().type !== 'LPAREN') {
          outputQueue.push(operatorStack.pop());
        }
        if (operatorStack.isEmpty()) {
          throw new Error("Mismatched parentheses: Missing opening '('");
        }
        operatorStack.pop(); // Discard '('

        if (!operatorStack.isEmpty() && operatorStack.peek().type === 'FUNCTION') {
          outputQueue.push(operatorStack.pop());
        }
        step.action = `Popped operators until matching '(' was discarded`;
      }

      step.operatorStack = operatorStack.toArray().map(t => String(t.value));
      step.outputQueue = outputQueue.map(t => String(t.value));
      steps.push(step);
    }

    // Drain remaining operators
    while (!operatorStack.isEmpty()) {
      const top = operatorStack.pop();
      if (top.type === 'LPAREN' || top.type === 'RPAREN') {
        throw new Error("Mismatched parentheses remaining on stack");
      }
      outputQueue.push(top);

      steps.push({
        phase: "Shunting-Yard Infix to Postfix",
        token: String(top.value),
        type: 'DRAIN',
        action: `Drained operator '${top.value}' from stack to Output Queue`,
        operatorStack: operatorStack.toArray().map(t => String(t.value)),
        outputQueue: outputQueue.map(t => String(t.value))
      });
    }

    return { postfixTokens: outputQueue, steps };
  }
}

// ============================================================================
// 4. POSTFIX EXPRESSION EVALUATION STACK
// ============================================================================
class PostfixEvaluator {
  static evaluate(postfixTokens) {
    const valueStack = new Stack("ValueStack");
    const steps = [];

    for (let i = 0; i < postfixTokens.length; i++) {
      const token = postfixTokens[i];
      const step = {
        phase: "Postfix Value Evaluation",
        token: String(token.value),
        type: token.type,
        action: "",
        valueStack: []
      };

      if (token.type === 'NUMBER') {
        valueStack.push(token.value);
        step.action = `Pushed operand '${token.value}' onto Value Stack`;
      } else if (token.type === 'FUNCTION') {
        if (valueStack.isEmpty()) {
          throw new Error(`Function '${token.value}' requires an operand on stack`);
        }
        const operand = valueStack.pop();
        let res;
        const fn = token.value;

        if (fn === 'sqrt') {
          if (operand < 0) throw new Error(`Cannot compute square root of negative number: ${operand}`);
          res = Math.sqrt(operand);
        } else if (fn === 'abs') {
          res = Math.abs(operand);
        } else if (fn === 'sin') {
          res = Math.sin(operand);
        } else if (fn === 'cos') {
          res = Math.cos(operand);
        } else if (fn === 'tan') {
          res = Math.tan(operand);
        } else if (fn === 'log' || fn === 'ln') {
          if (operand <= 0) throw new Error(`Logarithm domain error for operand: ${operand}`);
          res = Math.log(operand);
        } else {
          throw new Error(`Unsupported function '${fn}'`);
        }

        valueStack.push(res);
        step.action = `Evaluated ${fn}(${operand}) = ${Number(res.toFixed(4))}`;
      } else if (token.type === 'OPERATOR') {
        if (valueStack.size() < 2) {
          throw new Error(`Operator '${token.value}' requires two operands on stack`);
        }
        const b = valueStack.pop();
        const a = valueStack.pop();
        const op = token.value;
        let res;

        if (op === '+') res = a + b;
        else if (op === '-') res = a - b;
        else if (op === '*') res = a * b;
        else if (op === '/') {
          if (b === 0) throw new Error("Arithmetic Error: Division by Zero");
          res = a / b;
        } else if (op === '%') {
          if (b === 0) throw new Error("Arithmetic Error: Modulo by Zero");
          res = a % b;
        } else if (op === '^') {
          res = Math.pow(a, b);
        } else {
          throw new Error(`Unknown operator '${op}'`);
        }

        valueStack.push(res);
        step.action = `Evaluated ${a} ${op} ${b} = ${Number(res.toFixed(4))}`;
      }

      step.valueStack = valueStack.toArray().map(v => typeof v === 'number' ? Number(v.toFixed(4)) : v);
      steps.push(step);
    }

    if (valueStack.size() !== 1) {
      throw new Error(`Malformed expression: evaluation stack finished with ${valueStack.size()} items`);
    }

    const finalResult = valueStack.pop();
    return {
      result: Number.isInteger(finalResult) ? finalResult : Number(finalResult.toFixed(4)),
      steps
    };
  }
}

// ============================================================================
// 5. DUAL-STACK UNDO / REDO DOCUMENT SYSTEM
// ============================================================================
class DocumentHistoryEngine {
  constructor() {
    this.undoStack = new Stack("UndoStack");
    this.redoStack = new Stack("RedoStack");
  }

  recordState(text, description = "User Edit") {
    // Avoid duplicate snapshots
    const currentTop = this.undoStack.peek();
    if (currentTop && currentTop.text === text) return;

    this.undoStack.push({ text, description, timestamp: new Date().toLocaleTimeString() });
    // Invariant: any new modification invalidates the redo branch
    this.redoStack.clear();
  }

  undo(currentText) {
    if (this.undoStack.isEmpty()) return null;

    const previousState = this.undoStack.pop();
    this.redoStack.push({ text: currentText, description: "Undone Edit", timestamp: new Date().toLocaleTimeString() });
    return previousState;
  }

  redo(currentText) {
    if (this.redoStack.isEmpty()) return null;

    const futureState = this.redoStack.pop();
    this.undoStack.push({ text: currentText, description: "Redone Edit", timestamp: new Date().toLocaleTimeString() });
    return futureState;
  }

  canUndo() {
    return !this.undoStack.isEmpty();
  }

  canRedo() {
    return !this.redoStack.isEmpty();
  }
}

// ============================================================================
// 6. UI ORCHESTRATION & STEPPER CONTROLLER
// ============================================================================
class AppController {
  constructor() {
    // State
    this.currentSteps = [];
    this.currentStepIdx = 0;
    this.isPlaying = false;
    this.playTimer = null;
    this.playSpeed = 700;

    // Sandbox stack
    this.sandboxStack = new Stack("SandboxStack");

    // Undo/Redo Engine
    this.docHistory = new DocumentHistoryEngine();

    this.cacheDOM();
    this.bindEvents();
    this.initDefault();
  }

  cacheDOM() {
    // Navigation
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');

    // Expression Evaluator Tab
    this.exprInput = document.getElementById('exprInput');
    this.btnEvaluate = document.getElementById('btnEvaluate');
    this.btnStepToggle = document.getElementById('btnStepToggle');
    this.evalAlert = document.getElementById('evalAlert');
    this.bracketStatusBadge = document.getElementById('bracketStatusBadge');
    this.bracketStatusText = document.getElementById('bracketStatusText');
    this.postfixOutput = document.getElementById('postfixOutput');
    this.finalResult = document.getElementById('finalResult');
    this.presetChips = document.querySelectorAll('.preset-chip[data-expr]');

    // Stepper
    this.stepperControls = document.getElementById('stepperControls');
    this.stepperPhaseTitle = document.getElementById('stepperPhaseTitle');
    this.stepperActionDesc = document.getElementById('stepperActionDesc');
    this.stepCounter = document.getElementById('stepCounter');
    this.btnPrevStep = document.getElementById('btnPrevStep');
    this.btnPlayPause = document.getElementById('btnPlayPause');
    this.btnNextStep = document.getElementById('btnNextStep');
    this.speedRange = document.getElementById('speedRange');

    // Visual Stacks
    this.operatorStackVisual = document.getElementById('operatorStackVisual');
    this.operatorStackCount = document.getElementById('operatorStackCount');
    this.valueStackVisual = document.getElementById('valueStackVisual');
    this.valueStackCount = document.getElementById('valueStackCount');

    // Trace Table
    this.traceTableBody = document.getElementById('traceTableBody');

    // Sandbox
    this.sandboxValue = document.getElementById('sandboxValue');
    this.btnPushSandbox = document.getElementById('btnPushSandbox');
    this.btnPopSandbox = document.getElementById('btnPopSandbox');
    this.btnPeekSandbox = document.getElementById('btnPeekSandbox');
    this.btnCheckEmptySandbox = document.getElementById('btnCheckEmptySandbox');
    this.btnClearSandbox = document.getElementById('btnClearSandbox');
    this.sandboxStackVisual = document.getElementById('sandboxStackVisual');
    this.sandboxSizeText = document.getElementById('sandboxSizeText');
    this.sandboxTopText = document.getElementById('sandboxTopText');
    this.sandboxItemCount = document.getElementById('sandboxItemCount');
    this.sandboxLogEntries = document.getElementById('sandboxLogEntries');

    // Undo / Redo
    this.docEditorArea = document.getElementById('docEditorArea');
    this.btnDocUndo = document.getElementById('btnDocUndo');
    this.btnDocRedo = document.getElementById('btnDocRedo');
    this.editorStatusText = document.getElementById('editorStatusText');
    this.undoStackVisual = document.getElementById('undoStackVisual');
    this.redoStackVisual = document.getElementById('redoStackVisual');
    this.undoCountBadge = document.getElementById('undoCountBadge');
    this.redoCountBadge = document.getElementById('redoCountBadge');

    // Quick Action Buttons
    this.btnActionAddHeader = document.getElementById('btnActionAddHeader');
    this.btnActionAddFormula = document.getElementById('btnActionAddFormula');
    this.btnActionBold = document.getElementById('btnActionBold');
    this.btnActionClearText = document.getElementById('btnActionClearText');
  }

  bindEvents() {
    // Navigation Tabs
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Evaluator
    this.btnEvaluate.addEventListener('click', () => this.runEvaluation(false));
    this.btnStepToggle.addEventListener('click', () => this.runEvaluation(true));
    this.exprInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.runEvaluation(false);
    });

    // Presets
    this.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.exprInput.value = chip.dataset.expr;
        this.runEvaluation(false);
      });
    });

    // Stepper buttons
    this.btnNextStep.addEventListener('click', () => this.stepNext());
    this.btnPrevStep.addEventListener('click', () => this.stepPrev());
    this.btnPlayPause.addEventListener('click', () => this.togglePlay());
    this.speedRange.addEventListener('input', (e) => {
      this.playSpeed = 1700 - Number(e.target.value);
      if (this.isPlaying) {
        clearInterval(this.playTimer);
        this.playTimer = setInterval(() => this.stepNext(), this.playSpeed);
      }
    });

    // Sandbox Controls
    this.btnPushSandbox.addEventListener('click', () => this.handleSandboxPush());
    this.sandboxValue.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSandboxPush();
    });
    this.btnPopSandbox.addEventListener('click', () => this.handleSandboxPop());
    this.btnPeekSandbox.addEventListener('click', () => this.handleSandboxPeek());
    this.btnCheckEmptySandbox.addEventListener('click', () => this.handleSandboxIsEmpty());
    this.btnClearSandbox.addEventListener('click', () => this.handleSandboxClear());

    // Undo / Redo Controls
    this.btnDocUndo.addEventListener('click', () => this.handleDocUndo());
    this.btnDocRedo.addEventListener('click', () => this.handleDocRedo());
    this.docEditorArea.addEventListener('input', () => this.handleDocInput());
    this.docEditorArea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.handleDocUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        this.handleDocRedo();
      }
    });

    // Quick doc actions
    this.btnActionAddHeader.addEventListener('click', () => {
      this.insertDocText("# Algorithm Analysis Notes\n");
    });
    this.btnActionAddFormula.addEventListener('click', () => {
      this.insertDocText("Equation: T(N) = O(N) operations via Stack ADT\n");
    });
    this.btnActionBold.addEventListener('click', () => {
      this.insertDocText("**LIFO Invariant** ");
    });
    this.btnActionClearText.addEventListener('click', () => {
      this.setDocText("");
    });
  }

  initDefault() {
    // Initial evaluation
    this.runEvaluation(false);

    // Initial doc history snapshot
    const defaultDoc = "Stack Data Structure Assignment\n\nKey Principles:\n- Last-In, First-Out (LIFO)\n- Push and Pop operations are O(1)\n- Perfect for nested scopes & call stacks";
    this.docEditorArea.value = defaultDoc;
    this.docHistory.recordState(defaultDoc, "Initial Document");
    this.updateUndoRedoUI();
  }

  switchTab(targetTabId) {
    this.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === targetTabId);
    });
    this.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === targetTabId);
    });
  }

  // ==========================================================================
  // EXPRESSION EVALUATOR RUNNER
  // ==========================================================================
  runEvaluation(isStepMode = false) {
    this.pausePlay();
    const rawExpr = this.exprInput.value.trim();

    if (!rawExpr) {
      this.showAlert("Please enter an expression to evaluate.", "error");
      return;
    }

    // 1. Delimiter Validation
    const delimiterRes = DelimiterValidator.validate(rawExpr);
    if (!delimiterRes.isValid) {
      this.bracketStatusBadge.className = "badge badge-danger";
      this.bracketStatusBadge.textContent = "Syntax Error";
      this.bracketStatusText.textContent = "Unbalanced Delimiters";
      this.postfixOutput.textContent = "Parsing Aborted";
      this.finalResult.textContent = "Error";
      this.showAlert(delimiterRes.message, "error");
      this.renderVisualStack(this.operatorStackVisual, [], this.operatorStackCount);
      this.renderVisualStack(this.valueStackVisual, [], this.valueStackCount);
      this.traceTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--rose-primary);">Validation Failed: ${delimiterRes.message}</td></tr>`;
      return;
    }

    this.bracketStatusBadge.className = "badge badge-success";
    this.bracketStatusBadge.textContent = "Valid";
    this.bracketStatusText.textContent = "Delimiters Symmetrical";
    this.hideAlert();

    try {
      // 2. Tokenize
      const tokens = ShuntingYardParser.tokenize(rawExpr);

      // 3. Shunting-Yard Infix to Postfix
      const { postfixTokens, steps: parsingSteps } = ShuntingYardParser.parse(tokens);
      const postfixStr = postfixTokens.map(t => String(t.value)).join(' ');
      this.postfixOutput.textContent = postfixStr;

      // 4. Postfix Evaluation
      const { result, steps: evalSteps } = PostfixEvaluator.evaluate(postfixTokens);
      this.finalResult.textContent = result;

      // Merge all steps for the visual debugger
      this.currentSteps = [
        ...parsingSteps.map(s => ({ ...s, phase: 'Phase 1: Infix to Postfix (Shunting-Yard)' })),
        ...evalSteps.map(s => ({ ...s, phase: 'Phase 2: Postfix Evaluation (Operand Stack)' }))
      ];

      this.populateTraceTable(this.currentSteps);

      if (isStepMode) {
        this.stepperControls.classList.add('active');
        this.currentStepIdx = 0;
        this.applyStepState(this.currentStepIdx);
      } else {
        this.stepperControls.classList.remove('active');
        // Render final stacks
        const finalOpTokens = parsingSteps.length > 0 ? parsingSteps[parsingSteps.length - 1].operatorStack : [];
        const finalValTokens = evalSteps.length > 0 ? evalSteps[evalSteps.length - 1].valueStack : [];
        this.renderVisualStack(this.operatorStackVisual, finalOpTokens, this.operatorStackCount, "purple");
        this.renderVisualStack(this.valueStackVisual, finalValTokens, this.valueStackCount, "emerald");
      }

      this.showAlert(`Expression successfully evaluated: ${result}`, "success");
    } catch (err) {
      this.showAlert(err.message, "error");
      this.finalResult.textContent = "Error";
    }
  }

  // ==========================================================================
  // STEPPER CONTROLS
  // ==========================================================================
  applyStepState(index) {
    if (index < 0 || index >= this.currentSteps.length) return;

    const step = this.currentSteps[index];
    this.stepperPhaseTitle.textContent = step.phase;
    this.stepperActionDesc.textContent = `Token '${step.token}': ${step.action}`;
    this.stepCounter.textContent = `Step ${index + 1} / ${this.currentSteps.length}`;

    // Update stacks based on step contents
    if (step.operatorStack !== undefined) {
      this.renderVisualStack(this.operatorStackVisual, step.operatorStack, this.operatorStackCount, "purple");
    }
    if (step.valueStack !== undefined) {
      this.renderVisualStack(this.valueStackVisual, step.valueStack, this.valueStackCount, "emerald");
    }

    // Highlight row in trace table
    const rows = this.traceTableBody.querySelectorAll('tr');
    rows.forEach((row, rIdx) => {
      row.classList.toggle('active-step', rIdx === index);
      if (rIdx === index) {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    this.btnPrevStep.disabled = index === 0;
    this.btnNextStep.disabled = index === this.currentSteps.length - 1;
  }

  stepNext() {
    if (this.currentStepIdx < this.currentSteps.length - 1) {
      this.currentStepIdx++;
      this.applyStepState(this.currentStepIdx);
    } else {
      this.pausePlay();
    }
  }

  stepPrev() {
    if (this.currentStepIdx > 0) {
      this.currentStepIdx--;
      this.applyStepState(this.currentStepIdx);
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pausePlay();
    } else {
      this.startPlay();
    }
  }

  startPlay() {
    this.isPlaying = true;
    this.btnPlayPause.textContent = "Pause";
    if (this.currentStepIdx >= this.currentSteps.length - 1) {
      this.currentStepIdx = 0;
    }
    this.playTimer = setInterval(() => this.stepNext(), this.playSpeed);
  }

  pausePlay() {
    this.isPlaying = false;
    if (this.btnPlayPause) this.btnPlayPause.textContent = "Play";
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }

  // ==========================================================================
  // VISUAL STACK RENDERER
  // ==========================================================================
  renderVisualStack(container, items, countBadge, colorTheme = "cyan") {
    container.innerHTML = "";

    if (!items || items.length === 0) {
      container.innerHTML = '<div class="stack-empty-state">Stack is Empty</div>';
      countBadge.textContent = "0 items";
      return;
    }

    countBadge.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;

    items.forEach((item, idx) => {
      const isTop = idx === items.length - 1;
      const el = document.createElement('div');
      el.className = `stack-item ${isTop ? 'top-item' : ''} ${colorTheme ? 'item-' + colorTheme : ''}`;

      const textSpan = document.createElement('span');
      textSpan.textContent = typeof item === 'object' ? JSON.stringify(item) : String(item);

      const metaSpan = document.createElement('div');
      metaSpan.style.display = 'flex';
      metaSpan.style.alignItems = 'center';
      metaSpan.style.gap = '6px';

      if (isTop) {
        const topBadge = document.createElement('span');
        topBadge.className = 'item-badge';
        topBadge.textContent = 'TOP';
        metaSpan.appendChild(topBadge);
      }

      const indexLabel = document.createElement('span');
      indexLabel.className = 'item-index';
      indexLabel.textContent = `[${idx}]`;
      metaSpan.appendChild(indexLabel);

      el.appendChild(textSpan);
      el.appendChild(metaSpan);
      container.appendChild(el);
    });
  }

  populateTraceTable(steps) {
    this.traceTableBody.innerHTML = "";
    steps.forEach((step, idx) => {
      const tr = document.createElement('tr');
      const stackState = step.operatorStack !== undefined
        ? `[${step.operatorStack.join(', ')}]`
        : `[${step.valueStack.join(', ')}]`;
      const outputBuffer = step.outputQueue ? step.outputQueue.join(' ') : '—';

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><strong>${step.token}</strong></td>
        <td><span class="badge">${step.type || 'STEP'}</span></td>
        <td>${step.action}</td>
        <td>${stackState}</td>
        <td>${outputBuffer}</td>
      `;
      tr.addEventListener('click', () => {
        this.currentStepIdx = idx;
        this.applyStepState(idx);
      });
      this.traceTableBody.appendChild(tr);
    });
  }

  showAlert(message, type = "error") {
    this.evalAlert.textContent = message;
    this.evalAlert.className = `alert-banner ${type}`;
  }

  hideAlert() {
    this.evalAlert.className = 'alert-banner hidden';
  }

  // ==========================================================================
  // SANDBOX CONTROLLER
  // ==========================================================================
  handleSandboxPush() {
    const val = this.sandboxValue.value.trim();
    if (!val) return;

    this.sandboxStack.push(val);
    this.sandboxValue.value = "";
    this.sandboxValue.focus();

    this.logSandbox(`PUSH: '${val}' pushed onto top. Size: ${this.sandboxStack.size()}`);
    this.updateSandboxUI();
  }

  handleSandboxPop() {
    if (this.sandboxStack.isEmpty()) {
      this.logSandbox("POP ERROR: Cannot pop from empty stack (Underflow)");
      alert("Stack Underflow: Stack is empty!");
      return;
    }
    const popped = this.sandboxStack.pop();
    this.logSandbox(`POP: Removed '${popped}' from top. Size: ${this.sandboxStack.size()}`);
    this.updateSandboxUI();
  }

  handleSandboxPeek() {
    if (this.sandboxStack.isEmpty()) {
      this.logSandbox("PEEK: Stack is currently empty (null)");
      alert("Stack is empty! Peek returned null.");
      return;
    }
    const top = this.sandboxStack.peek();
    this.logSandbox(`PEEK: Top element is '${top}' without removal.`);
    alert(`Top Element: ${top}`);
  }

  handleSandboxIsEmpty() {
    const empty = this.sandboxStack.isEmpty();
    this.logSandbox(`ISEMPTY: Evaluated to ${empty}.`);
    alert(`IsEmpty: ${empty}`);
  }

  handleSandboxClear() {
    this.sandboxStack.clear();
    this.logSandbox("CLEAR: Removed all elements from stack.");
    this.updateSandboxUI();
  }

  updateSandboxUI() {
    this.renderVisualStack(
      this.sandboxStackVisual,
      this.sandboxStack.toArray(),
      this.sandboxItemCount,
      "cyan"
    );
    this.sandboxSizeText.textContent = `${this.sandboxStack.size()} elements`;
    this.sandboxTopText.textContent = this.sandboxStack.isEmpty()
      ? "None (Empty)"
      : String(this.sandboxStack.peek());
  }

  logSandbox(msg) {
    const item = document.createElement('div');
    item.className = 'log-item';
    const time = new Date().toLocaleTimeString();
    item.textContent = `[${time}] ${msg}`;
    this.sandboxLogEntries.appendChild(item);
  }

  // ==========================================================================
  // UNDO / REDO DOCUMENT CONTROLLER
  // ==========================================================================
  handleDocInput() {
    clearTimeout(this.docInputTimer);
    this.docInputTimer = setTimeout(() => {
      this.docHistory.recordState(this.docEditorArea.value, "Typed text");
      this.updateUndoRedoUI();
    }, 400);
  }

  handleDocUndo() {
    const current = this.docEditorArea.value;
    const previous = this.docHistory.undo(current);
    if (previous) {
      this.docEditorArea.value = previous.text;
      this.editorStatusText.textContent = `Undone: ${previous.description}`;
      this.updateUndoRedoUI();
    }
  }

  handleDocRedo() {
    const current = this.docEditorArea.value;
    const future = this.docHistory.redo(current);
    if (future) {
      this.docEditorArea.value = future.text;
      this.editorStatusText.textContent = `Redone: ${future.description}`;
      this.updateUndoRedoUI();
    }
  }

  insertDocText(snippet) {
    const pos = this.docEditorArea.selectionStart || this.docEditorArea.value.length;
    const val = this.docEditorArea.value;
    const nextVal = val.slice(0, pos) + snippet + val.slice(pos);
    this.docEditorArea.value = nextVal;
    this.docHistory.recordState(nextVal, `Inserted snippet`);
    this.updateUndoRedoUI();
    this.docEditorArea.focus();
  }

  setDocText(newVal) {
    this.docEditorArea.value = newVal;
    this.docHistory.recordState(newVal, "Cleared content");
    this.updateUndoRedoUI();
  }

  updateUndoRedoUI() {
    this.btnDocUndo.disabled = !this.docHistory.canUndo();
    this.btnDocRedo.disabled = !this.docHistory.canRedo();

    const undoItems = this.docHistory.undoStack.toArray().map(i => i.description);
    const redoItems = this.docHistory.redoStack.toArray().map(i => i.description);

    this.renderVisualStack(this.undoStackVisual, undoItems, this.undoCountBadge, "cyan");
    this.renderVisualStack(this.redoStackVisual, redoItems, this.redoCountBadge, "purple");
  }
}

// ============================================================================
// INITIALIZE ON DOM READY
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  window.stackApp = new AppController();
});
