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
  reception: { time: "", venue: "Koníčkův Mlýn", address: "Ke Mlýnu 11, Újezd u Průhonic, 149 00", mapUrl: "https://www.google.com/maps/place/Ke+Mlýnu+11,+149+00+Újezd+u+Průhonic,+Czechia/@50.0124304,14.5500767,17z/data=!3m1!4b1!4m6!3m5!1s0x470b8de2ad875dd5:0x9634664fbb3d99bf!8m2!3d50.012427!4d14.5526516!16s%2Fg%2F11yr97rl_j!5m1!1e2?entry=ttu&g_ep=EgoyMDI2MTAxMy4wIKXMDSoASAFQAw%3D%3D" },
  // Getting There: edit this text and the transport options below.
  travel: {
    "details": "Dinner and dancing will take place at:",
    "mapUrl": "",
    "options": [
      {
        "title": "Public transport",
        "details": "Take the red Metro C line to Opatov, then bus 122 or 363 to Újezd u Průhonic. Afterwards, it is a 5 minute walk to the venue. Check check [IDOS](https://idos.cz/pid/spojeni/) for current routes and departure times."
      },
      {
        "title": "By car or taxi",
        "details": "Use the address above as your destination. You can drive or take a taxi directly to the venue."
      }
    ]
  },
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
