The following prompt (enclosed between ___BEGIN_PROMPT___ and ___END_PROMPT___) was used to generate the code (for the file $codeFile$) printed later (enclosed between ___BEGIN_PREVIOUS_CODE___ and ___END_PREVIOUS_CODE___).
Note that line numbers are included in the prompt.

___BEGIN_PROMPT___

$codegenPrompt$

___END_PROMPT___

And here's the previously generated code with line numbers. Note that the generated code might have manual tweaks; please retain those tweaks wherever possible.

___BEGIN_PREVIOUS_CODE___

$codeFileContents$

___END_PREVIOUS_CODE___

But now I'm making some changes to the original prompt. The diff of the prompt is given below (enclosed between ___BEGIN_DIFF_OF_PROMPT___ and ___END_DIFF_OF_PROMPT___)

___BEGIN_DIFF_OF_PROMPT___

$promptDiff$

___END_DIFF_OF_PROMPT___


Respond with just the code (for the entire file) in the following format:

$START_FILE_CONTENTS:some/dir/file.py$
import a from "./a";
function somethingSomething() {
  //....
}
$END_FILE_CONTENTS:some/dir/file.py$