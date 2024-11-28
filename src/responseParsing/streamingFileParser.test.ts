import {
  createStreamingFileParser,
  StreamingFileParseResult,
} from "../responseParsing/streamingFileParser.js";
import { SourceFile } from "../sourceCode/SourceFile.js";

describe("streamingFileParser", () => {
  let results: StreamingFileParseResult[];
  let parser: (chunk: string) => void;

  beforeEach(() => {
    results = [];
    parser = createStreamingFileParser((result) => {
      results.push(result);
    });
  });

  test("parses a single complete file block", () => {
    const input = `Some markdown text
File path: ./src/test.ts
\`\`\`typescript
const x = 1;
\`\`\`
More markdown`;

    parser(input);

    expect(results).toEqual([
      { type: "text", content: input },
      { type: "markdown", content: "Some markdown text\n" },
      { type: "start-file-block", path: "./src/test.ts" },
      {
        type: "end-file-block",
        file: { path: "./src/test.ts", contents: "const x = 1;" },
      },
      { type: "text", content: "More markdown" },
    ]);
  });

  test("handles streaming chunks correctly", () => {
    // Send the input in multiple chunks
    parser("File path: ./sr");
    expect(results).toEqual([{ type: "text", content: "File path: ./sr" }]);

    parser("c/test.ts\n```type");
    expect(results).toEqual([
      { type: "text", content: "File path: ./sr" },
      { type: "text", content: "c/test.ts\n```type" },
      { type: "start-file-block", path: "./src/test.ts" },
    ]);

    parser("script\nconst x");
    expect(results).toEqual([
      { type: "text", content: "File path: ./sr" },
      { type: "text", content: "c/test.ts\n```type" },
      { type: "start-file-block", path: "./src/test.ts" },
      { type: "text", content: "script\nconst x" },
    ]);

    parser(" = 1;\n```\n");
    expect(results).toEqual([
      { type: "text", content: "File path: ./sr" },
      { type: "text", content: "c/test.ts\n```type" },
      { type: "start-file-block", path: "./src/test.ts" },
      { type: "text", content: "script\nconst x" },
      { type: "text", content: " = 1;\n```\n" },
      {
        type: "end-file-block",
        file: { path: "./src/test.ts", contents: "const x = 1;" },
      },
    ]);
  });

  test("handles multiple file blocks", () => {
    const input = `File path: ./src/first.ts
\`\`\`typescript
const first = true;
\`\`\`
Some markdown in between
File path: ./src/second.ts
\`\`\`typescript
const second = false;
\`\`\``;

    parser(input);

    const expected = [
      { type: "text", content: input },
      { type: "start-file-block", path: "./src/first.ts" },
      {
        type: "end-file-block",
        file: { path: "./src/first.ts", contents: "const first = true;" },
      },
      {
        type: "text",
        content:
          "Some markdown in between\nFile path: ./src/second.ts\n```typescript\nconst second = false;\n```",
      },
      { type: "markdown", content: "Some markdown in between\n" },
      { type: "start-file-block", path: "./src/second.ts" },
      {
        type: "end-file-block",
        file: { path: "./src/second.ts", contents: "const second = false;" },
      },
    ];

    expect(results).toEqual(expected);
  });

  test("handles file blocks without language specification", () => {
    const input = `File path: ./src/test.ts
\`\`\`
const x = 1;
\`\`\``;

    parser(input);

    const expected = [
      { type: "text", content: input },
      { type: "start-file-block", path: "./src/test.ts" },
      {
        type: "end-file-block",
        file: { path: "./src/test.ts", contents: "const x = 1;" },
      },
    ];

    expect(results).toEqual(expected);
  });

  test("handles empty file contents", () => {
    const input = `File path: ./src/empty.ts
  \`\`\`typescript

  \`\`\``;

    parser(input);

    const expected = [
      { type: "text", content: input },
      { type: "start-file-block", path: "./src/empty.ts" },
      {
        type: "end-file-block",
        file: { path: "./src/empty.ts", contents: "" },
      },
    ];

    expect(results).toEqual(expected);
  });

  test("ignores regular code blocks without file paths", () => {
    const input = `Regular markdown
  \`\`\`typescript
  const x = 1;
  \`\`\``;

    parser(input);

    expect(results).toEqual([{ type: "text", content: input }]);
  });
});
