//'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import jsbeautify = require('js-beautify');
import fs = require('fs');
import mkdirp = require('mkdirp');
import path = require('path');


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

function getRootPath() {
    return vscode.workspace.rootPath || '.';
}

function getOptions() {
    var global = path.join(__dirname, 'razor-formatter.json');
    var local = path.join(getRootPath(), '.vscode', 'razor-formatter.json');

    var indent_size;
    try {
        indent_size = require(local)["indent_size"];
    } catch (error) {
        try {
            indent_size = require(global)["indent_size"];
        } catch (error) {
            indent_size = 4;
        }
    }
    var indent_char;
    try {
        indent_char = require(local)["indent_char"];
    } catch (error) {
        try {
            indent_char = require(global)["indent_char"];
        } catch (error) {
            indent_char = " ";
        }
    }

    return {
        indent_size: indent_size,
        indent_char: indent_char
    };
}
function beatify(documentContent: String, languageId) {
    var options = getOptions();
    var formatted = jsbeautify.html(documentContent, options);
    return formatted;
}

export function activate(context: vscode.ExtensionContext) {

    registerDocType('razor');

    let formatter = new Formatter();
    context.subscriptions.push(vscode.commands.registerCommand('extension.formatting', () => {
        formatter.beautify();
    }));



    context.subscriptions.push(vscode.commands.registerCommand('extension.formatterConfig', () => {

        formatter.openConfig(
            path.join(getRootPath(), '.vscode', 'razor-formatter.json'),
            function () {
                showMesage('[Local]  After editing the file, remember to Restart VScode');
            },
            function () {
                var fileName = path.join(__dirname, 'razor-formatter.json');
                formatter.openConfig(
                    fileName,
                    function () {
                        showMesage('[Golbal]  After editing the file, remember to Restart VScode');
                    },
                    function () {
                        showMesage('Not found file: ' + fileName);
                    })
            })
    }));


    context.subscriptions.push(vscode.commands.registerCommand('extension.formatterCreateLocalConfig', () => {
        formatter.generateLocalConfig();
    }));

    context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(e => {
        formatter.onSave(e)
    }));


    function registerDocType(type) {
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
        let window = vscode.window;
        let range;
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
        let window = vscode.window;
        let editor = window.activeTextEditor;
        if (!editor) {
            return;
        }
        // let content = editor.document.getText(range);
        //return beatify(content, range);
        let document = editor.document;
        return format(document, range);
    }


    public generateLocalConfig() {
        var local = path.join(getRootPath(), '.vscode', 'razor-formatter.json');

        var dirPath = path.join(__dirname, 'default-config.json');
        var content = fs.readFileSync(dirPath).toString('utf8');
        mkdirp.sync(path.dirname(local));
        fs.stat(local, function (err, stat) {
            if (err == null) {
                // showMesage('Local config file existed: ' + local);
            } else if (err.code == 'ENOENT') {
                fs.writeFile(local, content, function (e) {
                    //showMesage('Generate local config file: ' + local)
                })
            } else {
                showMesage('Some other error: ' + err.code);
            }
        });
    }

    public openConfig(filename, succ, fail) {
        this.generateLocalConfig();
        vscode.workspace.openTextDocument(filename).then(function (textDocument) {
            if (!textDocument) {
                showMesage('Can not open file!');
                return;
            }
            vscode.window.showTextDocument(textDocument).then(function (editor) {
                if (!editor) {
                    showMesage('Can not show document!');
                    return;
                }
                !!succ && succ();

            }, function () {
                showMesage('Can not Show file: ' + filename);
                return;
            });
        }, function () {
            !!fail && fail();
            return;
        });
    }

    public onSave(e: vscode.TextDocumentWillSaveEvent) {
        var { document } = e;
        var docType: Array<string> = ['razor']
        var global = path.join(__dirname, 'razor-formatter.json');
        var local = path.join(getRootPath(), '.vscode', 'razor-formatter.json');
        var onSave;

        try {
            onSave = require(local).onSave;
        } catch (error) {
            try {
                onSave = require(global).onSave;
            } catch (error) {
                onSave = true;
            }
        }

        if (!onSave) {
            return;
        }
        if (docType.indexOf(document.languageId) == -1) {
            return;
        }


        var start = new vscode.Position(0, 0);
        var end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
        var range = new vscode.Range(start, end);

        var content = document.getText(range);

        var formatted = beatify(content, document.languageId);

        if (formatted) {
            var start = new vscode.Position(0, 0);
            var end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
            range = new vscode.Range(start, end);
            var edit = vscode.TextEdit.replace(range, formatted);
            e.waitUntil(Promise.resolve([edit]));
        }

    }
}

function showMesage(msg: string) {
    vscode.window.showInformationMessage(msg);
}