const apiUrl = import.meta.env.PUBLIC_API_URL ?? "http://localhost:8787";

export async function getApiHello(token: string) {
  const response = await fetch(`${apiUrl}/api/hello`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}
