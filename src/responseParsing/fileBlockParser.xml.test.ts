import { fileBlockParser } from "./fileBlockParser.js";
import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";

const mockConfig: CodeSpinConfig = {} as any;

describe("fileBlockParser", () => {
  describe("XML format", () => {
    const xmlElement = "code";

    it("parses a single code block with space after File path:", async () => {
      const input = `
File path: ./src/files/readJson.ts
<code>
export function readJson() {}
</code>
`;
      const result = await fileBlockParser(input, "", xmlElement, mockConfig);
      expect(result).toEqual([
        {
          path: "./src/files/readJson.ts",
          content: "export function readJson() {}",
        },
      ]);
    });

    it("parses a single code block without space after File path:", async () => {
      const input = `
File path:./src/files/readJson.ts
<code>
export function readJson() {}
</code>
`;
      const result = await fileBlockParser(input, "", xmlElement, mockConfig);
      expect(result).toEqual([
        {
          path: "./src/files/readJson.ts",
          content: "export function readJson() {}",
        },
      ]);
    });

    it("parses multiple code blocks with and without spaces", async () => {
      const input = `
File path: ./src/files/readJson.ts
<code>
export function readJson() {}
</code>
File path:./src/files/writeJson.ts
<code>
export function writeJson() {}
</code>
`;
      const result = await fileBlockParser(input, "", xmlElement, mockConfig);
      expect(result).toEqual([
        {
          path: "./src/files/readJson.ts",
          content: "export function readJson() {}",
        },
        {
          path: "./src/files/writeJson.ts",
          content: "export function writeJson() {}",
        },
      ]);
    });

    it("handles empty input gracefully", async () => {
      const input = ``;
      const result = await fileBlockParser(input, "", xmlElement, mockConfig);
      expect(result).toEqual([]);
    });

    it("ignores content between code blocks", async () => {
      const input = `
File path: ./src/files/readJson.ts
<code>
export function readJson() {}
</code>

Some content here which should be ignored.

File path:./src/files/writeJson.ts
<code>
export function writeJson() {}
</code>
`;
      const result = await fileBlockParser(input, "", xmlElement, mockConfig);
      expect(result).toEqual([
        {
          path: "./src/files/readJson.ts",
          content: "export function readJson() {}",
        },
        {
          path: "./src/files/writeJson.ts",
          content: "export function writeJson() {}",
        },
      ]);
    });

    it("ignores content between and after code blocks", async () => {
      const input = `
File path: ./src/files/readJson.ts
<code>
export function readJson() {}
</code>

Some content here which should be ignored.

File path:./src/files/writeJson.ts
<code>
export function writeJson() {}
</code>

More content here to be ignored.
`;
      const result = await fileBlockParser(input, "", xmlElement, mockConfig);
      expect(result).toEqual([
        {
          path: "./src/files/readJson.ts",
          content: "export function readJson() {}",
        },
        {
          path: "./src/files/writeJson.ts",
          content: "export function writeJson() {}",
        },
      ]);
    });

    it("ignores incomplete code blocks missing closing tags", async () => {
      const input = `
File path:./src/files/readJson.ts
<code>
file 1 contents
</code>

File path:./src/files/another.ts
<code>
file 2 partial

File 2 should not be parsed since the closing tag is missing.
    `;

      const result = await fileBlockParser(input, "", xmlElement, mockConfig);
      expect(result).toEqual([
        {
          path: "./src/files/readJson.ts",
          content: "file 1 contents",
        },
        // No entry for ./src/files/another.ts because it's missing closing tag
      ]);
    });

    it("ignores XML blocks without a preceding file path", async () => {
      const input = `
Some random content
<code>
export function readJson() {}
</code>

File path:./src/files/writeJson.ts
<code>
export function writeJson() {}
</code>
`;
      const result = await fileBlockParser(input, "", xmlElement, mockConfig);
      expect(result).toEqual([
        {
          path: "./src/files/writeJson.ts",
          content: "export function writeJson() {}",
        },
      ]);
    });

    it("handles self-closing and empty XML tags", async () => {
      const input = `
File path:./src/files/empty1.ts
<code />

File path:./src/files/empty2.ts
<code></code>

File path:./src/files/content.ts
<code>
actual content
</code>
`;
      const result = await fileBlockParser(input, "", xmlElement, mockConfig);
      expect(result).toEqual([
        {
          path: "./src/files/content.ts",
          content: "actual content",
        },
      ]);
    });

    it("works with different XML element names", async () => {
      const customElement = "source";
      const input = `
File path:./src/files/test.ts
<source>
export function test() {}
</source>
`;
      const result = await fileBlockParser(
        input,
        "",
        customElement,
        mockConfig
      );
      expect(result).toEqual([
        {
          path: "./src/files/test.ts",
          content: "export function test() {}",
        },
      ]);
    });
  });
});
