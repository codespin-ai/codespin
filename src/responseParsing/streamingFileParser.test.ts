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
      { type: "text", content: "\n" },
      { type: "new-file-block", path: "./src/test.ts" },
      {
        type: "file",
        file: {
          path: "./src/test.ts",
          contents: " export function test() {}\n",
        },
      },
      { type: "text", content: " " },
    ];
    console.log({
      results,
      expected,
    });

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

    expect(results).toEqual([
      { type: "text", content: "\n" },
      { type: "new-file-block", path: "./src/a.ts" },
      {
        type: "file",
        file: {
          path: "./src/a.ts",
          contents: " function a() {}\n",
        },
      },
      { type: "text", content: " Some text\n" },
      { type: "new-file-block", path: "./src/b.ts" },
      {
        type: "file",
        file: {
          path: "./src/b.ts",
          contents: " function b() {}\n",
        },
      },
      { type: "text", content: " " },
    ]);
  });

  it("handles streaming chunks", () => {
    const results: StreamingFileParseResult[] = [];
    const parser = createStreamingFileParser((result) => results.push(result));

    parser("File path:./sr");
    parser("c/test.ts\n```\n");
    parser("export function");
    parser(" test() {}\n```\n");

    expect(results).toEqual([
      { type: "new-file-block", path: "./src/test.ts" },
      {
        type: "file",
        file: {
          path: "./src/test.ts",
          contents: "export function test() {}\n",
        },
      },
    ]);
  });
});
