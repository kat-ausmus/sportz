export async function getMatches(limit = 50) {
  const response = await fetch(`/match?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to load matches (${response.status})`);
  }
  return response.json();
}

export async function getCommentary(matchId, limit = 8) {
  const response = await fetch(`/matches/${matchId}/commentary?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to load commentary (${response.status})`);
  }
  return response.json();
}
