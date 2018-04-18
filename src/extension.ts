//'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import jsbeautify = require('js-beautify');

export function format(document: vscode.TextDocument, range: vscode.Range) {
    if (range === null) {
        var start = new vscode.Position(0, 0);
        var end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
        range = new vscode.Range(start, end);
    }

    var result: vscode.TextEdit[] = [];

    var content = document.getText(range);

    var formatted = beatify(content, document.languageId);

    if (formatted) {
        result.push(new vscode.TextEdit(range, formatted));
    }

    return result;
};

function beatify(documentContent: String, languageId) {
    return jsbeautify.html(documentContent, null);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    registerDocType();

    let formatter = new Formatter();
    context.subscriptions.push(vscode.commands.registerCommand('extension.formatting', () => {
        formatter.beautify();
    }));

    function registerDocType() {
        let type = 'razor';
        context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(type, {
            provideDocumentFormattingEdits: (document, options, token) => {
                return formatter.registerBeautify(null)
            }
        }));
        context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(type, {
            provideDocumentRangeFormattingEdits: (document, range, options, token) => {
                var start = new vscode.Position(0, 0);
                var end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
                return formatter.registerBeautify(new vscode.Range(start, end))
            }
        }));
    }



}

class Formatter {


    public beautify() {
        // Create as needed
        let window = vscode.window;
        let range;
        // Get the current text editor
        let activeEditor = window.activeTextEditor;
        if (!activeEditor) {
            return;
        }

        let document = activeEditor.document;

        if (range === null) {
            var start = new vscode.Position(0, 0);
            var end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
            range = new vscode.Range(start, end);
        }

        var content = document.getText(range);

        var formatted = beatify(content, document.languageId);
        if (formatted) {
            return activeEditor.edit(function (editor) {
                var start = new vscode.Position(0, 0);
                var end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
                range = new vscode.Range(start, end);
                return editor.replace(range, formatted);
            });
        }

    }

    public registerBeautify(range) {

        // Create as needed
        let window = vscode.window;

        // Get the current text editor
        let editor = window.activeTextEditor;
        if (!editor) {
            return;
        }
        let document = editor.document;

        return format(document, range);
    }
}