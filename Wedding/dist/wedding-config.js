/* Edit your wedding details here, then reload the page.
 * Leave any unknown value as "". The site will show a gentle coming-soon message.
 * URLs can be https:// links (RSVP form, registry, maps, hotel booking, etc.).
 * Edit the Q + A page separately in questions.json.
 */
window.WEDDING = {
  names: { first: "David", second: "Gypsy" },
  date: "September 03 2027", // For example: "Saturday, 18 September 2027"
  location: "", // For example: "Hudson Valley, New York"
  venue: "",
  video: {
    src: "assets/our-film.mp4",
    poster: "assets/our-film-poster.jpg",
    position: "50% 50%", // Adjust the crop if needed.
  },
  ceremony: { time: "", venue: "", address: "", mapUrl: "" },
  reception: { time: "", venue: "", address: "", mapUrl: "" },
  travel: { details: "", mapUrl: "" },
  accommodation: { details: "", bookingUrl: "" },
  gifts: {
    details: "",
    registryUrl: "https://www.myregistry.com/wedding-registry/david-miloschewsky-and-gypsy-alvarado-covarrubias-/5685209",
  },
  rsvp: {
    apiBase: "https://gypsy-david-rsvp.david-and-gypsy.workers.dev",
    url: "", // Add the URL of your RSVP form when it is ready.
    deadline: "",
    message: "",
  },
  contactEmail: "",
  thingsToDo: { details: "", url: "" },
};
