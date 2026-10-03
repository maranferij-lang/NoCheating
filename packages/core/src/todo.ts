export function todo(name = 'not implemented'): never {
  throw new Error(`TODO: ${name}`);
}
