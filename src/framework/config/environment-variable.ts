import { loadEnvironment } from './environment.loader';

/** Returns the variable's value, or throws a clear error if it is missing or empty. */
export function requireEnvironmentVariable(name: string): string {
  loadEnvironment();
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set. Add it to .env (see .env.example).`);
  }
  return value;
}

/** Returns the variable's value, or `defaultValue` if it is missing or empty. */
export function optionalEnvironmentVariable(name: string, defaultValue: string): string {
  loadEnvironment();
  return process.env[name] || defaultValue;
}
