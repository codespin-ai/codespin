import {
  createStreamingFileParser,
  StreamingFileParseResult,
} from "./streamingFileParser.js";

describe("streamingFileParser", () => {
  it("emits new-file-block when file block starts and file when complete", () => {
    const results: StreamingFileParseResult[] = [];
    const parser = createStreamingFileParser((result) => results.push(result));

    const input = `
File path:./src/test.ts
\`\`\`
export function test() {}
\`\`\`
`;

    parser(input);

    const expected = [
      { type: "text", content: input },
      { type: "markdown", content: "\n" },
      { type: "new-file-block", path: "./src/test.ts" },
      {
        type: "file",
        file: {
          path: "./src/test.ts",
          contents: "export function test() {}\n",
        },
      },
    ];

    expect(results).toEqual(expected);
  });

  it("handles multiple file blocks", () => {
    const results: StreamingFileParseResult[] = [];
    const parser = createStreamingFileParser((result) => results.push(result));

    const input = `
File path:./src/a.ts
\`\`\`
function a() {}
\`\`\`
Some text
File path:./src/b.ts
\`\`\`
function b() {}
\`\`\`
`;

    parser(input);

    const expected = [
      { type: "text", content: input },
      { type: "markdown", content: "\n" },
      { type: "new-file-block", path: "./src/a.ts" },
      {
        type: "file",
        file: {
          path: "./src/a.ts",
          contents: "function a() {}\n",
        },
      },
      { type: "markdown", content: "Some text\n" },
      { type: "new-file-block", path: "./src/b.ts" },
      {
        type: "file",
        file: {
          path: "./src/b.ts",
          contents: "function b() {}\n",
        },
      },
    ];

    expect(results).toEqual(expected);
  });

  it("handles streaming chunks", () => {
    const results: StreamingFileParseResult[] = [];
    const parser = createStreamingFileParser((result) => results.push(result));

    parser("File path:./sr");
    parser("c/test.ts\n```\n");
    parser("export function");
    parser(" test() {}\n```\n");

    const expected = [
      { type: "text", content: "File path:./sr" },
      { type: "text", content: "c/test.ts\n```\n" },
      { type: "text", content: "export function" },
      { type: "text", content: " test() {}\n```\n" },
      { type: "new-file-block", path: "./src/test.ts" },
      {
        type: "file",
        file: {
          path: "./src/test.ts",
          contents: "export function test() {}\n",
        },
      },
    ];

    expect(results).toEqual(expected);
  });

  it("handles markdown content with code blocks", () => {
    const results: StreamingFileParseResult[] = [];
    const parser = createStreamingFileParser((result) => results.push(result));

    const input = `Here's some markdown with a code block:
\`\`\`typescript
const x = 1;
\`\`\`
File path:./src/test.ts
\`\`\`
export function test() {}
\`\`\`
`;

    parser(input);

    const expected = [
      { type: "text", content: input },
      {
        type: "markdown",
        content: `Here's some markdown with a code block:
\`\`\`typescript
const x = 1;
\`\`\`
`,
      },
      { type: "new-file-block", path: "./src/test.ts" },
      {
        type: "file",
        file: {
          path: "./src/test.ts",
          contents: "export function test() {}\n",
        },
      },
    ];

    expect(results).toEqual(expected);
  });

  it("handles multiple streaming chunks with markdown content", () => {
    const results: StreamingFileParseResult[] = [];
    const parser = createStreamingFileParser((result) => results.push(result));

    parser("# Header\nSome ");
    parser("content\n");
    parser("File path:./test.ts\n```\n");
    parser("code\n```\n");
    parser("More content\n");
    parser("File path:./other.ts\n```\nmore code\n```\n");

    const expected = [
      { type: "text", content: "# Header\nSome " },
      { type: "text", content: "content\n" },
      { type: "text", content: "File path:./test.ts\n```\n" },
      { type: "text", content: "code\n```\n" },
      { type: "markdown", content: "# Header\nSome content\n" },
      { type: "new-file-block", path: "./test.ts" },
      {
        type: "file",
        file: {
          path: "./test.ts",
          contents: "code\n",
        },
      },
      { type: "text", content: "More content\n" },
      { type: "text", content: "File path:./other.ts\n```\nmore code\n```\n" },
      { type: "markdown", content: "More content\n" },
      { type: "new-file-block", path: "./other.ts" },
      {
        type: "file",
        file: {
          path: "./other.ts",
          contents: "more code\n",
        },
      },
    ];

    expect(results).toEqual(expected);
  });

  it("handles file path split across chunks", () => {
    const results: StreamingFileParseResult[] = [];
    const parser = createStreamingFileParser((result) => results.push(result));

    parser("Some text\nFile ");
    parser("path:");
    parser("./split.ts\n```\n");
    parser("content\n```\n");

    const expected = [
      { type: "text", content: "Some text\nFile " },
      { type: "text", content: "path:" },
      { type: "text", content: "./split.ts\n```\n" },
      { type: "text", content: "content\n```\n" },
      { type: "markdown", content: "Some text\n" },
      { type: "new-file-block", path: "./split.ts" },
      {
        type: "file",
        file: {
          path: "./split.ts",
          contents: "content\n",
        },
      },
    ];

    expect(results).toEqual(expected);
  });

  it("handles empty content between file blocks", () => {
    const results: StreamingFileParseResult[] = [];
    const parser = createStreamingFileParser((result) => results.push(result));

    const input = `File path:./a.ts
\`\`\`
code a
\`\`\`
File path:./b.ts
\`\`\`
code b
\`\`\`
`;

    parser(input);

    const expected = [
      { type: "text", content: input },
      { type: "new-file-block", path: "./a.ts" },
      {
        type: "file",
        file: {
          path: "./a.ts",
          contents: "code a\n",
        },
      },
      { type: "new-file-block", path: "./b.ts" },
      {
        type: "file",
        file: {
          path: "./b.ts",
          contents: "code b\n",
        },
      },
    ];

    expect(results).toEqual(expected);
  });

  it("handles multiple files via streaming chunks", () => {
    const results: StreamingFileParseResult[] = [];
    const parser = createStreamingFileParser((result) => results.push(result));

    parser("Here's file 1:\nFile ");
    parser("path:./a.ts\n```\n");
    parser("code a\n```\n");
    parser("And here's file 2:\n");
    parser("File path:");
    parser("./b.ts\n");
    parser("```\ncode b\n```\n");

    const expected = [
      { type: "text", content: "Here's file 1:\nFile " },
      { type: "text", content: "path:./a.ts\n```\n" },
      { type: "text", content: "code a\n```\n" },
      { type: "markdown", content: "Here's file 1:\n" },
      { type: "new-file-block", path: "./a.ts" },
      {
        type: "file",
        file: {
          path: "./a.ts",
          contents: "code a\n",
        },
      },
      { type: "text", content: "And here's file 2:\n" },
      { type: "text", content: "File path:" },
      { type: "text", content: "./b.ts\n" },
      { type: "text", content: "```\ncode b\n```\n" },
      { type: "markdown", content: "And here's file 2:\n" },
      { type: "new-file-block", path: "./b.ts" },
      {
        type: "file",
        file: {
          path: "./b.ts",
          contents: "code b\n",
        },
      },
    ];

    expect(results).toEqual(expected);
  });
});
