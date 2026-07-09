const fs = require('fs');

try {
  const code = fs.readFileSync('src/App.tsx', 'utf8');
  const lines = code.split('\n');

  let curly = 0;
  let paren = 0;
  const curlyStack = [];
  const parenStack = [];

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    
    // Track lines
    const lineNum = code.substring(0, i).split('\n').length;
    const colNum = i - code.lastIndexOf('\n', i - 1);

    if (char === '{') {
      curly++;
      curlyStack.push({ line: lineNum, col: colNum });
    } else if (char === '}') {
      curly--;
      if (curlyStack.length > 0) {
        curlyStack.pop();
      } else {
        console.log(`Extra close curly brace '}' at line ${lineNum}, col ${colNum}`);
      }
    } else if (char === '(') {
      paren++;
      parenStack.push({ line: lineNum, col: colNum });
    } else if (char === ')') {
      paren--;
      if (parenStack.length > 0) {
        parenStack.pop();
      } else {
        console.log(`Extra close parenthesis ')' at line ${lineNum}, col ${colNum}`);
      }
    }
  }

  console.log('Final curly count (should be 0):', curly);
  console.log('Final paren count (should be 0):', paren);

  if (curlyStack.length > 0) {
    console.log('Unclosed curly braces { opening at:');
    curlyStack.slice(-5).forEach(b => console.log(`  Line ${b.line}, Col ${b.col}`));
  }
  if (parenStack.length > 0) {
    console.log('Unclosed parentheses ( opening at:');
    parenStack.slice(-5).forEach(p => console.log(`  Line ${p.line}, Col ${p.col}`));
  }

} catch (err) {
  console.error(err);
}
