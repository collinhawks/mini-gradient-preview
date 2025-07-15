import * as vscode from 'vscode';



//Event handles
let textEditorEvent:vscode.Disposable | null = null;
let textDocEvent:vscode.Disposable | null = null;

//Constants
const WORKSPACE_SECTION = "mini-gradient-preview"
const noDecorationType:vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({});


//returns dynamic decoration based on font size
function getDecoration(type:string,value:string):vscode.DecorationInstanceRenderOptions{
  const fontSize = parseFloat(vscode.workspace.getConfiguration().get('editor.fontSize') as string);
  let size:number = 22.0 * (fontSize/14)
  let bottom:number = 4 * (fontSize/14)
  return {
    before:{
      contentText:"",
      height: `${size}px`,
      width: `${size}px`,
      margin: `0px 4px -${bottom}px 1px`,
      backgroundColor: `background-color: transparent; background-image: ${type+value};`,
      border: "1px solid white"
    }
  }

}

//Helper functions
function addDecorations(event?:vscode.TextDocumentChangeEvent){
  const editors:readonly vscode.TextEditor[] = vscode.window.visibleTextEditors;
  if(event){
    editors.forEach(editor=>{
      if(editor.document === event.document)
        decorate(editor);
    })
    return;
  }
  editors.forEach(editor => {
    decorate(editor);
  });
}

function removeDecorations(){
  const editors:readonly vscode.TextEditor[] = vscode.window.visibleTextEditors;
  editors.forEach(editor=>{
    editor.setDecorations(noDecorationType,[]);
  })   
}

function showGradients(){
  hideGradients();
  addDecorations();
  textEditorEvent = vscode.window.onDidChangeVisibleTextEditors(e => {
    addDecorations();
  });
	textDocEvent = vscode.workspace.onDidChangeTextDocument(e => {
	  addDecorations(e);
  });

}

function hideGradients(){
  if(textEditorEvent != null){
    textEditorEvent.dispose();
    textEditorEvent = null;
  }
  if(textDocEvent != null){
    textDocEvent.dispose()
    textDocEvent = null;
  }
  removeDecorations();
}

function changeConfiguration(visibility:boolean){
  const config = vscode.workspace.getConfiguration(WORKSPACE_SECTION);
  config.update("show",visibility,vscode.ConfigurationTarget.Workspace).then();
}

function activate()  {
  //Program entry point
  // Loads workspace configurations
  const config = vscode.workspace.getConfiguration(WORKSPACE_SECTION);

  //Previews are shown based on configuration 
  if(config.get("show")){
    showGradients();
  }

  //sets up configuration and command handlers
  vscode.workspace.onDidChangeConfiguration(e => {  
    if(e.affectsConfiguration(WORKSPACE_SECTION)){  
      const visibility = vscode.workspace.getConfiguration(WORKSPACE_SECTION).get("show"); 
      if (visibility){
        showGradients();
      }
      else{
        hideGradients();
      }
    }
  
    if (e.affectsConfiguration('editor.fontSize')) {
      const visibility = vscode.workspace.getConfiguration(WORKSPACE_SECTION).get("show");
      if(visibility){
        addDecorations();
      }
    }
  });
  vscode.commands.registerCommand('gradientpreview.showgradientpreviews', () => {
    changeConfiguration(true);
  });
  vscode.commands.registerCommand('gradientpreview.hidegradientpreviews', () => {
    changeConfiguration(false);
  });
}


function decorate(editor:vscode.TextEditor) {
  //Uses regex to find matches in each line
  //Uses bracket balancing algorithm to extract gradient value
  let sourceCode:string = editor.document.getText();
  let regex:RegExp = /(linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient)\(/g;
  const sourceCodeArr:string[] = sourceCode.split("\n");
  let decorations:vscode.DecorationOptions[] = [];

  for(let line=0;line<sourceCodeArr.length;line++){

    let matches = [...sourceCodeArr[line].matchAll(regex)]
    for(let match=0;match<matches.length;match++){
      let value:string = "("; 
      let subline:number = line;
      const stack:string[] = []
      stack.push("(")
      for(;subline<sourceCodeArr.length && stack.length > 0;subline++){
        let i = 0;
        if (subline === line){
          i = matches[match].index as number + matches[match][0].length
        }
        for(;i<sourceCodeArr[subline].length && stack.length > 0;i++){
          if (sourceCodeArr[subline][i] === "(")
            stack.push("(")
          else if (sourceCodeArr[subline][i] === ")")
            stack.pop()
          value += sourceCodeArr[subline][i]
        }
      }
	    //Adds the preview to the decorations array
      let range:vscode.Range = new vscode.Range(
        new vscode.Position(line, matches[match].index as number),
        new vscode.Position(line, matches[match].index as number)
      );

      decorations.push({
        range:range,
        renderOptions:getDecoration(matches[match][1],value)
      })
      
    }
  }
  //Shows the preview in editor
  editor.setDecorations(noDecorationType,decorations);


}

module.exports = {
	activate
}
