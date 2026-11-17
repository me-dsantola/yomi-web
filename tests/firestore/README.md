# Local Firestore regression tests

Requires Firebase CLI and Java 21+. Run `npm --prefix tests/firestore ci`, then `npm run test:rules` from the web repository. The demo project is always `demo-yomi-kuro`; the emulator never writes to the live project. The test installs the production rules plus a test-only calendar endpoint in memory. That endpoint is not part of firestore.rules and must never be deployed.

Checks authentication, account isolation, immutable grants, category/ownership validation, duplicate transactions, forged backup ownership and seasonal start/end boundaries at UTC-03. Configure JAVA_HOME to a suitable JDK when necessary. No credentials are needed.
