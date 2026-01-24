// lib/api.ts
import axios from "axios";

export const BASE_URL = "http://192.168.1.247:8000";

/* ------------------------------- helpers ------------------------------- */

function extractError(e: any) {
  if (e?.response?.data?.detail) return String(e.response.data.detail);
  if (e?.response?.data) return JSON.stringify(e.response.data);
  return e?.message || "Request failed";
}

async function safeGet<T>(url: string, params?: any): Promise<T> {
  try {
    const r = await axios.get(url, { params });
    return r.data;
  } catch (e: any) {
    console.log("GET", url, params, e?.response?.status, e?.response?.data);
    throw new Error(extractError(e));
  }
}

async function safePost<T>(url: string, data?: any): Promise<T> {
  try {
    const r = await axios.post(url, data);
    return r.data;
  } catch (e: any) {
    console.log("POST", url, data, e?.response?.status, e?.response?.data);
    throw new Error(extractError(e));
  }
}

async function safeDelete<T>(url: string, data?: any): Promise<T> {
  try {
    const r = await axios.delete(url, { data });
    return r.data;
  } catch (e: any) {
    console.log("DELETE", url, data, e?.response?.status, e?.response?.data);
    throw new Error(extractError(e));
  }
}

/* -------------------------------- types -------------------------------- */

export type Movie = {
  slug: string;
  title: string;
  year?: number;
  overview?: string;
  posterUrl?: string | null;
  subgenres?: string[];
};

export type FearFileResponse = {
  totals: { ratings_count: number };
  averages: {
    panic: number | null;
    splatter: number | null;
    dread: number | null;
    creature: number | null;
    fun: number | null;
    plot: number | null;
    rewatch: number | null;
  };
  favorites: {
    top_creature: {
      title: string;
      slug: string;
      year?: number;
      posterUrl?: string;
    }[];
    top_splatter: {
      title: string;
      slug: string;
      year?: number;
      posterUrl?: string;
    }[];
    comfort_rewatch: {
      title: string;
      slug: string;
      year?: number;
      posterUrl?: string;
    }[];
  };
};

export type NightReq = {
  vibe:
    | "slashers"
    | "creature-feature"
    | "paranormal"
    | "psychological"
    | "party-horror"
    | "slow-burn-doom"
    | "found-footage"
    | "campy"
    | "cult-classics"
    | "new-scares";
  blood: "low" | "medium" | "high";
  intensity: "chill" | "tense" | "relentless";
  era: "70s" | "80s" | "90s" | "modern";
  user_id?: string;
};

export type NightMovie = {
  slug: string;
  title: string;
  year?: number;
  posterUrl?: string | null;
  why?: string;
};

export type NightResponse = {
  opener: NightMovie | null;
  main_event: NightMovie | null;
  chaser: NightMovie | null;
  blurb: string;
};

/* -------------------------------- auth --------------------------------- */

type LoginResponse = {
  access_token: string;
  token_type: string;
  user_id: string;
};

type RegisterResponse = {
  id: number;
  email: string;
  username?: string | null;
};

export async function register(
  email: string,
  password: string,
  username?: string
) {
  return safePost<RegisterResponse>(`${BASE_URL}/auth/register`, {
    email,
    password,
    username,
  });
}

export async function login(email: string, password: string) {
  return safePost<LoginResponse>(`${BASE_URL}/auth/login`, {
    email,
    password,
  });
}

/**
 * Very simple in-memory current user id (if you still need it elsewhere).
 * Your AuthContext should primarily own the user now.
 */
let CURRENT_USER_ID: string | null = null;

export function setCurrentUserFromAuth(user: { id: string } | null) {
  CURRENT_USER_ID = user?.id ?? null;
}

export function getCurrentUserId(): string | null {
  return CURRENT_USER_ID;
}

// Stub; you can wire it to a real /auth/me later if needed.
export async function me(_token?: string): Promise<null> {
  return null;
}

