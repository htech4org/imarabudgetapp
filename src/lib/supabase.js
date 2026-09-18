import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configured = Boolean(url && key)

export const supabase = configured ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
}) : null

/**
 * Every database call goes through one of the locked-down RPC functions.
 * Postgres raises bare error codes ('no_such_woman', 'bad_password'…);
 * this turns them into something a woman can actually read.
 */
const MESSAGES = {
  no_such_woman:       "We could not find that number or email. Check it, or sign up fresh below.",
  name_required:       "We just need your first name.",
  phone_required:      "That phone number does not look complete.",
  email_required:      "That email address does not look complete.",
  bad_archetype:       "Please choose one of the five.",
  no_active_period:    "There is no month open right now. Start a new one from your dashboard.",
  bad_type:            "Something went wrong saving that entry.",
  bad_amount:          "Please enter an amount greater than zero.",
  date_outside_period: "That day is outside the month you are tracking.",
  bad_password:        "That password is not right.",
  split_not_100:       "Your five percentages need to add up to exactly 100%.",
  split_negative:      "A percentage cannot be less than zero.",
  split_incomplete:    "All five percentages need a value.",

  // Password login
  invalid_login:       "That phone/email and password don't match what we have. Check them, or set a password below if this is your first time logging in.",
  not_claimed:          "Looks like this is your first time logging in with a password. Set one below to continue.",
  already_registered:  "That phone number or email is already registered. Choose \"I've been here before\" to log in.",
  already_claimed:     "A password has already been set for this account. Please log in instead.",
  password_too_short:  "Your password needs to be at least 6 characters.",

  // Reading tracker
  chapter_locked:      "Finish the chapter before this one first.",
  not_started:          "Start this book before opening a chapter.",
}

// Exported so screens can catch this specific case (e.g. Login switching
// itself into "set your password" mode) without re-matching message text.
export const NOT_CLAIMED_MESSAGE = MESSAGES.not_claimed

export async function rpc(fn, args = {}) {
  if (!configured) {
    throw new Error('The tracker is not connected to its database yet. (Missing Supabase environment variables.)')
  }
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const code = Object.keys(MESSAGES).find((k) => (error.message || '').includes(k))
    if (code) throw new Error(MESSAGES[code])
    if ((error.message || '').includes('duplicate key')) {
      throw new Error('That phone number or email is already registered. Use "I have been here before" to continue.')
    }
    throw new Error(error.message || 'Something went wrong. Please try again.')
  }
  return data
}
