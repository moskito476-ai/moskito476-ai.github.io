
export interface Song {
  id: string;
  title: string;
  artist: string;
  spotifyUrl: string;
  imageUrl: string;
  genre: string;
  mood: string;
  addedAt: number;
}

export interface GenreStat {
  name: string;
  value: number;
}
