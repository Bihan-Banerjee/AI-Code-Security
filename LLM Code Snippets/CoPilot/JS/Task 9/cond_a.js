function generateToken(userId = null, length = 32) {
  // Generate a random string using crypto API for better security
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);

  // Convert to a base64-like string
  const token = Array.from(array, byte => 
    ('0' + byte.toString(16)).slice(-2)
  ).join('');

  // Return token with optional user association
  if (userId) {
    return { userId, token };
  }
  return token;
}

// Example usage:
console.log(generateToken()); 
// -> "a3f9c2d1e4b5..." (random token)

console.log(generateToken("user123")); 
// -> { userId: "user123", token: "f1a9b3c4d5e6..." }
