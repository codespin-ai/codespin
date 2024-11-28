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
      { type: "start-file-block", path: "./src/test.ts" },
      { type: "text", content: "export function test() {}\n" },
      {
        type: "end-file-block",
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
      { type: "start-file-block", path: "./src/a.ts" },
      { type: "text", content: "function a() {}\n" },
      {
        type: "end-file-block",
        file: {
          path: "./src/a.ts",
          contents: "function a() {}\n",
        },
      },
      { type: "text", content: "Some text\n" },
      { type: "markdown", content: "Some text\n" },
      { type: "start-file-block", path: "./src/b.ts" },
      { type: "text", content: "function b() {}\n" },
      {
        type: "end-file-block",
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
      { type: "start-file-block", path: "./src/test.ts" },
      { type: "text", content: "export function test() {}\n" },
      {
        type: "end-file-block",
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
      {
        type: "text",
        content: `Here's some markdown with a code block:\n\`\`\`typescript\nconst x = 1;\n\`\`\`\n`,
      },
      {
        type: "markdown",
        content: `Here's some markdown with a code block:\n\`\`\`typescript\nconst x = 1;\n\`\`\`\n`,
      },
      { type: "start-file-block", path: "./src/test.ts" },
      { type: "text", content: "export function test() {}\n" },
      {
        type: "end-file-block",
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
      { type: "text", content: "# Header\nSome content\n" },
      { type: "markdown", content: "# Header\nSome content\n" },
      { type: "start-file-block", path: "./test.ts" },
      { type: "text", content: "code\n" },
      {
        type: "end-file-block",
        file: {
          path: "./test.ts",
          contents: "code\n",
        },
      },
      { type: "text", content: "More content\n" },
      { type: "markdown", content: "More content\n" },
      { type: "start-file-block", path: "./other.ts" },
      { type: "text", content: "more code\n" },
      {
        type: "end-file-block",
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
      { type: "text", content: "Some text\n" },
      { type: "markdown", content: "Some text\n" },
      { type: "start-file-block", path: "./split.ts" },
      { type: "text", content: "content\n" },
      {
        type: "end-file-block",
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
      { type: "start-file-block", path: "./a.ts" },
      { type: "text", content: "code a\n" },
      {
        type: "end-file-block",
        file: {
          path: "./a.ts",
          contents: "code a\n",
        },
      },
      { type: "start-file-block", path: "./b.ts" },
      { type: "text", content: "code b\n" },
      {
        type: "end-file-block",
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
      { type: "text", content: "Here's file 1:\n" },
      { type: "markdown", content: "Here's file 1:\n" },
      { type: "start-file-block", path: "./a.ts" },
      { type: "text", content: "code a\n" },
      {
        type: "end-file-block",
        file: {
          path: "./a.ts",
          contents: "code a\n",
        },
      },
      { type: "text", content: "And here's file 2:\n" },
      { type: "markdown", content: "And here's file 2:\n" },
      { type: "start-file-block", path: "./b.ts" },
      { type: "text", content: "code b\n" },
      {
        type: "end-file-block",
        file: {
          path: "./b.ts",
          contents: "code b\n",
        },
      },
    ];

    
    expect(results).toEqual(expected);
  });
  it("handles non-file content split across multiple chunks", () => {
    const results: StreamingFileParseResult[] = [];
    const parser = createStreamingFileParser((result) => results.push(result));

    // Define the chunks
    const chunk1 = "Some initial text that is split ";
    const chunk2 = "across two chunks.\nFile path:./src/splitTest.ts\n```\n";
    const chunk3 = "export const splitTest = () => {};\n```\n";

    // Feed the chunks to the parser
    parser(chunk1);
    parser(chunk2);
    parser(chunk3);

    // Define the expected results
    const expected = [
      {
        type: "text",
        content: "Some initial text that is split across two chunks.\n",
      },
      {
        type: "markdown",
        content: "Some initial text that is split across two chunks.\n",
      },
      { type: "start-file-block", path: "./src/splitTest.ts" },
      { type: "text", content: "export const splitTest = () => {};\n" },
      {
        type: "end-file-block",
        file: {
          path: "./src/splitTest.ts",
          contents: "export const splitTest = () => {};\n",
        },
      },
    ];

    

    // Assertion
    expect(results).toEqual(expected);
  });
});
