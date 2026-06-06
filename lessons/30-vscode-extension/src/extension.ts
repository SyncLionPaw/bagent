import * as vscode from "vscode";
import { ChatSidebarProvider } from "./sidebar";

export function activate(context: vscode.ExtensionContext) {
  const sidebar = new ChatSidebarProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("bagent.chat", sidebar),
    vscode.commands.registerCommand("bagent.focus", () => {
      vscode.commands.executeCommand("bagent.chat.focus");
    }),
  );
}

export function deactivate() {}
