// Create a demo login for one prospect.
// usage: npm run add-account -- <login> <days>
// Prints the password once and the JSON object to append to DEMO_ACCOUNTS. Plain passwords are never stored.
import { randomBytes, randomInt, scryptSync } from "node:crypto";

const [login, daysArg] = process.argv.slice(2);
if (!login || !/^[a-z0-9_-]{2,32}$/i.test(login)) {
  console.error("usage: npm run add-account -- <login> <days>   (login: 2-32 latin letters, digits, - or _)");
  process.exit(1);
}
const days = Number(daysArg ?? 30);
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no look-alikes, no ':' or ','
const password = Array.from({ length: 14 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const salt = randomBytes(16);
const N = 16384, r = 8, p = 1;
const key = scryptSync(password, salt, 32, { N, r, p });
const hash = `scrypt:${N}:${r}:${p}:${salt.toString("base64url")}:${key.toString("base64url")}`;
const until = new Date(Date.now() + days * 86_400_000).toISOString();

console.log(`login:    ${login}`);
console.log(`password: ${password}`);
console.log(`until:    ${until}`);
console.log("DEMO_ACCOUNTS entry:");
console.log(JSON.stringify({ login, hash, until }));
