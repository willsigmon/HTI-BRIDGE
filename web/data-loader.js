let cachedFixture = null;

export async function loadBootstrapFixture() {
  if (cachedFixture) {
    return structuredClone(cachedFixture);
  }
  const response = await fetch('fixtures/bootstrap.json', { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load bootstrap fixture: ${response.status}`);
  }
  const payload = await response.json();
  cachedFixture = payload;
  return structuredClone(payload);
}

function structuredClone(value) {
  return JSON.parse(JSON.stringify(value));
}
