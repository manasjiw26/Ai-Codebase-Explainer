const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const path = require('path');

// Check if file is JavaScript/TypeScript based on extension
function isJavaScriptFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.js', '.ts', '.jsx', '.tsx'].includes(ext);
}

function parseCode(code, filePath = '') {
    // Skip parsing for non-JavaScript files
    if (filePath && !isJavaScriptFile(filePath)) {
        return null;
    }
    
    try {
        // This takes the raw string of code and turns it into an AST tree!
        const ast = babelParser.parse(code, {
            sourceType: "module", // allows 'import' and 'export' statements
            plugins: [
                "jsx", // in case it's a React file
                "typescript" // in case it's a TypeScript file
            ]
        });

        return ast;
    } catch (error) {
        console.error("Failed to parse code:", error.message);
        return null;
    }
}
function extractImports(ast) {
    const imports = [];

    traverse(ast, {
        // 1. Catches ES Modules: import express from 'express'
        ImportDeclaration(path) {
            imports.push({
                source: path.node.source.value,
                type: 'es6_import'
            });
        },

        // 2. Catches CommonJS: const express = require('express')
        CallExpression(path) {
            // Is this a call to a function named "require"?
            if (path.node.callee.name === 'require') {
                // Grab the first argument passed to require(), e.g., 'express'
                if (path.node.arguments.length > 0 && path.node.arguments[0].type === 'StringLiteral') {
                    imports.push({
                        source: path.node.arguments[0].value,
                        type: 'commonjs_require'
                    });
                }
            }
        }
    });

    return imports;
}


function extractFunctions(ast) {
    const functions = [];

    // We look for any normal function declaration
    traverse(ast, {
        FunctionDeclaration(path) {
            functions.push({
                name: path.node.id ? path.node.id.name : "anonymous",
                isAsync: path.node.async,
                params: path.node.params.map(p => p.name || "param")
            });
        }
    });

    return functions;
}

module.exports = {
    parseCode,
    extractImports,
    extractFunctions,
    isJavaScriptFile
};
