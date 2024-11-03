import 'dotenv/config';

interface MeReponse {
  id: string
};

const createPlaylist = async () => {
  const authToken = process.env.BEARER_TOKEN;

  // Fetch the current user's Spotify ID
  const userResponse = await fetch('https://api.spotify.com/v1/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!userResponse.ok) {
    console.error('Failed to fetch user ID:', userResponse.statusText);
    return;
  }

  const userData: MeReponse = await userResponse.json() as MeReponse;
  const userId = userData.id;

  // Create a new playlist
  const playlistName = 'Brendan Factorio Playlist'; // Replace with your desired playlist name
  const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: playlistName,
      description: 'New playlist description',
      public: false
    })
  });

  if (!playlistResponse.ok) {
    console.error('Failed to create playlist:', playlistResponse.statusText);
    return;
  }

  const playlistData = await playlistResponse.json();
  console.log('Playlist created:', playlistData);
  const playlistId = playlistData.id;

  // Create a prompt for OpenAI to find similar songs
  //const addSong = "American Idiot";
  const songPrompt = `As a factory builder, make me a playlist to automate production to.`;
  const openAIPrompt = `Find 20 songs related to the previous text and return their titles. 
    The only output i want from you is a list of song titles and nothing else. 
    Dont number the songs or add any extra string output.
  `;

  // Send the prompt to OpenAI API
  const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: songPrompt + openAIPrompt }]
    })
  });

  if (!openAIResponse.ok) {
    console.error('Failed to get response from OpenAI:', openAIResponse.statusText);
    return;
  }

  const openAIData = await openAIResponse.json();
  const similarSongs = openAIData.choices[0].message.content.split('\n').map(song => song.trim()).filter(song => song);

  // Search for each song and add to the playlist
  for (const songTitle of similarSongs) {
    console.log(encodeURIComponent(songTitle));
    const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(songTitle)}&type=track&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      console.error(`Failed to search for song: ${songTitle}`, searchResponse.statusText);
      continue;
    }

    const searchData = await searchResponse.json();
    const trackId = searchData.tracks.items[0]?.id;

    if (!trackId) {
      console.error('No track found for the song:', songTitle);
      continue;
    }

    const addTrackResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: [`spotify:track:${trackId}`]
      })
    });

    if (!addTrackResponse.ok) {
      console.error('Failed to add track to playlist:', addTrackResponse.statusText);
      continue;
    }

    console.log('Track added to playlist:', songTitle);
  }
}

createPlaylist();