// On web, /ride/<id> renders the ride detail page directly (keeping the
// clean URL in the address bar). The native app/ride/[id].tsx instead
// redirects to RideDetailsScreen — but on web that would loop, since
// appHref now maps RideDetailsScreen back to /ride/<id>. RideDetailsScreen.web
// reads the `id` path param.
export { default } from "../RideDetailsScreen";
