// Test-only module hooks so React hooks and extensionless imports run in plain Node:
//  - 'react' resolves to a tiny hook runtime stub
//  - relative imports without an extension get '.ts'
import { register } from 'node:module';
register(new URL('./loader.mjs', import.meta.url));
