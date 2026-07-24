const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeTime(time: number, length: number): string {
  let mod: number;
  let str = "";
  for (let i = length - 1; i >= 0; i--) {
    mod = time % 32;
    str = ENCODING.charAt(mod) + str;
    time = (time - mod) / 32;
  }
  return str;
}

function encodeRandom(length: number): string {
  let str = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    str += ENCODING.charAt(bytes[i] % 32);
  }
  return str;
}

export function ulid(time: number = Date.now()): string {
  return encodeTime(time, 10) + encodeRandom(16);
}
