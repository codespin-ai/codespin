{{#unless promptDiff}}
{{!-- First time generation  --}}
{{prompt}}
{{!-- Check if files are empty  --}}
{{#if files.length}}
Here is some relevant existing code, so that you can understand the context better.
{{#each files}}
./{{this.name}}
```
{{this.contents}}
```
{{/each}}
{{/if}}
{{!-- End: check if files are empty  --}}
{{else}}
{{!-- Regeneration  --}}
The following prompt was used to generate the code printed later.
Note that line numbers are included in the prompt.

```
{{previousPromptWithLineNumbers}}
```

{{#if files.length}}
Here is some relevant existing code, so that you can understand the context better.
{{#each files}}
{{#if this.previousContents}}
./{{this.name}}
```
{{#if this.previousContents}}
{{this.previousContents}}
{{else}}
{{this.contents}}
{{/if}}
```
{{/if}}
{{/each}}
{{/if}}

But now I'd like to make the following changes to the original prompt.
The diff of the prompt is given below.

```
{{promptDiff}}
```
{{/unless}}
{{!-- Print the files  --}}
Respond with just the code in the following format:

$START_FILE_CONTENTS:./some/path/filename.ext$
import a from "./a";
function somethingSomething() {
  //....
}
$END_FILE_CONTENTS:./some/path/filename.ext$
