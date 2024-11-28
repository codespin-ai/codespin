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

  test("handles markdown content between file blocks split across chunks", () => {
    parser("File path: ./src/first.ts\n```\nconst x = 1;```\n");
    parser("Some markdown *with* ");
    parser("**formatting** and a [link](http://example.com)\n");
    parser("File path: ./src/second.ts\n```\nconst y = 2;```");

    expect(results).toContainEqual({
      type: "markdown",
      content:
        "Some markdown *with* **formatting** and a [link](http://example.com)\n",
    });
  });

  test("handles consecutive file blocks without separator", () => {
    parser(
      "File path: ./src/first.ts\n```\nconst x = 1;```File path: ./src/second.ts\n```\nconst y = 2;```"
    );

    expect(results).toEqual([
      {
        type: "text",
        content:
          "File path: ./src/first.ts\n```\nconst x = 1;```File path: ./src/second.ts\n```\nconst y = 2;```",
      },
      {
        type: "start-file-block",
        path: "./src/first.ts",
      },
      {
        type: "end-file-block",
        file: { path: "./src/first.ts", contents: "const x = 1;" },
      },
      {
        type: "text",
        content: "File path: ./src/second.ts\n```\nconst y = 2;```",
      },
      {
        type: "start-file-block",
        path: "./src/second.ts",
      },
      {
        type: "end-file-block",
        file: { path: "./src/second.ts", contents: "const y = 2;" },
      },
    ]);
  });

  test("handles end marker split between chunks", () => {
    parser("File path: ./src/test.ts\n```\nconst x = 1;``"); // partial end marker
    parser("`\n"); // remaining end marker

    expect(results).toContainEqual({
      type: "end-file-block",
      file: { path: "./src/test.ts", contents: "const x = 1;" },
    });
  });

  test("handles File path: keyword split across chunks", () => {
    parser("File ");
    parser("path:");
    parser(" ./src/test.ts\n```\nconst x = 1;```");

    expect(results).toContainEqual({
      type: "end-file-block",
      file: { path: "./src/test.ts", contents: "const x = 1;" },
    });
  });

  test("handles extreme chunking of start sequence", () => {
    parser("F");
    parser("ile ");
    parser("pat");
    parser("h: ");
    parser("./sr");
    parser("c/te");
    parser("st.ts");
    parser("\n");
    parser("``");
    parser("`");
    parser("\n");
    parser("const x = 1;");
    parser("``");
    parser("`");

    expect(results).toContainEqual({
      type: "end-file-block",
      file: { path: "./src/test.ts", contents: "const x = 1;" },
    });
  });

  test("handles newlines split in various positions", () => {
    parser("File path: ./src/test.ts");
    parser("\n"); // split after path
    parser("```");
    parser("\n"); // split after start marker
    parser("const x = 1;");
    parser("\n"); // split before end marker
    parser("```");

    expect(results).toContainEqual({
      type: "end-file-block",
      file: { path: "./src/test.ts", contents: "const x = 1;" },
    });
  });

  test("handles multiple files with various split points", () => {
    parser("File path: ./src/a.ts\n``");
    parser("`\nconst x = 1;``");
    parser("`\nFi");
    parser("le path: ./src/b.ts");
    parser("\n```\n");
    parser("const y = 2;");
    parser("```");

    expect(results).toContainEqual({
      type: "end-file-block",
      file: { path: "./src/a.ts", contents: "const x = 1;" },
    });
    expect(results).toContainEqual({
      type: "end-file-block",
      file: { path: "./src/b.ts", contents: "const y = 2;" },
    });
  });

  test("handles partial file marker followed by different file", () => {
    parser("File pa");
    parser("th: ./src/a.ts\n```\nconst x = 1;```\n");
    parser("File path: ./src/b.ts\n``");
    parser("`\nconst y = 2;```");

    expect(results).toContainEqual({
      type: "end-file-block",
      file: { path: "./src/a.ts", contents: "const x = 1;" },
    });
    expect(results).toContainEqual({
      type: "end-file-block",
      file: { path: "./src/b.ts", contents: "const y = 2;" },
    });
  });
});
