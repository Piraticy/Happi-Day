# Mobile check-ins and daily little lifts

The user wants less scrolling on mobile, varied psychological wellbeing activities that refresh daily and gradually increase, verification, and a Vercel launch. Preserve Little moments' peach/plum identity and existing demo/cloud data behavior.

Use a compact Today screen: optional reasons expand on demand; saved moments collapse; rhythm tiles stay on desktop and a compact progress link reaches times on mobile. Add a Little lifts destination, keeping daily exercises away from the primary check-in. Mobile login prioritizes its form. Preserve natural scrolling for expanded details, small landscape viewports, and large text rather than clipping content.

Daily activities: original short suggestions based on connection, movement, learning, kindness and present-moment awareness. One activity on the first check-in day, two on the second, at most three from the third distinct check-in day, including today. The cap is an implementation choice to keep the requested increase gentle. No forced positive mood, clinical promises, penalties or streaks. A deterministic calendar-based shuffled rotation gives the same selection after refresh and different selections on adjacent days. Optional alternatives replace activities without increasing the required list. Rotation is finite and will eventually repeat; do not claim infinite or AI-generated content. Derive progression from existing journal dates, so it works with cloud history without new account storage.

Approaches: a daily card on Today would increase scroll; a separate destination preserves the short check-in and allows readable activity copy. Choose the separate destination. No activity completion tracking or extra backend tables requested.

Publish the tested frontend to the user's connected Vercel team. Supabase credentials remain unavailable; clearly label local demo and report real sign-in/cloud activation as pending. Never publish .env, tokens, test fixtures, or private journal data.

Sources: https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/ and https://www.who.int/news-room/questions-and-answers/item/stress . Suggestions are original examples inspired by general guidance, not an endorsed treatment.
