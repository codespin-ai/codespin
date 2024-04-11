import { promises as fs } from "fs";
import * as path from "path";

type ContentLine = {
  type: "content";
  content: string;
};

type DeletedLine = {
  type: "deleted";
};

type ContentWithInsertionLine = {
  type: "contentWithInsertion";
  content: string;
  inserted: string;
};

type DeletedWithInsertionLine = {
  type: "deletedWithInsertion";
  inserted: string;
};

type FileLine =
  | ContentLine
  | DeletedLine
  | ContentWithInsertionLine
  | DeletedWithInsertionLine;

type DeleteLinesOperation = {
  type: "delete_lines";
  from: number;
  to: number;
};

type InsertLinesOperation = {
  type: "insert_lines";
  at: number;
  content: string[];
};

type Operation = DeleteLinesOperation | InsertLinesOperation;

export type SourceFile = { path: string; contents: string };

const parseUpdates = (
  updates: string
): { path: string; operations: Operation[] }[] => {
  // Split updates for multiple files
  const fileUpdates = updates
    .split(/\$END_FILE_CONTENTS:.*?\$/)
    .filter((update) => update.trim())
    .map((update) => update.trim());

  return fileUpdates.map((update) => {
    // Extract file path
    const filePathMatch = update.match(/\$START_UPDATES:(.*?)\$/);
    const path = filePathMatch ? filePathMatch[1].trim() : "";

    const operations: Operation[] = [];
    let currentInsertAt: number | null = null;
    let currentInsertContent: string[] = [];

    const lines = update.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("$INSERT_LINES:")) {
        currentInsertAt = parseInt(line.split(":")[1].replace(/\$$/, ""), 10);
      } else if (line === "$END_INSERT_LINES$") {
        if (currentInsertAt !== null) {
          operations.push({
            type: "insert_lines",
            at: currentInsertAt,
            content: currentInsertContent,
          });
          currentInsertAt = null;
          currentInsertContent = [];
        }
      } else if (line.startsWith("$DELETE_LINES:")) {
        const [from, to] = line
          .split(":")[1]
          .replace(/\$$/, "")
          .split("-")
          .map(Number);
        operations.push({
          type: "delete_lines",
          from,
          to,
        });
      } else if (currentInsertAt !== null) {
        // We're inside an insert block
        currentInsertContent.push(line);
      }
    }

    return { path, operations };
  });
};

export async function applyCustomDiff(
  updateString: string,
  workingDir: string
): Promise<SourceFile[]> {
  const updates = parseUpdates(updateString);

  return Promise.all(
    updates.map(async ({ path: filePath, operations }) => {
      const fileContent = await fs.readFile(
        path.resolve(workingDir, filePath),
        "utf-8"
      );

      const lines: FileLine[] = fileContent
        .split("\n")
        .map((content) => ({ type: "content", content }));

      // Extract just the delete operations for efficiency
      const deleteOperations = operations.filter(
        (op): op is DeleteLinesOperation => op.type === "delete_lines"
      );

      // Process deletions more directly
      const withDeletions: FileLine[] = lines.map((line, index) => {
        // Check if the current line index falls within any of the delete operations' ranges
        const isDeleted = deleteOperations.some(
          ({ from, to }) => index + 1 >= from && index + 1 <= to
        );
        return isDeleted ? { type: "deleted" } : line;
      });

      const insertOperations = operations.filter(
        (op): op is InsertLinesOperation => op.type === "insert_lines"
      );

      const withInsertions: FileLine[] = withDeletions.map((line, index) => {
        const insertOperation = insertOperations.find(
          (op) => op.at === index + 1
        );

        if (insertOperation) {
          const insertedContent = insertOperation.content.join("\n");
          switch (line.type) {
            case "deleted":
              return {
                type: "deletedWithInsertion",
                inserted: insertedContent,
              };
            case "content":
              return {
                type: "contentWithInsertion",
                content: line.content,
                inserted: insertedContent,
              };
            case "contentWithInsertion":
              return {
                type: "contentWithInsertion",
                content: line.content,
                inserted: `${line.inserted}\n${insertedContent}`,
              };
            case "deletedWithInsertion":
              return {
                type: "deletedWithInsertion",
                inserted: `${line.inserted}\n${insertedContent}`,
              };
            default:
              return line;
          }
        } else {
          return line; // No insertion for this line
        }
      });

      // Compile final content
      const deleted = Symbol("DELETED");

      const finalContent = withInsertions
        .map((line) => {
          switch (line.type) {
            case "content":
              return line.content;
            case "deletedWithInsertion":
              return line.inserted;
            case "contentWithInsertion":
              return `${line.content}\n${line.inserted}`;
            case "deleted":
              return deleted;
            default:
              return deleted;
          }
        })
        .filter((x) => x !== deleted)
        .join("\n");

      return { path: filePath, contents: finalContent };
    })
  );
}
