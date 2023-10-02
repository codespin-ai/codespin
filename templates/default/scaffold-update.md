$codegenPrompt$

Respond in the following example JSON structure.
```json
{
  "files": [
    { "name": "FILENAME1", "contents": "CONTENTS_GO_HERE..." },
    { "name": "FILENAME2", "contents": "CONTENTS_GO_HERE..." },
  ]
}
```

Include code and config files. Skip all instructions, just give me the code please.
Be complete, don't omit anything. Include as many files as possible. 

The source code might contain various quotation marks. Those will need to be escaped as needed.

Print the JSON inside a markdown code block. Ie, inside "```json{...}```";