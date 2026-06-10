# Plan

## 1. Real-time sync (Website ⇄ PWA)
Data currently only refreshes on page load / refetch. Switch to Supabase Realtime so any change anywhere shows up instantly on every client (browser & installed PWA).

- Enable realtime on tables: `flight_plans`, `atis`, `ground_requests`, `ground_messages`, `partner_announcements`, `partner_messages`, `atc_claims`, and the new `tickets` table.
- Add a small `useRealtimeInvalidate(table, queryKey)` hook that subscribes via the browser Supabase client and calls `queryClient.invalidateQueries` on any change.
- Wire it into the pages that read each table (dashboard, my-flights, atc, atis, ground, partners, flight detail).

## 2. Ticket system
- New `tickets` table: `id`, `flight_plan_id` (FK), `passenger_discord_id`, `passenger_roblox_username`, `passenger_discord_username`, `seat`, `created_at`.
- Add `tickets_enabled` boolean (default `false`) on `flight_plans` — owner toggles it from My Flights.
- In the dashboard "On ground" section: each flight where `tickets_enabled = true` shows a **Get ticket** button → opens a new `/flights/$id/ticket` page styled like a real airline checkout (flight summary, passenger details form with Discord + Roblox username, "Confirm booking — Free" button).
- After booking, the buyer sees a **Ticket bought** badge next to that flight everywhere it appears (My Flights, dashboard, flight detail).
- The flight owner, on My Flights and the flight detail page, sees a **Passengers** list with everyone who booked (Discord + Roblox username, time booked).
- Server functions: `setTicketsEnabled`, `bookTicket`, `listFlightTickets`, `listMyTickets`, `cancelTicket` (owner can remove passenger).

## 3. Delete ground requests
- Add a delete button on each row of the ground requests list (visible to the request's pilot and to ATC/ground crew).
- Wire it to the existing `deleteGroundRequest` server fn.

## 4. Use the uploaded images across the site
Distribute the 8 gallery shots + 3 hero images so each page has at least one — as page headers / side banners — keeping current copy intact:
- index: already has skyline + tower hero + gallery (keep).
- my-flights, flight-plan, atc, atis, ground, voice, charts, overview, partners, flights/$id: add a slim page header banner that uses one of the uploaded photos (different image per page) with the page title overlaid.

## Technical notes
- Realtime: one channel per page, cleaned up in `useEffect` return.
- All new tables get GRANTs + RLS in the same migration. Tickets: passengers can insert their own row & see their own tickets; flight owner can see all tickets for their flight; service_role full access.
- `tickets_enabled` defaults false so nothing changes for existing flights until owner opts in.
- No business-logic changes to existing flows beyond what's listed.

Shall I proceed?
