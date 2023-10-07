{{#if promptDiff}}
The following prompt (enclosed between ___BEGIN_PROMPT___ and ___END_PROMPT___) was used to generate the code (for the file $codeFile$) printed later.

Note that line numbers are included in the prompt.

___BEGIN_PROMPT___

$previousPromptWithLineNumbers$

___END_PROMPT___

The following are files containing existing code with line numbers, so that you can understand the context better.
Note that the generated code might have manual tweaks; please retain those tweaks wherever possible.

{{#each files}}
./{{this.name}}

```
{{this.contentsWithLineNumbers}}
```

{{/each}}

But now I'd like to make the following changes to the original prompt. 
The diff of the prompt is given below (enclosed between ___BEGIN_DIFF_OF_PROMPT___ and ___END_DIFF_OF_PROMPT___)

___BEGIN_DIFF_OF_PROMPT___

$promptDiff$

___END_DIFF_OF_PROMPT___

{{else}}
{{/if}}


Respond with just the code (only for the file mentioned in the prompt) in the following format:

$START_FILE_CONTENTS:./some/path/filename.ext$
import a from "./a";
function somethingSomething() {
  //....
}
$END_FILE_CONTENTS:./some/path/filename.ext$
