import {
  createStreamingFileParser,
  StreamingFileParseResult,
} from "../responseParsing/streamingFileParser.js";

describe("streamingFileParser", () => {
  let results: StreamingFileParseResult[];
  let processChunk: (chunk: string) => void;
  const xmlElement = "code";

  beforeEach(() => {
    results = [];
    const streamingParser = createStreamingFileParser((result) => {
      results.push(result);
    }, xmlElement);

    processChunk = streamingParser.processChunk;
  });

  describe("streamingFileParser with XML", () => {
    test("parses a single complete file block", () => {
      const input = `Some markdown text
File path: ./src/test.ts
<code>
const x = 1;
</code>
More markdown`;

      processChunk(input);

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
        { type: "text-block", content: "Some markdown text\n" },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: "const x = 1;" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
        { type: "text", content: "More markdown" },
      ];

      expect(results).toEqual(expected);
    });

    test("handles streaming chunks correctly", () => {
      processChunk("File path: ./sr");
      processChunk("c/test.ts\n<co");
      processChunk("de>\nconst x");
      processChunk(" = 1;</code>\n");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File path: ./sr" },
        { type: "text", content: "c/test.ts\n<co" },
        { type: "text", content: "de>\nconst x" },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: "const x" },
        { type: "text", content: " = 1;</code>\n" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles multiple file blocks", () => {
      const input = `File path: ./src/first.ts
<code>
const first = true;
</code>
Some markdown in between
File path: ./src/second.ts
<code>
const second = false;
</code>`;

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
            "Some markdown in between\nFile path: ./src/second.ts\n<code>\nconst second = false;\n</code>",
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

    test("handles empty file content", () => {
      const input = `File path: ./src/empty.ts
  <code>
  
  </code>`;

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
  <code>
  const x = 1;
  </code>`;

      processChunk(input);

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
      ];

      expect(results).toEqual(expected);
    });

    test("handles markdown content between file blocks split across chunks", () => {
      processChunk("File path: ./src/first.ts\n<code>\nconst x = 1;</code>\n");
      processChunk("Some markdown *with* ");
      processChunk("**formatting** and a [link](http://example.com)\n");
      processChunk("File path: ./src/second.ts\n<code>\nconst y = 2;</code>");

      const expected: StreamingFileParseResult[] = [
        {
          type: "text",
          content: "File path: ./src/first.ts\n<code>\nconst x = 1;</code>\n",
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
          content: "File path: ./src/second.ts\n<code>\nconst y = 2;</code>",
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
        "File path: ./src/first.ts\n<code>\nconst x = 1;</code>File path: ./src/second.ts\n<code>\nconst y = 2;</code>";

      processChunk(input);

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
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
          content: "File path: ./src/second.ts\n<code>\nconst y = 2;</code>",
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

    test("handles XML tags split across chunks", () => {
      processChunk("File path: ./src/test.ts\n<cod");
      processChunk("e>const x = 1;</co");
      processChunk("de>");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File path: ./src/test.ts\n<cod" },
        { type: "text", content: "e>const x = 1;</co" },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: "const x = 1;</co" },
        { type: "text", content: "de>" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles XML with different element names", () => {
      results = [];
      const { processChunk } = createStreamingFileParser((result) => {
        results.push(result);
      }, "source");

      const input = `File path: ./src/test.ts
<source>
const x = 1;
</source>`;

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

    test("ignores non-matching XML tags", () => {
      const input = `File path: ./src/test.ts
  <other>
  const x = 1;
  </other>`;

      processChunk(input);

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
      ];

      expect(results).toEqual(expected);
    });

    test("handles File path: keyword split across chunks", () => {
      processChunk("File ");
      processChunk("path:");
      processChunk(" ./src/test.ts\n<code>\nconst x = 1;</code>");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File " },
        { type: "text", content: "path:" },
        {
          type: "text",
          content: " ./src/test.ts\n<code>\nconst x = 1;</code>",
        },
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
      processChunk("<c");
      processChunk("od");
      processChunk("e>");
      processChunk("\n");
      processChunk("const x = 1;");
      processChunk("</c");
      processChunk("ode>");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "F" },
        { type: "text", content: "ile " },
        { type: "text", content: "pat" },
        { type: "text", content: "h: " },
        { type: "text", content: "./sr" },
        { type: "text", content: "c/te" },
        { type: "text", content: "st.ts" },
        { type: "text", content: "\n" },
        { type: "text", content: "<c" },
        { type: "text", content: "od" },
        { type: "text", content: "e>" },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: "\n" },
        { type: "text", content: "const x = 1;" },
        { type: "text", content: "</c" },
        { type: "text", content: "ode>" },
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
      processChunk("<code>");
      processChunk("\n");
      processChunk("const x = 1;");
      processChunk("\n");
      processChunk("</code>");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File path: ./src/test.ts" },
        { type: "text", content: "\n" },
        { type: "text", content: "<code>" },
        { type: "start-file-block", path: "./src/test.ts" },
        { type: "text", content: "\n" },
        { type: "text", content: "const x = 1;" },
        { type: "text", content: "\n" },
        { type: "text", content: "</code>" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles multiple files with various split points", () => {
      processChunk("File path: ./src/a.ts\n<c");
      processChunk("ode>\nconst x = 1;</c");
      processChunk("ode>\nFi");
      processChunk("le path: ./src/b.ts");
      processChunk("\n<code>\n");
      processChunk("const y = 2;");
      processChunk("</code>");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File path: ./src/a.ts\n<c" },
        { type: "text", content: "ode>\nconst x = 1;</c" },
        { type: "start-file-block", path: "./src/a.ts" },
        { type: "text", content: "const x = 1;</c" },
        { type: "text", content: "ode>\nFi" },
        {
          type: "end-file-block",
          file: { path: "./src/a.ts", content: "const x = 1;" },
        },
        { type: "text", content: "Fi" },
        { type: "text", content: "le path: ./src/b.ts" },
        { type: "text", content: "\n<code>\n" },
        { type: "start-file-block", path: "./src/b.ts" },
        { type: "text", content: "const y = 2;" },
        { type: "text", content: "</code>" },
        {
          type: "end-file-block",
          file: { path: "./src/b.ts", content: "const y = 2;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles partial file marker followed by different file", () => {
      processChunk("File pa");
      processChunk("th: ./src/a.ts\n<code>\nconst x = 1;</code>\n");
      processChunk("File path: ./src/b.ts\n<c");
      processChunk("ode>\nconst y = 2;</code>");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File pa" },
        {
          type: "text",
          content: "th: ./src/a.ts\n<code>\nconst x = 1;</code>\n",
        },
        { type: "start-file-block", path: "./src/a.ts" },
        { type: "text", content: "const x = 1;" },
        {
          type: "end-file-block",
          file: { path: "./src/a.ts", content: "const x = 1;" },
        },
        { type: "text", content: "File path: ./src/b.ts\n<c" },
        { type: "text", content: "ode>\nconst y = 2;</code>" },
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

  describe("finish functionality with XML", () => {
    let results: StreamingFileParseResult[];
    let processChunk: (chunk: string) => void;
    let finish: () => void;
    const xmlElement = "code";

    beforeEach(() => {
      results = [];
      const streamingParser = createStreamingFileParser((result) => {
        results.push(result);
      }, xmlElement);
      processChunk = streamingParser.processChunk;
      finish = streamingParser.finish;
    });

    test("emits remaining content as text-block when finish is called", () => {
      processChunk("Some unfinished markdown content");
      finish();

      expect(results).toEqual([
        { type: "text", content: "Some unfinished markdown content" },
        { type: "text-block", content: "Some unfinished markdown content" },
      ]);
    });

    test("does nothing when finish is called with empty buffer", () => {
      finish();
      expect(results).toEqual([]);
    });

    test("does nothing when finish is called with whitespace-only buffer", () => {
      processChunk("  \n  \t  ");
      finish();

      expect(results).toEqual([{ type: "text", content: "  \n  \t  " }]);
    });

    test("handles multiple chunks followed by finish", () => {
      processChunk("Some initial ");
      processChunk("content followed ");
      processChunk("by more text");
      finish();

      expect(results).toEqual([
        { type: "text", content: "Some initial " },
        { type: "text", content: "content followed " },
        { type: "text", content: "by more text" },
        {
          type: "text-block",
          content: "Some initial content followed by more text",
        },
      ]);
    });
  });
});
