{{#unless promptDiff}}
{{!-- First time generation  --}}
{{prompt}}
{{!-- Check if files are empty  --}}
{{#if files.length}}
Here is some relevant existing code, so that you can understand the context better.

{{#each files}}
Source code for ./{{this.name}}
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
Source code for ./{{this.name}}
```
{{this.previousContents}}
```
{{else}}
Source code for ./{{this.name}}
```
{{this.contents}}
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
{{#if files.length}}
If the file content was provided, make modifications buy try to retain existing code and structure. 

{{/if}}
Respond with just the code (but exclude invocation examples etc) in the following format:

$START_FILE_CONTENTS:./some/path/filename.ext$
import a from "./a";
function somethingSomething() {
  //....
}
$END_FILE_CONTENTS:./some/path/filename.ext$

