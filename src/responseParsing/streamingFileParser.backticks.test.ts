import {
  createStreamingFileParser,
  StreamingFileParseResult,
} from "../responseParsing/streamingFileParser.js";

describe("streamingFileParser", () => {
  let results: StreamingFileParseResult[];
  let parser: (chunk: string) => void;

  beforeEach(() => {
    results = [];
    parser = createStreamingFileParser((result) => {
      results.push(result);
    });
  });

  describe("streamingFileParser with backticks", () => {
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
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
        { type: "text", content: "More markdown" },
      ]);
    });

    test("handles streaming chunks correctly", () => {
      parser("File path: ./sr");
      parser("c/test.ts\n```type");
      parser("script\nconst x");
      parser(" = 1;\n```\n");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File path: ./sr" },
        { type: "text", content: "c/test.ts\n```type" },
        { type: "text", content: "script\nconst x" },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: " = 1;\n```\n" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
      ];

      expect(results).toEqual(expected);
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

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
        { type: "start-file-block", path: "./src/first.ts" },
        {
          type: "end-file-block",
          file: { path: "./src/first.ts", content: "const first = true;" },
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
          file: { path: "./src/second.ts", content: "const second = false;" },
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

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
        { type: "start-file-block", path: "./src/test.ts" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles empty file content", () => {
      const input = `File path: ./src/empty.ts
  \`\`\`typescript

  \`\`\``;

      parser(input);

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
        { type: "start-file-block", path: "./src/empty.ts" },
        {
          type: "end-file-block",
          file: { path: "./src/empty.ts", content: "" },
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

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
      ];

      expect(results).toEqual(expected);
    });

    test("handles markdown content between file blocks split across chunks", () => {
      parser("File path: ./src/first.ts\n```\nconst x = 1;```\n");
      parser("Some markdown *with* ");
      parser("**formatting** and a [link](http://example.com)\n");
      parser("File path: ./src/second.ts\n```\nconst y = 2;```");

      const expected: StreamingFileParseResult[] = [
        {
          type: "text",
          content: "File path: ./src/first.ts\n```\nconst x = 1;```\n",
        },
        { type: "start-file-block", path: "./src/first.ts" },
        {
          type: "end-file-block",
          file: { path: "./src/first.ts", content: "const x = 1;" },
        },
        { type: "text", content: "Some markdown *with* " },
        {
          type: "text",
          content: "**formatting** and a [link](http://example.com)\n",
        },
        {
          type: "text",
          content: "File path: ./src/second.ts\n```\nconst y = 2;```",
        },
        {
          type: "markdown",
          content:
            "Some markdown *with* **formatting** and a [link](http://example.com)\n",
        },
        { type: "start-file-block", path: "./src/second.ts" },
        {
          type: "end-file-block",
          file: { path: "./src/second.ts", content: "const y = 2;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles consecutive file blocks without separator", () => {
      const input =
        "File path: ./src/first.ts\n```\nconst x = 1;```File path: ./src/second.ts\n```\nconst y = 2;```";

      parser(input);

      const expected: StreamingFileParseResult[] = [
        {
          type: "text",
          content: input,
        },
        {
          type: "start-file-block",
          path: "./src/first.ts",
        },
        {
          type: "end-file-block",
          file: { path: "./src/first.ts", content: "const x = 1;" },
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
          file: { path: "./src/second.ts", content: "const y = 2;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles end marker split between chunks", () => {
      parser("File path: ./src/test.ts\n```\nconst x = 1;``");
      parser("`\n");

      const expected: StreamingFileParseResult[] = [
        {
          type: "text",
          content: "File path: ./src/test.ts\n```\nconst x = 1;``",
        },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: "`\n" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles File path: keyword split across chunks", () => {
      parser("File ");
      parser("path:");
      parser(" ./src/test.ts\n```\nconst x = 1;```");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File " },
        { type: "text", content: "path:" },
        { type: "text", content: " ./src/test.ts\n```\nconst x = 1;```" },
        { type: "start-file-block", path: "./src/test.ts" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
      ];

      expect(results).toEqual(expected);
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

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "F" },
        { type: "text", content: "ile " },
        { type: "text", content: "pat" },
        { type: "text", content: "h: " },
        { type: "text", content: "./sr" },
        { type: "text", content: "c/te" },
        { type: "text", content: "st.ts" },
        { type: "text", content: "\n" },
        { type: "text", content: "``" },
        { type: "text", content: "`" },
        { type: "text", content: "\n" },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: "const x = 1;" },
        { type: "text", content: "``" },
        { type: "text", content: "`" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles newlines split in various positions", () => {
      parser("File path: ./src/test.ts");
      parser("\n");
      parser("```");
      parser("\n");
      parser("const x = 1;");
      parser("\n");
      parser("```");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File path: ./src/test.ts" },
        { type: "text", content: "\n" },
        { type: "text", content: "```" },
        { type: "text", content: "\n" },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: "const x = 1;" },
        { type: "text", content: "\n" },
        { type: "text", content: "```" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles multiple files with various split points", () => {
      parser("File path: ./src/a.ts\n``");
      parser("`\nconst x = 1;``");
      parser("`\nFi");
      parser("le path: ./src/b.ts");
      parser("\n```\n");
      parser("const y = 2;");
      parser("```");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File path: ./src/a.ts\n``" },
        { type: "text", content: "`\nconst x = 1;``" },
        { type: "start-file-block", path: "./src/a.ts" },
        { type: "text", content: "`\nFi" },
        {
          type: "end-file-block",
          file: { path: "./src/a.ts", content: "const x = 1;" },
        },
        { type: "text", content: "Fi" },
        { type: "text", content: "le path: ./src/b.ts" },
        { type: "text", content: "\n```\n" },
        { type: "start-file-block", path: "./src/b.ts" },
        { type: "text", content: "const y = 2;" },
        { type: "text", content: "```" },
        {
          type: "end-file-block",
          file: { path: "./src/b.ts", content: "const y = 2;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles partial file marker followed by different file", () => {
      parser("File pa");
      parser("th: ./src/a.ts\n```\nconst x = 1;```\n");
      parser("File path: ./src/b.ts\n``");
      parser("`\nconst y = 2;```");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File pa" },
        { type: "text", content: "th: ./src/a.ts\n```\nconst x = 1;```\n" },
        { type: "start-file-block", path: "./src/a.ts" },
        {
          type: "end-file-block",
          file: { path: "./src/a.ts", content: "const x = 1;" },
        },
        { type: "text", content: "File path: ./src/b.ts\n``" },
        { type: "text", content: "`\nconst y = 2;```" },
        { type: "start-file-block", path: "./src/b.ts" },
        {
          type: "end-file-block",
          file: { path: "./src/b.ts", content: "const y = 2;" },
        },
      ];

      expect(results).toEqual(expected);
    });
  });
});
