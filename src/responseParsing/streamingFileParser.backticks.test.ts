import {
  createStreamingFileParser,
  StreamingFileParseResult,
} from "../responseParsing/streamingFileParser.js";

describe("streamingFileParser", () => {
  let results: StreamingFileParseResult[];
  let processChunk: (chunk: string) => void;

  beforeEach(() => {
    results = [];
    const streamingParser = createStreamingFileParser((result) => {
      results.push(result);
    });
    processChunk = streamingParser.processChunk;
  });

  describe("streamingFileParser with backticks", () => {
    test("parses a single complete file block", () => {
      const input = `Some markdown text
File path: ./src/test.ts
\`\`\`typescript
const x = 1;
\`\`\`
More markdown`;

      processChunk(input);

      expect(results).toEqual([
        { type: "text", content: input },
        { type: "text-block", content: "Some markdown text\n" },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: "const x = 1;" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
        { type: "text", content: "More markdown" },
      ]);
    });

    test("handles streaming chunks correctly", () => {
      processChunk("File path: ./sr");
      processChunk("c/test.ts\n```type");
      processChunk("script\nconst x");
      processChunk(" = 1;\n```\n");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File path: ./sr" },
        { type: "text", content: "c/test.ts\n```type" },
        { type: "text", content: "script\nconst x" },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: "const x" },
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

      processChunk(input);

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
        { type: "start-file-block", path: "./src/first.ts" },
        {
          type: "text",
          content: "const first = true;",
        },
        {
          type: "end-file-block",
          file: { path: "./src/first.ts", content: "const first = true;" },
        },
        {
          type: "text",
          content:
            "Some markdown in between\nFile path: ./src/second.ts\n```typescript\nconst second = false;\n```",
        },
        { type: "text-block", content: "Some markdown in between\n" },
        { type: "start-file-block", path: "./src/second.ts" },
        { type: "text", content: "const second = false;" },
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

      processChunk(input);

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: "const x = 1;" },
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

      processChunk(input);

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
        { type: "start-file-block", path: "./src/empty.ts" },
        { type: "text", content: "" },
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

      processChunk(input);

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
      ];

      expect(results).toEqual(expected);
    });

    test("handles markdown content between file blocks split across chunks", () => {
      processChunk("File path: ./src/first.ts\n```\nconst x = 1;```\n");
      processChunk("Some markdown *with* ");
      processChunk("**formatting** and a [link](http://example.com)\n");
      processChunk("File path: ./src/second.ts\n```\nconst y = 2;\n```");

      const expected: StreamingFileParseResult[] = [
        {
          type: "text",
          content: "File path: ./src/first.ts\n```\nconst x = 1;```\n",
        },
        { type: "start-file-block", path: "./src/first.ts" },
        { type: "text", content: "const x = 1;" },
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
          content: "File path: ./src/second.ts\n```\nconst y = 2;\n```",
        },
        {
          type: "text-block",
          content:
            "Some markdown *with* **formatting** and a [link](http://example.com)\n",
        },
        { type: "start-file-block", path: "./src/second.ts" },
        { type: "text", content: "const y = 2;" },
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

      processChunk(input);

      const expected: StreamingFileParseResult[] = [
        {
          type: "text",
          content: input,
        },
        { type: "start-file-block", path: "./src/first.ts" },
        {
          type: "text",
          content: "const x = 1;",
        },
        {
          type: "end-file-block",
          file: { path: "./src/first.ts", content: "const x = 1;" },
        },
        {
          type: "text",
          content: "File path: ./src/second.ts\n```\nconst y = 2;```",
        },
        { type: "start-file-block", path: "./src/second.ts" },
        { type: "text", content: "const y = 2;" },
        {
          type: "end-file-block",
          file: { path: "./src/second.ts", content: "const y = 2;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles end marker split between chunks", () => {
      processChunk("File path: ./src/test.ts\n```\nconst x = 1;``");
      processChunk("`\n");

      const expected: StreamingFileParseResult[] = [
        {
          type: "text",
          content: "File path: ./src/test.ts\n```\nconst x = 1;``",
        },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: "const x = 1;``" },
        { type: "text", content: "`\n" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles File path: keyword split across chunks", () => {
      processChunk("File ");
      processChunk("path:");
      processChunk(" ./src/test.ts\n```\nconst x = 1;```");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File " },
        { type: "text", content: "path:" },
        { type: "text", content: " ./src/test.ts\n```\nconst x = 1;```" },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: "const x = 1;" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles extreme chunking of start sequence", () => {
      processChunk("F");
      processChunk("ile ");
      processChunk("pat");
      processChunk("h: ");
      processChunk("./sr");
      processChunk("c/te");
      processChunk("st.ts");
      processChunk("\n");
      processChunk("``");
      processChunk("`");
      processChunk("\n");
      processChunk("const x = 1;");
      processChunk("``");
      processChunk("`");

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
      processChunk("File path: ./src/test.ts");
      processChunk("\n");
      processChunk("```");
      processChunk("\n");
      processChunk("const x = 1;");
      processChunk("\n");
      processChunk("```");

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
      processChunk("File path: ./src/a.ts\n``");
      processChunk("`\nconst x = 1;``");
      processChunk("`\nFi");
      processChunk("le path: ./src/b.ts");
      processChunk("\n```\n");
      processChunk("const y = 2;");
      processChunk("```");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File path: ./src/a.ts\n``" },
        { type: "text", content: "`\nconst x = 1;``" },
        { type: "start-file-block", path: "./src/a.ts" },
        { type: "text", content: "const x = 1;``" },
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
      processChunk("File pa");
      processChunk("th: ./src/a.ts\n```\nconst x = 1;```\n");
      processChunk("File path: ./src/b.ts\n``");
      processChunk("`\nconst y = 2;```");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File pa" },
        {
          type: "text",
          content: "th: ./src/a.ts\n```\nconst x = 1;```\n",
        },
        { type: "start-file-block", path: "./src/a.ts" },
        { type: "text", content: "const x = 1;" },
        {
          type: "end-file-block",
          file: { path: "./src/a.ts", content: "const x = 1;" },
        },
        { type: "text", content: "File path: ./src/b.ts\n``" },
        { type: "text", content: "`\nconst y = 2;```" },
        { type: "start-file-block", path: "./src/b.ts" },
        { type: "text", content: "const y = 2;" },
        {
          type: "end-file-block",
          file: { path: "./src/b.ts", content: "const y = 2;" },
        },
      ];

      expect(results).toEqual(expected);
    });
  });
});
