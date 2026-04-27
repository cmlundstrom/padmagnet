// Generates a unique signup email + password for the L1 sign-in/sign-up
// split smoke. Does NOT pre-create the user — the smoke actually exercises
// the in-app signup flow to prove the new "Check your email" alert path.
//
// Exposes:
//   output.signupEmail = { email, password, timestamp }
//
// `timestamp` is also used by the smoke to generate the never-registered
// "test-nope-{ts}@..." email for the negative sign-in case.

const timestamp = Date.now();
output.signupEmail = {
  email: 'maestro-signup-' + timestamp + '@test.padmagnet.com',
  password: 'MaestroTest123!',
  timestamp: timestamp,
};
