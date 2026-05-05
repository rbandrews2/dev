const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateActivationCode(length = 15): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = "";

  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }

  return code;
}