/* ------------------------------- movies ------------------------------- */

export async function getMovies(limit = 10, offset = 0) {
  return safeGet<{
    movies: Movie[];
    count: number;
    limit: number;
    offset: number;
  }>(`${BASE_URL}/movies`, { limit, offset });
}

export async function getRandomMovies(limit = 10) {
  return safeGet<{ results: Movie[] }>(`${BASE_URL}/movies/random`, { limit });
}

export async function getMovieDetail(slug: string) {
  return safeGet<
    Movie & {
      last_words?: { user_id: string; text: string; created_at?: string }[];
    }
  >(`${BASE_URL}/movies/${slug}`);
}
export const getMovieDetails = getMovieDetail;

export async function getScores(slug: string) {
  return safeGet<{
    counts: number;
    averages: Record<string, number | null>;
    consensus: Record<string, string | null>;
  }>(`${BASE_URL}/movies/${slug}/scores`);
}

/* ------------------------------- search ------------------------------- */

export async function searchMovies(q: string) {
  return safeGet<{ results: Movie[] }>(`${BASE_URL}/search`, { q });
}

/* ------------------------------- library ------------------------------ */

export async function getLibrary(user_id: string) {
  return safeGet<{ kill: Movie[]; grave: Movie[] }>(
    `${BASE_URL}/users/${user_id}/library`
  );
}

export async function setUserMovieState(
  user_id: string,
  slug: string,
  state: "kill" | "grave"
) {
  return safePost(`${BASE_URL}/users/${user_id}/library`, { slug, state });
}

export async function removeFromLibrary(user_id: string, slug: string) {
  return safeDelete(`${BASE_URL}/users/${user_id}/library`, { slug });
}

/* ------------------------------- ratings ------------------------------ */

export type MyRatingResponse = {
  exists: boolean;
  panic?: number;
  splatter?: number;
  dread?: number;
  creature?: number;
  fun?: number;
  plot?: number;
  rewatch?: number;
};

export async function postRatings(
  user_id: string,
  slug: string,
  ratings: Record<string, number>
) {
  return safePost(`${BASE_URL}/movies/${slug}/ratings`, {
    user_id,
    ...ratings,
  });
}

export async function getMyRating(user_id: string, slug: string) {
  return safeGet<MyRatingResponse>(`${BASE_URL}/movies/${slug}/my-rating`, {
    user_id,
  });
}

/* ----------------------------- last words ----------------------------- */

export async function postLastWord(
  user_id: string,
  slug: string,
  text: string
) {
  return safePost(`${BASE_URL}/movies/${slug}/last-word`, { user_id, text });
}

export async function getLastWords(slug: string) {
  const detail = await getMovieDetail(slug);
  // @ts-expect-error runtime safety
  return (detail as any).last_words ?? [];
}

/* ------------------------------ likes -------------------------------- */

export type LikeStatus = { liked: boolean };

export async function getLikeStatus(slug: string, user_id: string) {
  return safeGet<LikeStatus>(`${BASE_URL}/movies/${slug}/like-status`, {
    user_id,
  });
}

export async function likeMovie(slug: string, user_id: string) {
  return safePost<LikeStatus>(`${BASE_URL}/movies/${slug}/like`, {
    user_id,
  });
}

export async function unlikeMovie(slug: string, user_id: string) {
  const url = `${BASE_URL}/movies/${slug}/like?user_id=${encodeURIComponent(
    user_id
  )}`;
  return safeDelete<LikeStatus>(url, { user_id });
}

/* ------------------------------ fear file ----------------------------- */

export async function getFearFile(user_id: string) {
  return safeGet<FearFileResponse>(`${BASE_URL}/users/${user_id}/fear-file`);
}

/* ------------------------- night of frights --------------------------- */

export async function generateNightOfFrights(body: NightReq) {
  return safePost<NightResponse>(`${BASE_URL}/night-of-frights`, body);
}
