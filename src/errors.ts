/**
 * Base class for all CodeSpin specific errors
 */
export class CodeSpinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * CLI-specific errors
 */
export class CLIError extends CodeSpinError {
  constructor(message: string) {
    super(message);
  }
}

export class CLIParameterError extends CLIError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * CLI-specific errors
 */
export class ParameterError extends CodeSpinError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends CodeSpinError {}

export class InvalidCredentialsError extends AuthenticationError {
  constructor(provider: string) {
    super(`Invalid credentials or key for ${provider}`);
  }
}

export class ClientInitializationError extends AuthenticationError {
  constructor(provider: string) {
    super(`Failed to initialize ${provider} client`);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends CodeSpinError {}

export class MissingConfigError extends ConfigurationError {
  constructor(configFile: string) {
    super(`The config file ${configFile} does not exist`);
  }
}

export class UnsupportedConfigVersionError extends ConfigurationError {
  constructor(version: string) {
    super(
      `codespin.json version ${version} is not supported anymore. Run "codespin init" to generate new configuration`
    );
  }
}

export class InvalidModelError extends ConfigurationError {
  constructor(modelName: string) {
    super(`Invalid model ${modelName}`);
  }
}

export class MissingModelConfigError extends ConfigurationError {
  constructor(configPath: string) {
    super(`The model property is not specified in ${configPath}`);
  }
}

export class MissingModelError extends ConfigurationError {
  constructor(modelName?: string) {
    super(`Model ${modelName || ""} not found. Have you run "codespin init"?`);
  }
}

export class MissingOpenAIEnvVarError extends ConfigurationError {
  constructor() {
    super("OPENAI_API_KEY environment variable is not set");
  }
}

export class MissingAnthropicEnvVarError extends ConfigurationError {
  constructor() {
    super("ANTHROPIC_API_KEY environment variable is not set");
  }
}

/**
 * Input validation errors
 */
export class ValidationError extends CodeSpinError {}

export class MaxInputLengthError extends ValidationError {
  constructor(maxLength: number) {
    super(
      `Input length exceeds ${maxLength} bytes. Use "--max-input" parameter or set maxInput in config.`
    );
  }
}

export class MaxTokensError extends ValidationError {
  constructor() {
    super(
      "Maximum tokens exceeded. Try using --multi parameter for multi-step generation"
    );
  }
}

export class MaxMultiQueryError extends ValidationError {
  constructor() {
    super("Maximum number of LLM calls exceeded");
  }
}

export class FileLengthExceedsMaxTokensError extends ValidationError {
  constructor() {
    super(
      "Single file length exceeded max tokens and cannot be retried. Try increasing max tokens or modularizing code"
    );
  }
}

/**
 * File system errors
 */
export class FileSystemError extends CodeSpinError {}

export class FileNotFoundError extends FileSystemError {
  constructor(filePath: string) {
    super(`File ${filePath} was not found`);
  }
}

export class DirectoryError extends FileSystemError {}

export class DirectoryExistsError extends DirectoryError {
  constructor(dirPath: string) {
    super(`${dirPath} already exists. Use --force to overwrite`);
  }
}

export class MissingSourceDirectoryError extends DirectoryError {
  constructor(dirPath: string) {
    super(`Source directory "${dirPath}" doesn't exist or is not a directory`);
  }
}

export class MissingDestinationDirectoryError extends DirectoryError {
  constructor(dirPath: string) {
    super(
      `Destination directory "${dirPath}" doesn't exist or is not a directory`
    );
  }
}

export class UnknownProjectRootError extends DirectoryError {
  constructor() {
    super('Project root not found. Run "codespin init" from project root');
  }
}

/**
 * Git related errors
 */
export class GitError extends CodeSpinError {}

export class UnknownGitRootError extends GitError {
  constructor() {
    super('Git root not found. Run "codespin init" from project root');
  }
}

export class GitPathError extends GitError {
  constructor(message: string) {
    super(`Failed to get path relative to git root: ${message}`);
  }
}

/**
 * Template related errors
 */
export class TemplateError extends CodeSpinError {}

export class MissingTemplateError extends TemplateError {
  constructor(template: string) {
    super(`Template ${template} not found`);
  }
}

/**
 * Parsing errors
 */
export class ParseError extends CodeSpinError {}

export class MissingCodeBlockError extends ParseError {
  constructor() {
    super("No valid markdown code block found");
  }
}

export class CannotMergeDiffResponseError extends ParseError {
  constructor() {
    super("Cannot merge diff responses. Remove diff flag");
  }
}

export class InvalidMessagesFileError extends ValidationError {
  constructor(message: string) {
    super(`Invalid messages file format: ${message}`);
  }
}

/**
 * Provider errors
 */
export class ProviderError extends CodeSpinError {}

export class InvalidProviderError extends ProviderError {
  constructor() {
    super("Only OpenAI and Anthropic are supported as of now");
  }
}

/**
 * Runtime errors
 */
export class RuntimeError extends CodeSpinError {}

export class UnknownFinishReasonError extends RuntimeError {
  constructor(reason: string) {
    super(`Unknown finish reason: ${reason}`);
  }
}

export class UndefinedDiffVersionError extends RuntimeError {
  constructor() {
    super("The version cannot be undefined in a diff");
  }
}
