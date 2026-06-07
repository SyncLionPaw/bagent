import * as vscode from "vscode";
import { evalExpr } from "./eval";
import { CalculatorPanelProvider } from "./panel";

export function activate(context: vscode.ExtensionContext) {
  const panel = new CalculatorPanelProvider();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("calculator.panel", panel),
    vscode.commands.registerCommand("calculator.eval", async () => {
      const expr = await vscode.window.showInputBox({
        prompt: "输入算式，例如 (1+2)*3",
      });
      if (!expr) return;
      try {
        vscode.window.showInformationMessage(`= ${evalExpr(expr)}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(msg);
      }
    }),
    vscode.commands.registerCommand("calculator.focus", () => {
      void vscode.commands.executeCommand("calculator.panel.focus");
    }),
  );
}

export function deactivate() {}
