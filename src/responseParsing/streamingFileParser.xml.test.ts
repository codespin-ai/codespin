import {
  createStreamingFileParser,
  StreamingFileParseResult,
} from "../responseParsing/streamingFileParser.js";

describe("streamingFileParser", () => {
  let results: StreamingFileParseResult[];
  let parser: (chunk: string) => void;
  const xmlElement = "code";

  beforeEach(() => {
    results = [];
    parser = createStreamingFileParser((result) => {
      results.push(result);
    }, xmlElement);
  });

  describe("streamingFileParser with XML", () => {
    test("parses a single complete file block", () => {
      const input = `Some markdown text
File path: ./src/test.ts
<code>
const x = 1;
</code>
More markdown`;

      parser(input);

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
        { type: "markdown", content: "Some markdown text\n" },
        { type: "start-file-block", path: "./src/test.ts" },
        {
          type: "end-file-block",
          file: { path: "./src/test.ts", content: "const x = 1;" },
        },
        { type: "text", content: "More markdown" },
      ];

      expect(results).toEqual(expected);
    });

    test("handles streaming chunks correctly", () => {
      parser("File path: ./sr");
      parser("c/test.ts\n<co");
      parser("de>\nconst x");
      parser(" = 1;</code>\n");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File path: ./sr" },
        { type: "text", content: "c/test.ts\n<co" },
        { type: "text", content: "de>\nconst x" },
        { type: "start-file-block", path: "./src/test.ts" },
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
            "Some markdown in between\nFile path: ./src/second.ts\n<code>\nconst second = false;\n</code>",
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

    test("handles empty file content", () => {
      const input = `File path: ./src/empty.ts
  <code>
  
  </code>`;

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
  <code>
  const x = 1;
  </code>`;

      parser(input);

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
      ];

      expect(results).toEqual(expected);
    });

    test("handles markdown content between file blocks split across chunks", () => {
      parser("File path: ./src/first.ts\n<code>\nconst x = 1;</code>\n");
      parser("Some markdown *with* ");
      parser("**formatting** and a [link](http://example.com)\n");
      parser("File path: ./src/second.ts\n<code>\nconst y = 2;</code>");

      const expected: StreamingFileParseResult[] = [
        {
          type: "text",
          content: "File path: ./src/first.ts\n<code>\nconst x = 1;</code>\n",
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
          content: "File path: ./src/second.ts\n<code>\nconst y = 2;</code>",
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
        "File path: ./src/first.ts\n<code>\nconst x = 1;</code>File path: ./src/second.ts\n<code>\nconst y = 2;</code>";

      parser(input);

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
        { type: "start-file-block", path: "./src/first.ts" },
        {
          type: "end-file-block",
          file: { path: "./src/first.ts", content: "const x = 1;" },
        },
        {
          type: "text",
          content: "File path: ./src/second.ts\n<code>\nconst y = 2;</code>",
        },
        { type: "start-file-block", path: "./src/second.ts" },
        {
          type: "end-file-block",
          file: { path: "./src/second.ts", content: "const y = 2;" },
        },
      ];

      expect(results).toEqual(expected);
    });

    test("handles XML tags split across chunks", () => {
      parser("File path: ./src/test.ts\n<cod");
      parser("e>const x = 1;</co");
      parser("de>");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File path: ./src/test.ts\n<cod" },
        { type: "text", content: "e>const x = 1;</co" },
        { type: "start-file-block", path: "./src/test.ts" }, // Moved up
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
      parser = createStreamingFileParser((result) => {
        results.push(result);
      }, "source");

      const input = `File path: ./src/test.ts
  <source>
  const x = 1;
  </source>`;

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

    test("ignores non-matching XML tags", () => {
      const input = `File path: ./src/test.ts
  <other>
  const x = 1;
  </other>`;

      parser(input);

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: input },
      ];

      expect(results).toEqual(expected);
    });

    test("handles File path: keyword split across chunks", () => {
      parser("File ");
      parser("path:");
      parser(" ./src/test.ts\n<code>\nconst x = 1;</code>");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File " },
        { type: "text", content: "path:" },
        {
          type: "text",
          content: " ./src/test.ts\n<code>\nconst x = 1;</code>",
        },
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
      parser("<c");
      parser("od");
      parser("e>");
      parser("\n");
      parser("const x = 1;");
      parser("</c");
      parser("ode>");

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
      parser("File path: ./src/test.ts");
      parser("\n");
      parser("<code>");
      parser("\n");
      parser("const x = 1;");
      parser("\n");
      parser("</code>");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File path: ./src/test.ts" },
        { type: "text", content: "\n" },
        { type: "text", content: "<code>" },
        { type: "start-file-block", path: "./src/test.ts" }, // Moved up
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
      parser("File path: ./src/a.ts\n<c");
      parser("ode>\nconst x = 1;</c");
      parser("ode>\nFi");
      parser("le path: ./src/b.ts");
      parser("\n<code>\n");
      parser("const y = 2;");
      parser("</code>");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File path: ./src/a.ts\n<c" },
        { type: "text", content: "ode>\nconst x = 1;</c" },
        { type: "start-file-block", path: "./src/a.ts" },
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
      parser("File pa");
      parser("th: ./src/a.ts\n<code>\nconst x = 1;</code>\n");
      parser("File path: ./src/b.ts\n<c");
      parser("ode>\nconst y = 2;</code>");

      const expected: StreamingFileParseResult[] = [
        { type: "text", content: "File pa" },
        {
          type: "text",
          content: "th: ./src/a.ts\n<code>\nconst x = 1;</code>\n",
        },
        { type: "start-file-block", path: "./src/a.ts" },
        {
          type: "end-file-block",
          file: { path: "./src/a.ts", content: "const x = 1;" },
        },
        { type: "text", content: "File path: ./src/b.ts\n<c" },
        { type: "text", content: "ode>\nconst y = 2;</code>" },
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
